import express from 'express';
import cors from 'cors';
import path from 'node:path';
import os from 'node:os';
import chalk from 'chalk';
import { ServerDB } from './storage/db.js';
import authRoutes from './routes/auth.js';
import eventsRoutes from './routes/events.js';
import sessionsRoutes from './routes/sessions.js';
import communityRoutes from './routes/community.js';
import evaluateRoutes from './routes/evaluate.js';

// ── Configuration ──

const PORT = parseInt(process.env.PORT ?? '4147', 10);
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const DB_PATH = process.env.DB_PATH ?? path.join(os.homedir(), '.sightglass', 'server.db');

// ── Express app setup ──

const app = express();

// CORS — allow all origins in development, restrict in production
app.use(cors(IS_PRODUCTION ? {
  origin: process.env.CORS_ORIGIN ?? 'https://sightglass.dev',
  credentials: true,
} : {
  origin: '*',
}));

// JSON body parser with 1MB limit
app.use(express.json({ limit: '1mb' }));

// ── Database initialization ──

const db = new ServerDB(DB_PATH);
db.init();
app.set('db', db);

// ── Routes ──

app.use('/api/auth', authRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/sessions', sessionsRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/evaluate', evaluateRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  try {
    const stats = db.getCommunityStats();
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      stats: {
        totalSignalEvents: stats.totalEvents,
        topPackages: stats.topPackages.length,
        classifications: Object.keys(stats.classificationDistribution).length,
      },
    });
  } catch {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  }
});

// ── 404 handler ──

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ── Global error handling middleware ──

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);

  if (IS_PRODUCTION) {
    res.status(500).json({ error: 'Internal server error' });
  } else {
    res.status(500).json({
      error: 'Internal server error',
      message: err.message,
      stack: err.stack,
    });
  }
});

// ── Start server ──

app.listen(PORT, () => {
  console.log('');
  console.log(chalk.bold('  Sightglass API Server'));
  console.log('');
  console.log(`  ${chalk.green('>')} Running on     ${chalk.cyan(`http://localhost:${PORT}`)}`);
  console.log(`  ${chalk.green('>')} Database        ${chalk.dim(DB_PATH)}`);
  console.log(`  ${chalk.green('>')} Environment     ${chalk.yellow(IS_PRODUCTION ? 'production' : 'development')}`);
  console.log(`  ${chalk.green('>')} CORS            ${chalk.dim(IS_PRODUCTION ? 'restricted' : 'open')}`);
  console.log('');
  console.log(chalk.dim('  Endpoints:'));
  console.log(chalk.dim('    POST   /api/auth/register'));
  console.log(chalk.dim('    POST   /api/auth/login'));
  console.log(chalk.dim('    GET    /api/auth/me'));
  console.log(chalk.dim('    POST   /api/events'));
  console.log(chalk.dim('    GET    /api/events'));
  console.log(chalk.dim('    GET    /api/sessions'));
  console.log(chalk.dim('    GET    /api/sessions/:id'));
  console.log(chalk.dim('    GET    /api/community/stats'));
  console.log(chalk.dim('    GET    /api/community/velocity'));
  console.log(chalk.dim('    GET    /api/community/risks'));
  console.log(chalk.dim('    GET    /api/community/categories'));
  console.log(chalk.dim('    GET    /api/community/model-comparison'));
  console.log(chalk.dim('    POST   /api/evaluate'));
  console.log(chalk.dim('    GET    /api/health'));
  console.log('');
});

// ── Graceful shutdown ──

function shutdown(): void {
  console.log(chalk.dim('\n  Shutting down...'));
  db.close();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

export { app, db };
