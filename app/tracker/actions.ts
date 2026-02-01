"use server";

import { ensureSchema, getDb, isPostgres } from "@/lib/db";
import type {
  DeathSavesState,
  FightState,
  FightSummary,
  TrackerRow,
  FightLogEntry,
} from "@/lib/tracker-types";
import { sql } from "@vercel/postgres";

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

async function ensureMigrations() {
  await ensureSchema();
}

export async function listFights(): Promise<FightSummary[]> {
  await ensureMigrations();
  if (isPostgres()) {
    const result = await sql`
      SELECT id, name, created_at as "createdAt", updated_at as "updatedAt"
      FROM fights
      ORDER BY id DESC
    `;
    return result.rows as FightSummary[];
  }

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
  await ensureMigrations();
  if (isPostgres()) {
    const result = await sql`
      SELECT id, name, created_at as "createdAt", updated_at as "updatedAt",
             rows_json, death_saves_json, current_attacker_index as "currentAttackerIndex",
             round, log_json
      FROM fights
      WHERE id = ${id}
    `;
    const row = result.rows[0] as
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
  await ensureMigrations();

  const fallbackName = name?.trim() || "New Fight";
  const rows = createEmptyRows(DEFAULT_ROWS_COUNT);
  const deathSaves = DEFAULT_DEATH_SAVES;

  if (isPostgres()) {
    const result = await sql`
      INSERT INTO fights (name, rows_json, death_saves_json, current_attacker_index, round, log_json)
      VALUES (
        ${fallbackName},
        ${JSON.stringify(rows)},
        ${JSON.stringify(deathSaves)},
        ${null},
        ${0},
        ${JSON.stringify([])}
      )
      RETURNING id, name, created_at as "createdAt", updated_at as "updatedAt",
                rows_json, death_saves_json, current_attacker_index as "currentAttackerIndex",
                round, log_json
    `;

    const created = result.rows[0] as FightSummary & {
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

  const db = getDb();
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
  await ensureMigrations();
  if (isPostgres()) {
    await sql`
      UPDATE fights
      SET rows_json = ${JSON.stringify(rows)},
          death_saves_json = ${JSON.stringify(deathSaves)},
          current_attacker_index = ${currentAttackerIndex},
          round = ${round},
          log_json = ${JSON.stringify(log)},
          updated_at = NOW()
      WHERE id = ${id}
    `;
    return;
  }

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
  await ensureMigrations();
  if (isPostgres()) {
    await sql`DELETE FROM fights WHERE id = ${id}`;
    return;
  }
  const db = getDb();
  db.prepare("DELETE FROM fights WHERE id = ?").run(id);
}

export async function updateFightName(id: number, name: string): Promise<void> {
  await ensureMigrations();
  if (isPostgres()) {
    await sql`
      UPDATE fights
      SET name = ${name}, updated_at = NOW()
      WHERE id = ${id}
    `;
    return;
  }
  const db = getDb();
  db.prepare(
    `UPDATE fights
     SET name = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).run(name, id);
}
