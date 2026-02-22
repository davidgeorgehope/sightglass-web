import { Router } from 'express';
import type { ServerDB } from '../storage/db.js';

const router = Router();

// ── GET /community/stats ──

router.get('/stats', (req, res) => {
  try {
    const db = req.app.get('db') as ServerDB;
    const stats = db.getCommunityStats();

    res.json({
      totalEvents: stats.totalEvents,
      classificationDistribution: stats.classificationDistribution,
      topPackages: stats.topPackages,
      riskCounts: stats.riskCounts,
    });
  } catch (err) {
    console.error('Community stats error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /community/velocity ──

router.get('/velocity', (req, res) => {
  try {
    const db = req.app.get('db') as ServerDB;
    const velocity = db.getPackageVelocity();

    const trending = velocity.filter(v => v.direction === 'up');
    const declining = velocity.filter(v => v.direction === 'down');
    const stable = velocity.filter(v => v.direction === 'stable');

    res.json({
      trending,
      declining,
      stable,
      total: velocity.length,
    });
  } catch (err) {
    console.error('Community velocity error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /community/risks ──

router.get('/risks', (req, res) => {
  try {
    const db = req.app.get('db') as ServerDB;
    const risks = db.getCommunityRisks();

    // Group by risk type for cleaner output
    const grouped: Record<string, Array<{ packageName: string | null; count: number }>> = {};
    for (const risk of risks) {
      if (!grouped[risk.risk_type]) {
        grouped[risk.risk_type] = [];
      }
      grouped[risk.risk_type].push({
        packageName: risk.package_name,
        count: risk.count,
      });
    }

    res.json({
      totalRiskFlags: risks.reduce((sum, r) => sum + r.count, 0),
      riskTypes: grouped,
      raw: risks,
    });
  } catch (err) {
    console.error('Community risks error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
