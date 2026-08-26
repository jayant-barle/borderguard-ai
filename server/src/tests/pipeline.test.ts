import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { initDatabase, db } from '../db/database';
import { seedDatabase } from '../db/seed';
import { generateAllSpecimens } from '../utils/generateSpecimens';
import { DemoScenarioService } from '../services/DemoScenarioService';
import { ImageQualityService } from '../services/ImageQualityService';
import { OCRService } from '../services/OCRService';
import { MRZValidationService } from '../services/MRZValidationService';
import { TamperingService } from '../services/TamperingService';
import { FaceVerificationService } from '../services/FaceVerificationService';
import { IdentityMatchingService } from '../services/IdentityMatchingService';
import { RiskEngine } from '../services/RiskEngine';

async function runPipelineTests() {
  console.log('===========================================================');
  console.log('  🧪 BorderGuard AI - End-to-End Pipeline Automated Tests  ');
  console.log('===========================================================');

  // 1. Initialize DB & Generate Specimen Assets
  initDatabase();
  generateAllSpecimens();
  await seedDatabase();
  console.log('✓ Database & Specimen Signatures Initialized');

  const p1Path = path.join(process.cwd(), 'assets', 'specimens', 'specimen_genuine_passport.png');
  const p2Path = path.join(process.cwd(), 'assets', 'specimens', 'specimen_tampered_passport.png');

  if (!fs.existsSync(p1Path) || !fs.existsSync(p2Path)) {
    throw new Error('Specimen files missing!');
  }

  const p1Buffer = fs.readFileSync(p1Path);
  const p2Buffer = fs.readFileSync(p2Path);

  // -------------------------------------------------------------------------
  // TEST 1: Scenario 1 - Genuine Passport Verification
  // -------------------------------------------------------------------------
  console.log('\n-----------------------------------------------------------');
  console.log('  TEST 1: Scenario 1 (Genuine Biometric Passport)');
  console.log('-----------------------------------------------------------');

  const s1Scenario = DemoScenarioService.identifyScenario(p1Buffer, 'specimen_genuine_passport.png');
  console.log(`[DemoScenarioService] Detected: ${s1Scenario.scenario} (${s1Scenario.detectionMethod})`);
  if (s1Scenario.scenario !== 'GENUINE_PASSPORT') {
    throw new Error(`Test 1 Failed: Expected GENUINE_PASSPORT but got ${s1Scenario.scenario}`);
  }

  const s1Quality = ImageQualityService.analyze(p1Buffer, s1Scenario.scenario);
  console.log(`[ImageQualityService] Score: ${s1Quality.overallScore} (${s1Quality.status})`);

  const s1Ocr = await OCRService.extractFields(p1Buffer, s1Scenario.scenario);
  console.log(`[OCRService] Extracted Holder: ${s1Ocr.fields.fullName.value} | Doc#: ${s1Ocr.fields.documentNumber.value}`);
  if (s1Ocr.fields.documentNumber.value !== 'P94821037') {
    throw new Error('Test 1 Failed: Document number mismatch');
  }

  const s1Mrz = MRZValidationService.validate(s1Scenario.scenario, s1Ocr);
  console.log(`[MRZValidationService] Status: ${s1Mrz.overallStatus} | Checksums Valid: ${s1Mrz.checksums.every(c => c.valid)}`);
  if (s1Mrz.overallStatus !== 'PASSED') {
    throw new Error('Test 1 Failed: MRZ validation did not pass');
  }

  const s1Tampering = await TamperingService.analyze(p1Buffer, s1Scenario.scenario);
  console.log(`[TamperingService] Detected: ${s1Tampering.detected} | Confidence: ${s1Tampering.confidence}%`);
  if (s1Tampering.detected !== false) {
    throw new Error('Test 1 Failed: False tampering detected on genuine document');
  }

  const s1Face = await FaceVerificationService.verify(p1Buffer, s1Scenario.scenario);
  console.log(`[FaceVerificationService] Consistency: ${s1Face.consistency} (${s1Face.similarityScore}%)`);
  if (s1Face.consistency !== 'LIKELY_MATCH' || s1Face.similarityScore < 85) {
    throw new Error('Test 1 Failed: Face verification match failed on genuine passport');
  }

  const s1Db = IdentityMatchingService.verifyInDatabase(
    s1Ocr.fields.documentNumber.value,
    s1Ocr.fields.fullName.value,
    s1Ocr.fields.dateOfBirth.value,
    s1Ocr.fields.expiryDate.value
  );
  console.log(`[IdentityMatchingService] Record Found: ${s1Db.recordFound} | Status: ${s1Db.status}`);
  if (!s1Db.recordFound || s1Db.status !== 'ACTIVE') {
    throw new Error('Test 1 Failed: Database record not active');
  }

  const s1Risk = RiskEngine.calculate(s1Tampering, s1Face, s1Db, s1Mrz, s1Ocr, s1Quality);
  console.log(`[RiskEngine] Score: ${s1Risk.score}/100 | Tier: ${s1Risk.level} | Status: ${s1Risk.status}`);
  console.log(`[RiskEngine] Recommendation: ${s1Risk.recommendedAction}`);

  if (s1Risk.level !== 'LOW' || s1Risk.status !== 'VERIFIED' || s1Risk.score > 30) {
    throw new Error(`Test 1 Failed: Expected LOW RISK / VERIFIED, got ${s1Risk.level} (${s1Risk.score}/100)`);
  }
  console.log('>>> TEST 1 PASSED: Genuine Passport correctly classified as LOW RISK / VERIFIED');

  // -------------------------------------------------------------------------
  // TEST 2: Scenario 2 - Photo Replacement / Biometric Mismatch
  // -------------------------------------------------------------------------
  console.log('\n-----------------------------------------------------------');
  console.log('  TEST 2: Scenario 2 (Photo Replacement / Tampered Portrait)');
  console.log('-----------------------------------------------------------');

  const s2Scenario = DemoScenarioService.identifyScenario(p2Buffer, 'specimen_tampered_passport.png');
  console.log(`[DemoScenarioService] Detected: ${s2Scenario.scenario} (${s2Scenario.detectionMethod})`);
  if (s2Scenario.scenario !== 'PHOTO_REPLACEMENT') {
    throw new Error(`Test 2 Failed: Expected PHOTO_REPLACEMENT but got ${s2Scenario.scenario}`);
  }

  const s2Quality = ImageQualityService.analyze(p2Buffer, s2Scenario.scenario);
  const s2Ocr = await OCRService.extractFields(p2Buffer, s2Scenario.scenario);
  const s2Mrz = MRZValidationService.validate(s2Scenario.scenario, s2Ocr);
  const s2Tampering = await TamperingService.analyze(p2Buffer, s2Scenario.scenario);
  const s2Face = await FaceVerificationService.verify(p2Buffer, s2Scenario.scenario);
  const s2Db = IdentityMatchingService.verifyInDatabase(
    s2Ocr.fields.documentNumber.value,
    s2Ocr.fields.fullName.value,
    s2Ocr.fields.dateOfBirth.value,
    s2Ocr.fields.expiryDate.value
  );

  console.log(`[TamperingService] Detected: ${s2Tampering.detected} (${s2Tampering.type}) - ${s2Tampering.summary}`);
  console.log(`[FaceVerificationService] Consistency: ${s2Face.consistency} (${s2Face.similarityScore}%)`);
  console.log(`[IdentityMatchingService] DB Status: ${s2Db.status} (Valid Shell Document)`);

  const s2Risk = RiskEngine.calculate(s2Tampering, s2Face, s2Db, s2Mrz, s2Ocr, s2Quality);
  console.log(`[RiskEngine] Score: ${s2Risk.score}/100 | Tier: ${s2Risk.level} | Status: ${s2Risk.status}`);
  console.log(`[RiskEngine] Recommendation: ${s2Risk.recommendedAction}`);

  if (s2Risk.level !== 'HIGH' || s2Risk.status !== 'REQUIRES_MANUAL_REVIEW' || s2Risk.score < 70) {
    throw new Error(`Test 2 Failed: Expected HIGH RISK / REQUIRES_MANUAL_REVIEW, got ${s2Risk.level} (${s2Risk.score}/100)`);
  }
  if (!s2Risk.whySuspicious) {
    throw new Error('Test 2 Failed: Expected explainable whySuspicious rationale');
  }
  console.log(`[Explainability Check] "${s2Risk.whySuspicious.title}" generated with ${s2Risk.whySuspicious.flagsDetected.length} flag items.`);
  console.log('>>> TEST 2 PASSED: Photo Replacement correctly flagged as HIGH RISK / MANUAL REVIEW');

  // -------------------------------------------------------------------------
  // TEST 3: Renamed File Hash Invariant Test
  // -------------------------------------------------------------------------
  console.log('\n-----------------------------------------------------------');
  console.log('  TEST 3: Specimen Renamed Invariance Test');
  console.log('-----------------------------------------------------------');

  const renamedScenario = DemoScenarioService.identifyScenario(p2Buffer, 'random_unrelated_name_xyz.jpg');
  console.log(`[Renamed File Test] Uploaded under name 'random_unrelated_name_xyz.jpg' -> Detected: ${renamedScenario.scenario} via ${renamedScenario.detectionMethod}`);
  if (renamedScenario.scenario !== 'PHOTO_REPLACEMENT') {
    throw new Error('Test 3 Failed: Renamed specimen was not recognized via SHA256 / Perceptual hash');
  }
  console.log('>>> TEST 3 PASSED: Renamed specimen successfully recognized via image fingerprinting');

  // -------------------------------------------------------------------------
  // TEST 4: Unknown / Generic Image Test
  // -------------------------------------------------------------------------
  console.log('\n-----------------------------------------------------------');
  console.log('  TEST 4: Unknown Image Handling Test');
  console.log('-----------------------------------------------------------');

  const randomBuffer = Buffer.from('NON_SPECIMEN_ARBITRARY_IMAGE_DATA_1234567890');
  const unknownScenario = DemoScenarioService.identifyScenario(randomBuffer, 'vacation_photo.png');
  console.log(`[Unknown Image] Detected: ${unknownScenario.scenario}`);
  if (unknownScenario.scenario !== 'UNKNOWN') {
    throw new Error('Test 4 Failed: Expected UNKNOWN classification');
  }
  const unkTamp = await TamperingService.analyze(randomBuffer, unknownScenario.scenario);
  if (unkTamp.detected !== false) {
    throw new Error('Test 4 Failed: Should not falsely fabricate tampering on unknown files');
  }
  console.log('>>> TEST 4 PASSED: Unknown image handled safely without false accusations');

  console.log('\n===========================================================');
  console.log('  🎉 ALL AUTOMATED PIPELINE TESTS PASSED SUCCESSFULLY!    ');
  console.log('===========================================================');
  process.exit(0);
}

runPipelineTests().catch((err) => {
  console.error('\n❌ PIPELINE TEST FAILED:', err);
  process.exit(1);
});

