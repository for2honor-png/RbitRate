import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDb } from './db/index.js';

let AUTH_TOKEN = '';
let CURRENT_STAFF = null;

// ── Auth helpers ─────────────────────────────────────────────────────────────

export const setAuthToken = async (token) => {
  AUTH_TOKEN = token;
  await AsyncStorage.setItem('auth_token', token);
};

export const clearAuth = async () => {
  AUTH_TOKEN = '';
  CURRENT_STAFF = null;
  await AsyncStorage.removeItem('auth_token');
  await AsyncStorage.removeItem('current_staff');
};

export const loadStoredConfig = async () => {
  AUTH_TOKEN = (await AsyncStorage.getItem('auth_token')) || '';
  const staffJson = await AsyncStorage.getItem('current_staff');
  CURRENT_STAFF = staffJson ? JSON.parse(staffJson) : null;
  return { hasServer: true, hasToken: !!AUTH_TOKEN };
};

export const getCurrentStaff = () => CURRENT_STAFF;

// ── Simple UUID ───────────────────────────────────────────────────────────────

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

// ── API (SQLite-first) ────────────────────────────────────────────────────────

export const api = {

  // ── Auth ──────────────────────────────────────────────────────────────────
  async getStaffList() {
    const db = await getDb();
    return db.getAllAsync(
      `SELECT id, full_name, role FROM staff WHERE active = 1 AND deleted_at IS NULL ORDER BY role`
    );
  },

  async login({ staff_id, pin }) {
    const db = await getDb();
    const staff = await db.getFirstAsync(
      `SELECT * FROM staff WHERE id = ? AND pin_code = ? AND active = 1 AND deleted_at IS NULL`,
      [staff_id, pin]
    );
    if (!staff) throw new Error('PIN incorrect');
    CURRENT_STAFF = staff;
    await AsyncStorage.setItem('current_staff', JSON.stringify(staff));
    return { token: staff.id, staff };
  },

  // ── Properties ────────────────────────────────────────────────────────────
  async getProperties() {
    const db = await getDb();
    const props = await db.getAllAsync(
      `SELECT * FROM properties WHERE deleted_at IS NULL AND active = 1 ORDER BY created_at`
    );
    for (const p of props) {
      const r = await db.getFirstAsync(
        `SELECT COUNT(*) as c FROM rooms WHERE property_id = ? AND deleted_at IS NULL`, [p.id]
      );
      p.roomCount = r ? r.c : 0;
    }
    return props;
  },

  // ── Dashboard ─────────────────────────────────────────────────────────────
  async getDashboard(propId) {
    const db = await getDb();
    const today = new Date().toISOString().slice(0, 10);
    const [rooms, occupied, checkins, checkouts, revenue] = await Promise.all([
      db.getFirstAsync(`SELECT COUNT(*) as c FROM rooms WHERE property_id = ? AND deleted_at IS NULL`, [propId]),
      db.getFirstAsync(`SELECT COUNT(*) as c FROM rooms WHERE property_id = ? AND status = 'occupied' AND deleted_at IS NULL`, [propId]),
      db.getFirstAsync(`SELECT COUNT(*) as c FROM reservations WHERE property_id = ? AND DATE(check_in_date) = ? AND status = 'checked_in' AND deleted_at IS NULL`, [propId, today]),
      db.getFirstAsync(`SELECT COUNT(*) as c FROM reservations WHERE property_id = ? AND DATE(check_out_date) = ? AND status = 'checked_in' AND deleted_at IS NULL`, [propId, today]),
      db.getFirstAsync(`SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE property_id = ? AND DATE(created_at) = ? AND type = 'income' AND deleted_at IS NULL`, [propId, today]),
    ]);
    return {
      total_rooms:    rooms?.c     || 0,
      occupied_rooms: occupied?.c  || 0,
      check_ins_today:   checkins?.c  || 0,
      check_outs_today:  checkouts?.c || 0,
      revenue_today:  revenue?.total || 0,
    };
  },

  // ── Rooms ─────────────────────────────────────────────────────────────────
  async getRooms(propId) {
    const db = await getDb();
    return db.getAllAsync(`
      SELECT r.*,
        g.first_name || ' ' || g.last_name as guest_name,
        res.check_out_date
      FROM rooms r
      LEFT JOIN reservations res ON res.room_id = r.id AND res.status = 'checked_in' AND res.deleted_at IS NULL
      LEFT JOIN guests g ON g.id = res.guest_id
      WHERE r.property_id = ? AND r.deleted_at IS NULL
      ORDER BY r.room_number
    `, [propId]);
  },

  async updateRoomStatus(id, status) {
    const db = await getDb();
    await db.runAsync(
      `UPDATE rooms SET status = ?, updated_at = datetime('now') WHERE id = ?`, [status, id]
    );
    return { ok: true };
  },

  // ── Guests ────────────────────────────────────────────────────────────────
  async searchGuests(q) {
    const db = await getDb();
    const like = `%${q}%`;
    return db.getAllAsync(
      `SELECT * FROM guests WHERE deleted_at IS NULL AND
       (last_name LIKE ? OR first_name LIKE ? OR document_number LIKE ? OR phone LIKE ?)
       ORDER BY last_name LIMIT 20`,
      [like, like, like, like]
    );
  },

  async getGuest(id) {
    const db = await getDb();
    const guest = await db.getFirstAsync(`SELECT * FROM guests WHERE id = ?`, [id]);
    const history = await db.getAllAsync(
      `SELECT r.*, p.display_name as property_name, rm.room_number
       FROM reservations r
       LEFT JOIN properties p ON p.id = r.property_id
       LEFT JOIN rooms rm ON rm.id = r.room_id
       WHERE r.guest_id = ? AND r.deleted_at IS NULL ORDER BY r.check_in_date DESC LIMIT 20`,
      [id]
    );
    return { ...guest, history: history || [] };
  },

  async createGuest(data) {
    const db = await getDb();
    const id = data.id || uuid();
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO guests (id, last_name, first_name, date_of_birth, place_of_birth, nationality,
         profession, permanent_address, document_type, document_number,
         document_issued_at, document_issued_date, phone, email, notes, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         last_name=excluded.last_name, first_name=excluded.first_name,
         updated_at=excluded.updated_at`,
      [id, data.last_name, data.first_name, data.date_of_birth || null, data.place_of_birth || null,
       data.nationality || null, data.profession || null, data.permanent_address || null,
       data.document_type || null, data.document_number || null,
       data.document_issued_at || null, data.document_issued_date || null,
       data.phone || null, data.email || null, data.notes || null, now]
    );
    return { id };
  },

  // ── Check-in / Checkout ───────────────────────────────────────────────────
  async checkIn(data) {
    const db = await getDb();

    // Create or reuse guest
    let guestId = data.guest_id || null;
    if (!guestId && data.guest) {
      const { id: newGuestId } = await api.createGuest(data.guest);
      guestId = newGuestId;
    }

    // Calculate nights from dates if not provided
    const nights = data.nights || (
      data.check_in_date && data.check_out_date
        ? Math.max(1, Math.round(
            (new Date(data.check_out_date) - new Date(data.check_in_date)) / 86400000
          ))
        : null
    );
    const totalAmount = data.total_amount ||
      ((data.price_per_night || 0) * (nights || 1)) || null;

    const id = uuid();
    await db.runAsync(
      `INSERT INTO reservations
         (id, property_id, room_id, guest_id, shift_id, check_in_date, check_out_date,
          arrival_time, nights, adults, children, price_per_night, total_amount, channel, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'checked_in')`,
      [id, data.property_id, data.room_id, guestId, data.shift_id || null,
       data.check_in_date, data.check_out_date, data.arrival_time || null,
       nights, data.adults || 1, data.children || 0,
       data.price_per_night || null, totalAmount, data.channel || 'direct']
    );
    await db.runAsync(
      `UPDATE rooms SET status = 'occupied', updated_at = datetime('now') WHERE id = ?`,
      [data.room_id]
    );
    return { id };
  },

  async checkout(data) {
    const db = await getDb();
    await db.runAsync(
      `UPDATE reservations SET status = 'checked_out', updated_at = datetime('now') WHERE id = ?`,
      [data.reservation_id]
    );
    await db.runAsync(
      `UPDATE rooms SET status = 'cleaning', updated_at = datetime('now') WHERE id = ?`,
      [data.room_id]
    );
    return { ok: true };
  },

  // ── Shifts ────────────────────────────────────────────────────────────────
  async getActiveShifts(propId) {
    const db = await getDb();
    return db.getAllAsync(`
      SELECT s.*, st.full_name FROM shifts s
      LEFT JOIN staff st ON s.staff_id = st.id
      WHERE s.property_id = ? AND s.status = 'open' AND s.deleted_at IS NULL
    `, [propId]);
  },

  async openShift(data) {
    const db = await getDb();
    const staffId = data.staff_id || CURRENT_STAFF?.id || null;
    const id = uuid();
    await db.runAsync(
      `INSERT INTO shifts (id, staff_id, property_id, opening_cash, status)
       VALUES (?, ?, ?, ?, 'open')`,
      [id, staffId, data.property_id, data.opening_cash || 0]
    );
    return { id };
  },

  // ── Transactions ──────────────────────────────────────────────────────────
  async getTransactions(shiftId) {
    const db = await getDb();
    return db.getAllAsync(`
      SELECT t.*, st.full_name FROM transactions t
      LEFT JOIN staff st ON st.id = t.recorded_by
      WHERE t.shift_id = ? AND t.deleted_at IS NULL ORDER BY t.created_at ASC
    `, [shiftId]);
  },

  async addTransaction(data) {
    const db = await getDb();
    const id = uuid();
    await db.runAsync(
      `INSERT INTO transactions
         (id, shift_id, property_id, reservation_id, type, category, amount,
          payment_method, description, recorded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, data.shift_id, data.property_id, data.reservation_id || null,
       data.type, data.category, data.amount, data.payment_method || null,
       data.description || null, data.recorded_by || null]
    );
    return { id };
  },

  // ── Orders (kitchen display) ──────────────────────────────────────────────
  async getActiveOrders(propId) {
    const db = await getDb();
    const orders = await db.getAllAsync(`
      SELECT * FROM orders
      WHERE property_id = ? AND status NOT IN ('served','cancelled') AND deleted_at IS NULL
      ORDER BY created_at ASC
    `, [propId]);
    for (const o of orders) {
      o.items = await db.getAllAsync(
        `SELECT * FROM order_items WHERE order_id = ?`, [o.id]
      );
    }
    return orders;
  },

  async updateOrderStatus(id, data) {
    const db = await getDb();
    await db.runAsync(
      `UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ?`,
      [data.status, id]
    );
    return { ok: true };
  },
};

export const setServerURL = async () => {};
export const getBaseURL = () => '';
