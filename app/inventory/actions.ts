"use server";

import { ensureSchema, getDb, isPostgres } from "@/lib/db";
import { sql } from "@vercel/postgres";

export type InventoryItem = {
  id: number;
  name: string;
  origin: string | null;
  estimatedPrice: string | null;
  createdAt: string;
};

async function ensureMigrations() {
  await ensureSchema();
}

export async function listInventoryItems(): Promise<InventoryItem[]> {
  await ensureMigrations();
  if (isPostgres()) {
    const result = await sql`
      SELECT id, name, origin, estimated_price as "estimatedPrice", created_at as "createdAt"
      FROM inventory_items
      ORDER BY id DESC
    `;
    return result.rows as InventoryItem[];
  }

  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, name, origin, estimated_price as estimatedPrice, created_at as createdAt
       FROM inventory_items
       ORDER BY id DESC`
    )
    .all() as InventoryItem[];
  return rows;
}

export async function createInventoryItem(
  name: string,
  origin: string,
  estimatedPrice: string
): Promise<InventoryItem> {
  await ensureMigrations();
  if (isPostgres()) {
    const trimmedName = name.trim();
    const trimmedOrigin = origin.trim();
    const trimmedPrice = estimatedPrice.trim();
    const result = await sql`
      INSERT INTO inventory_items (name, origin, estimated_price)
      VALUES (
        ${trimmedName},
        ${trimmedOrigin.length ? trimmedOrigin : null},
        ${trimmedPrice.length ? trimmedPrice : null}
      )
      RETURNING id, name, origin, estimated_price as "estimatedPrice", created_at as "createdAt"
    `;
    return result.rows[0] as InventoryItem;
  }

  const db = getDb();
  const trimmedName = name.trim();
  const trimmedOrigin = origin.trim();
  const trimmedPrice = estimatedPrice.trim();

  const result = db
    .prepare(
      `INSERT INTO inventory_items (name, origin, estimated_price)
       VALUES (?, ?, ?)`
    )
    .run(
      trimmedName,
      trimmedOrigin.length ? trimmedOrigin : null,
      trimmedPrice.length ? trimmedPrice : null
    );

  const id = Number(result.lastInsertRowid);
  const created = db
    .prepare(
      `SELECT id, name, origin, estimated_price as estimatedPrice, created_at as createdAt
       FROM inventory_items
       WHERE id = ?`
    )
    .get(id) as InventoryItem;

  return created;
}

export async function deleteInventoryItem(id: number): Promise<void> {
  await ensureMigrations();
  if (isPostgres()) {
    await sql`DELETE FROM inventory_items WHERE id = ${id}`;
    return;
  }
  const db = getDb();
  db.prepare("DELETE FROM inventory_items WHERE id = ?").run(id);
}

export async function updateInventoryItem(
  id: number,
  name: string,
  origin: string,
  estimatedPrice: string
): Promise<void> {
  await ensureMigrations();
  if (isPostgres()) {
    await sql`
      UPDATE inventory_items
      SET name = ${name},
          origin = ${origin || null},
          estimated_price = ${estimatedPrice || null}
      WHERE id = ${id}
    `;
    return;
  }
  const db = getDb();
  db.prepare(
    `UPDATE inventory_items
     SET name = ?, origin = ?, estimated_price = ?
     WHERE id = ?`
  ).run(name, origin || null, estimatedPrice || null, id);
}
