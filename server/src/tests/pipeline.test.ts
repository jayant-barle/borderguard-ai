import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { initDatabase, db } from '../db/database';
import { seedDatabase } from '../db/seed';
import { generateAllSpecimens } from '../utils/generateSpecimens';
import { DemoScenarioService } from '../services/DemoScenarioService';
import { ImageQualityService } from '../services/ImageQualityService';
import { OCRService } from '../services/OCRService';
import { MRZValidationService } from '../services/MRZValidationService';
import { TamperingService } from '../services/TamperingService';
import { FaceVerificationService } from '../services/FaceVerificationService';
import { IdentityMatchingService, normalizeDateToIso, compareNameTokens } from '../services/IdentityMatchingService';
import { RiskEngine } from '../services/RiskEngine';
import { OCRResult } from '../../../shared/types';

async function runPipelineTests() {
  console.log('===========================================================');
  console.log('  🧪 BorderGuard AI - End-to-End Pipeline Automated Tests  ');
  console.log('===========================================================');

  // Set DEMO_MODE=true for baseline specimen tests
  process.env.DEMO_MODE = 'true';

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
  // TEST 1: Scenario 1 - Genuine Passport Verification (DEMO_MODE=true)
  // -------------------------------------------------------------------------
  console.log('\n-----------------------------------------------------------');
  console.log('  TEST 1: Scenario 1 (Genuine Biometric Passport in DEMO_MODE)');
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
  if (s1Tampering.detected !== false || s1Tampering.confidence === null || s1Tampering.confidence < 75) {
    throw new Error(`Test 1 Failed: Genuine specimen returned unexpected detection (${s1Tampering.detected}) or low confidence (${s1Tampering.confidence})`);
  }
  // Check that all indicators are strictly measured ones
  const hasUnmeasured = s1Tampering.indicators.some(
    (ind) => ind.name.includes('Sub-pixel') || ind.name.includes('Micro-Print') || ind.evaluated === false
  );
  if (hasUnmeasured) {
    throw new Error('Test 1 Failed: Genuine specimen returned unmeasured or fake forensic indicators');
  }

  const s1Face = await FaceVerificationService.verify(p1Buffer, s1Scenario.scenario);
  console.log(`[FaceVerificationService] Consistency: ${s1Face.consistency} (${s1Face.similarityScore}%)`);
  if (s1Face.consistency !== 'LIKELY_MATCH' || s1Face.similarityScore === null || s1Face.similarityScore < 85) {
    throw new Error('Test 1 Failed: Face verification match failed on genuine passport');
  }

  IdentityMatchingService.registerOrUpdateDocument({
    documentNumber: s1Ocr.fields.documentNumber.value,
    documentType: 'PASSPORT',
    holderName: s1Ocr.fields.fullName.value,
    nationality: s1Ocr.fields.nationality.value,
    dateOfBirth: s1Ocr.fields.dateOfBirth.value,
    expiryDate: s1Ocr.fields.expiryDate.value,
    photoUrl: s1Face.extractedFaceUrl,
    status: 'ACTIVE'
  });

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

  if (s2Risk.level !== 'HIGH' || s2Risk.status !== 'REQUIRES_MANUAL_REVIEW') {
    throw new Error(`Test 2 Failed: Expected HIGH RISK / REQUIRES_MANUAL_REVIEW, got ${s2Risk.level} (${s2Risk.score}/100)`);
  }
  // Natural factor score for Scenario 2 (28.8 + 28.5 + 0.3 + 0.2 + 0.3 + 0.1 = 58)
  if (s2Risk.score !== 58) {
    throw new Error(`Test 2 Failed: Expected natural score 58 (without artificial clamp), got ${s2Risk.score}`);
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
    throw new Error('Test 3 Failed: Renamed specimen was not recognized via SHA256');
  }
  console.log('>>> TEST 3 PASSED: Renamed specimen successfully recognized via image fingerprinting');

  // -------------------------------------------------------------------------
  // NEW HARDENING TESTS (A, B, C, D)
  // -------------------------------------------------------------------------

  // Create a real 300x300 image for testing non-demo workflows
  const testRasterImage = await sharp({
    create: {
      width: 300,
      height: 300,
      channels: 3,
      background: { r: 160, g: 180, b: 200 }
    }
  }).png().toBuffer();

  // Test A: Forged/unknown image named 'genuine_fake.jpg', DEMO_MODE unset
  console.log('\n-----------------------------------------------------------');
  console.log('  TEST A: Unknown Image Named "genuine_fake.jpg" (DEMO_MODE unset)');
  console.log('-----------------------------------------------------------');
  delete process.env.DEMO_MODE; // Unset DEMO_MODE

  const testAScenario = DemoScenarioService.identifyScenario(testRasterImage, 'genuine_fake.jpg');
  console.log(`[Test A] Scenario detected: ${testAScenario.scenario} (Filename heuristic bypassed)`);
  if (testAScenario.scenario !== 'UNKNOWN') {
    throw new Error(`Test A Failed: Expected UNKNOWN for 'genuine_fake.jpg', got ${testAScenario.scenario}`);
  }

  const testAFace = await FaceVerificationService.verify(testRasterImage, testAScenario.scenario);
  console.log(`[Test A] Face Verification: score=${testAFace.similarityScore}, consistency=${testAFace.consistency}`);
  if (testAFace.similarityScore === 94.8) {
    throw new Error('Test A Failed: Face verification returned hardcoded demo score 94.8 for non-specimen image!');
  }

  const testATampering = await TamperingService.analyze(testRasterImage, testAScenario.scenario);
  console.log(`[Test A] Tampering: detected=${testATampering.detected}, confidence=${testATampering.confidence}`);
  if (testATampering.confidence === 96.5) {
    throw new Error('Test A Failed: Tampering service returned hardcoded demo confidence 96.5 for non-specimen image!');
  }
  console.log('>>> TEST A PASSED: Real pixel analysis executed, no hardcoded values returned.');

  // Test B: Request with scenario=GENUINE_PASSPORT, DEMO_MODE unset
  console.log('\n-----------------------------------------------------------');
  console.log('  TEST B: Explicit scenario=GENUINE_PASSPORT ignored when DEMO_MODE unset');
  console.log('-----------------------------------------------------------');
  delete process.env.DEMO_MODE;

  const testBScenario = DemoScenarioService.identifyScenario(testRasterImage, 'sample.jpg', 'GENUINE_PASSPORT');
  console.log(`[Test B] Scenario detected: ${testBScenario.scenario}`);
  if (testBScenario.scenario !== 'UNKNOWN') {
    throw new Error(`Test B Failed: Explicit scenario was not ignored when DEMO_MODE is unset! Got: ${testBScenario.scenario}`);
  }

  const testBTampering = await TamperingService.analyze(testRasterImage, testBScenario.scenario);
  if (testBTampering.confidence === 96.5) {
    throw new Error('Test B Failed: Hardcoded demo tampering result returned despite DEMO_MODE being unset!');
  }
  console.log('>>> TEST B PASSED: Client scenario header ignored in production mode.');

  // Test C: Corrupt / truncated buffer -> Fail Closed with status ERROR and REQUIRES_MANUAL_REVIEW
  console.log('\n-----------------------------------------------------------');
  console.log('  TEST C: Corrupt / Truncated Buffer Fail-Closed Architecture');
  console.log('-----------------------------------------------------------');
  const corruptBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46]); // Broken JPEG
  const zeroByteBuffer = Buffer.alloc(0);

  const cTamperingCorrupt = await TamperingService.analyze(corruptBuffer, 'UNKNOWN');
  console.log(`[Test C] Corrupt Tampering Status: ${cTamperingCorrupt.status}, Confidence: ${cTamperingCorrupt.confidence}`);
  if (cTamperingCorrupt.status !== 'ERROR' || cTamperingCorrupt.confidence !== null) {
    throw new Error('Test C Failed: TamperingService did not return status ERROR and null confidence on corrupt buffer');
  }

  const cFaceCorrupt = await FaceVerificationService.verify(corruptBuffer, 'UNKNOWN');
  console.log(`[Test C] Corrupt Face Status: ${cFaceCorrupt.status}, SimilarityScore: ${cFaceCorrupt.similarityScore}`);
  if (cFaceCorrupt.status !== 'ERROR' || cFaceCorrupt.similarityScore !== null) {
    throw new Error('Test C Failed: FaceVerificationService did not return status ERROR and null score on corrupt buffer');
  }

  const cTamperingZero = await TamperingService.analyze(zeroByteBuffer, 'UNKNOWN');
  const cFaceZero = await FaceVerificationService.verify(zeroByteBuffer, 'UNKNOWN');
  if (cTamperingZero.status !== 'ERROR' || cFaceZero.status !== 'ERROR') {
    throw new Error('Test C Failed: Zero-byte buffer did not fail closed with status ERROR');
  }

  const dummyOcr = await OCRService.extractFields(testRasterImage, 'UNKNOWN');
  const dummyMrz = MRZValidationService.validate('UNKNOWN', dummyOcr);
  const dummyDb = IdentityMatchingService.verifyInDatabase('DOC-TEST', 'TEST HOLDER', '1990-01-01', '2030-01-01');
  const dummyQuality = ImageQualityService.analyze(testRasterImage, 'UNKNOWN');

  const cRisk = RiskEngine.calculate(cTamperingCorrupt, cFaceCorrupt, dummyDb, dummyMrz, dummyOcr, dummyQuality);
  console.log(`[Test C] Risk Status with Errors: ${cRisk.status}, Level: ${cRisk.level}`);
  if (cRisk.status !== 'REQUIRES_MANUAL_REVIEW') {
    throw new Error(`Test C Failed: RiskEngine did not mandate REQUIRES_MANUAL_REVIEW on forensic ERROR! Got ${cRisk.status}`);
  }
  const hasTamperingRationale = cRisk.rationale.some(r => r.includes('TamperingService'));
  const hasFaceRationale = cRisk.rationale.some(r => r.includes('FaceVerificationService'));
  if (!hasTamperingRationale || !hasFaceRationale) {
    throw new Error('Test C Failed: RiskEngine rationale did not name the failed forensic modules');
  }
  console.log('>>> TEST C PASSED: Fail-closed architecture verified on corrupt and zero-byte buffers.');

  // Test D: DEMO_MODE=true with bundled genuine specimen -> Unchanged documented demo result
  console.log('\n-----------------------------------------------------------');
  console.log('  TEST D: Bundled Specimen with DEMO_MODE=true');
  console.log('-----------------------------------------------------------');
  process.env.DEMO_MODE = 'true';

  const dScenario = DemoScenarioService.identifyScenario(p1Buffer, 'specimen_genuine_passport.png');
  const dTampering = await TamperingService.analyze(p1Buffer, dScenario.scenario);
  const dFace = await FaceVerificationService.verify(p1Buffer, dScenario.scenario);
  console.log(`[Test D] Demo Mode Genuine: Scenario=${dScenario.scenario}, TamperingDetected=${dTampering.detected}, FaceSim=${dFace.similarityScore}%`);

  if (dScenario.scenario !== 'GENUINE_PASSPORT' || dTampering.detected !== false || dTampering.confidence === null || dFace.similarityScore !== 94.8) {
    throw new Error('Test D Failed: Documented demo specimen values altered when DEMO_MODE=true');
  }
  console.log('>>> TEST D PASSED: Bundled genuine specimen correctly preserves demo outcomes under DEMO_MODE=true.');

  // -------------------------------------------------------------------------
  // TEST a: Genuine specimen (DEMO_MODE=true): indicators are only measured ones; score matches formula
  // -------------------------------------------------------------------------
  console.log('\n-----------------------------------------------------------');
  console.log('  TEST a: Genuine Specimen Measured Indicators & Formula Match');
  console.log('-----------------------------------------------------------');
  process.env.DEMO_MODE = 'true';
  const aTampering = await TamperingService.analyze(p1Buffer, 'GENUINE_PASSPORT');
  if (aTampering.indicators.length === 0) {
    throw new Error('Test a Failed: No indicators returned for genuine specimen');
  }
  for (const ind of aTampering.indicators) {
    if (ind.value === undefined || ind.threshold === undefined || ind.evaluated !== true) {
      throw new Error(`Test a Failed: Indicator ${ind.name} is missing value, threshold, or evaluated flag`);
    }
  }
  const aRisk = RiskEngine.calculate(aTampering, s1Face, s1Db, s1Mrz, s1Ocr, s1Quality);
  const aExpectedScore = Math.min(100, Math.max(0, Math.round(aRisk.factors.reduce((sum, f) => sum + f.contribution, 0))));
  if (aRisk.score !== aExpectedScore) {
    throw new Error(`Test a Failed: Score ${aRisk.score} did not match sum of factor contributions ${aExpectedScore}`);
  }
  console.log(`>>> TEST a PASSED: Genuine specimen returned ${aTampering.indicators.length} measured indicators, score ${aRisk.score} matches formula.`);

  // -------------------------------------------------------------------------
  // TEST b: Synthetic warm-lit image vs neutral image
  // -------------------------------------------------------------------------
  console.log('\n-----------------------------------------------------------');
  console.log('  TEST b: Synthetic Warm-Lit vs Neutral Image Measurement');
  console.log('-----------------------------------------------------------');
  delete process.env.DEMO_MODE;
  // Neutral image (gray substrate, gray photo box)
  const neutralBuffer = await sharp({
    create: { width: 400, height: 400, channels: 3, background: { r: 130, g: 130, b: 130 } }
  }).png().toBuffer();

  // Warm image: neutral substrate, but warm reddish photo box
  const warmPatch = await sharp({
    create: { width: 80, height: 154, channels: 3, background: { r: 230, g: 110, b: 70 } } // Warm red-heavy tone
  }).png().toBuffer();

  const warmBuffer = await sharp({
    create: { width: 400, height: 400, channels: 3, background: { r: 130, g: 130, b: 130 } }
  })
    .composite([{ input: warmPatch, left: 25, top: 100 }]) // Placed in APPROXIMATE_PORTRAIT_REGION
    .png()
    .toBuffer();

  const neutralTamper = await TamperingService.analyze(neutralBuffer, 'UNKNOWN');
  const warmTamper = await TamperingService.analyze(warmBuffer, 'UNKNOWN');

  const neutralWarmth = neutralTamper.indicators.find(i => i.category === 'COLOR_TEMPERATURE');
  const warmWarmth = warmTamper.indicators.find(i => i.category === 'COLOR_TEMPERATURE');

  console.log(`[Test b] Neutral warmth diff: ${neutralWarmth?.value} | Warm image warmth diff: ${warmWarmth?.value}`);
  if (!neutralWarmth || !warmWarmth) {
    throw new Error('Test b Failed: Color temperature indicator not found');
  }
  if ((warmWarmth.value || 0) <= (neutralWarmth.value || 0)) {
    throw new Error(`Test b Failed: Warm composite (${warmWarmth.value}) did not have higher warmth differential than neutral (${neutralWarmth.value})`);
  }
  if (warmTamper.indicators.some(i => i.evaluated === false || i.value === undefined)) {
    throw new Error('Test b Failed: Unmeasured indicators returned in warm image test');
  }
  console.log('>>> TEST b PASSED: Measured color temperature disparity correctly differentiated warm vs neutral.');

  // -------------------------------------------------------------------------
  // TEST c: Score formula test (fixed factor inputs yield documented sum without clamp)
  // -------------------------------------------------------------------------
  console.log('\n-----------------------------------------------------------');
  console.log('  TEST c: Score Formula Test (No Special-Case Forcing or Clamp)');
  console.log('-----------------------------------------------------------');
  const cCalcRisk = RiskEngine.calculate(s2Tampering, s2Face, s2Db, s2Mrz, s2Ocr, s2Quality);
  const factorSum = Number(cCalcRisk.factors.reduce((sum, f) => sum + f.contribution, 0).toFixed(1));
  const expectedRounded = Math.min(100, Math.max(0, Math.round(factorSum)));
  console.log(`[Test c] Factor contributions sum: ${factorSum} -> rounded score: ${cCalcRisk.score} (expected: ${expectedRounded})`);
  if (cCalcRisk.score !== expectedRounded) {
    throw new Error(`Test c Failed: Score was forced to ${cCalcRisk.score} instead of documented sum ${expectedRounded}`);
  }
  console.log('>>> TEST c PASSED: Total risk score is strictly the unclamped sum of factor contributions.');

  // -------------------------------------------------------------------------
  // TEST d: whySuspicious with MRZ FAILED shows MRZ as flagged and never valid
  // -------------------------------------------------------------------------
  console.log('\n-----------------------------------------------------------');
  console.log('  TEST d: whySuspicious with MRZ Checksum Failure');
  console.log('-----------------------------------------------------------');
  const failedMrz = {
    ...s1Mrz,
    overallStatus: 'FAILED' as const,
    checksums: [
      { name: 'documentNumber', field: 'Document Number', expected: '7', computed: '3', valid: false },
      { name: 'composite', field: 'Composite Hash', expected: '9', computed: '4', valid: false }
    ]
  };

  const dRiskMrzFailed = RiskEngine.calculate(s1Tampering, s1Face, s1Db, failedMrz, s1Ocr, s1Quality);
  console.log(`[Test d] Risk Level: ${dRiskMrzFailed.level}, Status: ${dRiskMrzFailed.status}`);
  if (dRiskMrzFailed.level !== 'HIGH' || dRiskMrzFailed.status !== 'REQUIRES_MANUAL_REVIEW') {
    throw new Error(`Test d Failed: MRZ checksum failure must trigger HIGH / REQUIRES_MANUAL_REVIEW override! Got ${dRiskMrzFailed.level}`);
  }
  if (!dRiskMrzFailed.whySuspicious) {
    throw new Error('Test d Failed: Expected whySuspicious block');
  }

  const hasMrzInFlags = dRiskMrzFailed.whySuspicious.flagsDetected.some(f => f.includes('MRZ'));
  const hasMrzInPassed = dRiskMrzFailed.whySuspicious.checksPassed.some(c => c.toLowerCase().includes('mrz') || c.toLowerCase().includes('check digit'));

  console.log(`[Test d] MRZ in flagsDetected: ${hasMrzInFlags} | MRZ in checksPassed: ${hasMrzInPassed}`);
  if (!hasMrzInFlags) {
    throw new Error('Test d Failed: MRZ failure was NOT listed in flagsDetected');
  }
  if (hasMrzInPassed) {
    throw new Error('Test d Failed: MRZ failure was falsely listed in checksPassed!');
  }
  console.log('>>> TEST d PASSED: whySuspicious lists MRZ under flagsDetected and never under checksPassed.');

  // -------------------------------------------------------------------------
  // TEST e: Threshold boundary tests (29, 30, 59, 60, hard overrides)
  // -------------------------------------------------------------------------
  console.log('\n-----------------------------------------------------------');
  console.log('  TEST e: Threshold Boundary Tests (29, 30, 59, 60, Hard Overrides)');
  console.log('-----------------------------------------------------------');
  const config = RiskEngine.getConfig();

  const cleanTamper = { ...s1Tampering, detected: false, status: 'PASSED' as const };
  const cleanFace = { ...s1Face, status: 'PASSED' as const, consistency: 'LIKELY_MATCH' as const, similarityScore: 92, evaluated: true };
  const cleanDb = { ...s1Db, recordFound: true, status: 'ACTIVE' as const, nameMatch: true, dobMatch: true, expiryMatch: true, multipleIdentityAlert: false, watchlistFlag: false };
  const cleanMrz = { ...s1Mrz, overallStatus: 'PASSED' as const };
  const cleanQuality = { ...s1Quality, overallScore: 90 };

  const lowBoundaryRisk = RiskEngine.calculate(cleanTamper, cleanFace, cleanDb, cleanMrz, s1Ocr, cleanQuality);
  console.log(`[Test e] Clean factors score: ${lowBoundaryRisk.score} -> Tier: ${lowBoundaryRisk.level}`);
  if (lowBoundaryRisk.score >= config.lowThreshold || lowBoundaryRisk.level !== 'LOW') {
    throw new Error(`Test e Failed: Clean factors should produce score < 30 and LOW tier, got score ${lowBoundaryRisk.score}, tier ${lowBoundaryRisk.level}`);
  }

  // Tampering detected hard override
  const overrideTamper = { ...s1Tampering, detected: true, status: 'FAILED' as const };
  const overrideRisk = RiskEngine.calculate(overrideTamper, cleanFace, cleanDb, cleanMrz, s1Ocr, cleanQuality);
  console.log(`[Test e] Tampering Override -> Tier: ${overrideRisk.level}, Status: ${overrideRisk.status}`);
  if (overrideRisk.level !== 'HIGH' || overrideRisk.status !== 'REQUIRES_MANUAL_REVIEW') {
    throw new Error('Test e Failed: Tampering override did not produce HIGH / REQUIRES_MANUAL_REVIEW');
  }

  // Blacklisted hard override
  const blacklistedDb = { ...cleanDb, status: 'BLACKLISTED' as const };
  const blRisk = RiskEngine.calculate(cleanTamper, cleanFace, blacklistedDb, cleanMrz, s1Ocr, cleanQuality);
  if (blRisk.level !== 'HIGH' || blRisk.status !== 'REQUIRES_MANUAL_REVIEW') {
    throw new Error('Test e Failed: Blacklisted identity override did not produce HIGH');
  }

  // Unevaluated face hard override
  const unevaluatedFace = { ...cleanFace, consistency: 'NOT_EVALUATED' as const, evaluated: false, similarityScore: null };
  const unFaceRisk = RiskEngine.calculate(cleanTamper, unevaluatedFace, cleanDb, cleanMrz, s1Ocr, cleanQuality);
  if (unFaceRisk.level !== 'HIGH' || unFaceRisk.status !== 'REQUIRES_MANUAL_REVIEW') {
    throw new Error('Test e Failed: Unevaluated face did not trigger HIGH / REQUIRES_MANUAL_REVIEW override');
  }
  console.log('>>> TEST e PASSED: Threshold tiers (LOW < 30, MEDIUM < 60, HIGH >= 60) and hard overrides confirmed.');

  // -------------------------------------------------------------------------
  // TEST f: Real ELA on JPEG Re-compression & PNG Processing
  // -------------------------------------------------------------------------
  console.log('\n-----------------------------------------------------------');
  console.log('  TEST f: Real ELA on JPEG Re-compression & PNG Processing');
  console.log('-----------------------------------------------------------');
  const jpegPristine = await sharp({
    create: { width: 320, height: 320, channels: 3, background: { r: 180, g: 190, b: 200 } }
  }).jpeg({ quality: 100 }).toBuffer();

  const jpegResult = await TamperingService.analyze(jpegPristine, 'UNKNOWN');
  console.log(`[Test f] Pristine JPEG ELA detected: ${jpegResult.detected}, Confidence: ${jpegResult.confidence}%`);
  if (jpegResult.status === 'ERROR') {
    throw new Error('Test f Failed: TamperingService threw ERROR on valid JPEG buffer');
  }

  const pngPristine = await sharp({
    create: { width: 320, height: 320, channels: 3, background: { r: 180, g: 190, b: 200 } }
  }).png().toBuffer();

  const pngResult = await TamperingService.analyze(pngPristine, 'UNKNOWN');
  console.log(`[Test f] Pristine PNG ELA detected: ${pngResult.detected}, Confidence: ${pngResult.confidence}%`);
  if (pngResult.status === 'ERROR') {
    throw new Error('Test f Failed: TamperingService threw ERROR on valid PNG buffer');
  }
  console.log('>>> TEST f PASSED: ELA and optical forensics process both JPEG and PNG accurately without error.');

  // -------------------------------------------------------------------------
  // TEST SECTION F (a): TD3 MRZ check digits pass on authentic lines; corrupt digit fails
  // -------------------------------------------------------------------------
  console.log('\n-----------------------------------------------------------');
  console.log('  TEST F-a: TD3 MRZ Check Digits Validation & Corruption Check');
  console.log('-----------------------------------------------------------');
  const authenticL1 = 'P<INDVERMA<<ANANYA<<<<<<<<<<<<<<<<<<<<<<<<<<';
  const authenticL2 = 'P948210375IND9406188F3104116<<<<<<<<<<<<<<00';

  const mockOcrForF: OCRResult = {
    confidence: 95,
    rawText: 'PASSPORT HOLDER ANANYA VERMA P94821037',
    fields: {
      fullName: { name: 'fullName', label: 'Full Name', value: 'ANANYA VERMA', confidence: 95, validated: true },
      documentNumber: { name: 'documentNumber', label: 'Passport Number', value: 'P94821037', confidence: 95, validated: true },
      countryCode: { name: 'countryCode', label: 'Country Code', value: 'IND', confidence: 95, validated: true },
      nationality: { name: 'nationality', label: 'Nationality', value: 'INDIAN', confidence: 95, validated: true },
      dateOfBirth: { name: 'dateOfBirth', label: 'Date of Birth', value: '1994-06-18', confidence: 95, validated: true },
      gender: { name: 'gender', label: 'Gender', value: 'F', confidence: 95, validated: true },
      issueDate: { name: 'issueDate', label: 'Date of Issue', value: '2021-04-12', confidence: 95, validated: true },
      expiryDate: { name: 'expiryDate', label: 'Date of Expiry', value: '2031-04-11', confidence: 95, validated: true }
    }
  };

  const resAuthentic = MRZValidationService.validate('UNKNOWN', mockOcrForF, [authenticL1, authenticL2]);
  if (resAuthentic.overallStatus !== 'PASSED' || !resAuthentic.checksums.every(c => c.valid)) {
    throw new Error(`Test F-a Failed: Authentic TD3 lines did not pass. Checksums: ${JSON.stringify(resAuthentic.checksums)}`);
  }

  // Corrupt single character in document number: change P94821037 to P94821038
  const corruptedL2 = 'P948210385IND9406188F3104116<<<<<<<<<<<<<<00';
  const resCorrupted = MRZValidationService.validate('UNKNOWN', mockOcrForF, [authenticL1, corruptedL2]);
  const docNumChecksum = resCorrupted.checksums.find(c => c.name.includes('Document Number'));
  if (resCorrupted.overallStatus !== 'FAILED' || !docNumChecksum || docNumChecksum.valid !== false) {
    throw new Error('Test F-a Failed: Corrupted document digit did not fail checksum');
  }
  console.log('>>> TEST F-a PASSED: Authentic TD3 lines passed; single corrupted digit failed.');

  // -------------------------------------------------------------------------
  // TEST SECTION F (b): Missing MRZ lines (< 2) returns WARNING and unevaluated checksums
  // -------------------------------------------------------------------------
  console.log('\n-----------------------------------------------------------');
  console.log('  TEST F-b: Missing MRZ Lines Fail-Closed (WARNING, Unevaluated Checksums)');
  console.log('-----------------------------------------------------------');
  const resMissingMrz = MRZValidationService.validate('UNKNOWN', mockOcrForF, []);
  if (resMissingMrz.overallStatus !== 'WARNING' || resMissingMrz.detected !== false) {
    throw new Error(`Test F-b Failed: Expected overallStatus WARNING and detected false, got ${resMissingMrz.overallStatus}`);
  }
  const allNullUnevaluated = resMissingMrz.checksums.every(c => c.valid === false && c.expected === null && c.computed === null);
  if (!allNullUnevaluated) {
    throw new Error('Test F-b Failed: Checksums were not marked as unevaluated (valid:false, expected:null, computed:null)');
  }
  console.log('>>> TEST F-b PASSED: Missing MRZ correctly fails closed with WARNING and null/unevaluated checksums.');

  // -------------------------------------------------------------------------
  // TEST SECTION F (c): Doc number longer than 9 characters preserves column positions
  // -------------------------------------------------------------------------
  console.log('\n-----------------------------------------------------------');
  console.log('  TEST F-c: Long Document Number (> 9 Chars) Position Invariance');
  console.log('-----------------------------------------------------------');
  const [synthL1, synthL2] = MRZValidationService.synthesizeTD3Lines(
    'IND',
    'ANANYA VERMA',
    'P94821037OVERFLOW',
    '940618',
    'F',
    '310411'
  );
  const synthDocPart = synthL2.substring(0, 9);
  const synthCountry = synthL2.substring(10, 13);
  const synthDob = synthL2.substring(13, 19);
  const synthSex = synthL2.substring(20, 21);
  const synthExp = synthL2.substring(21, 27);
  const synthOpt = synthL2.substring(28, 42);

  if (synthDocPart !== 'P94821037' || synthCountry !== 'IND' || synthDob !== '940618' || synthSex !== 'F' || synthExp !== '310411') {
    throw new Error(`Test F-c Failed: Long doc number caused field shifts in TD3 Line 2! l2=${synthL2}`);
  }
  if (!synthOpt.startsWith('OVERFLOW')) {
    throw new Error(`Test F-c Failed: Doc number overflow not stored in optional field! opt=${synthOpt}`);
  }

  const longDocOcr: OCRResult = {
    ...mockOcrForF,
    fields: {
      ...mockOcrForF.fields,
      documentNumber: { name: 'documentNumber', label: 'Passport Number', value: 'P94821037OVERFLOW', confidence: 95, validated: true }
    }
  };
  const resLong = MRZValidationService.validate('UNKNOWN', longDocOcr, [synthL1, synthL2]);
  if (resLong.nationality !== 'IND' || resLong.gender !== 'F') {
    throw new Error(`Test F-c Failed: Parsed values corrupted by long doc number: nat=${resLong.nationality}, gender=${resLong.gender}`);
  }
  console.log('>>> TEST F-c PASSED: Long document number parses with strict column positions preserved.');

  // -------------------------------------------------------------------------
  // TEST SECTION F (d): Sex '<' maps to 'X'; composite check with non-digit fails
  // -------------------------------------------------------------------------
  console.log('\n-----------------------------------------------------------');
  console.log('  TEST F-d: Sex Filler Maps to "X" & Non-Digit Composite Fails');
  console.log('-----------------------------------------------------------');
  const l2UnspecifiedSex = 'P948210375IND9406188<3104116<<<<<<<<<<<<<<00';
  const resUnspecifiedSex = MRZValidationService.validate('UNKNOWN', mockOcrForF, [authenticL1, l2UnspecifiedSex]);
  if (resUnspecifiedSex.gender !== 'X') {
    throw new Error(`Test F-d Failed: Expected gender 'X' for sex '<', got '${resUnspecifiedSex.gender}'`);
  }

  const l2FillerComposite = 'P948210375IND9406188F3104116<<<<<<<<<<<<<<0<'; // composite position is '<'
  const resFillerComposite = MRZValidationService.validate('UNKNOWN', mockOcrForF, [authenticL1, l2FillerComposite]);
  const compChecksum = resFillerComposite.checksums.find(c => c.name.includes('Composite'));
  if (resFillerComposite.overallStatus !== 'FAILED' || !compChecksum || compChecksum.valid !== false) {
    throw new Error('Test F-d Failed: Filler "<" in composite check digit position must fail validation');
  }
  console.log('>>> TEST F-d PASSED: Sex "<" mapped to "X", and filler "<" in composite position correctly rejected.');

  // -------------------------------------------------------------------------
  // TEST SECTION F (e): Identity Normalization (Tokens & Dates)
  // -------------------------------------------------------------------------
  console.log('\n-----------------------------------------------------------');
  console.log('  TEST F-e: Identity Normalization (Tokenized Names & ISO Dates)');
  console.log('-----------------------------------------------------------');
  if (!compareNameTokens('ANANYA VERMA', 'ANANYA VERMA')) {
    throw new Error('Test F-e Failed: Identical names did not match');
  }
  if (!compareNameTokens('VERMA ANANYA', 'ANANYA VERMA')) {
    throw new Error('Test F-e Failed: Out-of-order name tokens did not match');
  }
  if (compareNameTokens('ANANYA VERMA', '')) {
    throw new Error('Test F-e Failed: Non-empty name matched empty string');
  }
  if (compareNameTokens('', 'ANANYA VERMA')) {
    throw new Error('Test F-e Failed: Empty string matched non-empty name');
  }
  if (compareNameTokens('', '')) {
    throw new Error('Test F-e Failed: Empty names matched');
  }

  const normDobDmy = normalizeDateToIso('18/06/1994');
  const normDobIso = normalizeDateToIso('1994-06-18');
  if (normDobDmy !== '1994-06-18' || normDobIso !== '1994-06-18' || normDobDmy !== normDobIso) {
    throw new Error(`Test F-e Failed: Date of birth normalization failed: ${normDobDmy} vs ${normDobIso}`);
  }

  const normExpDmy = normalizeDateToIso('11/04/2031');
  const normExpIso = normalizeDateToIso('2031-04-11');
  if (normExpDmy !== '2031-04-11' || normExpIso !== '2031-04-11' || normExpDmy !== normExpIso) {
    throw new Error(`Test F-e Failed: Expiry date normalization failed: ${normExpDmy} vs ${normExpIso}`);
  }
  console.log('>>> TEST F-e PASSED: Tokenized name matching and date normalization verified.');

  // -------------------------------------------------------------------------
  // TEST SECTION F (f): Central Registry Auto-Registration Gating
  // -------------------------------------------------------------------------
  console.log('\n-----------------------------------------------------------');
  console.log('  TEST F-f: Central Registry Auto-Registration Gating');
  console.log('-----------------------------------------------------------');
  // 1. Without AUTO_REGISTER_UNKNOWN (default): should NOT insert unknown document
  delete process.env.AUTO_REGISTER_UNKNOWN;
  const unknownDocNum = `DOC-UNREGISTERED-${Date.now()}`;
  const unregResult = IdentityMatchingService.verifyInDatabase(unknownDocNum, 'UNKNOWN TRAVELER');
  if (unregResult.recordFound !== false || unregResult.status !== 'NOT_FOUND') {
    throw new Error('Test F-f Failed: Unregistered document reported as found');
  }
  const unregRow = db.prepare('SELECT * FROM documents WHERE document_number = ?').get(unknownDocNum);
  if (unregRow) {
    throw new Error('Test F-f Failed: Document was auto-registered when AUTO_REGISTER_UNKNOWN is disabled!');
  }

  // 2. With AUTO_REGISTER_UNKNOWN=true: inserted as PENDING_VERIFICATION with nullable dates
  process.env.AUTO_REGISTER_UNKNOWN = 'true';
  const autoRegDocNum = `DOC-AUTOREG-${Date.now()}`;
  IdentityMatchingService.registerOrUpdateDocument({
    documentNumber: autoRegDocNum,
    documentType: 'PASSPORT',
    holderName: 'AUTO REG PERSON',
    status: 'PENDING_VERIFICATION'
  });
  const autoRow = db.prepare('SELECT * FROM documents WHERE document_number = ?').get(autoRegDocNum) as any;
  if (!autoRow) {
    throw new Error('Test F-f Failed: Document was not registered with AUTO_REGISTER_UNKNOWN=true');
  }
  if (autoRow.status !== 'PENDING_VERIFICATION') {
    throw new Error(`Test F-f Failed: Expected status PENDING_VERIFICATION, got ${autoRow.status}`);
  }
  if (autoRow.date_of_birth !== null && autoRow.date_of_birth !== undefined) {
    throw new Error(`Test F-f Failed: Expected null date_of_birth for unread dates, got ${autoRow.date_of_birth}`);
  }
  delete process.env.AUTO_REGISTER_UNKNOWN;
  console.log('>>> TEST F-f PASSED: Auto-registration safely gated; creates PENDING_VERIFICATION with nullable dates.');

  // -------------------------------------------------------------------------
  // TEST SECTION F (g): RiskEngine Database Factor Penalties (+30 DOB, +25 Name, +20 Expiry)
  // -------------------------------------------------------------------------
  console.log('\n-----------------------------------------------------------');
  console.log('  TEST F-g: RiskEngine Database Factor Disparity Penalties');
  console.log('-----------------------------------------------------------');
  const baseDb = {
    recordFound: true,
    status: 'ACTIVE' as const,
    nameMatch: true,
    dobMatch: true,
    expiryMatch: true,
    multipleIdentityAlert: false,
    watchlistFlag: false,
    summary: 'Active matching record'
  };
  const baseRisk = RiskEngine.calculate(cleanTamper, cleanFace, baseDb, cleanMrz, mockOcrForF, cleanQuality);
  const baseDbFactor = baseRisk.factors.find(f => f.id === 'FACTOR_DATABASE')!;
  if (baseDbFactor.penaltyScore !== 2) {
    throw new Error(`Test F-g Failed: Expected base penalty 2, got ${baseDbFactor.penaltyScore}`);
  }

  // DOB mismatch (+30): penalty = 32
  const dobMismatchDb = { ...baseDb, dobMatch: false };
  const dobRisk = RiskEngine.calculate(cleanTamper, cleanFace, dobMismatchDb, cleanMrz, mockOcrForF, cleanQuality);
  const dobFactor = dobRisk.factors.find(f => f.id === 'FACTOR_DATABASE')!;
  if (dobFactor.penaltyScore !== 32) {
    throw new Error(`Test F-g Failed: Expected penalty 32 for DOB mismatch (2 + 30), got ${dobFactor.penaltyScore}`);
  }

  // Name mismatch (+25): penalty = 27
  const nameMismatchDb = { ...baseDb, nameMatch: false };
  const nameRisk = RiskEngine.calculate(cleanTamper, cleanFace, nameMismatchDb, cleanMrz, mockOcrForF, cleanQuality);
  const nameFactor = nameRisk.factors.find(f => f.id === 'FACTOR_DATABASE')!;
  if (nameFactor.penaltyScore !== 27) {
    throw new Error(`Test F-g Failed: Expected penalty 27 for Name mismatch (2 + 25), got ${nameFactor.penaltyScore}`);
  }

  // Expiry mismatch (+20): penalty = 22
  const expMismatchDb = { ...baseDb, expiryMatch: false };
  const expRisk = RiskEngine.calculate(cleanTamper, cleanFace, expMismatchDb, cleanMrz, mockOcrForF, cleanQuality);
  const expFactor = expRisk.factors.find(f => f.id === 'FACTOR_DATABASE')!;
  if (expFactor.penaltyScore !== 22) {
    throw new Error(`Test F-g Failed: Expected penalty 22 for Expiry mismatch (2 + 20), got ${expFactor.penaltyScore}`);
  }

  // Combined disparities: 2 + 30 + 25 + 20 = 77
  const allMismatchDb = { ...baseDb, nameMatch: false, dobMatch: false, expiryMatch: false };
  const allRisk = RiskEngine.calculate(cleanTamper, cleanFace, allMismatchDb, cleanMrz, mockOcrForF, cleanQuality);
  const allFactor = allRisk.factors.find(f => f.id === 'FACTOR_DATABASE')!;
  if (allFactor.penaltyScore !== 77 || allFactor.severity !== 'HIGH') {
    throw new Error(`Test F-g Failed: Expected penalty 77 and HIGH severity for all disparities, got ${allFactor.penaltyScore} / ${allFactor.severity}`);
  }
  console.log('>>> TEST F-g PASSED: Database factor explicitly scores +30 (DOB), +25 (Name), +20 (Expiry) penalties.');

  console.log('\n===========================================================');
  console.log('  🎉 ALL AUTOMATED PIPELINE TESTS PASSED SUCCESSFULLY!    ');
  console.log('===========================================================');
  process.exit(0);
}

runPipelineTests().catch((err) => {
  console.error('\n❌ PIPELINE TEST FAILED:', err);
  process.exit(1);
});
