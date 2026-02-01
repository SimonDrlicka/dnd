import "server-only";

import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { sql } from "@vercel/postgres";

const DB_PATH = path.join(process.cwd(), "data", "app.db");

let db: Database.Database | null = null;

function normalizePostgresEnv() {
  if (process.env.POSTGRES_URL) return;
  if (process.env.DATABASE_URL) {
    process.env.POSTGRES_URL = process.env.DATABASE_URL;
    return;
  }
  if (process.env.POSTGRES_PRISMA_URL) {
    process.env.POSTGRES_URL = process.env.POSTGRES_PRISMA_URL;
    return;
  }
  if (process.env.POSTGRES_URL_NON_POOLING) {
    process.env.POSTGRES_URL = process.env.POSTGRES_URL_NON_POOLING;
    return;
  }
  if (process.env.DATABASE_URL_UNPOOLED) {
    process.env.POSTGRES_URL = process.env.DATABASE_URL_UNPOOLED;
    return;
  }
  if (process.env.POSTGRES_URL_NO_SSL) {
    process.env.POSTGRES_URL = process.env.POSTGRES_URL_NO_SSL;
  }
}

export function isPostgres() {
  normalizePostgresEnv();
  return Boolean(process.env.POSTGRES_URL || process.env.DATABASE_URL);
}

export function getDb() {
  if (isPostgres()) {
    throw new Error("SQLite db is not available when using Postgres.");
  }

  if (!db) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
  }

  return db;
}

async function ensurePostgresSchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS fights (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      rows_json TEXT NOT NULL,
      death_saves_json TEXT NOT NULL,
      current_attacker_index INTEGER,
      round INTEGER NOT NULL DEFAULT 0,
      log_json TEXT NOT NULL DEFAULT '[]'
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS inventory_items (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      origin TEXT,
      estimated_price TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;
}

export async function ensureSchema() {
  if (isPostgres()) {
    await ensurePostgresSchema();
    return;
  }

  runMigrations();
}

export function runMigrations() {
  if (isPostgres()) {
    return;
  }

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

    const fileSql = fs.readFileSync(path.join(migrationsDir, file), "utf8");

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
      if (fileSql.trim()) {
        database.exec(fileSql);
      }
      database.prepare("INSERT INTO _migrations (filename) VALUES (?)").run(file);
      database.exec("COMMIT");
    } catch (error) {
      database.exec("ROLLBACK");
      throw error;
    }
  }
}
