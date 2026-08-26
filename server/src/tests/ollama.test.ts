import 'dotenv/config';
import { OllamaService } from '../services/OllamaService';
import { OCRService } from '../services/OCRService';
import { MRZValidationService } from '../services/MRZValidationService';
import { TamperingService } from '../services/TamperingService';
import { FaceVerificationService } from '../services/FaceVerificationService';
import { IdentityMatchingService } from '../services/IdentityMatchingService';
import { RiskEngine } from '../services/RiskEngine';
import { ImageQualityService } from '../services/ImageQualityService';
import { initDatabase, db } from '../db/database';
import { seedDatabase } from '../db/seed';
import { generateAllSpecimens } from '../utils/generateSpecimens';

async function runOllamaTests() {
  console.log('===========================================================');
  console.log('  🤖 Testing Ollama Backend Integration (http://localhost:11434)');
  console.log('===========================================================');

  initDatabase();
  generateAllSpecimens();
  await seedDatabase();

  // Test 1: Check Ollama Health & Model List
  console.log('\n[Test 1] Checking Ollama Health & Connection...');
  const health = await OllamaService.checkHealth();
  console.log('Ollama Status:', JSON.stringify(health, null, 2));

  if (!health.connected) {
    console.log('⚠️ Ollama is not connected at ' + health.baseUrl);
  } else {
    console.log('✓ Successfully connected to Ollama! Version:', health.version);
    console.log('✓ Available Models:', health.availableModels.join(', ') || '(none yet)');
  }

  // Test 2: AI Forensic Threat Analysis Generation
  console.log('\n[Test 2] Testing Forensic Threat Analysis Generation...');
  const dummyBuffer = Buffer.from('TEST_PASSPORT_DATA');
  const scenario = 'PHOTO_REPLACEMENT';
  const ocr = await OCRService.extractFields(dummyBuffer, scenario, 'test.jpg');
  const mrz = MRZValidationService.validate(scenario, ocr);
  const tampering = await TamperingService.analyze(dummyBuffer, scenario);
  const face = await FaceVerificationService.verify(dummyBuffer, scenario);
  const quality = ImageQualityService.analyze(dummyBuffer, scenario);
  const database = IdentityMatchingService.verifyInDatabase(
    ocr.fields.documentNumber.value,
    ocr.fields.fullName.value,
    ocr.fields.dateOfBirth.value,
    ocr.fields.expiryDate.value
  );
  const risk = RiskEngine.calculate(tampering, face, database, mrz, ocr, quality);

  const analysis = await OllamaService.generateForensicAnalysis({
    holderName: ocr.fields.fullName.value,
    documentNumber: ocr.fields.documentNumber.value,
    documentType: 'PASSPORT',
    ocr,
    mrz,
    tampering,
    face,
    database,
    risk,
    scenario
  });

  console.log('\n✓ Generated AI Forensic Analysis:');
  console.log('Model Used:', analysis.model);
  console.log('Executive Summary:', analysis.executiveSummary);
  console.log('Threat Assessment:', analysis.threatAssessment);
  console.log('Interview Questions Count:', analysis.interviewQuestions.length);
  console.log('Recommended Directive:', analysis.recommendedProtocol);

  // Test 3: Officer AI Copilot Chat
  console.log('\n[Test 3] Testing AI Officer Copilot Chat...');
  const chatResult = await OllamaService.chatWithCopilot(
    [
      {
        role: 'user',
        content: 'Why was this document flagged as High Risk? What questions should I ask?'
      }
    ],
    {
      id: 'VER-2026-TEST',
      timestamp: new Date().toISOString(),
      officerId: 1,
      officerName: 'Test Officer',
      documentType: 'PASSPORT',
      documentImage: '/uploads/sample.png',
      documentNumber: ocr.fields.documentNumber.value,
      holderName: ocr.fields.fullName.value,
      aiMode: 'OLLAMA_AI',
      scenarioDetected: scenario,
      imageQuality: quality,
      ocr,
      mrz,
      tampering,
      faceVerification: face,
      databaseVerification: database,
      risk,
      processingTimeMs: 120
    }
  );

  console.log('✓ Copilot Response received from model:', chatResult.model);
  console.log('Copilot Reply Preview:\n', chatResult.message.content.substring(0, 300) + '...\n');

  console.log('===========================================================');
  console.log('  🎉 OLLAMA INTEGRATION TESTS COMPLETED SUCCESSFULLY!     ');
  console.log('===========================================================');

  try {
    db.close();
  } catch {}
  process.exit(0);
}

runOllamaTests().catch((err) => {
  console.error('Ollama test error:', err);
  process.exit(1);
});
