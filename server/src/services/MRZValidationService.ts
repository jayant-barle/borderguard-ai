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
   * Utility helper to extract YYMMDD string from various date formats
   */
  public static extractYYMMDD(dateStr?: string | null): string | null {
    if (!dateStr) return null;
    const clean = dateStr.trim();
    // YYYY-MM-DD
    const isoMatch = clean.match(/^(\d{4})[-/.](\d{2})[-/.](\d{2})$/);
    if (isoMatch) {
      return `${isoMatch[1].slice(-2)}${isoMatch[2]}${isoMatch[3]}`;
    }
    // DD/MM/YYYY
    const dmyMatch = clean.match(/^(\d{2})[-/.](\d{2})[-/.](\d{4})$/);
    if (dmyMatch) {
      return `${dmyMatch[3].slice(-2)}${dmyMatch[2]}${dmyMatch[1]}`;
    }
    // YYMMDD (6 digits)
    const raw6 = clean.replace(/[^0-9]/g, '');
    if (raw6.length === 6) {
      return raw6;
    }
    return null;
  }

  /**
   * Separate helper to synthesize TD3 lines for display or fixtures ONLY.
   * NEVER used as a fallback for validation decisions.
   */
  public static synthesizeTD3Lines(
    country: string,
    fullName: string,
    docNumber: string,
    dobYYMMDD: string,
    gender: string,
    expYYMMDD: string
  ): [string, string] {
    const cleanCountry = (country || 'IND').toUpperCase().padEnd(3, '<').slice(0, 3);
    const names = (fullName || 'TRAVELER').toUpperCase().replace(/[^A-Z\s]/g, '').trim().split(/\s+/);
    const surname = names.length > 1 ? names[names.length - 1] : names[0];
    const given = names.length > 1 ? names.slice(0, -1).join('<') : '';

    let l1 = `P<${cleanCountry}${surname}<<${given}`;
    l1 = (l1 + '<'.repeat(44)).slice(0, 44);

    // Document number in TD3 Line 2 is strictly positions 0-8 (9 chars padded with '<')
    const cleanDoc = (docNumber || 'DOC000000').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const docField = cleanDoc.slice(0, 9).padEnd(9, '<');
    const docCheck = this.calculateCheckDigit(docField).toString();

    const cleanDob = (dobYYMMDD || '900101').replace(/[^0-9]/g, '').padEnd(6, '0').slice(0, 6);
    const dobCheck = this.calculateCheckDigit(cleanDob).toString();

    const cleanSex = (gender || 'X').toUpperCase().slice(0, 1);
    const sexChar = (cleanSex === 'M' || cleanSex === 'F') ? cleanSex : '<';

    const cleanExp = (expYYMMDD || '320101').replace(/[^0-9]/g, '').padEnd(6, '0').slice(0, 6);
    const expCheck = this.calculateCheckDigit(cleanExp).toString();

    // Optional data: positions 28-41 (14 chars)
    // If doc number was > 9 chars, the overflow goes here
    const overflowDoc = cleanDoc.length > 9 ? cleanDoc.slice(9) : '';
    const optionalData = (overflowDoc + '<'.repeat(14)).slice(0, 14);
    const optCheck = this.calculateCheckDigit(optionalData).toString();

    // Composite core (39 chars): positions 0-9 (10 chars) + 13-19 (7 chars) + 21-42 (22 chars)
    const compositeCore = `${docField}${docCheck}${cleanDob}${dobCheck}${cleanExp}${expCheck}${optionalData}${optCheck}`;
    const compCheck = this.calculateCheckDigit(compositeCore).toString();

    const l2 = `${docField}${docCheck}${cleanCountry}${cleanDob}${dobCheck}${sexChar}${cleanExp}${expCheck}${optionalData}${optCheck}${compCheck}`;

    return [l1, l2];
  }

  /**
   * Validate MRZ lines and calculate mathematical check digits dynamically.
   * Fails closed with WARNING if MRZ is not machine-readable.
   * Only returns PASSED when all check digits and field matches are verified on actual MRZ text.
   */
  public static validate(
    scenario: DemoScenario,
    ocrData: OCRResult,
    customMRZLines?: string[]
  ): MRZResult {
    const availableMRZ = (customMRZLines && customMRZLines.length >= 2)
      ? customMRZLines
      : (ocrData.mrzLines && ocrData.mrzLines.length >= 2 ? ocrData.mrzLines : undefined);

    // 1. If fewer than 2 MRZ lines are read, fail closed with WARNING:
    if (!availableMRZ || availableMRZ.length < 2) {
      return {
        detected: false,
        format: 'UNKNOWN',
        mrzLines: [],
        documentType: 'Passport (P)',
        issuingState: ocrData.fields.countryCode?.value || 'UNKNOWN',
        documentNumber: ocrData.fields.documentNumber?.value || '',
        nationality: ocrData.fields.nationality?.value || '',
        dateOfBirth: ocrData.fields.dateOfBirth?.value || '',
        gender: ocrData.fields.gender?.value || 'X',
        expiryDate: ocrData.fields.expiryDate?.value || '',
        checksums: [
          {
            name: 'Document Number Checksum',
            field: ocrData.fields.documentNumber?.value ? `Doc No: ${ocrData.fields.documentNumber.value}` : 'Doc No: Not Extracted',
            expected: null,
            computed: null,
            valid: false
          },
          {
            name: 'Date of Birth Checksum',
            field: ocrData.fields.dateOfBirth?.value ? `DOB: ${ocrData.fields.dateOfBirth.value}` : 'DOB: Not Extracted',
            expected: null,
            computed: null,
            valid: false
          },
          {
            name: 'Expiry Date Checksum',
            field: ocrData.fields.expiryDate?.value ? `Expiry: ${ocrData.fields.expiryDate.value}` : 'Expiry: Not Extracted',
            expected: null,
            computed: null,
            valid: false
          },
          {
            name: 'Composite MRZ Checksum',
            field: 'Overall MRZ Data Block',
            expected: null,
            computed: null,
            valid: false
          }
        ],
        fieldMatches: [
          {
            field: 'Passport Number',
            ocrValue: ocrData.fields.documentNumber?.value || '',
            mrzValue: 'UNREAD',
            matches: false
          },
          {
            field: 'Issuing Country',
            ocrValue: ocrData.fields.countryCode?.value || '',
            mrzValue: 'UNREAD',
            matches: false
          },
          {
            field: 'Gender',
            ocrValue: ocrData.fields.gender?.value || '',
            mrzValue: 'UNREAD',
            matches: false
          },
          {
            field: 'Date of Birth',
            ocrValue: ocrData.fields.dateOfBirth?.value || '',
            mrzValue: 'UNREAD',
            matches: false
          },
          {
            field: 'Expiry Date',
            ocrValue: ocrData.fields.expiryDate?.value || '',
            mrzValue: 'UNREAD',
            matches: false
          }
        ],
        overallStatus: 'WARNING'
      };
    }

    // 2. We have at least 2 MRZ lines -> Parse TD3 lines strictly by ICAO Doc 9303 Part 3
    const l1 = availableMRZ[0].replace(/[^A-Z0-9<]/g, '').padEnd(44, '<').slice(0, 44);
    const l2 = availableMRZ[1].replace(/[^A-Z0-9<]/g, '').padEnd(44, '<').slice(0, 44);
    const mrzLines = [l1, l2];

    // TD3 Line 2 exact positions:
    // 0-8: Document number (9 chars)
    const rawDocNum = l2.slice(0, 9);
    const parsedMRZDocNum = rawDocNum.replace(/</g, '');
    const expectedDocCheck = l2.slice(9, 10);
    const computedDocCheck = this.calculateCheckDigit(rawDocNum).toString();

    // 10-12: Nationality (3 chars)
    const parsedMRZCountry = l2.slice(10, 13).replace(/</g, '');

    // 13-18: Date of birth YYMMDD (6 chars)
    const parsedMRZDob = l2.slice(13, 19);
    const expectedDobCheck = l2.slice(19, 20);
    const computedDobCheck = this.calculateCheckDigit(parsedMRZDob).toString();

    // 20: Sex (1 char) - '<' maps to 'X' (unspecified), not 'F'
    const rawSex = l2.slice(20, 21);
    const parsedMRZGender = (rawSex === 'M' || rawSex === 'F') ? rawSex : 'X';

    // 21-26: Expiry date YYMMDD (6 chars)
    const parsedMRZExp = l2.slice(21, 27);
    const expectedExpCheck = l2.slice(27, 28);
    const computedExpCheck = this.calculateCheckDigit(parsedMRZExp).toString();

    // 28-41: Optional data (14 chars)
    const optionalData = l2.slice(28, 42);

    // 43: Composite check digit (1 char)
    // Checks positions 0-9 (10 chars), 13-19 (7 chars), 21-42 (22 chars) = 39 chars
    const compositeCore = l2.slice(0, 10) + l2.slice(13, 20) + l2.slice(21, 43);
    const computedCompCheck = this.calculateCheckDigit(compositeCore).toString();
    const expectedCompCheck = l2.slice(43, 44);

    // Validation rules:
    // A check digit character that is not 0-9 -> FAILS (valid: false)
    const isDigit = (c: string) => /^[0-9]$/.test(c);

    const docValid = isDigit(expectedDocCheck) && expectedDocCheck === computedDocCheck;
    const dobValid = isDigit(expectedDobCheck) && expectedDobCheck === computedDobCheck;
    const expValid = isDigit(expectedExpCheck) && expectedExpCheck === computedExpCheck;
    // Composite: must be a valid digit and match computed; NEVER accept '<'
    const compValid = isDigit(expectedCompCheck) && expectedCompCheck === computedCompCheck;

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
        field: `DOB: ${parsedMRZDob}`,
        expected: expectedDobCheck,
        computed: computedDobCheck,
        valid: dobValid
      },
      {
        name: 'Expiry Date Checksum',
        field: `Expiry: ${parsedMRZExp}`,
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

    // Field matches against OCR
    const ocrDoc = (ocrData.fields.documentNumber?.value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    const docMatches = !!(ocrDoc && parsedMRZDocNum && (ocrDoc === parsedMRZDocNum || ocrDoc.startsWith(parsedMRZDocNum)));

    const ocrCountry = (ocrData.fields.countryCode?.value || '').trim().toUpperCase();
    const countryMatches = !!(ocrCountry && parsedMRZCountry && ocrCountry === parsedMRZCountry);

    const ocrGender = (ocrData.fields.gender?.value || '').trim().toUpperCase().slice(0, 1);
    const genderMatches = !!(ocrGender && parsedMRZGender && (ocrGender === parsedMRZGender || (ocrGender !== 'M' && ocrGender !== 'F' && parsedMRZGender === 'X')));

    const ocrDobYYMMDD = this.extractYYMMDD(ocrData.fields.dateOfBirth?.value);
    const dobMatches = !!(ocrDobYYMMDD && parsedMRZDob && ocrDobYYMMDD === parsedMRZDob);

    const ocrExpYYMMDD = this.extractYYMMDD(ocrData.fields.expiryDate?.value);
    const expMatches = !!(ocrExpYYMMDD && parsedMRZExp && ocrExpYYMMDD === parsedMRZExp);

    const fieldMatches: MRZFieldMatch[] = [
      {
        field: 'Passport Number',
        ocrValue: ocrData.fields.documentNumber?.value || '',
        mrzValue: parsedMRZDocNum,
        matches: docMatches
      },
      {
        field: 'Issuing Country',
        ocrValue: ocrCountry,
        mrzValue: parsedMRZCountry,
        matches: countryMatches
      },
      {
        field: 'Gender',
        ocrValue: ocrGender || 'X',
        mrzValue: parsedMRZGender,
        matches: genderMatches
      },
      {
        field: 'Date of Birth',
        ocrValue: ocrData.fields.dateOfBirth?.value || '',
        mrzValue: parsedMRZDob,
        matches: dobMatches
      },
      {
        field: 'Expiry Date',
        ocrValue: ocrData.fields.expiryDate?.value || '',
        mrzValue: parsedMRZExp,
        matches: expMatches
      }
    ];

    const allChecksumsValid = checksums.every((c) => c.valid);
    const allFieldMatchesValid = fieldMatches.every((f) => f.matches);
    const overallStatus = (allChecksumsValid && allFieldMatchesValid) ? 'PASSED' : 'FAILED';

    return {
      detected: true,
      format: 'TD3 (Passport)',
      mrzLines,
      documentType: 'Passport (P)',
      issuingState: parsedMRZCountry || ocrCountry,
      documentNumber: parsedMRZDocNum || ocrDoc,
      nationality: parsedMRZCountry || ocrCountry,
      dateOfBirth: ocrData.fields.dateOfBirth?.value || parsedMRZDob,
      gender: parsedMRZGender,
      expiryDate: ocrData.fields.expiryDate?.value || parsedMRZExp,
      optionalData: optionalData.replace(/</g, '') || undefined,
      checksums,
      fieldMatches,
      overallStatus
    };
  }
}
