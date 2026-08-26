import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db/database';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth';
import { logAuditEvent } from '../middleware/audit';
import { User, AuditLog, RiskConfig } from '../../../shared/types';

const router = Router();

// Require admin for all admin routes
router.use(authenticateToken);
router.use(requireAdmin);

// ----------------------------------------------------
// 1. USER MANAGEMENT
// ----------------------------------------------------

// GET /api/admin/users
router.get('/users', (_req: AuthRequest, res: Response) => {
  try {
    const users = db.prepare(`
      SELECT id, name, email, role, is_active, badge_number, created_at
      FROM users
      ORDER BY id ASC
    `).all() as User[];

    return res.json(users);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to retrieve users.' });
  }
});

// POST /api/admin/users
router.post('/users', async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, password, role = 'OFFICER', badge_number } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const insert = db.prepare(`
      INSERT INTO users (name, email, password_hash, role, is_active, badge_number)
      VALUES (?, ?, ?, ?, 1, ?)
    `);

    const info = insert.run(name, email.toLowerCase(), password_hash, role, badge_number || `BG-${Math.floor(1000 + Math.random() * 9000)}`);

    logAuditEvent(
      req.user!,
      'USER_CREATED',
      'USER',
      info.lastInsertRowid.toString(),
      `Created new account for ${name} (${email}) with role ${role}`,
      req.ip || '127.0.0.1'
    );

    return res.status(201).json({ success: true, message: 'User created successfully.' });
  } catch (err: any) {
    if (err.message && err.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'A user with this email address already exists.' });
    }
    return res.status(500).json({ error: 'Failed to create user.' });
  }
});

// PUT /api/admin/users/:id
router.put('/users/:id', (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { role, is_active, badge_number } = req.body;

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User | undefined;
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Prevent deactivating own account
    if (req.user!.id === Number(id) && is_active === 0) {
      return res.status(400).json({ error: 'You cannot deactivate your own administrative account.' });
    }

    const update = db.prepare(`
      UPDATE users
      SET role = COALESCE(?, role),
          is_active = COALESCE(?, is_active),
          badge_number = COALESCE(?, badge_number)
      WHERE id = ?
    `);

    update.run(role, is_active !== undefined ? is_active : null, badge_number, id);

    logAuditEvent(
      req.user!,
      'USER_UPDATED',
      'USER',
      String(id),
      `Updated user ${user.name} — Status: ${is_active !== undefined ? (is_active ? 'Active' : 'Deactivated') : 'Unchanged'}, Role: ${role || user.role}`,
      req.ip || '127.0.0.1'
    );

    return res.json({ success: true, message: 'User updated successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update user.' });
  }
});

// ----------------------------------------------------
// 2. RISK CONFIGURATION
// ----------------------------------------------------

// GET /api/admin/risk-config
router.get('/risk-config', (_req: AuthRequest, res: Response) => {
  try {
    const config = db.prepare('SELECT * FROM risk_config ORDER BY id DESC LIMIT 1').get() as any;
    if (!config) {
      return res.status(404).json({ error: 'Risk configuration not found.' });
    }

    const result: RiskConfig = {
      id: config.id,
      tamperingWeight: config.tampering_weight,
      faceMismatchWeight: config.face_mismatch_weight,
      databaseWeight: config.database_weight,
      mrzWeight: config.mrz_weight,
      docValidWeight: config.doc_valid_weight,
      qualityWeight: config.quality_weight,
      lowThreshold: config.low_threshold,
      mediumThreshold: config.medium_threshold,
      highThreshold: config.high_threshold,
      updatedAt: config.updated_at,
      updatedBy: config.updated_by
    };

    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to retrieve risk configuration.' });
  }
});

// PUT /api/admin/risk-config
router.put('/risk-config', (req: AuthRequest, res: Response) => {
  try {
    const {
      tamperingWeight,
      faceMismatchWeight,
      databaseWeight,
      mrzWeight,
      docValidWeight,
      qualityWeight,
      lowThreshold,
      mediumThreshold,
      highThreshold
    } = req.body;

    // Validate weights sum to approximately 100
    const totalWeight =
      Number(tamperingWeight) +
      Number(faceMismatchWeight) +
      Number(databaseWeight) +
      Number(mrzWeight) +
      Number(docValidWeight) +
      Number(qualityWeight);

    if (Math.abs(totalWeight - 100) > 0.5) {
      return res.status(400).json({
        error: `Risk factor weights must sum to 100%. Current sum: ${totalWeight.toFixed(1)}%`
      });
    }

    // Validate threshold logic
    if (lowThreshold >= mediumThreshold || mediumThreshold >= highThreshold) {
      return res.status(400).json({
        error: 'Invalid risk threshold values. Low threshold must be less than Medium threshold.'
      });
    }

    const insert = db.prepare(`
      INSERT INTO risk_config (
        tampering_weight, face_mismatch_weight, database_weight,
        mrz_weight, doc_valid_weight, quality_weight,
        low_threshold, medium_threshold, high_threshold, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insert.run(
      tamperingWeight,
      faceMismatchWeight,
      databaseWeight,
      mrzWeight,
      docValidWeight,
      qualityWeight,
      lowThreshold,
      mediumThreshold,
      highThreshold,
      req.user!.name
    );

    logAuditEvent(
      req.user!,
      'RISK_CONFIG_UPDATED',
      'CONFIGURATION',
      'RISK_ENGINE',
      `Updated risk factor weights (Tamper: ${tamperingWeight}%, Face: ${faceMismatchWeight}%, DB: ${databaseWeight}%) and thresholds (Low <= ${lowThreshold}, Med <= ${mediumThreshold})`,
      req.ip || '127.0.0.1'
    );

    return res.json({ success: true, message: 'Risk configuration updated successfully.' });
  } catch (err: any) {
    console.error('Risk config update error:', err);
    return res.status(500).json({ error: 'Failed to update risk configuration.' });
  }
});

// ----------------------------------------------------
// 3. AUDIT LOGS
// ----------------------------------------------------

// GET /api/admin/audit-logs
router.get('/audit-logs', (req: AuthRequest, res: Response) => {
  try {
    const { action, limit = 100, offset = 0 } = req.query;

    let query = 'SELECT * FROM audit_logs WHERE 1=1';
    const params: any[] = [];

    if (action && action !== 'ALL') {
      query += ' AND action = ?';
      params.push(action);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));

    const logs = db.prepare(query).all(...params) as any[];

    const formattedLogs: AuditLog[] = logs.map((l) => ({
      id: l.id,
      userId: l.user_id,
      userName: l.user_name,
      userRole: l.user_role,
      action: l.action,
      entityType: l.entity_type,
      entityId: l.entity_id,
      details: l.details,
      ipAddress: l.ip_address,
      createdAt: l.created_at
    }));

    const total = db.prepare('SELECT COUNT(*) as count FROM audit_logs').get() as { count: number };

    return res.json({
      logs: formattedLogs,
      total: total.count
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch audit logs.' });
  }
});

export default router;
