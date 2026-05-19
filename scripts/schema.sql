-- SkyGive D1 schema
-- Run with: wrangler d1 execute skygive-db --file=./scripts/schema.sql

CREATE TABLE IF NOT EXISTS users (
  slug TEXT PRIMARY KEY,
  did TEXT,
  handle TEXT,
  display_name TEXT,
  btc_address TEXT NOT NULL,
  goal_sats INTEGER DEFAULT 0,
  goal_text TEXT,
  palette_json TEXT,
  avatar_r2_key TEXT,
  admin_token TEXT NOT NULL,
  theme TEXT DEFAULT 'forest',
  fiat_currency TEXT DEFAULT 'USD',
  goal_fiat_amount REAL,
  total_received_sats INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  status TEXT DEFAULT 'active'
);

CREATE INDEX IF NOT EXISTS idx_users_did ON users(did);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

CREATE TABLE IF NOT EXISTS donations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_slug TEXT NOT NULL,
  amount_sats INTEGER NOT NULL,
  tx_hash TEXT,
  detected_at INTEGER NOT NULL,
  FOREIGN KEY (user_slug) REFERENCES users(slug)
);

CREATE INDEX IF NOT EXISTS idx_donations_user ON donations(user_slug);

CREATE TABLE IF NOT EXISTS analytics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,
  user_slug TEXT,
  metadata_json TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_analytics_user ON analytics(user_slug);
CREATE INDEX IF NOT EXISTS idx_analytics_event ON analytics(event_type);

CREATE TABLE IF NOT EXISTS logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  level TEXT NOT NULL,
  source TEXT NOT NULL,
  message TEXT NOT NULL,
  context_json TEXT,
  request_id TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_logs_level ON logs(level);
CREATE INDEX IF NOT EXISTS idx_logs_request ON logs(request_id);
