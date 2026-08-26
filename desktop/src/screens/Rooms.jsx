import React, { useState, useEffect, useCallback } from 'react';
import { theme } from '../theme.js';
import { useApp } from '../App.jsx';
import { useAuth } from '../App.jsx';
import Modal from '../components/Modal.jsx';
import ShiftGuard from '../components/ShiftGuard.jsx';

const FIELD = {
  border: `1.5px solid rgba(31,42,46,0.2)`, borderRadius: 8,
  padding: '9px 12px', fontSize: 13, fontFamily: theme.font,
  background: theme.white, color: theme.dark, outline: 'none', width: '100%',
  boxSizing: 'border-box',
};

const STATUS_CONFIG = {
  available:   { label: 'Libre',       color: theme.teal,    bg: `${theme.teal}18` },
  occupied:    { label: 'Occupée',     color: theme.coral,   bg: `${theme.coral}18` },
  cleaning:    { label: 'Nettoyage',   color: theme.saffron, bg: `${theme.saffron}18` },
  maintenance: { label: 'Maintenance', color: '#6b7280',     bg: '#6b728018' },
};

const CHANNEL_COLORS = {
  direct:   theme.teal,
  airbnb:   '#ff5a5f',
  booking:  '#003580',
  vrbo:     '#1f5ba8',
  expedia:  '#f5a623',
  other:    '#6b7280',
};

const ROOM_TYPES = ['Standard', 'Supérieure', 'Deluxe', 'Suite', 'Studio', 'Familiale', 'Économique'];

const EMPTY_FORM = {
  room_number: '', room_name: '', room_type: 'Standard',
  floor: 1, capacity: 2, price_per_night: 0, status: 'available', notes: '',
};

function Label({ children, required }) {
  return (
    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: theme.dark, opacity: 0.55, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.4 }}>
      {children}{required && <span style={{ color: theme.coral }}> *</span>}
    </label>
  );
}

function RoomModal({ initial, propertyId, onSave, onClose }) {
  const [form, setForm] = useState(initial ? {
    room_number: initial.room_number || '',
    room_name:   initial.room_name || '',
    room_type:   initial.room_type || 'Standard',
    floor:       initial.floor || 1,
    capacity:    initial.capacity || 2,
    price_per_night: initial.price_per_night || 0,
    status:      initial.status || 'available',
    notes:       initial.notes || '',
  } : EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  function set(key, value) { setForm(f => ({ ...f, [key]: value })); }

  async function handleSave() {
    const errs = {};
    if (!form.room_number.trim()) errs.room_number = 'Requis';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    await onSave({ ...form, property_id: propertyId });
    setSaving(false);
  }

  return (
    <Modal title={initial ? 'Modifier la chambre' : 'Nouvelle chambre'} onClose={onClose}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
        <div style={{ marginBottom: 14 }}>
          <Label required>Numéro</Label>
          <input
            value={form.room_number} onChange={e => set('room_number', e.target.value)}
            placeholder="ex: 101"
            style={{ ...FIELD, ...(errors.room_number ? { border: `1.5px solid ${theme.coral}` } : {}) }}
          />
          {errors.room_number && <div style={{ color: theme.coral, fontSize: 11, marginTop: 3 }}>{errors.room_number}</div>}
        </div>

        <div style={{ marginBottom: 14 }}>
          <Label>Nom (optionnel)</Label>
          <input value={form.room_name} onChange={e => set('room_name', e.target.value)} placeholder="ex: Chambre Bleue" style={FIELD} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <Label>Type</Label>
          <select value={form.room_type} onChange={e => set('room_type', e.target.value)} style={{ ...FIELD, cursor: 'pointer' }}>
            {ROOM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div style={{ marginBottom: 14 }}>
          <Label>Statut</Label>
          <select value={form.status} onChange={e => set('status', e.target.value)} style={{ ...FIELD, cursor: 'pointer' }}>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>

        <div style={{ marginBottom: 14 }}>
          <Label>Étage</Label>
          <input type="number" min="0" value={form.floor} onChange={e => set('floor', parseInt(e.target.value) || 0)} style={FIELD} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <Label>Capacité (personnes)</Label>
          <input type="number" min="1" value={form.capacity} onChange={e => set('capacity', parseInt(e.target.value) || 1)} style={FIELD} />
        </div>

        <div style={{ marginBottom: 14, gridColumn: 'span 2' }}>
          <Label>Prix / nuit (MAD)</Label>
          <input type="number" min="0" step="10" value={form.price_per_night} onChange={e => set('price_per_night', parseFloat(e.target.value) || 0)} style={FIELD} />
        </div>

        <div style={{ marginBottom: 14, gridColumn: 'span 2' }}>
          <Label>Notes</Label>
          <textarea
            value={form.notes} onChange={e => set('notes', e.target.value)}
            rows={3} placeholder="Remarques, équipements particuliers..."
            style={{ ...FIELD, resize: 'vertical', minHeight: 64 }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 16, borderTop: `1px solid rgba(31,42,46,0.08)` }}>
        <button onClick={onClose} style={{
          background: 'rgba(31,42,46,0.07)', color: theme.dark, borderRadius: 8,
          padding: '9px 18px', border: 'none', fontWeight: 600, fontSize: 13,
          fontFamily: theme.font, cursor: 'pointer',
        }}>Annuler</button>
        <button onClick={handleSave} disabled={saving} style={{
          background: theme.teal, color: theme.white, borderRadius: 8,
          padding: '9px 18px', border: 'none', fontWeight: 700, fontSize: 13,
          fontFamily: theme.font, cursor: 'pointer', opacity: saving ? 0.7 : 1,
        }}>
          {saving ? 'Enregistrement...' : initial ? 'Modifier' : 'Créer'}
        </button>
      </div>
    </Modal>
  );
}

const PAY_METHODS_CHECKOUT = [
  { key: 'cash', label: 'Espèces' },
  { key: 'card', label: 'Carte' },
  { key: 'bank_transfer', label: 'Virement' },
  { key: 'ota_collected', label: 'OTA' },
  { key: 'agency', label: 'Agence' },
];

function OccupiedDetailModal({ room, reservation, selectedPropertyId, onCheckout, onStatusChange, onClose }) {
  const { staff } = useAuth();
  const { setPage } = useApp();
  const [checkoutStep, setCheckoutStep] = useState(null); // null | 'payment' | 'confirm'
  const [printing,   setPrinting]   = useState(false);
  const [savingPDF,  setSavingPDF]  = useState(false);
  const [printError, setPrintError] = useState(null);
  const [payMethod, setPayMethod] = useState('cash');
  const [payAmount, setPayAmount] = useState('');
  const [activeShifts, setActiveShifts] = useState([]);
  const [shiftChecked, setShiftChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [guests, setGuests] = useState([]);
  const [addingGuest, setAddingGuest] = useState(false);
  const [guestPrinting, setGuestPrinting] = useState(null);

  useEffect(() => {
    if (reservation?.id) {
      window.db.invoke('reservation_guests:getAll', { reservation_id: reservation.id })
        .then(rows => setGuests(rows || []));
    }
  }, [reservation?.id]);

  const balance = reservation ? Math.max(0, (reservation.total_amount || 0) - (reservation.paid_amount || 0)) : 0;

  async function handlePrintFiche() {
    if (!reservation?.id) return;
    setPrinting(true);
    setPrintError(null);
    try {
      const result = await window.db.invoke('fiche:print', { reservationId: reservation.id });
      if (result && !result.ok) setPrintError(result.error || 'Erreur impression');
    } catch (e) {
      setPrintError('Erreur impression');
    } finally {
      setPrinting(false);
    }
  }

  async function handleSaveFichePDF() {
    if (!reservation?.id) return;
    setSavingPDF(true);
    setPrintError(null);
    try {
      const result = await window.db.invoke('fiche:savePDF', { reservationId: reservation.id });
      if (!result?.ok && result?.error && result.error !== 'Annulé') {
        setPrintError(result.error);
      }
    } catch (e) {
      setPrintError('Erreur PDF');
    } finally {
      setSavingPDF(false);
    }
  }

  async function handlePrintGuestFiche(g) {
    setGuestPrinting(g.id);
    setPrintError(null);
    try {
      const result = await window.db.invoke('fiche:printForGuest', { reservationId: reservation.id, guestId: g.guest_id });
      if (result && !result.ok) setPrintError(result.error || 'Erreur impression');
    } catch (e) {
      setPrintError('Erreur impression');
    } finally {
      setGuestPrinting(null);
    }
  }

  async function handleRemoveGuest(rgId) {
    await window.db.invoke('reservation_guests:remove', { id: rgId });
    const rows = await window.db.invoke('reservation_guests:getAll', { reservation_id: reservation.id });
    setGuests(rows || []);
  }

  async function startCheckout() {
    if (balance > 0) {
      // Need to check shift before showing payment form
      const shiftData = await window.db.invoke('shifts:checkOpen', { property_id: selectedPropertyId });
      setActiveShifts(shiftData.shifts || []);
      setShiftChecked(true);
      setPayAmount(String(balance));
      setCheckoutStep('payment');
    } else {
      setCheckoutStep('confirm');
    }
  }

  async function handlePayAndCheckout() {
    if (!activeShifts.length) return;
    setSaving(true);
    const shift = activeShifts[0];
    // Create transaction
    await window.db.invoke('transactions:create', {
      shift_id: shift.id,
      property_id: selectedPropertyId,
      reservation_id: reservation.id,
      type: 'income',
      category: 'room_revenue',
      amount: parseFloat(payAmount) || balance,
      payment_method: payMethod,
      description: `Ch.${room.room_number} — ${reservation.last_name} ${reservation.first_name}`,
      recorded_by: staff?.id || null,
    });
    // Checkout
    await onCheckout(reservation.id, room.id);
    setSaving(false);
  }

  const checkInDate = reservation?.check_in_date
    ? new Date(reservation.check_in_date).toLocaleDateString('fr-MA', { day: 'numeric', month: 'long' })
    : '—';
  const checkOutDate = reservation?.check_out_date
    ? new Date(reservation.check_out_date).toLocaleDateString('fr-MA', { day: 'numeric', month: 'long' })
    : '—';
  const channelColor = CHANNEL_COLORS[reservation?.channel] || CHANNEL_COLORS.other;

  return (
    <>
    <Modal title={`Chambre ${room.room_number}${room.room_name ? ` — ${room.room_name}` : ''}`} onClose={onClose} width={460}>
      {reservation ? (
        <>
          {/* Guest list */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.5, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                Occupants {guests.length}/{room.capacity}
              </div>
              {guests.length < room.capacity && (
                <button onClick={() => setAddingGuest(true)} style={{
                  background: theme.teal, color: theme.white, border: 'none',
                  borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 700,
                  fontFamily: theme.font, cursor: 'pointer',
                }}>+ Ajouter</button>
              )}
            </div>
            {/* Capacity bar */}
            <div style={{ display: 'flex', gap: 3, marginBottom: 10 }}>
              {Array.from({ length: room.capacity }).map((_, i) => {
                const filled = i < guests.length;
                const full = guests.length >= room.capacity;
                const almostFull = guests.length === room.capacity - 1;
                const barColor = full ? theme.coral : almostFull ? (theme.saffron || '#f59e0b') : theme.teal;
                return (
                  <div key={i} style={{
                    flex: 1, height: 5, borderRadius: 3,
                    background: filled ? barColor : 'rgba(31,42,46,0.1)',
                  }} />
                );
              })}
            </div>
            {guests.map(g => (
              <div key={g.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 0', borderBottom: '1px solid rgba(31,42,46,0.07)',
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                  background: g.is_primary ? theme.coral : theme.teal,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: theme.white, fontSize: 12, fontWeight: 700,
                }}>
                  {(g.last_name?.[0] || '') + (g.first_name?.[0] || '')}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: theme.dark }}>
                    {g.last_name} {g.first_name}
                    {g.is_primary ? <span style={{ fontSize: 10, marginLeft: 6, opacity: 0.45, fontWeight: 400 }}>principal</span> : null}
                  </div>
                  <div style={{ fontSize: 11, color: theme.dark, opacity: 0.5 }}>
                    {g.nationality}{g.document_number ? ` · ${g.document_number}` : ''}
                  </div>
                </div>
                <button
                  disabled={!!guestPrinting}
                  onClick={() => handlePrintGuestFiche(g)}
                  style={{
                    background: 'rgba(31,42,46,0.06)', border: 'none', borderRadius: 6,
                    padding: '5px 8px', cursor: guestPrinting ? 'wait' : 'pointer',
                    fontSize: 13, opacity: guestPrinting === g.id ? 0.5 : 1,
                  }}
                >{guestPrinting === g.id ? '⏳' : '🖨'}</button>
                {!g.is_primary && (
                  <button onClick={() => handleRemoveGuest(g.id)} style={{
                    background: `${theme.coral}15`, border: 'none', borderRadius: 6,
                    padding: '5px 8px', cursor: 'pointer', fontSize: 13, color: theme.coral,
                  }}>✕</button>
                )}
              </div>
            ))}
            {guests.length === 0 && (
              <div style={{ fontSize: 12, opacity: 0.4, padding: '4px 0' }}>Chargement...</div>
            )}
          </div>

          <div style={{
            background: theme.cream, borderRadius: 10, padding: '14px 16px', marginBottom: 16,
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px',
          }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.5, textTransform: 'uppercase', marginBottom: 2 }}>Arrivée</div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{checkInDate}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.5, textTransform: 'uppercase', marginBottom: 2 }}>Départ</div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{checkOutDate}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.5, textTransform: 'uppercase', marginBottom: 2 }}>Nuits</div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{reservation.nights || '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.5, textTransform: 'uppercase', marginBottom: 2 }}>Canal</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: channelColor, display: 'inline-block', flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 600, textTransform: 'capitalize' }}>{reservation.channel || 'Direct'}</span>
              </div>
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.5, textTransform: 'uppercase', marginBottom: 2 }}>Solde</div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>
                Total: {(reservation.total_amount || 0).toLocaleString('fr-MA')} MAD
                {balance > 0
                  ? <span style={{ marginLeft: 8, color: theme.coral, fontWeight: 700 }}>Dû: {balance.toLocaleString('fr-MA')} MAD</span>
                  : <span style={{ marginLeft: 8, color: theme.teal }}>✓ Entièrement payé</span>
                }
              </div>
            </div>
          </div>

          {/* Print / PDF buttons */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
              <button disabled={printing} onClick={handlePrintFiche} style={{
                flex: 1, background: 'rgba(31,42,46,0.06)', color: theme.dark,
                borderRadius: 8, padding: '9px 12px', border: 'none',
                fontWeight: 600, fontSize: 13, fontFamily: theme.font,
                cursor: printing ? 'wait' : 'pointer', opacity: printing ? 0.6 : 1,
              }}>{printing ? '⏳ Impression...' : '🖨 Fiche (client principal)'}</button>
              <button disabled={savingPDF} onClick={handleSaveFichePDF} style={{
                background: 'rgba(31,42,46,0.06)', color: theme.dark,
                borderRadius: 8, padding: '9px 14px', border: '1.5px solid rgba(31,42,46,0.12)',
                fontWeight: 600, fontSize: 13, fontFamily: theme.font,
                cursor: savingPDF ? 'wait' : 'pointer', opacity: savingPDF ? 0.6 : 1,
              }}>{savingPDF ? '⏳' : '📥 PDF'}</button>
            </div>
            {printError && (
              <div style={{ fontSize: 11, color: '#b91c1c', background: '#fef2f2', padding: '6px 10px', borderRadius: 6, border: '1px solid #fca5a5' }}>
                ⚠ {printError} — utilisez "📥 PDF" si l'impression ne fonctionne pas.
              </div>
            )}
          </div>

          {/* Checkout flow */}
          {checkoutStep === null && (
            <div style={{ marginBottom: 16 }}>
              <button onClick={startCheckout} style={{
                width: '100%', background: theme.coral, color: theme.white, borderRadius: 8,
                padding: '10px 16px', border: 'none', fontWeight: 700, fontSize: 13,
                fontFamily: theme.font, cursor: 'pointer',
              }}>Check-out →</button>
            </div>
          )}

          {checkoutStep === 'payment' && shiftChecked && (
            <div style={{ marginBottom: 16 }}>
              {activeShifts.length === 0 ? (
                <ShiftGuard onDismiss={() => setCheckoutStep(null)} />
              ) : (
                <div style={{ background: `${theme.coral}08`, border: `1px solid ${theme.coral}25`, borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: theme.dark, marginBottom: 12 }}>
                    Encaissement — {reservation.last_name} {reservation.first_name}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12, fontSize: 12 }}>
                    {[
                      ['Total séjour', reservation.total_amount || 0],
                      ['Déjà payé', (reservation.paid_amount || 0)],
                      ['Solde dû', balance],
                    ].map(([label, val]) => (
                      <div key={label} style={{ textAlign: 'center' }}>
                        <div style={{ opacity: 0.5, fontSize: 10, textTransform: 'uppercase', marginBottom: 2 }}>{label}</div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: label === 'Solde dû' ? theme.coral : theme.dark }}>
                          {val.toLocaleString('fr-MA')} MAD
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginBottom: 10 }}>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 700, opacity: 0.5, textTransform: 'uppercase', marginBottom: 5 }}>Mode de paiement</label>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      {PAY_METHODS_CHECKOUT.map(pm => (
                        <button key={pm.key} onClick={() => setPayMethod(pm.key)} style={{
                          padding: '5px 10px', borderRadius: 6, border: 'none',
                          fontWeight: 600, fontSize: 11, fontFamily: theme.font, cursor: 'pointer',
                          background: payMethod === pm.key ? theme.dark : 'rgba(31,42,46,0.07)',
                          color: payMethod === pm.key ? theme.white : theme.dark,
                        }}>{pm.label}</button>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginBottom: 10 }}>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 700, opacity: 0.5, textTransform: 'uppercase', marginBottom: 5 }}>Montant (MAD)</label>
                    <input
                      type="number" min="0" step="10" value={payAmount}
                      onChange={e => setPayAmount(e.target.value)}
                      style={{ border: `1.5px solid rgba(31,42,46,0.2)`, borderRadius: 8, padding: '8px 12px', fontSize: 15, fontWeight: 700, fontFamily: theme.font, background: theme.white, color: theme.dark, outline: 'none', width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div style={{ fontSize: 11, color: theme.dark, opacity: 0.5, marginBottom: 12 }}>
                    Shift actif: {activeShifts[0].full_name} · Ce paiement sera enregistré sous son shift.
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setCheckoutStep(null)} style={{
                      padding: '9px 16px', borderRadius: 8, border: 'none', fontWeight: 600, fontSize: 13,
                      fontFamily: theme.font, cursor: 'pointer', background: 'rgba(31,42,46,0.07)', color: theme.dark,
                    }}>Annuler</button>
                    <button onClick={handlePayAndCheckout} disabled={saving || !payAmount} style={{
                      flex: 1, background: theme.coral, color: theme.white, borderRadius: 8,
                      padding: '9px 0', border: 'none', fontWeight: 700, fontSize: 13,
                      fontFamily: theme.font, cursor: (saving || !payAmount) ? 'not-allowed' : 'pointer',
                      opacity: (saving || !payAmount) ? 0.6 : 1,
                    }}>{saving ? '...' : '💰 Encaisser et Check-out'}</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {checkoutStep === 'confirm' && (
            <div style={{ background: `${theme.coral}10`, border: `1px solid ${theme.coral}30`, borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: theme.dark, marginBottom: 4 }}>
                {reservation.last_name} {reservation.first_name} — séjour entièrement payé
              </div>
              <div style={{ fontSize: 12, color: theme.teal, fontWeight: 600, marginBottom: 12 }}>✓ Aucun solde dû</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setCheckoutStep(null)} style={{
                  padding: '8px 16px', borderRadius: 7, border: 'none', fontWeight: 600, fontSize: 13,
                  fontFamily: theme.font, cursor: 'pointer', background: 'rgba(31,42,46,0.07)', color: theme.dark,
                }}>Annuler</button>
                <button onClick={() => onCheckout(reservation.id, room.id)} style={{
                  flex: 1, background: theme.coral, color: theme.white, borderRadius: 7,
                  padding: '8px 0', border: 'none', fontWeight: 700, fontSize: 13,
                  fontFamily: theme.font, cursor: 'pointer',
                }}>Confirmer le check-out</button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div style={{ marginBottom: 16, opacity: 0.5, fontSize: 13 }}>
          Aucune réservation active trouvée.
        </div>
      )}

      {/* Change status */}
      <div style={{ borderTop: `1px solid rgba(31,42,46,0.08)`, paddingTop: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>
          Changer le statut
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { s: 'available',   l: 'Disponible' },
            { s: 'cleaning',    l: 'Nettoyage' },
            { s: 'maintenance', l: 'Maintenance' },
          ].map(({ s, l }) => {
            const sc = STATUS_CONFIG[s];
            return (
              <button key={s} onClick={() => onStatusChange(room.id, s)} style={{
                flex: 1, padding: '7px 8px', borderRadius: 6, border: 'none',
                cursor: 'pointer', fontSize: 11, fontWeight: 600, fontFamily: theme.font,
                background: sc.bg, color: sc.color,
              }}>{l}</button>
            );
          })}
        </div>
      </div>
    </Modal>
    {addingGuest && (
      <AddGuestModal
        room={room}
        reservation={reservation}
        onAdded={async () => {
          const rows = await window.db.invoke('reservation_guests:getAll', { reservation_id: reservation.id });
          setGuests(rows || []);
          setAddingGuest(false);
        }}
        onClose={() => setAddingGuest(false)}
      />
    )}
  </>
  );
}

function AddGuestModal({ room, reservation, onAdded, onClose }) {
  const [tab, setTab] = useState('search'); // 'search' | 'new'
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    last_name: '', first_name: '', nationality: '', document_type: 'Passeport',
    document_number: '', date_of_birth: '', place_of_birth: '', profession: '',
    permanent_address: '', document_issued_at: '', document_issued_date: '',
    coming_from: '', going_to: '', morocco_entry_number: '',
  });

  useEffect(() => {
    if (!query.trim() || query.length < 2) { setResults([]); return; }
    setSearching(true);
    window.db.invoke('guests:search', { query }).then(r => { setResults(r || []); setSearching(false); });
  }, [query]);

  async function addExistingGuest(guest) {
    setSaving(true); setError(null);
    const result = await window.db.invoke('reservation_guests:add', {
      reservation_id: reservation.id,
      guest: { id: guest.id },
    });
    setSaving(false);
    if (result?.ok) { onAdded(); }
    else { setError(result?.error || 'Erreur'); }
  }

  async function addNewGuest() {
    if (!form.last_name.trim() || !form.first_name.trim()) { setError('Nom et prénom requis'); return; }
    setSaving(true); setError(null);
    const result = await window.db.invoke('reservation_guests:add', {
      reservation_id: reservation.id,
      guest: { ...form },
    });
    setSaving(false);
    if (result?.ok) { onAdded(); }
    else { setError(result?.error || 'Erreur'); }
  }

  const F = (key) => ({
    ...FIELD, marginBottom: 0,
    value: form[key],
    onChange: e => setForm(f => ({ ...f, [key]: e.target.value })),
  });

  return (
    <Modal title={`Ajouter un client — Ch. ${room.room_number}`} onClose={onClose} width={480}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {['search', 'new'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: '7px 0', borderRadius: 7, border: 'none',
            fontWeight: 700, fontSize: 12, fontFamily: theme.font, cursor: 'pointer',
            background: tab === t ? theme.teal : 'rgba(31,42,46,0.07)',
            color: tab === t ? theme.white : theme.dark,
          }}>{t === 'search' ? '🔍 Client existant' : '👤 Nouveau client'}</button>
        ))}
      </div>

      {tab === 'search' && (
        <>
          <input
            autoFocus
            placeholder="Rechercher par nom ou document..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{ ...FIELD, marginBottom: 10 }}
          />
          {searching && <div style={{ fontSize: 12, opacity: 0.5, marginBottom: 8 }}>Recherche...</div>}
          {results.map(g => (
            <div key={g.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 0', borderBottom: '1px solid rgba(31,42,46,0.07)',
            }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: theme.dark }}>{g.last_name} {g.first_name}</div>
                <div style={{ fontSize: 11, opacity: 0.5 }}>{g.nationality} {g.document_number ? `· ${g.document_number}` : ''}</div>
              </div>
              <button onClick={() => addExistingGuest(g)} disabled={saving} style={{
                background: theme.teal, color: theme.white, border: 'none',
                borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 600,
                fontFamily: theme.font, cursor: saving ? 'wait' : 'pointer',
              }}>Ajouter</button>
            </div>
          ))}
          {query.length >= 2 && !searching && results.length === 0 && (
            <div style={{ fontSize: 12, opacity: 0.4, padding: '8px 0' }}>Aucun résultat</div>
          )}
        </>
      )}

      {tab === 'new' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div><Label required>Nom</Label><input {...F('last_name')} /></div>
            <div><Label required>Prénom</Label><input {...F('first_name')} /></div>
            <div><Label>Nationalité</Label><input {...F('nationality')} /></div>
            <div><Label>Profession</Label><input {...F('profession')} /></div>
            <div>
              <Label>Type pièce</Label>
              <select value={form.document_type} onChange={e => setForm(f => ({ ...f, document_type: e.target.value }))} style={{ ...FIELD }}>
                {['CIN', 'Passeport', 'Carte Séjour', 'Autre'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div><Label>N° pièce</Label><input {...F('document_number')} /></div>
            <div><Label>Date naissance</Label><input type="date" {...F('date_of_birth')} /></div>
            <div><Label>Lieu naissance</Label><input {...F('place_of_birth')} /></div>
          </div>
          <div style={{ marginBottom: 10 }}><Label>Adresse permanente</Label><input {...F('permanent_address')} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div><Label>Provenance</Label><input {...F('coming_from')} /></div>
            <div><Label>Destination</Label><input {...F('going_to')} /></div>
          </div>
          <div style={{ marginBottom: 16 }}><Label>N° entrée Maroc</Label><input {...F('morocco_entry_number')} /></div>
          <button onClick={addNewGuest} disabled={saving} style={{
            width: '100%', background: theme.teal, color: theme.white, border: 'none',
            borderRadius: 8, padding: '11px 0', fontWeight: 700, fontSize: 13,
            fontFamily: theme.font, cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1,
          }}>{saving ? 'Ajout...' : 'Ajouter le client'}</button>
        </>
      )}

      {error && (
        <div style={{ marginTop: 10, fontSize: 12, color: '#b91c1c', background: '#fef2f2', padding: '8px 12px', borderRadius: 6 }}>
          ⚠ {error}
        </div>
      )}
    </Modal>
  );
}

function RoomCard({ room, reservation, guestCount, onEdit, onDelete, onCardClick }) {
  const sc = STATUS_CONFIG[room.status] || STATUS_CONFIG.available;
  const isOccupied = room.status === 'occupied';
  const channelColor = isOccupied ? (CHANNEL_COLORS[reservation?.channel] || CHANNEL_COLORS.other) : null;

  const checkOutStr = reservation?.check_out_date
    ? new Date(reservation.check_out_date).toLocaleDateString('fr-MA', { day: 'numeric', month: 'short' })
    : null;

  return (
    <div
      onClick={onCardClick}
      style={{
        background: theme.white, borderRadius: 12, padding: 16,
        border: `1px solid rgba(31,42,46,0.08)`,
        borderTop: `3px solid ${sc.color}`,
        display: 'flex', flexDirection: 'column', gap: 8,
        cursor: 'pointer',
        transition: 'box-shadow 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(31,42,46,0.1)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 900, color: isOccupied ? theme.coral : theme.dark }}>
            #{room.room_number}
          </div>
          {room.room_name && <div style={{ fontSize: 12, color: theme.dark, opacity: 0.5, marginTop: 1 }}>{room.room_name}</div>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {isOccupied && channelColor && (
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: channelColor, display: 'inline-block' }} />
          )}
          <span style={{
            fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4,
            background: sc.bg, color: sc.color, borderRadius: 5, padding: '3px 7px',
          }}>{sc.label}</span>
        </div>
      </div>

      {/* Occupied: show guest info + capacity bar */}
      {isOccupied && reservation ? (
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: theme.dark }}>
            {reservation.last_name} {reservation.first_name}
            {guestCount > 1 && (
              <span style={{ fontSize: 11, marginLeft: 5, opacity: 0.55, fontWeight: 400 }}>+{guestCount - 1} autre{guestCount > 2 ? 's' : ''}</span>
            )}
          </div>
          {checkOutStr && (
            <div style={{ fontSize: 11, color: theme.dark, opacity: 0.5, marginTop: 2 }}>
              Départ {checkOutStr}
            </div>
          )}
          {room.capacity > 1 && (
            <div style={{ display: 'flex', gap: 2, marginTop: 6 }}>
              {Array.from({ length: room.capacity }).map((_, i) => {
                const filled = i < (guestCount || 0);
                const full = (guestCount || 0) >= room.capacity;
                return (
                  <div key={i} style={{
                    flex: 1, height: 4, borderRadius: 2,
                    background: filled ? (full ? theme.coral : theme.teal) : 'rgba(31,42,46,0.1)',
                  }} />
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <>
          <div style={{ fontSize: 12, color: theme.dark, opacity: 0.55, display: 'flex', flexWrap: 'wrap', gap: '4px 12px' }}>
            <span>{room.room_type}</span>
            <span>Étage {room.floor}</span>
            <span>👤 {room.capacity}</span>
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: theme.dark, marginTop: 2 }}>
            {room.price_per_night > 0
              ? `${room.price_per_night.toLocaleString('fr-MA')} MAD/nuit`
              : <span style={{ opacity: 0.35, fontWeight: 400 }}>Prix non défini</span>}
          </div>
        </>
      )}

      {/* Action buttons only for non-occupied rooms with edit permission */}
      {!isOccupied && (onEdit || onDelete) && (
        <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
          {onEdit && (
            <button
              onClick={e => { e.stopPropagation(); onEdit(); }}
              style={{
                flex: 1, background: 'rgba(31,42,46,0.06)', color: theme.dark, borderRadius: 6,
                padding: '6px 10px', border: 'none', fontWeight: 600, fontSize: 11,
                fontFamily: theme.font, cursor: 'pointer',
              }}
            >Modifier</button>
          )}
          {onDelete && (
            <button
              onClick={e => { e.stopPropagation(); onDelete(); }}
              style={{
                background: `${theme.coral}15`, color: theme.coral, borderRadius: 6,
                padding: '6px 10px', border: 'none', fontWeight: 600, fontSize: 11,
                fontFamily: theme.font, cursor: 'pointer',
              }}
            >Suppr.</button>
          )}
        </div>
      )}

      {isOccupied && (
        <div style={{ fontSize: 11, color: theme.teal, fontWeight: 600, marginTop: 4, opacity: 0.7 }}>
          Cliquer pour détails →
        </div>
      )}

      {room.status === 'available' && (
        <div style={{ fontSize: 11, color: theme.teal, fontWeight: 600, marginTop: 4, opacity: 0.7 }}>
          Cliquer pour check-in →
        </div>
      )}

      {room.status === 'cleaning' && (
        <div style={{ fontSize: 11, color: '#b45309', fontWeight: 600, marginTop: 4, opacity: 0.8 }}>
          🧹 Cliquer pour changer →
        </div>
      )}

      {room.status === 'maintenance' && (
        <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, marginTop: 4, opacity: 0.8 }}>
          🔧 Cliquer pour changer →
        </div>
      )}
    </div>
  );
}

export default function Rooms() {
  const { can } = useAuth();
  const { selectedPropertyId, navigateToCheckIn } = useApp();
  const [properties, setProperties] = useState([]);
  const [currentPropertyId, setCurrentPropertyId] = useState(selectedPropertyId);
  const [rooms, setRooms] = useState([]);
  const [reservationMap, setReservationMap] = useState({});
  const [viewMode, setViewMode] = useState('grid');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [detailRoom, setDetailRoom] = useState(null);
  const [statusChangeRoom, setStatusChangeRoom] = useState(null);
  const [toast, setToast] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const [guestCountsMap, setGuestCountsMap] = useState({});

  useEffect(() => {
    window.db.invoke('properties:getAll', {}).then(list => {
      setProperties(list);
      if (!currentPropertyId && list.length > 0) setCurrentPropertyId(list[0].id);
    });
  }, []);

  useEffect(() => { if (selectedPropertyId) setCurrentPropertyId(selectedPropertyId); }, [selectedPropertyId]);

  const load = useCallback(() => {
    if (!currentPropertyId) return;
    Promise.all([
      window.db.invoke('rooms:getAll', { property_id: currentPropertyId }),
      window.db.invoke('reservations:getActive', { property_id: currentPropertyId }),
      window.db.invoke('reservation_guests:getCounts', { property_id: currentPropertyId }),
    ]).then(([roomList, resList, countsList]) => {
      setRooms(roomList);
      const map = {};
      resList.forEach(r => { map[r.room_id] = r; });
      setReservationMap(map);
      const countsMap = {};
      (countsList || []).forEach(c => { countsMap[c.reservation_id] = c.count; });
      setGuestCountsMap(countsMap);
    });
  }, [currentPropertyId]);

  useEffect(() => { load(); }, [load]);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function handleSave(form) {
    if (editing) {
      await window.db.invoke('rooms:update', { ...form, id: editing.id });
    } else {
      await window.db.invoke('rooms:create', { ...form, property_id: currentPropertyId });
    }
    load();
    setShowModal(false);
    setEditing(null);
  }

  async function handleDelete(id) {
    const result = await window.db.invoke('rooms:delete', { id });
    if (result && !result.ok) {
      setDeleteError(result.error || "Impossible de supprimer cette chambre");
      return;
    }
    setDeleteError(null);
    setConfirmDelete(null);
    load();
  }

  async function handleCheckout(reservationId, roomId) {
    await window.db.invoke('reservations:checkout', { reservation_id: reservationId, room_id: roomId });
    setDetailRoom(null);
    showToast('✓ Check-out effectué — chambre en nettoyage');
    load();
  }

  async function handleStatusChange(roomId, status) {
    await window.db.invoke('rooms:updateStatus', { id: roomId, status });
    setDetailRoom(null);
    setStatusChangeRoom(null);
    load();
  }

  function handleCardClick(room) {
    if (room.status === 'available') {
      navigateToCheckIn(room.id);
    } else if (room.status === 'occupied') {
      setDetailRoom(room);
    } else {
      setStatusChangeRoom(room);
    }
  }

  const btnToggle = (active) => ({
    padding: '7px 14px', border: 'none', borderRadius: 7, cursor: 'pointer',
    fontSize: 12, fontWeight: active ? 700 : 400, fontFamily: theme.font,
    background: active ? theme.teal : 'rgba(31,42,46,0.07)',
    color: active ? theme.white : theme.dark,
  });

  return (
    <div style={{ fontFamily: theme.font }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: '#16a34a', color: theme.white, borderRadius: 10,
          padding: '12px 24px', fontSize: 13, fontWeight: 700, zIndex: 9999,
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
        }}>{toast}</div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: theme.dark, margin: 0 }}>Chambres</h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={btnToggle(viewMode === 'grid')} onClick={() => setViewMode('grid')}>⊞ Grille</button>
          <button style={btnToggle(viewMode === 'list')} onClick={() => setViewMode('list')}>☰ Liste</button>
        </div>
        {can('can_edit_rooms') && (
          <button
            onClick={() => { setEditing(null); setShowModal(true); }}
            disabled={!currentPropertyId}
            style={{
              background: theme.teal, color: theme.white, borderRadius: 8,
              padding: '10px 20px', border: 'none', fontWeight: 700, fontSize: 13,
              fontFamily: theme.font, cursor: currentPropertyId ? 'pointer' : 'not-allowed',
              opacity: currentPropertyId ? 1 : 0.5,
            }}
          >+ Nouvelle chambre</button>
        )}
      </div>

      {/* Property selector */}
      {properties.length > 1 && (
        <div style={{ marginBottom: 16 }}>
          <select
            value={currentPropertyId || ''}
            onChange={e => setCurrentPropertyId(e.target.value)}
            style={{
              border: `1.5px solid rgba(31,42,46,0.2)`, borderRadius: 8,
              padding: '9px 12px', fontSize: 13, fontFamily: theme.font, cursor: 'pointer',
              background: theme.white, color: theme.dark, outline: 'none',
            }}
          >
            {properties.map(p => <option key={p.id} value={p.id}>{p.display_name}</option>)}
          </select>
        </div>
      )}

      {!currentPropertyId && (
        <div style={{ textAlign: 'center', marginTop: 80, color: theme.dark, opacity: 0.4 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🏨</div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Aucune propriété sélectionnée</div>
        </div>
      )}

      {/* Grid view */}
      {currentPropertyId && viewMode === 'grid' && (
        rooms.length === 0 ? (
          <div style={{ textAlign: 'center', marginTop: 60, color: theme.dark, opacity: 0.4 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🛏</div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Aucune chambre</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>Ajoutez votre première chambre.</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
            {rooms.map(r => {
              const res = reservationMap[r.id];
              return (
                <RoomCard
                  key={r.id}
                  room={r}
                  reservation={res}
                  guestCount={res ? (guestCountsMap[res.id] || 1) : 0}
                  onEdit={can('can_edit_rooms') ? () => { setEditing(r); setShowModal(true); } : null}
                  onDelete={can('can_edit_rooms') ? () => setConfirmDelete(r) : null}
                  onCardClick={() => handleCardClick(r)}
                />
              );
            })}
          </div>
        )
      )}

      {/* List view */}
      {currentPropertyId && viewMode === 'list' && (
        <div style={{ background: theme.white, borderRadius: 12, border: '1px solid rgba(31,42,46,0.08)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, color: theme.dark }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(31,42,46,0.08)', background: theme.cream }}>
                {['N°', 'Nom', 'Type', 'Étage', 'Occupant', 'Prix/nuit', 'Statut', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, opacity: 0.55, textTransform: 'uppercase', letterSpacing: 0.4 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rooms.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, opacity: 0.35 }}>Aucune chambre</td></tr>
              ) : rooms.map((r, i) => {
                const sc = STATUS_CONFIG[r.status] || STATUS_CONFIG.available;
                const res = reservationMap[r.id];
                return (
                  <tr
                    key={r.id}
                    style={{ borderBottom: i < rooms.length - 1 ? '1px solid rgba(31,42,46,0.05)' : 'none', cursor: 'default' }}
                  >
                    <td style={{ padding: '10px 14px', fontWeight: 700 }}>#{r.room_number}</td>
                    <td style={{ padding: '10px 14px', opacity: r.room_name ? 1 : 0.35 }}>{r.room_name || '—'}</td>
                    <td style={{ padding: '10px 14px' }}>{r.room_type}</td>
                    <td style={{ padding: '10px 14px' }}>{r.floor}</td>
                    <td style={{ padding: '10px 14px' }}>
                      {res ? (
                        <span style={{ fontWeight: 600 }}>{res.last_name} {res.first_name}</span>
                      ) : <span style={{ opacity: 0.3 }}>—</span>}
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: 600 }}>
                      {r.price_per_night > 0 ? `${r.price_per_night.toLocaleString('fr-MA')} MAD` : <span style={{ opacity: 0.35, fontWeight: 400 }}>—</span>}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ background: sc.bg, color: sc.color, borderRadius: 5, padding: '3px 8px', fontSize: 11, fontWeight: 700 }}>
                        {sc.label}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {r.status === 'occupied' ? (
                          <button onClick={() => setDetailRoom(r)} style={{
                            background: `${theme.coral}15`, color: theme.coral, borderRadius: 5,
                            padding: '4px 10px', border: 'none', fontSize: 11, fontWeight: 600,
                            fontFamily: theme.font, cursor: 'pointer',
                          }}>Détails</button>
                        ) : (
                          <>
                            {r.status === 'available' && (
                              <button onClick={() => navigateToCheckIn(r.id)} style={{
                                background: `${theme.teal}15`, color: theme.teal, borderRadius: 5,
                                padding: '4px 10px', border: 'none', fontSize: 11, fontWeight: 600,
                                fontFamily: theme.font, cursor: 'pointer',
                              }}>Check-in</button>
                            )}
                            {can('can_edit_rooms') && <button onClick={() => { setEditing(r); setShowModal(true); }} style={{
                              background: 'rgba(31,42,46,0.06)', color: theme.dark, borderRadius: 5,
                              padding: '4px 10px', border: 'none', fontSize: 11, fontWeight: 600,
                              fontFamily: theme.font, cursor: 'pointer',
                            }}>Modifier</button>}
                            {can('can_edit_rooms') && <button onClick={() => setConfirmDelete(r)} style={{
                              background: `${theme.coral}15`, color: theme.coral, borderRadius: 5,
                              padding: '4px 10px', border: 'none', fontSize: 11, fontWeight: 600,
                              fontFamily: theme.font, cursor: 'pointer',
                            }}>Suppr.</button>}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Room edit modal */}
      {showModal && (
        <RoomModal
          initial={editing}
          propertyId={currentPropertyId}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditing(null); }}
        />
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <Modal title="Supprimer la chambre" onClose={() => { setConfirmDelete(null); setDeleteError(null); }} width={380}>
          {deleteError ? (
            <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '12px 14px', marginBottom: 16, fontSize: 13, color: '#dc2626', fontWeight: 600 }}>
              ❌ {deleteError}
            </div>
          ) : (
            <p style={{ fontSize: 14, color: theme.dark, marginBottom: 20 }}>
              Supprimer la chambre <strong>#{confirmDelete.room_number}</strong> ? Cette action est irréversible.
            </p>
          )}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={() => { setConfirmDelete(null); setDeleteError(null); }} style={{
              background: 'rgba(31,42,46,0.07)', color: theme.dark, borderRadius: 8,
              padding: '9px 18px', border: 'none', fontWeight: 600, fontSize: 13,
              fontFamily: theme.font, cursor: 'pointer',
            }}>Annuler</button>
            {!deleteError && (
              <button onClick={() => handleDelete(confirmDelete.id)} style={{
                background: theme.coral, color: theme.white, borderRadius: 8,
                padding: '9px 18px', border: 'none', fontWeight: 700, fontSize: 13,
                fontFamily: theme.font, cursor: 'pointer',
              }}>Supprimer</button>
            )}
          </div>
        </Modal>
      )}

      {/* Status change modal (cleaning / maintenance) */}
      {statusChangeRoom && (
        <Modal
          title={`Chambre ${statusChangeRoom.room_number} — ${statusChangeRoom.status === 'cleaning' ? '🧹 Nettoyage' : '🔧 Maintenance'}`}
          onClose={() => setStatusChangeRoom(null)}
          width={400}
        >
          <p style={{ fontSize: 14, color: theme.dark, opacity: 0.6, marginBottom: 20 }}>
            Changer le statut de cette chambre :
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              onClick={() => handleStatusChange(statusChangeRoom.id, 'available')}
              style={{
                padding: '12px 20px', borderRadius: 10, border: 'none',
                background: theme.teal, color: theme.white,
                fontWeight: 700, fontSize: 14, fontFamily: theme.font, cursor: 'pointer',
              }}
            >✅ Disponible</button>
            <button
              onClick={() => handleStatusChange(statusChangeRoom.id, 'cleaning')}
              style={{
                padding: '12px 20px', borderRadius: 10,
                border: `1.5px solid ${theme.saffron || '#f59e0b'}`,
                background: statusChangeRoom.status === 'cleaning' ? `${theme.saffron || '#f59e0b'}22` : '#fefce8',
                color: '#92400e',
                fontWeight: 700, fontSize: 14, fontFamily: theme.font, cursor: 'pointer',
              }}
            >🧹 Nettoyage</button>
            <button
              onClick={() => handleStatusChange(statusChangeRoom.id, 'maintenance')}
              style={{
                padding: '12px 20px', borderRadius: 10,
                border: '1.5px solid #d1d5db',
                background: statusChangeRoom.status === 'maintenance' ? '#f3f4f6' : '#f9fafb',
                color: '#374151',
                fontWeight: 700, fontSize: 14, fontFamily: theme.font, cursor: 'pointer',
              }}
            >🔧 Maintenance</button>
          </div>
        </Modal>
      )}

      {/* Occupied room detail */}
      {detailRoom && (
        <OccupiedDetailModal
          room={detailRoom}
          reservation={reservationMap[detailRoom.id]}
          selectedPropertyId={selectedPropertyId}
          onCheckout={handleCheckout}
          onStatusChange={handleStatusChange}
          onClose={() => { setDetailRoom(null); load(); }}
        />
      )}
    </div>
  );
}
