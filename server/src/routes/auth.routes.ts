import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db/database';
import { generateToken, authenticateToken, AuthRequest } from '../middleware/auth';
import { logAuditEvent } from '../middleware/audit';
import { User } from '../../../shared/types';

const router = Router();

export interface FailedLoginRecord {
  count: number;
  firstAttemptTime: number;
  lastAttemptTime: number;
}

export const loginAttempts = new Map<string, FailedLoginRecord>();
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export function getRateLimitKey(ip: string, email: string): string {
  const cleanIp = (ip || '127.0.0.1').trim().toLowerCase();
  const cleanEmail = (email || '').trim().toLowerCase();
  return `${cleanIp}:${cleanEmail}`;
}

export function checkLoginRateLimit(key: string): { locked: boolean; retryAfter: number } {
  const now = Date.now();
  const existing = loginAttempts.get(key);
  if (!existing) {
    return { locked: false, retryAfter: 0 };
  }
  if (now - existing.firstAttemptTime > LOCKOUT_WINDOW_MS) {
    loginAttempts.delete(key);
    return { locked: false, retryAfter: 0 };
  }
  if (existing.count >= MAX_FAILED_ATTEMPTS) {
    const retryAfter = Math.max(1, Math.ceil((existing.firstAttemptTime + LOCKOUT_WINDOW_MS - now) / 1000));
    return { locked: true, retryAfter };
  }
  return { locked: false, retryAfter: 0 };
}

export function recordFailedLogin(key: string): { count: number; locked: boolean; retryAfter: number } {
  const now = Date.now();
  const existing = loginAttempts.get(key);
  if (!existing || now - existing.firstAttemptTime > LOCKOUT_WINDOW_MS) {
    loginAttempts.set(key, { count: 1, firstAttemptTime: now, lastAttemptTime: now });
    return { count: 1, locked: false, retryAfter: 0 };
  }
  existing.count += 1;
  existing.lastAttemptTime = now;
  loginAttempts.set(key, existing);

  const locked = existing.count >= MAX_FAILED_ATTEMPTS;
  const retryAfter = Math.max(1, Math.ceil((existing.firstAttemptTime + LOCKOUT_WINDOW_MS - now) / 1000));
  return { count: existing.count, locked, retryAfter };
}

export function clearLoginAttempts(key?: string) {
  if (key) {
    loginAttempts.delete(key);
  } else {
    loginAttempts.clear();
  }
}

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const clientIp = (req.ip || req.socket.remoteAddress || '127.0.0.1').toString();
    const rateKey = getRateLimitKey(clientIp, email);

    // Check rate limit status
    const rateCheck = checkLoginRateLimit(rateKey);
    if (rateCheck.locked) {
      res.setHeader('Retry-After', rateCheck.retryAfter.toString());
      return res.status(429).json({
        error: `Too many failed login attempts. Please try again in ${rateCheck.retryAfter} seconds.`,
        retryAfter: rateCheck.retryAfter
      });
    }

    const user = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(email) as any;

    if (!user) {
      recordFailedLogin(rateKey);
      return res.status(401).json({ error: 'Invalid credentials. Please check your email and password.' });
    }

    if (user.is_active !== 1) {
      return res.status(403).json({ error: 'This account has been deactivated. Contact your administrator.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      recordFailedLogin(rateKey);
      return res.status(401).json({ error: 'Invalid credentials. Please check your email and password.' });
    }

    // Login successful: reset rate limit attempts for this IP + email
    clearLoginAttempts(rateKey);

    const safeUser: User = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      is_active: user.is_active,
      badge_number: user.badge_number,
      created_at: user.created_at
    };

    const token = generateToken(safeUser);

    logAuditEvent(
      safeUser,
      'USER_LOGIN',
      'USER',
      user.id.toString(),
      `User ${user.name} (${user.role}) logged in successfully.`,
      req.ip || '127.0.0.1'
    );

    return res.json({
      token,
      user: safeUser,
      message: 'Authentication successful.'
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Authentication service encountered an unexpected error.' });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, (req: AuthRequest, res: Response) => {
  return res.json({
    user: req.user
  });
});

// POST /api/auth/logout
router.post('/logout', authenticateToken, (req: AuthRequest, res: Response) => {
  if (req.user) {
    logAuditEvent(
      req.user,
      'USER_LOGOUT',
      'USER',
      req.user.id.toString(),
      `User ${req.user.name} logged out.`,
      req.ip || '127.0.0.1'
    );
  }
  return res.json({ message: 'Logged out successfully.' });
});

export default router;
