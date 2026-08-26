'use strict';

// Tables synced to/from Supabase. ORDER MATTERS for FK constraints:
// parent tables must appear before child tables.
// orders/order_items excluded: Supabase schema lacks updated_at.
const TABLES = [
  'staff',
  'properties',
  'rooms',
  'guests',
  'tour_agencies',      // before tour_guides and groups
  'tour_guides',        // before groups
  'groups',             // before reservations (reservations.group_id → groups.id)
  'shifts',
  'reservations',
  'reservation_guests',
  'transactions',
  'menu_categories',
  'menu_items',
  'menu_formulas',
  'rotation_templates',
  'shift_schedules',
  'time_off_requests',
];

// Columns that should not be pushed to Supabase
const SKIP_PUSH_COLS = new Set(['synced_at']);

class SyncEngine {
  /**
   * @param {object} adapter  - platform-specific DB adapter
   * @param {object} supabase - @supabase/supabase-js client
   */
  constructor(adapter, supabase) {
    this.adapter  = adapter;
    this.supabase = supabase;
  }

  // ── Push: local → Supabase ───────────────────────────────────────────────

  async pushTable(table) {
    const rows = await this.adapter.getUnsynced(table);
    if (!rows.length) return 0;

    const payload = rows.map(row => {
      const out = {};
      for (const [k, v] of Object.entries(row)) {
        if (!SKIP_PUSH_COLS.has(k)) out[k] = v;
      }
      return out;
    });

    const { error } = await this.supabase
      .from(table)
      .upsert(payload, { onConflict: 'id' });

    if (!error) {
      const ids = rows.map(r => r.id);
      await this.adapter.markSynced(table, ids);
      return ids.length;
    }

    // FK violation: batch failed because a referenced row isn't in Supabase yet.
    // Fall back to per-row upsert and skip rows that can't be pushed now.
    // They'll be retried on the next sync cycle once their dependencies are synced.
    const isFK = error.message && (
      error.message.includes('foreign key constraint') ||
      error.message.includes('violates foreign key')
    );
    if (isFK) {
      console.warn(`[sync] ${table} batch FK violation — retrying row-by-row`);
      let pushed = 0;
      const successIds = [];
      for (let i = 0; i < payload.length; i++) {
        const { error: rowErr } = await this.supabase
          .from(table)
          .upsert([payload[i]], { onConflict: 'id' });
        if (!rowErr) {
          successIds.push(rows[i].id);
          pushed++;
        } else {
          console.warn(`[sync] skip ${table}/${rows[i].id}: ${rowErr.message}`);
        }
      }
      if (successIds.length) await this.adapter.markSynced(table, successIds);
      return pushed;
    }

    throw new Error(`push ${table}: ${error.message}`);
  }

  // ── Pull: Supabase → local ───────────────────────────────────────────────

  async pullTable(table, since) {
    let query = this.supabase.from(table).select('*');
    if (since) {
      query = query.gt('updated_at', since);
    }
    const { data, error } = await query;
    if (error) throw new Error(`pull ${table}: ${error.message}`);
    if (!data || !data.length) return 0;

    for (const row of data) {
      await this.adapter.upsertLocal(table, row);
    }
    return data.length;
  }

  // ── Full sync cycle ──────────────────────────────────────────────────────

  async sync() {
    const since = await this.adapter.getSetting('last_supabase_pull');
    const now   = new Date().toISOString();

    let pushed = 0;
    let pulled = 0;
    const errors = [];

    // Push first so local changes reach Supabase before we pull
    for (const table of TABLES) {
      try {
        const n = await this.pushTable(table);
        pushed += n;
        if (n > 0) console.log(`[sync] push ${table}: ${n} rows`);
      } catch (e) {
        console.error(`[sync] push ${table} FAILED:`, e.message);
        // "Table doesn't exist in Supabase" is a warning, not a fatal sync error
        if (!e.message.includes('relation') && !e.message.includes('does not exist')) {
          errors.push(`push ${table}: ${e.message}`);
        } else {
          console.warn(`[sync] push ${table}: table not in Supabase schema — skipping`);
        }
      }
    }

    for (const table of TABLES) {
      try {
        const n = await this.pullTable(table, since);
        pulled += n;
        if (n > 0) console.log(`[sync] pull ${table}: ${n} rows`);
      } catch (e) {
        console.error(`[sync] pull ${table} FAILED:`, e.message);
        if (!e.message.includes('relation') && !e.message.includes('does not exist')) {
          errors.push(`pull ${table}: ${e.message}`);
        }
      }
    }

    await this.adapter.setSetting('last_supabase_pull', now);

    console.log(`[sync] done — pushed: ${pushed}, pulled: ${pulled}, errors: ${errors.length}`);
    return { pushed, pulled, errors, at: now };
  }
}

module.exports = { SyncEngine, TABLES };
