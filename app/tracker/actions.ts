"use server";

import { getDb, runMigrations } from "@/lib/db";
import type {
  DeathSavesState,
  FightState,
  FightSummary,
  TrackerRow,
  FightLogEntry,
} from "@/lib/tracker-types";

const DEFAULT_ROWS_COUNT = 0;

const DEFAULT_DEATH_SAVES: DeathSavesState = {
  cleric: { successes: [false, false, false], failures: [false, false, false] },
  fighter: { successes: [false, false, false], failures: [false, false, false] },
  rogue: { successes: [false, false, false], failures: [false, false, false] },
  wizard: { successes: [false, false, false], failures: [false, false, false] },
};

function createEmptyRows(count: number): TrackerRow[] {
  return Array.from({ length: count }, () => ({
    initiative: "",
    combatant: "",
    hp: "",
    conditions: "",
  }));
}

function ensureMigrations() {
  runMigrations();
}

export async function listFights(): Promise<FightSummary[]> {
  ensureMigrations();
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, name, created_at as createdAt, updated_at as updatedAt
       FROM fights
       ORDER BY id DESC`
    )
    .all() as FightSummary[];
  return rows;
}

export async function getFight(id: number): Promise<FightState | null> {
  ensureMigrations();
  const db = getDb();
  const row = db
    .prepare(
      `SELECT id, name, created_at as createdAt, updated_at as updatedAt, rows_json, death_saves_json,
              current_attacker_index as currentAttackerIndex, round, log_json
       FROM fights
       WHERE id = ?`
    )
    .get(id) as
    | (FightSummary & {
        rows_json: string;
        death_saves_json: string;
        currentAttackerIndex: number | null;
        round: number;
        log_json: string;
      })
    | undefined;

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    rows: JSON.parse(row.rows_json) as TrackerRow[],
    deathSaves: JSON.parse(row.death_saves_json) as DeathSavesState,
    currentAttackerIndex: row.currentAttackerIndex ?? null,
    round: row.round ?? 0,
    log: JSON.parse(row.log_json ?? "[]") as FightLogEntry[],
  };
}

export async function createFight(name?: string): Promise<FightState> {
  ensureMigrations();
  const db = getDb();

  const fallbackName = name?.trim() || "New Fight";
  const rows = createEmptyRows(DEFAULT_ROWS_COUNT);
  const deathSaves = DEFAULT_DEATH_SAVES;

  const result = db
    .prepare(
      `INSERT INTO fights (name, rows_json, death_saves_json, current_attacker_index, round)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(
      fallbackName,
      JSON.stringify(rows),
      JSON.stringify(deathSaves),
      null,
      0
    );

  const id = Number(result.lastInsertRowid);
  const created = db
    .prepare(
      `SELECT id, name, created_at as createdAt, updated_at as updatedAt, rows_json, death_saves_json,
              current_attacker_index as currentAttackerIndex, round, log_json
       FROM fights
       WHERE id = ?`
    )
    .get(id) as FightSummary & {
    rows_json: string;
    death_saves_json: string;
    currentAttackerIndex: number | null;
    round: number;
    log_json: string;
  };

  return {
    id: created.id,
    name: created.name,
    createdAt: created.createdAt,
    updatedAt: created.updatedAt,
    rows: JSON.parse(created.rows_json) as TrackerRow[],
    deathSaves: JSON.parse(created.death_saves_json) as DeathSavesState,
    currentAttackerIndex: created.currentAttackerIndex ?? null,
    round: created.round ?? 0,
    log: JSON.parse(created.log_json ?? "[]") as FightLogEntry[],
  };
}

export async function saveFightState(
  id: number,
  rows: TrackerRow[],
  deathSaves: DeathSavesState,
  currentAttackerIndex: number | null,
  round: number,
  log: FightLogEntry[]
): Promise<void> {
  ensureMigrations();
  const db = getDb();

  db.prepare(
    `UPDATE fights
     SET rows_json = ?, death_saves_json = ?, current_attacker_index = ?, round = ?, log_json = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).run(
    JSON.stringify(rows),
    JSON.stringify(deathSaves),
    currentAttackerIndex,
    round,
    JSON.stringify(log),
    id
  );
}

export async function deleteFight(id: number): Promise<void> {
  ensureMigrations();
  const db = getDb();
  db.prepare("DELETE FROM fights WHERE id = ?").run(id);
}

export async function updateFightName(id: number, name: string): Promise<void> {
  ensureMigrations();
  const db = getDb();
  db.prepare(
    `UPDATE fights
     SET name = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).run(name, id);
}
