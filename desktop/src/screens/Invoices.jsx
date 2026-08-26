import React, { useState, useEffect, useCallback, useRef } from 'react';
import { theme } from '../theme.js';
import { useApp } from '../App.jsx';

const PAY_METHODS = [
  { value: 'cash',          label: 'Espèces' },
  { value: 'card',          label: 'Carte bancaire' },
  { value: 'bank_transfer', label: 'Virement' },
  { value: 'check',         label: 'Chèque' },
  { value: 'other',         label: 'Autre' },
];

function fmtDate(s) {
  if (!s) return '—';
  const p = s.split('-');
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : s;
}

function fmtMAD(n) {
  return (n || 0).toLocaleString('fr-MA', { minimumFractionDigits: 2 });
}

function today() {
  return new Date().toISOString().split('T')[0];
}

function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

function StatusBadge({ status }) {
  const map = {
    paid:    { label: 'Payée',      bg: '#d1fae5', color: '#065f46' },
    pending: { label: 'En attente', bg: '#fef3c7', color: '#92400e' },
    overdue: { label: 'En retard',  bg: '#fee2e2', color: '#991b1b' },
    draft:   { label: 'Brouillon',  bg: '#f3f4f6', color: '#374151' },
  };
  const s = map[status] || map.draft;
  return (
    <span style={{
      display: 'inline-block', padding: '2px 10px', borderRadius: 20,
      background: s.bg, color: s.color, fontSize: 11, fontWeight: 700,
    }}>{s.label}</span>
  );
}

function Btn({ onClick, children, style = {}, disabled = false }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: '6px 12px', borderRadius: 7, border: 'none', cursor: disabled ? 'default' : 'pointer',
      fontFamily: theme.font, fontSize: 12, fontWeight: 600, opacity: disabled ? 0.5 : 1,
      ...style,
    }}>{children}</button>
  );
}

function Input({ label, type = 'text', value, onChange, required, style = {}, min }) {
  return (
    <div style={{ marginBottom: 12 }}>
      {label && <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 4, color: theme.dark, opacity: 0.6, textTransform: 'uppercase' }}>{label}</label>}
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)}
        required={required} min={min}
        style={{
          width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid rgba(31,42,46,0.2)',
          fontFamily: theme.font, fontSize: 13, color: theme.dark, background: theme.white, outline: 'none',
          ...style,
        }}
      />
    </div>
  );
}

function Select({ label, value, onChange, options, style = {} }) {
  return (
    <div style={{ marginBottom: 12 }}>
      {label && <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 4, color: theme.dark, opacity: 0.6, textTransform: 'uppercase' }}>{label}</label>}
      <select value={value} onChange={e => onChange(e.target.value)} style={{
        width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid rgba(31,42,46,0.2)',
        fontFamily: theme.font, fontSize: 13, color: theme.dark, background: theme.white, outline: 'none',
        ...style,
      }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

// ── Invoice List ─────────────────────────────────────────────────────────────

function InvoiceList({ invoices, onView, onPrint, onPayment, printing }) {
  if (!invoices.length) {
    return <div style={{ textAlign: 'center', marginTop: 60, opacity: 0.35, fontSize: 15 }}>Aucune facture</div>;
  }
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ background: 'rgba(31,42,46,0.04)', borderBottom: '1px solid rgba(31,42,46,0.1)' }}>
          {['N°', 'Client', 'Date', 'Total TTC', 'Statut', 'Actions'].map(h => (
            <th key={h} style={{ padding: '10px 12px', fontSize: 11, fontWeight: 700, textAlign: 'left', color: theme.dark, opacity: 0.5, textTransform: 'uppercase' }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {invoices.map(inv => (
          <tr key={inv.id} style={{ borderBottom: '1px solid rgba(31,42,46,0.06)' }}>
            <td style={{ padding: '10px 12px', fontWeight: 700, fontSize: 13, fontFamily: 'monospace' }}>{inv.invoice_number}</td>
            <td style={{ padding: '10px 12px', fontSize: 13 }}>
              {inv.agency_name
                ? <><span style={{ marginRight: 5 }}>🏢</span>{inv.agency_name}{inv.guide_name ? <span style={{ fontSize: 11, opacity: 0.55, marginLeft: 6 }}>{inv.guide_name}</span> : null}</>
                : (inv.client_company_name || inv.client_name || '—')}
            </td>
            <td style={{ padding: '10px 12px', fontSize: 13, color: theme.dark, opacity: 0.6 }}>{fmtDate(inv.date)}</td>
            <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 700 }}>{fmtMAD(inv.total)} MAD</td>
            <td style={{ padding: '10px 12px' }}><StatusBadge status={inv.display_status} /></td>
            <td style={{ padding: '10px 12px' }}>
              <div style={{ display: 'flex', gap: 6 }}>
                <Btn onClick={() => onView(inv.id)} style={{ background: 'rgba(31,42,46,0.07)', color: theme.dark }}>Voir</Btn>
                <Btn onClick={() => onPrint(inv.id)} disabled={printing === inv.id} style={{ background: 'rgba(31,42,46,0.07)', color: theme.dark }}>
                  {printing === inv.id ? '...' : '🖨 Imprimer'}
                </Btn>
                {inv.display_status !== 'paid' && (
                  <Btn onClick={() => onPayment(inv)} style={{ background: theme.teal, color: theme.white }}>💳 Paiement</Btn>
                )}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── New Invoice Modal ────────────────────────────────────────────────────────

function NewInvoiceModal({ property, clients, onSave, onClose }) {
  // Doc type
  const [docType, setDocType] = useState('proforma'); // 'proforma' | 'facture'

  // Client type toggle
  const [clientType,    setClientType]    = useState('individual'); // 'individual' | 'agency'

  // Individual client state
  const [clientId,      setClientId]      = useState('');
  const [clientName,    setClientName]    = useState('');
  const [localClients,  setLocalClients]  = useState(clients || []);
  const [guests,        setGuests]        = useState([]);
  const [showQuickAdd,  setShowQuickAdd]  = useState(false);

  // Agency state
  const [agencyQuery,       setAgencyQuery]       = useState('');
  const [agencySelected,    setAgencySelected]    = useState(null);
  const [agencySuggestions, setAgencySuggestions] = useState([]);
  const [guideOptions,      setGuideOptions]      = useState([]);
  const [selectedGuideId,   setSelectedGuideId]   = useState('');
  const agencyTimer = useRef(null);

  // Shared state
  const [date,            setDate]           = useState(today());
  const [reservationDate, setReservationDate] = useState('');
  const [referenceGroupe, setReferenceGroupe] = useState('');
  const [dueDate,         setDueDate]        = useState(daysFromNow(30));
  const [vatRate,         setVatRate]        = useState(property?.vat_rate ?? 10);
  const [notes,           setNotes]          = useState('');
  const [saving,          setSaving]         = useState(false);
  const [items,           setItems]          = useState([{ designation: '', quantite: 1, nb_nuitee: '', prix_unitaire_ht: '' }]);

  useEffect(() => {
    window.db.invoke('guests:getAll', {}).then(data => setGuests(data || []));
  }, []);

  const addItem    = () => setItems(prev => [...prev, { designation: '', quantite: 1, nb_nuitee: '', prix_unitaire_ht: '' }]);
  const removeItem = (i) => setItems(prev => prev.filter((_, idx) => idx !== i));
  const updateItem = (i, field, val) => setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [field]: val } : it));

  const subtotal  = items.reduce((s, it) => s + (parseFloat(it.quantite) || 0) * (parseFloat(it.prix_unitaire_ht) || 0), 0);
  const vatAmount = subtotal * (parseFloat(vatRate) || 0) / 100;
  const total     = subtotal + vatAmount;

  const handleClientChange = (val) => {
    if (val === '__NEW__') { setShowQuickAdd(true); return; }
    setClientId(val);
  };

  const handleQuickAddCreated = (newClient) => {
    setLocalClients(prev => [...prev, newClient]);
    setClientId(`client:${newClient.id}`);
    setShowQuickAdd(false);
  };

  const handleSave = async () => {
    if (!items.some(it => it.designation.trim())) return;
    setSaving(true);

    let client_id   = null;
    let client_name = null;
    let agency_id   = null;
    let guide_id    = null;

    if (clientType === 'agency') {
      agency_id = agencySelected?.id || null;
      guide_id  = selectedGuideId || null;
    } else {
      if (clientId.startsWith('client:')) {
        client_id = clientId.slice(7);
      } else if (clientId.startsWith('guest:')) {
        const guestId = clientId.slice(6);
        const guest = guests.find(g => g.id === guestId);
        if (guest) client_name = `${guest.last_name} ${guest.first_name}`.trim();
      } else if (clientName.trim()) {
        client_name = clientName.trim();
      }
    }

    const payload = {
      property_id:     property.id,
      type:            docType,
      client_id,
      client_name,
      agency_id,
      guide_id,
      date,
      reservation_date: reservationDate || null,
      reference_groupe: referenceGroupe.trim() || null,
      due_date:         dueDate || null,
      vat_rate:         parseFloat(vatRate) || 10,
      notes:            notes.trim() || null,
      items: items
        .filter(it => it.designation.trim())
        .map(it => ({
          designation:      it.designation,
          quantite:         parseFloat(it.quantite) || 1,
          nb_nuitee:        it.nb_nuitee ? parseFloat(it.nb_nuitee) : null,
          prix_unitaire_ht: parseFloat(it.prix_unitaire_ht) || 0,
        })),
    };
    await onSave(payload);
    setSaving(false);
  };

  const noClients = localClients.length === 0 && guests.length === 0;
  const SEL_STYLE = { width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid rgba(31,42,46,0.2)', fontFamily: theme.font, fontSize: 13, color: theme.dark, background: theme.white, outline: 'none' };

  return (
    <>
    <Overlay onClose={onClose}>
      <div style={{ width: 720, maxHeight: '90vh', overflow: 'auto', padding: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 900, color: theme.dark, marginBottom: 16 }}>
          + Nouveau document
        </h2>

        {/* ── Doc type selector ── */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', opacity: 0.5, marginBottom: 8 }}>Type de document</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { key: 'proforma', label: 'Note Proforma' },
              { key: 'facture',  label: 'Facture Finale' },
            ].map(opt => (
              <button key={opt.key} onClick={() => setDocType(opt.key)} style={{
                flex: 1, padding: '9px 14px', borderRadius: 9, border: 'none', cursor: 'pointer',
                fontFamily: theme.font, fontSize: 13, fontWeight: docType === opt.key ? 700 : 500,
                background: docType === opt.key ? theme.teal : 'rgba(31,42,46,0.07)',
                color: docType === opt.key ? theme.white : theme.dark,
              }}>{opt.label}</button>
            ))}
          </div>
        </div>

        {/* ── Client type toggle ── */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', opacity: 0.5, marginBottom: 8 }}>Type de client</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { key: 'individual', icon: '👤', label: 'Client individuel' },
              { key: 'agency',     icon: '🏢', label: 'Groupe / Agence' },
            ].map(opt => (
              <button key={opt.key} onClick={() => setClientType(opt.key)} style={{
                flex: 1, padding: '9px 14px', borderRadius: 9, border: 'none', cursor: 'pointer',
                fontFamily: theme.font, fontSize: 13, fontWeight: clientType === opt.key ? 700 : 500,
                background: clientType === opt.key ? theme.dark : 'rgba(31,42,46,0.07)',
                color: clientType === opt.key ? theme.white : theme.dark,
              }}>{opt.icon} {opt.label}</button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>

          {clientType === 'agency' ? (
            /* ── Agency picker ── */
            <>
              <div style={{ marginBottom: 12, gridColumn: 'span 2', position: 'relative' }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 4, color: theme.dark, opacity: 0.6, textTransform: 'uppercase' }}>Agence / Groupe</label>
                <input
                  value={agencySelected ? agencySelected.name : agencyQuery}
                  onChange={async e => {
                    const q = e.target.value;
                    setAgencyQuery(q);
                    setAgencySelected(null);
                    setGuideOptions([]);
                    setSelectedGuideId('');
                    clearTimeout(agencyTimer.current);
                    if (q.trim().length >= 1) {
                      agencyTimer.current = setTimeout(async () => {
                        const res = await window.db.invoke('agencies:search', { q });
                        setAgencySuggestions(res || []);
                      }, 250);
                    } else {
                      setAgencySuggestions([]);
                    }
                  }}
                  onFocus={async () => {
                    if (!agencySelected && agencyQuery.trim().length === 0) {
                      const res = await window.db.invoke('agencies:getAll');
                      setAgencySuggestions((res || []).slice(0, 7));
                    }
                  }}
                  onBlur={() => setTimeout(() => setAgencySuggestions([]), 180)}
                  placeholder="Rechercher ou saisir une agence..."
                  style={SEL_STYLE}
                />
                {agencySuggestions.length > 0 && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 99,
                    background: theme.white, border: '1px solid rgba(31,42,46,0.15)',
                    borderRadius: 10, boxShadow: '0 8px 24px rgba(31,42,46,0.12)',
                    marginTop: 2, overflow: 'hidden',
                  }}>
                    {agencySuggestions.map(a => (
                      <div key={a.id} onMouseDown={async () => {
                        setAgencySelected(a);
                        setAgencyQuery(a.name);
                        setAgencySuggestions([]);
                        const gs = await window.db.invoke('guides:getAll', { agency_id: a.id });
                        setGuideOptions(gs || []);
                        setSelectedGuideId('');
                      }} style={{ padding: '10px 14px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid rgba(31,42,46,0.06)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(31,42,46,0.04)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <span style={{ fontWeight: 700 }}>{a.name}</span>
                        {a.country && <span style={{ fontSize: 11, opacity: 0.5, marginLeft: 8 }}>{a.country}</span>}
                      </div>
                    ))}
                    {agencyQuery.trim() && !agencySuggestions.some(a => a.name.toLowerCase() === agencyQuery.toLowerCase()) && (
                      <div onMouseDown={async () => {
                        const { id } = await window.db.invoke('agencies:create', { name: agencyQuery.trim() });
                        const newA = { id, name: agencyQuery.trim() };
                        setAgencySelected(newA);
                        setAgencySuggestions([]);
                        setGuideOptions([]);
                      }} style={{ padding: '10px 14px', cursor: 'pointer', fontSize: 13, color: theme.teal, fontWeight: 700, borderTop: '1px solid rgba(31,42,46,0.06)' }}
                      onMouseEnter={e => e.currentTarget.style.background = `${theme.teal}08`}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        + Créer « {agencyQuery.trim()} »
                      </div>
                    )}
                  </div>
                )}
              </div>

              {guideOptions.length > 0 && (
                <div style={{ marginBottom: 12, gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 4, color: theme.dark, opacity: 0.6, textTransform: 'uppercase' }}>Guide / Responsable (optionnel)</label>
                  <select value={selectedGuideId} onChange={e => setSelectedGuideId(e.target.value)} style={SEL_STYLE}>
                    <option value="">— Sans guide spécifié —</option>
                    {guideOptions.map(g => (
                      <option key={g.id} value={g.id}>{g.name}{g.role ? ` (${g.role})` : ''}{g.phone ? ' · ' + g.phone : ''}</option>
                    ))}
                  </select>
                </div>
              )}
            </>
          ) : (
            /* ── Individual client picker ── */
            <>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 4, color: theme.dark, opacity: 0.6, textTransform: 'uppercase' }}>Client</label>
                <select value={clientId} onChange={e => handleClientChange(e.target.value)} style={SEL_STYLE}>
                  <option value="">— Particulier non renseigné —</option>
                  <option value="__NEW__">+ Nouveau client</option>
                  {localClients.length > 0 && (
                    <optgroup label="── Clients ──">
                      {localClients.map(c => <option key={c.id} value={`client:${c.id}`}>{c.name}</option>)}
                    </optgroup>
                  )}
                  {guests.length > 0 && (
                    <optgroup label="── Clients de l'hôtel ──">
                      {guests.map(g => <option key={g.id} value={`guest:${g.id}`}>{g.last_name} {g.first_name}</option>)}
                    </optgroup>
                  )}
                </select>
                {noClients && (
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>
                    Aucun client — cliquez "+ Nouveau client" pour en créer un
                  </div>
                )}
              </div>
              {clientId === '' && <Input label="Nom client (si particulier)" value={clientName} onChange={setClientName} />}
            </>
          )}

          <Input label="Date d'émission" type="date" value={date} onChange={setDate} required />
          <Input label="Date de réservation" type="date" value={reservationDate} onChange={setReservationDate} />
          <Input label="Date d'échéance" type="date" value={dueDate} onChange={setDueDate} />
          <Input label="TVA (%)" type="number" value={vatRate} onChange={setVatRate} min="0" />
          <div style={{ gridColumn: 'span 2' }}>
            <Input label="Référence de groupe (optionnel)" value={referenceGroupe} onChange={setReferenceGroupe} />
          </div>
        </div>

        {/* Items table */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', opacity: 0.5, marginBottom: 8 }}>Lignes</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(31,42,46,0.05)' }}>
                <th style={{ padding: '6px 8px', fontSize: 10, fontWeight: 700, textAlign: 'center', width: 55 }}>QUANTITE</th>
                <th style={{ padding: '6px 8px', fontSize: 10, fontWeight: 700, textAlign: 'left' }}>DESIGNATION</th>
                <th style={{ padding: '6px 8px', fontSize: 10, fontWeight: 700, textAlign: 'center', width: 65 }}>NB NUITEE</th>
                <th style={{ padding: '6px 8px', fontSize: 10, fontWeight: 700, width: 115, textAlign: 'right' }}>PRIX UNITAIRE HT</th>
                <th style={{ padding: '6px 8px', fontSize: 10, fontWeight: 700, width: 100, textAlign: 'right' }}>PRIX TOTAL HT</th>
                <th style={{ width: 28 }} />
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => {
                const lineTotal = (parseFloat(it.quantite) || 0) * (parseFloat(it.prix_unitaire_ht) || 0);
                return (
                  <tr key={i}>
                    <td style={{ padding: '3px 3px' }}>
                      <input type="number" value={it.quantite} onChange={e => updateItem(i, 'quantite', e.target.value)} min="0.01" step="1"
                        style={{ width: '100%', padding: '5px 6px', border: '1px solid rgba(31,42,46,0.15)', borderRadius: 6, fontFamily: theme.font, fontSize: 12, textAlign: 'center' }} />
                    </td>
                    <td style={{ padding: '3px 3px' }}>
                      <input value={it.designation} onChange={e => updateItem(i, 'designation', e.target.value)}
                        placeholder="Prestation / produit"
                        style={{ width: '100%', padding: '5px 8px', border: '1px solid rgba(31,42,46,0.15)', borderRadius: 6, fontFamily: theme.font, fontSize: 12 }} />
                    </td>
                    <td style={{ padding: '3px 3px' }}>
                      <input type="number" value={it.nb_nuitee} onChange={e => updateItem(i, 'nb_nuitee', e.target.value)} min="0" step="1"
                        style={{ width: '100%', padding: '5px 6px', border: '1px solid rgba(31,42,46,0.15)', borderRadius: 6, fontFamily: theme.font, fontSize: 12, textAlign: 'center' }} />
                    </td>
                    <td style={{ padding: '3px 3px' }}>
                      <input type="number" value={it.prix_unitaire_ht} onChange={e => updateItem(i, 'prix_unitaire_ht', e.target.value)} min="0" step="0.01"
                        style={{ width: '100%', padding: '5px 8px', border: '1px solid rgba(31,42,46,0.15)', borderRadius: 6, fontFamily: theme.font, fontSize: 12, textAlign: 'right' }} />
                    </td>
                    <td style={{ padding: '3px 8px', textAlign: 'right', fontSize: 12, fontWeight: 600 }}>
                      {fmtMAD(lineTotal)}
                    </td>
                    <td style={{ padding: '3px 0' }}>
                      {items.length > 1 && (
                        <button onClick={() => removeItem(i)} style={{ background: 'none', border: 'none', color: theme.coral, cursor: 'pointer', fontSize: 16, padding: '0 4px' }}>×</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <button onClick={addItem} style={{
            marginTop: 8, padding: '6px 12px', background: 'rgba(31,42,46,0.06)',
            border: '1px dashed rgba(31,42,46,0.2)', borderRadius: 7, cursor: 'pointer',
            fontFamily: theme.font, fontSize: 12, color: theme.dark, opacity: 0.7,
          }}>+ Ajouter une ligne</button>
        </div>

        {/* Totals */}
        <div style={{ marginLeft: 'auto', width: 240, marginBottom: 16 }}>
          {[
            { label: 'TOTAL HT',        value: fmtMAD(subtotal) },
            { label: `TVA ${vatRate}%`, value: fmtMAD(vatAmount) },
            { label: 'TOTAL TTC',       value: fmtMAD(total), bold: true },
          ].map(r => (
            <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderTop: r.bold ? '2px solid rgba(31,42,46,0.2)' : 'none', marginTop: r.bold ? 4 : 0 }}>
              <span style={{ fontSize: 12, fontWeight: r.bold ? 700 : 400 }}>{r.label}</span>
              <span style={{ fontSize: r.bold ? 15 : 12, fontWeight: r.bold ? 900 : 600, color: r.bold ? theme.teal : theme.dark }}>{r.value} MAD</span>
            </div>
          ))}
        </div>

        <Input label="Notes (optionnel)" value={notes} onChange={setNotes} />

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
          <Btn onClick={onClose} style={{ background: 'rgba(31,42,46,0.07)', color: theme.dark }}>Annuler</Btn>
          <Btn onClick={handleSave} disabled={saving} style={{ background: theme.teal, color: theme.white }}>
            {saving ? 'Enregistrement...' : `Créer ${docType === 'proforma' ? 'Note Proforma' : 'Facture'}`}
          </Btn>
        </div>
      </div>
    </Overlay>
    {showQuickAdd && (
      <QuickAddClientModal
        propertyId={property.id}
        onCreated={handleQuickAddCreated}
        onClose={() => setShowQuickAdd(false)}
      />
    )}
    </>
  );
}

// ── View Invoice Modal ───────────────────────────────────────────────────────

function ViewInvoiceModal({ invoiceId, onClose, onPrint }) {
  const [inv, setInv] = useState(null);
  useEffect(() => {
    window.db.invoke('invoices:getById', { id: invoiceId }).then(setInv);
  }, [invoiceId]);

  if (!inv) return <Overlay onClose={onClose}><div style={{ padding: 40, opacity: 0.4 }}>Chargement...</div></Overlay>;

  const paid = inv.paid_amount || 0;
  const due  = Math.max(0, inv.total - paid);

  return (
    <Overlay onClose={onClose}>
      <div style={{ width: 560, maxHeight: '90vh', overflow: 'auto', padding: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 900, color: theme.dark }}>{inv.invoice_number}</div>
            <div style={{ fontSize: 12, color: theme.dark, opacity: 0.5, marginTop: 2 }}>
              Émise le {fmtDate(inv.date)}{inv.due_date ? ` · Échéance ${fmtDate(inv.due_date)}` : ''}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <StatusBadge status={inv.display_status || inv.status} />
            <Btn onClick={() => onPrint(inv.id)} style={{ background: 'rgba(31,42,46,0.07)', color: theme.dark }}>🖨 Imprimer</Btn>
          </div>
        </div>

        <div style={{ background: 'rgba(31,42,46,0.04)', borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>
          <div style={{ fontSize: 11, opacity: 0.5, textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>Facturé à</div>
          {inv.agency_name ? (
            <>
              <div style={{ fontWeight: 700 }}>🏢 {inv.agency_name}</div>
              {inv.guide_name && <div style={{ fontSize: 12, opacity: 0.65, marginTop: 2 }}>{inv.guide_role ? inv.guide_role.charAt(0).toUpperCase() + inv.guide_role.slice(1) + ' : ' : ''}{inv.guide_name}{inv.guide_phone ? ' · ' + inv.guide_phone : ''}</div>}
              {(inv.agency_city || inv.agency_country) && <div style={{ fontSize: 12, opacity: 0.55 }}>{[inv.agency_city, inv.agency_country].filter(Boolean).join(', ')}</div>}
            </>
          ) : (
            <>
              <div style={{ fontWeight: 700 }}>{inv.client_company_name || inv.client_name || 'Particulier'}</div>
              {inv.client_ice && <div style={{ fontSize: 12, opacity: 0.6 }}>ICE: {inv.client_ice}</div>}
            </>
          )}
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
          <thead>
            <tr style={{ background: 'rgba(31,42,46,0.06)', borderBottom: '1px solid rgba(31,42,46,0.1)' }}>
              <th style={{ padding: '8px 10px', fontSize: 11, textAlign: 'left' }}>Description</th>
              <th style={{ padding: '8px 10px', fontSize: 11, textAlign: 'center', width: 50 }}>Qté</th>
              <th style={{ padding: '8px 10px', fontSize: 11, textAlign: 'right', width: 100 }}>P.U. HT</th>
              <th style={{ padding: '8px 10px', fontSize: 11, textAlign: 'right', width: 100 }}>Total HT</th>
            </tr>
          </thead>
          <tbody>
            {(inv.items || []).map((it, i) => (
              <tr key={i} style={{ borderBottom: '1px solid rgba(31,42,46,0.05)' }}>
                <td style={{ padding: '7px 10px', fontSize: 13 }}>{it.description}</td>
                <td style={{ padding: '7px 10px', fontSize: 13, textAlign: 'center' }}>{it.qty}</td>
                <td style={{ padding: '7px 10px', fontSize: 13, textAlign: 'right' }}>{fmtMAD(it.unit_price)}</td>
                <td style={{ padding: '7px 10px', fontSize: 13, textAlign: 'right', fontWeight: 600 }}>{fmtMAD(it.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ marginLeft: 'auto', width: 200, marginBottom: 16 }}>
          {[
            { label: 'Sous-total HT', val: fmtMAD(inv.subtotal) },
            { label: `TVA (${inv.vat_rate}%)`, val: fmtMAD(inv.vat_amount) },
            { label: 'Total TTC', val: fmtMAD(inv.total), bold: true, color: theme.teal },
            ...(paid > 0 ? [{ label: 'Payé', val: `- ${fmtMAD(paid)}`, color: theme.teal }] : []),
            ...(due > 0  ? [{ label: 'Reste à payer', val: fmtMAD(due), bold: true, color: theme.coral }] : []),
          ].map(r => (
            <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
              <span style={{ fontSize: 12, fontWeight: r.bold ? 700 : 400 }}>{r.label}</span>
              <span style={{ fontSize: r.bold ? 14 : 12, fontWeight: r.bold ? 900 : 600, color: r.color || theme.dark }}>{r.val} MAD</span>
            </div>
          ))}
        </div>

        {(inv.payments || []).length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', opacity: 0.5, marginBottom: 8 }}>Paiements reçus</div>
            {inv.payments.map((p, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid rgba(31,42,46,0.06)' }}>
                <span style={{ fontSize: 12 }}>{fmtDate(p.payment_date)} · {PAY_METHODS.find(m => m.value === p.payment_method)?.label || p.payment_method}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: theme.teal }}>{fmtMAD(p.amount)} MAD</span>
              </div>
            ))}
          </div>
        )}

        {inv.notes && <div style={{ fontSize: 12, color: theme.dark, opacity: 0.6, fontStyle: 'italic' }}>{inv.notes}</div>}

        <div style={{ textAlign: 'right', marginTop: 16 }}>
          <Btn onClick={onClose} style={{ background: 'rgba(31,42,46,0.07)', color: theme.dark }}>Fermer</Btn>
        </div>
      </div>
    </Overlay>
  );
}

// ── Payment Modal ────────────────────────────────────────────────────────────

function PaymentModal({ invoice, onSave, onClose }) {
  const remaining = Math.max(0, invoice.total - (invoice.paid_amount || 0));
  const [amount,  setAmount]  = useState(String(remaining));
  const [method,  setMethod]  = useState('cash');
  const [date,    setDate]    = useState(today());
  const [notes,   setNotes]   = useState('');
  const [saving,  setSaving]  = useState(false);

  const handleSave = async () => {
    if (!parseFloat(amount)) return;
    setSaving(true);
    await onSave({ invoice_id: invoice.id, amount: parseFloat(amount), payment_method: method, payment_date: date, notes: notes.trim() || null });
    setSaving(false);
  };

  return (
    <Overlay onClose={onClose}>
      <div style={{ width: 360, padding: 28 }}>
        <h2 style={{ fontSize: 16, fontWeight: 900, color: theme.dark, marginBottom: 4 }}>Enregistrer un paiement</h2>
        <div style={{ fontSize: 12, color: theme.dark, opacity: 0.5, marginBottom: 20 }}>
          {invoice.invoice_number} · Reste à payer: <strong>{fmtMAD(remaining)} MAD</strong>
        </div>
        <Input label="Montant (MAD)" type="number" value={amount} onChange={setAmount} min="0.01" />
        <Select label="Mode de paiement" value={method} onChange={setMethod} options={PAY_METHODS} />
        <Input label="Date" type="date" value={date} onChange={setDate} />
        <Input label="Notes (optionnel)" value={notes} onChange={setNotes} />
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
          <Btn onClick={onClose} style={{ background: 'rgba(31,42,46,0.07)', color: theme.dark }}>Annuler</Btn>
          <Btn onClick={handleSave} disabled={saving} style={{ background: theme.teal, color: theme.white }}>
            {saving ? 'Enregistrement...' : 'Valider'}
          </Btn>
        </div>
      </div>
    </Overlay>
  );
}

// ── Quick-Add Client Modal (from invoice form) ───────────────────────────────

const CLIENT_TYPES = [
  { value: 'particulier', label: 'Particulier' },
  { value: 'societe',     label: 'Société' },
  { value: 'agence',      label: 'Agence' },
];

function QuickAddClientModal({ propertyId, onCreated, onClose }) {
  const [type,   setType]   = useState('particulier');
  const [name,   setName]   = useState('');
  const [phone,  setPhone]  = useState('');
  const [email,  setEmail]  = useState('');
  const [ice,    setIce]    = useState('');
  const [city,   setCity]   = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const result = await window.db.invoke('clients:create', {
      property_id: propertyId,
      name: name.trim(),
      type,
      phone: phone.trim() || null,
      email: email.trim() || null,
      ice:   ice.trim()   || null,
      city:  city.trim()  || null,
    });
    onCreated({ id: result.id, name: name.trim(), type });
    setSaving(false);
  };

  return (
    <Overlay onClose={onClose}>
      <div style={{ width: 400, padding: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 900, color: theme.dark, marginBottom: 16 }}>Nouveau client</h2>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 6, color: theme.dark, opacity: 0.6, textTransform: 'uppercase' }}>Type</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {CLIENT_TYPES.map(opt => (
              <button key={opt.value} onClick={() => setType(opt.value)} style={{
                padding: '6px 14px', borderRadius: 7, fontFamily: theme.font, fontSize: 13, cursor: 'pointer',
                border: `1.5px solid ${type === opt.value ? theme.teal : 'rgba(31,42,46,0.2)'}`,
                background: type === opt.value ? `${theme.teal}18` : 'transparent',
                color: type === opt.value ? theme.teal : theme.dark,
                fontWeight: type === opt.value ? 700 : 500,
              }}>{opt.label}</button>
            ))}
          </div>
        </div>

        <Input label="Nom *" value={name} onChange={setName} required />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
          <Input label="Téléphone" value={phone} onChange={setPhone} />
          <Input label="Email" value={email} onChange={setEmail} />
          {(type === 'societe' || type === 'agence') && (
            <Input label="ICE" value={ice} onChange={setIce} />
          )}
          <Input label="Ville" value={city} onChange={setCity} />
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
          <Btn onClick={onClose} style={{ background: 'rgba(31,42,46,0.07)', color: theme.dark }}>Annuler</Btn>
          <Btn onClick={handleSave} disabled={saving || !name.trim()} style={{ background: theme.teal, color: theme.white }}>
            {saving ? '...' : 'Créer et sélectionner'}
          </Btn>
        </div>
      </div>
    </Overlay>
  );
}

// ── New Client Modal ─────────────────────────────────────────────────────────

function NewClientModal({ propertyId, onSave, onClose }) {
  const [name,    setName]    = useState('');
  const [ice,     setIce]     = useState('');
  const [address, setAddress] = useState('');
  const [city,    setCity]    = useState('');
  const [phone,   setPhone]   = useState('');
  const [email,   setEmail]   = useState('');
  const [saving,  setSaving]  = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await onSave({ property_id: propertyId, name: name.trim(), ice: ice.trim() || null, address: address.trim() || null, city: city.trim() || null, phone: phone.trim() || null, email: email.trim() || null });
    setSaving(false);
  };

  return (
    <Overlay onClose={onClose}>
      <div style={{ width: 420, padding: 28 }}>
        <h2 style={{ fontSize: 16, fontWeight: 900, color: theme.dark, marginBottom: 20 }}>+ Nouveau client</h2>
        <Input label="Raison sociale *" value={name} onChange={setName} required />
        <Input label="ICE" value={ice} onChange={setIce} />
        <Input label="Adresse" value={address} onChange={setAddress} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
          <Input label="Ville" value={city} onChange={setCity} />
          <Input label="Téléphone" value={phone} onChange={setPhone} />
        </div>
        <Input label="Email" type="email" value={email} onChange={setEmail} />
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
          <Btn onClick={onClose} style={{ background: 'rgba(31,42,46,0.07)', color: theme.dark }}>Annuler</Btn>
          <Btn onClick={handleSave} disabled={saving || !name.trim()} style={{ background: theme.teal, color: theme.white }}>
            {saving ? 'Enregistrement...' : 'Créer'}
          </Btn>
        </div>
      </div>
    </Overlay>
  );
}

// ── Overlay wrapper ──────────────────────────────────────────────────────────

function Overlay({ onClose, children }) {
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: theme.white, borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        maxHeight: '92vh', overflowY: 'auto',
      }}>
        {children}
      </div>
    </div>
  );
}

// ── Main Screen ──────────────────────────────────────────────────────────────

const TABS = [
  { key: 'proforma', label: 'Proforma' },
  { key: 'facture',  label: 'Factures' },
  { key: 'clients',  label: 'Clients' },
];

export default function Invoices() {
  const { selectedPropertyId } = useApp();
  const [tab,      setTab]     = useState('proforma');
  const [invoices, setInvoices] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [clients,  setClients]  = useState([]);
  const [property, setProperty] = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState(null);
  const [printing, setPrinting] = useState(null);
  const [toast,    setToast]    = useState(null);

  function showToast(msg, err) {
    setToast({ msg, err });
    setTimeout(() => setToast(null), 3000);
  }

  const load = useCallback(async () => {
    if (!selectedPropertyId) return;
    setLoading(true);
    const [inv, rec, cli, props] = await Promise.all([
      window.db.invoke('invoices:getAll', { property_id: selectedPropertyId, type: 'proforma' }),
      window.db.invoke('invoices:getAll', { property_id: selectedPropertyId, type: 'facture' }),
      window.db.invoke('clients:getAll', { property_id: selectedPropertyId }),
      window.db.invoke('properties:getAll', {}),
    ]);
    setInvoices(inv || []);
    setReceipts(rec || []);
    setClients(cli || []);
    setProperty((props || []).find(p => p.id === selectedPropertyId) || null);
    setLoading(false);
  }, [selectedPropertyId]);

  useEffect(() => { load(); }, [load]);

  const handleCreateInvoice = async (data) => {
    const res = await window.db.invoke('invoices:create', data);
    if (res?.id) { showToast(`✓ ${res.invoice_number} créée`); setModal(null); await load(); }
    else showToast('Erreur lors de la création', true);
  };

  const handleAddPayment = async (data) => {
    await window.db.invoke('invoices:addPayment', data);
    showToast('✓ Paiement enregistré');
    setModal(null);
    await load();
  };

  const handleCreateClient = async (data) => {
    await window.db.invoke('clients:create', data);
    showToast('✓ Client créé');
    setModal(null);
    await load();
  };

  const handlePrint = async (id) => {
    setPrinting(id);
    const res = await window.db.invoke('invoices:print', { id });
    setPrinting(null);
    if (!res?.ok) showToast(res?.error || 'Erreur impression', true);
  };

  if (!selectedPropertyId) {
    return <div style={{ textAlign: 'center', marginTop: 80, opacity: 0.4 }}>Sélectionnez une propriété.</div>;
  }

  const currentInvoices = tab === 'proforma' ? invoices : receipts;

  return (
    <div style={{ fontFamily: theme.font }}>
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: toast.err ? theme.coral : '#16a34a', color: theme.white,
          borderRadius: 10, padding: '12px 24px', fontSize: 13, fontWeight: 700,
          zIndex: 9999, boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
        }}>{toast.msg}</div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: theme.dark, margin: 0 }}>Factures</h1>
          <p style={{ fontSize: 13, color: theme.dark, opacity: 0.5, margin: 0, marginTop: 4 }}>Facturation & reçus</p>
        </div>
        {tab !== 'clients' && (
          <Btn onClick={() => setModal({ type: 'new-invoice' })}
            style={{ background: theme.teal, color: theme.white, padding: '9px 18px', fontSize: 13 }}>
            + Nouveau document
          </Btn>
        )}
        {tab === 'clients' && (
          <Btn onClick={() => setModal({ type: 'new-client' })}
            style={{ background: theme.teal, color: theme.white, padding: '9px 18px', fontSize: 13 }}>
            + Nouveau client
          </Btn>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'rgba(31,42,46,0.06)', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '7px 20px', borderRadius: 7, border: 'none', cursor: 'pointer',
            fontWeight: 600, fontSize: 13, fontFamily: theme.font,
            background: tab === t.key ? theme.white : 'transparent',
            color: tab === t.key ? theme.dark : 'rgba(31,42,46,0.45)',
            boxShadow: tab === t.key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
          }}>{t.label}</button>
        ))}
      </div>

      {/* Content */}
      <div style={{ background: theme.white, borderRadius: 12, border: '1px solid rgba(31,42,46,0.08)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, opacity: 0.35 }}>Chargement...</div>
        ) : tab === 'clients' ? (
          <ClientsTab clients={clients} />
        ) : (
          <InvoiceList
            invoices={currentInvoices}
            onView={(id) => setModal({ type: 'view', id })}
            onPrint={handlePrint}
            onPayment={(inv) => setModal({ type: 'payment', invoice: inv })}
            printing={printing}
          />
        )}
      </div>

      {/* Modals */}
      {modal?.type === 'new-invoice' && (
        <NewInvoiceModal
          property={property}
          clients={clients}
          onSave={handleCreateInvoice}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'view' && (
        <ViewInvoiceModal invoiceId={modal.id} onClose={() => setModal(null)} onPrint={handlePrint} />
      )}
      {modal?.type === 'payment' && (
        <PaymentModal invoice={modal.invoice} onSave={handleAddPayment} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'new-client' && (
        <NewClientModal propertyId={selectedPropertyId} onSave={handleCreateClient} onClose={() => setModal(null)} />
      )}
    </div>
  );
}

function ClientsTab({ clients }) {
  if (!clients.length) {
    return <div style={{ textAlign: 'center', padding: 60, opacity: 0.35 }}>Aucun client enregistré</div>;
  }
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ background: 'rgba(31,42,46,0.04)', borderBottom: '1px solid rgba(31,42,46,0.1)' }}>
          {['Raison sociale', 'ICE', 'Ville', 'Téléphone', 'Email'].map(h => (
            <th key={h} style={{ padding: '10px 12px', fontSize: 11, fontWeight: 700, textAlign: 'left', color: theme.dark, opacity: 0.5, textTransform: 'uppercase' }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {clients.map(c => (
          <tr key={c.id} style={{ borderBottom: '1px solid rgba(31,42,46,0.06)' }}>
            <td style={{ padding: '10px 12px', fontWeight: 700, fontSize: 13 }}>{c.name}</td>
            <td style={{ padding: '10px 12px', fontSize: 12, fontFamily: 'monospace' }}>{c.ice || '—'}</td>
            <td style={{ padding: '10px 12px', fontSize: 13 }}>{c.city || '—'}</td>
            <td style={{ padding: '10px 12px', fontSize: 13 }}>{c.phone || '—'}</td>
            <td style={{ padding: '10px 12px', fontSize: 12, color: theme.teal }}>{c.email || '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
