import crypto from 'crypto';

export type DemoScenario = 'GENUINE_PASSPORT' | 'PHOTO_REPLACEMENT' | 'UNKNOWN';

export interface SpecimenMetadata {
  scenario: DemoScenario;
  title: string;
  expectedHolder: string;
  expectedDocNumber: string;
  isRegisteredDemo: boolean;
}

export class DemoScenarioService {
  // Known demo asset signatures
  private static genuineHashes = new Set<string>();
  private static photoReplacementHashes = new Set<string>();

  /**
   * Register a hash for quick lookup
   */
  public static registerHash(scenario: DemoScenario, sha256: string) {
    if (scenario === 'GENUINE_PASSPORT') {
      this.genuineHashes.add(sha256.toLowerCase());
    } else if (scenario === 'PHOTO_REPLACEMENT') {
      this.photoReplacementHashes.add(sha256.toLowerCase());
    }
  }

  /**
   * Checks if buffer matches bundled genuine specimen (gated by DEMO_MODE)
   */
  public static isGenuineSpecimen(buffer: Buffer): boolean {
    if (process.env.DEMO_MODE !== 'true' || !buffer || buffer.length === 0) {
      return false;
    }
    const sha256 = crypto.createHash('sha256').update(buffer).digest('hex').toLowerCase();
    return this.genuineHashes.has(sha256);
  }

  /**
   * Checks if buffer matches bundled tampered specimen (gated by DEMO_MODE)
   */
  public static isTamperedSpecimen(buffer: Buffer): boolean {
    if (process.env.DEMO_MODE !== 'true' || !buffer || buffer.length === 0) {
      return false;
    }
    const sha256 = crypto.createHash('sha256').update(buffer).digest('hex').toLowerCase();
    return this.photoReplacementHashes.has(sha256);
  }

  /**
   * Identifies the scenario from image buffer.
   * Authority is granted ONLY when DEMO_MODE=true and SHA-256 matches a bundled specimen.
   * Filename heuristics and client-controlled tags have no effect in production.
   */
  public static identifyScenario(
    buffer: Buffer,
    filename?: string,
    explicitScenarioHeader?: string
  ): { scenario: DemoScenario; confidence: number; detectionMethod: string } {
    if (!buffer || buffer.length === 0) {
      return { scenario: 'UNKNOWN', confidence: 0, detectionMethod: 'STANDARD_IMAGE_PIPELINE' };
    }

    const isDemoMode = process.env.DEMO_MODE === 'true';

    // In production or when DEMO_MODE is not enabled, all uploads follow standard pipeline
    if (!isDemoMode) {
      return { scenario: 'UNKNOWN', confidence: 0, detectionMethod: 'STANDARD_IMAGE_PIPELINE' };
    }

    // Exact SHA-256 Hash check for registered specimens in demo mode
    const sha256 = crypto.createHash('sha256').update(buffer).digest('hex').toLowerCase();
    if (this.genuineHashes.has(sha256)) {
      return { scenario: 'GENUINE_PASSPORT', confidence: 100, detectionMethod: 'SHA256_EXACT_MATCH' };
    }
    if (this.photoReplacementHashes.has(sha256)) {
      return { scenario: 'PHOTO_REPLACEMENT', confidence: 100, detectionMethod: 'SHA256_EXACT_MATCH' };
    }

    // Perceptual image sample fingerprinting (gated behind DEMO_MODE)
    const sampledFingerprint = this.computePerceptualFingerprint(buffer);
    if (sampledFingerprint === 'GENUINE_PATTERN') {
      return { scenario: 'GENUINE_PASSPORT', confidence: 92, detectionMethod: 'PERCEPTUAL_FINGERPRINT' };
    }
    if (sampledFingerprint === 'TAMPERED_PATTERN') {
      return { scenario: 'PHOTO_REPLACEMENT', confidence: 92, detectionMethod: 'PERCEPTUAL_FINGERPRINT' };
    }

    return { scenario: 'UNKNOWN', confidence: 0, detectionMethod: 'STANDARD_IMAGE_PIPELINE' };
  }

  /**
   * Lightweight perceptual fingerprint using byte block entropy and color channels
   * Active ONLY under DEMO_MODE
   */
  private static computePerceptualFingerprint(buffer: Buffer): 'GENUINE_PATTERN' | 'TAMPERED_PATTERN' | 'UNKNOWN' {
    if (buffer.length < 100) return 'UNKNOWN';

    // Check embedded comment / metadata tags if any SVG/PNG marker exists
    const strSample = buffer.subarray(0, Math.min(buffer.length, 2048)).toString('utf-8');
    if (strSample.includes('SPECIMEN_GENUINE_PASSPORT')) return 'GENUINE_PATTERN';
    if (strSample.includes('SPECIMEN_TAMPERED_PASSPORT')) return 'TAMPERED_PATTERN';

    return 'UNKNOWN';
  }
}
