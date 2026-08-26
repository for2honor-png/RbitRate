import * as SQLite from 'expo-sqlite';

let _db = null;
let _dbError = null;

// Null-safe db proxy returned when initialization fails
const NULL_DB = {
  getAllAsync:   async () => [],
  getFirstAsync: async () => null,
  runAsync:      async () => ({ changes: 0 }),
  execAsync:     async () => {},
};

export async function getDb() {
  if (_db) return _db;
  if (_dbError) return NULL_DB;
  try {
    const db = await SQLite.openDatabaseAsync('rbitrate.db');
    // Don't enable foreign_keys — it causes FK violations during sync upserts
    await db.execAsync('PRAGMA journal_mode = WAL;');
    await createSchema(db);
    _db = db;
    return _db;
  } catch (e) {
    _dbError = e;
    console.error('[db] init failed:', e.message);
    return NULL_DB;
  }
}

const TABLES = [
  `CREATE TABLE IF NOT EXISTS staff (
    id TEXT PRIMARY KEY, full_name TEXT NOT NULL, role TEXT DEFAULT 'receptionist',
    pin_code TEXT NOT NULL, active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')),
    deleted_at TEXT, synced_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS properties (
    id TEXT PRIMARY KEY, display_name TEXT NOT NULL, logo_path TEXT,
    type TEXT DEFAULT 'hotel', address TEXT, city TEXT DEFAULT 'Chefchaouen',
    phone TEXT, email TEXT, website TEXT, ice TEXT, if_number TEXT, rc TEXT,
    bank_name TEXT, bank_rib TEXT, vat_rate REAL DEFAULT 20,
    restaurant_mode TEXT DEFAULT 'guests', restaurant_active INTEGER DEFAULT 0,
    restaurant_name TEXT, otas TEXT DEFAULT '[]', active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')),
    deleted_at TEXT, synced_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY, property_id TEXT NOT NULL, room_number TEXT NOT NULL,
    room_name TEXT, room_type TEXT DEFAULT 'Standard', floor INTEGER DEFAULT 1,
    capacity INTEGER DEFAULT 2, price_per_night REAL DEFAULT 0,
    status TEXT DEFAULT 'available', notes TEXT,
    created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')),
    deleted_at TEXT, synced_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS guests (
    id TEXT PRIMARY KEY, last_name TEXT NOT NULL, first_name TEXT NOT NULL,
    date_of_birth TEXT, place_of_birth TEXT, nationality TEXT, profession TEXT,
    permanent_address TEXT, document_type TEXT, document_number TEXT,
    document_issued_at TEXT, document_issued_date TEXT, phone TEXT, email TEXT,
    tag TEXT DEFAULT 'regular', notes TEXT, total_stays INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')),
    deleted_at TEXT, synced_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS shifts (
    id TEXT PRIMARY KEY, staff_id TEXT NOT NULL, property_id TEXT NOT NULL,
    status TEXT DEFAULT 'open', opened_at TEXT DEFAULT (datetime('now')), closed_at TEXT,
    opening_cash REAL NOT NULL DEFAULT 0, closing_cash REAL, expected_cash REAL,
    discrepancy REAL, notes TEXT,
    created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')),
    deleted_at TEXT, synced_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY, shift_id TEXT NOT NULL, property_id TEXT, reservation_id TEXT,
    type TEXT NOT NULL, category TEXT NOT NULL, amount REAL NOT NULL,
    payment_method TEXT, description TEXT, recorded_by TEXT,
    created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')),
    deleted_at TEXT, synced_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS reservations (
    id TEXT PRIMARY KEY, property_id TEXT, room_id TEXT, guest_id TEXT,
    shift_id TEXT, payment_shift_id TEXT,
    check_in_date TEXT NOT NULL, check_out_date TEXT NOT NULL,
    arrival_time TEXT, nights INTEGER, coming_from TEXT, going_to TEXT,
    morocco_entry_number TEXT, adults INTEGER DEFAULT 1, children INTEGER DEFAULT 0,
    price_per_night REAL, total_amount REAL, paid_amount REAL DEFAULT 0,
    payment_type TEXT DEFAULT 'checkout', status TEXT DEFAULT 'checked_in',
    channel TEXT DEFAULT 'direct', notes TEXT,
    created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')),
    deleted_at TEXT, synced_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS menu_categories (
    id TEXT PRIMARY KEY, property_id TEXT, name_fr TEXT NOT NULL, name_ar TEXT, name_en TEXT,
    sort_order INTEGER DEFAULT 0, active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')),
    deleted_at TEXT, synced_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS menu_items (
    id TEXT PRIMARY KEY, category_id TEXT NOT NULL, name_fr TEXT NOT NULL,
    name_ar TEXT, name_en TEXT, description_fr TEXT, description_ar TEXT,
    price REAL NOT NULL DEFAULT 0, image_path TEXT, available INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')),
    deleted_at TEXT, synced_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS restaurant_tables (
    id TEXT PRIMARY KEY, property_id TEXT, label TEXT NOT NULL, qr_code TEXT,
    active INTEGER DEFAULT 1, created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY, property_id TEXT, table_id TEXT, table_label TEXT,
    status TEXT DEFAULT 'pending', total_amount REAL DEFAULT 0, notes TEXT,
    session_token TEXT, shift_id TEXT,
    created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')),
    deleted_at TEXT, synced_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS order_items (
    id TEXT PRIMARY KEY, order_id TEXT NOT NULL, menu_item_id TEXT,
    item_name_fr TEXT, item_name_ar TEXT, quantity INTEGER DEFAULT 1,
    unit_price REAL, total REAL, notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY, value TEXT,
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
];

async function createSchema(db) {
  for (const sql of TABLES) {
    try {
      await db.execAsync(sql);
    } catch (e) {
      console.error('[db] schema error:', e.message);
    }
  }
}

export async function getSetting(key) {
  try {
    const db = await getDb();
    const row = await db.getFirstAsync('SELECT value FROM settings WHERE key = ?', [key]);
    return row ? row.value : null;
  } catch (e) {
    console.error('[db] getSetting error:', e.message);
    return null;
  }
}

export async function setSetting(key, value) {
  try {
    const db = await getDb();
    await db.runAsync(
      `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      [key, value]
    );
  } catch (e) {
    console.error('[db] setSetting error:', e.message);
  }
}
