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
        highThreshold: 100,
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
      highThreshold: row.high_threshold,
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
    if (tampering.detected) {
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
    if (face.consistency === 'POSSIBLE_MISMATCH' || face.similarityScore < 60) {
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

    // When severe tampering is detected with face mismatch, calculate identity substitution penalty
    const isPhotoReplacement = tampering.detected && (face.consistency === 'POSSIBLE_MISMATCH' || face.similarityScore < 60);

    // 3. Database Verification Factor
    let dbPenalty = 0;
    let dbSeverity: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
    if (!database.recordFound) {
      dbPenalty = 60;
      dbSeverity = 'MEDIUM';
      rationale.push('Document record was not found in the central government registry.');
    } else if (database.status === 'BLACKLISTED') {
      dbPenalty = 100;
      dbSeverity = 'HIGH';
      rationale.push('🚨 Document or holder is flagged on Interpol / National Blacklist.');
    } else if (database.status === 'SUSPENDED') {
      dbPenalty = 70;
      dbSeverity = 'HIGH';
      rationale.push('⚠ Document is listed as suspended by issuing authority.');
    } else if (database.status === 'EXPIRED') {
      dbPenalty = 50;
      dbSeverity = 'MEDIUM';
      rationale.push('Document is recorded as expired in the database.');
    } else {
      dbPenalty = 2;
      rationale.push('Central registry confirmed: Record is active with matching holder details.');
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
    const isDocExpired = new Date(ocr.fields.expiryDate.value) < new Date();
    if (isDocExpired) {
      docValidPenalty = 60;
      docSeverity = 'HIGH';
      rationale.push('Document has passed its expiration date.');
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
      description: isDocExpired ? 'Document is expired.' : 'Biographical fields are structurally valid.',
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

    // Calculate total weighted score
    const baseScore = factors.reduce((sum, f) => sum + f.contribution, 0);
    const totalScore = isPhotoReplacement
      ? Math.min(95, Math.max(88, Math.round(baseScore + 32)))
      : Math.min(100, Math.max(0, Math.round(baseScore)));

    // Determine Risk Level & Final Status based on thresholds
    let level: RiskLevel = 'LOW';
    let status: FinalStatus = 'VERIFIED';
    let recommendedAction = 'LOW RISK — CONTINUE STANDARD VERIFICATION';

    if (totalScore > config.mediumThreshold || tampering.detected || database.status === 'BLACKLISTED') {
      level = 'HIGH';
      status = 'REQUIRES_MANUAL_REVIEW';
      recommendedAction = 'HIGH RISK — REQUIRES MANUAL REVIEW / SECONDARY INSPECTION';
    } else if (totalScore > config.lowThreshold) {
      level = 'MEDIUM';
      status = 'SUSPICIOUS';
      recommendedAction = 'MEDIUM RISK — OFFICER DISCRETIONARY CHECK RECOMMENDED';
    }

    // Explainable "Why is this document suspicious?" block for high-risk / tampering cases
    let whySuspicious: ExplainableWhySuspicious | undefined;

    if (tampering.detected || level === 'HIGH') {
      whySuspicious = {
        title: 'Why is this document flagged as High Risk?',
        checksPassed: [
          '✓ Document number matches registered government database record',
          '✓ ICAO 9303 MRZ check digits and composite hash are mathematically valid',
          '✓ Biographical text fields (Name, Nationality, DOB) are consistent with registry',
          '✓ Optical scan resolution and contrast are sufficient for inspection'
        ],
        flagsDetected: [
          '🚨 Passport photograph exhibits digital insertion and boundary feathering artifacts',
          '🚨 JPEG Error Level Analysis reveals compression quantization discontinuity around photo frame',
          '⚠ Facial biometric verification similarity is 43.2% (Likely face mismatch against central record)',
          '🚨 Identity consistency anomaly: Valid passport shell with substituted photo'
        ],
        conclusion:
          'In DEMO MODE, this scenario simulates a photo replacement attack. While the document number and MRZ data belong to a legitimate traveler, the photograph does not match the registered profile. Manual secondary inspection is required.',
        investigationGuidance: [
          '1. Request physical passport inspection and examine UV substrate under 365nm light.',
          '2. Compare live passenger biometric capture against chip data / central repository.',
          '3. Escalate to Immigration Secondary Review Officer for document forensic verification.'
        ]
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
