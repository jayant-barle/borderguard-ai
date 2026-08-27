import bcrypt from 'bcryptjs';
import { db } from './database';

export function seedDatabase() {
  const salt = bcrypt.genSaltSync(10);
  const officerHash = bcrypt.hashSync('Officer@123', salt);
  const adminHash = bcrypt.hashSync('Admin@123', salt);

  const insertUser = db.prepare(`
    INSERT OR IGNORE INTO users (name, email, password_hash, role, is_active, badge_number)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  // Primary SatyaShield demo accounts
  insertUser.run('Officer Rajesh Kumar', 'officer@satyashield.demo', officerHash, 'OFFICER', 1, 'SS-9842');
  insertUser.run('Inspector Vikramaditya (Admin)', 'admin@satyashield.demo', adminHash, 'ADMIN', 1, 'SS-0010');
  insertUser.run('Officer Sarah Jenkins', 'sarah.j@satyashield.demo', officerHash, 'OFFICER', 1, 'SS-4102');

  // Also maintain backward compatibility aliases
  insertUser.run('Officer Rajesh Kumar', 'officer@borderguard.demo', officerHash, 'OFFICER', 1, 'SS-9842');
  insertUser.run('Inspector Vikramaditya (Admin)', 'admin@borderguard.demo', adminHash, 'ADMIN', 1, 'SS-0010');

  // 2. Seed Risk Config
  const configCount = db.prepare('SELECT COUNT(*) as count FROM risk_config').get() as { count: number };
  if (configCount.count === 0) {
    db.prepare(`
      INSERT INTO risk_config (tampering_weight, face_mismatch_weight, database_weight, mrz_weight, doc_valid_weight, quality_weight, low_threshold, medium_threshold, high_threshold, updated_by)
      VALUES (30, 30, 15, 10, 10, 5, 30, 60, 100, 'System Initializer')
    `).run();
  }

  // 3. Clean up any previous hardcoded mock documents from the central registry
  try {
    db.prepare(`
      DELETE FROM documents 
      WHERE document_number IN ('P94821037', 'M39281745', 'K88492011', 'Z47291055', 'R67129481', 'E55192837')
    `).run();
  } catch (err: any) {
    console.warn('Document cleanup note:', err.message);
  }

  // 4. Seed Audit Logs
  const auditCount = db.prepare('SELECT COUNT(*) as count FROM audit_logs').get() as { count: number };
  if (auditCount.count === 0) {
    const insertAudit = db.prepare(`
      INSERT INTO audit_logs (user_id, user_name, user_role, action, entity_type, entity_id, details, ip_address, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '-2 days'))
    `);

    insertAudit.run(
      2,
      'Inspector Vikramaditya (Admin)',
      'ADMIN',
      'SYSTEM_INITIALIZATION',
      'SYSTEM',
      'SYS-001',
      'Initialized SatyaShield security engine & database rules.',
      '127.0.0.1'
    );
  }
}
