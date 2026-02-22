import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import type { ServerDB } from '../storage/db.js';

const router = Router();

// ── GET /sessions ──

router.get('/', authMiddleware, (req, res) => {
  try {
    const user = req.user!;
    const db = req.app.get('db') as ServerDB;

    const sessions = db.getSessionsByUser(user.id);

    // Parse JSON fields for the response
    const parsed = sessions.map(s => ({
      id: s.id,
      agent: s.agent,
      totalEvents: s.total_events,
      installEvents: s.install_events,
      classificationDistribution: s.classification_distribution
        ? JSON.parse(s.classification_distribution)
        : null,
      riskSummary: s.risk_summary
        ? JSON.parse(s.risk_summary)
        : null,
      createdAt: s.created_at,
    }));

    res.json({
      count: parsed.length,
      sessions: parsed,
    });
  } catch (err) {
    console.error('Sessions retrieval error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /sessions/:id ──

router.get('/:id', authMiddleware, (req, res) => {
  try {
    const user = req.user!;
    const db = req.app.get('db') as ServerDB;
    const sessionId = req.params.id as string;

    if (!sessionId || sessionId.length === 0) {
      res.status(400).json({ error: 'Session ID is required' });
      return;
    }

    const session = db.getSessionById(user.id, sessionId);

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    res.json({
      id: session.id,
      agent: session.agent,
      totalEvents: session.total_events,
      installEvents: session.install_events,
      classificationDistribution: session.classification_distribution
        ? JSON.parse(session.classification_distribution)
        : null,
      riskSummary: session.risk_summary
        ? JSON.parse(session.risk_summary)
        : null,
      createdAt: session.created_at,
    });
  } catch (err) {
    console.error('Session detail error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
