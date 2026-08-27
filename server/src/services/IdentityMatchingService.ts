import { DatabaseVerificationResult, DocumentRecord, DocumentStatus } from '../../../shared/types';
import { db } from '../db/database';

export interface RegisterDocumentInput {
  documentNumber: string;
  documentType: string;
  holderName: string;
  nationality?: string;
  dateOfBirth?: string;
  gender?: string;
  issueDate?: string;
  expiryDate?: string;
  status?: DocumentStatus;
  photoUrl?: string;
  notes?: string;
}

export class IdentityMatchingService {
  /**
   * Register or update the uploaded document in the Central Government Registry
   */
  public static registerOrUpdateDocument(input: RegisterDocumentInput): DocumentRecord {
    const cleanDocNum = (input.documentNumber || `DOC-${Date.now().toString().slice(-6)}`).trim().toUpperCase();
    const cleanName = (input.holderName || 'REGISTERED CITIZEN').trim().toUpperCase();
    const cleanType = input.documentType || 'PASSPORT';
    const cleanNat = (input.nationality || 'IND').trim().toUpperCase();
    const cleanDob = input.dateOfBirth || '1990-01-01';
    const cleanGender = input.gender || 'F';
    const cleanIssue = input.issueDate || new Date().toISOString().split('T')[0];
    const cleanExpiry = input.expiryDate || '2034-12-31';

    // Auto-detect expired status if expiryDate < today
    let calculatedStatus: DocumentStatus = input.status || 'ACTIVE';
    if (cleanExpiry && cleanExpiry !== 'NOT_DETECTED' && cleanExpiry !== 'UNREAD') {
      try {
        const expDate = new Date(cleanExpiry);
        if (!isNaN(expDate.getTime()) && expDate < new Date()) {
          calculatedStatus = 'EXPIRED';
        }
      } catch {}
    }

    const cleanPhoto = input.photoUrl || (cleanDocNum === 'P94821037' ? '/assets/specimens/reference_ananya_verma.png' : undefined);
    const cleanNotes = input.notes || `Registered in Central Registry upon document screening scan on ${new Date().toLocaleDateString()}.`;

    // Check if document already exists
    const existing = db.prepare('SELECT * FROM documents WHERE UPPER(document_number) = ?').get(cleanDocNum) as DocumentRecord | undefined;

    if (existing) {
      // Do not overwrite authentic government registered holder name with scanned OCR variation
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

  public static verifyInDatabase(
    documentNumber: string,
    extractedName: string,
    extractedDob: string,
    extractedExpiry: string
  ): DatabaseVerificationResult {
    const cleanDocNum = (documentNumber || '').trim().toUpperCase();

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

    const cleanExtractedName = (extractedName || '').trim().toUpperCase();
    const cleanRecordName = (record.holder_name || '').trim().toUpperCase();
    const nameMatch = cleanExtractedName.includes(cleanRecordName) || cleanRecordName.includes(cleanExtractedName);

    const dobMatch = record.date_of_birth === extractedDob;
    const expiryMatch = record.expiry_date === extractedExpiry;

    const watchlistFlag = record.status === 'BLACKLISTED' || record.status === 'SUSPICIOUS';
    const multipleIdentityAlert = record.status === 'SUSPICIOUS';

    let summary = `Central document record verified (${record.status}). `;
    if (record.status === 'ACTIVE') {
      summary += 'Identity details registered and verified in active government database.';
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

