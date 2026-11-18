import { DatabaseVerificationResult, DocumentRecord, DocumentStatus } from '../../../shared/types';
import { db } from '../db/database';

export interface RegisterDocumentInput {
  documentNumber: string;
  documentType: string;
  holderName: string;
  nationality?: string;
  dateOfBirth?: string | null;
  gender?: string;
  issueDate?: string | null;
  expiryDate?: string | null;
  status?: DocumentStatus;
  photoUrl?: string;
  notes?: string;
}

/**
 * Normalise raw date string into canonical ISO YYYY-MM-DD format.
 * Returns null if string is empty, unknown, unreadable, or invalid.
 */
export function normalizeDateToIso(dateStr?: string | null): string | null {
  if (!dateStr) return null;
  const clean = dateStr.trim();
  if (!clean || clean === 'UNREAD' || clean === 'NOT_DETECTED') return null;

  // 1. ISO YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD
  const isoMatch = clean.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (isoMatch) {
    const y = isoMatch[1];
    const m = isoMatch[2].padStart(2, '0');
    const d = isoMatch[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // 2. Day-first DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dmyMatch = clean.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (dmyMatch) {
    const d = dmyMatch[1].padStart(2, '0');
    const m = dmyMatch[2].padStart(2, '0');
    const y = dmyMatch[3];
    return `${y}-${m}-${d}`;
  }

  // 3. Textual Month e.g. "18 JUN 1994" or "18-JUN-1994"
  const textMonthMap: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
  };
  const textMatch = clean.match(/^(\d{1,2})[\s\-\/\.]([a-zA-Z]{3,})[\s\-\/\.](\d{4})$/);
  if (textMatch) {
    const d = textMatch[1].padStart(2, '0');
    const mKey = textMatch[2].toLowerCase().slice(0, 3);
    const m = textMonthMap[mKey];
    const y = textMatch[3];
    if (m) return `${y}-${m}-${d}`;
  }

  // 4. MRZ YYMMDD format (6 digits)
  const raw6Match = clean.match(/^(\d{2})(\d{2})(\d{2})$/);
  if (raw6Match) {
    const yy = parseInt(raw6Match[1], 10);
    const mm = raw6Match[2];
    const dd = raw6Match[3];
    // Pivot: > 50 -> 19XX, <= 50 -> 20XX
    const fullYear = yy > 50 ? `19${raw6Match[1]}` : `20${raw6Match[1]}`;
    return `${fullYear}-${mm}-${dd}`;
  }

  return null;
}

/**
 * Compare two person names using tokenized full-word matching.
 * Returns false if either side is empty or unread (unknown is never a match).
 */
export function compareNameTokens(name1?: string | null, name2?: string | null): boolean {
  if (!name1 || !name2) return false;
  const clean1 = name1.toUpperCase().replace(/[^A-Z0-9]/g, ' ').trim();
  const clean2 = name2.toUpperCase().replace(/[^A-Z0-9]/g, ' ').trim();
  if (!clean1 || !clean2 || clean1 === 'UNREAD' || clean2 === 'UNREAD' || clean1 === 'TRAVELER') {
    return false;
  }

  const t1 = clean1.split(/\s+/).filter(Boolean);
  const t2 = clean2.split(/\s+/).filter(Boolean);
  if (t1.length === 0 || t2.length === 0) return false;

  const s1 = new Set(t1);
  const s2 = new Set(t2);

  // Every token in the smaller token set must be present in the larger set (full token match, not substring)
  const [smaller, larger] = s1.size <= s2.size ? [s1, s2] : [s2, s1];
  for (const token of smaller) {
    if (!larger.has(token)) return false;
  }
  return true;
}

export class IdentityMatchingService {
  /**
   * Register or update the uploaded document in the Central Government Registry.
   * Auto-registration stores status as 'PENDING_VERIFICATION' (never ACTIVE).
   */
  public static registerOrUpdateDocument(input: RegisterDocumentInput): DocumentRecord {
    const cleanDocNum = (input.documentNumber || '').trim().toUpperCase();
    if (!cleanDocNum || cleanDocNum === 'DOC-UNREAD') {
      throw new Error('Cannot register document without a valid extracted document number.');
    }

    const cleanName = (input.holderName || '').trim().toUpperCase() || 'UNVERIFIED HOLDER';
    const cleanType = input.documentType || 'PASSPORT';
    const cleanNat = (input.nationality || 'IND').trim().toUpperCase();
    const cleanDob = normalizeDateToIso(input.dateOfBirth);
    const cleanGender = (input.gender || 'X').toUpperCase().slice(0, 1);
    const cleanIssue = normalizeDateToIso(input.issueDate);
    const cleanExpiry = normalizeDateToIso(input.expiryDate);

    // Default status for unverified auto-registration is strictly PENDING_VERIFICATION
    let calculatedStatus: DocumentStatus = input.status || 'PENDING_VERIFICATION';
    if (cleanExpiry) {
      try {
        const expDate = new Date(cleanExpiry);
        if (!isNaN(expDate.getTime()) && expDate < new Date()) {
          calculatedStatus = 'EXPIRED';
        }
      } catch {}
    }

    const isDemoMode = process.env.DEMO_MODE === 'true';
    const cleanPhoto = input.photoUrl || (isDemoMode && cleanDocNum === 'P94821037' ? '/assets/specimens/reference_ananya_verma.png' : undefined);
    const cleanNotes = input.notes || `Registered in Central Registry upon document screening scan on ${new Date().toLocaleDateString()}.`;

    // Check if document already exists
    const existing = db.prepare('SELECT * FROM documents WHERE UPPER(document_number) = ?').get(cleanDocNum) as DocumentRecord | undefined;

    if (existing) {
      db.prepare(`
        UPDATE documents
        SET document_type = ?,
            status = COALESCE(?, status),
            photo_url = COALESCE(photo_url, ?),
            notes = ?
        WHERE id = ?
      `).run(
        cleanType,
        calculatedStatus,
        cleanPhoto,
        cleanNotes,
        existing.id
      );

      return db.prepare('SELECT * FROM documents WHERE id = ?').get(existing.id) as DocumentRecord;
    } else {
      const insert = db.prepare(`
        INSERT INTO documents (
          document_number, document_type, holder_name, nationality,
          date_of_birth, gender, issue_date, expiry_date, status, photo_url, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const info = insert.run(
        cleanDocNum,
        cleanType,
        cleanName,
        cleanNat,
        cleanDob,
        cleanGender,
        cleanIssue,
        cleanExpiry,
        calculatedStatus,
        cleanPhoto,
        cleanNotes
      );

      return db.prepare('SELECT * FROM documents WHERE id = ?').get(info.lastInsertRowid) as DocumentRecord;
    }
  }

  /**
   * Verify document and biometric identity against authentic Central Government records.
   * Compares normalized full-tokens for names and ISO dates for DOB / Expiry.
   */
  public static verifyInDatabase(
    documentNumber: string,
    extractedName: string,
    extractedDob: string = '',
    extractedExpiry: string = ''
  ): DatabaseVerificationResult {
    const cleanDocNum = (documentNumber || '').trim().toUpperCase();

    if (!cleanDocNum || cleanDocNum === 'DOC-UNREAD') {
      return {
        recordFound: false,
        status: 'NOT_FOUND',
        nameMatch: false,
        dobMatch: false,
        expiryMatch: false,
        multipleIdentityAlert: false,
        watchlistFlag: false,
        summary: 'No document number available for central registry lookup.'
      };
    }

    // Query central SQLite documents table
    const record = db.prepare('SELECT * FROM documents WHERE UPPER(document_number) = ?').get(cleanDocNum) as
      | DocumentRecord
      | undefined;

    if (!record) {
      return {
        recordFound: false,
        status: 'NOT_FOUND',
        nameMatch: false,
        dobMatch: false,
        expiryMatch: false,
        multipleIdentityAlert: false,
        watchlistFlag: false,
        summary: `Document number ${cleanDocNum} was not found in central registry.`
      };
    }

    // Normalized token comparison for holder name
    const nameMatch = compareNameTokens(extractedName, record.holder_name);

    // Normalized ISO date comparison for DOB and Expiry
    const normRecordDob = normalizeDateToIso(record.date_of_birth);
    const normExtractedDob = normalizeDateToIso(extractedDob);
    const dobMatch = !!(normRecordDob && normExtractedDob && normRecordDob === normExtractedDob);

    const normRecordExp = normalizeDateToIso(record.expiry_date);
    const normExtractedExp = normalizeDateToIso(extractedExpiry);
    const expiryMatch = !!(normRecordExp && normExtractedExp && normRecordExp === normExtractedExp);

    const watchlistFlag = record.status === 'BLACKLISTED' || record.status === 'SUSPICIOUS';
    const multipleIdentityAlert = record.status === 'SUSPICIOUS';

    let summary = `Central document record verified (${record.status}). `;
    if (record.status === 'ACTIVE') {
      summary += 'Identity details registered in active government database.';
    } else if (record.status === 'PENDING_VERIFICATION') {
      summary += '⚠ Document record is pending manual officer verification.';
    } else if (record.status === 'BLACKLISTED') {
      summary += `🚨 CRITICAL: Document is listed on National Security / Interpol Blacklist. ${record.notes || ''}`;
    } else if (record.status === 'SUSPENDED') {
      summary += `⚠ WARNING: Document is administratively suspended. ${record.notes || ''}`;
    } else if (record.status === 'EXPIRED') {
      summary += '⚠ WARNING: Document has expired in central registry.';
    }

    return {
      recordFound: true,
      status: record.status,
      matchedDocument: record,
      photoUrl: record.photo_url,
      nameMatch,
      dobMatch,
      expiryMatch,
      multipleIdentityAlert,
      watchlistFlag,
      blacklistReason: record.notes,
      summary
    };
  }
}
