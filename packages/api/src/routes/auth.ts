import { Router } from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { generateToken } from '../middleware/auth.js';
import { authMiddleware } from '../middleware/auth.js';
import type { ServerDB } from '../storage/db.js';

const router = Router();

const BCRYPT_ROUNDS = 12;

// ── Validation schemas ──

const RegisterSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// ── POST /register ──

router.post('/register', async (req, res) => {
  try {
    const { email, password } = RegisterSchema.parse(req.body);

    const db = req.app.get('db') as ServerDB;

    // Check if user already exists
    const existing = db.getUserByEmail(email);
    if (existing) {
      res.status(409).json({ error: 'An account with this email already exists' });
      return;
    }

    // Hash password and create user
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = db.createUser(email, passwordHash);

    // Generate JWT
    const token = generateToken(user.id);

    res.status(201).json({
      token,
      apiKey: user.api_key,
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.created_at,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation failed',
        details: err.errors.map(e => ({ field: e.path.join('.'), message: e.message })),
      });
      return;
    }
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /login ──

router.post('/login', async (req, res) => {
  try {
    const { email, password } = LoginSchema.parse(req.body);

    const db = req.app.get('db') as ServerDB;

    const user = db.getUserByEmail(email);
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const token = generateToken(user.id);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.created_at,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation failed',
        details: err.errors.map(e => ({ field: e.path.join('.'), message: e.message })),
      });
      return;
    }
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /me ──

router.get('/me', authMiddleware, (req, res) => {
  const user = req.user!;
  res.json({
    id: user.id,
    email: user.email,
    apiKey: user.api_key,
    createdAt: user.created_at,
  });
});

export default router;
