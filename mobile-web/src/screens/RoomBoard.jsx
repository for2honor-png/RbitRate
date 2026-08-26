import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import { C } from '../theme';

const STATUS_COLOR = { available: C.teal, occupied: C.coral, cleaning: C.saffron, maintenance: C.gray };
const STATUS_LABEL = { available: 'Libre', occupied: 'Occupée', cleaning: 'Nettoyage', maintenance: 'Maintenance' };
const STATUS_ICON  = { available: '', occupied: '', cleaning: '🧹', maintenance: '🔧' };

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: `1px solid ${C.border}` }}>
      <span style={{ color: C.gray, fontSize: 13 }}>{label}</span>
      <span style={{ color: C.dark, fontSize: 13, fontWeight: 600 }}>{value}</span>
    </div>
  );
}

export default function RoomBoard({ ctx }) {
  const { property, navigate } = ctx;
  const [rooms, setRooms]       = useState([]);
  const [resMap, setResMap]     = useState({});
  const [loading, setLoading]   = useState(true);
  const [modal,   setModal]     = useState(null); // { type: 'checkout'|'status'|'addGuest', room, res? }
  const [busy,    setBusy]      = useState(false);
  const [toast,   setToast]     = useState('');
  const [roomGuests, setRoomGuests] = useState([]); // guests for current checkout modal
  const [addGuestForm, setAddGuestForm] = useState(null); // null | { last_name, first_name, nationality, document_type, document_number, coming_from, going_to }

  const load = useCallback(async () => {
    if (!property?.id) return;
    const [r, res] = await Promise.all([
      api.getRooms(property.id),
      api.getActiveReservations(property.id),
    ]);
    setRooms(r || []);
    const map = {};
    (res || []).forEach(r => { map[r.room_id] = r; });
    setResMap(map);
    setLoading(false);
  }, [property?.id]);

  useEffect(() => { load(); }, [load]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const tapRoom = async (room) => {
    if (room.status === 'available') {
      navigate(`checkin?room=${room.id}&number=${encodeURIComponent(room.room_number)}&price=${room.price_per_night || 0}`);
    } else if (room.status === 'occupied') {
      const res        = resMap[room.id] || null;
      const guestCount = res ? (res.reservation_guests?.length || 0) : 0;
      const capacity   = room.capacity || 1;
      // Partially occupied — tap goes directly to check-in to add a guest
      if (guestCount < capacity && capacity > 1) {
        const guestName = res?.guests ? encodeURIComponent(`${res.guests.last_name} ${res.guests.first_name}`) : '';
        navigate(`checkin?room=${room.id}&number=${encodeURIComponent(room.room_number)}&price=${room.price_per_night || 0}&partial=1&res_id=${res?.id || ''}&guest_name=${guestName}`);
        return;
      }
      setModal({ type: 'checkout', room, res });
      setRoomGuests([]);
      if (res?.id) {
        api.getRoomGuests(res.id).then(g => setRoomGuests(g || [])).catch(() => {});
      }
    } else {
      setModal({ type: 'status', room });
    }
  };

  const doAddGuest = async () => {
    if (!addGuestForm || !modal?.res) return;
    if (!addGuestForm.last_name?.trim() || !addGuestForm.first_name?.trim()) return;
    setBusy(true);
    try {
      await api.addGuestToRoom(modal.res.id, addGuestForm);
      const updated = await api.getRoomGuests(modal.res.id);
      setRoomGuests(updated || []);
      setAddGuestForm(null);
    } catch (_) {}
    setBusy(false);
  };

  const doCheckout = async () => {
    if (!modal?.res) return;
    setBusy(true);
    await api.checkout(modal.res.id, modal.room.id);
    setModal(null);
    showToast('Check-out effectué ✓');
    await load();
    setBusy(false);
  };

  const doStatusChange = async (newStatus) => {
    setBusy(true);
    await api.updateRoom(modal.room.id, { status: newStatus });
    setModal(null);
    showToast(`Statut mis à jour : ${STATUS_LABEL[newStatus]} ✓`);
    await load();
    setBusy(false);
  };

  return (
    <div style={{ padding: '20px 12px' }}>
      <div style={{ fontSize: 16, fontWeight: 800, color: C.dark, marginBottom: 14 }}>
        {property?.display_name || 'Chambres'}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: C.gray, padding: '40px 0' }}>Chargement...</div>
      ) : (
        <>
          <div className="room-grid" style={{ marginBottom: 16 }}>
            {rooms.map(room => {
              const res        = resMap[room.id];
              const guestCount = res ? (res.reservation_guests?.length || 0) : 0;
              const capacity   = room.capacity || 1;
              const isFull     = guestCount >= capacity;
              const isPartial  = room.status === 'occupied' && !isFull && capacity > 1;
              const color      = isPartial ? C.saffron : (STATUS_COLOR[room.status] || C.gray);
              const icon       = STATUS_ICON[room.status] || '';
              return (
                <button key={room.id} onClick={() => tapRoom(room)} style={{
                  background: color, borderRadius: 10, padding: '10px 5px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                  cursor: 'pointer', minHeight: 60,
                  transition: 'opacity .1s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
                >
                  <span style={{ color: C.white, fontWeight: 900, fontSize: 15 }}>{room.room_number}</span>
                  {icon && <span style={{ fontSize: 13 }}>{icon}</span>}
                  {res?.guests && (
                    <span style={{ color: 'rgba(255,255,255,.85)', fontSize: 9, textAlign: 'center', lineHeight: 1.2 }}>
                      {res.guests.last_name}
                    </span>
                  )}
                  {isPartial && (
                    <span style={{ color: 'rgba(255,255,255,.9)', fontSize: 8, fontWeight: 700 }}>
                      {capacity - guestCount} libre{capacity - guestCount > 1 ? 's' : ''}
                    </span>
                  )}
                  {res?.check_out_date && (
                    <span style={{ color: 'rgba(255,255,255,.65)', fontSize: 8 }}>
                      ↑{res.check_out_date.slice(5).replace('-', '/')}
                    </span>
                  )}
                  {res && capacity > 1 && (
                    <div style={{ display: 'flex', gap: 2, marginTop: 2, width: '70%' }}>
                      {Array.from({ length: capacity }).map((_, i) => (
                        <div key={i} style={{
                          flex: 1, height: 3, borderRadius: 2,
                          background: i < guestCount
                            ? (isFull ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.7)')
                            : 'rgba(255,255,255,0.25)',
                        }} />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            {Object.entries(STATUS_COLOR).map(([s, c]) => (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 8, height: 8, borderRadius: 4, background: c }} />
                <span style={{ fontSize: 11, color: C.gray }}>{STATUS_LABEL[s]}</span>
              </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: 4, background: C.saffron }} />
              <span style={{ fontSize: 11, color: C.gray }}>Partielle</span>
            </div>
          </div>
        </>
      )}

      {/* Checkout bottom sheet */}
      {modal?.type === 'checkout' && (
        <div onClick={() => setModal(null)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 200,
          display: 'flex', alignItems: 'flex-end',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: C.white, borderRadius: '20px 20px 0 0',
            width: '100%', maxWidth: 430, margin: '0 auto',
            padding: '20px 20px 40px',
          }}>
            <div style={{ width: 36, height: 4, background: C.border, borderRadius: 2, margin: '0 auto 20px' }} />
            <div style={{ fontSize: 18, fontWeight: 800, color: C.dark }}>Chambre {modal.room.room_number}</div>

            {/* Guests list */}
            <div style={{ margin: '12px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: C.gray, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                  Occupants {roomGuests.length || '—'}/{modal.room.capacity || 1}
                </span>
                {roomGuests.length < (modal.room.capacity || 1) && !addGuestForm && (
                  <button onClick={() => setAddGuestForm({ last_name: '', first_name: '', nationality: '', document_type: 'Passeport', document_number: '', coming_from: '', going_to: '' })} style={{
                    background: C.teal, color: C.white, border: 'none',
                    borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                  }}>+ Ajouter</button>
                )}
              </div>
              {/* Capacity bar */}
              {(modal.room.capacity || 1) > 1 && (
                <div style={{ display: 'flex', gap: 3, marginBottom: 8 }}>
                  {Array.from({ length: modal.room.capacity || 1 }).map((_, i) => (
                    <div key={i} style={{
                      flex: 1, height: 4, borderRadius: 2,
                      background: i < roomGuests.length ? C.teal : `${C.teal}25`,
                    }} />
                  ))}
                </div>
              )}
              {roomGuests.map(rg => (
                <div key={rg.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: rg.is_primary ? C.coral : C.teal, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ color: C.white, fontSize: 11, fontWeight: 700 }}>
                      {(rg.guests?.last_name?.[0] || '') + (rg.guests?.first_name?.[0] || '')}
                    </span>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>{rg.guests?.last_name} {rg.guests?.first_name}</div>
                    {rg.guests?.nationality && <div style={{ fontSize: 10, color: C.gray }}>{rg.guests.nationality}</div>}
                  </div>
                </div>
              ))}
              {roomGuests.length === 0 && <div style={{ fontSize: 12, color: C.gray }}>Chargement...</div>}
            </div>

            {/* Add guest form */}
            {addGuestForm && (
              <div style={{ background: '#f8f8f4', borderRadius: 10, padding: 12, marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.dark, marginBottom: 8 }}>Nouveau client</div>
                {[['last_name','Nom *'],['first_name','Prénom *'],['nationality','Nationalité'],['document_number','N° pièce'],['coming_from','Provenance'],['going_to','Destination']].map(([key, label]) => (
                  <input key={key} placeholder={label}
                    value={addGuestForm[key] || ''}
                    onChange={e => setAddGuestForm(f => ({ ...f, [key]: e.target.value }))}
                    style={{ width: '100%', boxSizing: 'border-box', marginBottom: 6, padding: '8px 10px', borderRadius: 8, border: `1.5px solid ${C.border}`, fontSize: 13, fontFamily: 'inherit' }}
                  />
                ))}
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <button onClick={() => setAddGuestForm(null)} style={{ flex: 1, padding: 10, background: `${C.gray}20`, color: C.dark, border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Annuler</button>
                  <button onClick={doAddGuest} disabled={busy || !addGuestForm.last_name?.trim() || !addGuestForm.first_name?.trim()} style={{ flex: 2, padding: 10, background: C.teal, color: C.white, border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: busy ? 0.7 : 1 }}>{busy ? 'Ajout...' : 'Ajouter'}</button>
                </div>
              </div>
            )}

            {modal.res && (
              <div style={{ background: '#f8f8f4', borderRadius: 10, padding: '4px 14px', marginBottom: 20 }}>
                <Row label="Arrivée"       value={modal.res.check_in_date} />
                <Row label="Départ prévu"  value={modal.res.check_out_date} />
                <Row label="Nuits"         value={modal.res.nights || '—'} />
                <Row label="Montant"       value={`${modal.res.total_amount || 0} MAD`} />
                <Row label="Payé"          value={`${modal.res.paid_amount || 0} MAD`} />
              </div>
            )}
            {modal.res && (
              <button onClick={() => navigate(`fiche?id=${modal.res.id}`)} style={{
                width: '100%', padding: 14, background: C.teal, color: C.white,
                borderRadius: 12, fontWeight: 700, fontSize: 15, marginBottom: 10,
              }}>
                📋 Fiche police
              </button>
            )}
            <button onClick={doCheckout} disabled={busy} style={{
              width: '100%', padding: 16, background: C.coral, color: C.white,
              borderRadius: 12, fontWeight: 800, fontSize: 16,
              opacity: busy ? 0.7 : 1,
            }}>
              {busy ? 'En cours...' : '🚪 Check-out'}
            </button>
          </div>
        </div>
      )}

      {/* Status change bottom sheet */}
      {modal?.type === 'status' && (
        <div onClick={() => setModal(null)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 200,
          display: 'flex', alignItems: 'flex-end',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: C.white, borderRadius: '20px 20px 0 0',
            width: '100%', maxWidth: 430, margin: '0 auto',
            padding: '20px 20px 40px',
          }}>
            <div style={{ width: 36, height: 4, background: C.border, borderRadius: 2, margin: '0 auto 20px' }} />
            <div style={{ fontSize: 18, fontWeight: 800, color: C.dark, marginBottom: 4 }}>
              Chambre {modal.room.room_number}
            </div>
            <div style={{ fontSize: 13, color: C.gray, marginBottom: 24 }}>
              {STATUS_ICON[modal.room.status]} {STATUS_LABEL[modal.room.status]} — Changer le statut :
            </div>

            <button onClick={() => doStatusChange('available')} disabled={busy} style={{
              width: '100%', padding: 15, marginBottom: 10,
              background: C.teal, color: C.white,
              borderRadius: 12, fontWeight: 700, fontSize: 15,
              opacity: busy ? 0.6 : 1,
            }}>
              ✅ Disponible
            </button>
            <button onClick={() => doStatusChange('cleaning')} disabled={busy} style={{
              width: '100%', padding: 15, marginBottom: 10,
              background: modal.room.status === 'cleaning' ? `${C.saffron}22` : '#fefce8',
              color: '#92400e',
              border: `1.5px solid ${C.saffron}`,
              borderRadius: 12, fontWeight: 700, fontSize: 15,
              opacity: busy ? 0.6 : 1,
            }}>
              🧹 Nettoyage
            </button>
            <button onClick={() => doStatusChange('maintenance')} disabled={busy} style={{
              width: '100%', padding: 15, marginBottom: 16,
              background: modal.room.status === 'maintenance' ? '#f3f4f6' : '#f9fafb',
              color: '#374151',
              border: `1.5px solid #d1d5db`,
              borderRadius: 12, fontWeight: 700, fontSize: 15,
              opacity: busy ? 0.6 : 1,
            }}>
              🔧 Maintenance
            </button>
            <button onClick={() => setModal(null)} style={{
              width: '100%', padding: 13,
              background: 'none', color: C.gray,
              borderRadius: 12, fontWeight: 600, fontSize: 14,
              border: `1px solid ${C.border}`,
            }}>
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
          background: C.dark, color: C.white, padding: '10px 20px',
          borderRadius: 24, fontSize: 14, fontWeight: 600, zIndex: 300,
          whiteSpace: 'nowrap',
        }}>{toast}</div>
      )}
    </div>
  );
}
