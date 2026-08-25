import { db } from '../db/database';
import { User } from '../../../shared/types';

export function logAuditEvent(
  user: { id: number; name: string; role: string },
  action: string,
  entityType: string,
  entityId: string,
  details: string,
  ipAddress: string = '127.0.0.1'
) {
  try {
    const insert = db.prepare(`
      INSERT INTO audit_logs (user_id, user_name, user_role, action, entity_type, entity_id, details, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insert.run(user.id, user.name, user.role, action, entityType, entityId, details, ipAddress);
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}
