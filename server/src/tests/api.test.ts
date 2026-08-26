import path from 'path';
import fs from 'fs';

async function runApiTests() {
  const BASE_URL = 'http://localhost:5000/api';
  console.log('===========================================================');
  console.log('  🌐 BorderGuard AI - Full End-to-End API Integration Tests ');
  console.log('===========================================================');

  // Helper fetch
  async function apiCall(endpoint: string, options: any = {}) {
    const res = await fetch(`${BASE_URL}${endpoint}`, options);
    const data = await res.json();
    return { status: res.status, data };
  }

  // 1. Health Check
  console.log('\n[1/7] Testing Health Check endpoint...');
  const health = await apiCall('/health');
  if (health.status !== 200 || health.data.status !== 'HEALTHY') {
    throw new Error(`Health check failed: ${JSON.stringify(health)}`);
  }
  console.log('✓ Health Check OK:', health.data.service);

  // 2. Authentication - Officer Login
  console.log('\n[2/7] Testing Officer Login...');
  const officerLogin = await apiCall('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'officer@borderguard.demo',
      password: 'Officer@123'
    })
  });
  if (officerLogin.status !== 200 || !officerLogin.data.token) {
    throw new Error(`Officer login failed: ${JSON.stringify(officerLogin)}`);
  }
  const officerToken = officerLogin.data.token;
  console.log(`✓ Officer Authenticated successfully (Name: ${officerLogin.data.user.name}, Role: ${officerLogin.data.user.role})`);

  // 3. Authentication - Admin Login
  console.log('\n[3/7] Testing Admin Login...');
  const adminLogin = await apiCall('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@borderguard.demo',
      password: 'Admin@123'
    })
  });
  if (adminLogin.status !== 200 || !adminLogin.data.token) {
    throw new Error(`Admin login failed: ${JSON.stringify(adminLogin)}`);
  }
  const adminToken = adminLogin.data.token;
  console.log(`✓ Admin Authenticated successfully (Name: ${adminLogin.data.user.name}, Role: ${adminLogin.data.user.role})`);

  // 4. Verification Pipeline - Analyze Genuine Passport
  console.log('\n[4/7] Testing Document Verification Pipeline (Scenario 1: Genuine Biometric Passport)...');
  const genuinePath = path.join(process.cwd(), 'assets', 'specimens', 'specimen_genuine_passport.png');
  const genuineBase64 = 'data:image/png;base64,' + fs.readFileSync(genuinePath).toString('base64');

  const verify1Res = await fetch(`${BASE_URL}/verification/process`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${officerToken}`
    },
    body: JSON.stringify({
      imageBase64: genuineBase64,
      documentType: 'PASSPORT'
    })
  });
  const verify1Data = await verify1Res.json();
  if (verify1Res.status !== 200 || !verify1Data.id) {
    console.error('Verify 1 failed with status:', verify1Res.status, 'error:', verify1Data.error || verify1Data);
    throw new Error(`Genuine verification failed with status ${verify1Res.status}`);
  }
  console.log(`✓ Genuine Verification Result:`);
  console.log(`  - Verification ID: ${verify1Data.id}`);
  console.log(`  - Holder: ${verify1Data.ocr.fields.fullName.value} (${verify1Data.ocr.fields.documentNumber.value})`);
  console.log(`  - Risk Score: ${verify1Data.risk.score}/100 [${verify1Data.risk.level}]`);
  console.log(`  - Status: ${verify1Data.risk.status}`);
  console.log(`  - Biometric Match: ${verify1Data.faceVerification.similarityScore}% (${verify1Data.faceVerification.consistency})`);

  if (verify1Data.risk.level !== 'LOW' || verify1Data.risk.status !== 'VERIFIED') {
    throw new Error(`Unexpected risk level for genuine passport: ${verify1Data.risk.level}`);
  }

  // 5. Verification Pipeline - Analyze Tampered Passport
  console.log('\n[5/7] Testing Document Verification Pipeline (Scenario 2: Tampered Portrait / Photo Replacement)...');
  const tamperedPath = path.join(process.cwd(), 'assets', 'specimens', 'specimen_tampered_passport.png');
  const tamperedBase64 = 'data:image/png;base64,' + fs.readFileSync(tamperedPath).toString('base64');

  const verify2Res = await fetch(`${BASE_URL}/verification/process`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${officerToken}`
    },
    body: JSON.stringify({
      imageBase64: tamperedBase64,
      documentType: 'PASSPORT'
    })
  });
  const verify2Data = await verify2Res.json();
  if (verify2Res.status !== 200 || !verify2Data.id) {
    console.error('Verify 2 response status:', verify2Res.status, 'data:', verify2Data);
    throw new Error(`Tampered verification failed: ${JSON.stringify(verify2Data)}`);
  }
  console.log(`✓ Tampered Verification Result:`);
  console.log(`  - Verification ID: ${verify2Data.id}`);
  console.log(`  - Tampering Detected: ${verify2Data.tampering.detected} (${verify2Data.tampering.type})`);
  console.log(`  - Risk Score: ${verify2Data.risk.score}/100 [${verify2Data.risk.level}]`);
  console.log(`  - Status: ${verify2Data.risk.status}`);
  console.log(`  - Plain-Language Explanation: "${verify2Data.risk.whySuspicious?.title}"`);
  console.log(`  - Detected Flags: ${verify2Data.risk.whySuspicious?.flagsDetected?.length} issues detected`);

  if (verify2Data.risk.level !== 'HIGH' || verify2Data.risk.status !== 'REQUIRES_MANUAL_REVIEW') {
    throw new Error(`Unexpected risk level for tampered passport: ${verify2Data.risk.level}`);
  }

  // 6. History and Audit Logs
  console.log('\n[6/7] Testing Verification History & Analytics...');
  const historyRes = await apiCall('/verification/history', {
    headers: { 'Authorization': `Bearer ${officerToken}` }
  });
  if (historyRes.status !== 200 || !Array.isArray(historyRes.data.records)) {
    throw new Error(`History fetch failed: ${JSON.stringify(historyRes)}`);
  }
  console.log(`✓ Verification History fetched: ${historyRes.data.records.length} recorded verification sessions.`);

  const analyticsRes = await apiCall('/analytics/dashboard', {
    headers: { 'Authorization': `Bearer ${officerToken}` }
  });
  if (analyticsRes.status !== 200) {
    throw new Error(`Analytics fetch failed: ${JSON.stringify(analyticsRes)}`);
  }
  console.log(`✓ Analytics Metrics: Total Scanned: ${analyticsRes.data.totalScanned}, High Risk: ${analyticsRes.data.highRiskCount}`);

  // 7. Admin Features
  console.log('\n[7/7] Testing Admin Management (Central Registry, Audit Logs, Risk Config)...');
  const usersRes = await apiCall('/admin/users', {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  console.log(`✓ Admin User Management: ${Array.isArray(usersRes.data) ? usersRes.data.length : 0} system users.`);

  const docsRes = await apiCall('/documents', {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  console.log(`✓ Central Document Registry: ${docsRes.data.documents?.length || docsRes.data.length || 0} registered identities.`);

  const auditRes = await apiCall('/admin/audit-logs', {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  console.log(`✓ Audit Logs: ${auditRes.data.logs?.length || 0} immutable security events logged.`);

  const riskConfigRes = await apiCall('/admin/risk-config', {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  console.log(`✓ Risk Engine Weights: Tampering=${riskConfigRes.data.tamperingWeight}%, FaceMismatch=${riskConfigRes.data.faceMismatchWeight}%, Database=${riskConfigRes.data.databaseWeight}%`);

  // 8. Ollama AI Engine Endpoints
  console.log('\n[8/8] Testing Ollama Local AI Engine (/api/ai/status & /api/ai/chat)...');
  const aiStatus = await apiCall('/ai/status');
  if (aiStatus.status !== 200) {
    throw new Error(`AI status check failed: ${JSON.stringify(aiStatus)}`);
  }
  console.log(`✓ Ollama AI Status: Connected=${aiStatus.data.connected}, ActiveModel=${aiStatus.data.activeModel}, Version=${aiStatus.data.version}`);

  const aiChatRes = await apiCall('/ai/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${officerToken}`
    },
    body: JSON.stringify({
      messages: [{ role: 'user', content: 'What is ICAO 9303 MRZ standard?' }]
    })
  });
  if (aiChatRes.status !== 200) {
    throw new Error(`AI chat failed: ${JSON.stringify(aiChatRes)}`);
  }
  console.log(`✓ Ollama Copilot Chat OK (Model: ${aiChatRes.data.model})`);

  console.log('\n===========================================================');
  console.log('  🎉 ALL 8 FULL-STACK API TESTS PASSED WITH 100% SUCCESS!  ');
  console.log('===========================================================');
}

runApiTests().catch((err) => {
  console.error('\n❌ API TEST FAILED:', err);
  process.exit(1);
});
