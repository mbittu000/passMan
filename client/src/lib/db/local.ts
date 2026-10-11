import * as SQLite from 'expo-sqlite';

import { RemoteItem } from '@/lib/api/vault';

/**
 * Local, on-device cache. It mirrors the server shape exactly: only ciphertext
 * and non-secret sync metadata are stored. Decryption happens in memory with
 * the vault key, so the cache at rest stays encrypted.
 */

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync('passman.db');
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS items (
          id          TEXT PRIMARY KEY NOT NULL,
          ciphertext  TEXT NOT NULL,
          type_hint   TEXT,
          version     INTEGER NOT NULL DEFAULT 1,
          deleted     INTEGER NOT NULL DEFAULT 0,
          updated_at  INTEGER NOT NULL,
          created_at  INTEGER NOT NULL,
          dirty       INTEGER NOT NULL DEFAULT 0
        );
        CREATE INDEX IF NOT EXISTS idx_items_updated ON items(updated_at);
        CREATE TABLE IF NOT EXISTS meta (
          key   TEXT PRIMARY KEY NOT NULL,
          value TEXT NOT NULL
        );
      `);
      return db;
    })();
  }
  return dbPromise;
}

type ItemRow = {
  id: string;
  ciphertext: string;
  type_hint: string | null;
  version: number;
  deleted: number;
  updated_at: number;
  created_at: number;
  dirty: number;
};

function toRemote(row: ItemRow): RemoteItem {
  return {
    id: row.id,
    ciphertext: row.ciphertext,
    typeHint: row.type_hint,
    version: row.version,
    deleted: row.deleted === 1,
    updatedAt: row.updated_at,
    createdAt: row.created_at,
  };
}

export async function allLocalItems(): Promise<RemoteItem[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<ItemRow>('SELECT * FROM items ORDER BY updated_at DESC');
  return rows.map(toRemote);
}

export async function dirtyItems(): Promise<RemoteItem[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<ItemRow>('SELECT * FROM items WHERE dirty = 1');
  return rows.map(toRemote);
}

export async function upsertLocal(item: RemoteItem, dirty: boolean): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO items (id, ciphertext, type_hint, version, deleted, updated_at, created_at, dirty)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       ciphertext = excluded.ciphertext,
       type_hint  = excluded.type_hint,
       version    = excluded.version,
       deleted    = excluded.deleted,
       updated_at = excluded.updated_at,
       dirty      = excluded.dirty
     WHERE excluded.updated_at >= items.updated_at OR items.dirty = 0`,
    [
      item.id,
      item.ciphertext,
      item.typeHint ?? null,
      item.version,
      item.deleted ? 1 : 0,
      item.updatedAt,
      item.createdAt,
      dirty ? 1 : 0,
    ],
  );
}

export async function upsertLocalMany(items: RemoteItem[], dirty: boolean): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const item of items) {
      await db.runAsync(
        `INSERT INTO items (id, ciphertext, type_hint, version, deleted, updated_at, created_at, dirty)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           ciphertext = excluded.ciphertext,
           type_hint  = excluded.type_hint,
           version    = excluded.version,
           deleted    = excluded.deleted,
           updated_at = excluded.updated_at,
           dirty      = excluded.dirty
         WHERE excluded.updated_at >= items.updated_at OR items.dirty = 0`,
        [
          item.id,
          item.ciphertext,
          item.typeHint ?? null,
          item.version,
          item.deleted ? 1 : 0,
          item.updatedAt,
          item.createdAt,
          dirty ? 1 : 0,
        ],
      );
    }
  });
}

export async function markClean(ids: string[]): Promise<void> {
  if (!ids.length) return;
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const id of ids) {
      await db.runAsync('UPDATE items SET dirty = 0 WHERE id = ?', [id]);
    }
  });
}

export async function deleteLocal(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM items WHERE id = ?', [id]);
}

export async function clearLocal(): Promise<void> {
  const db = await getDb();
  await db.execAsync('DELETE FROM items; DELETE FROM meta;');
}

export async function getMeta(key: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM meta WHERE key = ?', [key]);
  return row?.value ?? null;
}

export async function setMeta(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO meta (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, value],
  );
}

export const LAST_SYNC_KEY = 'last_sync_at';