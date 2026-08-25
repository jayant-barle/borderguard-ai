import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, UserRole } from '../../../shared/types';
import { db } from '../db/database';

const JWT_SECRET = process.env.JWT_SECRET || 'borderguard-super-secret-security-key-2026';

export interface AuthRequest extends Request {
  user?: User;
}

export function generateToken(user: User): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      badge_number: user.badge_number
    },
    JWT_SECRET,
    { expiresIn: '12h' }
  );
}

export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required. Please sign in.' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    // Check if user still exists and is active in DB
    const user = db.prepare('SELECT id, name, email, role, is_active, badge_number, created_at FROM users WHERE id = ?').get(payload.id) as User | undefined;

    if (!user || user.is_active !== 1) {
      return res.status(403).json({ error: 'User account is inactive or no longer valid.' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session token.' });
  }
}

export function requireRole(allowedRoles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Unauthorized. Required role: ${allowedRoles.join(' or ')}. Your role: ${req.user.role}`
      });
    }

    next();
  };
}

export const requireAdmin = requireRole(['ADMIN']);
export const requireOfficer = requireRole(['OFFICER', 'ADMIN']);
