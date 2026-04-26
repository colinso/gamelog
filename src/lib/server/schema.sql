-- GameLog Database Schema

CREATE TABLE IF NOT EXISTS games (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  platform TEXT NOT NULL,
  status TEXT NOT NULL,
  hrs_in REAL DEFAULT 0,
  ttb REAL DEFAULT 0,
  hrs_left REAL DEFAULT 0,
  rating INTEGER,           -- null or 1-5
  coop INTEGER DEFAULT 0,   -- boolean (0/1)
  notes TEXT,
  cover_url TEXT,
  steam_app_id INTEGER,
  epic_app_name TEXT,
  switch_app_id TEXT,
  hidden INTEGER DEFAULT 0, -- hide from UI but keep in DB
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
CREATE INDEX IF NOT EXISTS idx_games_steam_app_id ON games(steam_app_id);
CREATE INDEX IF NOT EXISTS idx_games_epic_app_name ON games(epic_app_name);
CREATE INDEX IF NOT EXISTS idx_games_switch_app_id ON games(switch_app_id);
CREATE INDEX IF NOT EXISTS idx_games_hidden ON games(hidden);
CREATE INDEX IF NOT EXISTS idx_games_platform ON games(platform);

-- Trigger to auto-update updated_at
CREATE TRIGGER IF NOT EXISTS update_games_timestamp
AFTER UPDATE ON games
BEGIN
  UPDATE games SET updated_at = datetime('now') WHERE id = NEW.id;
END;
