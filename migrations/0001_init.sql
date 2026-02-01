CREATE TABLE IF NOT EXISTS fights (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  rows_json TEXT NOT NULL,
  death_saves_json TEXT NOT NULL,
  current_attacker_index INTEGER,
  round INTEGER NOT NULL DEFAULT 1,
  log_json TEXT NOT NULL DEFAULT '[]'
);

CREATE INDEX IF NOT EXISTS fights_created_at_idx ON fights (created_at);

CREATE TABLE IF NOT EXISTS inventory_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  origin TEXT,
  estimated_price TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS inventory_items_created_at_idx ON inventory_items (created_at);
