import { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { C } from '../theme';
import { buildFicheHTML, buildGroupFicheHTML } from '../ficheUtils';

const today = () => new Date().toISOString().split('T')[0];
const nowTime = () => new Date().toTimeString().slice(0, 5);
const calcNights = (ci, co) => {
  if (!ci || !co) return 1;
  const d = (new Date(co) - new Date(ci)) / 86400000;
  return Math.max(1, Math.round(d));
};

const iStyle = {
  width: '100%', padding: '10px 12px', borderRadius: 10,
  border: `1px solid ${C.border}`, background: C.white,
  fontSize: 15, color: C.dark, boxSizing: 'border-box',
};

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.gray, textTransform: 'uppercase', letterSpacing: .4, marginBottom: 5 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ background: C.white, borderRadius: 14, padding: 16, marginBottom: 14, boxShadow: '0 1px 4px rgba(0,0,0,.05)' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.gray, textTransform: 'uppercase', letterSpacing: .5, marginBottom: 14 }}>{title}</div>
      {children}
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

function openPrintWindow(html) {
  const w = window.open('', '_blank', 'width=900,height=700');
  if (!w) { alert('Activez les popups pour imprimer.'); return; }
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 400);
}

export default function CheckIn({ ctx, params }) {
  const { property, navigate } = ctx;

  const roomId       = params?.get('room')    || '';
  const roomNumber   = params?.get('number')  || '';
  const roomPrice    = parseFloat(params?.get('price') || '0');
  const isPartialRoom = params?.get('partial') === '1';
  const existingResId = params?.get('res_id') || '';
  const partialGuestName = params?.get('guest_name') ? decodeURIComponent(params.get('guest_name')) : '';

  // ── Check-in type ─────────────────────────────────────────────────────────
  const [checkInType, setCheckInType] = useState('individual');

  // ── Room data ─────────────────────────────────────────────────────────────
  const [roomsWithCap, setRoomsWithCap] = useState([]);
  const [busy, setBusy]   = useState(false);
  const [done, setDone]   = useState(false);

  // ── Individual mode ───────────────────────────────────────────────────────
  const [search, setSearch]   = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const searchTimer = useRef(null);

  const [form, setForm] = useState({
    last_name: '', first_name: '', date_of_birth: '', place_of_birth: '',
    nationality: '', profession: '', permanent_address: '',
    document_type: 'Passeport', document_number: '',
    document_issued_at: '', document_issued_date: '',
    coming_from: '', going_to: '', morocco_entry_number: '',
    adults: 1, children: 0,
    room_id: roomId, check_in_date: today(), check_out_date: '',
    price_per_night: roomPrice, payment_type: 'checkout', channel: 'direct', notes: '',
    _guest_id: '', _guest_exists: false,
  });
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // ── Group mode ────────────────────────────────────────────────────────────
  const [groupInfo, setGroupInfo] = useState({ name: '', visit_name: '', agency_id: null, guide_id: null, leader_name: '', leader_phone: '', leader_role: 'guide' });
  const setGI = (k, v) => setGroupInfo(g => ({ ...g, [k]: v }));
  const [agencyQuery,       setAgencyQuery]       = useState('');
  const [agencySuggestions, setAgencySuggestions] = useState([]);
  const [agencySelected,    setAgencySelected]    = useState(null);
  const [guideOptions,      setGuideOptions]      = useState([]);
  const [showNewGuideForm,  setShowNewGuideForm]  = useState(false);
  const [newGuide,          setNewGuide]          = useState({ name: '', phone: '', role: 'guide' });
  const agencyTimer = useRef(null);
  const [groupShared, setGroupShared] = useState({
    arrival_time: nowTime(),
    check_in_date: today(), check_out_date: '',
    payment_type: 'checkout', price_per_night: roomPrice || '',
    coming_from: '', going_to: '',
  });
  const setG = (k, v) => setGroupShared(g => ({ ...g, [k]: v }));
  const [groupPersons, setGroupPersons] = useState([{ ...emptyGroupPerson(), isChef: true }]);
  const setPerson = (idx, k, v) => setGroupPersons(ps => ps.map((p, i) => i === idx ? { ...p, [k]: v } : p));
  const [roomAssignments, setRoomAssignments] = useState({});

  const [savedGroupId, setSavedGroupId] = useState(null);
  const [savedGroupResId, setSavedGroupResId] = useState(null);
  const [savedGuestResMap, setSavedGuestResMap] = useState({});
  const [savedGroupPersons, setSavedGroupPersons] = useState([]);

  const assignPersonRoom = (personIdx, newRoomId) => {
    setPerson(personIdx, 'room_id', newRoomId);
    setRoomAssignments(prev => {
      const next = {};
      for (const [rId, idxs] of Object.entries(prev)) next[rId] = idxs.filter(i => i !== personIdx);
      if (newRoomId) next[newRoomId] = [...(next[newRoomId] || []), personIdx];
      return next;
    });
  };

  const getSpacesLeft = (room, currentIdx) => {
    const others = (roomAssignments[room.id] || []).filter(i => i !== currentIdx).length;
    return room.capacity - others - (room.guest_count || 0);
  };

  // ── Load rooms ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!property?.id) return;
    api.getRoomsWithCapacity(property.id)
      .then(r => setRoomsWithCap(r || []))
      .catch(() =>
        api.getRooms(property.id).then(r =>
          setRoomsWithCap((r || []).filter(x => x.status === 'available'))
        )
      );
  }, [property?.id]);

  const availableRooms = roomsWithCap.filter(r => r.status === 'available');
  const partialRooms   = roomsWithCap.filter(r => r.status === 'occupied' && (r.spaces_left || 0) > 0);
  const selectedRoom   = roomsWithCap.find(r => r.id === form.room_id);

  // ── Guest search ──────────────────────────────────────────────────────────
  useEffect(() => {
    clearTimeout(searchTimer.current);
    if (search.length < 2) { setResults([]); return; }
    setSearching(true);
    searchTimer.current = setTimeout(async () => {
      const r = await api.searchGuests(search).catch(() => []);
      setResults(Array.isArray(r) ? r : []);
      setSearching(false);
    }, 400);
  }, [search]);

  const fillGuest = (g) => {
    setSearch(''); setResults([]);
    setForm(f => ({
      ...f,
      last_name: g.last_name, first_name: g.first_name,
      date_of_birth: g.date_of_birth || '', place_of_birth: g.place_of_birth || '',
      nationality: g.nationality || '', profession: g.profession || '',
      permanent_address: g.permanent_address || '',
      document_type: g.document_type || 'Passeport', document_number: g.document_number || '',
      document_issued_at: g.document_issued_at || '', document_issued_date: g.document_issued_date || '',
      _guest_id: g.id, _guest_exists: true,
    }));
  };

  // ── Computed ──────────────────────────────────────────────────────────────
  const nightsVal = calcNights(form.check_in_date, form.check_out_date);
  const total = (form.price_per_night || 0) * nightsVal;
  const groupNights = calcNights(groupShared.check_in_date, groupShared.check_out_date);
  const groupTotal  = (parseFloat(groupShared.price_per_night) || 0) * groupNights;

  // ── Individual submit ─────────────────────────────────────────────────────
  const submit = async () => {
    const rid = isPartialRoom ? roomId : form.room_id;
    if (!form.last_name || !form.first_name || !rid || !form.check_in_date) {
      alert('Veuillez remplir les champs obligatoires : Nom, Prénom, Chambre, Date d\'arrivée'); return;
    }
    setBusy(true);
    try {
      let guestId = form._guest_id;
      if (!guestId) {
        const g = await api.createGuest({
          last_name: form.last_name, first_name: form.first_name,
          date_of_birth: form.date_of_birth || null, place_of_birth: form.place_of_birth || null,
          nationality: form.nationality || null, profession: form.profession || null,
          permanent_address: form.permanent_address || null,
          document_type: form.document_type || null, document_number: form.document_number || null,
          document_issued_at: form.document_issued_at || null, document_issued_date: form.document_issued_date || null,
        });
        guestId = g?.id || g?.[0]?.id;
      }

      if (isPartialRoom && existingResId) {
        // Add to existing reservation
        await api.addGuestToRoom(existingResId, {
          id: guestId,
          last_name: form.last_name, first_name: form.first_name,
          coming_from: form.coming_from || null,
          going_to: form.going_to || null,
          morocco_entry_number: form.morocco_entry_number || null,
        });
      } else {
        // Create new reservation
        if (!form.check_out_date) { alert('Veuillez renseigner la date de départ'); setBusy(false); return; }
        const res = await api.createReservation({
          property_id: property.id,
          room_id: rid,
          guest_id: guestId || null,
          check_in_date: form.check_in_date,
          check_out_date: form.check_out_date,
          nights: nightsVal,
          coming_from: form.coming_from || null,
          going_to: form.going_to || null,
          morocco_entry_number: form.morocco_entry_number || null,
          adults: Number(form.adults),
          children: Number(form.children),
          price_per_night: form.price_per_night,
          total_amount: total,
          payment_type: form.payment_type,
          channel: form.channel,
          notes: form.notes || null,
        });
        // Record primary guest in reservation_guests
        if (res?.id && guestId) {
          await api.addPrimaryGuestToReservation(res.id, guestId, {
            coming_from: form.coming_from || null,
            going_to: form.going_to || null,
            morocco_entry_number: form.morocco_entry_number || null,
          }).catch(() => {});
        }
        await api.updateRoom(rid, { status: 'occupied' });
      }
      setDone(true);
      setTimeout(() => navigate('rooms'), 1800);
    } catch (e) {
      alert('Erreur : ' + e.message);
    }
    setBusy(false);
  };

  // ── Group submit ──────────────────────────────────────────────────────────
  const submitGroup = async () => {
    if (!groupShared.check_in_date || !groupShared.check_out_date) {
      alert('Veuillez remplir les dates'); return;
    }
    if (!groupPersons[0]?.last_name?.trim() || !groupPersons[0]?.first_name?.trim()) {
      alert('Le nom et prénom de la personne 1 sont obligatoires'); return;
    }
    if (!groupPersons.some(p => p.room_id)) {
      alert('Attribuez au moins une chambre aux membres'); return;
    }
    setBusy(true);
    try {
      // 1. Create group record
      const grpRec = await api.createGroup({
        property_id: property.id,
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
      const grpId = grpRec?.id || grpRec?.[0]?.id;

      // 2. Create all guests
      const guestIds = [];
      for (const p of groupPersons) {
        const g = await api.createGuest({
          last_name: p.last_name, first_name: p.first_name,
          date_of_birth: p.date_of_birth || null, place_of_birth: p.place_of_birth || null,
          nationality: p.nationality || null, profession: p.profession || null,
          permanent_address: p.permanent_address || null,
          document_type: p.document_type || null, document_number: p.document_number || null,
          document_issued_at: p.document_issued_at || null, document_issued_date: p.document_issued_date || null,
        });
        guestIds.push(g?.id || g?.[0]?.id);
      }

      // 3. Group by room_id
      const byRoom = {};
      groupPersons.forEach((p, i) => {
        if (!p.room_id) return;
        if (!byRoom[p.room_id]) byRoom[p.room_id] = [];
        byRoom[p.room_id].push({ guestId: guestIds[i], isChef: p.isChef });
      });

      const price = parseFloat(groupShared.price_per_night) || 0;
      const guestResMap = {};
      let firstResId = null;

      // 4. Per-room reservations
      for (const [rmId, members] of Object.entries(byRoom)) {
        const rm = roomsWithCap.find(r => r.id === rmId);
        if (!rm) continue;
        const chef = members.find(m => m.isChef) || members[0];
        const rmPrice = price || rm.price_per_night || 0;

        if (rm.status === 'available') {
          const res = await api.createReservation({
            property_id: property.id, room_id: rmId,
            guest_id: chef.guestId || null, group_id: grpId || null,
            check_in_date: groupShared.check_in_date, check_out_date: groupShared.check_out_date,
            nights: groupNights,
            coming_from: groupShared.coming_from || null, going_to: groupShared.going_to || null,
            adults: members.length, children: 0,
            price_per_night: rmPrice, total_amount: rmPrice * groupNights,
            payment_type: groupShared.payment_type, channel: 'direct',
          });
          const resId = res?.id || res?.[0]?.id;
          if (!firstResId) firstResId = resId;
          members.forEach(m => { guestResMap[m.guestId] = resId; });
          if (resId) {
            if (chef.guestId) await api.addPrimaryGuestToReservation(resId, chef.guestId, { coming_from: groupShared.coming_from || null, going_to: groupShared.going_to || null }).catch(() => {});
            for (const m of members) {
              if (m.guestId !== chef.guestId) await api.addGuestToRoom(resId, { id: m.guestId }).catch(() => {});
            }
            await api.updateRoom(rmId, { status: 'occupied' }).catch(() => {});
          }
        } else if (rm.reservation_id) {
          const resId = rm.reservation_id;
          if (!firstResId) firstResId = resId;
          members.forEach(m => { guestResMap[m.guestId] = resId; });
          for (const m of members) await api.addGuestToRoom(resId, { id: m.guestId }).catch(() => {});
        }
      }

      setSavedGroupId(grpId);
      setSavedGroupResId(firstResId);
      setSavedGuestResMap(guestResMap);
      setSavedGroupPersons([...groupPersons]);
    } catch (e) {
      alert('Erreur : ' + e.message);
    }
    setBusy(false);
  };

  // ── Group fiche printing ──────────────────────────────────────────────────
  const prop = {
    display_name_fr: property?.display_name || 'Hôtel TAREK',
    display_name_ar: property?.display_name_ar || null,
    address: property?.address, bp: property?.city,
    phone: property?.phone, fax: property?.fax || null,
  };

  const printIndividuals = () => {
    savedGroupPersons.forEach(p => {
      const rm = roomsWithCap.find(r => r.id === p.room_id);
      const html = buildFicheHTML({
        property: prop,
        guest: p,
        reservation: {
          room_number: rm?.room_number || '',
          check_in_date: groupShared.check_in_date,
          check_out_date: groupShared.check_out_date,
          coming_from: groupShared.coming_from,
          going_to: groupShared.going_to,
          arrival_time: groupShared.arrival_time,
          morocco_entry_number: p.morocco_entry_number,
        },
      });
      openPrintWindow(html);
    });
  };

  const printGroupTable = () => {
    const guestsWithRoom = savedGroupPersons.map(p => {
      const rm = roomsWithCap.find(r => r.id === p.room_id);
      return { ...p, room_number: rm?.room_number || '' };
    });
    const html = buildGroupFicheHTML({
      property: prop,
      group: {
        name: groupInfo.name,
        leader_name: groupInfo.leader_name,
        leader_role: groupInfo.leader_role,
        leader_phone: groupInfo.leader_phone,
        check_in_date: groupShared.check_in_date,
        check_out_date: groupShared.check_out_date,
        coming_from: groupShared.coming_from,
        going_to: groupShared.going_to,
      },
      guests: guestsWithRoom,
    });
    openPrintWindow(html);
  };

  // ── Room select component ─────────────────────────────────────────────────
  const RoomSelect = ({ value, onChange }) => (
    <select value={value} onChange={e => onChange(e.target.value)} style={iStyle}>
      <option value="">Sélectionner...</option>
      {availableRooms.length > 0 && (
        <optgroup label="Chambres disponibles">
          {availableRooms.map(r => (
            <option key={r.id} value={r.id}>
              Ch. {r.room_number}{r.room_type ? ` — ${r.room_type}` : ''}{r.price_per_night ? ` · ${r.price_per_night} MAD` : ''}
            </option>
          ))}
        </optgroup>
      )}
      {partialRooms.length > 0 && (
        <optgroup label="Partiellement occupées (places libres)">
          {partialRooms.map(r => (
            <option key={r.id} value={r.id}>
              Ch. {r.room_number} · {r.guest_count}/{r.capacity} place{r.capacity > 1 ? 's' : ''} utilisée{r.capacity > 1 ? 's' : ''}
            </option>
          ))}
        </optgroup>
      )}
    </select>
  );

  // ── Success screen ────────────────────────────────────────────────────────
  if (done) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 12 }}>
      <div style={{ fontSize: 56 }}>✅</div>
      <div style={{ fontSize: 18, fontWeight: 800, color: C.dark }}>Check-in confirmé !</div>
      <div style={{ color: C.gray }}>Redirection en cours...</div>
    </div>
  );

  // ── Group success screen ──────────────────────────────────────────────────
  if (savedGroupResId) return (
    <div style={{ padding: '24px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center' }}>
      <div style={{ fontSize: 48 }}>✅</div>
      <div style={{ fontSize: 18, fontWeight: 800, color: C.dark }}>Groupe enregistré !</div>
      <div style={{ fontSize: 14, color: C.gray }}>
        {savedGroupPersons.length} personne{savedGroupPersons.length > 1 ? 's' : ''}{groupInfo.name ? ` — ${groupInfo.name}` : ''}
      </div>
      <button onClick={printIndividuals} style={{
        width: '100%', maxWidth: 320, padding: 16,
        background: C.dark, color: C.white, borderRadius: 12, fontWeight: 700, fontSize: 15,
      }}>
        🖨️ Fiches individuelles
      </button>
      <button onClick={printGroupTable} style={{
        width: '100%', maxWidth: 320, padding: 16,
        background: C.white, color: C.dark, borderRadius: 12, fontWeight: 700, fontSize: 15,
        border: `1.5px solid ${C.border}`,
      }}>
        📋 Tableau de groupe
      </button>
      <button onClick={() => navigate('rooms')} style={{
        width: '100%', maxWidth: 320, padding: 16,
        background: C.teal, color: C.white, borderRadius: 12, fontWeight: 800, fontSize: 16,
      }}>
        → Retour aux chambres
      </button>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: GROUP MODE
  // ═══════════════════════════════════════════════════════════════════════════
  if (checkInType === 'group') {
    return (
      <div style={{ padding: '16px 16px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <button onClick={() => navigate('rooms')} style={{ background: 'none', color: C.teal, fontSize: 15, fontWeight: 700, padding: 0, minHeight: 0 }}>← Retour</button>
          <div style={{ fontSize: 17, fontWeight: 800, color: C.dark }}>Check-in Groupe</div>
        </div>

        {/* Type toggle */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {[{ k: 'individual', l: '👤 Individuel' }, { k: 'group', l: '👥 Groupe' }].map(({ k, l }) => (
            <button key={k} onClick={() => setCheckInType(k)} style={{
              flex: 1, padding: '10px 8px', borderRadius: 10, fontSize: 13, fontWeight: 700,
              background: checkInType === k ? C.teal : C.white,
              color: checkInType === k ? C.white : C.dark,
              border: checkInType === k ? `2px solid ${C.teal}` : `1.5px solid ${C.border}`,
              minHeight: 44,
            }}>{l}</button>
          ))}
        </div>

        {/* Section 1: Group Info */}
        <Section title="Informations du groupe">
          {/* Agency combobox */}
          <Field label="Agence / Groupe">
            <div style={{ position: 'relative' }}>
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
                      const res = await api.searchAgencies(q).catch(() => []);
                      setAgencySuggestions(Array.isArray(res) ? res : []);
                    }, 300);
                  } else { setAgencySuggestions([]); }
                }}
                onFocus={async () => {
                  if (!agencySelected && agencyQuery.trim().length === 0) {
                    const res = await api.getAgencies().catch(() => []);
                    setAgencySuggestions((Array.isArray(res) ? res : []).slice(0, 5));
                  }
                }}
                onBlur={() => setTimeout(() => setAgencySuggestions([]), 200)}
                placeholder="Rechercher ou saisir une agence..."
                style={{ ...iStyle, width: '100%', boxSizing: 'border-box' }} />
              {agencySuggestions.length > 0 && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 99,
                  background: C.white, border: `1px solid ${C.border}`,
                  borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                  marginTop: 2, overflow: 'hidden',
                }}>
                  {agencySuggestions.map(a => (
                    <div key={a.id} onMouseDown={async () => {
                      setAgencySelected(a);
                      setAgencyQuery(a.name);
                      setGI('name', a.name);
                      setGI('agency_id', a.id);
                      setAgencySuggestions([]);
                      const gs = await api.getGuidesByAgency(a.id).catch(() => []);
                      setGuideOptions(Array.isArray(gs) ? gs : []);
                      setGI('guide_id', null);
                      setGI('leader_name', '');
                      setGI('leader_phone', '');
                    }} style={{ padding: '12px 14px', fontSize: 14, color: C.dark, borderBottom: `1px solid ${C.border}` }}>
                      <span style={{ fontWeight: 700 }}>{a.name}</span>
                      {(a.city || a.country) && <span style={{ fontSize: 11, opacity: 0.55, marginLeft: 8 }}>{[a.city, a.country].filter(Boolean).join(', ')}</span>}
                    </div>
                  ))}
                  {agencyQuery.trim() && !agencySuggestions.some(a => a.name.toLowerCase() === agencyQuery.toLowerCase()) && (
                    <div onMouseDown={async () => {
                      const a = await api.createAgency({ name: agencyQuery.trim() }).catch(() => null);
                      if (a) {
                        setAgencySelected(a); setGI('agency_id', a.id); setGI('name', a.name);
                      }
                      setAgencySuggestions([]); setGuideOptions([]);
                    }} style={{ padding: '12px 14px', fontSize: 14, color: C.teal, fontWeight: 700 }}>
                      + Créer « {agencyQuery.trim()} »
                    </div>
                  )}
                </div>
              )}
            </div>
          </Field>

          <Field label="Nom de la visite (optionnel)">
            <input value={groupInfo.visit_name} onChange={e => setGI('visit_name', e.target.value)}
              placeholder="Ex: Circuit du Nord" style={iStyle} />
          </Field>

          <Field label="Guide / Responsable">
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
                }} style={{ ...iStyle, cursor: 'pointer', width: '100%', boxSizing: 'border-box' }}>
                  <option value="">— Choisir un guide —</option>
                  {guideOptions.map(g => (
                    <option key={g.id} value={g.id}>{g.name}{g.role ? ` (${g.role})` : ''}</option>
                  ))}
                  <option value="__new__">+ Ajouter nouveau guide...</option>
                </select>

                {showNewGuideForm && (
                  <div style={{
                    border: `1.5px solid ${C.teal}`, borderRadius: 10,
                    padding: 14, marginTop: 8, background: `${C.teal}08`,
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.teal, marginBottom: 10 }}>
                      Nouveau guide / responsable
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                      <div>
                        <label style={{ fontSize: 11, color: C.gray }}>Nom complet *</label>
                        <input value={newGuide.name}
                          onChange={e => setNewGuide(p => ({ ...p, name: e.target.value }))}
                          placeholder="Hassan Idrissi"
                          style={{ ...iStyle, marginTop: 4, width: '100%', boxSizing: 'border-box' }} />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: C.gray }}>Téléphone</label>
                        <input value={newGuide.phone}
                          onChange={e => setNewGuide(p => ({ ...p, phone: e.target.value }))}
                          placeholder="+212 6XX XX XX XX"
                          style={{ ...iStyle, marginTop: 4, width: '100%', boxSizing: 'border-box' }} />
                      </div>
                    </div>
                    <div style={{ marginBottom: 10 }}>
                      <label style={{ fontSize: 11, color: C.gray }}>Rôle</label>
                      <select value={newGuide.role}
                        onChange={e => setNewGuide(p => ({ ...p, role: e.target.value }))}
                        style={{ ...iStyle, marginTop: 4, cursor: 'pointer', width: '100%', boxSizing: 'border-box' }}>
                        <option value="guide">Guide</option>
                        <option value="leader">Chef de groupe</option>
                        <option value="representative">Représentant</option>
                        <option value="other">Autre</option>
                      </select>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => { setShowNewGuideForm(false); setNewGuide({ name: '', phone: '', role: 'guide' }); }} style={{
                        flex: 1, padding: '10px', borderRadius: 8,
                        border: `1px solid ${C.border}`, background: C.white,
                        cursor: 'pointer', fontSize: 13, minHeight: 44,
                      }}>Annuler</button>
                      <button onClick={async () => {
                        if (!newGuide.name.trim()) return;
                        const result = await api.createGuide({
                          agency_id: groupInfo.agency_id || null,
                          name: newGuide.name.trim(),
                          phone: newGuide.phone.trim(),
                          role: newGuide.role,
                        });
                        const created = { id: result.id, name: newGuide.name.trim(), phone: newGuide.phone.trim(), role: newGuide.role, agency_id: groupInfo.agency_id };
                        setGuideOptions(prev => [...prev, created]);
                        setGI('guide_id', result.id);
                        setGI('leader_name', created.name);
                        setGI('leader_phone', created.phone);
                        setGI('leader_role', created.role);
                        setShowNewGuideForm(false);
                        setNewGuide({ name: '', phone: '', role: 'guide' });
                      }} disabled={!newGuide.name.trim()} style={{
                        flex: 2, padding: '10px', borderRadius: 8, border: 'none',
                        background: C.teal, color: C.white, fontWeight: 700,
                        fontSize: 13, cursor: 'pointer', minHeight: 44,
                        opacity: newGuide.name.trim() ? 1 : 0.5,
                      }}>✓ Créer et sélectionner</button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <input value={groupInfo.leader_name} onChange={e => setGI('leader_name', e.target.value)} placeholder="ALAMI Mohammed" style={iStyle} />
            )}
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Rôle">
              <div style={{ display: 'flex', gap: 5 }}>
                {['guide', 'chef', 'représentant'].map(r => (
                  <button key={r} onClick={() => setGI('leader_role', r)} style={{
                    flex: 1, padding: '8px 3px', borderRadius: 8, fontSize: 11, fontWeight: groupInfo.leader_role === r ? 700 : 500,
                    background: groupInfo.leader_role === r ? C.teal : C.white,
                    color: groupInfo.leader_role === r ? C.white : C.dark,
                    border: groupInfo.leader_role === r ? `2px solid ${C.teal}` : `1.5px solid ${C.border}`,
                  }}>{r}</button>
                ))}
              </div>
            </Field>
            <Field label="Téléphone">
              <input value={groupInfo.leader_phone} onChange={e => setGI('leader_phone', e.target.value)} placeholder="+212 6XX..." style={iStyle} />
            </Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Arrivée *">
              <input type="date" value={groupShared.check_in_date} onChange={e => setG('check_in_date', e.target.value)} style={iStyle} />
            </Field>
            <Field label="Départ *">
              <input type="date" min={groupShared.check_in_date} value={groupShared.check_out_date} onChange={e => setG('check_out_date', e.target.value)} style={iStyle} />
            </Field>
            <Field label="Venant de">
              <input value={groupShared.coming_from} onChange={e => setG('coming_from', e.target.value)} placeholder="Paris" style={iStyle} />
            </Field>
            <Field label="Allant à">
              <input value={groupShared.going_to} onChange={e => setG('going_to', e.target.value)} placeholder="Marrakech" style={iStyle} />
            </Field>
          </div>
        </Section>

        {/* Section 2: Per-person cards */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.gray, textTransform: 'uppercase', letterSpacing: .5, marginBottom: 10 }}>
            Membres du groupe ({groupPersons.length} personne{groupPersons.length > 1 ? 's' : ''})
          </div>
          {groupPersons.map((p, idx) => (
            <div key={idx} style={{
              background: C.white, borderRadius: 12, padding: 14, marginBottom: 10,
              border: `1.5px solid ${p.isChef ? '#e0a458' : C.border}`,
              boxShadow: '0 1px 4px rgba(0,0,0,.05)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: p.isChef ? '#e0a458' : C.gray, textTransform: 'uppercase' }}>
                  Personne {idx + 1}{p.isChef ? ' ⭐ Chef' : ''}
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => setGroupPersons(ps => ps.map((x, i) => ({ ...x, isChef: i === idx ? !x.isChef : false })))}
                    style={{ background: p.isChef ? '#e0a458' : 'rgba(0,0,0,0.06)', border: 'none', borderRadius: 6, padding: '4px 8px', fontSize: 13, color: p.isChef ? 'white' : C.dark }}>⭐</button>
                  {groupPersons.length > 1 && (
                    <button onClick={() => {
                      const oldRId = p.room_id;
                      setGroupPersons(ps => ps.filter((_, i) => i !== idx));
                      if (oldRId) setRoomAssignments(prev => ({ ...prev, [oldRId]: (prev[oldRId] || []).filter(i => i !== idx).map(i => i > idx ? i - 1 : i) }));
                    }}
                      style={{ background: 'none', border: 'none', color: C.coral, fontSize: 20, cursor: 'pointer', padding: 0 }}>✕</button>
                  )}
                </div>
              </div>

              <Field label="Chambre *">
                <select value={p.room_id} onChange={e => assignPersonRoom(idx, e.target.value)} style={iStyle}>
                  <option value="">— Sélectionner —</option>
                  {availableRooms.map(r => {
                    const left = getSpacesLeft(r, idx);
                    return <option key={r.id} value={r.id} disabled={left <= 0 && p.room_id !== r.id}>Ch. {r.room_number}{r.room_type ? ` · ${r.room_type}` : ''} · {left > 0 ? `${left} place${left > 1 ? 's' : ''}` : 'Complet'}</option>;
                  })}
                  {partialRooms.map(r => {
                    const left = getSpacesLeft(r, idx);
                    return <option key={r.id} value={r.id} disabled={left <= 0 && p.room_id !== r.id}>Ch. {r.room_number} (part.) · {left > 0 ? `${left} libre${left > 1 ? 's' : ''}` : 'Complet'}</option>;
                  })}
                </select>
              </Field>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <Field label={idx === 0 ? 'Nom *' : 'Nom'}>
                  <input value={p.last_name} onChange={e => setPerson(idx, 'last_name', e.target.value)} placeholder="ALAMI" style={iStyle} />
                </Field>
                <Field label={idx === 0 ? 'Prénom *' : 'Prénom'}>
                  <input value={p.first_name} onChange={e => setPerson(idx, 'first_name', e.target.value)} placeholder="Mohammed" style={iStyle} />
                </Field>
                <Field label="Date de naissance">
                  <input type="date" value={p.date_of_birth} onChange={e => setPerson(idx, 'date_of_birth', e.target.value)} style={iStyle} />
                </Field>
                <Field label="Nationalité">
                  <input value={p.nationality} onChange={e => setPerson(idx, 'nationality', e.target.value)} placeholder="Marocaine" style={iStyle} />
                </Field>
                <Field label="Type document">
                  <select value={p.document_type} onChange={e => setPerson(idx, 'document_type', e.target.value)} style={iStyle}>
                    {['Passeport','CIN','Titre de séjour','Autre'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </Field>
                <Field label="N° document">
                  <input value={p.document_number} onChange={e => setPerson(idx, 'document_number', e.target.value)} placeholder="AB123456" style={iStyle} />
                </Field>
                <Field label="N° entrée Maroc" children={
                  <input value={p.morocco_entry_number} onChange={e => setPerson(idx, 'morocco_entry_number', e.target.value)} style={{ ...iStyle, gridColumn: 'span 2' }} />
                } />
              </div>
            </div>
          ))}
          <button onClick={() => setGroupPersons(ps => [...ps, emptyGroupPerson()])} style={{
            width: '100%', padding: 14, background: `${C.teal}10`,
            color: C.teal, border: `1.5px dashed ${C.teal}50`,
            borderRadius: 12, fontWeight: 700, fontSize: 14, marginBottom: 4,
          }}>
            + Ajouter une personne
          </button>
        </div>

        {/* Payment */}
        {groupShared.check_out_date && groupNights > 0 && (
          <Section title="Paiement">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label="Prix / nuit (MAD)">
                <input type="number" value={groupShared.price_per_night} onChange={e => setG('price_per_night', e.target.value)} placeholder="0" style={iStyle} />
              </Field>
              {groupTotal > 0 && (
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <div style={{ background: `${C.teal}15`, borderRadius: 10, padding: 12, border: `1px solid ${C.teal}30`, fontSize: 13, color: C.teal, fontWeight: 700, width: '100%' }}>
                    {groupNights}n × {groupShared.price_per_night} = {groupTotal} MAD
                  </div>
                </div>
              )}
            </div>
          </Section>
        )}

        <button onClick={submitGroup} disabled={busy} style={{
          width: '100%', padding: 18, background: busy ? C.gray : C.teal,
          color: C.white, borderRadius: 14, fontWeight: 800, fontSize: 16,
        }}>
          {busy ? 'Enregistrement...' : `✅ Enregistrer le groupe (${groupPersons.length} pers.)`}
        </button>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: INDIVIDUAL MODE
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ padding: '16px 16px 32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={() => navigate('rooms')} style={{ background: 'none', color: C.teal, fontSize: 15, fontWeight: 700, padding: 0, minHeight: 0 }}>← Retour</button>
        <div style={{ fontSize: 17, fontWeight: 800, color: C.dark }}>
          Check-in {roomNumber ? `— Ch. ${roomNumber}` : ''}
        </div>
      </div>

      {/* Type toggle */}
      {!isPartialRoom && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {[{ k: 'individual', l: '👤 Individuel' }, { k: 'group', l: '👥 Groupe' }].map(({ k, l }) => (
            <button key={k} onClick={() => setCheckInType(k)} style={{
              flex: 1, padding: '10px 8px', borderRadius: 10, fontSize: 13, fontWeight: 700,
              background: checkInType === k ? C.teal : C.white,
              color: checkInType === k ? C.white : C.dark,
              border: checkInType === k ? `2px solid ${C.teal}` : `1.5px solid ${C.border}`,
              minHeight: 44,
            }}>{l}</button>
          ))}
        </div>
      )}

      {/* Partial room banner */}
      {isPartialRoom && (
        <div style={{
          background: '#fef9ee', border: '1.5px solid #e0a45860',
          borderRadius: 10, padding: '12px 14px', marginBottom: 16, fontSize: 13, color: C.dark,
        }}>
          <span style={{ fontSize: 16, marginRight: 8 }}>ℹ️</span>
          <strong>Chambre partiellement occupée</strong>
          {partialGuestName ? <> par <strong>{partialGuestName}</strong></> : ''}.{' '}
          Vous ajoutez un(e) nouveau/elle client(e) à cette chambre.
        </div>
      )}

      {/* Guest search */}
      <div style={{ position: 'relative', marginBottom: 20 }}>
        <Field label="Rechercher un client existant">
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Nom, prénom ou numéro de document..."
            style={iStyle} />
        </Field>
        {(results.length > 0 || searching) && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
            background: C.white, border: `1px solid ${C.border}`, borderRadius: 10,
            boxShadow: '0 4px 16px rgba(0,0,0,.12)', overflow: 'hidden',
          }}>
            {searching && <div style={{ padding: '12px 14px', color: C.gray, fontSize: 13 }}>Recherche...</div>}
            {results.map(g => (
              <button key={g.id} onClick={() => fillGuest(g)} style={{
                width: '100%', padding: '12px 14px', textAlign: 'left', background: 'none',
                borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', minHeight: 0,
              }}>
                <div>
                  <div style={{ fontWeight: 700, color: C.dark, fontSize: 14 }}>{g.last_name} {g.first_name}</div>
                  <div style={{ color: C.gray, fontSize: 12 }}>{g.document_number || '—'} · {g.nationality || '—'}</div>
                </div>
                {g.tag === 'blacklist' && <span>⛔</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="checkin-columns">
      <div>
      <Section title="Identité du client">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Field label="Nom *"><input value={form.last_name} onChange={e => setF('last_name', e.target.value)} style={iStyle} /></Field>
          <Field label="Prénom *"><input value={form.first_name} onChange={e => setF('first_name', e.target.value)} style={iStyle} /></Field>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Field label="Date de naissance"><input type="date" value={form.date_of_birth} onChange={e => setF('date_of_birth', e.target.value)} style={iStyle} /></Field>
          <Field label="Lieu de naissance"><input value={form.place_of_birth} onChange={e => setF('place_of_birth', e.target.value)} style={iStyle} /></Field>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Field label="Nationalité"><input value={form.nationality} onChange={e => setF('nationality', e.target.value)} style={iStyle} /></Field>
          <Field label="Profession"><input value={form.profession} onChange={e => setF('profession', e.target.value)} style={iStyle} /></Field>
        </div>
        <Field label="Adresse permanente"><input value={form.permanent_address} onChange={e => setF('permanent_address', e.target.value)} style={iStyle} /></Field>
      </Section>

      <Section title="Document d'identité">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Field label="Type">
            <select value={form.document_type} onChange={e => setF('document_type', e.target.value)} style={iStyle}>
              <option value="Passeport">Passeport</option>
              <option value="CIN">CIN</option>
              <option value="Titre de séjour">Titre de séjour</option>
              <option value="Autre">Autre</option>
            </select>
          </Field>
          <Field label="Numéro"><input value={form.document_number} onChange={e => setF('document_number', e.target.value)} style={iStyle} /></Field>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Field label="Délivré à"><input value={form.document_issued_at} onChange={e => setF('document_issued_at', e.target.value)} style={iStyle} /></Field>
          <Field label="Date délivrance"><input type="date" value={form.document_issued_date} onChange={e => setF('document_issued_date', e.target.value)} style={iStyle} /></Field>
        </div>
      </Section>
      </div>

      <div>
      <Section title="Informations de voyage">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Field label="Venant de"><input value={form.coming_from} onChange={e => setF('coming_from', e.target.value)} style={iStyle} /></Field>
          <Field label="Allant à"><input value={form.going_to} onChange={e => setF('going_to', e.target.value)} style={iStyle} /></Field>
        </div>
        <Field label="N° entrée Maroc"><input value={form.morocco_entry_number} onChange={e => setF('morocco_entry_number', e.target.value)} style={iStyle} /></Field>
        {!isPartialRoom && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Adultes"><input type="number" min="1" value={form.adults} onChange={e => setF('adults', e.target.value)} style={iStyle} /></Field>
            <Field label="Enfants"><input type="number" min="0" value={form.children} onChange={e => setF('children', e.target.value)} style={iStyle} /></Field>
          </div>
        )}
      </Section>

      {!isPartialRoom && (
        <Section title="Séjour & Paiement">
          <Field label="Chambre *">
            <RoomSelect value={form.room_id} onChange={v => {
              setF('room_id', v);
              const rm = roomsWithCap.find(r => r.id === v);
              if (rm?.price_per_night && !form.price_per_night) setF('price_per_night', rm.price_per_night);
            }} />
          </Field>
          {selectedRoom?.status === 'occupied' && (
            <div style={{ background: '#fef9ee', border: `1.5px solid #e0a45850`, borderRadius: 8, padding: '10px 12px', marginBottom: 12, fontSize: 12, color: C.dark }}>
              ℹ️ Chambre partiellement occupée{selectedRoom.primary_guest_last_name ? ` par ${selectedRoom.primary_guest_last_name} ${selectedRoom.primary_guest_first_name}` : ''} ({selectedRoom.guest_count}/{selectedRoom.capacity})
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Arrivée *"><input type="date" value={form.check_in_date} onChange={e => setF('check_in_date', e.target.value)} style={iStyle} /></Field>
            <Field label="Départ *"><input type="date" min={form.check_in_date} value={form.check_out_date} onChange={e => setF('check_out_date', e.target.value)} style={iStyle} /></Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Prix/nuit (MAD)"><input type="number" min="0" value={form.price_per_night} onChange={e => setF('price_per_night', parseFloat(e.target.value) || 0)} style={iStyle} /></Field>
            <Field label="Canal">
              <select value={form.channel} onChange={e => setF('channel', e.target.value)} style={iStyle}>
                <option value="direct">Direct</option>
                <option value="booking">Booking.com</option>
                <option value="airbnb">Airbnb</option>
                <option value="agoda">Agoda</option>
                <option value="autre">Autre</option>
              </select>
            </Field>
          </div>
          {form.check_out_date && (
            <div style={{ background: `${C.teal}15`, borderRadius: 10, padding: 14, marginBottom: 14, border: `1px solid ${C.teal}30` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: C.gray, fontSize: 13 }}>{nightsVal} nuit{nightsVal > 1 ? 's' : ''} × {form.price_per_night} MAD</span>
                <span style={{ fontWeight: 800, color: C.teal, fontSize: 16 }}>{total} MAD</span>
              </div>
            </div>
          )}
          <Field label="Paiement">
            <div style={{ display: 'flex', gap: 8 }}>
              {[{ v: 'checkout', l: 'À la sortie' }, { v: 'immediate', l: 'Immédiat' }, { v: 'deposit', l: 'Acompte' }].map(p => (
                <button key={p.v} onClick={() => setF('payment_type', p.v)} style={{
                  flex: 1, padding: '10px 6px', borderRadius: 10, fontSize: 12, fontWeight: 600,
                  background: form.payment_type === p.v ? C.teal : '#f0ece6',
                  color: form.payment_type === p.v ? C.white : C.dark,
                  minHeight: 44,
                }}>{p.l}</button>
              ))}
            </div>
          </Field>
          <Field label="Notes"><textarea value={form.notes} onChange={e => setF('notes', e.target.value)} rows={2} style={{ ...iStyle, minHeight: 0, resize: 'none' }} /></Field>
        </Section>
      )}
      </div>
      </div>

      <button onClick={submit} disabled={busy} style={{
        width: '100%', padding: 18, background: busy ? C.gray : C.teal,
        color: C.white, borderRadius: 14, fontWeight: 800, fontSize: 16, marginTop: 8,
      }}>
        {busy ? 'Enregistrement...' : isPartialRoom ? '+ Ajouter à la chambre' : '✓ Confirmer le Check-in'}
      </button>
    </div>
  );
}
