import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'borderguard.db');
export const db = new Database(dbPath);

// Prevent Node 24 V8 isolate GC destructor assertion on better-sqlite3 native statements
const statementRegistry = new Set<any>();
const origPrepare = db.prepare.bind(db);
db.prepare = function (source: string) {
  const stmt = origPrepare(source);
  statementRegistry.add(stmt);
  return stmt;
} as any;

// Enable foreign keys and WAL mode for high performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('OFFICER', 'ADMIN')),
      is_active INTEGER NOT NULL DEFAULT 1,
      badge_number TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_number TEXT UNIQUE NOT NULL,
      document_type TEXT NOT NULL,
      holder_name TEXT NOT NULL,
      nationality TEXT NOT NULL,
      date_of_birth TEXT NOT NULL,
      gender TEXT NOT NULL DEFAULT 'F',
      issue_date TEXT NOT NULL,
      expiry_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'EXPIRED', 'SUSPENDED', 'BLACKLISTED', 'SUSPICIOUS')),
      photo_url TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS risk_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tampering_weight REAL NOT NULL DEFAULT 30,
      face_mismatch_weight REAL NOT NULL DEFAULT 30,
      database_weight REAL NOT NULL DEFAULT 15,
      mrz_weight REAL NOT NULL DEFAULT 10,
      doc_valid_weight REAL NOT NULL DEFAULT 10,
      quality_weight REAL NOT NULL DEFAULT 5,
      low_threshold REAL NOT NULL DEFAULT 30,
      medium_threshold REAL NOT NULL DEFAULT 60,
      high_threshold REAL NOT NULL DEFAULT 100,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_by TEXT DEFAULT 'System'
    );

    CREATE TABLE IF NOT EXISTS verification_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      verification_id TEXT UNIQUE NOT NULL,
      officer_id INTEGER NOT NULL,
      officer_name TEXT NOT NULL,
      officer_badge TEXT,
      document_type TEXT NOT NULL,
      document_image TEXT NOT NULL,
      document_number TEXT NOT NULL,
      holder_name TEXT NOT NULL,
      ai_mode TEXT NOT NULL DEFAULT 'DEMO_MODE',
      scenario_detected TEXT NOT NULL,
      risk_score REAL NOT NULL,
      risk_level TEXT NOT NULL,
      final_status TEXT NOT NULL,
      processing_time_ms INTEGER NOT NULL,
      details_json TEXT NOT NULL,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (officer_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      user_name TEXT NOT NULL,
      user_role TEXT NOT NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      details TEXT NOT NULL,
      ip_address TEXT DEFAULT '127.0.0.1',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}
