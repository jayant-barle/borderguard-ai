import { DatabaseVerificationResult, DocumentRecord } from '../../../shared/types';
import { db } from '../db/database';

export class IdentityMatchingService {
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
      summary += 'Identity details match active government database record.';
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
