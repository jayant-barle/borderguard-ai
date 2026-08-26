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

  /**
   * Validate MRZ lines and calculate mathematical check digits dynamically
   */
  public static validate(
    scenario: DemoScenario,
    ocrData: OCRResult,
    customMRZLines?: string[]
  ): MRZResult {
    const availableMRZ = (customMRZLines && customMRZLines.length >= 2)
      ? customMRZLines
      : (ocrData.mrzLines && ocrData.mrzLines.length >= 2 ? ocrData.mrzLines : undefined);

    const docNum = (ocrData.fields.documentNumber?.value || 'P94821037').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const country = (ocrData.fields.countryCode?.value || 'IND').toUpperCase().slice(0, 3);
    const fullName = (ocrData.fields.fullName?.value || 'ANANYA VERMA').toUpperCase();
    const gender = (ocrData.fields.gender?.value || 'F').toUpperCase().slice(0, 1);

    // Format DOB to YYMMDD
    const rawDob = ocrData.fields.dateOfBirth?.value || '1994-06-18';
    const dobMatch = rawDob.replace(/-/g, '').slice(-6); // e.g. 940618
    const dobYYMMDD = dobMatch.length === 6 ? dobMatch : '940618';

    // Format Expiry to YYMMDD
    const rawExp = ocrData.fields.expiryDate?.value || '2031-04-11';
    const expMatch = rawExp.replace(/-/g, '').slice(-6); // e.g. 310411
    const expYYMMDD = expMatch.length === 6 ? expMatch : '310411';

    let mrzLines: string[];
    let parsedMRZDocNum = docNum;
    let parsedMRZCountry = country;
    let parsedMRZDob = dobYYMMDD;
    let parsedMRZGender = gender;
    let parsedMRZExp = expYYMMDD;

    let expectedDocCheck = '';
    let computedDocCheck = '';
    let expectedDobCheck = '';
    let computedDobCheck = '';
    let expectedExpCheck = '';
    let computedExpCheck = '';
    let expectedCompCheck = '';
    let computedCompCheck = '';

    if (availableMRZ && availableMRZ.length >= 2) {
      // Clean and pad MRZ lines
      const l1 = availableMRZ[0].replace(/[^A-Z0-9<]/g, '').padEnd(44, '<').slice(0, 44);
      const l2 = availableMRZ[1].replace(/[^A-Z0-9<]/g, '').padEnd(44, '<').slice(0, 44);
      mrzLines = [l1, l2];

      // Parse TD3 line 2
      parsedMRZDocNum = l2.slice(0, 9).replace(/</g, '');
      expectedDocCheck = l2.slice(9, 10);
      computedDocCheck = this.calculateCheckDigit(l2.slice(0, 9)).toString();

      parsedMRZCountry = l2.slice(10, 13).replace(/</g, '');
      parsedMRZDob = l2.slice(13, 19);
      expectedDobCheck = l2.slice(19, 20);
      computedDobCheck = this.calculateCheckDigit(parsedMRZDob).toString();

      parsedMRZGender = l2.slice(20, 21).replace(/</g, 'F');
      parsedMRZExp = l2.slice(21, 27);
      expectedExpCheck = l2.slice(27, 28);
      computedExpCheck = this.calculateCheckDigit(parsedMRZExp).toString();

      // Composite data block check
      const compositeCore = l2.slice(0, 10) + l2.slice(13, 20) + l2.slice(21, 43);
      computedCompCheck = this.calculateCheckDigit(compositeCore).toString();
      expectedCompCheck = l2.slice(43, 44).replace(/</g, computedCompCheck);
    } else {
      // Construct Standard ICAO TD3 MRZ lines (44 characters each)
      computedDocCheck = this.calculateCheckDigit(docNum).toString();
      expectedDocCheck = computedDocCheck;

      computedDobCheck = this.calculateCheckDigit(dobYYMMDD).toString();
      expectedDobCheck = computedDobCheck;

      computedExpCheck = this.calculateCheckDigit(expYYMMDD).toString();
      expectedExpCheck = computedExpCheck;

      const nameParts = fullName.split(/\s+/);
      const surname = nameParts.length > 1 ? nameParts[nameParts.length - 1] : nameParts[0];
      const givenNames = nameParts.length > 1 ? nameParts.slice(0, -1).join('<') : '';

      let line1 = `P<${country}${surname}<<${givenNames}`;
      line1 = (line1 + '<'.repeat(44)).slice(0, 44);

      const line2Data = `${docNum}${computedDocCheck}${country}${dobYYMMDD}${computedDobCheck}${gender}${expYYMMDD}${computedExpCheck}`;
      const compositeCore = (line2Data + '<'.repeat(42)).slice(0, 42);
      computedCompCheck = this.calculateCheckDigit(compositeCore).toString();
      expectedCompCheck = computedCompCheck;
      const line2 = (compositeCore + computedCompCheck + '<').slice(0, 44);

      mrzLines = [line1, line2];
    }

    const docValid = expectedDocCheck === computedDocCheck;
    const dobValid = expectedDobCheck === computedDobCheck;
    const expValid = expectedExpCheck === computedExpCheck;
    const compValid = expectedCompCheck === computedCompCheck || expectedCompCheck === '<';

    const checksums: MRZChecksum[] = [
      {
        name: 'Document Number Checksum',
        field: `Doc No: ${parsedMRZDocNum}`,
        expected: expectedDocCheck,
        computed: computedDocCheck,
        valid: docValid
      },
      {
        name: 'Date of Birth Checksum',
        field: `DOB: ${parsedMRZDob} (${rawDob})`,
        expected: expectedDobCheck,
        computed: computedDobCheck,
        valid: dobValid
      },
      {
        name: 'Expiry Date Checksum',
        field: `Expiry: ${parsedMRZExp} (${rawExp})`,
        expected: expectedExpCheck,
        computed: computedExpCheck,
        valid: expValid
      },
      {
        name: 'Composite MRZ Checksum',
        field: 'Overall MRZ Data Block',
        expected: expectedCompCheck,
        computed: computedCompCheck,
        valid: compValid
      }
    ];

    const fieldMatches: MRZFieldMatch[] = [
      {
        field: 'Passport Number',
        ocrValue: ocrData.fields.documentNumber?.value || docNum,
        mrzValue: parsedMRZDocNum || docNum,
        matches: (ocrData.fields.documentNumber?.value || '').replace(/[^A-Z0-9]/g, '') === parsedMRZDocNum
      },
      {
        field: 'Issuing Country',
        ocrValue: country,
        mrzValue: parsedMRZCountry || country,
        matches: country === parsedMRZCountry
      },
      {
        field: 'Gender',
        ocrValue: gender,
        mrzValue: parsedMRZGender || gender,
        matches: gender === parsedMRZGender
      },
      {
        field: 'Date of Birth',
        ocrValue: rawDob,
        mrzValue: parsedMRZDob,
        matches: dobMatch === parsedMRZDob
      },
      {
        field: 'Expiry Date',
        ocrValue: rawExp,
        mrzValue: parsedMRZExp,
        matches: expMatch === parsedMRZExp
      }
    ];

    const allValid = checksums.every((c) => c.valid) && fieldMatches.every((f) => f.matches);

    return {
      detected: true,
      format: 'TD3 (Passport)',
      mrzLines,
      documentType: 'Passport (P)',
      issuingState: `${country} (${country === 'IND' ? 'India' : country})`,
      documentNumber: parsedMRZDocNum || docNum,
      nationality: country,
      dateOfBirth: rawDob,
      gender: parsedMRZGender || gender,
      expiryDate: rawExp,
      checksums,
      fieldMatches,
      overallStatus: allValid ? 'PASSED' : 'FAILED'
    };
  }
}
