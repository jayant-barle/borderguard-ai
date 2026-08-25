# 🛡️ BorderGuard AI

**AI-Powered Identity & Document Screening for Faster, Safer Verification**
*Smart India Hackathon Prototype — Explainable Decision-Support System*

---

## 📌 Executive Summary

**BorderGuard AI** is an enterprise-grade full-stack security operations web application designed to assist border control officers and immigration authorities with rapid, explainable document screening.

It analyzes identity documents (biometric passports, visas, national IDs), validates optical quality and ICAO 9303 MRZ mathematical checksums, performs digital tampering & photo substitution forensics, matches facial biometrics against central government identity profiles, and synthesizes multi-signal risk assessments with plain-language explanations and immutable audit logs.

> [!IMPORTANT]
> **Prototype & Decision-Support Notice:**  
> BorderGuard AI operates as an intelligent **decision-support platform** to accelerate officer workflows. It never makes automated legal, immigration, or criminal decisions.

---

## 🌟 Core Capabilities & Workflow

```text
LOGIN (Officer / Admin)
  ↓
DASHBOARD (Real-Time Metrics & Dynamic Recharts Trends)
  ↓
NEW VERIFICATION (Passport, Visa, National ID, Permit)
  ↓
INPUT: Real-time Camera Viewfinder Snapshot OR Drag-and-Drop File Upload
  ↓
AUTOMATED 8-STAGE FORENSIC PIPELINE:
  1. Document Ingestion & Perceptual Image Fingerprint
  2. Optical Quality & Sharpness Assessment (DPI, exposure, glare)
  3. Optical Character Recognition (OCR) Field Extraction & Confidence
  4. ICAO Doc 9303 MRZ Mathematical Check Digit Validation (7-3-1 algorithm)
  5. Digital Tampering & Error Level Analysis (Photo boundary feathering, ELA)
  6. Biometric Facial Consistency & Landmark Matching
  7. Central Government Database & Watchlist / Blacklist Screening
  8. Configurable Multidimensional Risk Calculation Engine
  ↓
EXPLAINABLE DOSSIER REPORT:
  - Radial Risk Index (0–100) & Risk Tier (LOW / MEDIUM / HIGH)
  - Side-by-Side Biometric Photo & Document Comparison
  - "Why is this document suspicious?" Plain-Language Rationale
  - Interactive MRZ Checksum Inspector & OCR Confidence Bars
  - Forensic Anomaly Indicator Cards
  - Printable / Exportable PDF Summary
  ↓
AUTOMATIC PERSISTENCE:
  - Verification History Archive (Multi-Filter & Search)
  - Chronological Immutable Audit Log
```

---

## 🎯 Demo AI Mode & Hackathon Specimen Scenarios

BorderGuard AI features a dedicated, transparent **AI Engine: Demo Mode** badge designed for the Smart India Hackathon evaluation. It includes perceptual fingerprinting and SHA-256 signatures to recognize sample specimens regardless of filename:

### Scenario 1 — Genuine Biometric Passport
- **Holder:** ANANYA VERMA (P94821037)
- **Signals:** Valid MRZ checksums, clean photo boundary, 94.8% biometric face match, active central registry match.
- **Result:** `LOW RISK` (~10–20/100) → **`VERIFIED`**

### Scenario 2 — Photo Replacement / Face Mismatch
- **Holder:** ANANYA VERMA (P94821037)
- **Signals:** Identical valid document shell and MRZ checksums, but photograph has been digitally substituted with a different subject.
- **Forensics:** ELA compression discontinuity, edge feathering artifacts, 43.2% facial biometric mismatch.
- **Result:** `HIGH RISK` (~88–95/100) → **`REQUIRES MANUAL REVIEW`**
- **Explainable Rationale:** Explains that the database shell and MRZ are authentic, but the altered portrait triggers high-risk identity inconsistency.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons, Recharts, Canvas-Confetti |
| **Backend** | Node.js, Express, TypeScript, TSX |
| **Database** | SQLite with `better-sqlite3` (Zero external setup, ACID persistence) |
| **Security** | JWT Authentication, Bcrypt password hashing, Role authorization, Audit logger |

---

## 🚀 Quick Start Guide

### 1. Install Dependencies
```bash
npm install
npm run --prefix client install
```

### 2. Run Automated Pipeline Test Suite
```bash
npm run test:pipeline
```

### 3. Start Development Server (Full Stack)
```bash
npm run dev
```
- Backend API Server: `http://localhost:5000`
- Frontend Client: `http://localhost:3000` (or `http://localhost:5000` in production)

---

## 🔐 Demo Credentials

| Role | Email Address | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Officer** | `officer@borderguard.demo` | `Officer@123` | Start verification, upload/camera, view results & history |
| **Admin** | `admin@borderguard.demo` | `Admin@123` | Officer features + User management, Mock DB registry, Risk Engine calibration, Audit logs |

---

## 🏛️ Project Directory Structure

```text
borderguard-ai/
├── package.json
├── tsconfig.json
├── shared/
│   └── types.ts                 # Shared TypeScript interfaces & types
├── server/
│   ├── src/
│   │   ├── index.ts             # Express server entrypoint
│   │   ├── db/
│   │   │   ├── database.ts      # SQLite connection & schema tables
│   │   │   └── seed.ts          # Seed data (Users, Documents, Config)
│   │   ├── middleware/
│   │   │   ├── auth.ts          # JWT & Role authorization
│   │   │   └── audit.ts         # Automated audit logger
│   │   ├── services/
│   │   │   ├── DemoScenarioService.ts      # Fingerprinting & specimen detection
│   │   │   ├── ImageQualityService.ts      # Resolution, blur, contrast & exposure
│   │   │   ├── OCRService.ts               # Field extraction & confidence
│   │   │   ├── MRZValidationService.ts     # ICAO 9303 7-3-1 check digit calculator
│   │   │   ├── TamperingService.ts         # Photo substitution & ELA forensics
│   │   │   ├── FaceVerificationService.ts  # Biometric similarity & landmarks
│   │   │   ├── IdentityMatchingService.ts  # Database cross-match & blacklists
│   │   │   └── RiskEngine.ts               # Configurable weighted scoring
│   │   ├── routes/
│   │   │   ├── auth.routes.ts
│   │   │   ├── verification.routes.ts
│   │   │   ├── documents.routes.ts
│   │   │   ├── analytics.routes.ts
│   │   │   ├── admin.routes.ts
│   │   │   └── specimens.routes.ts
│   │   ├── utils/
│   │   │   └── generateSpecimens.ts
│   │   └── tests/
│   │       └── pipeline.test.ts
├── client/
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── index.css
│   │   ├── context/
│   │   │   └── AuthContext.tsx
│   │   ├── services/
│   │   │   └── api.ts
│   │   ├── components/
│   │   │   ├── layout/          # Sidebar, Navbar, DemoBanner
│   │   │   ├── ui/              # RiskBadge, StatusBadge, RiskGauge
│   │   │   ├── scanner/         # CameraScanner with live feed & guide frame
│   │   │   ├── uploader/        # DragDropUploader & specimen quick-runners
│   │   │   ├── processing/      # Step-by-step progress stepper
│   │   │   └── report/          # Explainable Risk Card, Photo Viewer, MRZ Inspector, etc.
│   │   └── pages/
│   │       ├── Login.tsx
│   │       ├── Dashboard.tsx
│   │       ├── NewVerification.tsx
│   │       ├── VerificationReport.tsx
│   │       ├── History.tsx
│   │       ├── Analytics.tsx
│   │       └── admin/           # Users, Mock Documents, Risk Settings, Audit Logs
└── assets/
    └── specimens/               # Specimen documents & reference portraits
```
