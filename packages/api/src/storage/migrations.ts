/** SQL schema for the Sightglass hosted API server database */

export const MIGRATIONS = [
  {
    version: 1,
    sql: `
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL,
        api_key TEXT UNIQUE
      );

      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        agent TEXT NOT NULL,
        action TEXT NOT NULL,
        classification TEXT,
        confidence REAL,
        package_name TEXT,
        package_version TEXT,
        package_manager TEXT,
        is_install INTEGER DEFAULT 0,
        is_search INTEGER DEFAULT 0,
        abandoned INTEGER DEFAULT 0,
        timestamp TEXT NOT NULL,
        received_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sessions_aggregate (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        agent TEXT NOT NULL,
        total_events INTEGER DEFAULT 0,
        install_events INTEGER DEFAULT 0,
        classification_distribution TEXT,
        risk_summary TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER PRIMARY KEY
      );

      CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);
      CREATE INDEX IF NOT EXISTS idx_events_package_name ON events(package_name);
      CREATE INDEX IF NOT EXISTS idx_events_classification ON events(classification);
      CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);

      CREATE INDEX IF NOT EXISTS idx_sessions_aggregate_user_id ON sessions_aggregate(user_id);

      INSERT OR IGNORE INTO schema_version (version) VALUES (1);
    `,
  },
  {
    version: 2,
    sql: `
      ALTER TABLE events ADD COLUMN category TEXT;
      ALTER TABLE events ADD COLUMN is_custom_build INTEGER DEFAULT 0;
      ALTER TABLE events ADD COLUMN model TEXT;
      ALTER TABLE events ADD COLUMN model_version TEXT;

      CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
      CREATE INDEX IF NOT EXISTS idx_events_model ON events(model);

      INSERT OR IGNORE INTO schema_version (version) VALUES (2);
    `,
  },
];
