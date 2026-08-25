import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';

const router = Router();

// GET /api/specimens
router.get('/', (_req: Request, res: Response) => {
  const specimens = [
    {
      id: 'SCENARIO_1',
      scenario: 'GENUINE_PASSPORT',
      title: 'Specimen 1: Genuine Biometric Passport',
      badge: 'VERIFIED / LOW RISK',
      holderName: 'ANANYA VERMA',
      documentNumber: 'P94821037',
      nationality: 'IND',
      description: 'Clean biometric passport specimen. Consistent MRZ, genuine photograph, matching facial biometrics, and active government database record.',
      imageUrl: '/assets/specimens/specimen_genuine_passport.png',
      referencePhotoUrl: '/assets/specimens/reference_ananya_verma.png',
      expectedRiskLevel: 'LOW',
      expectedRiskScore: 12
    },
    {
      id: 'SCENARIO_2',
      scenario: 'PHOTO_REPLACEMENT',
      title: 'Specimen 2: Tampered Photo Replacement',
      badge: 'SUSPICIOUS / HIGH RISK',
      holderName: 'ANANYA VERMA',
      documentNumber: 'P94821037',
      nationality: 'IND',
      description: 'Identical legitimate document shell and MRZ checksums, but photograph has been digitally substituted with a different subject.',
      imageUrl: '/assets/specimens/specimen_tampered_passport.png',
      referencePhotoUrl: '/assets/specimens/reference_ananya_verma.png',
      expectedRiskLevel: 'HIGH',
      expectedRiskScore: 89
    }
  ];

  return res.json(specimens);
});

export default router;
