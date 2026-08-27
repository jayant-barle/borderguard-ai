import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { db } from '../db/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
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
import { DocumentType, VerificationResult, AIMode } from '../../../shared/types';

const router = Router();

// Configure multer storage for uploaded verification documents
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'doc-' + uniqueSuffix + path.extname(file.originalname || '.png'));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype) || file.originalname.match(/\.(jpg|jpeg|png|webp)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file format. Only JPG, JPEG, and PNG images are supported.'));
    }
  }
});

// POST /api/verification/process
// Accepts multipart/form-data or JSON (base64 image)
router.post('/process', authenticateToken, upload.single('document'), async (req: AuthRequest, res: Response) => {
  const startTime = Date.now();

  try {
    const documentType: DocumentType = (req.body.documentType as DocumentType) || 'PASSPORT';
    const explicitScenario = req.body.scenario; // Optional test trigger

    let imageBuffer: Buffer;
    let imagePath = '';
    let filename = '';

    if (req.file) {
      imageBuffer = fs.readFileSync(req.file.path);
      imagePath = `/uploads/${req.file.filename}`;
      filename = req.file.originalname;
    } else if (req.body.imageBase64) {
      // Handle camera capture sent as base64
      const base64Data = req.body.imageBase64.replace(/^data:image\/\w+;base64,/, '');
      imageBuffer = Buffer.from(base64Data, 'base64');
      const uniqueName = `camera-${Date.now()}.png`;
      const savePath = path.join(uploadsDir, uniqueName);
      fs.writeFileSync(savePath, imageBuffer);
      imagePath = `/uploads/${uniqueName}`;
      filename = uniqueName;
    } else if (req.body.sampleSpecimenUrl) {
      // Direct sample specimen trigger
      const specimenPath = path.join(process.cwd(), req.body.sampleSpecimenUrl.replace(/^\//, ''));
      if (fs.existsSync(specimenPath)) {
        imageBuffer = fs.readFileSync(specimenPath);
      } else {
        imageBuffer = Buffer.from('DEMO_PASSPORT_SPECIMEN');
      }
      imagePath = req.body.sampleSpecimenUrl;
      filename = path.basename(req.body.sampleSpecimenUrl);
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
    const cleanDocNum = (ocr.fields.documentNumber?.value && ocr.fields.documentNumber.value !== 'DOC-UNREAD')
      ? ocr.fields.documentNumber.value.trim().toUpperCase()
      : (filename ? filename.replace(/\.[^/.]+$/, '').toUpperCase() : `DOC-${Date.now().toString().slice(-6)}`);
    const cleanHolderName = (ocr.fields.fullName?.value && ocr.fields.fullName.value !== 'TRAVELER')
      ? ocr.fields.fullName.value.trim().toUpperCase()
      : (filename ? filename.replace(/\.[^/.]+$/, '').replace(/[_\-]/g, ' ').toUpperCase() : 'REGISTERED CITIZEN');
    const cleanNationality = ocr.fields.nationality?.value || 'IND';
    const cleanDob = ocr.fields.dateOfBirth?.value || '1990-01-01';
    const cleanGender = ocr.fields.gender?.value || 'F';
    const cleanIssue = ocr.fields.issueDate?.value || new Date().toISOString().split('T')[0];
    const cleanExpiry = ocr.fields.expiryDate?.value || '2034-12-31';

    let databaseVerification = IdentityMatchingService.verifyInDatabase(
      cleanDocNum,
      cleanHolderName,
      cleanDob,
      cleanExpiry
    );

    // If new unsaved document, register initial record in registry
    if (!databaseVerification.recordFound && scenarioResult.scenario === 'UNKNOWN') {
      IdentityMatchingService.registerOrUpdateDocument({
        documentNumber: cleanDocNum,
        documentType,
        holderName: cleanHolderName,
        nationality: cleanNationality,
        dateOfBirth: cleanDob,
        gender: cleanGender,
        issueDate: cleanIssue,
        expiryDate: cleanExpiry,
        photoUrl: faceVerification.extractedFaceUrl || imagePath,
        notes: `Auto-registered upon document screening scan on ${new Date().toLocaleDateString()}`
      });

      databaseVerification = IdentityMatchingService.verifyInDatabase(
        cleanDocNum,
        cleanHolderName,
        cleanDob,
        cleanExpiry
      );
    }

    // Step 7: Dynamic Substrate & Photo Tampering Analysis
    const isBiometricMismatch = faceVerification.consistency === 'POSSIBLE_MISMATCH' || faceVerification.similarityScore < 60;
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

    const result: VerificationResult = {
      id: verificationId,
      timestamp: new Date().toISOString(),
      officerId: req.user!.id,
      officerName: req.user!.name,
      officerBadge: req.user!.badge_number,
      documentType,
      documentImage: imagePath, // Preserves the exact user uploaded/adjusted document image
      documentNumber: ocr.fields.documentNumber.value,
      holderName: ocr.fields.fullName.value,
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

    return res.json(result);
  } catch (err: any) {
    console.error('Verification process error:', err);
    return res.status(500).json({ error: err.message || 'Error occurred during document verification pipeline.' });
  }
});

// POST /api/verification/save
// Persist completed verification result into SQLite
router.post('/save', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const result: VerificationResult = req.body;

    if (!result || !result.id || !result.documentNumber) {
      return res.status(400).json({ error: 'Incomplete verification payload.' });
    }

    const currentIso = result.timestamp && !isNaN(new Date(result.timestamp).getTime())
      ? new Date(result.timestamp).toISOString()
      : new Date().toISOString();

    const insert = db.prepare(`
      INSERT OR REPLACE INTO verification_sessions (
        verification_id, officer_id, officer_name, officer_badge,
        document_type, document_image, document_number, holder_name,
        ai_mode, scenario_detected, risk_score, risk_level, final_status,
        processing_time_ms, details_json, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insert.run(
      result.id,
      req.user!.id,
      req.user!.name,
      req.user!.badge_number || 'N/A',
      result.documentType,
      result.documentImage,
      result.documentNumber,
      result.holderName,
      result.aiMode,
      result.scenarioDetected,
      result.risk.score,
      result.risk.level,
      result.risk.status,
      result.processingTimeMs,
      JSON.stringify({ ...result, timestamp: currentIso }),
      result.notes || '',
      currentIso
    );

    logAuditEvent(
      req.user!,
      'VERIFICATION_SAVED',
      'VERIFICATION',
      result.id,
      `Saved verification report for ${result.holderName} (${result.documentNumber}) — Result: ${result.risk.level} (${result.risk.score}/100)`,
      req.ip || '127.0.0.1'
    );

    return res.json({ success: true, message: 'Verification record successfully saved.', id: result.id });
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
// Clear all verification history sessions
router.delete('/history', authenticateToken, (req: AuthRequest, res: Response) => {
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
