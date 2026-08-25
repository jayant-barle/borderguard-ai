import { TamperingResult, TamperingIndicator } from '../../../shared/types';
import { DemoScenario } from './DemoScenarioService';

export class TamperingService {
  public static analyze(buffer: Buffer, scenario: DemoScenario): TamperingResult {
    if (scenario === 'GENUINE_PASSPORT') {
      const indicators: TamperingIndicator[] = [
        {
          name: 'Photo Frame & Border Continuity',
          category: 'PHOTO_BORDER',
          severity: 'LOW',
          description: 'Smooth guilloche security background lines seamlessly cross portrait margins without truncation or feathering.',
          detected: false,
          score: 4
        },
        {
          name: 'Compression Artifact Uniformity (ELA)',
          category: 'COMPRESSION_ANOMALY',
          severity: 'LOW',
          description: 'Error Level Analysis demonstrates homogenous quantization noise across document substrate and portrait.',
          detected: false,
          score: 6
        },
        {
          name: 'Color Space & Lighting Consistency',
          category: 'COLOR_TEMPERATURE',
          severity: 'LOW',
          description: 'Illumination angle (60° diffuse) and white balance (5400K) are uniform between text substrate and portrait.',
          detected: false,
          score: 5
        },
        {
          name: 'Micro-Print & Typographic Integrity',
          category: 'FONT_CONSISTENCY',
          severity: 'LOW',
          description: 'Vector font metrics, letterform glyphs, and line baselines match official ICAO standards.',
          detected: false,
          score: 3
        },
        {
          name: 'Digital Metadata & EXIF Structure',
          category: 'METADATA',
          severity: 'LOW',
          description: 'No editing software signatures, splice markers, or layer metadata artifacts detected.',
          detected: false,
          score: 2
        }
      ];

      return {
        detected: false,
        confidence: 96.5,
        type: 'NONE',
        indicators,
        summary: 'No significant document manipulation or photo tampering detected.'
      };
    }

    if (scenario === 'PHOTO_REPLACEMENT') {
      const indicators: TamperingIndicator[] = [
        {
          name: 'Photo Boundary Splice & Feathering',
          category: 'PHOTO_BORDER',
          severity: 'HIGH',
          description: '🚨 Truncated guilloche security lines and feathering artifacts detected around 4-point portrait boundary.',
          detected: true,
          score: 89
        },
        {
          name: 'JPEG Error Level Analysis (ELA) Discontinuity',
          category: 'COMPRESSION_ANOMALY',
          severity: 'HIGH',
          description: '🚨 High-frequency compression mismatch. Portrait region exhibits distinct quantization matrix from background.',
          detected: true,
          score: 92
        },
        {
          name: 'Color Space & Lighting Inconsistency',
          category: 'COLOR_TEMPERATURE',
          severity: 'HIGH',
          description: '⚠ Ambient color temperature mismatch (Portrait: 4200K warm incandescent vs Document: 5800K daylight).',
          detected: true,
          score: 78
        },
        {
          name: 'Pixel Grid Alignment Anomaly',
          category: 'PHOTO_BORDER',
          severity: 'HIGH',
          description: '🚨 Sub-pixel interpolation grid discontinuity found along the right and lower edges of the photo holder.',
          detected: true,
          score: 85
        },
        {
          name: 'Micro-Print Security Overlay',
          category: 'FONT_CONSISTENCY',
          severity: 'MEDIUM',
          description: '⚠ Partial disruption in the continuous micro-print ribbon overlapping the passport photo margin.',
          detected: true,
          score: 65
        }
      ];

      return {
        detected: true,
        confidence: 94.2,
        type: 'PHOTO_REPLACEMENT',
        indicators,
        summary: '🚨 Possible photo replacement detected. High confidence of digital portrait insertion.',
        highlightCoordinates: {
          x: 48,
          y: 110,
          width: 240,
          height: 310
        }
      };
    }

    // Fallback for Unknown image
    const indicators: TamperingIndicator[] = [
      {
        name: 'Standard Visual Inspection',
        category: 'PHOTO_BORDER',
        severity: 'LOW',
        description: 'Demo Mode: Standard baseline inspection (Unregistered demo image).',
        detected: false,
        score: 15
      },
      {
        name: 'Compression Noise Analysis',
        category: 'COMPRESSION_ANOMALY',
        severity: 'LOW',
        description: 'Standard baseline noise distribution.',
        detected: false,
        score: 12
      }
    ];

    return {
      detected: false,
      confidence: 75.0,
      type: 'NONE',
      indicators,
      summary: 'Demo Mode: Standard visual inspection complete (No registered tampering pattern detected).'
    };
  }
}
