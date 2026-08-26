const SUPABASE_URL = 'https://cviupkndhukckzqctofb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2aXVwa25kaHVrY2t6cWN0b2ZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4NjIzMzEsImV4cCI6MjA5NzQzODMzMX0.a79IbXIrjbNnRagv2xxhnw2WBbFDhkQwESwwV-M7UTE';

const H = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
};

const sb = (path, opts = {}) =>
  fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: H, ...opts })
    .then(r => r.json());

const patch = (path, body) =>
  fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: 'PATCH',
    headers: { ...H, 'Prefer': 'return=minimal' },
    body: JSON.stringify(body)
  }).then(r => r.ok);

const post = (path, body) =>
  fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: 'POST',
    headers: { ...H, 'Prefer': 'return=representation' },
    body: JSON.stringify(body)
  }).then(r => r.json());

// Map every window.db.invoke call to a Supabase equivalent:
export const db = {
  // Properties
  'properties:getAll': () => sb('properties?active=eq.1&deleted_at=is.null'),
  'properties:update': (d) => patch(`properties?id=eq.${d.id}`, d),
  'properties:create': (d) => post('properties', { ...d, id: crypto.randomUUID(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() }),
  'properties:delete': (d) => patch(`properties?id=eq.${d.id}`, { deleted_at: new Date().toISOString(), active: 0 }),

  // Rooms
  'rooms:getAll': (d) => sb(`rooms?property_id=eq.${d.property_id}&deleted_at=is.null&order=room_number.asc`),
  'rooms:getWithCapacity': async (d) => {
    const [allRooms, activeRes] = await Promise.all([
      sb(`rooms?property_id=eq.${d.property_id}&deleted_at=is.null&order=room_number.asc`),
      sb(`reservations?property_id=eq.${d.property_id}&status=eq.checked_in&deleted_at=is.null&select=*,reservation_guests(id)`),
    ]);
    const resMap = {};
    (activeRes || []).forEach(r => { resMap[r.room_id] = r; });
    return (allRooms || []).map(room => {
      const res = resMap[room.id];
      const guestCount = res ? (res.reservation_guests?.length || 0) : 0;
      const capacity = room.capacity || 1;
      return {
        ...room,
        guest_count: guestCount,
        spaces_left: capacity - guestCount,
        reservation_id: res?.id || null,
      };
    });
  },
  'rooms:create': (d) => post('rooms', { ...d, id: crypto.randomUUID(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() }),
  'rooms:update': (d) => patch(`rooms?id=eq.${d.id}`, { ...d, updated_at: new Date().toISOString() }),
  'rooms:delete': (d) => patch(`rooms?id=eq.${d.id}`, { deleted_at: new Date().toISOString() }),
  'rooms:updateStatus': (d) => patch(`rooms?id=eq.${d.id}`, { status: d.status, updated_at: new Date().toISOString() }),

  // Staff
  'staff:getAll': () => sb('staff?active=eq.1&deleted_at=is.null&order=full_name.asc'),
  'staff:getFull': () => sb('staff?deleted_at=is.null&order=full_name.asc'),
  'staff:create': (d) => post('staff', { ...d, id: crypto.randomUUID(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() }),
  'staff:update': (d) => patch(`staff?id=eq.${d.id}`, { ...d, updated_at: new Date().toISOString() }),
  'staff:deactivate': (d) => patch(`staff?id=eq.${d.id}`, { active: 0, updated_at: new Date().toISOString() }),

  // Guests
  'guests:getAll': (d) => sb(`guests?deleted_at=is.null&order=last_name.asc${d?.tag && d.tag !== 'all' ? `&tag=eq.${d.tag}` : ''}`),
  'guests:search': (d) => sb(`guests?or=(last_name.ilike.*${encodeURIComponent(d.query)}*,first_name.ilike.*${encodeURIComponent(d.query)}*,document_number.ilike.*${encodeURIComponent(d.query)}*)&deleted_at=is.null&limit=20`),
  'guests:create': (d) => post('guests', { ...d, id: crypto.randomUUID(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() }),
  'guests:update': (d) => patch(`guests?id=eq.${d.id}`, { ...d, updated_at: new Date().toISOString() }),
  'guests:setTag': (d) => patch(`guests?id=eq.${d.id}`, { tag: d.tag, updated_at: new Date().toISOString() }),
  'guests:getStayHistory': (d) => sb(`reservations?guest_id=eq.${d.guest_id}&deleted_at=is.null&order=check_in_date.desc&select=*,rooms(room_number,room_name),properties(display_name)`),

  // Reservations
  'reservations:create': (d) => post('reservations', { ...d, id: crypto.randomUUID(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() }),
  'reservations:getActive': (d) => sb(`reservations?property_id=eq.${d.property_id}&status=eq.checked_in&deleted_at=is.null&select=*,guests(last_name,first_name,nationality),rooms(room_number,room_name,room_type)`),
  'reservations:getByRoom': (d) => sb(`reservations?room_id=eq.${d.room_id}&status=eq.checked_in&deleted_at=is.null&select=*,guests(last_name,first_name,nationality)&limit=1`).then(r => r?.[0]),
  'reservations:checkout': (d) => patch(`reservations?id=eq.${d.reservation_id}`, { status: 'checked_out', updated_at: new Date().toISOString() }),
  'reservations:getAll': (d) => sb(`reservations?property_id=eq.${d.property_id}&deleted_at=is.null&order=created_at.desc&select=*,guests(last_name,first_name),rooms(room_number)`),
  'reservations:getTodayStats': async (d) => {
    const today = new Date().toISOString().split('T')[0];
    const [arrivals, departures] = await Promise.all([
      sb(`reservations?property_id=eq.${d.property_id}&check_in_date=eq.${today}&deleted_at=is.null&select=id`),
      sb(`reservations?property_id=eq.${d.property_id}&check_out_date=eq.${today}&status=eq.checked_in&deleted_at=is.null&select=id`),
    ]);
    return { arrivals: arrivals.length, departures: departures.length };
  },

  // Reservation guests
  'reservation_guests:getAll': (d) => sb(`reservation_guests?reservation_id=eq.${d.reservation_id}&select=*,guests(last_name,first_name,nationality,document_number)&order=is_primary.desc,created_at.asc`),
  'reservation_guests:getCounts': async (d) => {
    const counts = await sb(`reservation_guests?select=reservation_id&reservation_id=in.(${d.reservation_ids.join(',')})`);
    const map = {};
    (counts || []).forEach(r => { map[r.reservation_id] = (map[r.reservation_id] || 0) + 1; });
    return map;
  },
  'reservation_guests:add': (d) => post('reservation_guests', { ...d, id: crypto.randomUUID(), created_at: new Date().toISOString() }),
  'reservation_guests:remove': (d) => fetch(`${SUPABASE_URL}/rest/v1/reservation_guests?id=eq.${d.id}`, {
    method: 'DELETE',
    headers: H,
  }).then(r => r.ok),

  // Shifts
  'shifts:getActive': (d) => sb(`shifts?property_id=eq.${d.property_id}&status=eq.open&deleted_at=is.null&select=*,staff(full_name,role)`),
  'shifts:open': (d) => post('shifts', { ...d, id: crypto.randomUUID(), status: 'open', opened_at: new Date().toISOString(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() }),
  'shifts:close': (d) => patch(`shifts?id=eq.${d.shift_id}`, { status: 'closed', closed_at: new Date().toISOString(), closing_cash: d.closing_cash, expected_cash: d.expected_cash, discrepancy: d.discrepancy, updated_at: new Date().toISOString() }),
  'shifts:getById': async (d) => {
    const shift = await sb(`shifts?id=eq.${d.id}&select=*,staff(full_name,role)`).then(r => r?.[0]);
    const transactions = await sb(`transactions?shift_id=eq.${d.id}&deleted_at=is.null&order=created_at.asc&select=*,staff(full_name,role)`);
    return { shift, transactions };
  },
  'shifts:checkOpen': (d) => sb(`shifts?property_id=eq.${d.property_id}&status=eq.open&deleted_at=is.null&select=id,staff_id,opened_at,opening_cash,staff(full_name,role)`).then(shifts => ({ hasOpenShift: shifts.length > 0, shifts })),

  // Transactions
  'transactions:create': (d) => post('transactions', { ...d, id: crypto.randomUUID(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() }),
  'transactions:getByShift': (d) => sb(`transactions?shift_id=eq.${d.shift_id}&deleted_at=is.null&order=created_at.asc&select=*,staff(full_name,role)`),

  // Finance
  'finance:getSummary': async (d) => {
    const today = new Date().toISOString().split('T')[0];
    const periodFilter = {
      day: `created_at=gte.${today}T00:00:00`,
      week: `created_at=gte.${new Date(Date.now() - 6*86400000).toISOString().split('T')[0]}T00:00:00`,
      month: `created_at=gte.${today.slice(0,7)}-01T00:00:00`,
      year: `created_at=gte.${today.slice(0,4)}-01-01T00:00:00`,
    }[d.period] || `created_at=gte.${today}T00:00:00`;
    const [totals, byStaff] = await Promise.all([
      sb(`transactions?property_id=eq.${d.property_id}&deleted_at=is.null&${periodFilter}&select=type,category,payment_method,amount`),
      sb(`transactions?property_id=eq.${d.property_id}&deleted_at=is.null&${periodFilter}&select=recorded_by,type,amount,staff(full_name,role)`),
    ]);
    return { totals, byStaff, chartData: [] };
  },
  'finance:getRecentTransactions': (d) => sb(`transactions?property_id=eq.${d.property_id}&deleted_at=is.null&order=created_at.desc&limit=${d.limit || 10}&select=*,staff(full_name,role)`),
  'finance:getTodayTotals': async (d) => {
    const today = new Date().toISOString().split('T')[0];
    const txns = await sb(`transactions?property_id=eq.${d.property_id}&deleted_at=is.null&created_at=gte.${today}T00:00:00&select=type,amount`);
    const income = (txns || []).filter(t => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0);
    const expense = (txns || []).filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0);
    return { income, expense };
  },
  'finance:exportCSV': () => null, // Not supported in web

  // Clients / Invoices
  'clients:getAll': () => sb('clients?deleted_at=is.null&order=name.asc'),
  'clients:create': (d) => post('clients', { ...d, id: crypto.randomUUID(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() }),
  'invoices:getAll': (d) => sb(`invoices?property_id=eq.${d.property_id}&deleted_at=is.null&order=created_at.desc&select=*,clients(name)`),
  'invoices:getById': (d) => sb(`invoices?id=eq.${d.id}&select=*,clients(*),properties(*)`).then(r => r?.[0]),
  'invoices:create': (d) => post('invoices', { ...d, id: crypto.randomUUID(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() }),
  'invoices:addPayment': (d) => post('invoice_payments', { ...d, id: crypto.randomUUID(), created_at: new Date().toISOString() }),
  'invoices:print': (d) => { console.log('Print invoice (web stub):', d); return null; },

  // Agencies
  'agencies:getAll': () => sb('tour_agencies?deleted_at=is.null&order=name.asc'),
  'agencies:search': (d) => sb(`tour_agencies?deleted_at=is.null&name=ilike.*${encodeURIComponent(d.query)}*&order=name.asc&limit=8`),
  'agencies:create': (d) => post('tour_agencies', { ...d, id: crypto.randomUUID(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() }),
  'agencies:update': (d) => patch(`tour_agencies?id=eq.${d.id}`, { ...d, updated_at: new Date().toISOString() }),
  'agencies:delete': (d) => patch(`tour_agencies?id=eq.${d.id}`, { deleted_at: new Date().toISOString() }),
  'agencies:getGroups': (d) => sb(`groups?agency_id=eq.${d.agency_id}&deleted_at=is.null&order=created_at.desc`),

  // Guides
  'guides:getAll': (d) => sb(`tour_guides?${d?.agency_id ? `agency_id=eq.${d.agency_id}&` : ''}deleted_at=is.null&active=eq.1&order=name.asc`),
  'guides:create': (d) => post('tour_guides', { ...d, id: crypto.randomUUID(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() }),
  'guides:update': (d) => patch(`tour_guides?id=eq.${d.id}`, { ...d, updated_at: new Date().toISOString() }),
  'guides:delete': (d) => patch(`tour_guides?id=eq.${d.id}`, { deleted_at: new Date().toISOString() }),

  // Groups
  'groups:create': (d) => post('groups', { ...d, id: crypto.randomUUID(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() }),

  // Channels / OTA
  'channels:getCalendar': async (d) => {
    const [otaBlocks, reservations] = await Promise.all([
      sb(`ota_blocks?property_id=eq.${d.property_id}&deleted_at=is.null&order=start_date.asc`),
      sb(`reservations?property_id=eq.${d.property_id}&deleted_at=is.null&status=in.(checked_in,confirmed)&select=*,guests(last_name,first_name),rooms(room_number)`),
    ]);
    return {
      otaBlocks: Array.isArray(otaBlocks) ? otaBlocks : [],
      reservations: Array.isArray(reservations) ? reservations.map(r => ({
        ...r,
        last_name: r.guests?.last_name,
        first_name: r.guests?.first_name,
        room_number: r.rooms?.room_number,
      })) : [],
    };
  },
  'channels:syncAll': () => null,
  'channels:syncOne': () => null,
  'channels:removeOTA': () => null,
  'channels:testURL': () => null,
  'channels:saveOTA': () => null,
  'channels:generateExportFeed': () => null,
  'channels:checkAvailability': () => null,

  // Menu / Restaurant
  'menu:getCategories': (d) => sb(`menu_categories?property_id=eq.${d.property_id}&deleted_at=is.null&order=sort_order.asc`),
  'menu:createCategory': (d) => post('menu_categories', { ...d, id: crypto.randomUUID(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() }),
  'menu:deleteCategory': (d) => patch(`menu_categories?id=eq.${d.id}`, { deleted_at: new Date().toISOString() }),
  'menu:getItems': (d) => sb(`menu_items?category_id=eq.${d.category_id}&deleted_at=is.null&order=sort_order.asc`),
  'menu:createItem': (d) => post('menu_items', { ...d, id: crypto.randomUUID(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() }),
  'menu:updateItem': (d) => patch(`menu_items?id=eq.${d.id}`, { ...d, updated_at: new Date().toISOString() }),
  'menu:deleteItem': (d) => patch(`menu_items?id=eq.${d.id}`, { deleted_at: new Date().toISOString() }),
  'menu:toggleAvailable': (d) => patch(`menu_items?id=eq.${d.id}`, { available: d.available, updated_at: new Date().toISOString() }),
  'orders:getActive': (d) => sb(`orders?property_id=eq.${d.property_id}&status=not.in.(served,cancelled)&deleted_at=is.null&order=created_at.asc&select=*,order_items(*)`),
  'orders:updateStatus': (d) => patch(`orders?id=eq.${d.id}`, { status: d.status, updated_at: new Date().toISOString() }),

  // Schedules / Planning
  'schedules:getRange': (d) => sb(`shift_schedules?schedule_date=gte.${d.start_date}&schedule_date=lte.${d.end_date}&deleted_at=is.null&select=*,staff(full_name,role)`).then(r => Array.isArray(r) ? r : []),
  'schedules:getTodayForStaff': (d) => {
    const today = new Date().toISOString().split('T')[0];
    return sb(`shift_schedules?staff_id=eq.${d.staff_id}&schedule_date=eq.${today}&deleted_at=is.null`).then(r => Array.isArray(r) ? (r[0] || null) : null);
  },
  'schedules:getWeekForStaff': (d) => {
    const end = new Date(d.start_date);
    end.setDate(end.getDate() + 6);
    const endStr = end.toISOString().split('T')[0];
    return sb(`shift_schedules?staff_id=eq.${d.staff_id}&schedule_date=gte.${d.start_date}&schedule_date=lte.${endStr}&deleted_at=is.null`).then(r => Array.isArray(r) ? r : []);
  },
  'schedules:setDay': (d) => post('shift_schedules', { ...d, id: crypto.randomUUID(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() }),
  'schedules:autoGenerate': () => null,

  // Templates
  'templates:getAll': () => sb('schedule_templates?deleted_at=is.null&order=name.asc'),
  'templates:create': (d) => post('schedule_templates', { ...d, id: crypto.randomUUID(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() }),
  'templates:update': (d) => patch(`schedule_templates?id=eq.${d.id}`, { ...d, updated_at: new Date().toISOString() }),
  'templates:delete': (d) => patch(`schedule_templates?id=eq.${d.id}`, { deleted_at: new Date().toISOString() }),

  // Time off
  'timeoff:getAll': (d) => sb(`time_off_requests?${d?.staff_id ? `staff_id=eq.${d.staff_id}&` : ''}deleted_at=is.null&order=start_date.desc&select=*,staff(full_name,role)`),
  'timeoff:create': (d) => post('time_off_requests', { ...d, id: crypto.randomUUID(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() }),
  'timeoff:review': (d) => patch(`time_off_requests?id=eq.${d.id}`, { status: d.status, reviewed_by: d.reviewed_by, reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString() }),
  'timeoff:delete': (d) => patch(`time_off_requests?id=eq.${d.id}`, { deleted_at: new Date().toISOString() }),

  // Fiche / print (web stubs)
  'fiche:print': () => null,
  'fiche:savePDF': () => null,
  'fiche:printForGuest': () => null,
  'fiche:printGroup': () => null,

  // Formulas (not implemented in web)
  'formulas:getAll': () => [],
  'formulas:create': () => null,
  'formulas:update': () => null,
  'formulas:delete': () => null,

  // Tables (not implemented in web)
  'tables:getAll': () => [],
  'tables:create': () => null,
  'tables:delete': () => null,

  // Server / QR (Electron-only)
  'server:getLocalIP': () => null,
  'qr:generate': () => null,
};

// Main invoke function matching window.db.invoke interface:
export async function invoke(channel, data) {
  const handler = db[channel];
  if (!handler) {
    console.warn('No handler for channel:', channel);
    return null;
  }
  try {
    return await handler(data);
  } catch (err) {
    console.error(`invoke error [${channel}]:`, err);
    return null;
  }
}

// Stub for window.db.on — no real-time events in web mode
export function on(channel, callback) {
  // No-op for web: real-time not implemented
  return () => {};
}
