import { FaceVerificationResult } from '../../../shared/types';
import { DemoScenario } from './DemoScenarioService';

export class FaceVerificationService {
  public static verify(
    buffer: Buffer,
    scenario: DemoScenario,
    databasePhotoUrl?: string
  ): FaceVerificationResult {
    if (scenario === 'GENUINE_PASSPORT') {
      return {
        consistency: 'LIKELY_MATCH',
        similarityScore: 94.8,
        confidence: 98.2,
        extractedFaceUrl: '/assets/specimens/extracted_face_genuine.png',
        databaseFaceUrl: databasePhotoUrl || '/assets/specimens/reference_ananya_verma.png',
        landmarksMatch: true,
        expressionNeutrality: 98.5,
        pitchYawRoll: { pitch: 1.2, yaw: -0.8, roll: 0.4 },
        summary: 'Facial biometric profile is highly consistent with central database reference. Likely match (94.8% similarity).'
      };
    }

    if (scenario === 'PHOTO_REPLACEMENT') {
      return {
        consistency: 'POSSIBLE_MISMATCH',
        similarityScore: 43.2,
        confidence: 95.0,
        extractedFaceUrl: '/assets/specimens/extracted_face_tampered.png',
        databaseFaceUrl: databasePhotoUrl || '/assets/specimens/reference_ananya_verma.png',
        landmarksMatch: false,
        expressionNeutrality: 92.0,
        pitchYawRoll: { pitch: 4.1, yaw: -6.3, roll: 2.1 },
        summary: '⚠ Biometric face verification indicates significant facial mismatch against registered identity photo (43.2% similarity).'
      };
    }

    // Fallback for custom / unknown images
    return {
      consistency: 'LIKELY_MATCH',
      similarityScore: 78.5,
      confidence: 70.0,
      landmarksMatch: true,
      expressionNeutrality: 85.0,
      pitchYawRoll: { pitch: 0.0, yaw: 0.0, roll: 0.0 },
      summary: 'Demo Mode: Generic face baseline analysis (Unregistered specimen).'
    };
  }
}
