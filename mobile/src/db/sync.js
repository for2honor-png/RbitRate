import { sbSelect, sbUpsert, isOnline } from './supabase-rest';

const TABLES = [
  'staff', 'properties', 'rooms', 'guests', 'reservations',
  'shifts', 'transactions', 'clients', 'invoices', 'invoice_items',
  'invoice_payments', 'menu_categories', 'menu_items',
  'restaurant_tables', 'orders', 'order_items', 'ota_blocks',
];

export async function syncNow(db) {
  const online = await isOnline();
  if (!online) return { ok: false, reason: 'offline' };

  let pushed = 0, pulled = 0;

  // PUSH: send unsynced local rows to Supabase
  for (const table of TABLES) {
    try {
      const rows = await db.getAllAsync(
        `SELECT * FROM ${table} WHERE synced_at IS NULL OR updated_at > synced_at LIMIT 200`
      );
      if (rows.length) {
        const ok = await sbUpsert(table, rows);
        if (ok) {
          const now = new Date().toISOString();
          for (const row of rows) {
            await db.runAsync(
              `UPDATE ${table} SET synced_at = ? WHERE id = ?`, [now, row.id]
            );
          }
          pushed += rows.length;
        }
      }
    } catch (e) {
      console.log('[sync] push error', table, e.message);
    }
  }

  // PULL: get new rows from Supabase since last pull
  try {
    const lastPull = await db.getFirstAsync(
      `SELECT value FROM settings WHERE key = 'last_pull'`
    );
    const since = lastPull?.value || '2020-01-01T00:00:00Z';

    for (const table of TABLES) {
      try {
        const rows = await sbSelect(table, since);
        for (const row of rows) {
          const cols = Object.keys(row);
          const placeholders = cols.map(() => '?').join(',');
          const updates = cols.filter(c => c !== 'id').map(c => `${c}=excluded.${c}`).join(',');
          await db.runAsync(
            `INSERT INTO ${table} (${cols.join(',')}) VALUES (${placeholders})
             ON CONFLICT(id) DO UPDATE SET ${updates}
             WHERE excluded.updated_at > ${table}.updated_at`,
            cols.map(c => row[c])
          );
        }
        pulled += rows.length;
      } catch (e) {
        console.log('[sync] pull error', table, e.message);
      }
    }

    await db.runAsync(
      `INSERT OR REPLACE INTO settings (key, value) VALUES ('last_pull', ?)`,
      [new Date().toISOString()]
    );
  } catch (e) {
    console.log('[sync] pull phase error', e.message);
  }

  return { ok: true, pushed, pulled };
}
