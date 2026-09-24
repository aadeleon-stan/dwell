import type { SQLiteDatabase } from 'expo-sqlite';
import type { Entry, Category } from '../types/entry';

export async function createEntry(
  db: SQLiteDatabase,
  body: string,
  category: Category,
  prompt: string | null,
): Promise<Entry> {
  const id = generateId();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO entries (id, body, category, prompt, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
    [id, body, category, prompt, now, now],
  );
  return { id, body, category, prompt, created_at: now, updated_at: now, deleted_at: null };
}

export async function updateEntry(
  db: SQLiteDatabase,
  id: string,
  body: string,
  category: Category,
): Promise<void> {
  const now = new Date().toISOString();
  await db.runAsync(
    `UPDATE entries SET body = ?, category = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL`,
    [body, category, now, id],
  );
}

export async function softDelete(db: SQLiteDatabase, id: string): Promise<void> {
  const now = new Date().toISOString();
  await db.runAsync(
    `UPDATE entries SET deleted_at = ?, updated_at = ? WHERE id = ?`,
    [now, now, id],
  );
}

export async function getEntryById(db: SQLiteDatabase, id: string): Promise<Entry | null> {
  return db.getFirstAsync<Entry>(
    `SELECT * FROM entries WHERE id = ? AND deleted_at IS NULL`,
    [id],
  );
}

export async function getEntriesByDate(db: SQLiteDatabase, localDate: string): Promise<Entry[]> {
  // localDate is "YYYY-MM-DD"; we query entries whose created_at falls on that local date
  return db.getAllAsync<Entry>(
    `SELECT * FROM entries WHERE deleted_at IS NULL AND date(created_at, 'localtime') = ? ORDER BY created_at DESC`,
    [localDate],
  );
}

export async function getAllEntriesGrouped(db: SQLiteDatabase): Promise<Entry[]> {
  return db.getAllAsync<Entry>(
    `SELECT * FROM entries WHERE deleted_at IS NULL ORDER BY created_at DESC`,
  );
}

export async function hasEntryForDate(db: SQLiteDatabase, localDate: string): Promise<boolean> {
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM entries WHERE deleted_at IS NULL AND date(created_at, 'localtime') = ?`,
    [localDate],
  );
  return (row?.count ?? 0) > 0;
}

export async function getDistinctWrittenDates(db: SQLiteDatabase): Promise<string[]> {
  const rows = await db.getAllAsync<{ d: string }>(
    `SELECT DISTINCT date(created_at, 'localtime') as d FROM entries WHERE deleted_at IS NULL ORDER BY d DESC`,
  );
  return rows.map((r) => r.d);
}

/** Every row, soft-deleted included, for backups. */
export async function exportAllEntries(db: SQLiteDatabase): Promise<Entry[]> {
  return db.getAllAsync<Entry>(`SELECT * FROM entries ORDER BY created_at`);
}

/**
 * Insert or overwrite entries by id, so importing the same backup twice is
 * harmless. Returns how many rows were written.
 */
export async function importEntries(db: SQLiteDatabase, entries: Entry[]): Promise<number> {
  const valid = entries.filter(
    (e) =>
      typeof e.id === 'string' &&
      typeof e.body === 'string' &&
      (e.category === 'observation' || e.category === 'reflection') &&
      typeof e.created_at === 'string' &&
      typeof e.updated_at === 'string',
  );
  await db.withTransactionAsync(async () => {
    for (const e of valid) {
      await db.runAsync(
        `INSERT OR REPLACE INTO entries (id, body, category, prompt, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [e.id, e.body, e.category, e.prompt ?? null, e.created_at, e.updated_at, e.deleted_at ?? null],
      );
    }
  });
  return valid.length;
}

function generateId(): string {
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
