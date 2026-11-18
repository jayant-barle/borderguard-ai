import {
  RiskAssessment,
  RiskFactor,
  RiskLevel,
  FinalStatus,
  RiskConfig,
  TamperingResult,
  FaceVerificationResult,
  DatabaseVerificationResult,
  MRZResult,
  OCRResult,
  ImageQualityResult,
  ExplainableWhySuspicious
} from '../../../shared/types';
import { db } from '../db/database';
import { normalizeDateToIso } from './IdentityMatchingService';

export class RiskEngine {
  /**
   * Fetch current risk configuration from SQLite database
   */
  public static getConfig(): RiskConfig {
    const row = db.prepare('SELECT * FROM risk_config ORDER BY id DESC LIMIT 1').get() as any;
    if (!row) {
      return {
        id: 1,
        tamperingWeight: 30,
        faceMismatchWeight: 30,
        databaseWeight: 15,
        mrzWeight: 10,
        docValidWeight: 10,
        qualityWeight: 5,
        lowThreshold: 30,
        mediumThreshold: 60,
        updatedAt: new Date().toISOString()
      };
    }

    return {
      id: row.id,
      tamperingWeight: row.tampering_weight,
      faceMismatchWeight: row.face_mismatch_weight,
      databaseWeight: row.database_weight,
      mrzWeight: row.mrz_weight,
      docValidWeight: row.doc_valid_weight,
      qualityWeight: row.quality_weight,
      lowThreshold: row.low_threshold,
      mediumThreshold: row.medium_threshold,
      updatedAt: row.updated_at,
      updatedBy: row.updated_by
    };
  }

  /**
   * Evaluate all screening signals and compute explainable risk assessment
   */
  public static calculate(
    tampering: TamperingResult,
    face: FaceVerificationResult,
    database: DatabaseVerificationResult,
    mrz: MRZResult,
    ocr: OCRResult,
    quality: ImageQualityResult
  ): RiskAssessment {
    const config = this.getConfig();
    const factors: RiskFactor[] = [];
    const rationale: string[] = [];

    // 1. Tampering Factor
    let tamperingPenalty = 0;
    let tamperingSeverity: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
    if (tampering.status === 'ERROR') {
      tamperingPenalty = 96;
      tamperingSeverity = 'HIGH';
      rationale.push('Tampering forensics module encountered an error (failing closed).');
    } else if (tampering.detected) {
      tamperingPenalty = 96;
      tamperingSeverity = 'HIGH';
      rationale.push('Critical forensic tampering anomaly: Photo substitution detected.');
    } else {
      tamperingPenalty = 4;
      rationale.push('Document substrate and photo boundary forensic analysis normal.');
    }
    factors.push({
      id: 'FACTOR_TAMPERING',
      name: 'Tampering & Manipulation Forensics',
      category: 'TAMPERING',
      weight: config.tamperingWeight,
      penaltyScore: tamperingPenalty,
      contribution: Number(((tamperingPenalty * config.tamperingWeight) / 100).toFixed(1)),
      description: tampering.summary,
      severity: tamperingSeverity
    });

    // 2. Face Biometric Factor
    let facePenalty = 0;
    let faceSeverity: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
    if (face.status === 'ERROR') {
      facePenalty = 95;
      faceSeverity = 'HIGH';
      rationale.push('Face verification module encountered an error (failing closed).');
    } else if (face.consistency === 'NOT_EVALUATED' || face.evaluated === false) {
      facePenalty = 50;
      faceSeverity = 'MEDIUM';
      rationale.push('Facial biometric verification not evaluated (no central registry reference photo).');
    } else if (face.consistency === 'POSSIBLE_MISMATCH' || (face.similarityScore !== null && face.similarityScore < 60)) {
      facePenalty = 95;
      faceSeverity = 'HIGH';
      rationale.push(`Facial biometric similarity is only ${face.similarityScore}%, indicating a probable photo mismatch.`);
    } else {
      facePenalty = 5;
      rationale.push(`Biometric facial similarity confirmed at ${face.similarityScore}%.`);
    }
    factors.push({
      id: 'FACTOR_FACE',
      name: 'Facial Biometric Consistency',
      category: 'FACE',
      weight: config.faceMismatchWeight,
      penaltyScore: facePenalty,
      contribution: Number(((facePenalty * config.faceMismatchWeight) / 100).toFixed(1)),
      description: face.summary,
      severity: faceSeverity
    });

    // 3. Database Verification Factor
    let dbPenalty = 0;
    let dbSeverity: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
    if (!database.recordFound) {
      dbPenalty = 60;
      dbSeverity = 'MEDIUM';
      rationale.push('Document record was not found in the central government registry.');
    } else {
      if (database.status === 'BLACKLISTED') {
        dbPenalty = 100;
        rationale.push('🚨 Document or holder is flagged on Interpol / National Blacklist.');
      } else if (database.status === 'SUSPENDED') {
        dbPenalty = 70;
        rationale.push('⚠ Document is listed as suspended by issuing authority.');
      } else if (database.status === 'EXPIRED') {
        dbPenalty = 50;
        rationale.push('Document is recorded as expired in the database.');
      } else if (database.status === 'PENDING_VERIFICATION') {
        dbPenalty = 40;
        rationale.push('Document record is pending verification; manual review required.');
      } else {
        dbPenalty = 2;
        rationale.push('Central registry confirmed: Record is active.');
      }

      // Check biographical field disparities against authentic registry record
      if (!database.nameMatch) {
        dbPenalty += 25;
        rationale.push('Identity disparity: Extracted holder name does not match registry record.');
      }
      if (!database.dobMatch) {
        dbPenalty += 30;
        rationale.push('Identity disparity: Date of birth does not match registry record.');
      }
      if (!database.expiryMatch) {
        dbPenalty += 20;
        rationale.push('Identity disparity: Expiry date does not match registry record.');
      }

      dbPenalty = Math.min(100, dbPenalty);
      if (dbPenalty >= 60) {
        dbSeverity = 'HIGH';
      } else if (dbPenalty >= 30) {
        dbSeverity = 'MEDIUM';
      } else {
        dbSeverity = 'LOW';
      }
    }
    factors.push({
      id: 'FACTOR_DATABASE',
      name: 'Central Database & Watchlist Status',
      category: 'DATABASE',
      weight: config.databaseWeight,
      penaltyScore: dbPenalty,
      contribution: Number(((dbPenalty * config.databaseWeight) / 100).toFixed(1)),
      description: database.summary,
      severity: dbSeverity
    });

    // 4. MRZ Validation Factor
    let mrzPenalty = 0;
    let mrzSeverity: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
    if (mrz.overallStatus === 'PASSED') {
      mrzPenalty = 2;
      rationale.push('ICAO 9303 MRZ format and check digits verified successfully.');
    } else if (mrz.overallStatus === 'WARNING') {
      mrzPenalty = 35;
      mrzSeverity = 'MEDIUM';
      rationale.push('MRZ zone could not be fully parsed or validated.');
    } else {
      mrzPenalty = 80;
      mrzSeverity = 'HIGH';
      rationale.push('MRZ check digit validation failed.');
    }
    factors.push({
      id: 'FACTOR_MRZ',
      name: 'ICAO 9303 MRZ Integrity',
      category: 'MRZ',
      weight: config.mrzWeight,
      penaltyScore: mrzPenalty,
      contribution: Number(((mrzPenalty * config.mrzWeight) / 100).toFixed(1)),
      description: mrz.overallStatus === 'PASSED' ? 'All check digits match optical data.' : 'MRZ validation issues detected.',
      severity: mrzSeverity
    });

    // 5. Document Field Validation Factor
    let docValidPenalty = 0;
    let docSeverity: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
    const isoExpiry = normalizeDateToIso(ocr.fields?.expiryDate?.value);
    let isDocExpired = false;
    let isExpiryUnparseable = false;

    if (!isoExpiry) {
      isExpiryUnparseable = true;
    } else {
      const expDate = new Date(isoExpiry);
      if (isNaN(expDate.getTime())) {
        isExpiryUnparseable = true;
      } else {
        isDocExpired = expDate < new Date();
      }
    }

    if (isDocExpired) {
      docValidPenalty = 60;
      docSeverity = 'HIGH';
      rationale.push('Document has passed its expiration date.');
    } else if (isExpiryUnparseable) {
      docValidPenalty = 40;
      docSeverity = 'MEDIUM';
      rationale.push('Document expiry date is missing or unparseable; manual review required.');
    } else if (ocr.confidence < 80) {
      docValidPenalty = 25;
      docSeverity = 'MEDIUM';
      rationale.push('Lower OCR field extraction confidence.');
    } else {
      docValidPenalty = 3;
      rationale.push('All biographical and document validity fields are in order.');
    }
    factors.push({
      id: 'FACTOR_DOCUMENT',
      name: 'Document Expiry & Biographical Fields',
      category: 'DOCUMENT',
      weight: config.docValidWeight,
      penaltyScore: docValidPenalty,
      contribution: Number(((docValidPenalty * config.docValidWeight) / 100).toFixed(1)),
      description: isDocExpired
        ? 'Document is expired.'
        : isExpiryUnparseable
        ? 'Expiry date is unverified or missing.'
        : 'Biographical fields are structurally valid.',
      severity: docSeverity
    });

    // 6. Image Quality Factor
    let qualityPenalty = 0;
    let qualitySeverity: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
    if (quality.overallScore < 60) {
      qualityPenalty = 50;
      qualitySeverity = 'HIGH';
      rationale.push('Poor scan quality may impair forensic accuracy.');
    } else if (quality.overallScore < 75) {
      qualityPenalty = 20;
      qualitySeverity = 'MEDIUM';
    } else {
      qualityPenalty = 2;
    }
    factors.push({
      id: 'FACTOR_QUALITY',
      name: 'Optical Capture & Scan Quality',
      category: 'QUALITY',
      weight: config.qualityWeight,
      penaltyScore: qualityPenalty,
      contribution: Number(((qualityPenalty * config.qualityWeight) / 100).toFixed(1)),
      description: `Quality index: ${quality.overallScore}% (${quality.status}).`,
      severity: qualitySeverity
    });

    // Calculate total weighted score (pure sum of factor contributions, clamped to 0-100)
    const baseScore = factors.reduce((sum, f) => sum + f.contribution, 0);
    const totalScore = Math.min(100, Math.max(0, Math.round(baseScore)));

    // Determine Risk Level & Final Status based on thresholds
    // LOW if score < lowThreshold; MEDIUM if lowThreshold <= score < mediumThreshold; HIGH if score >= mediumThreshold
    let level: RiskLevel = 'LOW';
    let status: FinalStatus = 'VERIFIED';
    let recommendedAction = 'LOW RISK — CONTINUE STANDARD VERIFICATION';

    if (totalScore >= config.mediumThreshold) {
      level = 'HIGH';
      status = 'REQUIRES_MANUAL_REVIEW';
      recommendedAction = 'HIGH RISK — REQUIRES MANUAL REVIEW / SECONDARY INSPECTION';
    } else if (totalScore >= config.lowThreshold) {
      level = 'MEDIUM';
      status = 'SUSPICIOUS';
      recommendedAction = 'MEDIUM RISK — OFFICER DISCRETIONARY CHECK RECOMMENDED';
    }

    // Hard overrides: force HIGH risk and REQUIRES_MANUAL_REVIEW regardless of score
    const isTamperingConfirmed = tampering.detected === true;
    const isBlacklisted = database.status === 'BLACKLISTED';
    const isMrzChecksumFailure = mrz.overallStatus === 'FAILED' && (mrz.checksums ? mrz.checksums.some((c) => !c.valid) : true);
    const isIdentityMismatch = database.recordFound && (!database.nameMatch || !database.dobMatch);
    const isForensicError = tampering.status === 'ERROR' || face.status === 'ERROR';
    const isUnevaluatedFace = face.consistency === 'NOT_EVALUATED' || face.evaluated === false;

    if (
      isTamperingConfirmed ||
      isBlacklisted ||
      isMrzChecksumFailure ||
      isIdentityMismatch ||
      isForensicError ||
      isUnevaluatedFace
    ) {
      level = 'HIGH';
      status = 'REQUIRES_MANUAL_REVIEW';

      if (isForensicError) {
        if (tampering.status === 'ERROR') {
          rationale.push('Forensic failure: TamperingService failed closed with status ERROR (manual review required).');
        }
        if (face.status === 'ERROR') {
          rationale.push('Forensic failure: FaceVerificationService failed closed with status ERROR (manual review required).');
        }
        recommendedAction = 'FORENSIC FAILURE — REQUIRES MANUAL REVIEW / SECONDARY INSPECTION';
      } else if (isBlacklisted) {
        recommendedAction = 'SECURITY ALERT — BLACKLISTED IDENTITY (INTERCEPT IMMEDIATELY)';
      } else if (isTamperingConfirmed) {
        recommendedAction = 'TAMPERING DETECTED — PHOTO SUBSTITUTION / DIGITAL FORGERY';
      } else if (isIdentityMismatch) {
        rationale.push('Identity mismatch: Passenger biographical data does not match central database record.');
        recommendedAction = 'IDENTITY MISMATCH — HOLDER DETAILS DO NOT MATCH REGISTRY';
      } else if (isMrzChecksumFailure) {
        rationale.push('MRZ validation failure: Checksum digits do not match extracted optical character data.');
        recommendedAction = 'MRZ CHECKSUM FAILED — DOCUMENT INTEGRITY COMPROMISED';
      } else if (isUnevaluatedFace) {
        rationale.push('Biometric review required: No reference photo found in central registry for automated face comparison.');
        recommendedAction = 'BIOMETRIC CHECK PENDING — NO REGISTRY REFERENCE PHOTO AVAILABLE';
      }
    }

    // Explainable "Why is this document suspicious?" block derived strictly from real measured factors
    let whySuspicious: ExplainableWhySuspicious | undefined;

    if (tampering.detected || level === 'HIGH' || status === 'REQUIRES_MANUAL_REVIEW') {
      const checksPassed: string[] = [];
      const flagsDetected: string[] = [];

      for (const factor of factors) {
        if (factor.severity === 'LOW') {
          checksPassed.push(`✓ ${factor.name}: ${factor.description}`);
        } else {
          const prefix = factor.severity === 'HIGH' ? '🚨' : '⚠';
          flagsDetected.push(`${prefix} ${factor.name}: ${factor.description}`);
        }
      }

      // Add specific forensic indicator flags if tampering detected
      if (tampering.detected && tampering.indicators) {
        for (const ind of tampering.indicators) {
          if (ind.detected || ind.score > 50) {
            flagsDetected.push(`🚨 ${ind.name}: ${ind.description}`);
          }
        }
      }

      const isDemoMode = process.env.DEMO_MODE === 'true';
      let conclusion: string;
      if (isForensicError) {
        conclusion = 'Automated forensic analysis could not verify image integrity (failed closed). Manual secondary inspection is required.';
      } else if (isDemoMode) {
        conclusion = 'In DEMO MODE, this scenario simulates a photo replacement attack. While the document number and MRZ data belong to a legitimate traveler, the photograph does not match the registered profile. Manual secondary inspection is required.';
      } else {
        const flagCount = flagsDetected.length;
        conclusion = `Automated screening identified ${flagCount} anomalous signal${flagCount === 1 ? '' : 's'} across biometric, forensic, or database verification checks. Manual secondary inspection is required before clearance.`;
      }

      const investigationGuidance: string[] = [
        '1. Request physical passport inspection and examine UV substrate under 365nm light.',
        '2. Verify traveler biometrics against physical document and central registry credentials.',
        '3. Escalate to Secondary Inspection Officer for manual identity cross-examination.'
      ];

      whySuspicious = {
        title: isForensicError
          ? 'Why is this document flagged for Manual Review?'
          : 'Why is this document flagged as High Risk / Suspicious?',
        checksPassed,
        flagsDetected,
        conclusion,
        investigationGuidance
      };
    }

    return {
      score: totalScore,
      level,
      status,
      factors,
      recommendedAction,
      rationale,
      whySuspicious
    };
  }
}
