import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db/database';
import { generateToken, authenticateToken, AuthRequest } from '../middleware/auth';
import { logAuditEvent } from '../middleware/audit';
import { User } from '../../../shared/types';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(email) as any;

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials. Please check your email and password.' });
    }

    if (user.is_active !== 1) {
      return res.status(403).json({ error: 'This account has been deactivated. Contact your administrator.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials. Please check your email and password.' });
    }

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
