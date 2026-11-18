import 'dotenv/config';
import '../index';
import path from 'path';
import fs from 'fs';
import { validateJwtSecret } from '../middleware/auth';
import { clearLoginAttempts } from '../routes/auth.routes';

async function runApiTests() {
  const BASE_URL = 'http://localhost:5000/api';
  process.env.DEMO_MODE = 'true';
  console.log('===========================================================');
  console.log('  🛡️  BorderGuard AI - Comprehensive Security & API Tests ');
  console.log('===========================================================');

  // Allow server startup event loop tick
  await new Promise((resolve) => setTimeout(resolve, 800));

  // Helper fetch
  async function apiCall(endpoint: string, options: any = {}) {
    const res = await fetch(`${BASE_URL}${endpoint}`, options);
    const contentType = res.headers.get('content-type') || '';
    const data = contentType.includes('application/json') ? await res.json() : await res.text();
    return { status: res.status, headers: res.headers, data };
  }

  // 1. Health Check
  console.log('\n[1/15] Testing Health Check endpoint...');
  const health = await apiCall('/health');
  if (health.status !== 200 || health.data.status !== 'HEALTHY') {
    throw new Error(`Health check failed: ${JSON.stringify(health)}`);
  }
  console.log('✓ Health Check OK:', health.data.service, `(v${health.data.version})`);

  // 2. Authentication - Officer 1 Login
  console.log('\n[2/15] Testing Officer 1 Login...');
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
  console.log(`✓ Officer 1 Authenticated (Name: ${officerLogin.data.user.name}, Role: ${officerLogin.data.user.role})`);

  // 3. Authentication - Officer 2 Login (for cross-officer tests)
  console.log('\n[3/15] Testing Officer 2 Login...');
  const officer2Login = await apiCall('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'sarah.j@satyashield.demo',
      password: 'Officer@123'
    })
  });
  if (officer2Login.status !== 200 || !officer2Login.data.token) {
    throw new Error(`Officer 2 login failed: ${JSON.stringify(officer2Login)}`);
  }
  const officer2Token = officer2Login.data.token;
  console.log(`✓ Officer 2 Authenticated (Name: ${officer2Login.data.user.name}, Role: ${officer2Login.data.user.role})`);

  // 4. Authentication - Admin Login
  console.log('\n[4/15] Testing Admin Login...');
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
  console.log(`✓ Admin Authenticated (Name: ${adminLogin.data.user.name}, Role: ${adminLogin.data.user.role})`);

  // 5. Verification Pipeline - Analyze Genuine Passport
  console.log('\n[5/15] Testing Verification Pipeline (Scenario 1: Genuine Passport)...');
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
    console.error('Verify 1 error payload:', verify1Data);
    throw new Error(`Genuine verification failed with status ${verify1Res.status}: ${JSON.stringify(verify1Data)}`);
  }
  console.log(`✓ Genuine Result: ID=${verify1Data.id}, Risk=${verify1Data.risk.score}/100 [${verify1Data.risk.level}]`);

  // 6. Verification Pipeline - Analyze Tampered Passport
  console.log('\n[6/15] Testing Verification Pipeline (Scenario 2: Tampered Portrait)...');
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
    throw new Error(`Tampered verification failed: ${JSON.stringify(verify2Data)}`);
  }
  console.log(`✓ Tampered Result: ID=${verify2Data.id}, Risk=${verify2Data.risk.score}/100 [${verify2Data.risk.level}]`);

  // 7. Security Test a: Path Traversal on sampleSpecimenUrl
  console.log('\n[7/15] Security Test A: Path Traversal on sampleSpecimenUrl...');
  const traversalRes = await fetch(`${BASE_URL}/verification/process`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${officerToken}`
    },
    body: JSON.stringify({
      sampleSpecimenUrl: '../../package.json',
      documentType: 'PASSPORT'
    })
  });
  if (traversalRes.status !== 400) {
    throw new Error(`Expected 400 on traversal attempt, got ${traversalRes.status}`);
  }
  const traversalData = await traversalRes.json();
  console.log('✓ Blocked path traversal attempt with 400:', traversalData.error);

  const missingSpecimenRes = await fetch(`${BASE_URL}/verification/process`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${officerToken}`
    },
    body: JSON.stringify({
      sampleSpecimenUrl: 'nonexistent_specimen_9999.png',
      documentType: 'PASSPORT'
    })
  });
  if (missingSpecimenRes.status !== 404) {
    throw new Error(`Expected 404 on nonexistent specimen, got ${missingSpecimenRes.status}`);
  }
  const missingData = await missingSpecimenRes.json();
  console.log('✓ Handled nonexistent specimen with 404:', missingData.error);

  // 8. Security Test b: Stored XSS Prevention & Raster Image Validation
  console.log('\n[8/15] Security Test B: Upload Validation & Magic Bytes Check...');
  const fakeForm = new FormData();
  fakeForm.append('documentType', 'PASSPORT');
  const htmlBlob = new Blob(['<html><body><script>alert("XSS")</script></body></html>'], { type: 'image/png' });
  fakeForm.append('document', htmlBlob, 'evil.html');

  const xssUploadRes = await fetch(`${BASE_URL}/verification/process`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${officerToken}` },
    body: fakeForm
  });
  if (xssUploadRes.status !== 400) {
    throw new Error(`Expected 400 for fake image upload, got ${xssUploadRes.status}`);
  }
  console.log('✓ Rejected fake image/HTML upload with 400');

  // Valid image upload
  const validForm = new FormData();
  validForm.append('documentType', 'PASSPORT');
  const realPngBytes = fs.readFileSync(genuinePath);
  const realBlob = new Blob([realPngBytes], { type: 'image/png' });
  validForm.append('document', realBlob, 'test_scan.png');

  const validUploadRes = await fetch(`${BASE_URL}/verification/process`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${officerToken}` },
    body: validForm
  });
  if (validUploadRes.status !== 200) {
    throw new Error(`Expected 200 for valid image upload, got ${validUploadRes.status}`);
  }
  const validUploadData = await validUploadRes.json();
  if (!validUploadData.documentImage.startsWith('/api/verification/')) {
    throw new Error(`Expected documentImage to be /api/verification/... but got ${validUploadData.documentImage}`);
  }
  console.log('✓ Valid upload accepted with 200; documentImage routed privately:', validUploadData.documentImage);

  // 9. Security Test c: Private Document Images & Headers
  console.log('\n[9/15] Security Test C: Private Document Images & Safe Headers...');
  // Direct unauthenticated access to /uploads must return 404
  const unauthUploadRes = await fetch('http://localhost:5000/uploads/test_scan.png');
  if (unauthUploadRes.status !== 404) {
    throw new Error(`Expected 404 for unauthenticated /uploads access, got ${unauthUploadRes.status}`);
  }
  console.log('✓ Direct /uploads static route is inaccessible (404)');

  // Authenticated fetch via /api/verification/:id/image
  const authImageRes = await fetch(`http://localhost:5000/api/verification/${validUploadData.id}/image`, {
    headers: { 'Authorization': `Bearer ${officerToken}` }
  });
  if (authImageRes.status !== 200) {
    throw new Error(`Expected 200 for authenticated image fetch, got ${authImageRes.status}`);
  }
  const nosniff = authImageRes.headers.get('x-content-type-options');
  const disposition = authImageRes.headers.get('content-disposition');
  if (nosniff !== 'nosniff') {
    throw new Error(`Expected X-Content-Type-Options: nosniff, got ${nosniff}`);
  }
  if (!disposition?.includes('inline')) {
    throw new Error(`Expected Content-Disposition: inline, got ${disposition}`);
  }
  console.log(`✓ Authenticated image fetch OK with headers: nosniff="${nosniff}", disposition="${disposition}"`);

  // Path traversal on /api/verification/image/:filename
  const imgTraversalRes = await fetch('http://localhost:5000/api/verification/image/..%2F..%2Fpackage.json', {
    headers: { 'Authorization': `Bearer ${officerToken}` }
  });
  if (imgTraversalRes.status !== 400) {
    throw new Error(`Expected 400 for image path traversal, got ${imgTraversalRes.status}`);
  }
  console.log('✓ Blocked path traversal on image endpoint (400)');

  // 10. Security Test d: Tamper-Proof /save & Ownership Enforcement
  console.log('\n[10/15] Security Test D: Tamper-Proof /save & Ownership Verification...');
  // Attempt to forge risk score on save
  const forgedSaveRes = await fetch(`${BASE_URL}/verification/save`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${officerToken}`
    },
    body: JSON.stringify({
      id: verify2Data.id,
      notes: 'Officer approved test',
      risk: { score: 5, level: 'LOW', status: 'VERIFIED' } // Malicious client attempt to forge
    })
  });
  if (forgedSaveRes.status !== 200) {
    throw new Error(`Expected 200 for save, got ${forgedSaveRes.status}`);
  }

  // Fetch record and verify the database retained the server-computed score, NOT the client's 5/LOW
  const savedRecordRes = await fetch(`${BASE_URL}/verification/${verify2Data.id}`, {
    headers: { 'Authorization': `Bearer ${officerToken}` }
  });
  const savedRecord = await savedRecordRes.json();
  if (savedRecord.risk.score !== verify2Data.risk.score || savedRecord.risk.level !== 'HIGH') {
    throw new Error(`Client was able to forge risk score! Saved score: ${savedRecord.risk.score}`);
  }
  console.log(`✓ Server-computed risk preserved (${savedRecord.risk.score}/100, ${savedRecord.risk.level}); client-forged 5/LOW was ignored.`);

  // Duplicate save attempt must return 409 Conflict
  const dupSaveRes = await fetch(`${BASE_URL}/verification/save`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${officerToken}`
    },
    body: JSON.stringify({ id: verify2Data.id })
  });
  if (dupSaveRes.status !== 409) {
    throw new Error(`Expected 409 Conflict on duplicate save, got ${dupSaveRes.status}`);
  }
  console.log('✓ Rejected duplicate save with 409 Conflict');

  // Attempt to overwrite by another officer must return 403 Forbidden
  const crossOfficerRes = await fetch(`${BASE_URL}/verification/save`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${officer2Token}`
    },
    body: JSON.stringify({ id: verify2Data.id })
  });
  if (crossOfficerRes.status !== 403) {
    throw new Error(`Expected 403 Forbidden on cross-officer save attempt, got ${crossOfficerRes.status}`);
  }
  console.log('✓ Cross-officer overwrite attempt blocked with 403 Forbidden');

  // 11. Security Test e: Role Enforcement on History Deletion
  console.log('\n[11/15] Security Test E: Role Enforcement on History Deletion...');
  const officerDelRes = await fetch(`${BASE_URL}/verification/history`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${officerToken}` }
  });
  if (officerDelRes.status !== 403) {
    throw new Error(`Expected 403 for Officer history deletion, got ${officerDelRes.status}`);
  }
  console.log('✓ Officer blocked from clearing history (403 Forbidden)');

  const adminDelRes = await fetch(`${BASE_URL}/verification/history`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  if (adminDelRes.status !== 200) {
    throw new Error(`Expected 200 for Admin history deletion, got ${adminDelRes.status}`);
  }
  console.log('✓ Admin successfully authorized to clear history (200 OK)');

  // 12. Security Test f: Role Enforcement on AI Routes
  console.log('\n[12/15] Security Test F: Role Enforcement on AI Configuration...');
  const officerPullRes = await fetch(`${BASE_URL}/ai/models/pull`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${officerToken}`
    },
    body: JSON.stringify({ model: 'llama3:8b' })
  });
  if (officerPullRes.status !== 403) {
    throw new Error(`Expected 403 for Officer model pull, got ${officerPullRes.status}`);
  }
  console.log('✓ Officer blocked from pulling models (403 Forbidden)');

  const officerConfigRes = await fetch(`${BASE_URL}/ai/config`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${officerToken}`
    },
    body: JSON.stringify({ baseUrl: 'http://malicious-host:11434' })
  });
  if (officerConfigRes.status !== 403) {
    throw new Error(`Expected 403 for Officer AI config, got ${officerConfigRes.status}`);
  }
  console.log('✓ Officer blocked from updating AI server URL (403 Forbidden)');

  const adminConfigRes = await fetch(`${BASE_URL}/ai/config`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({ baseUrl: 'http://localhost:11434' })
  });
  if (adminConfigRes.status !== 200) {
    throw new Error(`Expected 200 for Admin AI config, got ${adminConfigRes.status}`);
  }
  console.log('✓ Admin successfully authorized to update AI config (200 OK)');

  // 13. Security Test g: Insecure Secret Validation
  console.log('\n[13/15] Security Test G: Insecure Secret Enforcement...');
  let threwUndefined = false;
  try {
    validateJwtSecret(undefined);
  } catch {
    threwUndefined = true;
  }
  if (!threwUndefined) throw new Error('validateJwtSecret should reject undefined secret');

  let threwShort = false;
  try {
    validateJwtSecret('too-short-secret');
  } catch {
    threwShort = true;
  }
  if (!threwShort) throw new Error('validateJwtSecret should reject secrets shorter than 32 chars');

  const validSecretResult = validateJwtSecret('super_secure_jwt_secret_with_more_than_32_characters_here');
  if (!validSecretResult) throw new Error('validateJwtSecret should accept secrets with >= 32 chars');
  console.log('✓ JWT secret strength check enforces minimum 32 characters');

  // 14. Security Test h: In-Memory Login Rate Limiting
  console.log('\n[14/15] Security Test H: In-Memory Login Rate Limiting...');
  clearLoginAttempts();
  const testRateEmail = 'test_rate_limit@borderguard.demo';

  // 5 failed login attempts
  for (let i = 1; i <= 5; i++) {
    const failRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testRateEmail, password: 'BadPassword' })
    });
    if (failRes.status !== 401) {
      throw new Error(`Expected 401 on failed attempt ${i}, got ${failRes.status}`);
    }
  }

  // 6th attempt should be blocked with 429
  const lockedRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testRateEmail, password: 'BadPassword' })
  });
  if (lockedRes.status !== 429) {
    throw new Error(`Expected 429 on 6th failed attempt, got ${lockedRes.status}`);
  }
  const retryHeader = lockedRes.headers.get('retry-after');
  if (!retryHeader || Number(retryHeader) <= 0) {
    throw new Error(`Expected Retry-After header on 429 response, got ${retryHeader}`);
  }
  console.log(`✓ 6th failed attempt locked out with 429 (Retry-After: ${retryHeader}s)`);
  clearLoginAttempts();

  // 15. Security Test i: Unknown API Routes Return JSON 404
  console.log('\n[15/15] Security Test I: Unknown API Routes Return JSON 404...');
  const unknownRes = await fetch(`${BASE_URL}/nonexistent-endpoint-xyz`);
  if (unknownRes.status !== 404) {
    throw new Error(`Expected 404 for unknown endpoint, got ${unknownRes.status}`);
  }
  const unknownType = unknownRes.headers.get('content-type') || '';
  if (!unknownType.includes('application/json')) {
    throw new Error(`Expected application/json for unknown API route, got ${unknownType}`);
  }
  const unknownJson = await unknownRes.json();
  if (!unknownJson.error) {
    throw new Error(`Expected JSON error field, got: ${JSON.stringify(unknownJson)}`);
  }
  console.log('✓ Unknown /api/* route correctly returns JSON 404:', unknownJson.error);

  console.log('\n===========================================================');
  console.log('  🎉 ALL 15 FULL-STACK SECURITY & API TESTS PASSED 100%!   ');
  console.log('===========================================================');
  process.exit(0);
}

runApiTests().catch((err) => {
  console.error('\n❌ API TEST FAILED:', err);
  process.exit(1);
});
