# 🏛️ BorderGuard AI — System Architecture (v2.5.0)

This document describes the end-to-end technical architecture, forensic algorithms, risk calculation formulas, and fail-closed security protocols implemented in **BorderGuard AI v2.5.0**.

---

## 1. Overview & Architectural Principles

BorderGuard AI is an automated identity screening and travel document forensic analysis decision-support system. It follows five strict architectural rules:

1. **Evidence-Driven Decisions**: Every indicator, risk penalty, forensic highlight, and explanation statement must be derived from a physical or pixel measurement actually performed by the code. Unimplemented or simulated checks are strictly forbidden.
2. **Fail-Closed by Default**: When image data is corrupt, truncated, non-processable, or unverified against a reference, the pipeline must return `status: 'ERROR'` or `consistency: 'NOT_EVALUATED'`, and the risk engine must mandate `REQUIRES_MANUAL_REVIEW`.
3. **No Environmental Assumptions**: Filename heuristics or client-provided scenario tags (`req.body.scenario`) have authority **only** when `DEMO_MODE=true` AND image SHA-256 matches a bundled specimen. In production (`DEMO_MODE=false`), uploads are analyzed purely by pixel and optical evidence.
4. **Pure Mathematical Scoring**: The total risk score is the unclamped sum of weighted factor contributions ($0 \le \text{Score} \le 100$). Artificial clamping or score bumping is eliminated.
5. **Deterministic Hard Overrides**: Critical security anomalies (confirmed tampering, blacklisted identities, MRZ checksum failures, biometric mismatch, or forensic errors) trigger automated escalation to `HIGH RISK` / `REQUIRES_MANUAL_REVIEW` regardless of numerical score.

---

## 2. Digital Forensics Pipeline (`TamperingService`)

The forensics module analyzes document pixels for physical splice, photo replacement, and digital alteration using three independent measured signals computed via `sharp`:

### A. JPEG Error Level Analysis (ELA)
- **Methodology**: 
  1. The input image is converted to a normalized raster buffer.
  2. The image is re-compressed to JPEG at a standardized quality factor ($q = 90$).
  3. Raw pixel arrays of both the original and re-compressed buffers are extracted.
  4. Absolute per-pixel difference is computed: $\Delta_{RGB} = |\text{orig} - \text{recompressed}|$.
  5. The difference matrix is aggregated into an $8 \times 8$ grid of regional blocks.
  6. ELA error variance is computed for each block:
     $$\sigma^2 = \frac{1}{N} \sum (x_i - \mu)^2$$
  7. The ratio between the portrait region variance and the document substrate variance is evaluated:
     $$\text{ELA Ratio} = \frac{\sigma^2_{\text{portrait}}}{\sigma^2_{\text{substrate}}}$$
- **Threshold**: $\text{ELA Ratio} > 1.60$ flags a localized compression discontinuity.
- **Dynamic Highlight Coordinates**: The bounding box of the block exhibiting maximum ELA variance is returned as `highlightCoordinates` to highlight anomalous splices for the officer. If no anomaly is detected, `highlightCoordinates` is omitted.

### B. Color Temperature Disparity (R/B Warmth Differential)
- **Methodology**:
  1. Approximate portrait region ($\text{photoBox}$) and substrate background ($\text{subBox}$) are sampled.
  2. Channel means ($R, G, B$) are computed via `sharp.stats()`.
  3. Chromatic warmth ratio is measured:
     $$\text{Warmth} = \frac{\bar{R}}{\bar{B}}$$
  4. The differential is calculated:
     $$\Delta_{\text{warmth}} = \text{Warmth}_{\text{portrait}} - \text{Warmth}_{\text{substrate}}$$
- **Threshold**: $\Delta_{\text{warmth}} > 0.22$ indicates an artificial ambient lighting disparity (e.g., warm incandescent indoor lighting in photo spliced onto a daylight substrate).

### C. Portrait Margin Gradient Transition
- **Methodology**:
  - Horizontal and vertical edge gradients across the portrait margin are extracted via grayscale convolution.
  - Variance of gradient transitions along the 4-point margin boundary is measured.
- **Threshold**: Edge transition variance score $> 25.0$ indicates boundary feathering or cutting artifacts.

### D. Dynamic Forensic Confidence
- Rather than returning fixed constants (`96.5%`, `94.2%`), confidence is computed dynamically:
  $$\text{Confidence} = 78.0 + \min(19.0, \max(\text{Signal Scores}) \times 0.2)$$
  For clean specimens with high signal margin, confidence scales to $94\% - 97\%$.

---

## 3. Facial Biometric Verification (`FaceVerificationService`)

- **Rotation Invariance**: Scans full document across 4 orientations ($0^\circ, 90^\circ, 180^\circ, 270^\circ$) to locate and upright facial portraits.
- **Registry Comparison**:
  - When reference photo exists in database, biometrically compares document portrait with reference using color Euclidean distance and grayscale pixel correlation ($0 - 100\%$).
  - Mismatch threshold: similarity $< 70\%$.
- **Missing Database Reference**:
  - If a document is scanned and no reference photo is available in the central registry, the service returns:
    - `consistency: 'NOT_EVALUATED'`
    - `evaluated: false`
    - `similarityScore: null`
    - `confidence: null`
    - `summary: 'Portrait face detected on document, but no central registry reference photo is available for biometric comparison.'`
  - This immediately triggers the automated fail-closed hard override in the risk engine.

---

## 4. Multidimensional Risk Calculation Engine (`RiskEngine`)

### A. Factor Weight Calibration
Configurable via Admin Calibration Portal (`risk_config` table in SQLite):
- **Tampering & Forensics Weight**: 30% (Default penalty: Clean 4, Flagged 96, Error 96)
- **Facial Biometric Weight**: 30% (Default penalty: Match 5, Mismatch 95, Unevaluated 50, Error 95)
- **Central Database Weight**: 15% (Default penalty: Active 2, Not Found 60, Expired 50, Suspended 70, Blacklisted 100)
- **MRZ Integrity Weight**: 10% (Default penalty: Passed 2, Warning 35, Failed 80)
- **Document Expiry & Biographical Fields**: 10% (Default penalty: Valid 3, OCR Low Conf 25, Expired 60)
- **Optical Scan Quality**: 5% (Default penalty: Good 2, Medium 20, Poor 50)

### B. Mathematical Score Formula
$$\text{BaseScore} = \sum_{i=1}^{6} \frac{\text{Penalty}_i \times \text{Weight}_i}{100}$$
$$\text{TotalScore} = \text{clamp}(\text{round}(\text{BaseScore}), 0, 100)$$

### C. Threshold Architecture & Tiers
BorderGuard AI defines 3 distinct risk tiers governed by two cutoffs (`lowThreshold` and `mediumThreshold`):

| Risk Tier | Score Range | Final Status | Action Directive |
| :--- | :--- | :--- | :--- |
| **LOW RISK** | $\text{Score} < \text{lowThreshold}$ (0–29) | `VERIFIED` | Continue standard primary clearance |
| **MEDIUM RISK** | $\text{lowThreshold} \le \text{Score} < \text{mediumThreshold}$ (30–59) | `SUSPICIOUS` | Officer discretionary inspection recommended |
| **HIGH RISK** | $\text{Score} \ge \text{mediumThreshold}$ (60–100) | `REQUIRES_MANUAL_REVIEW` | Mandatory secondary review / physical inspection |

### D. Automated Hard Overrides
The following security conditions automatically escalate the assessment to **`HIGH RISK`** and **`REQUIRES_MANUAL_REVIEW`**, regardless of numerical score:
1. `tampering.detected === true` (confirmed digital photo substitution or manipulation)
2. `database.status === 'BLACKLISTED'` (interpol or national sanctions alert)
3. `mrz.overallStatus === 'FAILED' && mrz.checksums.some(c => !c.valid)` (mathematical check digit breach)
4. `database.recordFound && (!database.nameMatch || !database.dobMatch)` (biographical identity mismatch)
5. `tampering.status === 'ERROR' || face.status === 'ERROR'` (forensic module failure)
6. `face.consistency === 'NOT_EVALUATED' || face.evaluated === false` (missing central reference photo)

### E. Explainable Decision Support (`whySuspicious`)
- `checksPassed`: Extracted strictly from factors where $\text{severity} == \text{'LOW'}$. Checks that failed or were not evaluated are never displayed as passed.
- `flagsDetected`: Extracted from factors where $\text{severity} \in \{\text{'HIGH'}, \text{'MEDIUM'}\}$, supplemented by individual measured forensic indicators that exceeded detection thresholds.
- `conclusion`: Factual summary generated from the specific anomalous signals detected. DEMO MODE simulated photo replacement explanation is displayed **only** when `process.env.DEMO_MODE === 'true'`.

---

## 5. Database Schema & Migration Protocol

BorderGuard AI utilizes SQLite with `better-sqlite3` and Write-Ahead Logging (`WAL`):

- **Schema Redundancy Removal**: The unused `high_threshold` column was dropped from `risk_config`.
- **Automatic Migration**: `migrateDatabase()` executes upon server startup, inspecting `PRAGMA table_info(risk_config)` and executing `ALTER TABLE risk_config DROP COLUMN high_threshold;` if the legacy column is present.
- **Admin Configuration**: The admin settings API validates that $0 \le \text{lowThreshold} < \text{mediumThreshold} \le 100$, and weights sum to $100\%$.
