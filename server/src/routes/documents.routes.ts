import { Router, Response } from 'express';
import { db } from '../db/database';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth';
import { logAuditEvent } from '../middleware/audit';
import { DocumentRecord } from '../../../shared/types';

const router = Router();

// GET /api/documents (All authenticated officers can query)
router.get('/', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const { search, status, type } = req.query;

    let query = 'SELECT * FROM documents WHERE 1=1';
    const params: any[] = [];

    if (search) {
      query += ' AND (document_number LIKE ? OR holder_name LIKE ? OR nationality LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (status && status !== 'ALL') {
      query += ' AND status = ?';
      params.push(status);
    }

    if (type && type !== 'ALL') {
      query += ' AND document_type = ?';
      params.push(type);
    }

    query += ' ORDER BY id DESC';

    const records = db.prepare(query).all(...params) as DocumentRecord[];
    return res.json(records);
  } catch (err: any) {
    console.error('Document query error:', err);
    return res.status(500).json({ error: 'Failed to retrieve document records.' });
  }
});

// POST /api/documents (Admin only)
router.post('/', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    const {
      document_number,
      document_type = 'PASSPORT',
      holder_name,
      nationality = 'IND',
      date_of_birth,
      gender = 'F',
      issue_date,
      expiry_date,
      status = 'ACTIVE',
      photo_url,
      notes
    } = req.body;

    if (!document_number || !holder_name || !date_of_birth || !expiry_date) {
      return res.status(400).json({ error: 'Required document fields missing.' });
    }

    const insert = db.prepare(`
      INSERT INTO documents (
        document_number, document_type, holder_name, nationality,
        date_of_birth, gender, issue_date, expiry_date, status, photo_url, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = insert.run(
      document_number.toUpperCase(),
      document_type,
      holder_name.toUpperCase(),
      nationality.toUpperCase(),
      date_of_birth,
      gender,
      issue_date || '2021-01-01',
      expiry_date,
      status,
      photo_url || '/assets/specimens/reference_ananya_verma.png',
      notes || ''
    );

    logAuditEvent(
      req.user!,
      'DOCUMENT_CREATED',
      'DOCUMENT',
      document_number,
      `Created document record for ${holder_name} (${document_number}) with status ${status}`,
      req.ip || '127.0.0.1'
    );

    return res.status(201).json({ success: true, id: info.lastInsertRowid, document_number });
  } catch (err: any) {
    if (err.message && err.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'A document with this document number already exists.' });
    }
    return res.status(500).json({ error: 'Failed to create document record.' });
  }
});

// PUT /api/documents/:id (Admin only)
router.put('/:id', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, notes, holder_name, nationality, expiry_date } = req.body;

    const existing = db.prepare('SELECT * FROM documents WHERE id = ?').get(id) as DocumentRecord | undefined;
    if (!existing) {
      return res.status(404).json({ error: 'Document record not found.' });
    }

    const update = db.prepare(`
      UPDATE documents
      SET status = COALESCE(?, status),
          notes = COALESCE(?, notes),
          holder_name = COALESCE(?, holder_name),
          nationality = COALESCE(?, nationality),
          expiry_date = COALESCE(?, expiry_date)
      WHERE id = ?
    `);

    update.run(status, notes, holder_name ? holder_name.toUpperCase() : null, nationality, expiry_date, id);

    logAuditEvent(
      req.user!,
      'DOCUMENT_UPDATED',
      'DOCUMENT',
      existing.document_number,
      `Updated document ${existing.document_number} — Status changed to ${status || existing.status}`,
      req.ip || '127.0.0.1'
    );

    return res.json({ success: true, message: 'Document updated successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update document.' });
  }
});

// DELETE /api/documents/:id (Admin only)
router.delete('/:id', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM documents WHERE id = ?').get(id) as DocumentRecord | undefined;
    if (!existing) {
      return res.status(404).json({ error: 'Document record not found.' });
    }

    db.prepare('DELETE FROM documents WHERE id = ?').run(id);

    logAuditEvent(
      req.user!,
      'DOCUMENT_DELETED',
      'DOCUMENT',
      existing.document_number,
      `Deleted document record ${existing.document_number} (${existing.holder_name})`,
      req.ip || '127.0.0.1'
    );

    return res.json({ success: true, message: 'Document record deleted.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to delete document.' });
  }
});

export default router;
