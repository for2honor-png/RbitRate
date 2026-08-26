'use strict';

/**
 * Desktop sync adapter – wraps better-sqlite3 for use by SyncEngine.
 */
class DesktopAdapter {
  /** @param {import('./db.cjs')} db */
  constructor(db) {
    this.db = db;
    this._colCache = {};
  }

  /**
   * Returns the set of column names for a local table (cached per session).
   */
  _localCols(table) {
    if (!this._colCache[table]) {
      const info = this.db.prepare(`PRAGMA table_info(${table})`).all();
      this._colCache[table] = new Set(info.map(c => c.name));
    }
    return this._colCache[table];
  }

  /**
   * Returns rows that haven't been pushed to Supabase yet.
   * Handles tables that lack synced_at or updated_at gracefully.
   */
  async getUnsynced(table) {
    try {
      return this.db.prepare(
        `SELECT * FROM ${table}
         WHERE synced_at IS NULL OR synced_at < updated_at
         LIMIT 500`
      ).all();
    } catch (e) {
      const msg = e.message || '';
      if (msg.includes('no such column: updated_at')) {
        // Table has synced_at but no updated_at — return only unsynced
        try {
          return this.db.prepare(
            `SELECT * FROM ${table} WHERE synced_at IS NULL LIMIT 500`
          ).all();
        } catch (e2) {
          console.warn(`[sync] getUnsynced ${table} fallback failed: ${e2.message}`);
          return [];
        }
      }
      if (msg.includes('no such column: synced_at') || msg.includes('no such column')) {
        // Table has no sync tracking — skip silently
        console.warn(`[sync] getUnsynced ${table}: missing column (${msg}) — skipping`);
        return [];
      }
      throw e;
    }
  }

  /**
   * Stamps synced_at = now() for the given ids.
   */
  async markSynced(table, ids) {
    if (!ids.length) return;
    // Skip if table has no synced_at column
    const cols = this._localCols(table);
    if (!cols.has('synced_at')) return;
    const placeholders = ids.map(() => '?').join(',');
    const now = new Date().toISOString();
    this.db.prepare(
      `UPDATE ${table} SET synced_at = ? WHERE id IN (${placeholders})`
    ).run(now, ...ids);
  }

  /**
   * Upserts a remote row into the local SQLite table.
   * Only inserts columns that exist locally (protects against schema drift).
   * Skips update if local row is newer than the incoming row.
   */
  async upsertLocal(table, row) {
    try {
      const localCols = this._localCols(table);
      // Filter to only columns that exist in local schema
      const filtered = {};
      for (const [k, v] of Object.entries(row)) {
        if (localCols.has(k)) filtered[k] = v;
      }
      const cols = Object.keys(filtered);
      if (!cols.length) return;

      const placeholders = cols.map(() => '?').join(', ');
      const updates = cols
        .filter(c => c !== 'id')
        .map(c => `${c} = excluded.${c}`)
        .join(', ');

      const hasUpdatedAt = localCols.has('updated_at') && filtered.updated_at !== undefined;
      const whereClause = hasUpdatedAt
        ? `WHERE excluded.updated_at > ${table}.updated_at OR ${table}.updated_at IS NULL`
        : '';

      const sql = `
        INSERT INTO ${table} (${cols.join(', ')})
        VALUES (${placeholders})
        ON CONFLICT(id) DO UPDATE SET ${updates}
        ${whereClause}
      `;
      this.db.prepare(sql).run(...cols.map(c => filtered[c] ?? null));
    } catch (e) {
      console.error(`[sync] upsertLocal ${table}:`, e.message);
    }
  }

  async getSetting(key) {
    const row = this.db.prepare(
      `SELECT value FROM settings WHERE key = ?`
    ).get(key);
    return row ? row.value : null;
  }

  async setSetting(key, value) {
    this.db.prepare(
      `INSERT INTO settings (key, value, updated_at)
       VALUES (?, ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
    ).run(key, value);
  }
}

module.exports = { DesktopAdapter };
