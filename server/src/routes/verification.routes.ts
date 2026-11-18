import crypto from 'crypto';
import sharp from 'sharp';
import { Router, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { db } from '../db/database';
import { authenticateToken, requireOfficer, requireAdmin, AuthRequest } from '../middleware/auth';
import { logAuditEvent } from '../middleware/audit';
import { DemoScenarioService } from '../services/DemoScenarioService';
import { ImageQualityService } from '../services/ImageQualityService';
import { OCRService } from '../services/OCRService';
import { MRZValidationService } from '../services/MRZValidationService';
import { TamperingService } from '../services/TamperingService';
import { FaceVerificationService } from '../services/FaceVerificationService';
import { IdentityMatchingService } from '../services/IdentityMatchingService';
import { RiskEngine } from '../services/RiskEngine';
import { OllamaService } from '../services/OllamaService';
import { DocumentType, VerificationResult, AIMode, DatabaseVerificationResult } from '../../../shared/types';

const router = Router();

// Configure secure upload directory
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

export interface PendingVerification {
  result: VerificationResult;
  rawImagePath: string;
  officerId: number;
  createdAt: number;
}

export const pendingVerifications = new Map<string, PendingVerification>();

// Clean up pending records older than 2 hours
setInterval(() => {
  const now = Date.now();
  const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
  for (const [id, item] of pendingVerifications.entries()) {
    if (now - item.createdAt > TWO_HOURS_MS) {
      pendingVerifications.delete(id);
    }
  }
}, 30 * 60 * 1000).unref();

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const mime = (file.mimetype || '').toLowerCase();

    const isValidExt = ALLOWED_EXTENSIONS.has(ext);
    const isValidMime = ALLOWED_MIME_TYPES.has(mime);

    const mimeMatchesExt =
      ((ext === '.jpg' || ext === '.jpeg') && mime === 'image/jpeg') ||
      (ext === '.png' && mime === 'image/png') ||
      (ext === '.webp' && mime === 'image/webp');

    if (isValidExt && isValidMime && mimeMatchesExt) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file format. Uploads must be valid .jpg, .jpeg, .png, or .webp images matching their MIME type.'));
    }
  }
});

// Middleware to capture multer errors and return JSON 400
const handleUpload = (req: any, res: any, next: NextFunction) => {
  upload.single('document')(req, res, (err: any) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: `File upload error: ${err.message}` });
      }
      return res.status(400).json({ error: err.message || 'File upload rejected.' });
    }
    next();
  });
};

// POST /api/verification/process
// Accepts multipart/form-data or JSON (base64 image)
router.post('/process', authenticateToken, handleUpload, async (req: AuthRequest, res: Response) => {
  const startTime = Date.now();

  try {
    const documentType: DocumentType = (req.body.documentType as DocumentType) || 'PASSPORT';
    const isDemoMode = process.env.DEMO_MODE === 'true';
    let explicitScenario: string | undefined = undefined;

    if (req.body.scenario) {
      if (isDemoMode) {
        explicitScenario = req.body.scenario;
      } else {
        console.log(`[Security] Client-supplied scenario '${req.body.scenario}' ignored (DEMO_MODE is disabled)`);
      }
    }

    let imageBuffer: Buffer;
    let imagePath = '';
    let filename = '';

    if (req.file) {
      imageBuffer = req.file.buffer;

      // Validate magic bytes with sharp metadata
      let meta: sharp.Metadata;
      try {
        meta = await sharp(imageBuffer).metadata();
      } catch (sharpErr: any) {
        return res.status(400).json({ error: 'Uploaded file is corrupt or not a decodable image.' });
      }

      const detectedFormat = meta.format;
      const isAllowedRaster = !!(detectedFormat && ['jpeg', 'png', 'webp'].includes(detectedFormat));
      const isRegisteredSpecimen = isDemoMode && (
        DemoScenarioService.isGenuineSpecimen(imageBuffer) ||
        DemoScenarioService.isTamperedSpecimen(imageBuffer)
      );

      if (!isAllowedRaster && !isRegisteredSpecimen) {
        return res.status(400).json({ error: 'Uploaded file is not a supported raster image (JPEG, PNG, or WebP required).' });
      }

      // Store upload with server-generated name and extension derived strictly from detected format
      const safeExt = detectedFormat === 'jpeg' ? 'jpg' : detectedFormat === 'svg' ? 'png' : (detectedFormat || 'png');
      const serverFilename = `doc-${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${safeExt}`;
      const savePath = path.join(uploadsDir, serverFilename);
      fs.writeFileSync(savePath, imageBuffer);

      imagePath = `/uploads/${serverFilename}`;
      filename = serverFilename;
    } else if (req.body.imageBase64) {
      // Handle camera capture sent as base64
      const base64Data = req.body.imageBase64.replace(/^data:image\/\w+;base64,/, '');
      imageBuffer = Buffer.from(base64Data, 'base64');

      let meta: sharp.Metadata;
      try {
        meta = await sharp(imageBuffer).metadata();
      } catch (sharpErr: any) {
        return res.status(400).json({ error: 'Camera capture data is corrupt or not a decodable image.' });
      }

      const detectedFormat = meta.format;
      const isAllowedRaster = !!(detectedFormat && ['jpeg', 'png', 'webp'].includes(detectedFormat));
      const isRegisteredSpecimen = isDemoMode && (
        DemoScenarioService.isGenuineSpecimen(imageBuffer) ||
        DemoScenarioService.isTamperedSpecimen(imageBuffer)
      );

      if (!isAllowedRaster && !isRegisteredSpecimen) {
        return res.status(400).json({ error: 'Camera capture is not a supported raster image (JPEG, PNG, or WebP required).' });
      }

      const safeExt = detectedFormat === 'jpeg' ? 'jpg' : detectedFormat === 'svg' ? 'png' : (detectedFormat || 'png');
      const serverFilename = `camera-${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${safeExt}`;
      const savePath = path.join(uploadsDir, serverFilename);
      fs.writeFileSync(savePath, imageBuffer);

      imagePath = `/uploads/${serverFilename}`;
      filename = serverFilename;
    } else if (req.body.sampleSpecimenUrl) {
      // Direct sample specimen trigger - strictly contain within assets/specimens/
      const rawUrl = String(req.body.sampleSpecimenUrl || '');
      const specimensDir = path.resolve(process.cwd(), 'assets', 'specimens');
      const relativeClean = rawUrl.replace(/^\/+/, '');
      const candidatePath = relativeClean.startsWith('assets' + path.sep) || relativeClean.startsWith('assets/')
        ? path.resolve(process.cwd(), relativeClean)
        : path.resolve(specimensDir, relativeClean);

      // Verify path containment
      if (!candidatePath.startsWith(specimensDir + path.sep)) {
        return res.status(400).json({ error: 'Path traversal attempt detected. Specimen must reside within assets/specimens/.' });
      }

      if (!fs.existsSync(candidatePath)) {
        return res.status(404).json({ error: `Specimen not found: ${path.basename(candidatePath)}` });
      }

      imageBuffer = fs.readFileSync(candidatePath);
      imagePath = `/assets/specimens/${path.basename(candidatePath)}`;
      filename = path.basename(candidatePath);
    } else {
      return res.status(400).json({ error: 'No document image provided. Please upload an image or scan with camera.' });
    }

    // Step 1: Demo Scenario Identification (SHA256 / Perceptual / Signature)
    const scenarioResult = DemoScenarioService.identifyScenario(imageBuffer, filename, explicitScenario);

    // Step 2: Face Extraction & 360° Rotational Deskewing
    const faceVerification = await FaceVerificationService.verify(
      imageBuffer,
      scenarioResult.scenario
    );

    // Auto-deskew / Upright document if uploaded upside down or sideways
    let effectiveImageBuffer = imageBuffer;
    let effectiveImagePath = imagePath;
    if (faceVerification.uprightedDocUrl) {
      effectiveImagePath = faceVerification.uprightedDocUrl;
      const localUprightPath = path.join(process.cwd(), faceVerification.uprightedDocUrl.replace(/^\//, ''));
      if (fs.existsSync(localUprightPath)) {
        try {
          effectiveImageBuffer = fs.readFileSync(localUprightPath);
        } catch {}
      }
    }

    // Step 3: Image Quality Analysis
    const imageQuality = ImageQualityService.analyze(effectiveImageBuffer, scenarioResult.scenario);

    // Step 4: OCR Extraction (VLM + Local Tesseract + SVG text on uprighted buffer)
    const ocr = await OCRService.extractFields(effectiveImageBuffer, scenarioResult.scenario, filename);

    // Step 5: MRZ Validation
    const mrz = MRZValidationService.validate(scenarioResult.scenario, ocr, ocr.mrzLines);

    // Step 6: Query Central Government Registry (Read-only check against authentic records)
    const extractedDocNum = ocr.fields.documentNumber?.value?.trim().toUpperCase();
    const hasValidDocNum = !!(extractedDocNum && extractedDocNum !== 'DOC-UNREAD');

    const extractedHolderName = ocr.fields.fullName?.value?.trim().toUpperCase();
    const cleanHolderName = (extractedHolderName && extractedHolderName !== 'TRAVELER' && extractedHolderName !== 'UNREAD')
      ? extractedHolderName
      : '';
    const cleanNationality = ocr.fields.nationality?.value || '';
    const cleanDob = ocr.fields.dateOfBirth?.value || '';
    const cleanGender = ocr.fields.gender?.value || 'X';
    const cleanIssue = ocr.fields.issueDate?.value || '';
    const cleanExpiry = ocr.fields.expiryDate?.value || '';

    let databaseVerification: DatabaseVerificationResult;

    if (hasValidDocNum) {
      databaseVerification = IdentityMatchingService.verifyInDatabase(
        extractedDocNum,
        cleanHolderName,
        cleanDob,
        cleanExpiry
      );
    } else {
      databaseVerification = {
        recordFound: false,
        status: 'NOT_FOUND',
        nameMatch: false,
        dobMatch: false,
        expiryMatch: false,
        multipleIdentityAlert: false,
        watchlistFlag: false,
        summary: 'Passport number could not be read by OCR; central registry query skipped (manual review required).'
      };
    }

    // Auto-registration of unknown documents is disabled by default (AUTO_REGISTER_UNKNOWN=false)
    // When enabled, documents are stored strictly as 'PENDING_VERIFICATION' (never ACTIVE) with unread dates as null
    const autoRegisterUnknown = process.env.AUTO_REGISTER_UNKNOWN === 'true';
    if (autoRegisterUnknown && hasValidDocNum && !databaseVerification.recordFound && scenarioResult.scenario === 'UNKNOWN') {
      IdentityMatchingService.registerOrUpdateDocument({
        documentNumber: extractedDocNum,
        documentType,
        holderName: cleanHolderName || 'UNVERIFIED SCAN',
        nationality: cleanNationality,
        dateOfBirth: cleanDob || null,
        gender: cleanGender,
        issueDate: cleanIssue || null,
        expiryDate: cleanExpiry || null,
        status: 'PENDING_VERIFICATION',
        photoUrl: faceVerification.extractedFaceUrl || imagePath,
        notes: `Auto-registered upon document screening scan on ${new Date().toLocaleDateString()} (PENDING_VERIFICATION)`
      });

      databaseVerification = IdentityMatchingService.verifyInDatabase(
        extractedDocNum,
        cleanHolderName,
        cleanDob,
        cleanExpiry
      );
    }

    // Step 7: Dynamic Substrate & Photo Tampering Analysis
    const isBiometricMismatch = faceVerification.consistency === 'POSSIBLE_MISMATCH' || (faceVerification.similarityScore !== null && faceVerification.similarityScore < 60);
    const tampering = await TamperingService.analyze(imageBuffer, scenarioResult.scenario, isBiometricMismatch);

    // Step 8: Multidimensional Risk Calculation Engine
    const risk = RiskEngine.calculate(
      tampering,
      faceVerification,
      databaseVerification,
      mrz,
      ocr,
      imageQuality
    );


    // Step 9: Real LLM AI Forensic Analysis via Ollama (http://localhost:11434)
    let ollamaAnalysis;
    try {
      ollamaAnalysis = await OllamaService.generateForensicAnalysis({
        holderName: ocr.fields.fullName.value,
        documentNumber: ocr.fields.documentNumber.value,
        documentType,
        ocr,
        mrz,
        tampering,
        face: faceVerification,
        database: databaseVerification,
        risk,
        scenario: scenarioResult.scenario,
        imageBase64: imageBuffer.toString('base64')
      });

      // Enrich explainability with Ollama interview recommendations if present
      if (risk.whySuspicious && ollamaAnalysis.interviewQuestions?.length > 0) {
        risk.whySuspicious.investigationGuidance = [
          ...risk.whySuspicious.investigationGuidance,
          `AI Questioning: "${ollamaAnalysis.interviewQuestions[0]}"`
        ];
      }
    } catch (ollamaErr: any) {
      console.warn('Ollama analysis generation warning:', ollamaErr.message);
    }

    const processingTimeMs = Date.now() - startTime;
    const verificationId = `VER-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
    const documentImageUrl = `/api/verification/${verificationId}/image`;

    const result: VerificationResult = {
      id: verificationId,
      timestamp: new Date().toISOString(),
      officerId: req.user!.id,
      officerName: req.user!.name,
      officerBadge: req.user!.badge_number,
      documentType,
      documentImage: documentImageUrl,
      documentNumber: ocr.fields.documentNumber?.value || '',
      holderName: ocr.fields.fullName?.value || '',
      aiMode: ollamaAnalysis?.model?.includes('llama') ? 'OLLAMA_AI' : 'HYBRID_AI',
      scenarioDetected: scenarioResult.scenario,
      imageQuality,
      ocr,
      mrz,
      tampering,
      faceVerification,
      databaseVerification,
      risk,
      ollamaAnalysis,
      aiExecutiveSummary: ollamaAnalysis?.executiveSummary,
      processingTimeMs
    };

    pendingVerifications.set(verificationId, {
      result,
      rawImagePath: effectiveImagePath,
      officerId: req.user!.id,
      createdAt: Date.now()
    });

    return res.json(result);
  } catch (err: any) {
    console.error('Verification process error:', err);
    return res.status(500).json({ error: err.message || 'Error occurred during document verification pipeline.' });
  }
});

// POST /api/verification/save
// Persist completed verification result into SQLite using server-verified pending result
router.post('/save', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id, notes } = req.body;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Verification ID is required to save a record.' });
    }

    // Check if record already exists in database
    const existing = db.prepare('SELECT verification_id, officer_id FROM verification_sessions WHERE verification_id = ?').get(id) as { verification_id: string; officer_id: number } | undefined;

    if (existing) {
      // If existing session belongs to another officer and requester is not an admin, deny with 403 Forbidden
      if (existing.officer_id !== req.user!.id && req.user!.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Forbidden: You cannot modify a verification session created by another officer.' });
      }
      // Otherwise reject duplicate save with 409 Conflict
      return res.status(409).json({ error: 'Conflict: Verification record has already been saved.' });
    }

    // Look up pending verification record computed on server
    const pending = pendingVerifications.get(id);
    if (!pending) {
      return res.status(404).json({ error: 'Verification session not found or expired. Please re-run verification.' });
    }

    // Enforce ownership: only the officer who ran /process (or an admin) can save it
    if (pending.officerId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden: You cannot save a verification session created by another officer.' });
    }

    // Use server-computed result as the immutable source of truth
    const serverResult: VerificationResult = pending.result;
    if (notes && typeof notes === 'string') {
      serverResult.notes = notes;
    }

    const currentIso = new Date().toISOString();

    const insert = db.prepare(`
      INSERT INTO verification_sessions (
        verification_id, officer_id, officer_name, officer_badge,
        document_type, document_image, document_number, holder_name,
        ai_mode, scenario_detected, risk_score, risk_level, final_status,
        processing_time_ms, details_json, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insert.run(
      serverResult.id,
      req.user!.id,
      req.user!.name,
      req.user!.badge_number || 'N/A',
      serverResult.documentType,
      serverResult.documentImage,
      serverResult.documentNumber,
      serverResult.holderName,
      serverResult.aiMode,
      serverResult.scenarioDetected,
      serverResult.risk.score,
      serverResult.risk.level,
      serverResult.risk.status,
      serverResult.processingTimeMs,
      JSON.stringify({
        ...serverResult,
        rawImagePath: pending.rawImagePath,
        timestamp: currentIso
      }),
      serverResult.notes || '',
      currentIso
    );

    // Remove from in-memory pending map once safely persisted
    pendingVerifications.delete(id);

    logAuditEvent(
      req.user!,
      'VERIFICATION_SAVED',
      'VERIFICATION',
      serverResult.id,
      `Saved verification report for ${serverResult.holderName} (${serverResult.documentNumber}) — Result: ${serverResult.risk.level} (${serverResult.risk.score}/100)`,
      req.ip || '127.0.0.1'
    );

    return res.json({ success: true, message: 'Verification record successfully saved.', id: serverResult.id });
  } catch (err: any) {
    console.error('Save verification error:', err);
    return res.status(500).json({ error: 'Failed to save verification record to database.' });
  }
});

// Helper to ensure valid UTC ISO timestamp representation
const normalizeUtcIso = (dateVal: any): string => {
  if (!dateVal) return new Date().toISOString();
  let str = String(dateVal).trim();
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(str)) {
    str = str.replace(' ', 'T') + 'Z';
  } else if (!str.endsWith('Z') && !str.includes('+') && str.includes('T')) {
    str = str + 'Z';
  }
  return str;
};

// GET /api/verification/history
router.get('/history', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const { search, riskLevel, status, documentType, startDate, endDate, limit = 100, offset = 0 } = req.query;

    let query = 'SELECT * FROM verification_sessions WHERE 1=1';
    const params: any[] = [];

    if (search) {
      query += ' AND (document_number LIKE ? OR holder_name LIKE ? OR verification_id LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (riskLevel && riskLevel !== 'ALL') {
      query += ' AND risk_level = ?';
      params.push(riskLevel);
    }

    if (status && status !== 'ALL') {
      query += ' AND final_status = ?';
      params.push(status);
    }

    if (documentType && documentType !== 'ALL') {
      query += ' AND document_type = ?';
      params.push(documentType);
    }

    if (startDate) {
      query += " AND strftime('%Y-%m-%d', created_at, 'localtime') >= ?";
      params.push(startDate);
    }

    if (endDate) {
      query += " AND strftime('%Y-%m-%d', created_at, 'localtime') <= ?";
      params.push(endDate);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));

    const records = db.prepare(query).all(...params) as any[];

    // Parse details JSON for frontend consumption
    const parsedRecords = records.map((r) => {
      const normalizedTime = normalizeUtcIso(r.created_at);
      try {
        const details = JSON.parse(r.details_json);
        return {
          ...details,
          id: r.verification_id,
          createdAt: normalizedTime,
          timestamp: normalizedTime
        };
      } catch {
        return {
          id: r.verification_id,
          officerName: r.officer_name,
          documentType: r.document_type,
          documentNumber: r.document_number,
          holderName: r.holder_name,
          risk: { score: r.risk_score, level: r.risk_level, status: r.final_status },
          timestamp: normalizedTime,
          createdAt: normalizedTime
        };
      }
    });

    const totalCount = db.prepare('SELECT COUNT(*) as count FROM verification_sessions').get() as { count: number };

    return res.json({
      records: parsedRecords,
      total: totalCount.count
    });
  } catch (err: any) {
    console.error('History fetch error:', err);
    return res.status(500).json({ error: 'Failed to retrieve verification history.' });
  }
});

// DELETE /api/verification/history
// Clear all verification history sessions (Restricted strictly to administrators)
router.delete('/history', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    const info = db.prepare('DELETE FROM verification_sessions').run();
    logAuditEvent(
      req.user!,
      'VERIFICATION_HISTORY_CLEARED',
      'VERIFICATION',
      'ALL',
      `Cleared ${info.changes} verification records from history archives.`,
      req.ip || '127.0.0.1'
    );
    return res.json({ success: true, message: `Successfully cleared ${info.changes} verification records.`, deletedCount: info.changes });
  } catch (err: any) {
    console.error('Clear history error:', err);
    return res.status(500).json({ error: 'Failed to clear verification history.' });
  }
});

// GET /api/verification/image/:filename
// Authenticated access to uploaded raster images with strict containment
router.get('/image/:filename', authenticateToken, requireOfficer, (req: AuthRequest, res: Response) => {
  try {
    const rawFilename = String(req.params.filename || '');
    if (!rawFilename || !/^[a-zA-Z0-9_\-\.]+$/.test(rawFilename)) {
      return res.status(400).json({ error: 'Invalid filename parameter.' });
    }

    const safeFilename = path.basename(rawFilename);
    const resolvedPath = path.resolve(uploadsDir, safeFilename);

    if (!resolvedPath.startsWith(uploadsDir + path.sep)) {
      return res.status(400).json({ error: 'Access denied: Path traversal detected.' });
    }

    if (!fs.existsSync(resolvedPath)) {
      return res.status(404).json({ error: 'Requested image not found.' });
    }

    const ext = path.extname(safeFilename).toLowerCase();
    const mimeMap: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp'
    };
    const contentType = mimeMap[ext] || 'application/octet-stream';

    res.setHeader('Content-Type', contentType);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', 'inline');

    return fs.createReadStream(resolvedPath).pipe(res);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to stream document image.' });
  }
});

// GET /api/verification/:id/image
// Authenticated access to verification document image by verification ID
router.get('/:id/image', authenticateToken, requireOfficer, (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id || '');
    let targetFilePath = '';

    const pending = pendingVerifications.get(id);
    if (pending && pending.rawImagePath) {
      targetFilePath = pending.rawImagePath;
    } else {
      const record = db.prepare('SELECT document_image, details_json FROM verification_sessions WHERE verification_id = ?').get(id) as any;
      if (!record) {
        return res.status(404).json({ error: 'Verification report not found.' });
      }
      try {
        const details = JSON.parse(record.details_json);
        targetFilePath = details.rawImagePath || record.document_image;
      } catch {
        targetFilePath = record.document_image;
      }
    }

    if (!targetFilePath) {
      return res.status(404).json({ error: 'No image associated with this verification.' });
    }

    let candidatePath: string;
    if (targetFilePath.startsWith('/assets/') || targetFilePath.startsWith('assets/')) {
      const clean = targetFilePath.replace(/^\/+/, '');
      candidatePath = path.resolve(process.cwd(), clean);
    } else {
      const filename = path.basename(targetFilePath);
      candidatePath = path.resolve(uploadsDir, filename);
    }

    const assetsDirResolved = path.resolve(process.cwd(), 'assets');
    const isInsideUploads = candidatePath.startsWith(uploadsDir + path.sep);
    const isInsideAssets = candidatePath.startsWith(assetsDirResolved + path.sep);

    if (!isInsideUploads && !isInsideAssets) {
      return res.status(400).json({ error: 'Access denied: Path traversal detected.' });
    }

    if (!fs.existsSync(candidatePath)) {
      return res.status(404).json({ error: 'Image file not found on disk.' });
    }

    const ext = path.extname(candidatePath).toLowerCase();
    const mimeMap: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp'
    };
    const contentType = mimeMap[ext] || 'application/octet-stream';

    res.setHeader('Content-Type', contentType);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', 'inline');

    return fs.createReadStream(candidatePath).pipe(res);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to retrieve document image.' });
  }
});

// GET /api/verification/:id
router.get('/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const record = db.prepare('SELECT * FROM verification_sessions WHERE verification_id = ?').get(id) as any;

    if (!record) {
      return res.status(404).json({ error: 'Verification report not found.' });
    }

    const details = JSON.parse(record.details_json);
    return res.json(details);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch verification details.' });
  }
});

export default router;
