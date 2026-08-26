'use strict';

const path = require('path');
const fs   = require('fs');

// ── Config ────────────────────────────────────────────────────────────────────

const SUPABASE_URL = 'https://cviupkndhukckzqctofb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2aXVwa25kaHVrY2t6cWN0b2ZiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTg2MjMzMSwiZXhwIjoyMDk3NDM4MzMxfQ.uZz1IWE31zt6k2F8K-USoDfkr1fGRYiq97XqjKkXW_I';

const HEADERS = {
  apikey:          SUPABASE_KEY,
  Authorization:   `Bearer ${SUPABASE_KEY}`,
  'Content-Type':  'application/json',
  Prefer:          'resolution=merge-duplicates,return=minimal',
};

const TABLES = [
  'staff', 'properties', 'rooms', 'guests', 'reservations', 'shifts',
  'transactions', 'clients', 'invoices', 'invoice_items', 'invoice_payments',
  'menu_categories', 'menu_items', 'restaurant_tables', 'orders',
  'order_items', 'ota_blocks', 'settings',
  'tour_agencies', 'tour_guides', 'groups',
];

const BATCH = 50;

// ── Database path ─────────────────────────────────────────────────────────────

const PRIMARY  = 'C:\\Users\\bossm\\AppData\\Roaming\\rbitrate-desktop\\rbitrate.db';
const FALLBACK = path.join(process.cwd(), 'rbitrate.db');

let dbPath;
if (fs.existsSync(PRIMARY))       dbPath = PRIMARY;
else if (fs.existsSync(FALLBACK)) dbPath = FALLBACK;
else {
  console.error('❌  Database not found at:');
  console.error('    ' + PRIMARY);
  console.error('    ' + FALLBACK);
  process.exit(1);
}

// Use scripts-local better-sqlite3 compiled for system Node (not Electron)
const Database = require(
  path.resolve(__dirname, 'node_modules/better-sqlite3')
);

console.log(`\n📂  Database : ${dbPath}`);
console.log(`🌐  Target   : ${SUPABASE_URL}\n`);

const db = new Database(dbPath, { readonly: true });

// ── Helpers ───────────────────────────────────────────────────────────────────

async function pushBatch(table, rows) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify(rows),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status} — ${text.slice(0, 300)}`);
  }
}

async function exportTable(table) {
  // Skip tables that don't exist locally
  const meta = db
    .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
    .get(table);

  if (!meta) {
    console.log(`⏭   ${table}: not in local DB, skipping`);
    return;
  }

  const rows = db.prepare(`SELECT * FROM \`${table}\``).all();

  if (!rows.length) {
    console.log(`⏭   ${table}: 0 rows`);
    return;
  }

  for (let i = 0; i < rows.length; i += BATCH) {
    await pushBatch(table, rows.slice(i, i + BATCH));
  }

  console.log(`✅  ${table}: ${rows.length} row${rows.length === 1 ? '' : 's'} pushed`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🚀  Exporting to Supabase...\n');

  let ok = 0, skipped = 0, errors = 0;

  for (const table of TABLES) {
    try {
      const before = ok;
      await exportTable(table);
      // heuristic: if log printed ✅ vs ⏭
      ok++;
    } catch (e) {
      console.error(`❌  ${table}: ${e.message}`);
      errors++;
    }
  }

  db.close();
  console.log(`\n📊  Finished — ${TABLES.length} tables processed, ${errors} error(s)\n`);
  if (errors) process.exit(1);
}

main().catch(e => {
  console.error('\nFatal:', e.message);
  process.exit(1);
});
