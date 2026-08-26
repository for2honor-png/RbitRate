import React, { useState, useEffect, useRef } from 'react';
import { theme } from '../theme.js';
import { useApp } from '../App.jsx';
import { invoke } from '../db.js';

const SAFFRON = '#e0a458';

const FIELD = {
  border: `1.5px solid rgba(31,42,46,0.2)`, borderRadius: 8,
  padding: '9px 12px', fontSize: 13, fontFamily: theme.font,
  background: theme.white, color: theme.dark, outline: 'none', width: '100%',
  boxSizing: 'border-box',
};

const TAG_COLORS = {
  regular: '#6b7280', vip: '#e0a458', whitelist: '#0f766e',
  blacklist: '#ff7f50', agency: '#7c3aed', group: '#0369a1',
};

function ArabicSub({ children }) {
  return <div style={{ fontSize: 10, color: 'rgba(31,42,46,0.35)', direction: 'rtl', textAlign: 'right', marginTop: 1 }}>{children}</div>;
}

function FieldLabel({ fr, ar, required }) {
  return (
    <label style={{ display: 'block', marginBottom: 5 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: theme.dark, opacity: 0.6, textTransform: 'uppercase', letterSpacing: 0.4 }}>
        {fr}{required && <span style={{ color: theme.coral }}> *</span>}
      </span>
      {ar && <ArabicSub>{ar}</ArabicSub>}
    </label>
  );
}

function SectionTitle({ icon, title }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      fontSize: 12, fontWeight: 700, color: theme.dark, opacity: 0.5,
      textTransform: 'uppercase', letterSpacing: 0.6,
      borderBottom: `1px solid rgba(31,42,46,0.08)`,
      paddingBottom: 8, marginBottom: 16, marginTop: 24,
    }}>
      <span>{icon}</span>{title}
    </div>
  );
}

function GuestSearchCard({ guest, onSelect }) {
  const isBlacklisted = guest.tag === 'blacklist';
  const tagColor = TAG_COLORS[guest.tag] || TAG_COLORS.regular;
  const initials = `${guest.last_name[0] || ''}${guest.first_name[0] || ''}`.toUpperCase();
  return (
    <div
      onClick={() => onSelect(guest)}
      style={{
        background: theme.white,
        border: isBlacklisted ? `2px solid ${theme.coral}` : `1px solid rgba(31,42,46,0.12)`,
        borderRadius: 10, padding: '12px 16px',
        cursor: 'pointer', transition: 'all 0.15s',
        display: 'flex', alignItems: 'center', gap: 12,
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 2px 12px rgba(31,42,46,0.1)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; }}
    >
      <div style={{
        width: 38, height: 38, borderRadius: '50%',
        background: isBlacklisted ? theme.coral : tagColor,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: theme.white, fontSize: 13, fontWeight: 700, flexShrink: 0,
      }}>{initials}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: theme.dark }}>
          {guest.last_name} {guest.first_name}
          {isBlacklisted && (
            <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, background: theme.coral, color: theme.white, borderRadius: 4, padding: '1px 6px' }}>BLACKLIST</span>
          )}
        </div>
        <div style={{ fontSize: 11, color: theme.dark, opacity: 0.5, marginTop: 2, display: 'flex', gap: 10 }}>
          {guest.nationality && <span>{guest.nationality}</span>}
          {guest.document_number && <span>📄 {guest.document_number}</span>}
          <span>🏨 {guest.total_stays} séjour{guest.total_stays !== 1 ? 's' : ''}</span>
        </div>
      </div>
      <span style={{ fontSize: 18, opacity: 0.3 }}>›</span>
    </div>
  );
}

function TypeToggle({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: theme.dark, opacity: 0.5, alignSelf: 'center', marginRight: 4 }}>
        Type :
      </div>
      {[
        { k: 'individual', label: '👤 Individuel' },
        { k: 'group',      label: '👥 Groupe' },
      ].map(({ k, label }) => (
        <button key={k} onClick={() => onChange(k)} style={{
          padding: '8px 18px', borderRadius: 8, cursor: 'pointer',
          border: value === k ? `2px solid ${theme.teal}` : `1.5px solid rgba(31,42,46,0.2)`,
          background: value === k ? `${theme.teal}12` : theme.white,
          color: value === k ? theme.teal : theme.dark,
          fontWeight: value === k ? 700 : 500,
          fontSize: 13, fontFamily: theme.font,
        }}>{label}</button>
      ))}
    </div>
  );
}

const emptyGroupPerson = () => ({
  last_name: '', first_name: '', date_of_birth: '', place_of_birth: '',
  nationality: '', profession: '', permanent_address: '',
  document_type: 'Passeport', document_number: '',
  document_issued_at: '', document_issued_date: '',
  morocco_entry_number: '',
  room_id: '', isChef: false,
});

// Helper to extract id from Supabase response (may be array or object)
function extractId(res) {
  if (!res) return null;
  if (Array.isArray(res)) return res[0]?.id || null;
  return res.id || null;
}

// Web print helper: opens a new window with HTML content and prints
function webPrint(html) {
  const w = window.open('', '_blank', 'width=800,height=600');
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  w.print();
}

const PRINT_STYLE = `
  <style>
    body { font-family: Arial, sans-serif; padding: 30px; font-size: 12px; }
    h2 { margin-bottom: 20px; font-size: 16px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    td, th { border: 1px solid #ccc; padding: 6px 10px; text-align: left; }
    th { background: #f0f0f0; font-weight: bold; width: 35%; }
    .section { margin-bottom: 16px; font-weight: bold; font-size: 13px; }
    @media print { body { padding: 10px; } }
  </style>`;

export default function CheckIn() {
  const { selectedPropertyId, setPage, checkInRoomId, setCheckInRoomId } = useApp();

  const today   = new Date().toISOString().split('T')[0];
  const nowTime = new Date().toTimeString().slice(0, 5);

  const emptyForm = () => ({
    room_id: checkInRoomId || '',
    arrival_time: nowTime,
    last_name: '', first_name: '',
    date_of_birth: '', place_of_birth: '',
    nationality: '', profession: '',
    permanent_address: '',
    coming_from: '', going_to: '',
    check_in_date: today, check_out_date: '',
    morocco_entry_number: '',
    document_type: 'Passeport', document_number: '',
    document_issued_at: '', document_issued_date: '',
    payment_type: 'checkout',
    price_per_night: '',
    adults: 1, children: 0,
  });

  // ── Shared state ──────────────────────────────────────────────────────────
  const [checkInType, setCheckInType] = useState('individual');
  const [roomsWithCapacity, setRoomsWithCapacity] = useState([]);
  const [toast, setToast]   = useState(null);
  const [saving, setSaving] = useState(false);
  const searchTimer = useRef(null);

  // ── Individual mode state ─────────────────────────────────────────────────
  const [phase, setPhase]               = useState('search');
  const [query, setQuery]               = useState('');
  const [results, setResults]           = useState([]);
  const [isNewGuest, setIsNewGuest]     = useState(false);
  const [guestId, setGuestId]           = useState(null);
  const [blacklistAlert, setBlacklistAlert] = useState(null);
  const [form, setForm]                 = useState(emptyForm);
  const [errors, setErrors]             = useState({});
  const [savedReservationId, setSavedReservationId] = useState(null);
  const [printing, setPrinting]         = useState(false);
  const [savingPDF, setSavingPDF]       = useState(false);
  const [printError, setPrintError]     = useState(null);

  // ── Group mode state ──────────────────────────────────────────────────────
  const [groupInfo, setGroupInfo] = useState({
    name: '', visit_name: '', agency_id: null,
    guide_id: null, leader_name: '', leader_phone: '', leader_role: 'guide',
  });
  const [agencyQuery,       setAgencyQuery]       = useState('');
  const [agencySuggestions, setAgencySuggestions] = useState([]);
  const [agencySelected,    setAgencySelected]    = useState(null);
  const [guideOptions,      setGuideOptions]      = useState([]);
  const [showNewGuideForm,  setShowNewGuideForm]  = useState(false);
  const [newGuide,          setNewGuide]          = useState({ name: '', phone: '', role: 'guide' });
  const agencyTimer = useRef(null);
  const [groupShared, setGroupShared] = useState({
    arrival_time: nowTime,
    check_in_date: today, check_out_date: '',
    payment_type: 'checkout', price_per_night: '',
    coming_from: '', going_to: '',
  });
  const [groupPersons, setGroupPersons]     = useState([{ ...emptyGroupPerson(), isChef: true }]);
  const [roomAssignments, setRoomAssignments] = useState({});
  const [groupErrors, setGroupErrors]       = useState({});
  const [savedGroupId,    setSavedGroupId]      = useState(null);
  const [savedGroupResId, setSavedGroupResId]   = useState(null);
  const [savedGroupGuestIds, setSavedGroupGuestIds] = useState([]);
  const [savedGuestResMap, setSavedGuestResMap] = useState({});
  const [savedGroupPersons, setSavedGroupPersons] = useState([]);
  const [printingIndividuals, setPrintingIndividuals] = useState(false);
  const [printingGroupTable,  setPrintingGroupTable]  = useState(false);

  // ── Load rooms with capacity ──────────────────────────────────────────────
  useEffect(() => {
    if (!selectedPropertyId) return;
    invoke('rooms:getWithCapacity', { property_id: selectedPropertyId })
      .then(r => setRoomsWithCapacity(r || []))
      .catch(() =>
        invoke('rooms:getAll', { property_id: selectedPropertyId })
          .then(r => setRoomsWithCapacity((r || []).filter(x => x.status === 'available')))
      );
  }, [selectedPropertyId]);

  // Pre-select room from room board click
  useEffect(() => {
    if (checkInRoomId) {
      setForm(f => ({ ...f, room_id: checkInRoomId }));
    }
  }, [checkInRoomId]);

  // Guest search debounce
  useEffect(() => {
    clearTimeout(searchTimer.current);
    if (query.trim().length < 1) { setResults([]); return; }
    searchTimer.current = setTimeout(() => {
      invoke('guests:search', { query: query.trim() }).then(r => setResults(r || []));
    }, 300);
    return () => clearTimeout(searchTimer.current);
  }, [query]);

  // ── Derived values ────────────────────────────────────────────────────────
  const availableRooms = roomsWithCapacity.filter(r => r.status === 'available');
  const partialRooms   = roomsWithCapacity.filter(r => r.status === 'occupied' && (r.spaces_left || 0) > 0);
  const selectedRoom   = roomsWithCapacity.find(r => r.id === form.room_id);
  const isPartialRoom  = selectedRoom?.status === 'occupied';
  const nights = form.check_in_date && form.check_out_date
    ? Math.max(0, Math.round((new Date(form.check_out_date) - new Date(form.check_in_date)) / 86400000))
    : 0;
  const pricePerNight  = parseFloat(form.price_per_night) || selectedRoom?.price_per_night || 0;
  const totalAmount    = pricePerNight * nights;

  const groupNights = groupShared.check_in_date && groupShared.check_out_date
    ? Math.max(0, Math.round((new Date(groupShared.check_out_date) - new Date(groupShared.check_in_date)) / 86400000))
    : 0;
  const groupPrice   = parseFloat(groupShared.price_per_night) || 0;
  const groupTotal   = groupPrice * groupNights;

  const assignedRoomIds = Object.entries(roomAssignments)
    .filter(([, idxs]) => idxs.length > 0).map(([rId]) => rId);
  const assignedRoomsData = assignedRoomIds
    .map(rId => ({ room: roomsWithCapacity.find(r => r.id === rId), idxs: roomAssignments[rId] || [] }))
    .filter(x => x.room);

  // ── Helpers ───────────────────────────────────────────────────────────────
  function showToast(msg) { setToast(msg); setTimeout(() => setToast(null), 3500); }
  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }
  function setG(k, v) { setGroupShared(g => ({ ...g, [k]: v })); }

  function setGroupPerson(idx, k, v) {
    setGroupPersons(ps => ps.map((p, i) => i === idx ? { ...p, [k]: v } : p));
  }

  function setGI(k, v) { setGroupInfo(g => ({ ...g, [k]: v })); }

  function assignPersonRoom(personIdx, newRoomId) {
    setGroupPersons(ps => ps.map((p, i) => i === personIdx ? { ...p, room_id: newRoomId } : p));
    setRoomAssignments(prev => {
      const next = {};
      for (const [rId, idxs] of Object.entries(prev)) {
        next[rId] = idxs.filter(i => i !== personIdx);
      }
      if (newRoomId) next[newRoomId] = [...(next[newRoomId] || []), personIdx];
      return next;
    });
  }

  function toggleChef(personIdx) {
    setGroupPersons(ps => ps.map((p, i) => ({ ...p, isChef: i === personIdx ? !p.isChef : false })));
  }

  function getSpacesLeft(room, currentPersonIdx) {
    const assignedByOthers = (roomAssignments[room.id] || []).filter(i => i !== currentPersonIdx).length;
    const existing = room.guest_count || 0;
    return room.capacity - assignedByOthers - existing;
  }

  function prefillFromGuest(guest) {
    setForm(f => ({
      ...f,
      last_name: guest.last_name || '', first_name: guest.first_name || '',
      date_of_birth: guest.date_of_birth || '', place_of_birth: guest.place_of_birth || '',
      nationality: guest.nationality || '', profession: guest.profession || '',
      permanent_address: guest.permanent_address || '',
      document_type: guest.document_type || 'Passeport',
      document_number: guest.document_number || '',
      document_issued_at: guest.document_issued_at || '',
      document_issued_date: guest.document_issued_date || '',
    }));
  }

  function handleGuestSelect(guest) {
    if (guest.tag === 'blacklist') { setBlacklistAlert(guest); return; }
    setGuestId(guest.id);
    setIsNewGuest(false);
    prefillFromGuest(guest);
    setPhase('form');
  }

  function proceedWithBlacklisted() {
    const g = blacklistAlert;
    setBlacklistAlert(null);
    setGuestId(g.id);
    setIsNewGuest(false);
    prefillFromGuest(g);
    setPhase('form');
  }

  function startNewGuest() {
    setGuestId(null);
    setIsNewGuest(true);
    setForm(emptyForm());
    setPhase('form');
  }

  // ── Individual confirm ────────────────────────────────────────────────────
  async function handleConfirm() {
    const errs = {};
    if (!form.room_id) errs.room_id = 'Requis';
    if (!form.last_name.trim()) errs.last_name = 'Requis';
    if (!form.first_name.trim()) errs.first_name = 'Requis';
    if (!form.check_in_date) errs.check_in_date = 'Requis';
    if (!form.check_out_date) errs.check_out_date = 'Requis';
    if (form.check_out_date && form.check_out_date <= form.check_in_date) {
      errs.check_out_date = "Doit être après l'arrivée";
    }
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    try {
      if (isPartialRoom) {
        // Add guest to existing reservation
        const result = await invoke('reservation_guests:add', {
          reservation_id: selectedRoom.reservation_id,
          guest: {
            id: isNewGuest ? null : guestId,
            last_name: form.last_name, first_name: form.first_name,
            date_of_birth: form.date_of_birth || null,
            place_of_birth: form.place_of_birth || null,
            nationality: form.nationality || null,
            profession: form.profession || null,
            permanent_address: form.permanent_address || null,
            document_type: form.document_type || null,
            document_number: form.document_number || null,
            document_issued_at: form.document_issued_at || null,
            document_issued_date: form.document_issued_date || null,
            coming_from: form.coming_from || null,
            going_to: form.going_to || null,
            morocco_entry_number: form.morocco_entry_number || null,
          },
        });
        // Supabase returns truthy on success (not {ok:true})
        if (!result) { showToast("Erreur lors de l'ajout"); setSaving(false); return; }
        setSavedReservationId(selectedRoom.reservation_id);
        showToast(`✓ ${form.last_name} ${form.first_name} ajouté(e) à la Ch. ${selectedRoom.room_number}`);
      } else {
        // OTA availability check — channels:checkAvailability returns null in web, treat null as available
        if (form.room_id && form.check_in_date && form.check_out_date && selectedPropertyId) {
          const avail = await invoke('channels:checkAvailability', {
            property_id: selectedPropertyId, room_id: form.room_id,
            start_date: form.check_in_date, end_date: form.check_out_date,
          });
          // avail is null in web (not implemented) → treat as available, skip check
          if (avail !== null && avail.available === false) {
            const msg = avail.otaConflict
              ? `⚠ Ces dates sont bloquées par ${avail.otaConflict.source_name}. Continuer quand même ?`
              : '⚠ Une réservation existe déjà sur ces dates. Continuer quand même ?';
            if (!window.confirm(msg)) { setSaving(false); return; }
          }
        }

        let finalGuestId = guestId;
        if (isNewGuest) {
          const res = await invoke('guests:create', {
            last_name: form.last_name, first_name: form.first_name,
            date_of_birth: form.date_of_birth || null, place_of_birth: form.place_of_birth || null,
            nationality: form.nationality || null, profession: form.profession || null,
            permanent_address: form.permanent_address || null,
            document_type: form.document_type || null, document_number: form.document_number || null,
            document_issued_at: form.document_issued_at || null, document_issued_date: form.document_issued_date || null,
          });
          finalGuestId = extractId(res);
        }

        const pricePer = parseFloat(form.price_per_night) || selectedRoom?.price_per_night || 0;
        const resResult = await invoke('reservations:create', {
          property_id: selectedPropertyId, room_id: form.room_id, guest_id: finalGuestId,
          check_in_date: form.check_in_date, check_out_date: form.check_out_date,
          arrival_time: form.arrival_time || null,
          coming_from: form.coming_from || null, going_to: form.going_to || null,
          morocco_entry_number: form.morocco_entry_number || null,
          adults: form.adults || 1, children: form.children || 0,
          price_per_night: pricePer, payment_type: form.payment_type, channel: 'direct',
        });
        const reservationId = extractId(resResult);

        setSavedReservationId(reservationId);
        const roomLabel = selectedRoom ? `Ch. ${selectedRoom.room_number}` : '';
        showToast(`✓ ${form.last_name} ${form.first_name} → ${roomLabel} — Check-in enregistré`);
      }
    } catch (e) {
      showToast("Erreur lors de l'enregistrement. Réessayez.");
    }
    setSaving(false);
  }

  // ── Individual print — web version ────────────────────────────────────────
  async function handlePrintFiche() {
    if (!savedReservationId) return;
    setPrinting(true); setPrintError(null);
    try {
      webPrint(`<!DOCTYPE html><html><head><title>Fiche Police</title>${PRINT_STYLE}</head><body>
        <h2>Fiche Individuelle de Police</h2>
        <table>
          <tr><th>Nom</th><td>${form.last_name} ${form.first_name}</td></tr>
          <tr><th>Chambre</th><td>${selectedRoom?.room_number || ''}</td></tr>
          <tr><th>Arrivée</th><td>${form.check_in_date}</td></tr>
          <tr><th>Départ</th><td>${form.check_out_date}</td></tr>
          <tr><th>Nationalité</th><td>${form.nationality || ''}</td></tr>
          <tr><th>Date naissance</th><td>${form.date_of_birth || ''}</td></tr>
          <tr><th>Lieu naissance</th><td>${form.place_of_birth || ''}</td></tr>
          <tr><th>Profession</th><td>${form.profession || ''}</td></tr>
          <tr><th>Domicile</th><td>${form.permanent_address || ''}</td></tr>
          <tr><th>Pièce</th><td>${form.document_type} — ${form.document_number || ''}</td></tr>
          <tr><th>Provenance</th><td>${form.coming_from || ''}</td></tr>
          <tr><th>Destination</th><td>${form.going_to || ''}</td></tr>
          <tr><th>N° entrée Maroc</th><td>${form.morocco_entry_number || ''}</td></tr>
        </table></body></html>`);
    } catch { setPrintError('Erreur impression'); }
    setPrinting(false);
  }

  async function handleSaveFichePDF() {
    // Web: same as print — user saves as PDF from browser print dialog
    await handlePrintFiche();
  }

  // ── Group confirm ─────────────────────────────────────────────────────────
  async function handleGroupConfirm() {
    const errs = {};
    if (!groupShared.check_in_date)  errs.check_in_date  = 'Requis';
    if (!groupShared.check_out_date) errs.check_out_date = 'Requis';
    if (groupShared.check_out_date && groupShared.check_out_date <= groupShared.check_in_date) {
      errs.check_out_date = "Doit être après l'arrivée";
    }
    if (!groupPersons[0]?.last_name?.trim())  errs.person0_last  = 'Requis';
    if (!groupPersons[0]?.first_name?.trim()) errs.person0_first = 'Requis';
    if (!groupPersons.some(p => p.room_id)) errs.rooms = 'Attribuez au moins une chambre';
    setGroupErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    try {
      // 1. Create group record
      const grpRes = await invoke('groups:create', {
        property_id: selectedPropertyId,
        name: groupInfo.name || `Groupe ${new Date().toLocaleDateString('fr-MA')}`,
        visit_name: groupInfo.visit_name || null,
        agency_id: groupInfo.agency_id || null,
        guide_id: groupInfo.guide_id || null,
        leader_name: groupInfo.leader_name || null,
        leader_phone: groupInfo.leader_phone || null,
        leader_role: groupInfo.leader_role || 'guide',
        check_in_date: groupShared.check_in_date,
        check_out_date: groupShared.check_out_date,
        coming_from: groupShared.coming_from || null,
        going_to: groupShared.going_to || null,
        total_members: groupPersons.length,
      });
      const grpId = extractId(grpRes);

      // 2. Create all guests
      const guestIds = [];
      for (const p of groupPersons) {
        const gRes = await invoke('guests:create', {
          last_name: p.last_name, first_name: p.first_name,
          date_of_birth: p.date_of_birth || null, place_of_birth: p.place_of_birth || null,
          nationality: p.nationality || null, profession: p.profession || null,
          permanent_address: p.permanent_address || null,
          document_type: p.document_type || null, document_number: p.document_number || null,
          document_issued_at: p.document_issued_at || null, document_issued_date: p.document_issued_date || null,
        });
        guestIds.push(extractId(gRes));
      }

      // 3. Group persons by room_id
      const byRoom = {};
      groupPersons.forEach((p, idx) => {
        if (!p.room_id) return;
        if (!byRoom[p.room_id]) byRoom[p.room_id] = [];
        byRoom[p.room_id].push({ guestId: guestIds[idx], isChef: p.isChef });
      });

      const pricePer = parseFloat(groupShared.price_per_night) || 0;
      const guestResMap = {};
      let firstResId = null;

      // 4. For each room, create/update reservation
      for (const [roomId, members] of Object.entries(byRoom)) {
        const room = roomsWithCapacity.find(r => r.id === roomId);
        if (!room) continue;
        const chef = members.find(m => m.isChef) || members[0];
        const roomPrice = pricePer || room.price_per_night || 0;

        if (room.status === 'available') {
          const resResult = await invoke('reservations:create', {
            property_id: selectedPropertyId, room_id: roomId,
            guest_id: chef.guestId, group_id: grpId,
            check_in_date: groupShared.check_in_date, check_out_date: groupShared.check_out_date,
            arrival_time: groupShared.arrival_time || null,
            coming_from: groupShared.coming_from || null, going_to: groupShared.going_to || null,
            adults: members.length, children: 0,
            price_per_night: roomPrice, payment_type: groupShared.payment_type, channel: 'direct',
          });
          const resId = extractId(resResult);
          if (!firstResId) firstResId = resId;
          members.forEach(m => { guestResMap[m.guestId] = resId; });
          for (const m of members) {
            if (m.guestId !== chef.guestId) {
              await invoke('reservation_guests:add', {
                reservation_id: resId,
                guest: { id: m.guestId, coming_from: groupShared.coming_from || null, going_to: groupShared.going_to || null },
              });
            }
          }
        } else if (room.reservation_id) {
          const existingResId = room.reservation_id;
          if (!firstResId) firstResId = existingResId;
          members.forEach(m => { guestResMap[m.guestId] = existingResId; });
          for (const m of members) {
            await invoke('reservation_guests:add', {
              reservation_id: existingResId,
              guest: { id: m.guestId, coming_from: groupShared.coming_from || null, going_to: groupShared.going_to || null },
            });
          }
        }
      }

      setSavedGroupId(grpId);
      setSavedGroupResId(firstResId);
      setSavedGroupGuestIds(guestIds);
      setSavedGuestResMap(guestResMap);
      setSavedGroupPersons([...groupPersons]);
      showToast(`✓ Groupe "${groupInfo.name || 'Groupe'}" — ${guestIds.length} personne${guestIds.length > 1 ? 's' : ''} enregistrées`);
    } catch (e) {
      showToast('Erreur : ' + e.message);
    }
    setSaving(false);
  }

  // ── Group print — web versions ────────────────────────────────────────────
  async function handlePrintIndividuals() {
    if (!savedGroupGuestIds.length) return;
    setPrintingIndividuals(true);
    // Combine all individual fiches into one print window
    let combinedHtml = `<!DOCTYPE html><html><head><title>Fiches Individuelles</title>${PRINT_STYLE}</head><body>`;
    for (let i = 0; i < savedGroupPersons.length; i++) {
      const p = savedGroupPersons[i];
      if (i > 0) combinedHtml += '<div style="page-break-before:always;margin-top:30px"></div>';
      combinedHtml += `<h2>Fiche Individuelle de Police</h2>
        <table>
          <tr><th>Nom</th><td>${p.last_name} ${p.first_name}</td></tr>
          <tr><th>Arrivée</th><td>${groupShared.check_in_date}</td></tr>
          <tr><th>Départ</th><td>${groupShared.check_out_date}</td></tr>
          <tr><th>Chambre</th><td>${p.room_id ? (roomsWithCapacity.find(r => r.id === p.room_id)?.room_number || '') : ''}</td></tr>
          <tr><th>Nationalité</th><td>${p.nationality || ''}</td></tr>
          <tr><th>Date naissance</th><td>${p.date_of_birth || ''}</td></tr>
          <tr><th>Lieu naissance</th><td>${p.place_of_birth || ''}</td></tr>
          <tr><th>Profession</th><td>${p.profession || ''}</td></tr>
          <tr><th>Domicile</th><td>${p.permanent_address || ''}</td></tr>
          <tr><th>Pièce</th><td>${p.document_type} — ${p.document_number || ''}</td></tr>
          <tr><th>Provenance</th><td>${groupShared.coming_from || ''}</td></tr>
          <tr><th>Destination</th><td>${groupShared.going_to || ''}</td></tr>
          <tr><th>N° entrée Maroc</th><td>${p.morocco_entry_number || ''}</td></tr>
        </table>`;
    }
    combinedHtml += '</body></html>';
    webPrint(combinedHtml);
    setPrintingIndividuals(false);
  }

  async function handlePrintGroupTable() {
    if (!savedGroupPersons.length) return;
    setPrintingGroupTable(true);
    const groupName = groupInfo.name || 'Groupe';
    const rows = savedGroupPersons.map((p, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${p.last_name} ${p.first_name}</td>
        <td>${p.nationality || ''}</td>
        <td>${p.document_type} ${p.document_number || ''}</td>
        <td>${p.date_of_birth || ''}</td>
        <td>${p.room_id ? (roomsWithCapacity.find(r => r.id === p.room_id)?.room_number || '') : ''}</td>
      </tr>`).join('');
    webPrint(`<!DOCTYPE html><html><head><title>Tableau Groupe</title>${PRINT_STYLE}
      <style>table td,table th{padding:4px 8px;font-size:11px}</style>
      </head><body>
      <h2>Tableau de Groupe — ${groupName}</h2>
      <p>Arrivée: ${groupShared.check_in_date} — Départ: ${groupShared.check_out_date}</p>
      <table>
        <thead><tr><th>#</th><th>Nom</th><th>Nationalité</th><th>Pièce</th><th>Date naissance</th><th>Chambre</th></tr></thead>
        <tbody>${rows}</tbody>
      </table></body></html>`);
    setPrintingGroupTable(false);
  }

  // ── Room dropdown helper ──────────────────────────────────────────────────
  function RoomSelect({ value, onChange, error, onRoomChange }) {
    return (
      <select
        value={value}
        onChange={e => {
          const room = roomsWithCapacity.find(r => r.id === e.target.value);
          onChange(e.target.value);
          if (onRoomChange) onRoomChange(room);
        }}
        style={{ ...FIELD, cursor: 'pointer', ...(error ? { border: `1.5px solid ${theme.coral}` } : {}) }}
      >
        <option value="">— Sélectionner —</option>
        {availableRooms.length > 0 && (
          <optgroup label="Chambres disponibles">
            {availableRooms.map(r => (
              <option key={r.id} value={r.id}>
                Ch. {r.room_number}{r.room_name ? ` — ${r.room_name}` : ''}{r.room_type ? ` · ${r.room_type}` : ''}
                {r.price_per_night > 0 ? ` · ${r.price_per_night} MAD` : ''}
              </option>
            ))}
          </optgroup>
        )}
        {partialRooms.length > 0 && (
          <optgroup label="Partiellement occupées (places libres)">
            {partialRooms.map(r => (
              <option key={r.id} value={r.id}>
                Ch. {r.room_number}{r.room_name ? ` — ${r.room_name}` : ''} · {r.guest_count}/{r.capacity} place{r.capacity > 1 ? 's' : ''} utilisée{r.capacity > 1 ? 's' : ''}
              </option>
            ))}
          </optgroup>
        )}
      </select>
    );
  }

  const inp = (k) => ({
    ...FIELD,
    value: form[k],
    onChange: e => set(k, e.target.value),
    ...(errors[k] ? { border: `1.5px solid ${theme.coral}` } : {}),
  });

  // ── Toast ─────────────────────────────────────────────────────────────────
  const Toast = () => toast ? (
    <div style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      background: '#16a34a', color: theme.white, borderRadius: 10,
      padding: '12px 24px', fontSize: 13, fontWeight: 700, zIndex: 9999,
      boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
    }}>{toast}</div>
  ) : null;

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: Blacklist overlay
  // ═══════════════════════════════════════════════════════════════════════════
  if (blacklistAlert) {
    return (
      <div style={{
        position: 'fixed', inset: 0, background: 'rgba(255,50,50,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000,
      }}>
        <div style={{
          background: theme.white, borderRadius: 16, padding: 40, width: 460,
          border: `3px solid ${theme.coral}`, boxShadow: '0 20px 60px rgba(255,127,80,0.25)',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⛔</div>
          <div style={{ fontSize: 18, fontWeight: 900, color: theme.coral, marginBottom: 12, textTransform: 'uppercase' }}>
            ATTENTION — CLIENT SUR LISTE NOIRE
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: theme.dark, marginBottom: 8 }}>
            {blacklistAlert.last_name} {blacklistAlert.first_name}
          </div>
          {blacklistAlert.notes && (
            <div style={{ background: `${theme.coral}12`, borderRadius: 8, padding: '10px 16px', fontSize: 13, color: theme.dark, marginBottom: 20, textAlign: 'left' }}>
              <strong>Raison :</strong> {blacklistAlert.notes}
            </div>
          )}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button onClick={() => setBlacklistAlert(null)} style={{
              background: theme.coral, color: theme.white, borderRadius: 8,
              padding: '12px 28px', border: 'none', fontWeight: 700, fontSize: 14,
              fontFamily: theme.font, cursor: 'pointer',
            }}>Refuser l'enregistrement</button>
            <button onClick={proceedWithBlacklisted} style={{
              background: 'rgba(31,42,46,0.07)', color: theme.dark, borderRadius: 8,
              padding: '12px 20px', border: 'none', fontWeight: 500, fontSize: 12,
              fontFamily: theme.font, cursor: 'pointer',
            }}>Continuer quand même</button>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: Group mode
  // ═══════════════════════════════════════════════════════════════════════════
  if (checkInType === 'group') {
    function resetGroup() {
      setSavedGroupId(null); setSavedGroupResId(null);
      setSavedGroupGuestIds([]); setSavedGuestResMap({});
      setGroupPersons([{ ...emptyGroupPerson(), isChef: true }]);
      setRoomAssignments({});
      setGroupInfo({ name: '', visit_name: '', agency_id: null, guide_id: null, leader_name: '', leader_phone: '', leader_role: 'guide' });
      setAgencyQuery(''); setAgencySelected(null); setAgencySuggestions([]);
      setGuideOptions([]); setShowNewGuideForm(false); setNewGuide({ name: '', phone: '', role: 'guide' });
    }

    return (
      <div style={{ fontFamily: theme.font, maxWidth: 800 }}>
        <Toast />

        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24, gap: 12 }}>
          <button onClick={() => { setCheckInType('individual'); resetGroup(); }}
            style={{ background: 'rgba(31,42,46,0.07)', border: 'none', borderRadius: 7, padding: '7px 14px', cursor: 'pointer', fontSize: 13, fontFamily: theme.font, color: theme.dark, fontWeight: 600 }}>
            ← Retour
          </button>
          <h1 style={{ fontSize: 20, fontWeight: 900, color: theme.dark, margin: 0 }}>Check-in Groupe</h1>
        </div>

        <TypeToggle value={checkInType} onChange={v => { setCheckInType(v); setSavedGroupId(null); setSavedGroupResId(null); }} />

        <div style={{ background: theme.white, borderRadius: 16, padding: 28, border: '1px solid rgba(31,42,46,0.08)', boxShadow: '0 4px 24px rgba(31,42,46,0.06)' }}>

          {/* ── Section 1: Group Info ── */}
          <SectionTitle icon="🏷️" title="Informations du groupe" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>

            {/* Agency combobox */}
            <div style={{ marginBottom: 14, gridColumn: 'span 2', position: 'relative' }}>
              <FieldLabel fr="Agence / Groupe" />
              <input value={agencySelected ? agencySelected.name : agencyQuery}
                onChange={async e => {
                  const q = e.target.value;
                  setAgencyQuery(q);
                  setAgencySelected(null);
                  setGI('agency_id', null);
                  setGI('name', q);
                  clearTimeout(agencyTimer.current);
                  if (q.trim().length >= 1) {
                    agencyTimer.current = setTimeout(async () => {
                      const res = await invoke('agencies:search', { q });
                      setAgencySuggestions(res || []);
                    }, 250);
                  } else {
                    setAgencySuggestions([]);
                  }
                }}
                onFocus={async () => {
                  if (!agencySelected && agencyQuery.trim().length === 0) {
                    const res = await invoke('agencies:getAll');
                    setAgencySuggestions((res || []).slice(0, 6));
                  }
                }}
                onBlur={() => setTimeout(() => setAgencySuggestions([]), 180)}
                placeholder="Rechercher ou saisir une agence..."
                style={FIELD} />
              {agencySuggestions.length > 0 && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 99,
                  background: theme.white, border: `1px solid rgba(31,42,46,0.15)`,
                  borderRadius: 10, boxShadow: '0 8px 24px rgba(31,42,46,0.12)',
                  marginTop: 2, overflow: 'hidden',
                }}>
                  {agencySuggestions.map(a => (
                    <div key={a.id} onMouseDown={async () => {
                      setAgencySelected(a);
                      setAgencyQuery(a.name);
                      setGI('name', a.name);
                      setGI('agency_id', a.id);
                      setAgencySuggestions([]);
                      const gs = await invoke('guides:getAll', { agency_id: a.id });
                      setGuideOptions(gs || []);
                      setGI('guide_id', null);
                      setGI('leader_name', '');
                      setGI('leader_phone', '');
                    }} style={{
                      padding: '10px 14px', cursor: 'pointer', fontSize: 13, color: theme.dark,
                      borderBottom: `1px solid rgba(31,42,46,0.06)`,
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(31,42,46,0.04)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <span style={{ fontWeight: 700 }}>{a.name}</span>
                      {(a.city || a.country) && <span style={{ fontSize: 11, opacity: 0.55, marginLeft: 8 }}>{[a.city, a.country].filter(Boolean).join(', ')}</span>}
                    </div>
                  ))}
                  {agencyQuery.trim() && !agencySuggestions.some(a => a.name.toLowerCase() === agencyQuery.toLowerCase()) && (
                    <div onMouseDown={async () => {
                      const result = await invoke('agencies:create', { name: agencyQuery.trim() });
                      const newId = extractId(result);
                      const newA = { id: newId, name: agencyQuery.trim() };
                      setAgencySelected(newA);
                      setGI('agency_id', newId);
                      setGI('name', agencyQuery.trim());
                      setAgencySuggestions([]);
                      setGuideOptions([]);
                    }} style={{
                      padding: '10px 14px', cursor: 'pointer', fontSize: 13,
                      color: theme.teal, fontWeight: 700, borderTop: `1px solid rgba(31,42,46,0.06)`,
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = `${theme.teal}08`}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      + Créer « {agencyQuery.trim()} »
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Visit name */}
            <div style={{ marginBottom: 14, gridColumn: 'span 2' }}>
              <FieldLabel fr="Nom de la visite / circuit (optionnel)" />
              <input value={groupInfo.visit_name} onChange={e => setGI('visit_name', e.target.value)}
                placeholder="Ex: Circuit du Nord, Excursion Rif..." style={FIELD} />
            </div>

            {/* Guide selector */}
            <div style={{ marginBottom: 14, gridColumn: 'span 2' }}>
              <FieldLabel fr="Responsable / Guide" />
              {guideOptions.length > 0 ? (
                <>
                  <select value={showNewGuideForm ? '__new__' : (groupInfo.guide_id || '')} onChange={e => {
                    const gid = e.target.value;
                    if (gid === '__new__') {
                      setShowNewGuideForm(true);
                      setGI('guide_id', null);
                      setGI('leader_name', '');
                      setGI('leader_phone', '');
                    } else {
                      setShowNewGuideForm(false);
                      setGI('guide_id', gid || null);
                      const g = guideOptions.find(x => x.id === gid);
                      if (g) { setGI('leader_name', g.name); setGI('leader_phone', g.phone || ''); setGI('leader_role', g.role || 'guide'); }
                      else { setGI('leader_name', ''); setGI('leader_phone', ''); }
                    }
                  }} style={{ ...FIELD, cursor: 'pointer' }}>
                    <option value="">— Choisir un guide —</option>
                    {guideOptions.map(g => (
                      <option key={g.id} value={g.id}>{g.name}{g.role ? ` (${g.role})` : ''}</option>
                    ))}
                    <option value="__new__">+ Ajouter nouveau guide...</option>
                  </select>

                  {showNewGuideForm && (
                    <div style={{
                      border: `1.5px solid ${theme.teal}`, borderRadius: 10,
                      padding: 14, marginTop: 8, background: `${theme.teal}08`,
                    }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: theme.teal, marginBottom: 10 }}>
                        Nouveau guide / responsable
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                        <div>
                          <label style={{ fontSize: 11, color: theme.dark, opacity: 0.55 }}>Nom complet *</label>
                          <input value={newGuide.name}
                            onChange={e => setNewGuide(p => ({ ...p, name: e.target.value }))}
                            placeholder="Hassan Idrissi"
                            style={{ ...FIELD, marginTop: 4 }} />
                        </div>
                        <div>
                          <label style={{ fontSize: 11, color: theme.dark, opacity: 0.55 }}>Téléphone</label>
                          <input value={newGuide.phone}
                            onChange={e => setNewGuide(p => ({ ...p, phone: e.target.value }))}
                            placeholder="+212 6XX XX XX XX"
                            style={{ ...FIELD, marginTop: 4 }} />
                        </div>
                      </div>
                      <div style={{ marginBottom: 10 }}>
                        <label style={{ fontSize: 11, color: theme.dark, opacity: 0.55 }}>Rôle</label>
                        <select value={newGuide.role}
                          onChange={e => setNewGuide(p => ({ ...p, role: e.target.value }))}
                          style={{ ...FIELD, marginTop: 4, cursor: 'pointer' }}>
                          <option value="guide">Guide</option>
                          <option value="leader">Chef de groupe</option>
                          <option value="representative">Représentant</option>
                          <option value="other">Autre</option>
                        </select>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => { setShowNewGuideForm(false); setNewGuide({ name: '', phone: '', role: 'guide' }); }} style={{
                          flex: 1, padding: '8px', borderRadius: 8,
                          border: `1px solid rgba(31,42,46,0.2)`, background: theme.white,
                          cursor: 'pointer', fontSize: 13, fontFamily: theme.font,
                        }}>Annuler</button>
                        <button onClick={async () => {
                          if (!newGuide.name.trim()) return;
                          const result = await invoke('guides:create', {
                            agency_id: groupInfo.agency_id || null,
                            name: newGuide.name.trim(),
                            phone: newGuide.phone.trim(),
                            role: newGuide.role,
                          });
                          const newId = extractId(result);
                          const created = { id: newId, name: newGuide.name.trim(), phone: newGuide.phone.trim(), role: newGuide.role, agency_id: groupInfo.agency_id };
                          setGuideOptions(prev => [...prev, created]);
                          setGI('guide_id', newId);
                          setGI('leader_name', created.name);
                          setGI('leader_phone', created.phone);
                          setGI('leader_role', created.role);
                          setShowNewGuideForm(false);
                          setNewGuide({ name: '', phone: '', role: 'guide' });
                        }} disabled={!newGuide.name.trim()} style={{
                          flex: 2, padding: '8px', borderRadius: 8, border: 'none',
                          background: theme.teal, color: theme.white, fontWeight: 700,
                          fontSize: 13, fontFamily: theme.font, cursor: 'pointer',
                          opacity: newGuide.name.trim() ? 1 : 0.5,
                        }}>✓ Créer et sélectionner</button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <input value={groupInfo.leader_name} onChange={e => setGI('leader_name', e.target.value)}
                  placeholder="Nom du responsable / guide" style={FIELD} />
              )}
            </div>

            {/* Role + Phone */}
            <div style={{ marginBottom: 14 }}>
              <FieldLabel fr="Rôle" />
              <div style={{ display: 'flex', gap: 6 }}>
                {['guide', 'chef', 'représentant', 'autre'].map(r => (
                  <button key={r} onClick={() => setGI('leader_role', r)} style={{
                    flex: 1, padding: '7px 4px', borderRadius: 7, cursor: 'pointer',
                    border: groupInfo.leader_role === r ? `2px solid ${theme.teal}` : `1.5px solid rgba(31,42,46,0.2)`,
                    background: groupInfo.leader_role === r ? `${theme.teal}10` : theme.white,
                    color: groupInfo.leader_role === r ? theme.teal : theme.dark,
                    fontWeight: groupInfo.leader_role === r ? 700 : 500,
                    fontSize: 11, fontFamily: theme.font, textTransform: 'capitalize',
                  }}>{r.charAt(0).toUpperCase() + r.slice(1)}</button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <FieldLabel fr="Téléphone du responsable" />
              <input value={groupInfo.leader_phone} onChange={e => setGI('leader_phone', e.target.value)}
                placeholder="+212 6XX XXX XXX" style={FIELD} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <FieldLabel fr="Date d'arrivée" required />
              <input type="date" value={groupShared.check_in_date} onChange={e => setG('check_in_date', e.target.value)}
                style={{ ...FIELD, ...(groupErrors.check_in_date ? { border: `1.5px solid ${theme.coral}` } : {}) }} />
              {groupErrors.check_in_date && <div style={{ color: theme.coral, fontSize: 11, marginTop: 3 }}>{groupErrors.check_in_date}</div>}
            </div>
            <div style={{ marginBottom: 14 }}>
              <FieldLabel fr="Date de départ" required />
              <input type="date" min={groupShared.check_in_date || today} value={groupShared.check_out_date} onChange={e => setG('check_out_date', e.target.value)}
                style={{ ...FIELD, ...(groupErrors.check_out_date ? { border: `1.5px solid ${theme.coral}` } : {}) }} />
              {groupErrors.check_out_date && <div style={{ color: theme.coral, fontSize: 11, marginTop: 3 }}>{groupErrors.check_out_date}</div>}
            </div>
            <div style={{ marginBottom: 14 }}>
              <FieldLabel fr="Venant de" />
              <input value={groupShared.coming_from} onChange={e => setG('coming_from', e.target.value)} placeholder="Paris, France" style={FIELD} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <FieldLabel fr="Allant à" />
              <input value={groupShared.going_to} onChange={e => setG('going_to', e.target.value)} placeholder="Marrakech" style={FIELD} />
            </div>
          </div>

          {/* ── Section 2: Room Assignment Overview ── */}
          <SectionTitle icon="🏠" title="Attribution des chambres" />
          {groupErrors.rooms && (
            <div style={{ color: theme.coral, fontSize: 12, marginBottom: 10, fontWeight: 600 }}>⚠ {groupErrors.rooms}</div>
          )}
          {assignedRoomsData.length === 0 ? (
            <div style={{ background: `${SAFFRON}12`, border: `1px dashed ${SAFFRON}80`, borderRadius: 10, padding: '12px 16px', fontSize: 13, color: theme.dark, opacity: 0.7, marginBottom: 14 }}>
              Attribuez des chambres à chaque membre ci-dessous
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
              {assignedRoomsData.map(({ room, idxs }) => {
                const existingGuests = room.guest_count || 0;
                const totalUsed = existingGuests + idxs.length;
                const pct = Math.min(100, Math.round((totalUsed / (room.capacity || 1)) * 100));
                return (
                  <div key={room.id} style={{ background: `${theme.teal}08`, border: `1.5px solid ${theme.teal}40`, borderRadius: 10, padding: '10px 14px', minWidth: 140 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: theme.teal, marginBottom: 4 }}>Ch. {room.room_number}</div>
                    <div style={{ fontSize: 11, color: theme.dark, opacity: 0.6, marginBottom: 6 }}>{idxs.length} nouveau{idxs.length > 1 ? 'x' : ''} · cap. {room.capacity}</div>
                    <div style={{ background: 'rgba(31,42,46,0.1)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: pct >= 100 ? theme.coral : theme.teal, transition: 'width 0.3s' }} />
                    </div>
                    <div style={{ fontSize: 10, color: theme.dark, opacity: 0.5, marginTop: 3 }}>{totalUsed}/{room.capacity}</div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Section 3: Per-person cards ── */}
          <SectionTitle icon="👥" title={`Membres du groupe (${groupPersons.length} personne${groupPersons.length > 1 ? 's' : ''})`} />

          {groupPersons.map((p, idx) => {
            const isChef = p.isChef;
            return (
              <div key={idx} style={{
                border: `1.5px solid ${isChef ? SAFFRON : 'rgba(31,42,46,0.15)'}`,
                borderRadius: 12, padding: '14px 18px', marginBottom: 12,
                background: isChef ? `${SAFFRON}08` : theme.white,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: isChef ? SAFFRON : theme.dark, opacity: isChef ? 1 : 0.6, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                    Personne {idx + 1}{isChef ? ' ⭐ Chef' : ''}
                  </span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => toggleChef(idx)} title="Marquer comme chef du groupe" style={{
                      background: isChef ? SAFFRON : 'rgba(31,42,46,0.06)', border: 'none', borderRadius: 6,
                      padding: '4px 10px', cursor: 'pointer', fontSize: 13, color: isChef ? theme.white : theme.dark, fontWeight: isChef ? 700 : 400,
                    }}>⭐</button>
                    {groupPersons.length > 1 && (
                      <button onClick={() => {
                        const oldRoomId = p.room_id;
                        setGroupPersons(ps => ps.filter((_, i) => i !== idx));
                        if (oldRoomId) setRoomAssignments(prev => ({ ...prev, [oldRoomId]: (prev[oldRoomId] || []).filter(i => i !== idx).map(i => i > idx ? i - 1 : i) }));
                      }}
                        style={{ background: 'none', border: 'none', color: theme.coral, fontSize: 18, cursor: 'pointer', padding: '0 4px' }}>✕</button>
                    )}
                  </div>
                </div>

                {/* Per-person room selector */}
                <div style={{ marginBottom: 12 }}>
                  <FieldLabel fr="Chambre attribuée" />
                  <select value={p.room_id} onChange={e => assignPersonRoom(idx, e.target.value)}
                    style={{ ...FIELD, cursor: 'pointer' }}>
                    <option value="">— Sélectionner une chambre —</option>
                    {availableRooms.map(r => {
                      const left = getSpacesLeft(r, idx);
                      const isFull = left <= 0;
                      return (
                        <option key={r.id} value={r.id} disabled={isFull && p.room_id !== r.id}>
                          Ch. {r.room_number}{r.room_name ? ` — ${r.room_name}` : ''}{r.room_type ? ` · ${r.room_type}` : ''}
                          {' · '}{isFull ? '(Complet)' : `${left} place${left > 1 ? 's' : ''} libre${left > 1 ? 's' : ''}`}
                        </option>
                      );
                    })}
                    {partialRooms.length > 0 && partialRooms.map(r => {
                      const left = getSpacesLeft(r, idx);
                      const isFull = left <= 0;
                      return (
                        <option key={r.id} value={r.id} disabled={isFull && p.room_id !== r.id}>
                          Ch. {r.room_number} (part.) · {isFull ? 'Complet' : `${left} libre${left > 1 ? 's' : ''}`}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                  <div style={{ marginBottom: 12 }}>
                    <FieldLabel fr="Nom" required={idx === 0} />
                    <input value={p.last_name} onChange={e => setGroupPerson(idx, 'last_name', e.target.value)} placeholder="ALAMI"
                      style={{ ...FIELD, ...(idx === 0 && groupErrors.person0_last ? { border: `1.5px solid ${theme.coral}` } : {}) }} />
                    {idx === 0 && groupErrors.person0_last && <div style={{ color: theme.coral, fontSize: 11, marginTop: 3 }}>{groupErrors.person0_last}</div>}
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <FieldLabel fr="Prénom" required={idx === 0} />
                    <input value={p.first_name} onChange={e => setGroupPerson(idx, 'first_name', e.target.value)} placeholder="Mohammed"
                      style={{ ...FIELD, ...(idx === 0 && groupErrors.person0_first ? { border: `1.5px solid ${theme.coral}` } : {}) }} />
                    {idx === 0 && groupErrors.person0_first && <div style={{ color: theme.coral, fontSize: 11, marginTop: 3 }}>{groupErrors.person0_first}</div>}
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <FieldLabel fr="Date de naissance" />
                    <input type="date" value={p.date_of_birth} onChange={e => setGroupPerson(idx, 'date_of_birth', e.target.value)} style={FIELD} />
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <FieldLabel fr="Lieu de naissance" />
                    <input value={p.place_of_birth} onChange={e => setGroupPerson(idx, 'place_of_birth', e.target.value)} placeholder="Casablanca" style={FIELD} />
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <FieldLabel fr="Nationalité" />
                    <input value={p.nationality} onChange={e => setGroupPerson(idx, 'nationality', e.target.value)} placeholder="Marocaine" style={FIELD} />
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <FieldLabel fr="Profession" />
                    <input value={p.profession} onChange={e => setGroupPerson(idx, 'profession', e.target.value)} placeholder="Ingénieur" style={FIELD} />
                  </div>
                  <div style={{ marginBottom: 12, gridColumn: 'span 2' }}>
                    <FieldLabel fr="Domicile habituel" />
                    <input value={p.permanent_address} onChange={e => setGroupPerson(idx, 'permanent_address', e.target.value)} placeholder="Adresse permanente" style={FIELD} />
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <FieldLabel fr="Type document" />
                    <select value={p.document_type} onChange={e => setGroupPerson(idx, 'document_type', e.target.value)} style={{ ...FIELD, cursor: 'pointer' }}>
                      {['Passeport', 'CIN', 'Titre de séjour', 'Carte consulaire', 'Autre'].map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <FieldLabel fr="N° document" />
                    <input value={p.document_number} onChange={e => setGroupPerson(idx, 'document_number', e.target.value)} placeholder="AB123456" style={FIELD} />
                  </div>
                  <div style={{ marginBottom: 12, gridColumn: 'span 2' }}>
                    <FieldLabel fr="N° d'entrée au Maroc" />
                    <input value={p.morocco_entry_number} onChange={e => setGroupPerson(idx, 'morocco_entry_number', e.target.value)} placeholder="Numéro d'entrée" style={FIELD} />
                  </div>
                </div>
              </div>
            );
          })}

          <button onClick={() => setGroupPersons(ps => [...ps, emptyGroupPerson()])}
            style={{
              background: `${theme.teal}10`, color: theme.teal, border: `1.5px dashed ${theme.teal}50`,
              borderRadius: 10, padding: '10px 20px', cursor: 'pointer', fontWeight: 700,
              fontSize: 13, fontFamily: theme.font, width: '100%', marginBottom: 8,
            }}>
            + Ajouter une personne
          </button>

          {/* ── Payment ── */}
          <SectionTitle icon="💳" title="Paiement" />
          <div style={{ marginBottom: 14 }}>
            <FieldLabel fr="Mode de règlement" />
            <div style={{ display: 'flex', gap: 8 }}>
              {[{ k: 'checkout', label: 'À la sortie' }, { k: 'immediate', label: 'Immédiat' }, { k: 'deposit', label: 'Acompte' }].map(({ k, label }) => (
                <button key={k} onClick={() => setG('payment_type', k)} style={{
                  flex: 1, padding: '10px 8px', borderRadius: 8, cursor: 'pointer',
                  border: groupShared.payment_type === k ? `2px solid ${theme.teal}` : `1.5px solid rgba(31,42,46,0.2)`,
                  background: groupShared.payment_type === k ? `${theme.teal}10` : theme.white,
                  color: groupShared.payment_type === k ? theme.teal : theme.dark,
                  fontWeight: groupShared.payment_type === k ? 700 : 500,
                  fontSize: 12, fontFamily: theme.font,
                }}>{label}</button>
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px', marginBottom: 14 }}>
            <div>
              <FieldLabel fr="Prix / nuit (MAD)" />
              <input type="number" min="0" step="10" value={groupShared.price_per_night}
                onChange={e => setG('price_per_night', e.target.value)} placeholder="0" style={FIELD} />
            </div>
            {groupNights > 0 && groupPrice > 0 && (
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <div style={{ background: `${theme.teal}10`, borderRadius: 8, padding: '9px 14px', fontSize: 13, color: theme.teal, fontWeight: 700, width: '100%', boxSizing: 'border-box' }}>
                  {groupNights} nuit{groupNights > 1 ? 's' : ''} × {groupPrice.toLocaleString('fr-MA')} = {groupTotal.toLocaleString('fr-MA')} MAD
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Success banner */}
        {savedGroupId && (
          <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, padding: '14px 18px', marginTop: 16, fontSize: 13, color: '#15803d', fontWeight: 600 }}>
            ✓ Groupe "{groupInfo.name || 'Groupe'}" enregistré — {savedGroupGuestIds.length} personne{savedGroupGuestIds.length > 1 ? 's' : ''}
            {assignedRoomsData.length > 0 && (
              <span style={{ fontWeight: 400, marginLeft: 8 }}>
                — Chambres : {assignedRoomsData.map(x => `Ch. ${x.room.room_number}`).join(', ')}
              </span>
            )}
          </div>
        )}

        {/* Action bar */}
        <div style={{ display: 'flex', gap: 12, marginTop: 20, justifyContent: 'flex-end', position: 'sticky', bottom: 0, background: theme.cream, paddingBottom: 8, paddingTop: 8 }}>
          {savedGroupId ? (
            <>
              <button onClick={handlePrintIndividuals} disabled={printingIndividuals} style={{
                background: theme.dark, color: theme.white, borderRadius: 8, padding: '12px 20px', border: 'none', fontWeight: 600, fontSize: 13,
                fontFamily: theme.font, cursor: printingIndividuals ? 'wait' : 'pointer', opacity: printingIndividuals ? 0.7 : 1,
              }}>{printingIndividuals ? '⏳...' : '🖨 Fiches individuelles'}</button>
              <button onClick={handlePrintGroupTable} disabled={printingGroupTable} style={{
                background: 'rgba(31,42,46,0.08)', color: theme.dark, borderRadius: 8, padding: '12px 20px',
                border: '1.5px solid rgba(31,42,46,0.15)', fontWeight: 600, fontSize: 13,
                fontFamily: theme.font, cursor: printingGroupTable ? 'wait' : 'pointer', opacity: printingGroupTable ? 0.7 : 1,
              }}>{printingGroupTable ? '⏳...' : '📋 Tableau de groupe'}</button>
              <button onClick={() => { setCheckInRoomId(null); setPage('rooms'); }} style={{
                background: theme.teal, color: theme.white, borderRadius: 8, padding: '12px 28px', border: 'none', fontWeight: 700, fontSize: 14,
                fontFamily: theme.font, cursor: 'pointer', boxShadow: `0 4px 16px ${theme.teal}40`,
              }}>→ Retour aux chambres</button>
            </>
          ) : (
            <button onClick={handleGroupConfirm} disabled={saving} style={{
              background: theme.teal, color: theme.white, borderRadius: 8, padding: '12px 32px', border: 'none', fontWeight: 700, fontSize: 14,
              fontFamily: theme.font, cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1, boxShadow: `0 4px 16px ${theme.teal}40`,
            }}>{saving ? 'Enregistrement...' : '✅ Enregistrer le groupe'}</button>
          )}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: Individual — search phase
  // ═══════════════════════════════════════════════════════════════════════════
  if (phase === 'search') {
    return (
      <div style={{ fontFamily: theme.font, maxWidth: 600, margin: '0 auto' }}>
        <Toast />
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: theme.dark, margin: 0 }}>Check-in</h1>
          <p style={{ fontSize: 13, color: theme.dark, opacity: 0.5, marginTop: 4, margin: 0 }}>
            Recherchez un client existant ou créez-en un nouveau
          </p>
        </div>

        <TypeToggle value={checkInType} onChange={v => setCheckInType(v)} />

        <div style={{ background: theme.white, borderRadius: 16, padding: 28, border: '1px solid rgba(31,42,46,0.08)', boxShadow: '0 4px 24px rgba(31,42,46,0.06)' }}>
          <div style={{ position: 'relative', marginBottom: 20 }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 16, opacity: 0.4, pointerEvents: 'none' }}>🔍</span>
            <input autoFocus value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Rechercher par nom ou N° de passeport..."
              style={{ ...FIELD, paddingLeft: 38, fontSize: 14 }} />
          </div>

          {results.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {results.map(g => <GuestSearchCard key={g.id} guest={g} onSelect={handleGuestSelect} />)}
            </div>
          )}

          {query.trim().length >= 1 && results.length === 0 && (
            <div style={{ textAlign: 'center', padding: '20px 0', fontSize: 13, color: theme.dark, opacity: 0.45 }}>
              Aucun résultat pour "{query}"
            </div>
          )}

          <div style={{
            borderTop: results.length > 0 ? `1px solid rgba(31,42,46,0.08)` : 'none',
            paddingTop: results.length > 0 ? 16 : 0,
            display: 'flex', justifyContent: 'center',
          }}>
            <button onClick={startNewGuest} style={{
              background: `${theme.teal}12`, color: theme.teal, borderRadius: 8,
              padding: '10px 24px', border: `1.5px solid ${theme.teal}30`, fontWeight: 700,
              fontSize: 13, fontFamily: theme.font, cursor: 'pointer',
            }}>+ Nouveau client</button>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: Individual — form phase
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ fontFamily: theme.font, maxWidth: 760 }}>
      <Toast />

      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24, gap: 12 }}>
        <button onClick={() => { setPhase('search'); setErrors({}); setSavedReservationId(null); }}
          style={{ background: 'rgba(31,42,46,0.07)', border: 'none', borderRadius: 7, padding: '7px 14px', cursor: 'pointer', fontSize: 13, fontFamily: theme.font, color: theme.dark, fontWeight: 600 }}>
          ← Retour
        </button>
        <h1 style={{ fontSize: 20, fontWeight: 900, color: theme.dark, margin: 0 }}>
          {isNewGuest ? 'Nouveau client — Check-in' : `${form.last_name} ${form.first_name} — Check-in`}
        </h1>
      </div>

      <TypeToggle value={checkInType} onChange={v => { setCheckInType(v); setPhase('search'); }} />

      <div style={{ background: theme.white, borderRadius: 16, padding: 28, border: '1px solid rgba(31,42,46,0.08)', boxShadow: '0 4px 24px rgba(31,42,46,0.06)' }}>

        {/* Section 1: Chambre & Heure */}
        <SectionTitle icon="🏠" title="Chambre & Heure d'arrivée" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <div style={{ marginBottom: 14, gridColumn: 'span 2' }}>
            <FieldLabel fr="Chambre N° · رقم البيت" required />
            <RoomSelect
              value={form.room_id}
              error={errors.room_id}
              onChange={v => set('room_id', v)}
              onRoomChange={r => { if (r?.price_per_night > 0 && !form.price_per_night) set('price_per_night', r.price_per_night); }}
            />
            {errors.room_id && <div style={{ color: theme.coral, fontSize: 11, marginTop: 3 }}>{errors.room_id}</div>}
            {roomsWithCapacity.length === 0 && (
              <div style={{ color: SAFFRON, fontSize: 11, marginTop: 3 }}>Aucune chambre disponible actuellement</div>
            )}
          </div>

          {/* Partial room info banner */}
          {isPartialRoom && selectedRoom && (
            <div style={{
              gridColumn: 'span 2', marginBottom: 14,
              background: `${SAFFRON}15`, border: `1.5px solid ${SAFFRON}60`,
              borderRadius: 10, padding: '12px 16px', fontSize: 13, color: theme.dark,
            }}>
              <span style={{ fontSize: 16, marginRight: 8 }}>ℹ️</span>
              <strong>Cette chambre est occupée</strong>
              {selectedRoom.primary_guest_last_name && (
                <> par <strong>{selectedRoom.primary_guest_last_name} {selectedRoom.primary_guest_first_name}</strong></>
              )}.{' '}
              Vous ajoutez un(e) nouveau/elle client(e) à la même chambre ({selectedRoom.guest_count}/{selectedRoom.capacity} place{selectedRoom.capacity > 1 ? 's' : ''} utilisée{selectedRoom.capacity > 1 ? 's' : ''}).
              Les dates de séjour restent les mêmes.
            </div>
          )}

          <div style={{ marginBottom: 14 }}>
            <FieldLabel fr="Heure d'arrivée · ساعة الوصول" />
            <input type="time" {...inp('arrival_time')} />
          </div>
          <div />

          <div style={{ marginBottom: 14 }}>
            <FieldLabel fr="Date d'arrivée · تاريخ الوصول" required />
            <input type="date" {...inp('check_in_date')} disabled={isPartialRoom} />
            {errors.check_in_date && <div style={{ color: theme.coral, fontSize: 11, marginTop: 3 }}>{errors.check_in_date}</div>}
          </div>
          <div style={{ marginBottom: 14 }}>
            <FieldLabel fr="Date de départ · تاريخ المغادرة" required />
            <input type="date" min={form.check_in_date || today} {...inp('check_out_date')} disabled={isPartialRoom} />
            {errors.check_out_date && <div style={{ color: theme.coral, fontSize: 11, marginTop: 3 }}>{errors.check_out_date}</div>}
          </div>

          {!isPartialRoom && (
            <>
              <div style={{ marginBottom: 14 }}>
                <FieldLabel fr="Adultes" />
                <input type="number" min="1" {...inp('adults')} onChange={e => set('adults', parseInt(e.target.value) || 1)} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <FieldLabel fr="Enfants" />
                <input type="number" min="0" {...inp('children')} onChange={e => set('children', parseInt(e.target.value) || 0)} />
              </div>
            </>
          )}
        </div>

        {/* Section 2: Identité */}
        <SectionTitle icon="🪪" title="Identité — الهوية" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <div style={{ marginBottom: 14 }}>
            <FieldLabel fr="Nom · الاسم العائلي" required />
            <input {...inp('last_name')} placeholder="ALAMI" />
            {errors.last_name && <div style={{ color: theme.coral, fontSize: 11, marginTop: 3 }}>{errors.last_name}</div>}
          </div>
          <div style={{ marginBottom: 14 }}>
            <FieldLabel fr="Prénoms · الاسم الشخصي" required />
            <input {...inp('first_name')} placeholder="Mohammed" />
            {errors.first_name && <div style={{ color: theme.coral, fontSize: 11, marginTop: 3 }}>{errors.first_name}</div>}
          </div>
          <div style={{ marginBottom: 14 }}>
            <FieldLabel fr="Date de naissance · تاريخ الإزدياد" />
            <input type="date" {...inp('date_of_birth')} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <FieldLabel fr="Lieu de naissance · مكان الإزدياد" />
            <input {...inp('place_of_birth')} placeholder="Casablanca" />
          </div>
          <div style={{ marginBottom: 14 }}>
            <FieldLabel fr="Nationalité · الجنسية" />
            <input {...inp('nationality')} placeholder="Marocaine" />
          </div>
          <div style={{ marginBottom: 14 }}>
            <FieldLabel fr="Qualité ou Profession · المهنة" />
            <input {...inp('profession')} placeholder="Ingénieur" />
          </div>
          <div style={{ marginBottom: 14, gridColumn: 'span 2' }}>
            <FieldLabel fr="Domicile Habituel · السكن الحالي" />
            <input {...inp('permanent_address')} placeholder="Adresse permanente" />
          </div>
        </div>

        {/* Section 3: Itinéraire */}
        <SectionTitle icon="✈️" title="Itinéraire — المسار" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <div style={{ marginBottom: 14 }}>
            <FieldLabel fr="Lieu de provenance · قادم من" />
            <input {...inp('coming_from')} placeholder="Paris, France" />
          </div>
          <div style={{ marginBottom: 14 }}>
            <FieldLabel fr="Lieu de destination · ذاهب إلى" />
            <input {...inp('going_to')} placeholder="Marrakech" />
          </div>
          <div style={{ marginBottom: 14, gridColumn: 'span 2' }}>
            <FieldLabel fr="N° d'entrée au Maroc · رقم الدخول إلى المغرب" />
            <input {...inp('morocco_entry_number')} placeholder="Numéro d'entrée" />
          </div>
        </div>

        {/* Section 4: Pièce d'identité */}
        <SectionTitle icon="📋" title="Pièce d'identité — وثيقة الهوية" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <div style={{ marginBottom: 14 }}>
            <FieldLabel fr="Nature / Type · نوع الوثيقة" />
            <select {...inp('document_type')} style={{ ...FIELD, cursor: 'pointer' }}>
              {['Passeport', 'CIN', 'Titre de séjour', 'Carte consulaire', 'Autre'].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 14 }}>
            <FieldLabel fr="N° · رقم الوثيقة" />
            <input {...inp('document_number')} placeholder="AB123456" />
          </div>
          <div style={{ marginBottom: 14 }}>
            <FieldLabel fr="Délivré à · مسلمة في" />
            <input {...inp('document_issued_at')} placeholder="Casablanca" />
          </div>
          <div style={{ marginBottom: 14 }}>
            <FieldLabel fr="Le (date d'émission) · تاريخ الإصدار" />
            <input type="date" {...inp('document_issued_date')} />
          </div>
        </div>

        {/* Section 5: Paiement */}
        {!isPartialRoom && (
          <>
            <SectionTitle icon="💳" title="Paiement — الدفع" />
            <div style={{ marginBottom: 16 }}>
              <FieldLabel fr="Mode de règlement" />
              <div style={{ display: 'flex', gap: 8 }}>
                {[
                  { k: 'checkout', label: 'À la sortie' },
                  { k: 'immediate', label: 'Paiement immédiat' },
                  { k: 'deposit', label: 'Acompte' },
                ].map(({ k, label }) => (
                  <button key={k} onClick={() => set('payment_type', k)} style={{
                    flex: 1, padding: '10px 8px', borderRadius: 8, cursor: 'pointer',
                    border: form.payment_type === k ? `2px solid ${theme.teal}` : `1.5px solid rgba(31,42,46,0.2)`,
                    background: form.payment_type === k ? `${theme.teal}10` : theme.white,
                    color: form.payment_type === k ? theme.teal : theme.dark,
                    fontWeight: form.payment_type === k ? 700 : 500,
                    fontSize: 12, fontFamily: theme.font,
                  }}>{label}</button>
                ))}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px', marginBottom: 14 }}>
              <div>
                <FieldLabel fr="Prix / nuit (MAD)" />
                <input type="number" min="0" step="10" {...inp('price_per_night')}
                  onChange={e => set('price_per_night', e.target.value)}
                  placeholder={selectedRoom?.price_per_night ? String(selectedRoom.price_per_night) : '0'} />
              </div>
              {nights > 0 && (
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <div style={{ background: `${theme.teal}10`, borderRadius: 8, padding: '9px 14px', fontSize: 13, color: theme.teal, fontWeight: 700, width: '100%', boxSizing: 'border-box' }}>
                    {nights} nuit{nights > 1 ? 's' : ''} × {pricePerNight.toLocaleString('fr-MA')} MAD = <span style={{ fontSize: 15 }}>{totalAmount.toLocaleString('fr-MA')} MAD</span>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Success banner */}
      {savedReservationId && (
        <div style={{
          background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10,
          padding: '12px 16px', marginTop: 16, fontSize: 13, color: '#15803d', fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          ✓ Check-in enregistré — imprimez la fiche ou retournez aux chambres.
        </div>
      )}

      {/* Action bar */}
      <div style={{
        display: 'flex', gap: 12, marginTop: 20, justifyContent: 'flex-end',
        position: 'sticky', bottom: 0, background: theme.cream, paddingBottom: 8, paddingTop: 8,
      }}>
        {savedReservationId && !isPartialRoom && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <button disabled={printing} onClick={handlePrintFiche} style={{
                background: theme.dark, color: theme.white, borderRadius: 8,
                padding: '12px 20px', border: 'none', fontWeight: 600, fontSize: 13,
                fontFamily: theme.font, cursor: printing ? 'wait' : 'pointer', opacity: printing ? 0.7 : 1,
              }}>{printing ? '⏳ Impression...' : '🖨 Imprimer Fiche'}</button>
              <button disabled={savingPDF} onClick={handleSaveFichePDF} style={{
                background: 'rgba(31,42,46,0.08)', color: theme.dark, borderRadius: 8,
                padding: '12px 16px', border: '1.5px solid rgba(31,42,46,0.15)', fontWeight: 600, fontSize: 13,
                fontFamily: theme.font, cursor: savingPDF ? 'wait' : 'pointer', opacity: savingPDF ? 0.7 : 1,
              }}>{savingPDF ? '⏳...' : '📥 PDF'}</button>
            </div>
            {printError && (
              <div style={{ fontSize: 11, color: '#b91c1c', background: '#fef2f2', padding: '6px 10px', borderRadius: 6, border: '1px solid #fca5a5' }}>
                ⚠ {printError}
              </div>
            )}
          </div>
        )}

        {savedReservationId ? (
          <button onClick={() => { setCheckInRoomId(null); setPage('rooms'); }} style={{
            background: theme.teal, color: theme.white, borderRadius: 8,
            padding: '12px 28px', border: 'none', fontWeight: 700, fontSize: 14,
            fontFamily: theme.font, cursor: 'pointer', boxShadow: `0 4px 16px ${theme.teal}40`,
          }}>→ Retour aux chambres</button>
        ) : (
          <button onClick={handleConfirm} disabled={saving} style={{
            background: theme.teal, color: theme.white, borderRadius: 8,
            padding: '12px 28px', border: 'none', fontWeight: 700, fontSize: 14,
            fontFamily: theme.font, cursor: saving ? 'wait' : 'pointer',
            opacity: saving ? 0.7 : 1, boxShadow: `0 4px 16px ${theme.teal}40`,
          }}>{saving ? 'Enregistrement...' : isPartialRoom ? '+ Ajouter à la chambre' : '✓ Confirmer Check-in'}</button>
        )}
      </div>
    </div>
  );
}
