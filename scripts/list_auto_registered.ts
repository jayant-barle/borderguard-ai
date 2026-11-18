import { initDatabase, db } from '../server/src/db/database';

initDatabase();

const rows = db.prepare(`
  SELECT id, document_number, holder_name, status, created_at, notes
  FROM documents
  WHERE notes LIKE 'Auto-registered upon document screening scan%'
     OR notes LIKE 'Registered in Central Registry upon document screening scan%'
     OR status = 'PENDING_VERIFICATION'
  ORDER BY id DESC
`).all() as any[];

console.log('===========================================================');
console.log('  📋 BorderGuard AI - Auto-Registered Document Audit List ');
console.log('===========================================================');
console.log(`Total Unverified / Auto-Registered Records Found: ${rows.length}`);

if (rows.length === 0) {
  console.log('✓ Clean state: No unverified auto-registered documents present in central registry.');
} else {
  rows.forEach((r, idx) => {
    console.log(`[${idx + 1}] ID: ${r.id} | Doc#: ${r.document_number} | Holder: ${r.holder_name} | Status: ${r.status}`);
    console.log(`    Created: ${r.created_at} | Notes: ${r.notes}`);
  });
}
console.log('===========================================================');
