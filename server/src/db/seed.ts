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

  // 3. Seed Mock Document Registry
  const docCount = db.prepare('SELECT COUNT(*) as count FROM documents').get() as { count: number };
  if (docCount.count === 0) {
    const insertDoc = db.prepare(`
      INSERT INTO documents (document_number, document_type, holder_name, nationality, date_of_birth, gender, issue_date, expiry_date, status, photo_url, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Scenario 1 & 2 Identity in central database (Genuine traveler)
    insertDoc.run(
      'P94821037',
      'PASSPORT',
      'ANANYA VERMA',
      'IND',
      '1994-06-18',
      'F',
      '2021-04-12',
      '2031-04-11',
      'ACTIVE',
      '/assets/specimens/reference_ananya_verma.png',
      'Registered biometric passport profile. Standard verification history.'
    );

    insertDoc.run(
      'M39281745',
      'PASSPORT',
      'ROHIT SHARMA',
      'IND',
      '1988-11-23',
      'M',
      '2018-02-10',
      '2028-02-09',
      'SUSPENDED',
      '/assets/specimens/reference_rohit_sharma.png',
      'Passport flagged as suspended due to administrative review request.'
    );

    insertDoc.run(
      'K88492011',
      'PASSPORT',
      'DAVID MIKKELSON',
      'GBR',
      '1982-03-14',
      'M',
      '2019-09-01',
      '2029-08-31',
      'BLACKLISTED',
      '/assets/specimens/reference_david_m.png',
      'Interpol Red Notice Ref #29402 - Do not clear without immigration supervisor.'
    );

    insertDoc.run(
      'Z47291055',
      'PASSPORT',
      'PRIYA PATEL',
      'IND',
      '1991-08-30',
      'F',
      '2013-05-15',
      '2023-05-14',
      'EXPIRED',
      '/assets/specimens/reference_priya_p.png',
      'Expired passport. Requires valid renewal or valid visa endorsement.'
    );

    insertDoc.run(
      'R67129481',
      'PASSPORT',
      'ELENA ROSTOVA',
      'RUS',
      '1996-12-05',
      'F',
      '2022-01-10',
      '2032-01-09',
      'ACTIVE',
      '/assets/specimens/reference_elena_r.png',
      'Frequent business traveler. Verified e-Visa on file.'
    );

    insertDoc.run(
      'E55192837',
      'PASSPORT',
      'ALEXANDER CHEN',
      'SGP',
      '1985-07-22',
      'M',
      '2020-10-18',
      '2030-10-17',
      'ACTIVE',
      '/assets/specimens/reference_alex_c.png',
      'APEC Business Travel Card holder.'
    );
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
