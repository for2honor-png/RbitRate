'use strict';
const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');

let db;

function initDb(dbPath) {
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS staff (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      role TEXT CHECK(role IN ('owner','manager','receptionist','chef','accountant')) DEFAULT 'receptionist',
      pin_code TEXT NOT NULL,
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      deleted_at TEXT,
      synced_at TEXT
    );

    CREATE TABLE IF NOT EXISTS properties (
      id TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      logo_path TEXT,
      type TEXT CHECK(type IN ('hotel','apartment','villa','riad')) DEFAULT 'hotel',
      address TEXT,
      city TEXT DEFAULT 'Chefchaouen',
      phone TEXT,
      email TEXT,
      website TEXT,
      ice TEXT,
      if_number TEXT,
      rc TEXT,
      bank_name TEXT,
      bank_rib TEXT,
      vat_rate REAL DEFAULT 20,
      restaurant_mode TEXT CHECK(restaurant_mode IN ('guests','walkins','both')) DEFAULT 'guests',
      restaurant_active INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      deleted_at TEXT,
      synced_at TEXT
    );

    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      property_id TEXT NOT NULL REFERENCES properties(id),
      room_number TEXT NOT NULL,
      room_name TEXT,
      room_type TEXT DEFAULT 'Standard',
      floor INTEGER DEFAULT 1,
      capacity INTEGER DEFAULT 2,
      price_per_night REAL DEFAULT 0,
      status TEXT CHECK(status IN ('available','occupied','maintenance','cleaning')) DEFAULT 'available',
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      deleted_at TEXT,
      synced_at TEXT
    );

    CREATE TABLE IF NOT EXISTS guests (
      id TEXT PRIMARY KEY,
      last_name TEXT NOT NULL,
      first_name TEXT NOT NULL,
      date_of_birth TEXT,
      place_of_birth TEXT,
      nationality TEXT,
      profession TEXT,
      permanent_address TEXT,
      document_type TEXT,
      document_number TEXT,
      document_issued_at TEXT,
      document_issued_date TEXT,
      phone TEXT,
      email TEXT,
      tag TEXT DEFAULT 'regular',
      notes TEXT,
      total_stays INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      deleted_at TEXT,
      synced_at TEXT
    );

    CREATE TABLE IF NOT EXISTS shifts (
      id TEXT PRIMARY KEY,
      staff_id TEXT NOT NULL REFERENCES staff(id),
      property_id TEXT NOT NULL REFERENCES properties(id),
      status TEXT DEFAULT 'open' CHECK(status IN ('open','closed')),
      opened_at TEXT DEFAULT (datetime('now')),
      closed_at TEXT,
      opening_cash REAL NOT NULL DEFAULT 0,
      closing_cash REAL,
      expected_cash REAL,
      discrepancy REAL,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      deleted_at TEXT,
      synced_at TEXT
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      shift_id TEXT NOT NULL REFERENCES shifts(id),
      property_id TEXT REFERENCES properties(id),
      reservation_id TEXT REFERENCES reservations(id),
      type TEXT NOT NULL CHECK(type IN ('income','expense')),
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      payment_method TEXT CHECK(payment_method IN ('cash','card','bank_transfer','ota_collected','agency','other')),
      description TEXT,
      recorded_by TEXT REFERENCES staff(id),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      deleted_at TEXT,
      synced_at TEXT
    );

    CREATE TABLE IF NOT EXISTS reservations (
      id TEXT PRIMARY KEY,
      property_id TEXT REFERENCES properties(id),
      room_id TEXT REFERENCES rooms(id),
      guest_id TEXT REFERENCES guests(id),
      check_in_date TEXT NOT NULL,
      check_out_date TEXT NOT NULL,
      arrival_time TEXT,
      nights INTEGER,
      coming_from TEXT,
      going_to TEXT,
      morocco_entry_number TEXT,
      adults INTEGER DEFAULT 1,
      children INTEGER DEFAULT 0,
      price_per_night REAL,
      total_amount REAL,
      paid_amount REAL DEFAULT 0,
      payment_type TEXT DEFAULT 'checkout',
      status TEXT DEFAULT 'checked_in',
      channel TEXT DEFAULT 'direct',
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      deleted_at TEXT,
      synced_at TEXT
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS menu_categories (
      id TEXT PRIMARY KEY,
      property_id TEXT REFERENCES properties(id),
      name_fr TEXT NOT NULL,
      name_ar TEXT,
      name_en TEXT,
      sort_order INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      deleted_at TEXT
    );

    CREATE TABLE IF NOT EXISTS menu_items (
      id TEXT PRIMARY KEY,
      category_id TEXT NOT NULL REFERENCES menu_categories(id),
      name_fr TEXT NOT NULL,
      name_ar TEXT,
      name_en TEXT,
      description_fr TEXT,
      description_ar TEXT,
      price REAL NOT NULL DEFAULT 0,
      image_path TEXT,
      available INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      deleted_at TEXT
    );

    CREATE TABLE IF NOT EXISTS restaurant_tables (
      id TEXT PRIMARY KEY,
      property_id TEXT REFERENCES properties(id),
      label TEXT NOT NULL,
      qr_code TEXT,
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      property_id TEXT REFERENCES properties(id),
      table_id TEXT REFERENCES restaurant_tables(id),
      table_label TEXT,
      status TEXT DEFAULT 'pending'
        CHECK(status IN ('pending','in_progress','ready','served','cancelled')),
      total_amount REAL DEFAULT 0,
      notes TEXT,
      session_token TEXT,
      shift_id TEXT REFERENCES shifts(id),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      deleted_at TEXT
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id),
      menu_item_id TEXT REFERENCES menu_items(id),
      item_name_fr TEXT,
      item_name_ar TEXT,
      quantity INTEGER DEFAULT 1,
      unit_price REAL,
      total REAL,
      notes TEXT,
      formula_id TEXT,
      formula_choices TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS menu_formulas (
      id TEXT PRIMARY KEY,
      property_id TEXT REFERENCES properties(id),
      name_fr TEXT NOT NULL,
      name_ar TEXT,
      name_en TEXT,
      description_fr TEXT,
      price REAL NOT NULL DEFAULT 0,
      meal_type TEXT DEFAULT 'dinner',
      active INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      deleted_at TEXT,
      synced_at TEXT
    );

    CREATE TABLE IF NOT EXISTS menu_formula_courses (
      id TEXT PRIMARY KEY,
      formula_id TEXT NOT NULL REFERENCES menu_formulas(id),
      name_fr TEXT NOT NULL,
      name_ar TEXT,
      must_choose INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS menu_formula_options (
      id TEXT PRIMARY KEY,
      course_id TEXT NOT NULL REFERENCES menu_formula_courses(id),
      name_fr TEXT NOT NULL,
      name_ar TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS ota_blocks (
      id TEXT PRIMARY KEY,
      property_id TEXT REFERENCES properties(id),
      source_name TEXT NOT NULL,
      source_ical_url TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      summary TEXT,
      ical_uid TEXT,
      guest_name TEXT,
      synced_at TEXT DEFAULT (datetime('now')),
      created_at TEXT DEFAULT (datetime('now')),
      deleted_at TEXT
    );
  `);

  // ── Scheduling tables ──────────────────────────────────────────────────────
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS shift_schedules (
        id TEXT PRIMARY KEY,
        property_id TEXT REFERENCES properties(id),
        staff_id TEXT REFERENCES staff(id),
        schedule_date TEXT NOT NULL,
        shift_type TEXT NOT NULL CHECK(shift_type IN ('day','night','off','vacation','sick','custom')),
        start_time TEXT,
        end_time TEXT,
        notes TEXT,
        auto_generated INTEGER DEFAULT 0,
        created_by TEXT REFERENCES staff(id),
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        deleted_at TEXT,
        synced_at TEXT
      );

      CREATE TABLE IF NOT EXISTS rotation_templates (
        id TEXT PRIMARY KEY,
        property_id TEXT REFERENCES properties(id),
        name TEXT NOT NULL,
        pattern TEXT NOT NULL DEFAULT '[]',
        cycle_days INTEGER DEFAULT 7,
        day_shift_start TEXT DEFAULT '08:00',
        day_shift_end TEXT DEFAULT '20:00',
        night_shift_start TEXT DEFAULT '20:00',
        night_shift_end TEXT DEFAULT '08:00',
        active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        deleted_at TEXT,
        synced_at TEXT
      );

      CREATE TABLE IF NOT EXISTS time_off_requests (
        id TEXT PRIMARY KEY,
        staff_id TEXT REFERENCES staff(id),
        property_id TEXT REFERENCES properties(id),
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        type TEXT DEFAULT 'day_off' CHECK(type IN ('day_off','vacation','sick','other')),
        reason TEXT,
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
        reviewed_by TEXT REFERENCES staff(id),
        reviewed_at TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        synced_at TEXT
      );

      CREATE TABLE IF NOT EXISTS schedule_notifications (
        id TEXT PRIMARY KEY,
        staff_id TEXT REFERENCES staff(id),
        property_id TEXT REFERENCES properties(id),
        schedule_date TEXT,
        shift_type TEXT,
        notification_type TEXT,
        sent_at TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);
  } catch (_) {}

  // Add columns if they don't exist yet (safe to re-run)
  try { db.exec(`ALTER TABLE reservations ADD COLUMN shift_id TEXT REFERENCES shifts(id)`); } catch (_) {}
  try { db.exec(`ALTER TABLE reservations ADD COLUMN payment_shift_id TEXT REFERENCES shifts(id)`); } catch (_) {}
  try { db.exec(`ALTER TABLE properties ADD COLUMN otas TEXT DEFAULT '[]'`); } catch (_) {}
  try { db.exec(`ALTER TABLE properties ADD COLUMN restaurant_name TEXT`); } catch (_) {}
  try { db.exec(`ALTER TABLE menu_categories ADD COLUMN synced_at TEXT`); } catch (_) {}
  try { db.exec(`ALTER TABLE menu_items ADD COLUMN synced_at TEXT`); } catch (_) {}
  try { db.exec(`ALTER TABLE orders ADD COLUMN synced_at TEXT`); } catch (_) {}
  try { db.exec(`ALTER TABLE order_items ADD COLUMN updated_at TEXT DEFAULT (datetime('now'))`); } catch (_) {}
  try { db.exec(`ALTER TABLE order_items ADD COLUMN synced_at TEXT`); } catch (_) {}
  try { db.exec(`ALTER TABLE order_items ADD COLUMN formula_id TEXT`); } catch (_) {}
  try { db.exec(`ALTER TABLE order_items ADD COLUMN formula_choices TEXT`); } catch (_) {}
  try { db.exec(`ALTER TABLE staff ADD COLUMN permissions TEXT DEFAULT '{}'`); } catch (_) {}
  try { db.exec(`ALTER TABLE clients ADD COLUMN type TEXT DEFAULT 'particulier'`); } catch (_) {}
  try { db.exec(`ALTER TABLE clients ADD COLUMN synced_at TEXT`); } catch (_) {}
  try { db.exec(`ALTER TABLE properties ADD COLUMN display_name_ar TEXT`); } catch (_) {}
  try { db.exec(`ALTER TABLE properties ADD COLUMN fax TEXT`); } catch (_) {}

  try { db.exec(`
    CREATE TABLE IF NOT EXISTS reservation_guests (
      id TEXT PRIMARY KEY,
      reservation_id TEXT NOT NULL REFERENCES reservations(id),
      guest_id TEXT NOT NULL REFERENCES guests(id),
      is_primary INTEGER DEFAULT 0,
      coming_from TEXT,
      going_to TEXT,
      morocco_entry_number TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      synced_at TEXT
    )
  `); } catch (_) {}
  try { db.exec(`ALTER TABLE reservation_guests ADD COLUMN updated_at TEXT`); } catch (_) {}
  try { db.exec(`UPDATE reservation_guests SET updated_at = datetime('now') WHERE updated_at IS NULL`); } catch (_) {}

  // Migrate existing reservations: create a primary reservation_guest entry for each
  try {
    const toMigrate = db.prepare(`
      SELECT r.id as reservation_id, r.guest_id, r.coming_from, r.going_to, r.morocco_entry_number
      FROM reservations r
      LEFT JOIN reservation_guests rg ON rg.reservation_id = r.id AND rg.is_primary = 1
      WHERE r.guest_id IS NOT NULL AND rg.id IS NULL AND r.deleted_at IS NULL
    `).all();
    const ins = db.prepare(`
      INSERT OR IGNORE INTO reservation_guests
        (id, reservation_id, guest_id, is_primary, coming_from, going_to, morocco_entry_number, updated_at)
      VALUES (?, ?, ?, 1, ?, ?, ?, datetime('now'))
    `);
    for (const row of toMigrate) {
      ins.run(uuidv4(), row.reservation_id, row.guest_id,
        row.coming_from || null, row.going_to || null, row.morocco_entry_number || null);
    }
  } catch (_) {}

  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      property_id TEXT REFERENCES properties(id),
      name TEXT NOT NULL,
      ice TEXT,
      if_number TEXT,
      rc TEXT,
      address TEXT,
      city TEXT,
      phone TEXT,
      email TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      deleted_at TEXT
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      property_id TEXT NOT NULL REFERENCES properties(id),
      client_id TEXT REFERENCES clients(id),
      reservation_id TEXT REFERENCES reservations(id),
      invoice_number TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'invoice' CHECK(type IN ('invoice','receipt')),
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('draft','pending','paid','overdue')),
      client_name TEXT,
      date TEXT NOT NULL,
      due_date TEXT,
      subtotal REAL NOT NULL DEFAULT 0,
      vat_rate REAL DEFAULT 20,
      vat_amount REAL DEFAULT 0,
      total REAL NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      deleted_at TEXT
    );

    CREATE TABLE IF NOT EXISTS invoice_items (
      id TEXT PRIMARY KEY,
      invoice_id TEXT NOT NULL REFERENCES invoices(id),
      description TEXT NOT NULL,
      qty REAL NOT NULL DEFAULT 1,
      unit_price REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS invoice_payments (
      id TEXT PRIMARY KEY,
      invoice_id TEXT NOT NULL REFERENCES invoices(id),
      amount REAL NOT NULL,
      payment_method TEXT,
      payment_date TEXT NOT NULL,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS groups (
      id TEXT PRIMARY KEY,
      property_id TEXT,
      name TEXT NOT NULL,
      leader_name TEXT,
      leader_phone TEXT,
      leader_role TEXT DEFAULT 'guide',
      check_in_date TEXT,
      check_out_date TEXT,
      coming_from TEXT,
      going_to TEXT,
      total_members INTEGER DEFAULT 0,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      deleted_at TEXT,
      synced_at TEXT
    )
  `);
  try { db.exec(`ALTER TABLE reservations ADD COLUMN group_id TEXT`); } catch (_) {}

  db.exec(`
    CREATE TABLE IF NOT EXISTS tour_agencies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      country TEXT,
      city TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      deleted_at TEXT,
      synced_at TEXT
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS tour_guides (
      id TEXT PRIMARY KEY,
      agency_id TEXT REFERENCES tour_agencies(id),
      name TEXT NOT NULL,
      phone TEXT,
      role TEXT DEFAULT 'guide' CHECK(role IN ('guide','leader','representative','other')),
      notes TEXT,
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      deleted_at TEXT,
      synced_at TEXT
    )
  `);

  try { db.exec(`ALTER TABLE groups ADD COLUMN agency_id TEXT`); } catch (_) {}
  try { db.exec(`ALTER TABLE groups ADD COLUMN guide_id TEXT`); } catch (_) {}
  try { db.exec(`ALTER TABLE groups ADD COLUMN visit_name TEXT`); } catch (_) {}

  try { db.exec(`ALTER TABLE invoices ADD COLUMN agency_id TEXT REFERENCES tour_agencies(id)`); } catch (_) {}
  try { db.exec(`ALTER TABLE invoices ADD COLUMN guide_id TEXT REFERENCES tour_guides(id)`); } catch (_) {}

  // New property columns for invoice footer
  try { db.exec(`ALTER TABLE properties ADD COLUMN patente TEXT`); } catch (_) {}
  try { db.exec(`ALTER TABLE properties ADD COLUMN cnss TEXT`); } catch (_) {}
  try { db.exec(`ALTER TABLE properties ADD COLUMN bank_account TEXT`); } catch (_) {}
  try { db.exec(`ALTER TABLE properties ADD COLUMN bp TEXT`); } catch (_) {}

  // New invoice columns
  try { db.exec(`ALTER TABLE invoice_items ADD COLUMN nb_nuitee REAL`); } catch (_) {}
  try { db.exec(`ALTER TABLE invoices ADD COLUMN reservation_date TEXT`); } catch (_) {}
  try { db.exec(`ALTER TABLE invoices ADD COLUMN reference_groupe TEXT`); } catch (_) {}

  // Migrate invoices table: drop type CHECK constraint to allow 'proforma'/'facture'
  // Uses settings table as a migration flag — only runs once
  try {
    const migrated = db.prepare(`SELECT value FROM settings WHERE key = 'invoices_v2_migrated'`).get();
    const needsMigration = !migrated;
    if (needsMigration) {
      db.pragma('foreign_keys = OFF');
      db.exec(`CREATE TABLE invoices_v2 (
        id TEXT PRIMARY KEY,
        property_id TEXT NOT NULL,
        client_id TEXT,
        reservation_id TEXT,
        agency_id TEXT,
        guide_id TEXT,
        invoice_number TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'facture',
        status TEXT NOT NULL DEFAULT 'pending',
        client_name TEXT,
        date TEXT NOT NULL,
        due_date TEXT,
        reservation_date TEXT,
        reference_groupe TEXT,
        subtotal REAL NOT NULL DEFAULT 0,
        vat_rate REAL DEFAULT 10,
        vat_amount REAL DEFAULT 0,
        total REAL NOT NULL DEFAULT 0,
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        deleted_at TEXT
      )`);
      db.exec(`INSERT INTO invoices_v2
        (id, property_id, client_id, reservation_id, invoice_number, type, status, client_name,
         date, due_date, subtotal, vat_rate, vat_amount, total, notes, created_at, updated_at, deleted_at)
        SELECT id, property_id, client_id, reservation_id, invoice_number,
               CASE WHEN type IN ('proforma','facture') THEN type
                    WHEN type = 'receipt' THEN 'facture'
                    ELSE 'facture' END,
               status, client_name, date, due_date, subtotal, vat_rate, vat_amount, total, notes,
               created_at, updated_at, deleted_at
        FROM invoices`);
      db.exec(`DROP TABLE invoices`);
      db.exec(`ALTER TABLE invoices_v2 RENAME TO invoices`);
      db.pragma('foreign_keys = ON');
      db.prepare(`INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('invoices_v2_migrated', '1', datetime('now'))`).run();
    }
  } catch (_) {}

  const existing = db.prepare('SELECT COUNT(*) as c FROM staff').get();
  if (existing.c === 0) {
    db.prepare(`INSERT INTO staff (id, full_name, role, pin_code) VALUES (?, ?, ?, ?)`)
      .run(uuidv4(), 'Propriétaire', 'owner', '1234');
  }

  return db;
}

// ── Staff ──────────────────────────────────────────────────────────────────

function staffLogin({ pin }) {
  return db.prepare(
    'SELECT * FROM staff WHERE pin_code = ? AND active = 1 AND deleted_at IS NULL'
  ).get(pin) || null;
}

function staffGetAll() {
  return db.prepare('SELECT id, full_name, role, pin_code FROM staff WHERE active = 1 AND deleted_at IS NULL ORDER BY created_at ASC').all();
}

function staffGetAllFull() {
  return db.prepare('SELECT * FROM staff WHERE deleted_at IS NULL ORDER BY created_at ASC').all();
}

function staffCreate({ full_name, role, pin_code, permissions }) {
  const id = uuidv4();
  db.prepare(
    `INSERT INTO staff (id, full_name, role, pin_code, permissions, active) VALUES (?, ?, ?, ?, ?, 1)`
  ).run(id, full_name, role, pin_code, JSON.stringify(permissions || {}));
  return { ok: true, id };
}

function staffUpdate({ id, full_name, role, pin_code, permissions }) {
  db.prepare(
    `UPDATE staff SET full_name = ?, role = ?, pin_code = ?, permissions = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(full_name, role, pin_code, JSON.stringify(permissions || {}), id);
  return { ok: true };
}

function staffDeactivate({ id }) {
  db.prepare(`UPDATE staff SET active = 0, updated_at = datetime('now') WHERE id = ?`).run(id);
  return { ok: true };
}

// ── Settings ───────────────────────────────────────────────────────────────

// Resets synced_at to NULL for all rows in every sync-tracked table.
// Use when Supabase data was wiped or sync state drifted.
const SYNC_TABLES = [
  'staff','properties','rooms','guests','tour_agencies','tour_guides','groups',
  'shifts','reservations','reservation_guests','transactions','menu_categories','menu_items','menu_formulas',
];
function syncResetAll() {
  let total = 0;
  for (const t of SYNC_TABLES) {
    try {
      const { changes } = db.prepare(`UPDATE ${t} SET synced_at = NULL`).run();
      if (changes) { console.log(`[sync:reset] ${t}: ${changes} rows`); total += changes; }
    } catch (_) {}
  }
  db.prepare(`DELETE FROM settings WHERE key = 'last_supabase_pull'`).run();
  return { ok: true, total };
}

function settingsGet(key) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : null;
}

function settingsSet(key, value) {
  db.prepare(`INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`)
    .run(key, String(value));
}

// Generate the next invoice/proforma number and increment the counter
function invoicesGenerateNumber({ type, property_id }) {
  const now    = new Date();
  const year   = now.getFullYear();
  const mm     = String(now.getMonth() + 1).padStart(2, '0');
  const yy     = String(year).slice(-2);
  const isProforma = type === 'proforma';
  const prefix = isProforma ? 'P' : 'F';
  const key    = `${isProforma ? 'proforma' : 'facture'}_counter_${year}`;

  const current = parseInt(settingsGet(key) || '0', 10);
  const next    = current + 1;
  settingsSet(key, next);

  return `${prefix}${next}-${mm}/${yy}`;
}

// ── Properties ─────────────────────────────────────────────────────────────

function propertiesGetAll() {
  const props = db.prepare('SELECT * FROM properties WHERE deleted_at IS NULL ORDER BY created_at').all();
  return props.map(p => ({
    ...p,
    roomCount: db.prepare(
      'SELECT COUNT(*) as c FROM rooms WHERE property_id = ? AND deleted_at IS NULL'
    ).get(p.id).c
  }));
}

function propertiesCreate(data) {
  const id = uuidv4();
  db.prepare(`
    INSERT INTO properties (id, display_name, logo_path, type, address, bp, city, phone, fax,
      email, website, ice, if_number, rc, patente, cnss, bank_name, bank_rib, bank_account, vat_rate)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, data.display_name, data.logo_path || null, data.type || 'hotel',
    data.address || null, data.bp || null, data.city || 'Chefchaouen',
    data.phone || null, data.fax || null,
    data.email || null, data.website || null, data.ice || null,
    data.if_number || null, data.rc || null, data.patente || null, data.cnss || null,
    data.bank_name || null, data.bank_rib || null, data.bank_account || null,
    data.vat_rate != null ? data.vat_rate : 10
  );
  return { id };
}

function propertiesUpdate(data) {
  db.prepare(`
    UPDATE properties SET
      display_name = ?, logo_path = ?, type = ?, address = ?, bp = ?, city = ?, phone = ?, fax = ?,
      email = ?, website = ?, ice = ?, if_number = ?, rc = ?, patente = ?, cnss = ?,
      bank_name = ?, bank_rib = ?, bank_account = ?, vat_rate = ?,
      restaurant_active = ?, restaurant_mode = ?, restaurant_name = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `).run(
    data.display_name, data.logo_path || null, data.type || 'hotel',
    data.address || null, data.bp || null, data.city || 'Chefchaouen',
    data.phone || null, data.fax || null,
    data.email || null, data.website || null, data.ice || null,
    data.if_number || null, data.rc || null, data.patente || null, data.cnss || null,
    data.bank_name || null, data.bank_rib || null, data.bank_account || null,
    data.vat_rate != null ? data.vat_rate : 10,
    data.restaurant_active ? 1 : 0, data.restaurant_mode || 'guests', data.restaurant_name || null,
    data.id
  );
  return { ok: true };
}

function propertiesDelete({ id }) {
  db.prepare(`UPDATE properties SET deleted_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`).run(id);
  return { ok: true };
}

function propertiesSetLogo({ id, logo_path }) {
  db.prepare(`UPDATE properties SET logo_path = ?, updated_at = datetime('now') WHERE id = ?`).run(logo_path, id);
  return { ok: true };
}

// ── Rooms ──────────────────────────────────────────────────────────────────

function roomsGetAll({ property_id }) {
  return db.prepare(
    'SELECT * FROM rooms WHERE property_id = ? AND deleted_at IS NULL ORDER BY floor, room_number'
  ).all(property_id);
}

function roomsCreate(data) {
  const id = uuidv4();
  db.prepare(`
    INSERT INTO rooms (id, property_id, room_number, room_name, room_type, floor, capacity, price_per_night, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, data.property_id, data.room_number, data.room_name || null,
    data.room_type || 'Standard', data.floor || 1, data.capacity || 2,
    data.price_per_night || 0, data.status || 'available'
  );
  return { id };
}

function roomsUpdate(data) {
  db.prepare(`
    UPDATE rooms SET
      room_number = ?, room_name = ?, room_type = ?, floor = ?,
      capacity = ?, price_per_night = ?, status = ?, notes = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `).run(
    data.room_number, data.room_name || null, data.room_type || 'Standard',
    data.floor || 1, data.capacity || 2, data.price_per_night || 0,
    data.status || 'available', data.notes || null, data.id
  );
  return { ok: true };
}

function roomsDelete({ id }) {
  const active = db.prepare(
    `SELECT COUNT(*) as count FROM reservations WHERE room_id = ? AND status = 'checked_in' AND deleted_at IS NULL`
  ).get(id);
  if (active.count > 0) {
    return { ok: false, error: "Chambre occupée — effectuez le check-out d'abord" };
  }
  db.prepare(`UPDATE rooms SET deleted_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`).run(id);
  return { ok: true };
}

function roomsUpdateStatus({ id, status }) {
  db.prepare(`UPDATE rooms SET status = ?, updated_at = datetime('now') WHERE id = ?`).run(status, id);
  return { ok: true };
}

function roomsGetWithCapacity({ property_id }) {
  return db.prepare(`
    SELECT r.*,
      COALESCE(COUNT(rg.id), 0)                     AS guest_count,
      (r.capacity - COALESCE(COUNT(rg.id), 0))      AS spaces_left,
      g.last_name  AS primary_guest_last_name,
      g.first_name AS primary_guest_first_name,
      res.id            AS reservation_id,
      res.check_in_date  AS res_check_in_date,
      res.check_out_date AS res_check_out_date
    FROM rooms r
    LEFT JOIN reservations res
           ON res.room_id = r.id
          AND res.status = 'checked_in'
          AND res.deleted_at IS NULL
    LEFT JOIN reservation_guests rg ON rg.reservation_id = res.id
    LEFT JOIN guests g
           ON g.id = (
             SELECT guest_id FROM reservation_guests
              WHERE reservation_id = res.id AND is_primary = 1 LIMIT 1
           )
    WHERE r.property_id = ? AND r.deleted_at IS NULL
    GROUP BY r.id
    HAVING r.status = 'available'
        OR (r.status = 'occupied' AND COUNT(rg.id) < r.capacity)
    ORDER BY CAST(r.room_number AS INTEGER), r.room_number ASC
  `).all(property_id);
}

// ── Guests ─────────────────────────────────────────────────────────────────

const GUEST_FIELDS = new Set([
  'last_name', 'first_name', 'date_of_birth', 'place_of_birth', 'nationality',
  'profession', 'permanent_address', 'document_type', 'document_number',
  'document_issued_at', 'document_issued_date', 'phone', 'email', 'tag', 'notes',
]);

function guestsSearch({ query }) {
  const q = `%${query}%`;
  return db.prepare(`
    SELECT * FROM guests
    WHERE deleted_at IS NULL
    AND (
      lower(last_name)       LIKE lower(?) OR
      lower(first_name)      LIKE lower(?) OR
      lower(document_number) LIKE lower(?) OR
      lower(nationality)     LIKE lower(?)
    )
    ORDER BY last_name ASC
    LIMIT 20
  `).all(q, q, q, q);
}

function guestsGetAll({ tag } = {}) {
  if (tag && tag !== 'all') {
    return db.prepare(
      `SELECT * FROM guests WHERE deleted_at IS NULL AND tag = ? ORDER BY last_name ASC`
    ).all(tag);
  }
  return db.prepare(
    `SELECT * FROM guests WHERE deleted_at IS NULL ORDER BY last_name ASC`
  ).all();
}

function guestsGetById({ id }) {
  return db.prepare(`SELECT * FROM guests WHERE id = ?`).get(id) || null;
}

function guestsCreate(data) {
  const id = uuidv4();
  db.prepare(`
    INSERT INTO guests (id, last_name, first_name, date_of_birth, place_of_birth,
      nationality, profession, permanent_address, document_type, document_number,
      document_issued_at, document_issued_date, phone, email, tag, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, data.last_name, data.first_name,
    data.date_of_birth || null, data.place_of_birth || null,
    data.nationality || null, data.profession || null,
    data.permanent_address || null, data.document_type || null,
    data.document_number || null, data.document_issued_at || null,
    data.document_issued_date || null, data.phone || null,
    data.email || null, data.tag || 'regular', data.notes || null
  );
  return { id };
}

function guestsUpdate({ id, ...data }) {
  const safe = Object.entries(data).filter(([k]) => GUEST_FIELDS.has(k));
  if (safe.length === 0) return { ok: true };
  const fields = safe.map(([k]) => `${k} = ?`).join(', ');
  db.prepare(`UPDATE guests SET ${fields}, updated_at = datetime('now') WHERE id = ?`)
    .run(...safe.map(([, v]) => v ?? null), id);
  return { ok: true };
}

function guestsSetTag({ id, tag }) {
  db.prepare(`UPDATE guests SET tag = ?, updated_at = datetime('now') WHERE id = ?`).run(tag, id);
  return { ok: true };
}

function guestsDelete({ id }) {
  db.prepare(`UPDATE guests SET deleted_at = datetime('now') WHERE id = ?`).run(id);
  return { ok: true };
}

function guestsGetStayHistory({ guest_id }) {
  return db.prepare(`
    SELECT r.*, rm.room_number, rm.room_name, p.display_name as property_name
    FROM reservations r
    LEFT JOIN rooms rm ON r.room_id = rm.id
    LEFT JOIN properties p ON r.property_id = p.id
    WHERE r.guest_id = ? AND r.deleted_at IS NULL
    ORDER BY r.check_in_date DESC
  `).all(guest_id);
}

// ── Reservations ───────────────────────────────────────────────────────────

function reservationsCreate(data) {
  const id = uuidv4();
  const nights = Math.max(1, Math.round(
    (new Date(data.check_out_date) - new Date(data.check_in_date)) / (1000 * 60 * 60 * 24)
  ));
  const total = (parseFloat(data.price_per_night) || 0) * nights;

  db.prepare(`
    INSERT INTO reservations (id, property_id, room_id, guest_id,
      check_in_date, check_out_date, arrival_time, nights,
      coming_from, going_to, morocco_entry_number,
      adults, children, price_per_night, total_amount, payment_type,
      status, channel, notes, group_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, data.property_id, data.room_id, data.guest_id,
    data.check_in_date, data.check_out_date, data.arrival_time || null, nights,
    data.coming_from || null, data.going_to || null, data.morocco_entry_number || null,
    data.adults || 1, data.children || 0,
    parseFloat(data.price_per_night) || 0, total,
    data.payment_type || 'checkout', 'checked_in',
    data.channel || 'direct', data.notes || null,
    data.group_id || null
  );

  db.prepare(`UPDATE rooms SET status = 'occupied', updated_at = datetime('now') WHERE id = ?`)
    .run(data.room_id);
  db.prepare(`UPDATE guests SET total_stays = total_stays + 1, updated_at = datetime('now') WHERE id = ?`)
    .run(data.guest_id);

  // Auto-create primary reservation_guest entry
  try {
    db.prepare(`
      INSERT OR IGNORE INTO reservation_guests
        (id, reservation_id, guest_id, is_primary, coming_from, going_to, morocco_entry_number, updated_at)
      VALUES (?, ?, ?, 1, ?, ?, ?, datetime('now'))
    `).run(uuidv4(), id, data.guest_id,
      data.coming_from || null, data.going_to || null, data.morocco_entry_number || null);
  } catch (_) {}

  return { id, total };
}

function reservationsGetActive({ property_id }) {
  return db.prepare(`
    SELECT r.*,
      g.last_name, g.first_name, g.nationality, g.document_number, g.tag as guest_tag,
      rm.room_number, rm.room_name, rm.room_type
    FROM reservations r
    LEFT JOIN guests g ON r.guest_id = g.id
    LEFT JOIN rooms rm ON r.room_id = rm.id
    WHERE r.property_id = ? AND r.status = 'checked_in' AND r.deleted_at IS NULL
    ORDER BY r.check_in_date DESC
  `).all(property_id);
}

function reservationsGetByRoom({ room_id }) {
  return db.prepare(`
    SELECT r.*, g.last_name, g.first_name, g.nationality, g.document_number, g.tag as guest_tag
    FROM reservations r
    LEFT JOIN guests g ON r.guest_id = g.id
    WHERE r.room_id = ? AND r.status = 'checked_in' AND r.deleted_at IS NULL
  `).get(room_id) || null;
}

function reservationsCheckout({ reservation_id, room_id }) {
  db.prepare(`UPDATE reservations SET status = 'checked_out', updated_at = datetime('now') WHERE id = ?`)
    .run(reservation_id);
  db.prepare(`UPDATE rooms SET status = 'cleaning', updated_at = datetime('now') WHERE id = ?`)
    .run(room_id);
  return { ok: true };
}

function reservationsGetAll({ property_id }) {
  return db.prepare(`
    SELECT r.*,
      g.last_name, g.first_name, g.nationality,
      rm.room_number, rm.room_name
    FROM reservations r
    LEFT JOIN guests g ON r.guest_id = g.id
    LEFT JOIN rooms rm ON r.room_id = rm.id
    WHERE r.property_id = ? AND r.deleted_at IS NULL
    ORDER BY r.created_at DESC
  `).all(property_id);
}

function reservationsGetTodayStats({ property_id }) {
  const today = new Date().toISOString().split('T')[0];
  const arrivals = db.prepare(
    `SELECT COUNT(*) as c FROM reservations WHERE property_id = ? AND check_in_date = ? AND status = 'checked_in' AND deleted_at IS NULL`
  ).get(property_id, today).c;
  const departures = db.prepare(
    `SELECT COUNT(*) as c FROM reservations WHERE property_id = ? AND check_out_date = ? AND status = 'checked_in' AND deleted_at IS NULL`
  ).get(property_id, today).c;
  return { arrivals, departures };
}

// ── Shifts ────────────────────────────────────────────────────────────────

function shiftsOpen({ staff_id, property_id, opening_cash }) {
  const existing = db.prepare(
    `SELECT id FROM shifts WHERE property_id = ? AND status = 'open' AND deleted_at IS NULL`
  ).get(property_id);
  if (existing) return { ok: false, error: "Un shift est déjà ouvert. Fermez-le avant d'en ouvrir un nouveau." };
  const id = uuidv4();
  db.prepare(`INSERT INTO shifts (id, staff_id, property_id, opening_cash, status) VALUES (?, ?, ?, ?, 'open')`)
    .run(id, staff_id, property_id, opening_cash || 0);
  return { ok: true, id };
}

function shiftsClose({ shift_id, closing_cash, notes }) {
  const shift = db.prepare(`SELECT * FROM shifts WHERE id = ?`).get(shift_id);
  if (!shift) return { ok: false, error: 'Shift introuvable.' };
  const cashIncome  = db.prepare(`SELECT COALESCE(SUM(amount),0) as t FROM transactions WHERE shift_id = ? AND type = 'income'  AND payment_method = 'cash' AND deleted_at IS NULL`).get(shift_id).t;
  const cashExpense = db.prepare(`SELECT COALESCE(SUM(amount),0) as t FROM transactions WHERE shift_id = ? AND type = 'expense' AND payment_method = 'cash' AND deleted_at IS NULL`).get(shift_id).t;
  const expectedCash = (shift.opening_cash || 0) + cashIncome - cashExpense;
  const discrepancy  = (closing_cash || 0) - expectedCash;
  db.prepare(`UPDATE shifts SET status='closed', closed_at=datetime('now'), closing_cash=?, expected_cash=?, discrepancy=?, notes=?, updated_at=datetime('now') WHERE id=?`)
    .run(closing_cash || 0, expectedCash, discrepancy, notes || null, shift_id);
  return { ok: true, expectedCash, discrepancy };
}

function shiftsGetActive({ property_id }) {
  return db.prepare(`
    SELECT s.*, st.full_name, st.role
    FROM shifts s LEFT JOIN staff st ON s.staff_id = st.id
    WHERE s.property_id = ? AND s.status = 'open' AND s.deleted_at IS NULL
    ORDER BY s.opened_at ASC
  `).all(property_id);
}

function shiftsGetAll({ property_id, limit }) {
  return db.prepare(`
    SELECT s.*, st.full_name, st.role
    FROM shifts s LEFT JOIN staff st ON s.staff_id = st.id
    WHERE s.property_id = ? AND s.deleted_at IS NULL
    ORDER BY s.opened_at DESC LIMIT ?
  `).all(property_id, limit || 50);
}

function shiftsGetById({ id }) {
  const shift = db.prepare(`
    SELECT s.*, st.full_name, st.role
    FROM shifts s LEFT JOIN staff st ON s.staff_id = st.id WHERE s.id = ?
  `).get(id);
  const transactions = db.prepare(`
    SELECT t.*, st.full_name, st.role
    FROM transactions t LEFT JOIN staff st ON t.recorded_by = st.id
    WHERE t.shift_id = ? AND t.deleted_at IS NULL ORDER BY t.created_at ASC
  `).all(id);
  return { shift, transactions };
}

function shiftsCheckOpen({ property_id }) {
  const shifts = db.prepare(`
    SELECT s.id, s.staff_id, st.full_name, st.role, s.opened_at, s.opening_cash
    FROM shifts s LEFT JOIN staff st ON s.staff_id = st.id
    WHERE s.property_id = ? AND s.status = 'open' AND s.deleted_at IS NULL
  `).all(property_id);
  return { hasOpenShift: shifts.length > 0, shifts };
}

// ── Transactions ──────────────────────────────────────────────────────────

function transactionsCreate(data) {
  const shift = db.prepare(`SELECT id FROM shifts WHERE id = ? AND status = 'open' AND deleted_at IS NULL`).get(data.shift_id);
  if (!shift) return { ok: false, error: 'Shift fermé ou introuvable.' };
  const id = uuidv4();
  db.prepare(`
    INSERT INTO transactions (id, shift_id, property_id, reservation_id, type, category, amount, payment_method, description, recorded_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, data.shift_id, data.property_id, data.reservation_id || null, data.type, data.category, data.amount, data.payment_method, data.description || null, data.recorded_by);
  if (data.reservation_id && data.type === 'income') {
    db.prepare(`UPDATE reservations SET paid_amount = paid_amount + ?, updated_at = datetime('now') WHERE id = ?`)
      .run(data.amount, data.reservation_id);
  }
  return { ok: true, id };
}

function transactionsGetByShift({ shift_id }) {
  return db.prepare(`
    SELECT t.*, st.full_name, st.role
    FROM transactions t LEFT JOIN staff st ON t.recorded_by = st.id
    WHERE t.shift_id = ? AND t.deleted_at IS NULL ORDER BY t.created_at ASC
  `).all(shift_id);
}

// ── Finance ───────────────────────────────────────────────────────────────

const PERIOD_FILTER = {
  day:   `date(t.created_at) = date('now')`,
  week:  `date(t.created_at) >= date('now', '-6 days')`,
  month: `strftime('%Y-%m', t.created_at) = strftime('%Y-%m', 'now')`,
  year:  `strftime('%Y', t.created_at) = strftime('%Y', 'now')`,
};

const CHART_GROUP = {
  day:   `strftime('%H', t.created_at)`,
  week:  `date(t.created_at)`,
  month: `date(t.created_at)`,
  year:  `strftime('%Y-%m', t.created_at)`,
};

function financeGetSummary({ property_id, period }) {
  const pf = PERIOD_FILTER[period] || PERIOD_FILTER.day;
  const cg = CHART_GROUP[period] || CHART_GROUP.day;
  const totals = db.prepare(`
    SELECT type, category, payment_method, SUM(amount) as total, COUNT(*) as count
    FROM transactions t WHERE t.property_id = ? AND t.deleted_at IS NULL AND ${pf}
    GROUP BY type, category, payment_method
  `).all(property_id);
  const byStaff = db.prepare(`
    SELECT t.recorded_by, st.full_name, st.role, t.type, SUM(t.amount) as total
    FROM transactions t LEFT JOIN staff st ON t.recorded_by = st.id
    WHERE t.property_id = ? AND t.deleted_at IS NULL AND ${pf}
    GROUP BY t.recorded_by, t.type
  `).all(property_id);
  const chartData = db.prepare(`
    SELECT ${cg} as period_label, type, SUM(amount) as total
    FROM transactions t WHERE t.property_id = ? AND t.deleted_at IS NULL AND ${pf}
    GROUP BY period_label, type ORDER BY period_label ASC
  `).all(property_id);
  return { totals, byStaff, chartData };
}

function financeGetRecentTransactions({ property_id, limit }) {
  return db.prepare(`
    SELECT t.*, st.full_name, st.role, s.status as shift_status
    FROM transactions t
    LEFT JOIN staff st ON t.recorded_by = st.id
    LEFT JOIN shifts s ON t.shift_id = s.id
    WHERE t.property_id = ? AND t.deleted_at IS NULL
    ORDER BY t.created_at DESC LIMIT ?
  `).all(property_id, limit || 20);
}

function financeGetTodayTotals({ property_id }) {
  const row = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN type='income'  THEN amount ELSE 0 END), 0) as income,
      COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 0) as expense
    FROM transactions t
    WHERE t.property_id = ? AND date(t.created_at) = date('now') AND t.deleted_at IS NULL
  `).get(property_id);
  return row || { income: 0, expense: 0 };
}

// ── OTA Blocks / Channel Manager ──────────────────────────────────────────

function otaBlocksGetCalendar({ property_id, year, month }) {
  const mm = String(month).padStart(2, '0');
  const from = `${year}-${mm}-01`;
  const to   = `${year}-${mm}-31`;
  const otaBlocks = db.prepare(`
    SELECT * FROM ota_blocks
    WHERE property_id = ? AND deleted_at IS NULL
      AND (start_date <= ? AND end_date >= ?)
    ORDER BY start_date ASC
  `).all(property_id, to, from);

  const reservations = db.prepare(`
    SELECT r.*, g.last_name, g.first_name, rm.room_number
    FROM reservations r
    LEFT JOIN guests g ON r.guest_id = g.id
    LEFT JOIN rooms rm ON r.room_id = rm.id
    WHERE r.property_id = ? AND r.deleted_at IS NULL
      AND r.status NOT IN ('cancelled','no_show')
      AND (r.check_in_date <= ? AND r.check_out_date >= ?)
    ORDER BY r.check_in_date ASC
  `).all(property_id, to, from);

  return { otaBlocks, reservations };
}

function otaCheckAvailability({ property_id, room_id, start_date, end_date }) {
  const otaConflict = db.prepare(`
    SELECT id, source_name FROM ota_blocks
    WHERE property_id = ? AND deleted_at IS NULL
      AND start_date < ? AND end_date >= ?
  `).get(property_id, end_date, start_date) || null;

  const reservationConflict = db.prepare(`
    SELECT id FROM reservations
    WHERE room_id = ? AND deleted_at IS NULL
      AND status NOT IN ('cancelled','no_show')
      AND check_in_date < ? AND check_out_date > ?
  `).get(room_id, end_date, start_date) || null;

  return {
    available: !otaConflict && !reservationConflict,
    otaConflict,
    reservationConflict,
  };
}

function otaSaveConnection({ property_id, ota }) {
  const prop = db.prepare(`SELECT otas FROM properties WHERE id = ?`).get(property_id);
  const otas = JSON.parse(prop.otas || '[]');
  if (ota.id) {
    const idx = otas.findIndex(o => o.id === ota.id);
    if (idx >= 0) otas[idx] = { ...otas[idx], ...ota };
    else otas.push(ota);
  } else {
    otas.push({ id: uuidv4(), ...ota, status: 'pending', last_synced: null });
  }
  db.prepare(`UPDATE properties SET otas = ? WHERE id = ?`).run(JSON.stringify(otas), property_id);
  return { ok: true };
}

function otaRemoveConnection({ property_id, ota_id }) {
  const prop = db.prepare(`SELECT otas FROM properties WHERE id = ?`).get(property_id);
  const otas = JSON.parse(prop.otas || '[]').filter(o => o.id !== ota_id);
  db.prepare(`UPDATE properties SET otas = ? WHERE id = ?`).run(JSON.stringify(otas), property_id);
  return { ok: true };
}

function otaUpdateSyncStatus({ property_id, ota_id, status, last_synced, last_error }) {
  const prop = db.prepare(`SELECT otas FROM properties WHERE id = ?`).get(property_id);
  const otas = JSON.parse(prop.otas || '[]').map(o =>
    o.id === ota_id ? { ...o, status, last_synced, last_error: last_error || null } : o
  );
  db.prepare(`UPDATE properties SET otas = ? WHERE id = ?`).run(JSON.stringify(otas), property_id);
}

// ── Menu Categories ───────────────────────────────────────────────────────

function menuGetCategories({ property_id }) {
  return db.prepare(`
    SELECT * FROM menu_categories WHERE property_id = ? AND deleted_at IS NULL
    ORDER BY sort_order ASC, name_fr ASC
  `).all(property_id);
}

function menuCreateCategory(data) {
  const id = uuidv4();
  db.prepare(`
    INSERT INTO menu_categories (id, property_id, name_fr, name_ar, name_en, sort_order)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, data.property_id, data.name_fr, data.name_ar || null, data.name_en || null, data.sort_order || 0);
  return { id };
}

function menuUpdateCategory({ id, ...data }) {
  const allowed = ['name_fr', 'name_ar', 'name_en', 'sort_order', 'active'];
  const safe = Object.entries(data).filter(([k]) => allowed.includes(k));
  if (!safe.length) return { ok: true };
  const fields = safe.map(([k]) => `${k} = ?`).join(', ');
  db.prepare(`UPDATE menu_categories SET ${fields}, updated_at = datetime('now') WHERE id = ?`)
    .run(...safe.map(([, v]) => v), id);
  return { ok: true };
}

function menuDeleteCategory({ id }) {
  db.prepare(`UPDATE menu_categories SET deleted_at = datetime('now') WHERE id = ?`).run(id);
  db.prepare(`UPDATE menu_items SET available = 0 WHERE category_id = ?`).run(id);
  return { ok: true };
}

// ── Menu Items ────────────────────────────────────────────────────────────

function menuGetItems({ category_id, property_id }) {
  if (category_id) {
    return db.prepare(`
      SELECT * FROM menu_items WHERE category_id = ? AND deleted_at IS NULL ORDER BY sort_order ASC
    `).all(category_id);
  }
  return db.prepare(`
    SELECT mi.*, mc.name_fr as category_name
    FROM menu_items mi
    JOIN menu_categories mc ON mi.category_id = mc.id
    WHERE mc.property_id = ? AND mi.deleted_at IS NULL AND mc.deleted_at IS NULL
    ORDER BY mc.sort_order ASC, mi.sort_order ASC
  `).all(property_id);
}

function menuCreateItem(data) {
  const id = uuidv4();
  db.prepare(`
    INSERT INTO menu_items
      (id, category_id, name_fr, name_ar, name_en, description_fr, description_ar,
       price, image_path, available, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
  `).run(id, data.category_id, data.name_fr, data.name_ar || null, data.name_en || null,
    data.description_fr || null, data.description_ar || null,
    data.price, data.image_path || null, data.sort_order || 0);
  return { id };
}

function menuUpdateItem({ id, ...data }) {
  const allowed = ['name_fr', 'name_ar', 'name_en', 'description_fr', 'description_ar', 'price', 'image_path', 'available', 'sort_order', 'category_id'];
  const safe = Object.entries(data).filter(([k]) => allowed.includes(k));
  if (!safe.length) return { ok: true };
  const fields = safe.map(([k]) => `${k} = ?`).join(', ');
  db.prepare(`UPDATE menu_items SET ${fields}, updated_at = datetime('now') WHERE id = ?`)
    .run(...safe.map(([, v]) => v), id);
  return { ok: true };
}

function menuToggleAvailable({ id, available }) {
  db.prepare(`UPDATE menu_items SET available = ?, updated_at = datetime('now') WHERE id = ?`)
    .run(available ? 1 : 0, id);
  return { ok: true };
}

function menuDeleteItem({ id }) {
  db.prepare(`UPDATE menu_items SET deleted_at = datetime('now') WHERE id = ?`).run(id);
  return { ok: true };
}

function menuGetPublicMenu({ property_id }) {
  const property = db.prepare(`SELECT display_name, restaurant_name, restaurant_mode FROM properties WHERE id = ?`).get(property_id);
  const categories = db.prepare(`
    SELECT * FROM menu_categories WHERE property_id = ? AND active = 1 AND deleted_at IS NULL ORDER BY sort_order ASC
  `).all(property_id);
  for (const cat of categories) {
    cat.items = db.prepare(`
      SELECT * FROM menu_items WHERE category_id = ? AND available = 1 AND deleted_at IS NULL ORDER BY sort_order ASC
    `).all(cat.id);
  }
  const formulas = formulasGetPublic({ property_id });
  return { property, categories, formulas };
}

// ── Restaurant Tables ─────────────────────────────────────────────────────

function tablesGetAll({ property_id }) {
  return db.prepare(`
    SELECT * FROM restaurant_tables WHERE property_id = ? AND active = 1 ORDER BY label ASC
  `).all(property_id);
}

function tablesCreate({ property_id, label }) {
  const id = uuidv4();
  db.prepare(`INSERT INTO restaurant_tables (id, property_id, label) VALUES (?, ?, ?)`)
    .run(id, property_id, label);
  return { id };
}

function tablesDelete({ id }) {
  db.prepare(`UPDATE restaurant_tables SET active = 0 WHERE id = ?`).run(id);
  return { ok: true };
}

// ── Orders ────────────────────────────────────────────────────────────────

function ordersGetActive({ property_id }) {
  const orders = db.prepare(`
    SELECT * FROM orders
    WHERE property_id = ? AND status NOT IN ('served','cancelled') AND deleted_at IS NULL
    ORDER BY created_at ASC
  `).all(property_id);
  for (const o of orders) {
    o.items = db.prepare(`SELECT * FROM order_items WHERE order_id = ?`).all(o.id);
  }
  return orders;
}

function ordersUpdateStatus({ id, status, shift_id }) {
  if (shift_id) {
    db.prepare(`UPDATE orders SET status = ?, shift_id = ?, updated_at = datetime('now') WHERE id = ?`)
      .run(status, shift_id, id);
  } else {
    db.prepare(`UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ?`)
      .run(status, id);
  }
  if (status === 'served' && shift_id) {
    const order = db.prepare(`SELECT * FROM orders WHERE id = ?`).get(id);
    if (order && order.total_amount > 0) {
      db.prepare(`
        INSERT INTO transactions
          (id, shift_id, property_id, type, category, amount, payment_method, description)
        VALUES (?, ?, ?, 'income', 'fnb', ?, 'cash', ?)
      `).run(uuidv4(), shift_id, order.property_id, order.total_amount, `Restaurant – ${order.table_label}`);
    }
  }
  return { ok: true };
}

function ordersCreate(data) {
  const id = uuidv4();
  const total = (data.items || []).reduce((s, i) => s + (i.quantity * (i.unit_price ?? i.price ?? 0)), 0);
  db.prepare(`
    INSERT INTO orders (id, property_id, table_id, table_label, total_amount, notes, session_token)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, data.property_id, data.table_id || null, data.table_label,
    total, data.notes || null, data.session_token || uuidv4());
  for (const item of (data.items || [])) {
    const itemId = uuidv4();
    if (item.type === 'formula' || item.formula_id) {
      const price = item.price ?? item.unit_price ?? 0;
      db.prepare(`
        INSERT INTO order_items
          (id, order_id, formula_id, item_name_fr, quantity, unit_price, total, formula_choices)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(itemId, id, item.formula_id, item.name_fr || item.item_name_fr,
        item.quantity, price, item.quantity * price,
        item.choices ? JSON.stringify(item.choices) : null);
    } else {
      db.prepare(`
        INSERT INTO order_items
          (id, order_id, menu_item_id, item_name_fr, item_name_ar, quantity, unit_price, total, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(itemId, id, item.menu_item_id, item.item_name_fr || item.name_fr,
        item.item_name_ar || item.name_ar || null,
        item.quantity, item.unit_price ?? item.price, item.quantity * (item.unit_price ?? item.price), item.notes || null);
    }
  }
  return { id, total };
}

// ── Formulas ─────────────────────────────────────────────────────────────

function formulasGetAll({ property_id }) {
  return db.prepare(`
    SELECT * FROM menu_formulas WHERE property_id = ? AND deleted_at IS NULL ORDER BY meal_type, sort_order
  `).all(property_id);
}

function formulasGetWithCourses({ id }) {
  const formula = db.prepare('SELECT * FROM menu_formulas WHERE id = ?').get(id);
  if (!formula) return null;
  const courses = db.prepare('SELECT * FROM menu_formula_courses WHERE formula_id = ? ORDER BY sort_order').all(id);
  for (const c of courses) {
    c.options = db.prepare('SELECT * FROM menu_formula_options WHERE course_id = ? ORDER BY sort_order').all(c.id);
  }
  formula.courses = courses;
  return formula;
}

function formulasCreate(data) {
  const id = uuidv4();
  db.prepare(`
    INSERT INTO menu_formulas (id, property_id, name_fr, name_ar, description_fr, price, meal_type, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, data.property_id, data.name_fr, data.name_ar || null,
    data.description_fr || null, data.price, data.meal_type || 'dinner', data.sort_order || 0);
  return { id };
}

function formulasUpdate(data) {
  db.prepare(`
    UPDATE menu_formulas SET name_fr=?, name_ar=?, description_fr=?, price=?, meal_type=?, updated_at=datetime('now')
    WHERE id=?
  `).run(data.name_fr, data.name_ar || null, data.description_fr || null, data.price, data.meal_type || 'dinner', data.id);
  return { ok: true };
}

function formulasAddCourse({ formula_id, name_fr, name_ar, must_choose, sort_order }) {
  const id = uuidv4();
  db.prepare(`INSERT INTO menu_formula_courses (id, formula_id, name_fr, name_ar, must_choose, sort_order) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(id, formula_id, name_fr, name_ar || null, must_choose ? 1 : 0, sort_order || 0);
  return { id };
}

function formulasDeleteCourse({ id }) {
  db.prepare('DELETE FROM menu_formula_options WHERE course_id = ?').run(id);
  db.prepare('DELETE FROM menu_formula_courses WHERE id = ?').run(id);
  return { ok: true };
}

function formulasAddOption({ course_id, name_fr, name_ar, sort_order }) {
  const id = uuidv4();
  db.prepare('INSERT INTO menu_formula_options (id, course_id, name_fr, name_ar, sort_order) VALUES (?, ?, ?, ?, ?)')
    .run(id, course_id, name_fr, name_ar || null, sort_order || 0);
  return { id };
}

function formulasDeleteOption({ id }) {
  db.prepare('DELETE FROM menu_formula_options WHERE id = ?').run(id);
  return { ok: true };
}

function formulasToggle({ id, active }) {
  db.prepare(`UPDATE menu_formulas SET active = ?, updated_at = datetime('now') WHERE id = ?`).run(active ? 1 : 0, id);
  return { ok: true };
}

function formulasDelete({ id }) {
  db.prepare(`UPDATE menu_formulas SET deleted_at = datetime('now') WHERE id = ?`).run(id);
  return { ok: true };
}

function formulasGetPublic({ property_id }) {
  const formulas = db.prepare(`
    SELECT * FROM menu_formulas WHERE property_id = ? AND active = 1 AND deleted_at IS NULL ORDER BY meal_type, sort_order
  `).all(property_id);
  for (const f of formulas) {
    const courses = db.prepare('SELECT * FROM menu_formula_courses WHERE formula_id = ? ORDER BY sort_order').all(f.id);
    for (const c of courses) {
      c.options = db.prepare('SELECT * FROM menu_formula_options WHERE course_id = ? ORDER BY sort_order').all(c.id);
    }
    f.courses = courses;
  }
  return formulas;
}

// ── Clients ───────────────────────────────────────────────────────────────

function clientsGetAll({ property_id }) {
  return db.prepare(
    `SELECT * FROM clients WHERE property_id = ? AND deleted_at IS NULL ORDER BY name ASC`
  ).all(property_id);
}

function clientsCreate(data) {
  const id = uuidv4();
  db.prepare(`
    INSERT INTO clients (id, property_id, name, type, ice, if_number, rc, address, city, phone, email, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, data.property_id, data.name, data.type || 'particulier',
    data.ice || null, data.if_number || null,
    data.rc || null, data.address || null, data.city || null,
    data.phone || null, data.email || null, data.notes || null
  );
  return { id };
}

// ── Invoices ──────────────────────────────────────────────────────────────

function invoicesGetAll({ property_id, type }) {
  const today = new Date().toISOString().split('T')[0];
  const base = `
    SELECT i.*, c.name as client_company_name,
           a.name as agency_name, a.country as agency_country,
           g.name as guide_name, g.phone as guide_phone, g.role as guide_role
    FROM invoices i
    LEFT JOIN clients c ON i.client_id = c.id
    LEFT JOIN tour_agencies a ON i.agency_id = a.id
    LEFT JOIN tour_guides  g ON i.guide_id  = g.id
    WHERE i.property_id = ? AND i.deleted_at IS NULL
  `;
  const rows = type
    ? db.prepare(base + ` AND i.type = ? ORDER BY i.created_at DESC`).all(property_id, type)
    : db.prepare(base + ` ORDER BY i.created_at DESC`).all(property_id);
  return rows.map(inv => ({
    ...inv,
    display_status: inv.status === 'pending' && inv.due_date && inv.due_date < today ? 'overdue' : inv.status,
  }));
}

function invoicesGetById({ id }) {
  const inv = db.prepare(`
    SELECT i.*, c.name as client_company_name, c.ice as client_ice,
           c.address as client_address, c.city as client_city,
           a.name as agency_name, a.country as agency_country, a.city as agency_city,
           g.name as guide_name, g.phone as guide_phone, g.role as guide_role
    FROM invoices i
    LEFT JOIN clients c ON i.client_id = c.id
    LEFT JOIN tour_agencies a ON i.agency_id = a.id
    LEFT JOIN tour_guides  g ON i.guide_id  = g.id
    WHERE i.id = ?
  `).get(id);
  if (!inv) return null;
  inv.items    = db.prepare(`SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY rowid ASC`).all(id);
  inv.payments = db.prepare(`SELECT * FROM invoice_payments WHERE invoice_id = ? ORDER BY payment_date ASC`).all(id);
  inv.paid_amount = inv.payments.reduce((s, p) => s + p.amount, 0);
  return inv;
}

function invoicesCreate(data) {
  // Generate number via counter system: P[N]-[MM]/[YY] or F[N]-[MM]/[YY]
  const docType = data.type === 'proforma' ? 'proforma' : 'facture';
  const invoice_number = invoicesGenerateNumber({ type: docType, property_id: data.property_id });

  const items = data.items || [];
  // Support both old field names (description/qty/unit_price) and new (designation/quantite/prix_unitaire_ht)
  const subtotal = items.reduce((s, i) => {
    const qty   = parseFloat(i.quantite   ?? i.qty)         || 0;
    const price = parseFloat(i.prix_unitaire_ht ?? i.unit_price) || 0;
    return s + qty * price;
  }, 0);
  const vat_rate   = data.vat_rate != null ? data.vat_rate : 10;
  const vat_amount = subtotal * vat_rate / 100;
  const total      = subtotal + vat_amount;

  const id = uuidv4();
  db.prepare(`
    INSERT INTO invoices
      (id, property_id, client_id, reservation_id, agency_id, guide_id,
       invoice_number, type, status,
       client_name, date, due_date, reservation_date, reference_groupe,
       subtotal, vat_rate, vat_amount, total, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, data.property_id, data.client_id || null, data.reservation_id || null,
    data.agency_id || null, data.guide_id || null,
    invoice_number, docType, data.status || 'pending',
    data.client_name || null, data.date, data.due_date || null,
    data.reservation_date || null, data.reference_groupe || null,
    subtotal, vat_rate, vat_amount, total, data.notes || null
  );

  for (const item of items) {
    const qty       = parseFloat(item.quantite   ?? item.qty)          || 1;
    const price     = parseFloat(item.prix_unitaire_ht ?? item.unit_price) || 0;
    const line_total = qty * price;
    const designation = item.designation || item.description || '';
    db.prepare(`
      INSERT INTO invoice_items (id, invoice_id, description, qty, unit_price, total, nb_nuitee)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(uuidv4(), id, designation, qty, price, line_total, item.nb_nuitee || null);
  }

  return { id, invoice_number, total };
}

function invoicesAddPayment({ invoice_id, amount, payment_method, payment_date, notes }) {
  const pid = uuidv4();
  db.prepare(`
    INSERT INTO invoice_payments (id, invoice_id, amount, payment_method, payment_date, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(pid, invoice_id, amount, payment_method || 'cash',
    payment_date || new Date().toISOString().split('T')[0], notes || null);
  const inv  = db.prepare(`SELECT total FROM invoices WHERE id = ?`).get(invoice_id);
  const paid = db.prepare(`SELECT COALESCE(SUM(amount),0) as t FROM invoice_payments WHERE invoice_id = ?`).get(invoice_id).t;
  if (paid >= inv.total) {
    db.prepare(`UPDATE invoices SET status='paid', updated_at=datetime('now') WHERE id=?`).run(invoice_id);
  }
  return { ok: true, id: pid };
}

// ── (existing OTA) ────────────────────────────────────────────────────────

function otaGetBlocks({ property_id }) {
  return db.prepare(
    `SELECT * FROM ota_blocks WHERE property_id = ? AND deleted_at IS NULL ORDER BY start_date ASC`
  ).all(property_id);
}

// ── Reservation Guests ───────────────────────────────────────────────────────

function reservationGuestsAdd({ reservation_id, guest_id, coming_from, going_to, morocco_entry_number }) {
  const id = uuidv4();
  db.prepare(`
    INSERT INTO reservation_guests
      (id, reservation_id, guest_id, is_primary, coming_from, going_to, morocco_entry_number, updated_at)
    VALUES (?, ?, ?, 0, ?, ?, ?, datetime('now'))
  `).run(id, reservation_id, guest_id, coming_from || null, going_to || null, morocco_entry_number || null);
  return { id };
}

function reservationGuestsGetAll({ reservation_id }) {
  return db.prepare(`
    SELECT rg.*, g.last_name, g.first_name, g.nationality, g.document_type, g.document_number,
      g.date_of_birth, g.place_of_birth, g.profession, g.permanent_address,
      g.document_issued_at, g.document_issued_date
    FROM reservation_guests rg
    JOIN guests g ON rg.guest_id = g.id
    WHERE rg.reservation_id = ?
    ORDER BY rg.is_primary DESC, rg.created_at ASC
  `).all(reservation_id);
}

function reservationGuestsRemove({ id }) {
  db.prepare('DELETE FROM reservation_guests WHERE id = ? AND is_primary = 0').run(id);
  return { ok: true };
}

function reservationGuestsGetCounts({ property_id }) {
  return db.prepare(`
    SELECT rg.reservation_id, COUNT(*) as count
    FROM reservation_guests rg
    JOIN reservations r ON rg.reservation_id = r.id
    WHERE r.property_id = ? AND r.status = 'checked_in' AND r.deleted_at IS NULL
    GROUP BY rg.reservation_id
  `).all(property_id);
}

// ── Groups ────────────────────────────────────────────────────────────────

function groupsCreate(data) {
  const id = uuidv4();
  db.prepare(`
    INSERT INTO groups (id, property_id, name, visit_name, agency_id, guide_id,
      leader_name, leader_phone, leader_role,
      check_in_date, check_out_date, coming_from, going_to, total_members, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, data.property_id, data.name || 'Groupe',
    data.visit_name || null, data.agency_id || null, data.guide_id || null,
    data.leader_name || null, data.leader_phone || null, data.leader_role || 'guide',
    data.check_in_date || null, data.check_out_date || null,
    data.coming_from || null, data.going_to || null,
    data.total_members || 0, data.notes || null);
  return { id };
}

function groupsList({ property_id }) {
  return db.prepare(`
    SELECT g.*,
      COUNT(DISTINCT r.id) as reservation_count,
      COUNT(DISTINCT rg.id) as member_count
    FROM groups g
    LEFT JOIN reservations r ON r.group_id = g.id AND r.deleted_at IS NULL
    LEFT JOIN reservation_guests rg ON rg.reservation_id = r.id
    WHERE g.property_id = ? AND g.deleted_at IS NULL
    GROUP BY g.id
    ORDER BY g.created_at DESC
  `).all(property_id);
}

function groupsGet({ id }) {
  const group = db.prepare(`SELECT * FROM groups WHERE id = ?`).get(id);
  if (!group) return null;
  const guests = db.prepare(`
    SELECT g.*, rg.reservation_id, rg.is_primary, rg.morocco_entry_number,
      rm.room_number
    FROM reservations r
    JOIN rooms rm ON rm.id = r.room_id
    JOIN reservation_guests rg ON rg.reservation_id = r.id
    JOIN guests g ON g.id = rg.guest_id
    WHERE r.group_id = ? AND r.deleted_at IS NULL
    ORDER BY g.nationality, g.last_name
  `).all(id);
  return { ...group, guests };
}

// ── Tour Agencies ─────────────────────────────────────────────────────────────
function agenciesGetAll() {
  return db.prepare(`
    SELECT a.*,
      COUNT(DISTINCT g.id) as guide_count,
      COUNT(DISTINCT grp.id) as visit_count,
      COALESCE(SUM(grp.total_members), 0) as total_pax
    FROM tour_agencies a
    LEFT JOIN tour_guides g ON g.agency_id = a.id AND g.deleted_at IS NULL AND g.active = 1
    LEFT JOIN groups grp ON grp.agency_id = a.id AND grp.deleted_at IS NULL
    WHERE a.deleted_at IS NULL
    GROUP BY a.id
    ORDER BY a.name ASC
  `).all();
}

function agenciesSearch({ q }) {
  return db.prepare(`
    SELECT * FROM tour_agencies
    WHERE deleted_at IS NULL AND lower(name) LIKE lower(?)
    ORDER BY name ASC LIMIT 10
  `).all(`%${q}%`);
}

function agenciesCreate(data) {
  const id = uuidv4();
  db.prepare(`
    INSERT INTO tour_agencies (id, name, email, phone, country, city, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, data.name, data.email || null, data.phone || null,
    data.country || null, data.city || null, data.notes || null);
  return { id };
}

function agenciesUpdate({ id, ...data }) {
  const allowed = ['name', 'email', 'phone', 'country', 'city', 'notes'];
  const pairs = Object.keys(data).filter(k => allowed.includes(k));
  if (!pairs.length) return { ok: true };
  const sql = pairs.map(k => `${k} = ?`).join(', ');
  db.prepare(`UPDATE tour_agencies SET ${sql}, updated_at = datetime('now') WHERE id = ?`)
    .run(...pairs.map(k => data[k] ?? null), id);
  return { ok: true };
}

function agenciesDelete({ id }) {
  db.prepare(`UPDATE tour_agencies SET deleted_at = datetime('now') WHERE id = ?`).run(id);
  return { ok: true };
}

function agenciesGetGroups({ agency_id }) {
  return db.prepare(`
    SELECT grp.*, g.name as guide_name, g.phone as guide_phone
    FROM groups grp
    LEFT JOIN tour_guides g ON grp.guide_id = g.id
    WHERE grp.agency_id = ? AND grp.deleted_at IS NULL
    ORDER BY grp.check_in_date DESC
  `).all(agency_id);
}

// ── Tour Guides ───────────────────────────────────────────────────────────────
function guidesGetAll({ agency_id } = {}) {
  if (agency_id) {
    return db.prepare(`
      SELECT * FROM tour_guides
      WHERE agency_id = ? AND deleted_at IS NULL AND active = 1
      ORDER BY name ASC
    `).all(agency_id);
  }
  return db.prepare(`
    SELECT g.*, a.name as agency_name
    FROM tour_guides g
    LEFT JOIN tour_agencies a ON g.agency_id = a.id
    WHERE g.deleted_at IS NULL AND g.active = 1
    ORDER BY g.name ASC
  `).all();
}

function guidesCreate(data) {
  const id = uuidv4();
  db.prepare(`
    INSERT INTO tour_guides (id, agency_id, name, phone, role, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, data.agency_id || null, data.name,
    data.phone || null, data.role || 'guide', data.notes || null);
  return { id };
}

function guidesUpdate({ id, ...data }) {
  const allowed = ['name', 'phone', 'role', 'notes', 'active', 'agency_id'];
  const pairs = Object.keys(data).filter(k => allowed.includes(k));
  if (!pairs.length) return { ok: true };
  const sql = pairs.map(k => `${k} = ?`).join(', ');
  db.prepare(`UPDATE tour_guides SET ${sql}, updated_at = datetime('now') WHERE id = ?`)
    .run(...pairs.map(k => data[k] ?? null), id);
  return { ok: true };
}

function guidesDelete({ id }) {
  db.prepare(`UPDATE tour_guides SET deleted_at = datetime('now') WHERE id = ?`).run(id);
  return { ok: true };
}

// ── Scheduling functions ───────────────────────────────────────────────────

function scheduleGetRange({ property_id, start_date, end_date }) {
  return db.prepare(`
    SELECT s.*, st.full_name, st.role
    FROM shift_schedules s
    LEFT JOIN staff st ON s.staff_id = st.id
    WHERE s.property_id = ?
      AND s.schedule_date BETWEEN ? AND ?
      AND s.deleted_at IS NULL
    ORDER BY s.schedule_date ASC, s.staff_id ASC
  `).all(property_id, start_date, end_date);
}

function scheduleSetDay(data) {
  const existing = db.prepare(`
    SELECT id FROM shift_schedules
    WHERE staff_id = ? AND schedule_date = ? AND deleted_at IS NULL
  `).get(data.staff_id, data.schedule_date);

  if (existing) {
    db.prepare(`
      UPDATE shift_schedules
      SET shift_type = ?, start_time = ?, end_time = ?, notes = ?,
          auto_generated = 0, updated_at = datetime('now'), synced_at = NULL
      WHERE id = ?
    `).run(data.shift_type, data.start_time || null, data.end_time || null,
           data.notes || null, existing.id);
    return { id: existing.id };
  }
  const id = uuidv4();
  db.prepare(`
    INSERT INTO shift_schedules
      (id, property_id, staff_id, schedule_date, shift_type,
       start_time, end_time, notes, auto_generated, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
  `).run(id, data.property_id, data.staff_id, data.schedule_date,
         data.shift_type, data.start_time || null, data.end_time || null,
         data.notes || null, data.created_by || null);
  return { id };
}

function scheduleAutoGenerate({ property_id, start_date, weeks, template_id, created_by }) {
  const template = db.prepare('SELECT * FROM rotation_templates WHERE id = ?').get(template_id);
  if (!template) return { ok: false, error: 'Template introuvable' };
  const pattern = JSON.parse(template.pattern || '[]');
  if (!pattern.length) return { ok: false, error: 'Pattern vide' };

  const allStaff = db.prepare(`
    SELECT id, full_name, role FROM staff WHERE active = 1 AND deleted_at IS NULL
  `).all();
  if (!allStaff.length) return { ok: false, error: 'Aucun membre du staff actif' };

  const endDate = new Date(start_date + 'T00:00:00');
  endDate.setDate(endDate.getDate() + weeks * 7 - 1);
  const end_date = endDate.toISOString().split('T')[0];

  const timeOff = db.prepare(`
    SELECT * FROM time_off_requests
    WHERE property_id = ? AND status = 'approved'
      AND start_date <= ? AND end_date >= ?
  `).all(property_id, end_date, start_date);

  const insertSchedule = db.prepare(`
    INSERT OR REPLACE INTO shift_schedules
      (id, property_id, staff_id, schedule_date, shift_type,
       start_time, end_time, auto_generated, created_by, created_at, updated_at, synced_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, datetime('now'), datetime('now'), NULL)
  `);

  const count = db.transaction(() => {
    let generated = 0;
    for (let idx = 0; idx < allStaff.length; idx++) {
      const member = allStaff[idx];
      const offset = (idx * Math.floor(pattern.length / Math.max(allStaff.length, 1))) % pattern.length;
      const cur = new Date(start_date + 'T00:00:00');
      let dayCount = 0;
      while (cur.toISOString().split('T')[0] <= end_date) {
        const dateStr = cur.toISOString().split('T')[0];
        const toff = timeOff.find(t =>
          t.staff_id === member.id && dateStr >= t.start_date && dateStr <= t.end_date
        );
        let shiftType, startTime, endTime;
        if (toff) {
          shiftType = toff.type === 'sick' ? 'sick' : toff.type === 'vacation' ? 'vacation' : 'off';
          startTime = null; endTime = null;
        } else {
          shiftType = pattern[(dayCount + offset) % pattern.length];
          if (shiftType === 'day') { startTime = template.day_shift_start; endTime = template.day_shift_end; }
          else if (shiftType === 'night') { startTime = template.night_shift_start; endTime = template.night_shift_end; }
          else { startTime = null; endTime = null; }
        }
        insertSchedule.run(uuidv4(), property_id, member.id, dateStr, shiftType, startTime, endTime, created_by || null);
        generated++;
        cur.setDate(cur.getDate() + 1);
        dayCount++;
      }
    }
    return generated;
  })();

  return { ok: true, generated: count };
}

function scheduleGetTodayForStaff({ staff_id }) {
  const today = new Date().toISOString().split('T')[0];
  return db.prepare(`
    SELECT * FROM shift_schedules
    WHERE staff_id = ? AND schedule_date = ? AND deleted_at IS NULL
  `).get(staff_id, today) || null;
}

function scheduleGetWeekForStaff({ staff_id, start_date }) {
  const end = new Date(start_date + 'T00:00:00');
  end.setDate(end.getDate() + 6);
  return db.prepare(`
    SELECT * FROM shift_schedules
    WHERE staff_id = ? AND schedule_date BETWEEN ? AND ? AND deleted_at IS NULL
    ORDER BY schedule_date ASC
  `).all(staff_id, start_date, end.toISOString().split('T')[0]);
}

// ── Rotation templates ─────────────────────────────────────────────────────

function templatesGetAll({ property_id }) {
  return db.prepare(
    'SELECT * FROM rotation_templates WHERE property_id = ? AND deleted_at IS NULL ORDER BY created_at ASC'
  ).all(property_id);
}

function templatesCreate(data) {
  const id = uuidv4();
  db.prepare(`
    INSERT INTO rotation_templates
      (id, property_id, name, pattern, cycle_days,
       day_shift_start, day_shift_end, night_shift_start, night_shift_end)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, data.property_id, data.name, JSON.stringify(data.pattern || []),
    data.cycle_days || 7, data.day_shift_start || '08:00',
    data.day_shift_end || '20:00', data.night_shift_start || '20:00',
    data.night_shift_end || '08:00');
  return { id };
}

function templatesUpdate(data) {
  db.prepare(`
    UPDATE rotation_templates SET
      name = ?, pattern = ?, cycle_days = ?,
      day_shift_start = ?, day_shift_end = ?,
      night_shift_start = ?, night_shift_end = ?,
      updated_at = datetime('now'), synced_at = NULL
    WHERE id = ?
  `).run(data.name, JSON.stringify(data.pattern || []), data.cycle_days || 7,
    data.day_shift_start || '08:00', data.day_shift_end || '20:00',
    data.night_shift_start || '20:00', data.night_shift_end || '08:00', data.id);
  return { ok: true };
}

function templatesDelete({ id }) {
  db.prepare(`UPDATE rotation_templates SET deleted_at = datetime('now'), synced_at = NULL WHERE id = ?`).run(id);
  return { ok: true };
}

// ── Time-off requests ──────────────────────────────────────────────────────

function timeoffCreate(data) {
  const id = uuidv4();
  db.prepare(`
    INSERT INTO time_off_requests
      (id, staff_id, property_id, start_date, end_date, type, reason, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, data.staff_id, data.property_id, data.start_date,
    data.end_date, data.type || 'day_off', data.reason || null,
    data.status || 'pending');
  return { id };
}

function timeoffGetAll({ property_id }) {
  return db.prepare(`
    SELECT t.*, s.full_name, s.role
    FROM time_off_requests t
    LEFT JOIN staff s ON t.staff_id = s.id
    WHERE t.property_id = ? ORDER BY t.created_at DESC
  `).all(property_id);
}

function timeoffReview({ id, status, reviewed_by }) {
  db.prepare(`
    UPDATE time_off_requests
    SET status = ?, reviewed_by = ?, reviewed_at = datetime('now'),
        updated_at = datetime('now'), synced_at = NULL
    WHERE id = ?
  `).run(status, reviewed_by, id);
  return { ok: true };
}

function timeoffDelete({ id }) {
  db.prepare(`DELETE FROM time_off_requests WHERE id = ?`).run(id);
  return { ok: true };
}

// ── Shift reminder check (called from main.cjs) ────────────────────────────

function scheduleGetUpcomingShifts() {
  const today = new Date().toISOString().split('T')[0];
  return db.prepare(`
    SELECT s.*, st.full_name, st.role
    FROM shift_schedules s
    LEFT JOIN staff st ON s.staff_id = st.id
    WHERE s.schedule_date = ? AND s.shift_type IN ('day','night','custom') AND s.deleted_at IS NULL
  `).all(today);
}

function scheduleNotificationAlreadySent({ staff_id, date }) {
  return !!db.prepare(`
    SELECT id FROM schedule_notifications
    WHERE staff_id = ? AND schedule_date = ? AND notification_type = 'shift_reminder'
  `).get(staff_id, date);
}

function scheduleMarkNotificationSent({ staff_id, property_id, date, shift_type }) {
  db.prepare(`
    INSERT INTO schedule_notifications (id, staff_id, property_id, schedule_date, shift_type, notification_type, sent_at)
    VALUES (?, ?, ?, ?, ?, 'shift_reminder', datetime('now'))
  `).run(uuidv4(), staff_id, property_id, date, shift_type);
}

module.exports = {
  initDb, prepare: (...args) => db.prepare(...args),
  staffLogin, staffGetAll, staffGetAllFull, staffCreate, staffUpdate, staffDeactivate,
  propertiesGetAll, propertiesCreate, propertiesUpdate, propertiesDelete, propertiesSetLogo,
  roomsGetAll, roomsCreate, roomsUpdate, roomsDelete, roomsUpdateStatus, roomsGetWithCapacity,
  guestsSearch, guestsGetAll, guestsGetById, guestsCreate, guestsUpdate, guestsSetTag, guestsDelete, guestsGetStayHistory,
  reservationsCreate, reservationsGetActive, reservationsGetByRoom, reservationsCheckout, reservationsGetAll, reservationsGetTodayStats,
  shiftsOpen, shiftsClose, shiftsGetActive, shiftsGetAll, shiftsGetById, shiftsCheckOpen,
  transactionsCreate, transactionsGetByShift,
  financeGetSummary, financeGetRecentTransactions, financeGetTodayTotals,
  otaBlocksGetCalendar, otaCheckAvailability, otaSaveConnection, otaRemoveConnection, otaUpdateSyncStatus, otaGetBlocks,
  menuGetCategories, menuCreateCategory, menuUpdateCategory, menuDeleteCategory,
  menuGetItems, menuCreateItem, menuUpdateItem, menuToggleAvailable, menuDeleteItem, menuGetPublicMenu,
  formulasGetAll, formulasGetWithCourses, formulasCreate, formulasUpdate,
  formulasAddCourse, formulasDeleteCourse, formulasAddOption, formulasDeleteOption,
  formulasToggle, formulasDelete, formulasGetPublic,
  tablesGetAll, tablesCreate, tablesDelete,
  ordersGetActive, ordersUpdateStatus, ordersCreate,
  clientsGetAll, clientsCreate,
  invoicesGetAll, invoicesGetById, invoicesCreate, invoicesAddPayment,
  invoicesGenerateNumber,
  settingsGet, settingsSet,
  syncResetAll,
  reservationGuestsAdd, reservationGuestsGetAll, reservationGuestsRemove, reservationGuestsGetCounts,
  groupsCreate, groupsList, groupsGet,
  agenciesGetAll, agenciesSearch, agenciesCreate, agenciesUpdate, agenciesDelete, agenciesGetGroups,
  guidesGetAll, guidesCreate, guidesUpdate, guidesDelete,
  scheduleGetRange, scheduleSetDay, scheduleAutoGenerate, scheduleGetTodayForStaff, scheduleGetWeekForStaff,
  templatesGetAll, templatesCreate, templatesUpdate, templatesDelete,
  timeoffCreate, timeoffGetAll, timeoffReview, timeoffDelete,
  scheduleGetUpcomingShifts, scheduleNotificationAlreadySent, scheduleMarkNotificationSent,
};
