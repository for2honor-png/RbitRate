import React, { useState, useEffect, useRef, useCallback } from 'react';
import { theme } from '../theme.js';
import Modal from '../components/Modal.jsx';
import { useAuth } from '../App.jsx';

const FIELD = {
  border: `1.5px solid rgba(31,42,46,0.2)`, borderRadius: 8,
  padding: '9px 12px', fontSize: 13, fontFamily: theme.font,
  background: theme.white, color: theme.dark, outline: 'none', width: '100%',
  boxSizing: 'border-box',
};

const TAG_CONFIG = {
  regular:   { label: 'Régulier',  color: '#6b7280',     bg: '#6b728015' },
  vip:       { label: 'VIP ★',     color: theme.saffron,  bg: `${theme.saffron}18` },
  whitelist: { label: 'Whitelist', color: theme.teal,     bg: `${theme.teal}18` },
  blacklist: { label: 'Blacklist', color: theme.coral,    bg: `${theme.coral}18` },
  agency:    { label: 'Agence',    color: '#7c3aed',      bg: '#7c3aed15' },
  group:     { label: 'Groupe',    color: '#0369a1',      bg: '#0369a115' },
};

const TAG_FILTERS = [
  { key: 'all',      label: 'Tous' },
  { key: 'vip',      label: 'VIP ★' },
  { key: 'whitelist',label: 'Whitelist' },
  { key: 'blacklist',label: 'Blacklist 🚫' },
  { key: 'regular',  label: 'Régulier' },
  { key: 'agency',   label: 'Agence' },
  { key: '__agencies__', label: 'Agences 🏢' },
];

const EMPTY_FORM = {
  last_name: '', first_name: '',
  date_of_birth: '', place_of_birth: '',
  nationality: '', profession: '',
  permanent_address: '',
  document_type: 'Passeport', document_number: '',
  document_issued_at: '', document_issued_date: '',
  phone: '', email: '',
  tag: 'regular', notes: '',
};

const ROLE_LABELS = { guide: 'Guide', leader: 'Chef de groupe', representative: 'Représentant', other: 'Autre' };

function ArabicSub({ children }) {
  return (
    <div style={{ fontSize: 10, color: 'rgba(31,42,46,0.35)', direction: 'rtl', textAlign: 'right', marginTop: 1 }}>
      {children}
    </div>
  );
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

// ── GuestModal ─────────────────────────────────────────────────────────────────
function GuestModal({ initial, onSave, onClose }) {
  const [form, setForm] = useState(initial ? {
    last_name: initial.last_name || '',
    first_name: initial.first_name || '',
    date_of_birth: initial.date_of_birth || '',
    place_of_birth: initial.place_of_birth || '',
    nationality: initial.nationality || '',
    profession: initial.profession || '',
    permanent_address: initial.permanent_address || '',
    document_type: initial.document_type || 'Passeport',
    document_number: initial.document_number || '',
    document_issued_at: initial.document_issued_at || '',
    document_issued_date: initial.document_issued_date || '',
    phone: initial.phone || '',
    email: initial.email || '',
    tag: initial.tag || 'regular',
    notes: initial.notes || '',
  } : EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSave() {
    const errs = {};
    if (!form.last_name.trim()) errs.last_name = 'Requis';
    if (!form.first_name.trim()) errs.first_name = 'Requis';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    await onSave(form);
    setSaving(false);
  }

  const inp = (k) => ({
    ...FIELD,
    value: form[k],
    onChange: e => set(k, e.target.value),
    ...(errors[k] ? { border: `1.5px solid ${theme.coral}` } : {}),
  });

  return (
    <Modal title={initial ? 'Modifier le client' : 'Nouveau client'} onClose={onClose} width={620}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
        <div style={{ marginBottom: 14 }}>
          <FieldLabel fr="Nom" ar="الاسم العائلي" required />
          <input {...inp('last_name')} placeholder="ALAMI" />
          {errors.last_name && <div style={{ color: theme.coral, fontSize: 11, marginTop: 3 }}>{errors.last_name}</div>}
        </div>
        <div style={{ marginBottom: 14 }}>
          <FieldLabel fr="Prénoms" ar="الاسم الشخصي" required />
          <input {...inp('first_name')} placeholder="Mohammed" />
          {errors.first_name && <div style={{ color: theme.coral, fontSize: 11, marginTop: 3 }}>{errors.first_name}</div>}
        </div>
        <div style={{ marginBottom: 14 }}>
          <FieldLabel fr="Date de naissance" ar="تاريخ الإزدياد" />
          <input type="date" {...inp('date_of_birth')} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <FieldLabel fr="Lieu de naissance" ar="مكان الإزدياد" />
          <input {...inp('place_of_birth')} placeholder="Casablanca" />
        </div>
        <div style={{ marginBottom: 14 }}>
          <FieldLabel fr="Nationalité" ar="الجنسية" />
          <input {...inp('nationality')} placeholder="Marocaine" />
        </div>
        <div style={{ marginBottom: 14 }}>
          <FieldLabel fr="Qualité ou Profession" ar="المهنة" />
          <input {...inp('profession')} placeholder="Ingénieur" />
        </div>
        <div style={{ marginBottom: 14, gridColumn: 'span 2' }}>
          <FieldLabel fr="Domicile Habituel" ar="السكن الحالي" />
          <input {...inp('permanent_address')} placeholder="123 Rue Mohammed V, Casablanca" />
        </div>
        <div style={{ marginBottom: 14 }}>
          <FieldLabel fr="Type de document" ar="نوع الوثيقة" />
          <select {...inp('document_type')} style={{ ...FIELD, cursor: 'pointer' }}>
            {['Passeport', 'CIN', 'Titre de séjour', 'Carte consulaire', 'Autre'].map(t =>
              <option key={t} value={t}>{t}</option>
            )}
          </select>
        </div>
        <div style={{ marginBottom: 14 }}>
          <FieldLabel fr="N° document" ar="رقم الوثيقة" />
          <input {...inp('document_number')} placeholder="AB123456" />
        </div>
        <div style={{ marginBottom: 14 }}>
          <FieldLabel fr="Délivré à" ar="مسلمة في" />
          <input {...inp('document_issued_at')} placeholder="Casablanca" />
        </div>
        <div style={{ marginBottom: 14 }}>
          <FieldLabel fr="Date d'émission" ar="تاريخ الإصدار" />
          <input type="date" {...inp('document_issued_date')} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <FieldLabel fr="Téléphone" ar="الهاتف" />
          <input {...inp('phone')} placeholder="+212 6XX XXX XXX" type="tel" />
        </div>
        <div style={{ marginBottom: 14 }}>
          <FieldLabel fr="Email" ar="البريد الإلكتروني" />
          <input {...inp('email')} placeholder="exemple@mail.com" type="email" />
        </div>
        <div style={{ marginBottom: 14, gridColumn: 'span 2' }}>
          <FieldLabel fr="Catégorie" />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {Object.entries(TAG_CONFIG).map(([k, v]) => (
              <button key={k} onClick={() => set('tag', k)} style={{
                padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: 600, fontFamily: theme.font,
                background: form.tag === k ? v.color : v.bg,
                color: form.tag === k ? theme.white : v.color,
              }}>{v.label}</button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: 14, gridColumn: 'span 2' }}>
          <FieldLabel fr="Notes" />
          <textarea {...inp('notes')} rows={2}
            placeholder="Observations, préférences..."
            style={{ ...FIELD, resize: 'vertical', minHeight: 56 }} />
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
        }}>{saving ? 'Enregistrement...' : initial ? 'Modifier' : 'Créer'}</button>
      </div>
    </Modal>
  );
}

// ── GuestRow ───────────────────────────────────────────────────────────────────
function GuestRow({ guest, onEdit, onTagChange }) {
  const tc = TAG_CONFIG[guest.tag] || TAG_CONFIG.regular;
  const isBlacklisted = guest.tag === 'blacklist';
  const initials = `${guest.last_name[0] || ''}${guest.first_name[0] || ''}`.toUpperCase();
  const avatarBg = isBlacklisted ? theme.coral : guest.tag === 'vip' ? theme.saffron : theme.teal;

  return (
    <div style={{
      background: theme.white,
      border: isBlacklisted ? `2px solid ${theme.coral}` : `1px solid rgba(31,42,46,0.08)`,
      borderRadius: 12, overflow: 'hidden',
    }}>
      {isBlacklisted && (
        <div style={{
          background: theme.coral, color: theme.white,
          padding: '6px 16px', fontSize: 12, fontWeight: 700, textAlign: 'center', letterSpacing: 0.5,
        }}>⚠ CLIENT SUR LISTE NOIRE — Refuser l'enregistrement</div>
      )}
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          width: 42, height: 42, borderRadius: '50%', background: avatarBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: theme.white, fontSize: 14, fontWeight: 700, flexShrink: 0,
        }}>{initials}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: theme.dark }}>{guest.last_name} {guest.first_name}</span>
            <span style={{
              fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4,
              background: tc.bg, color: tc.color, borderRadius: 4, padding: '2px 6px',
            }}>{tc.label}</span>
          </div>
          <div style={{ fontSize: 12, color: theme.dark, opacity: 0.55, marginTop: 3, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {guest.nationality && <span>{guest.nationality}</span>}
            {guest.document_number && <span>📄 {guest.document_number}</span>}
            <span>🏨 {guest.total_stays} séjour{guest.total_stays !== 1 ? 's' : ''}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <select value={guest.tag} onChange={e => onTagChange(guest.id, e.target.value)} style={{
            border: `1px solid rgba(31,42,46,0.2)`, borderRadius: 6,
            padding: '5px 8px', fontSize: 11, fontFamily: theme.font,
            background: theme.white, color: theme.dark, cursor: 'pointer', outline: 'none',
          }}>
            {Object.entries(TAG_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          {onEdit && (
            <button onClick={() => onEdit(guest)} style={{
              background: 'rgba(31,42,46,0.07)', color: theme.dark, borderRadius: 6,
              padding: '5px 12px', border: 'none', fontSize: 12, fontWeight: 600,
              fontFamily: theme.font, cursor: 'pointer',
            }}>Modifier</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── AgencyModal ────────────────────────────────────────────────────────────────
function AgencyModal({ initial, onSave, onClose }) {
  const [form, setForm] = useState({
    name: initial?.name || '', email: initial?.email || '',
    phone: initial?.phone || '', city: initial?.city || '',
    country: initial?.country || '', notes: initial?.notes || '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <Modal title={initial ? "Modifier l'agence" : 'Nouvelle agence / groupe'} onClose={onClose} width={540}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
        <div style={{ marginBottom: 14, gridColumn: 'span 2' }}>
          <FieldLabel fr="Nom de l'agence / groupe" required />
          <input value={form.name} onChange={e => set('name', e.target.value)}
            placeholder="Nomadic Tours" style={FIELD} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <FieldLabel fr="Email" />
          <input value={form.email} onChange={e => set('email', e.target.value)}
            placeholder="contact@agency.com" type="email" style={FIELD} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <FieldLabel fr="Téléphone" />
          <input value={form.phone} onChange={e => set('phone', e.target.value)}
            placeholder="+212 5XX XXX XXX" style={FIELD} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <FieldLabel fr="Ville" />
          <input value={form.city} onChange={e => set('city', e.target.value)}
            placeholder="Marrakech" style={FIELD} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <FieldLabel fr="Pays" />
          <input value={form.country} onChange={e => set('country', e.target.value)}
            placeholder="Maroc" style={FIELD} />
        </div>
        <div style={{ marginBottom: 14, gridColumn: 'span 2' }}>
          <FieldLabel fr="Notes" />
          <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
            rows={2} placeholder="Observations..." style={{ ...FIELD, resize: 'vertical', minHeight: 56 }} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 16, borderTop: `1px solid rgba(31,42,46,0.08)` }}>
        <button onClick={onClose} style={{
          background: 'rgba(31,42,46,0.07)', color: theme.dark, borderRadius: 8,
          padding: '9px 18px', border: 'none', fontWeight: 600, fontSize: 13,
          fontFamily: theme.font, cursor: 'pointer',
        }}>Annuler</button>
        <button disabled={!form.name.trim() || saving} onClick={async () => {
          setSaving(true); await onSave(form); setSaving(false);
        }} style={{
          background: theme.teal, color: theme.white, borderRadius: 8,
          padding: '9px 18px', border: 'none', fontWeight: 700, fontSize: 13,
          fontFamily: theme.font, cursor: 'pointer', opacity: (!form.name.trim() || saving) ? 0.5 : 1,
        }}>{saving ? 'Enregistrement...' : initial ? 'Modifier' : 'Créer'}</button>
      </div>
    </Modal>
  );
}

// ── GuideModal ─────────────────────────────────────────────────────────────────
function GuideModal({ agencyId, initial, onSave, onClose }) {
  const [form, setForm] = useState({
    name: initial?.name || '', phone: initial?.phone || '',
    role: initial?.role || 'guide', notes: initial?.notes || '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <Modal title={initial ? 'Modifier le guide' : 'Ajouter un guide'} onClose={onClose} width={440}>
      <div style={{ marginBottom: 14 }}>
        <FieldLabel fr="Nom complet" required />
        <input value={form.name} onChange={e => set('name', e.target.value)}
          placeholder="Hassan Idrissi" style={FIELD} />
      </div>
      <div style={{ marginBottom: 14 }}>
        <FieldLabel fr="Rôle" />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {Object.entries(ROLE_LABELS).map(([k, v]) => (
            <button key={k} onClick={() => set('role', k)} style={{
              padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: form.role === k ? 700 : 500, fontFamily: theme.font,
              background: form.role === k ? theme.teal : 'rgba(31,42,46,0.07)',
              color: form.role === k ? theme.white : theme.dark,
            }}>{v}</button>
          ))}
        </div>
      </div>
      <div style={{ marginBottom: 14 }}>
        <FieldLabel fr="Téléphone" />
        <input value={form.phone} onChange={e => set('phone', e.target.value)}
          placeholder="+212 6XX XXX XXX" style={FIELD} />
      </div>
      <div style={{ marginBottom: 14 }}>
        <FieldLabel fr="Notes" />
        <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
          rows={2} style={{ ...FIELD, resize: 'vertical', minHeight: 50 }} />
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 16, borderTop: `1px solid rgba(31,42,46,0.08)` }}>
        <button onClick={onClose} style={{
          background: 'rgba(31,42,46,0.07)', color: theme.dark, borderRadius: 8,
          padding: '9px 18px', border: 'none', fontWeight: 600, fontSize: 13,
          fontFamily: theme.font, cursor: 'pointer',
        }}>Annuler</button>
        <button disabled={!form.name.trim() || saving} onClick={async () => {
          setSaving(true); await onSave({ ...form, agency_id: agencyId }); setSaving(false);
        }} style={{
          background: theme.teal, color: theme.white, borderRadius: 8,
          padding: '9px 18px', border: 'none', fontWeight: 700, fontSize: 13,
          fontFamily: theme.font, cursor: 'pointer', opacity: (!form.name.trim() || saving) ? 0.5 : 1,
        }}>{saving ? 'Ajout...' : initial ? 'Modifier' : 'Ajouter'}</button>
      </div>
    </Modal>
  );
}

// ── AgenciesView ───────────────────────────────────────────────────────────────
function AgenciesView({ showToast }) {
  const [agencies, setAgencies] = useState([]);
  const [agencySearch, setAgencySearch] = useState('');
  const [modal, setModal] = useState(null); // { type: 'agency'|'guide', data?, agencyId? }
  const [expanded, setExpanded] = useState({}); // agencyId -> bool
  const [guides, setGuides] = useState({}); // agencyId -> [...]
  const [visits, setVisits] = useState({}); // agencyId -> [...]
  const searchTimer = useRef(null);

  const loadAgencies = useCallback(() => {
    window.db.invoke('agencies:getAll').then(setAgencies);
  }, []);

  useEffect(() => { loadAgencies(); }, [loadAgencies]);

  const filteredAgencies = agencySearch.trim()
    ? agencies.filter(a => a.name.toLowerCase().includes(agencySearch.toLowerCase()))
    : agencies;

  async function toggleExpand(agency) {
    const id = agency.id;
    setExpanded(e => ({ ...e, [id]: !e[id] }));
    if (!expanded[id]) {
      const [gs, vs] = await Promise.all([
        window.db.invoke('guides:getAll', { agency_id: id }),
        window.db.invoke('agencies:getGroups', { agency_id: id }),
      ]);
      setGuides(g => ({ ...g, [id]: gs || [] }));
      setVisits(v => ({ ...v, [id]: (vs || []).slice(0, 3) }));
    }
  }

  async function handleSaveAgency(form) {
    if (modal?.data) {
      await window.db.invoke('agencies:update', { id: modal.data.id, ...form });
      showToast('Agence modifiée');
    } else {
      await window.db.invoke('agencies:create', form);
      showToast('Agence créée');
    }
    setModal(null);
    loadAgencies();
  }

  async function handleDeleteAgency(id) {
    await window.db.invoke('agencies:delete', { id });
    showToast('Agence supprimée');
    loadAgencies();
  }

  async function handleSaveGuide(form) {
    if (modal?.guideData) {
      await window.db.invoke('guides:update', { id: modal.guideData.id, ...form });
      showToast('Guide modifié');
    } else {
      await window.db.invoke('guides:create', form);
      showToast('Guide ajouté');
    }
    setModal(null);
    const gs = await window.db.invoke('guides:getAll', { agency_id: form.agency_id });
    setGuides(g => ({ ...g, [form.agency_id]: gs || [] }));
  }

  async function handleDeleteGuide(guide) {
    await window.db.invoke('guides:delete', { id: guide.id });
    showToast('Guide supprimé');
    const gs = await window.db.invoke('guides:getAll', { agency_id: guide.agency_id });
    setGuides(g => ({ ...g, [guide.agency_id]: gs || [] }));
  }

  const PURPLE = '#7c3aed';

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 15, opacity: 0.4 }}>🔍</span>
          <input value={agencySearch} onChange={e => setAgencySearch(e.target.value)}
            placeholder="Rechercher une agence..." style={{ ...FIELD, paddingLeft: 36 }} />
        </div>
        <button onClick={() => setModal({ type: 'agency' })} style={{
          background: PURPLE, color: theme.white, borderRadius: 8,
          padding: '10px 18px', border: 'none', fontWeight: 700, fontSize: 13,
          fontFamily: theme.font, cursor: 'pointer', whiteSpace: 'nowrap',
        }}>+ Nouvelle agence</button>
      </div>

      {filteredAgencies.length === 0 ? (
        <div style={{ textAlign: 'center', marginTop: 60, color: theme.dark, opacity: 0.4 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🏢</div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Aucune agence</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Ajoutez votre première agence partenaire.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filteredAgencies.map(agency => {
            const isOpen = !!expanded[agency.id];
            return (
              <div key={agency.id} style={{
                background: theme.white, borderRadius: 14,
                border: `1px solid rgba(31,42,46,0.1)`,
                boxShadow: '0 2px 12px rgba(31,42,46,0.04)',
                overflow: 'hidden',
              }}>
                {/* Agency header */}
                <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 10, background: `${PURPLE}15`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 22, flexShrink: 0,
                  }}>🏢</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 15, color: theme.dark }}>{agency.name}</div>
                    <div style={{ fontSize: 12, color: theme.dark, opacity: 0.55, marginTop: 3, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      {(agency.city || agency.country) && <span>📍 {[agency.city, agency.country].filter(Boolean).join(', ')}</span>}
                      {agency.email && <span>✉ {agency.email}</span>}
                      {agency.phone && <span>📞 {agency.phone}</span>}
                    </div>
                    <div style={{ fontSize: 12, color: PURPLE, marginTop: 5, fontWeight: 600 }}>
                      {agency.visit_count} visite{agency.visit_count !== 1 ? 's' : ''}
                      {' · '}
                      {agency.total_pax} pax total
                      {' · '}
                      {agency.guide_count} guide{agency.guide_count !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <button onClick={() => setModal({ type: 'agency', data: agency })} style={{
                      background: 'rgba(31,42,46,0.07)', color: theme.dark, borderRadius: 6,
                      padding: '6px 12px', border: 'none', fontSize: 12, fontWeight: 600,
                      fontFamily: theme.font, cursor: 'pointer',
                    }}>Modifier</button>
                    <button onClick={() => handleDeleteAgency(agency.id)} style={{
                      background: `${theme.coral}15`, color: theme.coral, borderRadius: 6,
                      padding: '6px 10px', border: 'none', fontSize: 14,
                      fontFamily: theme.font, cursor: 'pointer',
                    }}>✕</button>
                    <button onClick={() => toggleExpand(agency)} style={{
                      background: isOpen ? `${PURPLE}15` : 'rgba(31,42,46,0.07)',
                      color: isOpen ? PURPLE : theme.dark, borderRadius: 6,
                      padding: '6px 10px', border: 'none', fontSize: 14,
                      fontFamily: theme.font, cursor: 'pointer',
                    }}>{isOpen ? '▲' : '▼'}</button>
                  </div>
                </div>

                {/* Expanded section */}
                {isOpen && (
                  <div style={{ borderTop: `1px solid rgba(31,42,46,0.07)`, padding: '14px 18px', background: 'rgba(31,42,46,0.015)' }}>
                    {/* Guides */}
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: theme.dark, opacity: 0.5, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
                        Guides associés
                      </div>
                      {(guides[agency.id] || []).length === 0 ? (
                        <div style={{ fontSize: 13, color: theme.dark, opacity: 0.4, marginBottom: 8 }}>Aucun guide enregistré</div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
                          {(guides[agency.id] || []).map(g => (
                            <div key={g.id} style={{
                              display: 'flex', alignItems: 'center', gap: 10,
                              background: theme.white, borderRadius: 8, padding: '8px 12px',
                              border: `1px solid rgba(31,42,46,0.08)`,
                            }}>
                              <span style={{ fontSize: 16 }}>👤</span>
                              <div style={{ flex: 1 }}>
                                <span style={{ fontWeight: 700, fontSize: 13, color: theme.dark }}>{g.name}</span>
                                <span style={{ fontSize: 11, color: PURPLE, marginLeft: 8, fontWeight: 600 }}>{ROLE_LABELS[g.role] || g.role}</span>
                                {g.phone && <span style={{ fontSize: 11, color: theme.dark, opacity: 0.5, marginLeft: 8 }}>{g.phone}</span>}
                              </div>
                              <button onClick={() => setModal({ type: 'guide', agencyId: agency.id, guideData: g })} style={{
                                background: 'none', border: 'none', color: theme.dark, opacity: 0.5,
                                cursor: 'pointer', fontSize: 13, padding: '2px 6px',
                              }}>✏️</button>
                              <button onClick={() => handleDeleteGuide(g)} style={{
                                background: 'none', border: 'none', color: theme.coral,
                                cursor: 'pointer', fontSize: 14, padding: '2px 6px',
                              }}>✕</button>
                            </div>
                          ))}
                        </div>
                      )}
                      <button onClick={() => setModal({ type: 'guide', agencyId: agency.id })} style={{
                        background: 'none', color: PURPLE, border: `1px dashed ${PURPLE}60`,
                        borderRadius: 8, padding: '6px 14px', cursor: 'pointer',
                        fontSize: 12, fontWeight: 700, fontFamily: theme.font,
                      }}>+ Ajouter un guide</button>
                    </div>

                    {/* Recent visits */}
                    {(visits[agency.id] || []).length > 0 && (
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: theme.dark, opacity: 0.5, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                          Dernières visites
                        </div>
                        {(visits[agency.id] || []).map(v => (
                          <div key={v.id} style={{ fontSize: 12, color: theme.dark, opacity: 0.7, marginBottom: 4 }}>
                            • {v.visit_name || v.name} · {v.total_members} pers.
                            {v.check_in_date && ` · ${v.check_in_date}${v.check_out_date ? ` → ${v.check_out_date}` : ''}`}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {modal?.type === 'agency' && (
        <AgencyModal initial={modal.data} onSave={handleSaveAgency} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'guide' && (
        <GuideModal
          agencyId={modal.agencyId}
          initial={modal.guideData}
          onSave={handleSaveGuide}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

// ── Main Guests screen ─────────────────────────────────────────────────────────
export default function Guests() {
  const { can } = useAuth();
  const [guests, setGuests] = useState([]);
  const [tagFilter, setTagFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [toast, setToast] = useState(null);
  const searchTimer = useRef(null);

  const isAgenciesTab = tagFilter === '__agencies__';

  const load = useCallback(() => {
    if (isAgenciesTab) return;
    if (query.trim().length >= 1) {
      window.db.invoke('guests:search', { query: query.trim() }).then(setGuests);
    } else {
      window.db.invoke('guests:getAll', { tag: tagFilter }).then(setGuests);
    }
  }, [query, tagFilter, isAgenciesTab]);

  useEffect(() => { load(); }, [tagFilter]);

  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(load, 300);
    return () => clearTimeout(searchTimer.current);
  }, [query]);

  function showToast(msg, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleSave(form) {
    if (editing) {
      await window.db.invoke('guests:update', { id: editing.id, ...form });
      showToast('Client modifié avec succès');
    } else {
      await window.db.invoke('guests:create', form);
      showToast('Client créé avec succès');
    }
    setShowModal(false);
    setEditing(null);
    load();
  }

  async function handleTagChange(id, tag) {
    await window.db.invoke('guests:setTag', { id, tag });
    load();
  }

  return (
    <div style={{ fontFamily: theme.font }}>
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: toast.ok ? '#16a34a' : theme.coral, color: theme.white,
          borderRadius: 10, padding: '12px 24px', fontSize: 13, fontWeight: 700,
          zIndex: 9999, boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
        }}>{toast.msg}</div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20, gap: 12 }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: theme.dark, margin: 0 }}>Clients</h1>
          {!isAgenciesTab && (
            <div style={{ fontSize: 13, color: theme.dark, opacity: 0.5, marginTop: 2 }}>
              {guests.length} client{guests.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
        {!isAgenciesTab && can('can_manage_clients') && (
          <button onClick={() => { setEditing(null); setShowModal(true); }} style={{
            background: theme.teal, color: theme.white, borderRadius: 8,
            padding: '10px 20px', border: 'none', fontWeight: 700, fontSize: 13,
            fontFamily: theme.font, cursor: 'pointer',
          }}>+ Nouveau client</button>
        )}
      </div>

      {/* Search (hidden in agencies tab) */}
      {!isAgenciesTab && (
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 15, opacity: 0.4, pointerEvents: 'none' }}>🔍</span>
          <input value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Rechercher par nom, passeport ou nationalité..."
            style={{ ...FIELD, paddingLeft: 36, boxShadow: '0 1px 4px rgba(31,42,46,0.08)' }} />
        </div>
      )}

      {/* Tab filter chips */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {TAG_FILTERS.map(f => {
          const active = tagFilter === f.key && !query.trim();
          return (
            <button key={f.key} onClick={() => { setTagFilter(f.key); setQuery(''); }} style={{
              padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: active ? 700 : 500, fontFamily: theme.font,
              background: active
                ? (f.key === '__agencies__' ? '#7c3aed' : theme.dark)
                : (f.key === '__agencies__' ? '#7c3aed15' : 'rgba(31,42,46,0.08)'),
              color: active ? theme.white : (f.key === '__agencies__' ? '#7c3aed' : theme.dark),
            }}>{f.label}</button>
          );
        })}
      </div>

      {/* Agencies view */}
      {isAgenciesTab ? (
        <AgenciesView showToast={showToast} />
      ) : (
        <>
          {guests.length === 0 ? (
            <div style={{ textAlign: 'center', marginTop: 60, color: theme.dark, opacity: 0.4 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>👤</div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{query ? 'Aucun résultat' : 'Aucun client'}</div>
              <div style={{ fontSize: 13, marginTop: 4 }}>
                {query ? 'Essayez un autre terme de recherche.' : 'Ajoutez votre premier client.'}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {guests.map(g => (
                <GuestRow key={g.id} guest={g}
                  onEdit={can('can_manage_clients') ? g => { setEditing(g); setShowModal(true); } : null}
                  onTagChange={handleTagChange} />
              ))}
            </div>
          )}
        </>
      )}

      {showModal && (
        <GuestModal initial={editing} onSave={handleSave}
          onClose={() => { setShowModal(false); setEditing(null); }} />
      )}
    </div>
  );
}
