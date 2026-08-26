const URL = 'https://cviupkndhukckzqctofb.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2aXVwa25kaHVrY2t6cWN0b2ZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4NjIzMzEsImV4cCI6MjA5NzQzODMzMX0.a79IbXIrjbNnRagv2xxhnw2WBbFDhkQwESwwV-M7UTE';
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };
const sb = (path, opts = {}) =>
  fetch(`${URL}/rest/v1/${path}`, { headers: H, ...opts }).then(r => r.json());

const uid = () => crypto.randomUUID();
const now = () => new Date().toISOString();

export const api = {
  getStaff: () => sb('staff?active=eq.1&select=id,full_name,role,pin_code,permissions'),
  getProperties: () => sb('properties?active=eq.1'),
  getRooms: (pid) => sb(`rooms?property_id=eq.${pid}&deleted_at=is.null&order=room_number.asc`),
  getActiveReservations: (pid) =>
    sb(`reservations?property_id=eq.${pid}&status=eq.checked_in&deleted_at=is.null&select=*,guests(last_name,first_name),reservation_guests(id)`),

  getRoomGuests: (reservationId) =>
    sb(`reservation_guests?reservation_id=eq.${reservationId}&select=*,guests(last_name,first_name,nationality,document_number)&order=is_primary.desc,created_at.asc`),

  // Returns available + partially occupied rooms (occupied + spaces_left > 0)
  getRoomsWithCapacity: async (propertyId) => {
    const [allRooms, activeRes] = await Promise.all([
      api.getRooms(propertyId),
      api.getActiveReservations(propertyId),
    ]);
    const resMap = {};
    (activeRes || []).forEach(r => { resMap[r.room_id] = r; });
    return (allRooms || []).map(room => {
      const res        = resMap[room.id];
      const guestCount = res ? (res.reservation_guests?.length || 0) : 0;
      const capacity   = room.capacity || 1;
      return {
        ...room,
        guest_count: guestCount,
        spaces_left: capacity - guestCount,
        reservation_id: res?.id || null,
        primary_guest_last_name:  res?.guests?.last_name  || null,
        primary_guest_first_name: res?.guests?.first_name || null,
      };
    }).filter(room =>
      room.status === 'available' ||
      (room.status === 'occupied' && room.spaces_left > 0)
    );
  },

  addPrimaryGuestToReservation: (reservation_id, guest_id, opts = {}) =>
    fetch(`${URL}/rest/v1/reservation_guests`, {
      method: 'POST',
      headers: { ...H, Prefer: 'return=representation' },
      body: JSON.stringify({
        id: uid(), reservation_id, guest_id, is_primary: 1,
        coming_from: opts.coming_from || null,
        going_to: opts.going_to || null,
        morocco_entry_number: opts.morocco_entry_number || null,
        created_at: now(),
      }),
    }).then(r => r.json()).then(a => a[0] || a),

  addGuestToRoom: async (reservation_id, guestData) => {
    let guestId = guestData.id;
    if (!guestId) {
      const g = await fetch(`${URL}/rest/v1/guests`, {
        method: 'POST',
        headers: { ...H, Prefer: 'return=representation' },
        body: JSON.stringify({ ...guestData, id: uid(), created_at: now(), updated_at: now() }),
      }).then(r => r.json()).then(a => a[0] || a);
      guestId = g.id;
    }
    return fetch(`${URL}/rest/v1/reservation_guests`, {
      method: 'POST',
      headers: { ...H, Prefer: 'return=representation' },
      body: JSON.stringify({
        id: uid(), reservation_id, guest_id: guestId, is_primary: 0,
        coming_from: guestData.coming_from || null,
        going_to: guestData.going_to || null,
        morocco_entry_number: guestData.morocco_entry_number || null,
        created_at: now(),
      }),
    }).then(r => r.json()).then(a => a[0] || a);
  },
  searchGuests: (q) =>
    sb(`guests?or=(last_name.ilike.*${encodeURIComponent(q)}*,first_name.ilike.*${encodeURIComponent(q)}*,document_number.ilike.*${encodeURIComponent(q)}*)&deleted_at=is.null&limit=15`),
  getGuest: (id) => sb(`guests?id=eq.${id}&select=*,reservations(id,check_in_date,check_out_date,nights,total_amount,status)`),

  createGuest: (d) => fetch(`${URL}/rest/v1/guests`, {
    method: 'POST',
    headers: { ...H, Prefer: 'return=representation' },
    body: JSON.stringify({ ...d, id: uid(), created_at: now(), updated_at: now() }),
  }).then(r => r.json()).then(a => a[0] || a),

  createReservation: (d) => fetch(`${URL}/rest/v1/reservations`, {
    method: 'POST',
    headers: { ...H, Prefer: 'return=representation' },
    body: JSON.stringify({ ...d, id: uid(), status: 'checked_in', created_at: now(), updated_at: now() }),
  }).then(r => r.json()).then(a => a[0] || a),

  updateRoom: (id, data) => fetch(`${URL}/rest/v1/rooms?id=eq.${id}`, {
    method: 'PATCH',
    headers: { ...H, Prefer: 'return=minimal' },
    body: JSON.stringify({ ...data, updated_at: now() }),
  }).then(r => r.ok),

  checkout: (resId, roomId) => Promise.all([
    fetch(`${URL}/rest/v1/reservations?id=eq.${resId}`, {
      method: 'PATCH', headers: { ...H, Prefer: 'return=minimal' },
      body: JSON.stringify({ status: 'checked_out', updated_at: now() }),
    }).then(r => r.ok),
    fetch(`${URL}/rest/v1/rooms?id=eq.${roomId}`, {
      method: 'PATCH', headers: { ...H, Prefer: 'return=minimal' },
      body: JSON.stringify({ status: 'cleaning', updated_at: now() }),
    }).then(r => r.ok),
  ]),

  getActiveShifts: (pid) =>
    sb(`shifts?property_id=eq.${pid}&status=eq.open&deleted_at=is.null&select=*,staff(full_name,role)`),

  openShift: (d) => fetch(`${URL}/rest/v1/shifts`, {
    method: 'POST',
    headers: { ...H, Prefer: 'return=representation' },
    body: JSON.stringify({ ...d, id: uid(), status: 'open', opened_at: now(), created_at: now(), updated_at: now() }),
  }).then(r => r.json()).then(a => a[0] || a),

  closeShift: (id, closingCash, expectedCash, discrepancy) => fetch(`${URL}/rest/v1/shifts?id=eq.${id}`, {
    method: 'PATCH',
    headers: { ...H, Prefer: 'return=minimal' },
    body: JSON.stringify({ status: 'closed', closed_at: now(), closing_cash: closingCash, expected_cash: expectedCash, discrepancy, updated_at: now() }),
  }).then(r => r.ok),

  getTransactions: (sid) =>
    sb(`transactions?shift_id=eq.${sid}&deleted_at=is.null&order=created_at.asc`),

  addTransaction: (d) => fetch(`${URL}/rest/v1/transactions`, {
    method: 'POST',
    headers: { ...H, Prefer: 'return=minimal' },
    body: JSON.stringify({ ...d, id: uid(), created_at: now(), updated_at: now() }),
  }).then(r => r.ok),

  getReservationFiche: (id) =>
    sb(`reservations?id=eq.${id}&select=*,guests(*),rooms(room_number),properties(*)`).then(a => a?.[0]),

  deleteRoom: async (id) => {
    const active = await sb(`reservations?room_id=eq.${id}&status=eq.checked_in&deleted_at=is.null&select=id`);
    if (active && active.length > 0) return { ok: false, error: 'Chambre occupée — effectuez le check-out d\'abord' };
    await fetch(`${URL}/rest/v1/rooms?id=eq.${id}`, {
      method: 'PATCH', headers: { ...H, Prefer: 'return=minimal' },
      body: JSON.stringify({ deleted_at: now(), updated_at: now() }),
    });
    return { ok: true };
  },

  createGroup: (d) => fetch(`${URL}/rest/v1/groups`, {
    method: 'POST',
    headers: { ...H, Prefer: 'return=representation' },
    body: JSON.stringify({ ...d, id: uid(), created_at: now(), updated_at: now() }),
  }).then(r => r.json()).then(a => a[0] || a),

  listGroups: (propertyId) =>
    sb(`groups?property_id=eq.${propertyId}&deleted_at=is.null&order=created_at.desc`),

  getAgencies: () =>
    sb(`tour_agencies?deleted_at=is.null&order=name.asc`),

  searchAgencies: (q) =>
    sb(`tour_agencies?deleted_at=is.null&name=ilike.*${encodeURIComponent(q)}*&order=name.asc&limit=8`),

  createAgency: (d) => fetch(`${URL}/rest/v1/tour_agencies`, {
    method: 'POST',
    headers: { ...H, Prefer: 'return=representation' },
    body: JSON.stringify({ ...d, id: uid(), created_at: now(), updated_at: now() }),
  }).then(r => r.json()).then(a => a[0] || a),

  getGuidesByAgency: (agency_id) =>
    sb(`tour_guides?agency_id=eq.${agency_id}&deleted_at=is.null&active=eq.1&order=name.asc`),

  createGuide: (d) => fetch(`${URL}/rest/v1/tour_guides`, {
    method: 'POST',
    headers: { ...H, Prefer: 'return=representation' },
    body: JSON.stringify({ ...d, id: uid(), created_at: now(), updated_at: now() }),
  }).then(r => r.json()).then(a => a[0] || a),

  getDashboard: async (pid) => {
    const today = new Date().toISOString().split('T')[0];
    const [rooms, arrivals, departures] = await Promise.all([
      sb(`rooms?property_id=eq.${pid}&deleted_at=is.null&select=status`),
      sb(`reservations?property_id=eq.${pid}&check_in_date=eq.${today}&deleted_at=is.null&select=id`),
      sb(`reservations?property_id=eq.${pid}&check_out_date=eq.${today}&status=eq.checked_in&deleted_at=is.null&select=id`),
    ]);
    return { rooms, arrivals: arrivals.length, departures: departures.length };
  },
};
