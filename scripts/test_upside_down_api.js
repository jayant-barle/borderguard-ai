const fs = require('fs');

async function testVerification() {
  // 1. Authenticate
  const loginRes = await fetch('http://127.0.0.1:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'officer@satyashield.demo', password: 'Officer@123' })
  });
  const loginData = await loginRes.json();
  const token = loginData.token;
  console.log('✓ Logged in as:', loginData.user?.name);

  // 2. Upload upside-down image using native FormData
  const fileBuffer = fs.readFileSync('uploads/test_upside_down.jpg');
  const blob = new Blob([fileBuffer], { type: 'image/jpeg' });

  const formData = new FormData();
  formData.append('documentType', 'Passport');
  formData.append('document', blob, 'test_upside_down.jpg');

  console.log('⏳ Submitting upside-down document to AI verification pipeline...');
  const res = await fetch('http://127.0.0.1:5000/api/verification/process', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });

  const data = await res.json();
  console.log('\n========================================');
  console.log('🎉 VERIFICATION RESULT ON UPSIDE-DOWN DOC');
  console.log('========================================');
  console.log('HTTP Status Code:', res.status);
  console.log('Extracted Photo URL:', data.faceVerification?.extractedFaceUrl);
  console.log('Rotation Angle Detected:', data.faceVerification?.rotationDetected + '°');
  console.log('Primary Scanned Image:', data.documentImage);
  console.log('Biometric Summary:', data.faceVerification?.summary);
  console.log('Biometric Similarity Score:', data.faceVerification?.similarityScore + '%');
  console.log('OCR Holder Name:', data.holderName);
  console.log('Document Number:', data.documentNumber);
  console.log('Risk Level:', data.risk?.level);
  console.log('Risk Score:', data.risk?.score);

  // 3. Save to database history
  const saveRes = await fetch('http://127.0.0.1:5000/api/verification/save', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
  const saveData = await saveRes.json();
  console.log('✓ Saved to History DB:', saveData.message, '| ID:', saveData.id);
}

testVerification().catch(console.error);
