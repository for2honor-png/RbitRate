import React, { useState, useEffect, useCallback } from 'react';
import { theme } from '../theme.js';
import { useApp } from '../App.jsx';
import Modal from '../components/Modal.jsx';

const FIELD = {
  border: `1.5px solid rgba(31,42,46,0.2)`, borderRadius: 8,
  padding: '9px 12px', fontSize: 13, fontFamily: theme.font,
  background: theme.white, color: theme.dark, outline: 'none', width: '100%',
  boxSizing: 'border-box',
};
const FIELD_FOCUS = { border: `1.5px solid ${theme.teal}` };

const EMPTY_FORM = {
  display_name: '', logo_path: '', type: 'hotel', address: '', bp: '', city: 'Chefchaouen',
  phone: '', fax: '', email: '', website: '', ice: '', if_number: '', rc: '',
  patente: '', cnss: '', bank_name: '', bank_rib: '', bank_account: '', vat_rate: 10,
  restaurant_active: 0, restaurant_mode: 'guests', restaurant_name: '',
};

function Label({ children, required }) {
  return (
    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: theme.dark, opacity: 0.55, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.4 }}>
      {children}{required && <span style={{ color: theme.coral }}> *</span>}
    </label>
  );
}

function Field({ label, required, style, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <Label required={required}>{label}</Label>}
      <input
        style={{ ...FIELD, ...(focused ? FIELD_FOCUS : {}), ...style }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...props}
      />
    </div>
  );
}

function Select({ label, children, value, onChange, required }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <Label required={required}>{label}</Label>}
      <select value={value} onChange={onChange}
        style={{ ...FIELD, cursor: 'pointer' }}>
        {children}
      </select>
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      padding: '8px 16px', border: 'none', background: 'transparent', cursor: 'pointer',
      fontSize: 13, fontFamily: theme.font, fontWeight: active ? 700 : 400,
      color: active ? theme.teal : `${theme.dark}88`,
      borderBottom: active ? `2px solid ${theme.teal}` : '2px solid transparent',
    }}>
      {children}
    </button>
  );
}

function PropertyModal({ initial, onSave, onClose }) {
  const [form, setForm] = useState(initial ? { ...EMPTY_FORM, ...initial } : EMPTY_FORM);
  const [tab, setTab] = useState(0);
  const [logoPreview, setLogoPreview] = useState(initial?.logo_path ? `atom://${initial.logo_path}` : null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  function set(key, value) { setForm(f => ({ ...f, [key]: value })); }

  async function pickLogo() {
    const filePath = await window.electronAPI.pickImageFile();
    if (!filePath) return;
    set('logo_path', filePath);
    setLogoPreview(`file:///${filePath.replace(/\\/g, '/')}`);
  }

  async function handleSave() {
    const errs = {};
    if (!form.display_name.trim()) errs.display_name = 'Champ requis';
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setSaving(true);
    await onSave(form);
    setSaving(false);
  }

  return (
    <Modal title={initial ? 'Modifier la propriété' : 'Nouvelle propriété'} onClose={onClose} width={520}>
      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: `1px solid rgba(31,42,46,0.1)`, marginBottom: 20 }}>
        <TabButton active={tab === 0} onClick={() => setTab(0)}>Identité & Logo</TabButton>
        <TabButton active={tab === 1} onClick={() => setTab(1)}>Informations fiscales</TabButton>
        <TabButton active={tab === 2} onClick={() => setTab(2)}>Restaurant</TabButton>
      </div>

      {tab === 0 && (
        <div>
          {/* Logo upload */}
          <div style={{ marginBottom: 14 }}>
            <Label>Logo</Label>
            <div
              onClick={pickLogo}
              style={{
                border: `2px dashed rgba(31,42,46,0.18)`, borderRadius: 10,
                padding: 20, textAlign: 'center', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 12, background: theme.cream, minHeight: 72,
              }}
            >
              {logoPreview ? (
                <img src={logoPreview} alt="logo" style={{ maxHeight: 56, maxWidth: 160, objectFit: 'contain' }} />
              ) : (
                <div style={{ color: theme.dark, opacity: 0.4, fontSize: 13 }}>
                  Cliquer pour choisir un logo (JPG, PNG, SVG)
                </div>
              )}
            </div>
          </div>

          <div>
            <Label required>Nom d'affichage</Label>
            <input
              value={form.display_name}
              onChange={e => set('display_name', e.target.value)}
              placeholder="ex: Hôtel Tarek"
              style={{ ...FIELD, ...(errors.display_name ? { border: `1.5px solid ${theme.coral}` } : {}) }}
            />
            {errors.display_name && <div style={{ color: theme.coral, fontSize: 11, marginTop: 3 }}>{errors.display_name}</div>}
          </div>

          <Select label="Type" value={form.type} onChange={e => set('type', e.target.value)}>
            <option value="hotel">Hôtel</option>
            <option value="apartment">Appartement</option>
            <option value="villa">Villa</option>
            <option value="riad">Riad</option>
          </Select>

          <Field label="Adresse" value={form.address} onChange={e => set('address', e.target.value)} placeholder="Rue, quartier" />
          <Field label="B.P" value={form.bp} onChange={e => set('bp', e.target.value)} placeholder="B.P 1234" />
          <Field label="Ville" value={form.city} onChange={e => set('city', e.target.value)} placeholder="Chefchaouen" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Téléphone" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+212 6XX XX XX XX" />
            <Field label="Fax" value={form.fax} onChange={e => set('fax', e.target.value)} placeholder="+212 5XX..." />
          </div>
          <Field label="Email" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="contact@..." />
          <Field label="Site web" value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://..." />
        </div>
      )}

      {tab === 1 && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="ICE" value={form.ice} onChange={e => set('ice', e.target.value)} />
            <Field label="IF (Identifiant Fiscal)" value={form.if_number} onChange={e => set('if_number', e.target.value)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="RC (Registre du Commerce)" value={form.rc} onChange={e => set('rc', e.target.value)} />
            <Field label="Patente N°" value={form.patente} onChange={e => set('patente', e.target.value)} />
          </div>
          <Field label="CNSS" value={form.cnss} onChange={e => set('cnss', e.target.value)} />
          <Field label="Banque" value={form.bank_name} onChange={e => set('bank_name', e.target.value)} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="RIB" value={form.bank_rib} onChange={e => set('bank_rib', e.target.value)} />
            <Field label="Compte bancaire (BP)" value={form.bank_account} onChange={e => set('bank_account', e.target.value)} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <Label>TVA %</Label>
            <input
              type="number" min="0" max="100" step="0.5"
              value={form.vat_rate}
              onChange={e => set('vat_rate', parseFloat(e.target.value) || 0)}
              style={FIELD}
            />
          </div>
        </div>
      )}

      {tab === 2 && (
        <div>
          {/* Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, padding: '14px 16px', background: theme.cream, borderRadius: 10 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: theme.dark }}>Activer le restaurant</div>
              <div style={{ fontSize: 12, color: theme.dark, opacity: 0.5, marginTop: 2 }}>Affiche l'interface restaurant pour cette propriété</div>
            </div>
            <div
              onClick={() => set('restaurant_active', form.restaurant_active ? 0 : 1)}
              style={{
                width: 44, height: 24, borderRadius: 12, cursor: 'pointer', transition: 'background 0.2s',
                background: form.restaurant_active ? theme.teal : 'rgba(31,42,46,0.18)',
                position: 'relative', flexShrink: 0,
              }}
            >
              <div style={{
                position: 'absolute', top: 3, left: form.restaurant_active ? 23 : 3,
                width: 18, height: 18, borderRadius: '50%', background: 'white',
                transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }} />
            </div>
          </div>

          {form.restaurant_active ? (
            <>
              <div style={{ marginBottom: 14 }}>
                <Label>Mode de service</Label>
                {[
                  { value: 'guests', label: 'Clients hôtel uniquement' },
                  { value: 'walkins', label: 'Walk-ins uniquement' },
                  { value: 'both', label: 'Les deux' },
                ].map(opt => (
                  <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, cursor: 'pointer', fontSize: 13, color: theme.dark }}>
                    <input
                      type="radio" name="restaurant_mode" value={opt.value}
                      checked={form.restaurant_mode === opt.value}
                      onChange={() => set('restaurant_mode', opt.value)}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
              <Field
                label="Nom du restaurant (optionnel)"
                value={form.restaurant_name || ''}
                onChange={e => set('restaurant_name', e.target.value)}
                placeholder="ex: Restaurant L'Atlas"
              />
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '24px 0', color: theme.dark, opacity: 0.4, fontSize: 13 }}>
              Activez le restaurant pour configurer les options
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20, paddingTop: 16, borderTop: `1px solid rgba(31,42,46,0.08)` }}>
        <button onClick={onClose} style={{
          background: 'rgba(31,42,46,0.07)', color: theme.dark, borderRadius: 8,
          padding: '9px 18px', border: 'none', fontWeight: 600, fontSize: 13,
          fontFamily: theme.font, cursor: 'pointer',
        }}>
          Annuler
        </button>
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

const TYPE_LABELS = { hotel: 'Hôtel', apartment: 'Appartement', villa: 'Villa', riad: 'Riad' };

function PropertyCard({ prop, onEdit, onDelete }) {
  return (
    <div style={{
      background: theme.white, borderRadius: 12, padding: 20,
      border: '1px solid rgba(31,42,46,0.08)',
      display: 'flex', flexDirection: 'column', gap: 10, position: 'relative',
    }}>
      {/* Logo + name row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {prop.logo_path ? (
          <img
            src={`file:///${prop.logo_path.replace(/\\/g, '/')}`}
            alt="logo"
            style={{ width: 40, height: 40, objectFit: 'contain', borderRadius: 6, background: theme.cream, padding: 4 }}
          />
        ) : (
          <div style={{ width: 40, height: 40, borderRadius: 6, background: theme.cream, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
            🏨
          </div>
        )}
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: theme.dark }}>{prop.display_name}</div>
          <span style={{
            fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5,
            background: `${theme.teal}18`, color: theme.teal, borderRadius: 4, padding: '2px 6px',
          }}>
            {TYPE_LABELS[prop.type] || prop.type}
          </span>
        </div>
      </div>

      {/* Details */}
      <div style={{ fontSize: 12, color: theme.dark, opacity: 0.55, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {prop.city && <span>📍 {prop.city}{prop.address ? `, ${prop.address}` : ''}</span>}
        {prop.phone && <span>📞 {prop.phone}</span>}
        <span style={{ color: theme.teal, fontWeight: 600, opacity: 1 }}>🛏 {prop.roomCount} chambre{prop.roomCount !== 1 ? 's' : ''}</span>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button onClick={onEdit} style={{
          flex: 1, background: 'rgba(31,42,46,0.06)', color: theme.dark, borderRadius: 7,
          padding: '7px 12px', border: 'none', fontWeight: 600, fontSize: 12,
          fontFamily: theme.font, cursor: 'pointer',
        }}>
          Modifier
        </button>
        <button onClick={onDelete} style={{
          background: `${theme.coral}15`, color: theme.coral, borderRadius: 7,
          padding: '7px 12px', border: 'none', fontWeight: 600, fontSize: 12,
          fontFamily: theme.font, cursor: 'pointer',
        }}>
          Supprimer
        </button>
      </div>
    </div>
  );
}

export default function Properties() {
  const { setSelectedPropertyId, refreshProperties } = useApp();
  const [properties, setProperties] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = useCallback(() => {
    window.db.invoke('properties:getAll', {}).then(setProperties);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSave(form) {
    if (editing) {
      await window.db.invoke('properties:update', { ...form, id: editing.id });
    } else {
      const { id } = await window.db.invoke('properties:create', form);
      setSelectedPropertyId(id);
    }
    load();
    refreshProperties();
    setShowModal(false);
    setEditing(null);
  }

  async function handleDelete(id) {
    await window.db.invoke('properties:delete', { id });
    load();
    refreshProperties();
    setConfirmDelete(null);
  }

  return (
    <div style={{ fontFamily: theme.font }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: theme.dark, margin: 0 }}>Propriétés</h1>
          <p style={{ fontSize: 13, color: theme.dark, opacity: 0.5, margin: 0, marginTop: 2 }}>
            {properties.length} propriété{properties.length !== 1 ? 's' : ''} enregistrée{properties.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowModal(true); }}
          style={{
            background: theme.teal, color: theme.white, borderRadius: 8,
            padding: '10px 20px', border: 'none', fontWeight: 700, fontSize: 13,
            fontFamily: theme.font, cursor: 'pointer',
          }}
        >
          + Nouvelle propriété
        </button>
      </div>

      {/* Grid */}
      {properties.length === 0 ? (
        <div style={{ textAlign: 'center', marginTop: 80, color: theme.dark, opacity: 0.4 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🏨</div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Aucune propriété</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Ajoutez votre premier établissement pour commencer.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {properties.map(p => (
            <PropertyCard
              key={p.id}
              prop={p}
              onEdit={() => { setEditing(p); setShowModal(true); }}
              onDelete={() => setConfirmDelete(p)}
            />
          ))}
        </div>
      )}

      {/* Create / Edit modal */}
      {showModal && (
        <PropertyModal
          initial={editing}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditing(null); }}
        />
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <Modal title="Confirmer la suppression" onClose={() => setConfirmDelete(null)} width={400}>
          <p style={{ fontSize: 14, color: theme.dark, marginBottom: 20 }}>
            Êtes-vous sûr de vouloir supprimer <strong>{confirmDelete.display_name}</strong> ? Cette action est irréversible.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={() => setConfirmDelete(null)} style={{
              background: 'rgba(31,42,46,0.07)', color: theme.dark, borderRadius: 8,
              padding: '9px 18px', border: 'none', fontWeight: 600, fontSize: 13,
              fontFamily: theme.font, cursor: 'pointer',
            }}>Annuler</button>
            <button onClick={() => handleDelete(confirmDelete.id)} style={{
              background: theme.coral, color: theme.white, borderRadius: 8,
              padding: '9px 18px', border: 'none', fontWeight: 700, fontSize: 13,
              fontFamily: theme.font, cursor: 'pointer',
            }}>Supprimer</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
