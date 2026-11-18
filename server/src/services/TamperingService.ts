import sharp from 'sharp';
import { TamperingResult, TamperingIndicator } from '../../../shared/types';
import { DemoScenario, DemoScenarioService } from './DemoScenarioService';

/**
 * Standard ICAO Document portrait photo region approximate coordinates (ratios of document dimensions)
 */
export const APPROXIMATE_PORTRAIT_REGION = {
  leftRatio: 0.0625,
  topRatio: 0.25,
  widthRatio: 0.20,
  heightRatio: 0.385
};

export const APPROXIMATE_SUBSTRATE_REGION = {
  leftRatio: 0.30,
  topRatio: 0.25,
  widthRatio: 0.35,
  heightRatio: 0.385
};

export interface OpticalMeasurements {
  isTampered: boolean;
  elaRatio: number;
  elaVarianceRatio: number;
  warmthDiff: number;
  borderAnomalyScore: number;
  highlightCoordinates?: { x: number; y: number; width: number; height: number };
  approximatePortraitRegion: { left: number; top: number; width: number; height: number };
}

export class TamperingService {
  /**
   * Analyze document image buffer for digital manipulation, photo replacement, and substrate anomalies
   */
  public static async analyze(
    buffer: Buffer,
    scenario: DemoScenario,
    faceMismatch?: boolean
  ): Promise<TamperingResult> {
    // Edge case: zero-byte or invalid buffer
    if (!buffer || buffer.length === 0) {
      return {
        status: 'ERROR',
        detected: false,
        confidence: null,
        type: 'NONE',
        indicators: [],
        summary: 'Tampering forensic analysis failed: Image buffer is empty (zero bytes).'
      };
    }

    // Dynamic Forensic Inspection on Raster Pixels (JPEG, PNG, WebP, converted SVG)
    try {
      const opticalStats = await this.analyzeOpticalForensics(buffer);

      // If optical analysis reveals significant anomaly or face mismatch was flagged
      if (opticalStats.isTampered || faceMismatch) {
        return this.getPhotoReplacementResult(opticalStats);
      }

      // Return genuine analysis result with dynamically computed metrics
      return this.getGenuineResult(opticalStats);
    } catch (e: any) {
      console.warn('[TamperingService] Forensic analysis error (failing closed):', e.message);
      return {
        status: 'ERROR',
        detected: false,
        confidence: null,
        type: 'NONE',
        indicators: [],
        summary: `Tampering forensic analysis failed: ${e.message || 'Image processing error'}`
      };
    }
  }

  /**
   * Determine if buffer is an SVG XML document
   */
  private static isSvgBuffer(buffer: Buffer): boolean {
    const header = buffer.subarray(0, Math.min(buffer.length, 512)).toString('utf-8');
    return header.includes('<svg') || header.includes('<?xml');
  }

  /**
   * Optical Forensics: Compute real Error Level Analysis (ELA), R/B color warmth disparity,
   * and boundary edge gradient statistics.
   * Throws an error on corrupted, truncated, or unprocessable image data (fail-closed).
   */
  private static async analyzeOpticalForensics(buffer: Buffer): Promise<OpticalMeasurements> {
    if (!buffer || buffer.length === 0) {
      throw new Error('Image buffer is empty (zero bytes)');
    }

    const rasterBuf = this.isSvgBuffer(buffer)
      ? await sharp(buffer).png().toBuffer()
      : buffer;

    const meta = await sharp(rasterBuf).metadata();
    const w = meta.width;
    const h = meta.height;

    if (!w || !h || w < 100 || h < 100) {
      throw new Error(`Image dimensions ${w || 0}x${h || 0} are insufficient (minimum 100x100 required for forensic analysis)`);
    }

    const photoBox = {
      left: Math.round(w * APPROXIMATE_PORTRAIT_REGION.leftRatio),
      top: Math.round(h * APPROXIMATE_PORTRAIT_REGION.topRatio),
      width: Math.round(w * APPROXIMATE_PORTRAIT_REGION.widthRatio),
      height: Math.round(h * APPROXIMATE_PORTRAIT_REGION.heightRatio)
    };

    const subBox = {
      left: Math.round(w * APPROXIMATE_SUBSTRATE_REGION.leftRatio),
      top: Math.round(h * APPROXIMATE_SUBSTRATE_REGION.topRatio),
      width: Math.round(w * APPROXIMATE_SUBSTRATE_REGION.widthRatio),
      height: Math.round(h * APPROXIMATE_SUBSTRATE_REGION.heightRatio)
    };

    // 1. Error Level Analysis (ELA) with fixed quality JPEG re-compression (q=90)
    const q90Buffer = await sharp(rasterBuf).jpeg({ quality: 90 }).toBuffer();
    const origRaw = await sharp(rasterBuf).resize(w, h).removeAlpha().raw().toBuffer();
    const q90Raw = await sharp(q90Buffer).resize(w, h).removeAlpha().raw().toBuffer();

    const blockSize = Math.max(16, Math.floor(Math.min(w, h) / 30));
    let maxBlock = { x: photoBox.left, y: photoBox.top, width: blockSize, height: blockSize, meanDiff: 0 };

    let photoDiffSum = 0;
    let photoPixelCount = 0;
    let subDiffSum = 0;
    let subPixelCount = 0;

    const photoBlockMeans: number[] = [];
    const subBlockMeans: number[] = [];

    for (let by = 0; by < h; by += blockSize) {
      const bHeight = Math.min(blockSize, h - by);
      for (let bx = 0; bx < w; bx += blockSize) {
        const bWidth = Math.min(blockSize, w - bx);
        let blockDiffSum = 0;
        const count = bWidth * bHeight;

        for (let y = by; y < by + bHeight; y++) {
          for (let x = bx; x < bx + bWidth; x++) {
            const idx = (y * w + x) * 3;
            const diff = (
              Math.abs(origRaw[idx] - q90Raw[idx]) +
              Math.abs(origRaw[idx + 1] - q90Raw[idx + 1]) +
              Math.abs(origRaw[idx + 2] - q90Raw[idx + 2])
            ) / 3;

            blockDiffSum += diff;

            if (
              x >= photoBox.left &&
              x < photoBox.left + photoBox.width &&
              y >= photoBox.top &&
              y < photoBox.top + photoBox.height
            ) {
              photoDiffSum += diff;
              photoPixelCount++;
            } else if (
              x >= subBox.left &&
              x < subBox.left + subBox.width &&
              y >= subBox.top &&
              y < subBox.top + subBox.height
            ) {
              subDiffSum += diff;
              subPixelCount++;
            }
          }
        }

        const blockMean = count > 0 ? blockDiffSum / count : 0;
        if (blockMean > maxBlock.meanDiff) {
          maxBlock = { x: bx, y: by, width: bWidth, height: bHeight, meanDiff: blockMean };
        }

        const isPhotoBlock =
          bx >= photoBox.left &&
          bx < photoBox.left + photoBox.width &&
          by >= photoBox.top &&
          by < photoBox.top + photoBox.height;
        const isSubBlock =
          bx >= subBox.left &&
          bx < subBox.left + subBox.width &&
          by >= subBox.top &&
          by < subBox.top + subBox.height;

        if (isPhotoBlock) photoBlockMeans.push(blockMean);
        if (isSubBlock) subBlockMeans.push(blockMean);
      }
    }

    const elaMeanPhoto = photoPixelCount > 0 ? photoDiffSum / photoPixelCount : 0;
    const elaMeanSub = subPixelCount > 0 ? subDiffSum / subPixelCount : 0;
    const elaRatio = Number(((elaMeanPhoto + 0.1) / (elaMeanSub + 0.1)).toFixed(2));

    const calcVar = (arr: number[], mean: number) =>
      arr.length > 1 ? arr.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / arr.length : 0;
    const photoVar = calcVar(photoBlockMeans, elaMeanPhoto);
    const subVar = calcVar(subBlockMeans, elaMeanSub);
    const elaVarianceRatio = Number(((photoVar + 0.01) / (subVar + 0.01)).toFixed(2));

    // 2. Color Temperature Warmth Differential (R/B ratio in photo vs substrate)
    const photoCrop = await sharp(rasterBuf).extract(photoBox).png().toBuffer();
    const subCrop = await sharp(rasterBuf).extract(subBox).png().toBuffer();

    const pStats = await sharp(photoCrop).stats();
    const sStats = await sharp(subCrop).stats();

    const pR = pStats.channels[0].mean;
    const pB = pStats.channels[2].mean;
    const sR = sStats.channels[0].mean;
    const sB = sStats.channels[2].mean;

    const pWarmth = pR / (pB || 1);
    const sWarmth = sR / (sB || 1);
    const warmthDiff = Number((pWarmth - sWarmth).toFixed(3));

    // 3. Boundary Edge Gradient Statistics
    const borderWidth = Math.max(2, Math.floor(w * 0.005));
    const borderBox = {
      left: Math.max(0, photoBox.left - borderWidth),
      top: Math.max(0, photoBox.top - borderWidth),
      width: Math.min(w - Math.max(0, photoBox.left - borderWidth), photoBox.width + borderWidth * 2),
      height: Math.min(h - Math.max(0, photoBox.top - borderWidth), photoBox.height + borderWidth * 2)
    };
    const borderCrop = await sharp(rasterBuf).extract(borderBox).png().toBuffer();
    const borderStats = await sharp(borderCrop).stats();
    const borderAnomalyScore = Number(
      Math.abs(borderStats.channels[0].stdev - pStats.channels[0].stdev).toFixed(1)
    );

    // Documented Thresholds:
    // Warmth threshold: 0.22
    // ELA Ratio threshold: 1.60 (or < 0.55)
    // Border gradient threshold: 25.0
    const isWarmthAnomalous = warmthDiff > 0.22;
    const isElaAnomalous = (elaRatio > 1.60 || elaRatio < 0.55) && maxBlock.meanDiff > 0.4;
    const isBorderAnomalous = borderAnomalyScore > 25.0;

    const isTampered = isWarmthAnomalous || isElaAnomalous || isBorderAnomalous;

    // Highlight Coordinates: set to block with max ELA when tampered, omitted when not anomalous
    let highlightCoordinates: { x: number; y: number; width: number; height: number } | undefined = undefined;
    if (isTampered && maxBlock.meanDiff > 0.3) {
      highlightCoordinates = {
        x: maxBlock.x,
        y: maxBlock.y,
        width: maxBlock.width,
        height: maxBlock.height
      };
    }

    return {
      isTampered,
      elaRatio,
      elaVarianceRatio,
      warmthDiff,
      borderAnomalyScore,
      highlightCoordinates,
      approximatePortraitRegion: photoBox
    };
  }

  private static getGenuineResult(measurements: OpticalMeasurements): TamperingResult {
    const isElaFlagged = (measurements.elaRatio > 1.60 || measurements.elaRatio < 0.55) && measurements.isTampered;
    const isWarmthFlagged = measurements.warmthDiff > 0.22;
    const isBorderFlagged = measurements.borderAnomalyScore > 25.0;

    const elaScore = isElaFlagged
      ? Math.min(95, Math.max(65, Math.round(measurements.elaRatio * 35)))
      : Math.max(4, Math.min(45, Math.round(Math.abs(measurements.elaRatio - 1.0) * 40)));

    const warmthScore = isWarmthFlagged
      ? Math.min(95, Math.max(65, Math.round(measurements.warmthDiff * 250)))
      : Math.max(4, Math.min(40, Math.round(Math.max(0, measurements.warmthDiff) * 150)));

    const borderScore = isBorderFlagged
      ? Math.min(95, Math.max(65, Math.round(measurements.borderAnomalyScore * 2.5)))
      : Math.max(4, Math.min(40, Math.round(measurements.borderAnomalyScore)));

    const indicators: TamperingIndicator[] = [
      {
        name: 'Compression Artifact Uniformity (Error Level Analysis)',
        category: 'COMPRESSION_ANOMALY',
        severity: isElaFlagged ? 'HIGH' : 'LOW',
        description: isElaFlagged
          ? `Discontinuous quantization error: Portrait-to-substrate ELA variance ratio is ${measurements.elaRatio} (Threshold: 1.60).`
          : `Homogeneous compression level: Portrait-to-substrate ELA ratio is ${measurements.elaRatio} (within tolerance 0.55–1.60).`,
        detected: isElaFlagged,
        score: elaScore,
        value: measurements.elaRatio,
        threshold: 1.60,
        evaluated: true
      },
      {
        name: 'Color Space & Lighting Consistency',
        category: 'COLOR_TEMPERATURE',
        severity: isWarmthFlagged ? 'HIGH' : 'LOW',
        description: isWarmthFlagged
          ? `Ambient color temperature mismatch: R/B warmth differential is +${measurements.warmthDiff} (Threshold: 0.22).`
          : `Uniform illumination profile: R/B warmth differential is ${measurements.warmthDiff >= 0 ? '+' : ''}${measurements.warmthDiff} (Threshold: 0.22).`,
        detected: isWarmthFlagged,
        score: warmthScore,
        value: measurements.warmthDiff,
        threshold: 0.22,
        evaluated: true
      },
      {
        name: 'Portrait Boundary Edge Gradient Transition',
        category: 'PHOTO_BORDER',
        severity: isBorderFlagged ? 'HIGH' : 'LOW',
        description: isBorderFlagged
          ? `Boundary gradient splice anomaly: Edge transition variance score is ${measurements.borderAnomalyScore} (Threshold: 25.0).`
          : `Continuous guilloche margin: Edge transition variance score is ${measurements.borderAnomalyScore} (Threshold: 25.0).`,
        detected: isBorderFlagged,
        score: borderScore,
        value: measurements.borderAnomalyScore,
        threshold: 25.0,
        evaluated: true
      }
    ];

    const avgAnomaly = (elaScore + warmthScore + borderScore) / 3;
    const confidence = Number((98.5 - Math.min(22, avgAnomaly * 0.4)).toFixed(1));

    return {
      status: 'PASSED',
      detected: false,
      confidence,
      type: 'NONE',
      indicators,
      summary: 'No significant document manipulation or photo tampering detected across optical and compression forensics.',
      highlightCoordinates: measurements.highlightCoordinates,
      approximatePortraitRegion: measurements.approximatePortraitRegion
    };
  }

  private static getPhotoReplacementResult(measurements: OpticalMeasurements): TamperingResult {
    const isElaFlagged = measurements.elaRatio > 1.60 || measurements.elaRatio < 0.55;
    const isWarmthFlagged = measurements.warmthDiff > 0.22;
    const isBorderFlagged = measurements.borderAnomalyScore > 25.0;

    const elaScore = isElaFlagged
      ? Math.min(95, Math.max(68, Math.round(measurements.elaRatio * 38)))
      : Math.max(10, Math.min(45, Math.round(Math.abs(measurements.elaRatio - 1.0) * 40)));

    const warmthScore = isWarmthFlagged
      ? Math.min(96, Math.max(72, Math.round(measurements.warmthDiff * 250)))
      : Math.max(8, Math.min(40, Math.round(Math.max(0, measurements.warmthDiff) * 150)));

    const borderScore = isBorderFlagged
      ? Math.min(95, Math.max(70, Math.round(measurements.borderAnomalyScore * 2.5)))
      : Math.max(8, Math.min(40, Math.round(measurements.borderAnomalyScore)));

    const indicators: TamperingIndicator[] = [
      {
        name: 'Compression Artifact Uniformity (Error Level Analysis)',
        category: 'COMPRESSION_ANOMALY',
        severity: isElaFlagged ? 'HIGH' : 'LOW',
        description: isElaFlagged
          ? `Discontinuous quantization error: Portrait-to-substrate ELA variance ratio is ${measurements.elaRatio} (Threshold: 1.60).`
          : `Homogeneous compression level: Portrait-to-substrate ELA ratio is ${measurements.elaRatio} (within tolerance 0.55–1.60).`,
        detected: isElaFlagged,
        score: elaScore,
        value: measurements.elaRatio,
        threshold: 1.60,
        evaluated: true
      },
      {
        name: 'Color Space & Lighting Consistency',
        category: 'COLOR_TEMPERATURE',
        severity: isWarmthFlagged ? 'HIGH' : 'LOW',
        description: isWarmthFlagged
          ? `Ambient color temperature mismatch: R/B warmth differential is +${measurements.warmthDiff} (Threshold: 0.22).`
          : `Uniform illumination profile: R/B warmth differential is ${measurements.warmthDiff >= 0 ? '+' : ''}${measurements.warmthDiff} (Threshold: 0.22).`,
        detected: isWarmthFlagged,
        score: warmthScore,
        value: measurements.warmthDiff,
        threshold: 0.22,
        evaluated: true
      },
      {
        name: 'Portrait Boundary Edge Gradient Transition',
        category: 'PHOTO_BORDER',
        severity: isBorderFlagged ? 'HIGH' : 'LOW',
        description: isBorderFlagged
          ? `Boundary gradient splice anomaly: Edge transition variance score is ${measurements.borderAnomalyScore} (Threshold: 25.0).`
          : `Continuous guilloche margin: Edge transition variance score is ${measurements.borderAnomalyScore} (Threshold: 25.0).`,
        detected: isBorderFlagged,
        score: borderScore,
        value: measurements.borderAnomalyScore,
        threshold: 25.0,
        evaluated: true
      }
    ];

    const maxScore = Math.max(elaScore, warmthScore, borderScore);
    const confidence = Number((78.0 + Math.min(19, maxScore * 0.2)).toFixed(1));

    return {
      status: 'FAILED',
      detected: true,
      confidence,
      type: 'PHOTO_REPLACEMENT',
      indicators,
      summary: '🚨 Possible photo replacement detected. Optical forensic measurements indicate localized portrait substitution.',
      highlightCoordinates: measurements.highlightCoordinates,
      approximatePortraitRegion: measurements.approximatePortraitRegion
    };
  }
}
