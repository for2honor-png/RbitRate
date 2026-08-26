-- RbitRate PMS – Complete Schema
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS staff (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  role TEXT CHECK(role IN ('owner','manager','receptionist','chef','accountant')) DEFAULT 'receptionist',
  pin_code TEXT NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ
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
  vat_rate NUMERIC(5,2) DEFAULT 20,
  restaurant_mode TEXT CHECK(restaurant_mode IN ('guests','walkins','both')) DEFAULT 'guests',
  restaurant_active BOOLEAN DEFAULT FALSE,
  restaurant_name TEXT,
  otas TEXT DEFAULT '[]',
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS rooms (
  id TEXT PRIMARY KEY,
  property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  room_number TEXT NOT NULL,
  room_name TEXT,
  room_type TEXT DEFAULT 'Standard',
  floor INTEGER DEFAULT 1,
  capacity INTEGER DEFAULT 2,
  price_per_night NUMERIC(10,2) DEFAULT 0,
  status TEXT CHECK(status IN ('available','occupied','maintenance','cleaning')) DEFAULT 'available',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ
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
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS shifts (
  id TEXT PRIMARY KEY,
  staff_id TEXT NOT NULL REFERENCES staff(id),
  property_id TEXT NOT NULL REFERENCES properties(id),
  status TEXT DEFAULT 'open' CHECK(status IN ('open','closed')),
  opened_at TIMESTAMPTZ DEFAULT now(),
  closed_at TIMESTAMPTZ,
  opening_cash NUMERIC(10,2) NOT NULL DEFAULT 0,
  closing_cash NUMERIC(10,2),
  expected_cash NUMERIC(10,2),
  discrepancy NUMERIC(10,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  shift_id TEXT NOT NULL REFERENCES shifts(id),
  property_id TEXT REFERENCES properties(id),
  reservation_id TEXT REFERENCES reservations(id),
  type TEXT NOT NULL CHECK(type IN ('income','expense')),
  category TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  payment_method TEXT CHECK(payment_method IN ('cash','card','bank_transfer','ota_collected','agency','other')),
  description TEXT,
  recorded_by TEXT REFERENCES staff(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS reservations (
  id TEXT PRIMARY KEY,
  property_id TEXT REFERENCES properties(id),
  room_id TEXT REFERENCES rooms(id),
  guest_id TEXT REFERENCES guests(id),
  shift_id TEXT REFERENCES shifts(id),
  payment_shift_id TEXT REFERENCES shifts(id),
  check_in_date TEXT NOT NULL,
  check_out_date TEXT NOT NULL,
  arrival_time TEXT,
  nights INTEGER,
  coming_from TEXT,
  going_to TEXT,
  morocco_entry_number TEXT,
  adults INTEGER DEFAULT 1,
  children INTEGER DEFAULT 0,
  price_per_night NUMERIC(10,2),
  total_amount NUMERIC(10,2),
  paid_amount NUMERIC(10,2) DEFAULT 0,
  payment_type TEXT DEFAULT 'checkout',
  status TEXT DEFAULT 'checked_in',
  channel TEXT DEFAULT 'direct',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS menu_categories (
  id TEXT PRIMARY KEY,
  property_id TEXT REFERENCES properties(id),
  name_fr TEXT NOT NULL,
  name_ar TEXT,
  name_en TEXT,
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS menu_items (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL REFERENCES menu_categories(id),
  name_fr TEXT NOT NULL,
  name_ar TEXT,
  name_en TEXT,
  description_fr TEXT,
  description_ar TEXT,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  image_path TEXT,
  available BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS restaurant_tables (
  id TEXT PRIMARY KEY,
  property_id TEXT REFERENCES properties(id),
  label TEXT NOT NULL,
  qr_code TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  property_id TEXT REFERENCES properties(id),
  table_id TEXT REFERENCES restaurant_tables(id),
  table_label TEXT,
  status TEXT DEFAULT 'pending'
    CHECK(status IN ('pending','in_progress','ready','served','cancelled')),
  total_amount NUMERIC(10,2) DEFAULT 0,
  notes TEXT,
  session_token TEXT,
  shift_id TEXT REFERENCES shifts(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id),
  menu_item_id TEXT REFERENCES menu_items(id),
  item_name_fr TEXT,
  item_name_ar TEXT,
  quantity INTEGER DEFAULT 1,
  unit_price NUMERIC(10,2),
  total NUMERIC(10,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
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
  created_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── Enable Row Level Security ────────────────────────────────────────────────
ALTER TABLE staff             ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties        ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms             ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests            ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts            ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories   ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items        ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders            ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items       ENABLE ROW LEVEL SECURITY;
ALTER TABLE ota_blocks        ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings          ENABLE ROW LEVEL SECURITY;

-- ── Allow all operations with anon key (single-owner system) ─────────────────
CREATE POLICY "allow_all" ON staff             USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON properties        USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON rooms             USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON guests            USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON shifts            USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON transactions      USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON reservations      USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON menu_categories   USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON menu_items        USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON restaurant_tables USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON orders            USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON order_items       USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON ota_blocks        USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON settings          USING (true) WITH CHECK (true);
