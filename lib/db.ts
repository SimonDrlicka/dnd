import "server-only";

import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const DB_PATH = path.join(process.cwd(), "data", "app.db");

let db: Database.Database | null = null;

export function getDb() {
  if (!db) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
  }

  return db;
}

export function runMigrations() {
  const database = getDb();
  const migrationsDir = path.join(process.cwd(), "migrations");

  if (!fs.existsSync(migrationsDir)) {
    return;
  }

  database.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const files = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  const appliedRows = database
    .prepare("SELECT filename FROM _migrations")
    .all() as Array<{ filename: string }>;
  const applied = new Set(appliedRows.map((row) => row.filename));

  for (const file of files) {
    if (applied.has(file)) {
      continue;
    }

    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");

    if (file === "0002_add_combat_state.sql") {
      const columns = database
        .prepare("PRAGMA table_info(fights)")
        .all() as Array<{ name: string }>;
      const names = new Set(columns.map((col) => col.name));
      const hasColumns =
        names.has("current_attacker_index") &&
        names.has("round") &&
        names.has("log_json");
      if (hasColumns) {
        database
          .prepare("INSERT INTO _migrations (filename) VALUES (?)")
          .run(file);
        continue;
      }
    }

    database.exec("BEGIN");
    try {
      if (sql.trim()) {
        database.exec(sql);
      }
      database.prepare("INSERT INTO _migrations (filename) VALUES (?)").run(file);
      database.exec("COMMIT");
    } catch (error) {
      database.exec("ROLLBACK");
      throw error;
    }
  }
}
