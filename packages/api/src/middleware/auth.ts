import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import type { UserRow } from '../storage/db.js';
import type { ServerDB } from '../storage/db.js';

// ── Type augmentation for Express Request ──

declare global {
  namespace Express {
    interface Request {
      user?: UserRow;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET ?? 'sightglass-dev-secret-change-in-production';
const JWT_EXPIRY = '24h';

/** Generate a JWT token for the given user ID */
export function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

/** Verify a JWT token and return the decoded payload */
function verifyToken(token: string): { userId: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Express middleware that authenticates requests via:
 * 1. Bearer token in the Authorization header (JWT)
 * 2. API key in the x-api-key header
 *
 * Attaches the authenticated user to req.user on success.
 * Requires the ServerDB instance to be set on app via app.set('db', dbInstance).
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const db = req.app.get('db') as ServerDB | undefined;
  if (!db) {
    res.status(500).json({ error: 'Server configuration error: database not available' });
    return;
  }

  // Try Bearer token first
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);

    // Attempt JWT verification
    const decoded = verifyToken(token);
    if (decoded) {
      const user = db.getUserById(decoded.userId);
      if (user) {
        req.user = user;
        next();
        return;
      }
    }

    // If not a valid JWT, try treating the token as an API key
    const userByApiKey = db.getUserByApiKey(token);
    if (userByApiKey) {
      req.user = userByApiKey;
      next();
      return;
    }

    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  // Try x-api-key header
  const apiKey = req.headers['x-api-key'] as string | undefined;
  if (apiKey) {
    const user = db.getUserByApiKey(apiKey);
    if (user) {
      req.user = user;
      next();
      return;
    }
    res.status(401).json({ error: 'Invalid API key' });
    return;
  }

  res.status(401).json({
    error: 'Authentication required. Provide a Bearer token or x-api-key header.',
  });
}
