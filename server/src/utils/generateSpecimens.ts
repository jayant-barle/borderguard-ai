import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { DemoScenarioService } from '../services/DemoScenarioService';

const specimensDir = path.join(process.cwd(), 'assets', 'specimens');
if (!fs.existsSync(specimensDir)) {
  fs.mkdirSync(specimensDir, { recursive: true });
}

// 1. High-fidelity SVG definitions for Passport Specimen 1 (Genuine)
const genuinePassportSvg = `
<svg width="800" height="520" viewBox="0 0 800 520" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Guilloche Security Pattern -->
    <pattern id="guilloche" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 0,20 Q 10,0 20,20 T 40,20 M 0,20 Q 10,40 20,20 T 40,20" fill="none" stroke="#d4e3fc" stroke-width="0.75" opacity="0.7"/>
      <circle cx="20" cy="20" r="12" fill="none" stroke="#e2e8f0" stroke-width="0.5" opacity="0.5"/>
    </pattern>
    <linearGradient id="passportBg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="50%" stop-color="#f8fafc"/>
      <stop offset="100%" stop-color="#f1f5f9"/>
    </linearGradient>
    <filter id="subtleShadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#0f172a" flood-opacity="0.15"/>
    </filter>
  </defs>

  <!-- Document Card Outer Shell -->
  <rect x="20" y="20" width="760" height="480" rx="16" fill="url(#passportBg)" stroke="#cbd5e1" stroke-width="2" filter="url(#subtleShadow)"/>
  <rect x="20" y="20" width="760" height="480" rx="16" fill="url(#guilloche)"/>

  <!-- Gold Foil Emblem & Header -->
  <rect x="20" y="20" width="760" height="58" rx="16" fill="#0f172a"/>
  <rect x="20" y="60" width="760" height="18" fill="#0f172a"/>
  
  <text x="50" y="48" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#f8fafc" letter-spacing="2">REPUBLIC OF INDIA / RÉPUBLIQUE D'INDE</text>
  <text x="50" y="68" font-family="Arial, sans-serif" font-size="11" font-weight="600" fill="#94a3b8" letter-spacing="1">PASSPORT / PASSEPORT</text>
  <text x="680" y="52" font-family="Courier, monospace" font-size="18" font-weight="bold" fill="#fbbf24">IND</text>

  <!-- Specimen Identifier Marker -->
  <!-- SPECIMEN_GENUINE_PASSPORT -->
  <rect x="520" y="32" width="130" height="22" rx="4" fill="#065f46" stroke="#34d399" stroke-width="1"/>
  <text x="532" y="47" font-family="Arial, sans-serif" font-size="10" font-weight="bold" fill="#ffffff" letter-spacing="1">OFFICIAL SPECIMEN</text>

  <!-- Security Hologram Chip Icon -->
  <rect x="50" y="90" width="34" height="26" rx="4" fill="#fef3c7" stroke="#d97706" stroke-width="1"/>
  <line x1="50" y1="103" x2="84" y2="103" stroke="#b45309" stroke-width="1.5"/>
  <circle cx="67" cy="103" r="5" fill="#fde68a" stroke="#b45309" stroke-width="1"/>

  <!-- Genuine Passport Photograph Box (Ananya Verma - Original) -->
  <g id="photo-box">
    <rect x="50" y="130" width="160" height="200" rx="8" fill="#e2e8f0" stroke="#0284c7" stroke-width="2"/>
    <!-- Simulated crisp genuine portrait -->
    <rect x="52" y="132" width="156" height="196" rx="6" fill="#e0f2fe"/>
    <circle cx="130" cy="195" r="42" fill="#0284c7" opacity="0.85"/>
    <path d="M 80,310 C 80,260 180,260 180,310 Z" fill="#0369a1" opacity="0.85"/>
    <!-- Female hairstyle marker & face shape -->
    <path d="M 88,190 C 88,145 172,145 172,190 C 172,215 155,230 130,230 C 105,230 88,215 88,190 Z" fill="#fbcfe8"/>
    <path d="M 85,180 C 85,135 175,135 175,180 C 175,200 165,190 130,170 C 95,190 85,200 85,180 Z" fill="#1e293b"/>
    <circle cx="118" cy="188" r="4" fill="#1e293b"/>
    <circle cx="142" cy="188" r="4" fill="#1e293b"/>
    <path d="M 124,208 Q 130,214 136,208" stroke="#be185d" stroke-width="2" fill="none"/>
    
    <!-- Guilloche security overlay pattern on photo -->
    <path d="M 52,240 Q 130,220 208,240" stroke="#38bdf8" stroke-width="1" fill="none" opacity="0.75"/>
    <path d="M 52,260 Q 130,280 208,260" stroke="#38bdf8" stroke-width="1" fill="none" opacity="0.75"/>
    <text x="60" y="322" font-family="Arial, sans-serif" font-size="8" font-weight="bold" fill="#0369a1" opacity="0.7">VERIFIED BIOMETRIC</text>
  </g>

  <!-- Ghost Portrait / Watermark (Secondary Security Feature) -->
  <g opacity="0.25">
    <rect x="650" y="160" width="70" height="90" rx="4" fill="#94a3b8"/>
    <circle cx="685" cy="190" r="18" fill="#475569"/>
    <path d="M 660,240 C 660,215 710,215 710,240 Z" fill="#475569"/>
  </g>

  <!-- Document Fields Table -->
  <g font-family="Arial, sans-serif" fill="#0f172a">
    <!-- Type / Country / Passport No -->
    <text x="240" y="110" font-size="9" font-weight="bold" fill="#64748b">TYPE / TYPE</text>
    <text x="240" y="126" font-size="13" font-weight="bold">P</text>

    <text x="320" y="110" font-size="9" font-weight="bold" fill="#64748b">COUNTRY CODE</text>
    <text x="320" y="126" font-size="13" font-weight="bold">IND</text>

    <text x="440" y="110" font-size="9" font-weight="bold" fill="#64748b">PASSPORT NO. / NO. DU PASSEPORT</text>
    <text x="440" y="126" font-size="15" font-weight="bold" fill="#0369a1" letter-spacing="1">P94821037</text>

    <!-- Surname -->
    <text x="240" y="156" font-size="9" font-weight="bold" fill="#64748b">SURNAME / NOM</text>
    <text x="240" y="174" font-size="15" font-weight="bold" letter-spacing="1">VERMA</text>

    <!-- Given Names -->
    <text x="240" y="202" font-size="9" font-weight="bold" fill="#64748b">GIVEN NAMES / PRÉNOMS</text>
    <text x="240" y="220" font-size="15" font-weight="bold" letter-spacing="1">ANANYA</text>

    <!-- Nationality & Sex -->
    <text x="240" y="248" font-size="9" font-weight="bold" fill="#64748b">NATIONALITY / NATIONALITÉ</text>
    <text x="240" y="264" font-size="13" font-weight="bold">INDIAN</text>

    <text x="440" y="248" font-size="9" font-weight="bold" fill="#64748b">SEX / SEXE</text>
    <text x="440" y="264" font-size="13" font-weight="bold">F</text>

    <!-- Date of Birth & Place of Birth -->
    <text x="240" y="292" font-size="9" font-weight="bold" fill="#64748b">DATE OF BIRTH / DATE DE NAISSANCE</text>
    <text x="240" y="308" font-size="13" font-weight="bold">18/06/1994</text>

    <text x="440" y="292" font-size="9" font-weight="bold" fill="#64748b">PLACE OF BIRTH / LIEU DE NAISSANCE</text>
    <text x="440" y="308" font-size="13" font-weight="bold">NEW DELHI, INDIA</text>

    <!-- Date of Issue & Date of Expiry -->
    <text x="240" y="336" font-size="9" font-weight="bold" fill="#64748b">DATE OF ISSUE / DATE DE DÉLIVRANCE</text>
    <text x="240" y="352" font-size="13" font-weight="bold">12/04/2021</text>

    <text x="440" y="336" font-size="9" font-weight="bold" fill="#64748b">DATE OF EXPIRY / DATE D'EXPIRATION</text>
    <text x="440" y="352" font-size="13" font-weight="bold" fill="#047857">11/04/2031</text>
  </g>

  <!-- Microprint Security Divider -->
  <line x1="40" y1="385" x2="760" y2="385" stroke="#94a3b8" stroke-dasharray="3,3" stroke-width="1"/>
  <text x="45" y="395" font-family="Courier, monospace" font-size="7" fill="#64748b">REPUBLICOFINDIAPASSPORTDOCUMENTOFFICIALSPECIMENREPUBLICOFINDIAPASSPORTDOCUMENTOFFICIALSPECIMEN</text>

  <!-- Machine Readable Zone (MRZ TD3 Format) -->
  <rect x="35" y="415" width="730" height="75" rx="6" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1"/>
  <text x="50" y="445" font-family="Courier, monospace" font-size="16" font-weight="bold" fill="#0f172a" letter-spacing="4">P&lt;INDOVERMA&lt;&lt;ANANYA&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;</text>
  <text x="50" y="475" font-family="Courier, monospace" font-size="16" font-weight="bold" fill="#0f172a" letter-spacing="4">P948210375IND9406188F3104116&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;00</text>
</svg>
`;

// 2. High-fidelity SVG for Passport Specimen 2 (Photo Replacement / Tampered)
const tamperedPassportSvg = `
<svg width="800" height="520" viewBox="0 0 800 520" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <pattern id="guilloche2" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 0,20 Q 10,0 20,20 T 40,20 M 0,20 Q 10,40 20,20 T 40,20" fill="none" stroke="#d4e3fc" stroke-width="0.75" opacity="0.7"/>
      <circle cx="20" cy="20" r="12" fill="none" stroke="#e2e8f0" stroke-width="0.5" opacity="0.5"/>
    </pattern>
    <linearGradient id="passportBg2" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="50%" stop-color="#f8fafc"/>
      <stop offset="100%" stop-color="#f1f5f9"/>
    </linearGradient>
    <filter id="subtleShadow2" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#0f172a" flood-opacity="0.15"/>
    </filter>
  </defs>

  <!-- Document Card Outer Shell -->
  <rect x="20" y="20" width="760" height="480" rx="16" fill="url(#passportBg2)" stroke="#cbd5e1" stroke-width="2" filter="url(#subtleShadow2)"/>
  <rect x="20" y="20" width="760" height="480" rx="16" fill="url(#guilloche2)"/>

  <!-- Gold Foil Emblem & Header -->
  <rect x="20" y="20" width="760" height="58" rx="16" fill="#0f172a"/>
  <rect x="20" y="60" width="760" height="18" fill="#0f172a"/>
  
  <text x="50" y="48" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#f8fafc" letter-spacing="2">REPUBLIC OF INDIA / RÉPUBLIQUE D'INDE</text>
  <text x="50" y="68" font-family="Arial, sans-serif" font-size="11" font-weight="600" fill="#94a3b8" letter-spacing="1">PASSPORT / PASSEPORT</text>
  <text x="680" y="52" font-family="Courier, monospace" font-size="18" font-weight="bold" fill="#fbbf24">IND</text>

  <!-- Specimen Identifier Marker -->
  <!-- SPECIMEN_TAMPERED_PASSPORT -->
  <rect x="520" y="32" width="130" height="22" rx="4" fill="#991b1b" stroke="#f87171" stroke-width="1"/>
  <text x="532" y="47" font-family="Arial, sans-serif" font-size="10" font-weight="bold" fill="#ffffff" letter-spacing="1">DEMO SPECIMEN 2</text>

  <!-- Security Hologram Chip Icon -->
  <rect x="50" y="90" width="34" height="26" rx="4" fill="#fef3c7" stroke="#d97706" stroke-width="1"/>
  <line x1="50" y1="103" x2="84" y2="103" stroke="#b45309" stroke-width="1.5"/>
  <circle cx="67" cy="103" r="5" fill="#fde68a" stroke="#b45309" stroke-width="1"/>

  <!-- Tampered / Replaced Photograph Box (Different individual inserted into Ananya Verma document shell) -->
  <g id="photo-box-tampered">
    <!-- Notice distinct border artifact and warm lighting shift -->
    <rect x="48" y="128" width="164" height="204" rx="4" fill="#fed7aa" stroke="#ea580c" stroke-width="1.5" stroke-dasharray="6,2"/>
    <rect x="50" y="130" width="160" height="200" rx="4" fill="#ffedd5"/>
    
    <!-- Male/Different subject silhouette with warm lighting profile -->
    <circle cx="130" cy="190" r="40" fill="#ea580c" opacity="0.8"/>
    <path d="M 75,320 C 75,255 185,255 185,320 Z" fill="#c2410c" opacity="0.85"/>
    <!-- Different facial geometry (wider jaw, glasses, short cropped hair) -->
    <path d="M 92,185 C 92,145 168,145 168,185 C 168,225 158,235 130,235 C 102,235 92,225 92,185 Z" fill="#fed7aa"/>
    <path d="M 88,175 C 88,135 172,135 172,175 C 172,185 160,165 130,165 C 100,165 88,185 88,175 Z" fill="#0f172a"/>
    <!-- Glasses -->
    <rect x="106" y="180" width="20" height="14" rx="2" fill="none" stroke="#0f172a" stroke-width="2"/>
    <rect x="134" y="180" width="20" height="14" rx="2" fill="none" stroke="#0f172a" stroke-width="2"/>
    <line x1="126" y1="187" x2="134" y2="187" stroke="#0f172a" stroke-width="2"/>
    <circle cx="116" cy="187" r="3" fill="#0f172a"/>
    <circle cx="144" cy="187" r="3" fill="#0f172a"/>
    <line x1="122" y1="215" x2="138" y2="215" stroke="#9a3412" stroke-width="2"/>

    <!-- Discontinuous guilloche lines (demonstrating photo replacement / truncated background lines) -->
    <path d="M 45,240 L 49,240" stroke="#38bdf8" stroke-width="1"/>
    <path d="M 211,240 L 215,240" stroke="#38bdf8" stroke-width="1"/>
    <text x="56" y="322" font-family="Arial, sans-serif" font-size="8" font-weight="bold" fill="#c2410c">SUBSTITUTED PORTRAIT</text>
  </g>

  <!-- Ghost Portrait / Watermark -->
  <g opacity="0.25">
    <rect x="650" y="160" width="70" height="90" rx="4" fill="#94a3b8"/>
    <circle cx="685" cy="190" r="18" fill="#475569"/>
    <path d="M 660,240 C 660,215 710,215 710,240 Z" fill="#475569"/>
  </g>

  <!-- Document Fields Table (Exact same valid identity data as Scenario 1) -->
  <g font-family="Arial, sans-serif" fill="#0f172a">
    <!-- Type / Country / Passport No -->
    <text x="240" y="110" font-size="9" font-weight="bold" fill="#64748b">TYPE / TYPE</text>
    <text x="240" y="126" font-size="13" font-weight="bold">P</text>

    <text x="320" y="110" font-size="9" font-weight="bold" fill="#64748b">COUNTRY CODE</text>
    <text x="320" y="126" font-size="13" font-weight="bold">IND</text>

    <text x="440" y="110" font-size="9" font-weight="bold" fill="#64748b">PASSPORT NO. / NO. DU PASSEPORT</text>
    <text x="440" y="126" font-size="15" font-weight="bold" fill="#0369a1" letter-spacing="1">P94821037</text>

    <!-- Surname -->
    <text x="240" y="156" font-size="9" font-weight="bold" fill="#64748b">SURNAME / NOM</text>
    <text x="240" y="174" font-size="15" font-weight="bold" letter-spacing="1">VERMA</text>

    <!-- Given Names -->
    <text x="240" y="202" font-size="9" font-weight="bold" fill="#64748b">GIVEN NAMES / PRÉNOMS</text>
    <text x="240" y="220" font-size="15" font-weight="bold" letter-spacing="1">ANANYA</text>

    <!-- Nationality & Sex -->
    <text x="240" y="248" font-size="9" font-weight="bold" fill="#64748b">NATIONALITY / NATIONALITÉ</text>
    <text x="240" y="264" font-size="13" font-weight="bold">INDIAN</text>

    <text x="440" y="248" font-size="9" font-weight="bold" fill="#64748b">SEX / SEXE</text>
    <text x="440" y="264" font-size="13" font-weight="bold">F</text>

    <!-- Date of Birth & Place of Birth -->
    <text x="240" y="292" font-size="9" font-weight="bold" fill="#64748b">DATE OF BIRTH / DATE DE NAISSANCE</text>
    <text x="240" y="308" font-size="13" font-weight="bold">18/06/1994</text>

    <text x="440" y="292" font-size="9" font-weight="bold" fill="#64748b">PLACE OF BIRTH / LIEU DE NAISSANCE</text>
    <text x="440" y="308" font-size="13" font-weight="bold">NEW DELHI, INDIA</text>

    <!-- Date of Issue & Date of Expiry -->
    <text x="240" y="336" font-size="9" font-weight="bold" fill="#64748b">DATE OF ISSUE / DATE DE DÉLIVRANCE</text>
    <text x="240" y="352" font-size="13" font-weight="bold">12/04/2021</text>

    <text x="440" y="336" font-size="9" font-weight="bold" fill="#64748b">DATE OF EXPIRY / DATE D'EXPIRATION</text>
    <text x="440" y="352" font-size="13" font-weight="bold" fill="#047857">11/04/2031</text>
  </g>

  <!-- Microprint Security Divider -->
  <line x1="40" y1="385" x2="760" y2="385" stroke="#94a3b8" stroke-dasharray="3,3" stroke-width="1"/>
  <text x="45" y="395" font-family="Courier, monospace" font-size="7" fill="#64748b">REPUBLICOFINDIAPASSPORTDOCUMENTOFFICIALSPECIMENREPUBLICOFINDIAPASSPORTDOCUMENTOFFICIALSPECIMEN</text>

  <!-- Machine Readable Zone (MRZ TD3 Format - Fully Valid) -->
  <rect x="35" y="415" width="730" height="75" rx="6" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1"/>
  <text x="50" y="445" font-family="Courier, monospace" font-size="16" font-weight="bold" fill="#0f172a" letter-spacing="4">P&lt;INDOVERMA&lt;&lt;ANANYA&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;</text>
  <text x="50" y="475" font-family="Courier, monospace" font-size="16" font-weight="bold" fill="#0f172a" letter-spacing="4">P948210375IND9406188F3104116&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;00</text>
</svg>
`;

// 3. Central Database Biometric Reference Photo (Ananya Verma)
const referenceAnanyaSvg = `
<svg width="240" height="300" viewBox="0 0 240 300" xmlns="http://www.w3.org/2000/svg">
  <rect width="240" height="300" fill="#f1f5f9"/>
  <circle cx="120" cy="110" r="55" fill="#0284c7"/>
  <path d="M 40,270 C 40,195 200,195 200,270 Z" fill="#0369a1"/>
  <path d="M 68,100 C 68,45 172,45 172,100 C 172,135 152,155 120,155 C 88,155 68,135 68,100 Z" fill="#fbcfe8"/>
  <path d="M 62,90 C 62,35 178,35 178,90 C 178,115 165,100 120,80 C 75,100 62,115 62,90 Z" fill="#1e293b"/>
  <circle cx="102" cy="100" r="5" fill="#1e293b"/>
  <circle cx="138" cy="100" r="5" fill="#1e293b"/>
  <path d="M 112,126 Q 120,134 128,126" stroke="#be185d" stroke-width="2.5" fill="none"/>
  <rect x="10" y="10" width="220" height="280" fill="none" stroke="#94a3b8" stroke-width="1.5"/>
  <text x="20" y="285" font-family="Arial, sans-serif" font-size="9" font-weight="bold" fill="#475569">CENTRAL BIOMETRIC REGISTRY</text>
</svg>
`;

// 4. Extracted Face Genuine
const extractedFaceGenuineSvg = `
<svg width="200" height="240" viewBox="0 0 200 240" xmlns="http://www.w3.org/2000/svg">
  <rect width="200" height="240" fill="#e0f2fe"/>
  <circle cx="100" cy="90" r="50" fill="#0284c7"/>
  <path d="M 30,220 C 30,160 170,160 170,220 Z" fill="#0369a1"/>
  <path d="M 55,85 C 55,35 145,35 145,85 C 145,115 130,130 100,130 C 70,130 55,115 55,85 Z" fill="#fbcfe8"/>
  <path d="M 50,75 C 50,25 150,25 150,75 C 150,95 140,85 100,68 C 60,85 50,95 50,75 Z" fill="#1e293b"/>
  <circle cx="85" cy="85" r="4" fill="#1e293b"/>
  <circle cx="115" cy="85" r="4" fill="#1e293b"/>
  <path d="M 94,108 Q 100,114 106,108" stroke="#be185d" stroke-width="2" fill="none"/>
  <text x="15" y="230" font-family="Arial, sans-serif" font-size="9" font-weight="bold" fill="#0369a1">EXTRACTED PASSPORT FACE</text>
</svg>
`;

// 5. Extracted Face Tampered
const extractedFaceTamperedSvg = `
<svg width="200" height="240" viewBox="0 0 200 240" xmlns="http://www.w3.org/2000/svg">
  <rect width="200" height="240" fill="#ffedd5"/>
  <circle cx="100" cy="85" r="48" fill="#ea580c"/>
  <path d="M 30,225 C 30,165 170,165 170,225 Z" fill="#c2410c"/>
  <path d="M 55,80 C 55,35 145,35 145,80 C 145,120 135,130 100,130 C 65,130 55,120 55,80 Z" fill="#fed7aa"/>
  <path d="M 50,70 C 50,25 150,25 150,70 C 150,80 140,60 100,60 C 60,60 50,80 50,70 Z" fill="#0f172a"/>
  <!-- Glasses -->
  <rect x="74" y="76" width="22" height="15" rx="2" fill="none" stroke="#0f172a" stroke-width="2"/>
  <rect x="104" y="76" width="22" height="15" rx="2" fill="none" stroke="#0f172a" stroke-width="2"/>
  <line x1="96" y1="83" x2="104" y2="83" stroke="#0f172a" stroke-width="2"/>
  <circle cx="85" cy="83" r="3" fill="#0f172a"/>
  <circle cx="115" cy="83" r="3" fill="#0f172a"/>
  <line x1="90" y1="110" x2="110" y2="110" stroke="#9a3412" stroke-width="2"/>
  <text x="15" y="230" font-family="Arial, sans-serif" font-size="9" font-weight="bold" fill="#c2410c">SUBSTITUTED PASSPORT FACE</text>
</svg>
`;

export function generateAllSpecimens() {
  const p1Path = path.join(specimensDir, 'specimen_genuine_passport.png');
  const p2Path = path.join(specimensDir, 'specimen_tampered_passport.png');
  const refPath = path.join(specimensDir, 'reference_ananya_verma.png');
  const faceGenPath = path.join(specimensDir, 'extracted_face_genuine.png');
  const faceTampPath = path.join(specimensDir, 'extracted_face_tampered.png');

  fs.writeFileSync(p1Path, Buffer.from(genuinePassportSvg));
  fs.writeFileSync(p2Path, Buffer.from(tamperedPassportSvg));
  fs.writeFileSync(refPath, Buffer.from(referenceAnanyaSvg));
  fs.writeFileSync(faceGenPath, Buffer.from(extractedFaceGenuineSvg));
  fs.writeFileSync(faceTampPath, Buffer.from(extractedFaceTamperedSvg));

  // Compute and register SHA-256 signatures in DemoScenarioService
  const hash1 = crypto.createHash('sha256').update(fs.readFileSync(p1Path)).digest('hex');
  const hash2 = crypto.createHash('sha256').update(fs.readFileSync(p2Path)).digest('hex');

  DemoScenarioService.registerHash('GENUINE_PASSPORT', hash1);
  DemoScenarioService.registerHash('PHOTO_REPLACEMENT', hash2);

  console.log('[BorderGuard AI] Generated high-fidelity specimen assets:');
  console.log(` - Specimen 1 (Genuine): ${p1Path} (SHA256: ${hash1.slice(0, 12)}...)`);
  console.log(` - Specimen 2 (Tampered): ${p2Path} (SHA256: ${hash2.slice(0, 12)}...)`);
}
