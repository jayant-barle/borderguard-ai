# Changelog

All notable changes to the BorderGuard AI platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.5.0] - 2026-11-19

### Added
- **Real Error Level Analysis (ELA)**: Re-encodes JPEG/PNG buffers at $q = 90$, computes pixel difference arrays, aggregates into an $8 \times 8$ block grid, and evaluates portrait-to-substrate variance ratios using only `sharp`.
- **Dynamic Bounding Box Highlights**: Anomalous splices are now dynamically highlighted by calculating the bounding box of the block exhibiting maximum ELA variance. The fixed `{x:48, y:110, w:240, h:310}` box has been eliminated.
- **Measured Forensic Indicators**: Every tampering indicator now reports exact raw `value`, `threshold`, and `evaluated` state. Unimplemented checks (sub-pixel grid interpolation, fake micro-print ribbons) have been removed.
- **Dynamic Forensic Confidence**: Replaced static constants (`96.5%`, `94.2%`) with confidence scaling dynamically derived from measured signal margins ($78\% - 97\%$).
- **Biometric Not-Evaluated State**: Handled uploads lacking central registry reference photos with explicit `consistency: 'NOT_EVALUATED'`, `similarityScore: null`, `evaluated: false`, escalating to mandatory manual review.
- **Fail-Closed Hard Overrides**: Hard overrides mandate `HIGH RISK` and `REQUIRES_MANUAL_REVIEW` on confirmed tampering, blacklisted identities, MRZ checksum failures, biographical name/DOB mismatch, forensic module error, or unevaluated biometric checks.
- **Dynamic `whySuspicious`**: `checksPassed` is strictly derived from factors with `severity: 'LOW'`. `flagsDetected` is derived from factors with `severity: 'HIGH' | 'MEDIUM'`. DEMO MODE simulation conclusions are displayed only when `DEMO_MODE=true`.
- **SQLite Database Migration**: Added automated startup migration dropping redundant `high_threshold` column from `risk_config`.
- **Automated Pipeline Tests (a–f)**: Added test suite covering measured indicators, synthetic warmth differential, unclamped score calculation, MRZ failure rationale exclusion, threshold boundary tiers (29, 30, 59, 60), and JPEG/PNG ELA verification.

### Changed
- **Score Calculation Formula**: Total risk score is now strictly the unclamped mathematical sum of factor contributions ($0 \le \text{Score} \le 100$). Removed artificial $+32$ / $[88, 95]$ clamp for tampered specimens.
- **Scenario 2 Documentation**: Documented natural factor score (`58/100`) for Scenario 2 specimen, with `HIGH RISK` / `REQUIRES_MANUAL_REVIEW` guaranteed via the tampering hard override.
- **Admin Risk Settings UI**: Aligned threshold cards and update payloads with the 2-cutoff, 3-tier architecture (`LOW < lowThreshold`, `lowThreshold <= MEDIUM < mediumThreshold`, `HIGH >= mediumThreshold`).
- **Ollama Threat Analysis**: Updated prompt construction and deterministic fallback reasoning to utilize real measured forensic signals rather than asserting photo replacement on arbitrary high-risk uploads.

---

## [2.4.0] - 2026-11-19

### Added
- **Security Hardening**: Gated demo specimen recognition behind `DEMO_MODE=true` environment variable with exact SHA-256 fingerprinting.
- **Fail-Closed Forensic Error Architecture**: Corrupt, truncated, or zero-byte uploads fail closed with explicit `status: 'ERROR'`, `confidence: null`, and `similarityScore: null`.
- **Module Failure Naming**: Rationale lines in the risk engine explicitly identify failed forensic modules when secondary review is required.

---

## [2.3.0] - 2026-08-28
- Dynamic document rotation & crop studio.
- 360-degree rotational face extraction.
- Central registry identity synchronization on upload.
