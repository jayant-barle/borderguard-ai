import { MRZResult, MRZChecksum, MRZFieldMatch, OCRResult } from '../../../shared/types';
import { DemoScenario } from './DemoScenarioService';

export class MRZValidationService {
  /**
   * ICAO 9303 Check Digit Calculator
   * Character weights: 7, 3, 1, 7, 3, 1, ...
   * Digits 0-9 = 0-9, Letters A-Z = 10-35, '<' = 0
   */
  public static calculateCheckDigit(str: string): number {
    const weights = [7, 3, 1];
    let sum = 0;

    for (let i = 0; i < str.length; i++) {
      const char = str[i].toUpperCase();
      let value = 0;

      if (char >= '0' && char <= '9') {
        value = parseInt(char, 10);
      } else if (char >= 'A' && char <= 'Z') {
        value = char.charCodeAt(0) - 55;
      } else if (char === '<') {
        value = 0;
      }

      sum += value * weights[i % 3];
    }

    return sum % 10;
  }

  public static validate(
    scenario: DemoScenario,
    ocrData: OCRResult,
    customMRZLines?: string[]
  ): MRZResult {
    if (scenario === 'GENUINE_PASSPORT' || scenario === 'PHOTO_REPLACEMENT') {
      const docNum = 'P94821037';
      const docNumCheckComputed = this.calculateCheckDigit(docNum).toString(); // '5'

      const dob = '940618';
      const dobCheckComputed = this.calculateCheckDigit(dob).toString(); // '8'

      const expiry = '310411';
      const expiryCheckComputed = this.calculateCheckDigit(expiry).toString(); // '6'

      // Composite string in TD3 line 2 (chars 0 to 42, length 43)
      const compositeString = `${docNum}${docNumCheckComputed}IND${dob}${dobCheckComputed}F${expiry}${expiryCheckComputed}<<<<<<<<<<<<<<`;
      const compositeCheckComputed = this.calculateCheckDigit(compositeString).toString();

      const line1 = 'P<INDOVERMA<<ANANYA<<<<<<<<<<<<<<<<<<<<<<<<<';
      const line2 = `${docNum}${docNumCheckComputed}IND${dob}${dobCheckComputed}F${expiry}${expiryCheckComputed}<<<<<<<<<<<<<<${compositeCheckComputed}6`;

      const checksums: MRZChecksum[] = [
        {
          name: 'Document Number Checksum',
          field: `Doc No: ${docNum}`,
          expected: docNumCheckComputed,
          computed: docNumCheckComputed,
          valid: true
        },
        {
          name: 'Date of Birth Checksum',
          field: `DOB: ${dob} (18 Jun 1994)`,
          expected: dobCheckComputed,
          computed: dobCheckComputed,
          valid: true
        },
        {
          name: 'Expiry Date Checksum',
          field: `Expiry: ${expiry} (11 Apr 2031)`,
          expected: expiryCheckComputed,
          computed: expiryCheckComputed,
          valid: true
        },
        {
          name: 'Composite MRZ Checksum',
          field: 'Overall MRZ Data Block',
          expected: compositeCheckComputed,
          computed: compositeCheckComputed,
          valid: true
        }
      ];

      const fieldMatches: MRZFieldMatch[] = [
        {
          field: 'Passport Number',
          ocrValue: ocrData.fields.documentNumber.value,
          mrzValue: docNum,
          matches: ocrData.fields.documentNumber.value === docNum
        },
        {
          field: 'Nationality',
          ocrValue: 'IND',
          mrzValue: 'IND',
          matches: true
        },
        {
          field: 'Gender',
          ocrValue: ocrData.fields.gender.value,
          mrzValue: 'F',
          matches: true
        },
        {
          field: 'Date of Birth',
          ocrValue: ocrData.fields.dateOfBirth.value,
          mrzValue: '1994-06-18',
          matches: true
        },
        {
          field: 'Expiry Date',
          ocrValue: ocrData.fields.expiryDate.value,
          mrzValue: '2031-04-11',
          matches: true
        }
      ];

      const allValid = checksums.every((c) => c.valid) && fieldMatches.every((f) => f.matches);

      return {
        detected: true,
        format: 'TD3 (Passport)',
        mrzLines: [line1, line2],
        documentType: 'Passport (P)',
        issuingState: 'IND (India)',
        documentNumber: docNum,
        nationality: 'IND',
        dateOfBirth: '1994-06-18',
        gender: 'F',
        expiryDate: '2031-04-11',
        checksums,
        fieldMatches,
        overallStatus: allValid ? 'PASSED' : 'FAILED'
      };
    }

    // Fallback for custom or unknown images
    return {
      detected: false,
      format: 'UNKNOWN',
      mrzLines: ['NO MRZ DETECTED OR UNREGISTERED SPECIMEN'],
      documentType: 'UNKNOWN',
      issuingState: 'UNKNOWN',
      documentNumber: 'UNKNOWN',
      nationality: 'UNKNOWN',
      dateOfBirth: 'UNKNOWN',
      gender: 'UNKNOWN',
      expiryDate: 'UNKNOWN',
      checksums: [
        {
          name: 'MRZ Optical Detection',
          field: 'MRZ Data Zone',
          expected: 'ICAO TD3',
          computed: 'UNREGISTERED',
          valid: false
        }
      ],
      fieldMatches: [],
      overallStatus: 'WARNING'
    };
  }
}
