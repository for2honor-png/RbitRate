import React, { useState, useEffect, useRef } from 'react';
import { theme } from '../theme.js';
import { useAuth } from '../App.jsx';
import { invoke } from '../db.js';

const ROLES = [
  { value: 'owner',        label: 'Propriétaire' },
  { value: 'manager',      label: 'Manager' },
  { value: 'receptionist', label: 'Réceptionniste' },
];

const PERM_LABELS = [
  { key: 'can_edit_rooms',            label: 'Modifier les chambres' },
  { key: 'can_view_all_finances',     label: 'Voir les finances' },
  { key: 'can_manage_all_shifts',     label: 'Gérer tous les shifts' },
  { key: 'can_manage_clients',        label: 'Gérer les clients' },
  { key: 'can_view_invoices',         label: 'Voir les factures' },
  { key: 'can_manage_ota',            label: 'Canaux OTA' },
  { key: 'can_manage_restaurant_menu', label: 'Menu restaurant' },
  { key: 'can_view_kitchen',          label: 'Vue cuisine' },
  { key: 'can_manage_properties',     label: 'Gérer les propriétés' },
  { key: 'can_manage_staff',          label: "Gérer l'équipe" },
];

const ROLE_DEFAULTS = {
  owner:        Object.fromEntries(PERM_LABELS.map(p => [p.key, true])),
  manager:      { can_edit_rooms: true, can_view_all_finances: true, can_manage_all_shifts: true, can_manage_clients: true, can_view_invoices: true, can_manage_ota: true, can_manage_restaurant_menu: true, can_view_kitchen: true, can_manage_properties: false, can_manage_staff: false },
  receptionist: Object.fromEntries(PERM_LABELS.map(p => [p.key, p.key === 'can_view_kitchen'])),
};

function initials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function roleColor(role) {
  return { owner: theme.coral, manager: theme.saffron || '#f59e0b', receptionist: theme.teal }[role] || theme.teal;
}

function LocalModal({ title, onClose, children, width = 480 }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: theme.white, borderRadius: 16, padding: 32,
        width, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: theme.dark }}>{title}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: theme.dark, opacity: 0.4, lineHeight: 1 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function StaffModal({ initial, onClose, onSaved }) {
  const isEdit = !!initial;
  const [form, setForm] = useState({
    full_name: initial?.full_name || '',
    role:      initial?.role      || 'receptionist',
    pin:       ['', '', '', ''],
    permissions: initial ? (() => { try { return JSON.parse(initial.permissions || '{}'); } catch { return {}; } })() : {},
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const pinRefs = [useRef(), useRef(), useRef(), useRef()];

  function handlePinChange(index, value) {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...form.pin];
    next[index] = digit;
    setForm(f => ({ ...f, pin: next }));
    if (digit && index < 3) pinRefs[index + 1].current?.focus();
  }

  function handlePinKeyDown(index, e) {
    if (e.key === 'Backspace' && !form.pin[index] && index > 0) {
      pinRefs[index - 1].current?.focus();
    }
  }

  const roleDefaults = ROLE_DEFAULTS[form.role] || ROLE_DEFAULTS.receptionist;
  const effectivePerms = form.role === 'owner'
    ? Object.fromEntries(PERM_LABELS.map(p => [p.key, true]))
    : { ...roleDefaults, ...form.permissions };

  function togglePerm(key) {
    if (form.role === 'owner') return;
    const current = effectivePerms[key];
    setForm(f => ({ ...f, permissions: { ...f.permissions, [key]: !current } }));
  }

  async function save() {
    if (!form.full_name.trim()) { setError('Le nom est requis.'); return; }
    const pinStr = form.pin.join('');
    if (!isEdit && pinStr.length !== 4) { setError('Le PIN doit être à 4 chiffres.'); return; }
    if (isEdit && pinStr.length > 0 && pinStr.length !== 4) { setError('PIN incomplet (laisser vide pour ne pas changer).'); return; }
    setSaving(true);
    try {
      const customPerms = form.role === 'owner' ? {} : form.permissions;
      if (isEdit) {
        const args = { id: initial.id, full_name: form.full_name.trim(), role: form.role, permissions: customPerms };
        if (pinStr.length === 4) args.pin_code = pinStr;
        else args.pin_code = initial.pin_code;
        await invoke('staff:update', args);
      } else {
        await invoke('staff:create', {
          full_name: form.full_name.trim(), role: form.role,
          pin_code: pinStr, permissions: customPerms,
        });
      }
      onSaved();
    } catch (e) {
      setError(e.message || 'Erreur lors de la sauvegarde.');
    }
    setSaving(false);
  }

  return (
    <LocalModal title={isEdit ? 'Modifier le membre' : 'Ajouter un membre'} onClose={onClose} width={520}>
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: theme.dark, opacity: 0.6, marginBottom: 6, textTransform: 'uppercase' }}>Nom complet</label>
        <input
          value={form.full_name}
          onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
          placeholder="Prénom Nom"
          style={{ width: '100%', border: `1.5px solid rgba(31,42,46,0.2)`, borderRadius: 8, padding: '9px 12px', fontSize: 14, fontFamily: theme.font, boxSizing: 'border-box' }}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: theme.dark, opacity: 0.6, marginBottom: 6, textTransform: 'uppercase' }}>Rôle</label>
        <select
          value={form.role}
          onChange={e => setForm(f => ({ ...f, role: e.target.value, permissions: {} }))}
          style={{ width: '100%', border: `1.5px solid rgba(31,42,46,0.2)`, borderRadius: 8, padding: '9px 12px', fontSize: 14, fontFamily: theme.font, background: theme.white }}
        >
          {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: theme.dark, opacity: 0.6, marginBottom: 10, textTransform: 'uppercase' }}>
          Code PIN {isEdit && <span style={{ fontWeight: 400, opacity: 0.6 }}>(laisser vide = inchangé)</span>}
        </label>
        <div style={{ display: 'flex', gap: 10 }}>
          {form.pin.map((digit, i) => (
            <input
              key={i}
              ref={pinRefs[i]}
              type="password"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={e => handlePinChange(i, e.target.value)}
              onKeyDown={e => handlePinKeyDown(i, e)}
              onFocus={e => e.target.select()}
              style={{
                width: 52, height: 56, textAlign: 'center', fontSize: 24, fontWeight: 700,
                border: `1.5px solid ${digit ? theme.teal : 'rgba(31,42,46,0.2)'}`,
                borderRadius: 8, outline: 'none', fontFamily: theme.font, color: theme.dark,
                background: theme.cream,
              }}
            />
          ))}
        </div>
      </div>

      {form.role !== 'owner' && (
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: theme.dark, opacity: 0.6, marginBottom: 10, textTransform: 'uppercase' }}>Permissions</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px' }}>
            {PERM_LABELS.map(p => {
              const on = effectivePerms[p.key];
              const isDefault = roleDefaults[p.key] === on && !form.permissions.hasOwnProperty(p.key);
              return (
                <label key={p.key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '4px 0' }}>
                  <input
                    type="checkbox"
                    checked={!!on}
                    onChange={() => togglePerm(p.key)}
                    style={{ width: 16, height: 16, accentColor: theme.teal, cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: 13, color: theme.dark, opacity: isDefault ? 0.55 : 1 }}>{p.label}</span>
                </label>
              );
            })}
          </div>
          <div style={{ fontSize: 11, color: theme.dark, opacity: 0.4, marginTop: 8 }}>
            Les permissions grisées sont les défauts du rôle sélectionné.
          </div>
        </div>
      )}

      {error && (
        <div style={{ color: theme.coral, fontSize: 13, marginBottom: 12, padding: '8px 12px', background: 'rgba(255,127,80,0.08)', borderRadius: 8 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: 8, border: `1.5px solid rgba(31,42,46,0.2)`, background: 'none', cursor: 'pointer', fontFamily: theme.font, fontSize: 14 }}>
          Annuler
        </button>
        <button onClick={save} disabled={saving} style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: theme.teal, color: theme.white, fontWeight: 700, cursor: saving ? 'default' : 'pointer', fontFamily: theme.font, fontSize: 14, opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Enregistrement...' : isEdit ? 'Modifier' : 'Créer'}
        </button>
      </div>
    </LocalModal>
  );
}

function StaffCard({ member, onEdit, onDeactivate, inactive }) {
  const roleLabels = { owner: 'Propriétaire', manager: 'Manager', receptionist: 'Réceptionniste' };
  const pinDisplay = member.pin_code ? '••••' : '—';

  return (
    <div style={{
      background: theme.white, borderRadius: 12, padding: '16px 20px',
      display: 'flex', alignItems: 'center', gap: 16,
      opacity: inactive ? 0.5 : 1,
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: '50%', background: inactive ? '#94a3b8' : roleColor(member.role),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontSize: 15, fontWeight: 800, flexShrink: 0,
      }}>
        {initials(member.full_name)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, color: theme.dark, fontSize: 15 }}>{member.full_name}</div>
        <div style={{ fontSize: 12, color: theme.dark, opacity: 0.5, marginTop: 2 }}>
          {roleLabels[member.role] || member.role} · PIN {pinDisplay}
        </div>
      </div>
      {!inactive && (
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onEdit} style={{
            padding: '6px 14px', borderRadius: 8, border: `1.5px solid rgba(31,42,46,0.15)`,
            background: 'none', fontSize: 13, cursor: 'pointer', fontFamily: theme.font, color: theme.dark,
          }}>
            Modifier
          </button>
          {member.role !== 'owner' && (
            <button onClick={onDeactivate} style={{
              padding: '6px 14px', borderRadius: 8, border: 'none',
              background: 'rgba(255,127,80,0.1)', fontSize: 13, cursor: 'pointer',
              fontFamily: theme.font, color: theme.coral,
            }}>
              Désactiver
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function Equipe() {
  const { can } = useAuth();
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [modal, setModal]         = useState(null);
  const [confirm, setConfirm]     = useState(null);

  async function load() {
    setLoading(true);
    // staff:getFull not in web handlers; use staff:getAll instead (returns all including inactive when no active filter)
    // We use staff:getFull which maps to staff?deleted_at=is.null (no active filter)
    const list = await invoke('staff:getFull', {});
    setStaffList(list || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function deactivate(member) {
    await invoke('staff:deactivate', { id: member.id });
    setConfirm(null);
    load();
  }

  if (!can('can_manage_staff')) {
    return (
      <div style={{ textAlign: 'center', marginTop: 80, color: theme.dark, opacity: 0.4, fontSize: 16 }}>
        Vous n'avez pas accès à cette section.
      </div>
    );
  }

  const active   = staffList.filter(s => s.active !== 0 && s.active !== false);
  const inactive = staffList.filter(s => s.active === 0 || s.active === false);

  return (
    <div style={{ maxWidth: 780, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 900, color: theme.dark }}>Équipe</div>
          <div style={{ fontSize: 13, color: theme.dark, opacity: 0.5, marginTop: 2 }}>{active.length} membre{active.length !== 1 ? 's' : ''} actif{active.length !== 1 ? 's' : ''}</div>
        </div>
        <button
          onClick={() => setModal({ type: 'create' })}
          style={{
            background: theme.teal, color: theme.white, border: 'none',
            borderRadius: 10, padding: '10px 20px', fontWeight: 700,
            fontSize: 14, fontFamily: theme.font, cursor: 'pointer',
          }}
        >
          + Ajouter un membre
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: theme.dark, opacity: 0.4, paddingTop: 60 }}>Chargement...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {active.map(member => <StaffCard key={member.id} member={member} onEdit={() => setModal({ type: 'edit', member })} onDeactivate={() => setConfirm(member)} />)}
          {inactive.length > 0 && (
            <>
              <div style={{ fontSize: 12, fontWeight: 700, color: theme.dark, opacity: 0.4, marginTop: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Inactifs</div>
              {inactive.map(member => <StaffCard key={member.id} member={member} inactive />)}
            </>
          )}
        </div>
      )}

      {modal?.type === 'create' && (
        <StaffModal onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />
      )}
      {modal?.type === 'edit' && (
        <StaffModal initial={modal.member} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />
      )}

      {confirm && (
        <LocalModal title="Désactiver ce membre" onClose={() => setConfirm(null)} width={380}>
          <p style={{ color: theme.dark, fontSize: 14, marginBottom: 20 }}>
            Désactiver <strong>{confirm.full_name}</strong> ? Il ne pourra plus se connecter.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={() => setConfirm(null)} style={{ padding: '10px 20px', borderRadius: 8, border: `1.5px solid rgba(31,42,46,0.2)`, background: 'none', cursor: 'pointer', fontFamily: theme.font }}>
              Annuler
            </button>
            <button onClick={() => deactivate(confirm)} style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: theme.coral, color: theme.white, fontWeight: 700, cursor: 'pointer', fontFamily: theme.font }}>
              Désactiver
            </button>
          </div>
        </LocalModal>
      )}
    </div>
  );
}
