import { OCRResult } from '../../../shared/types';
import { DemoScenario } from './DemoScenarioService';

export class OCRService {
  public static extractFields(buffer: Buffer, scenario: DemoScenario, rawFileName?: string): OCRResult {
    if (scenario === 'GENUINE_PASSPORT' || scenario === 'PHOTO_REPLACEMENT') {
      // Both scenarios share the same legitimate document identity data
      return {
        confidence: 98.4,
        rawText: `REPUBLIC OF INDIA / RÉPUBLIQUE D'INDE
PASSPORT / PASSEPORT
Type: P  Country Code: IND  Passport No: P94821037
Surname: VERMA
Given Names: ANANYA
Nationality: INDIAN
Sex: F  Date of Birth: 18/06/1994
Place of Birth: NEW DELHI
Date of Issue: 12/04/2021  Date of Expiry: 11/04/2031
Place of Issue: DELHI
P<INDOVERMA<<ANANYA<<<<<<<<<<<<<<<<<<<<<<<<<
P948210375IND9406188F3104116<<<<<<<<<<<<<<06`,
        fields: {
          fullName: {
            name: 'fullName',
            label: 'Full Name',
            value: 'ANANYA VERMA',
            confidence: 99.2,
            validated: true
          },
          documentNumber: {
            name: 'documentNumber',
            label: 'Passport Number',
            value: 'P94821037',
            confidence: 99.8,
            validated: true
          },
          countryCode: {
            name: 'countryCode',
            label: 'Country Code',
            value: 'IND',
            confidence: 99.5,
            validated: true
          },
          nationality: {
            name: 'nationality',
            label: 'Nationality',
            value: 'INDIAN (IND)',
            confidence: 98.6,
            validated: true
          },
          dateOfBirth: {
            name: 'dateOfBirth',
            label: 'Date of Birth',
            value: '1994-06-18',
            confidence: 97.9,
            validated: true
          },
          gender: {
            name: 'gender',
            label: 'Gender',
            value: 'F',
            confidence: 99.0,
            validated: true
          },
          issueDate: {
            name: 'issueDate',
            label: 'Date of Issue',
            value: '2021-04-12',
            confidence: 96.5,
            validated: true
          },
          expiryDate: {
            name: 'expiryDate',
            label: 'Date of Expiry',
            value: '2031-04-11',
            confidence: 98.1,
            validated: true
          }
        }
      };
    }

    // Generic / Unregistered image OCR fallback
    return {
      confidence: 76.5,
      rawText: `UNREGISTERED SPECIMEN DOCUMENT\nDOCUMENT NO: SPEC-UNKNOWN\nDEMO MODE GENERIC EXTRACTION`,
      fields: {
        fullName: {
          name: 'fullName',
          label: 'Full Name',
          value: 'DEMO SPECIMEN TRAVELER',
          confidence: 78.0,
          validated: false
        },
        documentNumber: {
          name: 'documentNumber',
          label: 'Document Number',
          value: 'UNK-994821',
          confidence: 75.2,
          validated: false
        },
        countryCode: {
          name: 'countryCode',
          label: 'Country Code',
          value: 'UN',
          confidence: 82.0,
          validated: false
        },
        nationality: {
          name: 'nationality',
          label: 'Nationality',
          value: 'UNKNOWN',
          confidence: 71.0,
          validated: false
        },
        dateOfBirth: {
          name: 'dateOfBirth',
          label: 'Date of Birth',
          value: '1990-01-01',
          confidence: 74.0,
          validated: false
        },
        gender: {
          name: 'gender',
          label: 'Gender',
          value: 'U',
          confidence: 80.0,
          validated: false
        },
        issueDate: {
          name: 'issueDate',
          label: 'Date of Issue',
          value: '2020-01-01',
          confidence: 72.0,
          validated: false
        },
        expiryDate: {
          name: 'expiryDate',
          label: 'Date of Expiry',
          value: '2030-01-01',
          confidence: 75.0,
          validated: false
        }
      }
    };
  }
}
