import Database from 'better-sqlite3';
import { v4 as uuid } from 'uuid';
import { MIGRATIONS } from './migrations.js';

// ── Row types ──

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  created_at: string;
  api_key: string | null;
}

export interface EventRow {
  id: string;
  user_id: string;
  agent: string;
  action: string;
  classification: string | null;
  confidence: number | null;
  package_name: string | null;
  package_version: string | null;
  package_manager: string | null;
  is_install: number;
  is_search: number;
  abandoned: number;
  timestamp: string;
  received_at: string;
}

export interface SessionAggregateRow {
  id: string;
  user_id: string;
  agent: string;
  total_events: number;
  install_events: number;
  classification_distribution: string | null;
  risk_summary: string | null;
  created_at: string;
}

export interface EvaluationRow {
  id: string;
  user_id: string;
  package_name: string;
  package_manager: string | null;
  command: string | null;
  verdict: string;
  gemini_response: string | null;
  created_at: string;
}

export interface CommunityStats {
  totalEvents: number;
  classificationDistribution: Record<string, number>;
  topPackages: Array<{ package_name: string; install_count: number }>;
  riskCounts: Record<string, number>;
}

export interface IncomingEvent {
  agent: string;
  action: string;
  classification?: string;
  confidence?: number;
  packageName?: string;
  packageVersion?: string;
  packageManager?: string;
  isInstall?: boolean;
  isSearch?: boolean;
  abandoned?: boolean;
  timestamp: string;
  category?: string;
  isCustomBuild?: boolean;
  model?: string;
  modelVersion?: string;
}

export class ServerDB {
  private db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
  }

  /** Run all pending migrations */
  init(): void {
    const currentVersion = this.getSchemaVersion();
    for (const migration of MIGRATIONS) {
      if (migration.version > currentVersion) {
        this.db.exec(migration.sql);
      }
    }
  }

  private getSchemaVersion(): number {
    try {
      const row = this.db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='schema_version'"
      ).get() as { name: string } | undefined;
      if (!row) return 0;
      const version = this.db.prepare(
        'SELECT MAX(version) as version FROM schema_version'
      ).get() as { version: number } | undefined;
      return version?.version ?? 0;
    } catch {
      return 0;
    }
  }

  // ── Users ──

  createUser(email: string, passwordHash: string): UserRow {
    const id = uuid();
    const apiKey = uuid();
    const createdAt = new Date().toISOString();

    this.db.prepare(`
      INSERT INTO users (id, email, password_hash, created_at, api_key)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, email, passwordHash, createdAt, apiKey);

    return {
      id,
      email,
      password_hash: passwordHash,
      created_at: createdAt,
      api_key: apiKey,
    };
  }

  getUserByEmail(email: string): UserRow | undefined {
    return this.db.prepare(
      'SELECT * FROM users WHERE email = ?'
    ).get(email) as UserRow | undefined;
  }

  getUserByApiKey(apiKey: string): UserRow | undefined {
    return this.db.prepare(
      'SELECT * FROM users WHERE api_key = ?'
    ).get(apiKey) as UserRow | undefined;
  }

  getUserById(id: string): UserRow | undefined {
    return this.db.prepare(
      'SELECT * FROM users WHERE id = ?'
    ).get(id) as UserRow | undefined;
  }

  // ── Events ──

  insertEvents(userId: string, events: IncomingEvent[]): void {
    const insert = this.db.prepare(`
      INSERT INTO events (
        id, user_id, agent, action, classification, confidence,
        package_name, package_version, package_manager,
        is_install, is_search, abandoned, timestamp, received_at,
        category, is_custom_build, model, model_version
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const receivedAt = new Date().toISOString();

    const tx = this.db.transaction((evts: IncomingEvent[]) => {
      for (const e of evts) {
        insert.run(
          uuid(),
          userId,
          e.agent,
          e.action,
          e.classification ?? null,
          e.confidence ?? null,
          e.packageName ?? null,
          e.packageVersion ?? null,
          e.packageManager ?? null,
          e.isInstall ? 1 : 0,
          e.isSearch ? 1 : 0,
          e.abandoned ? 1 : 0,
          e.timestamp,
          receivedAt,
          e.category ?? null,
          e.isCustomBuild ? 1 : 0,
          e.model ?? null,
          e.modelVersion ?? null,
        );
      }
    });

    tx(events);
  }

  getEventsByUser(userId: string, since?: string, limit?: number): EventRow[] {
    let sql = 'SELECT * FROM events WHERE user_id = ?';
    const params: unknown[] = [userId];

    if (since) {
      sql += ' AND timestamp >= ?';
      params.push(since);
    }

    sql += ' ORDER BY timestamp DESC';

    if (limit && limit > 0) {
      sql += ' LIMIT ?';
      params.push(limit);
    }

    return this.db.prepare(sql).all(...params) as EventRow[];
  }

  /** Get only signal events — filters out file_read/file_write/routine bash noise */
  getSignalEventsByUser(userId: string, since?: string, limit?: number): EventRow[] {
    let sql = "SELECT * FROM events WHERE user_id = ? AND (is_install = 1 OR is_search = 1 OR action IN ('web_search', 'web_fetch'))";
    const params: unknown[] = [userId];
    if (since) { sql += " AND timestamp >= ?"; params.push(since); }
    sql += " ORDER BY timestamp DESC";
    if (limit && limit > 0) { sql += " LIMIT ?"; params.push(limit); }
    return this.db.prepare(sql).all(...params) as EventRow[];
  }

  getInstallEventsByUser(userId: string): EventRow[] {
    return this.db.prepare(
      'SELECT * FROM events WHERE user_id = ? AND is_install = 1 ORDER BY timestamp DESC'
    ).all(userId) as EventRow[];
  }

  // ── Sessions Aggregate ──

  getSessionsByUser(userId: string): SessionAggregateRow[] {
    return this.db.prepare(
      'SELECT * FROM sessions_aggregate WHERE user_id = ? ORDER BY created_at DESC'
    ).all(userId) as SessionAggregateRow[];
  }

  getSessionById(userId: string, sessionId: string): SessionAggregateRow | undefined {
    return this.db.prepare(
      'SELECT * FROM sessions_aggregate WHERE id = ? AND user_id = ?'
    ).get(sessionId, userId) as SessionAggregateRow | undefined;
  }

  // ── Community Stats ──

  getCommunityStats(): CommunityStats {
    // Total events
    const totalRow = this.db.prepare(
      `SELECT COUNT(*) as count FROM events WHERE is_install = 1 OR is_search = 1 OR action IN ('web_search', 'web_fetch')`
    ).get() as { count: number };

    // Classification distribution
    const classRows = this.db.prepare(`
      SELECT classification, COUNT(*) as count
      FROM events
      WHERE classification IS NOT NULL
        AND (is_install = 1 OR is_search = 1 OR action IN ('web_search', 'web_fetch'))
      GROUP BY classification
      ORDER BY count DESC
    `).all() as Array<{ classification: string; count: number }>;

    const classificationDistribution: Record<string, number> = {};
    const classTotal = classRows.reduce((sum, r) => sum + r.count, 0);
    for (const row of classRows) {
      classificationDistribution[row.classification] =
        classTotal > 0 ? Math.round((row.count / classTotal) * 10000) / 100 : 0;
    }

    // Top packages by install count
    const topPackages = this.db.prepare(`
      SELECT package_name, COUNT(*) as install_count
      FROM events
      WHERE is_install = 1 AND package_name IS NOT NULL
      GROUP BY package_name
      ORDER BY install_count DESC
      LIMIT 20
    `).all() as Array<{ package_name: string; install_count: number }>;

    // Risk counts (classification-based risk grouping)
    const riskRows = this.db.prepare(`
      SELECT
        CASE
          WHEN classification = 'TRAINING_RECALL' THEN 'training_bias'
          WHEN classification = 'CONTEXT_INHERITANCE' THEN 'context_inherited'
          WHEN abandoned = 1 THEN 'abandoned'
          ELSE 'normal'
        END as risk_type,
        COUNT(*) as count
      FROM events
      WHERE is_install = 1 OR is_search = 1 OR action IN ('web_search', 'web_fetch')
      GROUP BY risk_type
      ORDER BY count DESC
    `).all() as Array<{ risk_type: string; count: number }>;

    const riskCounts: Record<string, number> = {};
    for (const row of riskRows) {
      riskCounts[row.risk_type] = row.count;
    }

    return {
      totalEvents: totalRow.count,
      classificationDistribution,
      topPackages,
      riskCounts,
    };
  }

  /** Get packages trending up or down based on recent vs older install counts */
  getPackageVelocity(): Array<{
    package_name: string;
    recent_count: number;
    older_count: number;
    velocity: number;
    direction: 'up' | 'down' | 'stable';
  }> {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const rows = this.db.prepare(`
      SELECT
        package_name,
        SUM(CASE WHEN timestamp >= ? THEN 1 ELSE 0 END) as recent_count,
        SUM(CASE WHEN timestamp < ? THEN 1 ELSE 0 END) as older_count
      FROM events
      WHERE is_install = 1 AND package_name IS NOT NULL
      GROUP BY package_name
      HAVING (recent_count + older_count) >= 2
      ORDER BY recent_count DESC
      LIMIT 50
    `).all(cutoff, cutoff) as Array<{
      package_name: string;
      recent_count: number;
      older_count: number;
    }>;

    return rows.map(row => {
      const velocity = row.older_count > 0
        ? ((row.recent_count - row.older_count) / row.older_count) * 100
        : row.recent_count > 0 ? 100 : 0;

      let direction: 'up' | 'down' | 'stable';
      if (velocity > 10) direction = 'up';
      else if (velocity < -10) direction = 'down';
      else direction = 'stable';

      return {
        package_name: row.package_name,
        recent_count: row.recent_count,
        older_count: row.older_count,
        velocity: Math.round(velocity * 100) / 100,
        direction,
      };
    });
  }

  /** Get most common risk flags across all users */
  getCommunityRisks(): Array<{
    risk_type: string;
    package_name: string | null;
    count: number;
  }> {
    // Abandoned installs
    const abandoned = this.db.prepare(`
      SELECT package_name, COUNT(*) as count
      FROM events
      WHERE abandoned = 1 AND package_name IS NOT NULL
      GROUP BY package_name
      ORDER BY count DESC
      LIMIT 20
    `).all() as Array<{ package_name: string; count: number }>;

    // Training recall installs (high training weight bias)
    const trainingRecall = this.db.prepare(`
      SELECT package_name, COUNT(*) as count
      FROM events
      WHERE classification = 'TRAINING_RECALL' AND is_install = 1 AND package_name IS NOT NULL
      GROUP BY package_name
      ORDER BY count DESC
      LIMIT 20
    `).all() as Array<{ package_name: string; count: number }>;

    const results: Array<{
      risk_type: string;
      package_name: string | null;
      count: number;
    }> = [];

    for (const row of abandoned) {
      results.push({
        risk_type: 'abandoned_install',
        package_name: row.package_name,
        count: row.count,
      });
    }

    for (const row of trainingRecall) {
      results.push({
        risk_type: 'training_bias',
        package_name: row.package_name,
        count: row.count,
      });
    }

    results.sort((a, b) => b.count - a.count);
    return results;
  }

  // ── Category Win Rates ──

  getCategoryWinRates(): Array<{
    name: string;
    totalPicks: number;
    winner: { name: string; count: number; pct: number };
    runnerUp: { name: string; count: number; pct: number } | null;
    customBuildPct: number;
    picks: Array<{ name: string; count: number; pct: number }>;
  }> {
    // Get all install events grouped by category and package
    const rows = this.db.prepare(`
      SELECT category, package_name, is_custom_build, COUNT(*) as count
      FROM events
      WHERE (is_install = 1 OR is_custom_build = 1)
        AND category IS NOT NULL
      GROUP BY category, package_name, is_custom_build
      ORDER BY category, count DESC
    `).all() as Array<{
      category: string;
      package_name: string | null;
      is_custom_build: number;
      count: number;
    }>;

    // Group by category
    const categoryMap = new Map<string, Array<{ name: string; count: number; isCustom: boolean }>>();
    for (const row of rows) {
      if (!categoryMap.has(row.category)) {
        categoryMap.set(row.category, []);
      }
      categoryMap.get(row.category)!.push({
        name: row.is_custom_build ? 'Custom/DIY' : (row.package_name ?? 'unknown'),
        count: row.count,
        isCustom: row.is_custom_build === 1,
      });
    }

    const results: Array<{
      name: string;
      totalPicks: number;
      winner: { name: string; count: number; pct: number };
      runnerUp: { name: string; count: number; pct: number } | null;
      customBuildPct: number;
      picks: Array<{ name: string; count: number; pct: number }>;
    }> = [];

    for (const [category, entries] of categoryMap) {
      // Merge custom build entries
      const merged = new Map<string, number>();
      let customCount = 0;
      for (const entry of entries) {
        if (entry.isCustom) {
          customCount += entry.count;
          merged.set('Custom/DIY', (merged.get('Custom/DIY') ?? 0) + entry.count);
        } else {
          merged.set(entry.name, (merged.get(entry.name) ?? 0) + entry.count);
        }
      }

      const sorted = [...merged.entries()]
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

      const totalPicks = sorted.reduce((sum, s) => sum + s.count, 0);
      if (totalPicks === 0) continue;

      const picks = sorted.map(s => ({
        name: s.name,
        count: s.count,
        pct: Math.round((s.count / totalPicks) * 1000) / 10,
      }));

      results.push({
        name: category,
        totalPicks,
        winner: picks[0],
        runnerUp: picks.length > 1 ? picks[1] : null,
        customBuildPct: Math.round((customCount / totalPicks) * 1000) / 10,
        picks,
      });
    }

    return results.sort((a, b) => b.totalPicks - a.totalPicks);
  }

  // ── Model Comparison ──

  getModelComparison(): Record<string, Record<string, Record<string, number>>> {
    const rows = this.db.prepare(`
      SELECT category, model, package_name, COUNT(*) as count
      FROM events
      WHERE is_install = 1
        AND category IS NOT NULL
        AND model IS NOT NULL
        AND package_name IS NOT NULL
      GROUP BY category, model, package_name
      ORDER BY category, model, count DESC
    `).all() as Array<{
      category: string;
      model: string;
      package_name: string;
      count: number;
    }>;

    const result: Record<string, Record<string, Record<string, number>>> = {};
    for (const row of rows) {
      if (!result[row.category]) result[row.category] = {};
      if (!result[row.category][row.model]) result[row.category][row.model] = {};
      result[row.category][row.model][row.package_name] = row.count;
    }

    return result;
  }

  // ── Evaluations ──

  insertEvaluation(
    userId: string,
    packageName: string,
    packageManager: string | null,
    command: string | null,
    verdict: string,
    geminiResponse: string | null,
  ): EvaluationRow {
    const id = uuid();
    this.db.prepare(`
      INSERT INTO evaluations (id, user_id, package_name, package_manager, command, verdict, gemini_response)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, userId, packageName, packageManager, command, verdict, geminiResponse);

    return {
      id,
      user_id: userId,
      package_name: packageName,
      package_manager: packageManager,
      command,
      verdict,
      gemini_response: geminiResponse,
      created_at: new Date().toISOString(),
    };
  }

  getEvaluationsByUser(userId: string, limit = 50): EvaluationRow[] {
    return this.db.prepare(
      'SELECT * FROM evaluations WHERE user_id = ? ORDER BY created_at DESC LIMIT ?'
    ).all(userId, limit) as EvaluationRow[];
  }

  close(): void {
    this.db.close();
  }
}
