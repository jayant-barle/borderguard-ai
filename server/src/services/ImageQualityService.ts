import { ImageQualityResult } from '../../../shared/types';
import { DemoScenario } from './DemoScenarioService';

export class ImageQualityService {
  public static analyze(
    buffer: Buffer,
    scenario: DemoScenario,
    fileMeta?: { width?: number; height?: number; size?: number }
  ): ImageQualityResult {
    const sizeBytes = buffer.length;
    const isSmall = sizeBytes < 20000; // < 20KB is likely low-res/thumbnail

    // Base properties based on scenario or image buffer
    if (scenario === 'GENUINE_PASSPORT') {
      return {
        overallScore: 94,
        status: 'GOOD',
        passed: true,
        metrics: {
          resolution: {
            score: 96,
            status: 'PASS',
            label: 'Resolution (DPI & Dimensions)',
            message: '1920x1080 (300 DPI equivalent) — Exceeds ICAO optical minimums.',
            width: 1920,
            height: 1080
          },
          sharpness: {
            score: 95,
            status: 'PASS',
            label: 'Image Sharpness & Focus',
            message: 'High edge definition. Clean font contours and micro-text fidelity.'
          },
          brightness: {
            score: 92,
            status: 'PASS',
            label: 'Luminosity & Exposure',
            message: 'Uniform ambient illumination. No underexposure or shadow wash.'
          },
          contrast: {
            score: 94,
            status: 'PASS',
            label: 'Substrate Contrast',
            message: 'Optimal black-on-white and UV substrate gradient separation.'
          },
          glare: {
            score: 98,
            status: 'PASS',
            label: 'Specular Glare & Reflections',
            message: 'No specular reflection obscuring text or portrait regions.'
          }
        },
        issues: []
      };
    }

    if (scenario === 'PHOTO_REPLACEMENT') {
      return {
        overallScore: 89,
        status: 'GOOD',
        passed: true,
        metrics: {
          resolution: {
            score: 92,
            status: 'PASS',
            label: 'Resolution (DPI & Dimensions)',
            message: '1920x1080 — Sufficient for digital document inspection.',
            width: 1920,
            height: 1080
          },
          sharpness: {
            score: 88,
            status: 'PASS',
            label: 'Image Sharpness & Focus',
            message: 'Clear overall text. Localized softening observed near portrait border.'
          },
          brightness: {
            score: 90,
            status: 'PASS',
            label: 'Luminosity & Exposure',
            message: 'Even illumination across document page.'
          },
          contrast: {
            score: 91,
            status: 'PASS',
            label: 'Substrate Contrast',
            message: 'Sufficient contrast for optical character recognition.'
          },
          glare: {
            score: 95,
            status: 'PASS',
            label: 'Specular Glare & Reflections',
            message: 'No destructive glare detected on MRZ or data fields.'
          }
        },
        issues: []
      };
    }

    // Generic / Unknown image analysis
    const simulatedScore = isSmall ? 62 : 86;
    return {
      overallScore: simulatedScore,
      status: simulatedScore > 75 ? 'GOOD' : 'ACCEPTABLE',
      passed: simulatedScore >= 50,
      metrics: {
        resolution: {
          score: isSmall ? 60 : 88,
          status: isSmall ? 'WARNING' : 'PASS',
          label: 'Resolution',
          message: isSmall ? 'Low resolution image. Text extraction may have reduced accuracy.' : 'Acceptable resolution for screening.',
          width: fileMeta?.width || 1280,
          height: fileMeta?.height || 720
        },
        sharpness: {
          score: isSmall ? 65 : 85,
          status: isSmall ? 'WARNING' : 'PASS',
          label: 'Sharpness',
          message: isSmall ? 'Slight blur detected in text areas.' : 'Sharpness within standard tolerances.'
        },
        brightness: {
          score: 82,
          status: 'PASS',
          label: 'Brightness',
          message: 'Luminance levels adequate.'
        },
        contrast: {
          score: 84,
          status: 'PASS',
          label: 'Contrast',
          message: 'Text and background separation verified.'
        },
        glare: {
          score: 90,
          status: 'PASS',
          label: 'Glare Assessment',
          message: 'No critical glare detected.'
        }
      },
      issues: isSmall ? ['Low image resolution', 'Slight blur detected'] : []
    };
  }
}
