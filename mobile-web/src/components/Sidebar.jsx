import React, { useState, useEffect } from 'react';
import { theme } from '../theme.js';
import { useAuth, useApp } from '../App.jsx';
import { invoke } from '../db.js';

const NAV_SECTIONS = [
  {
    title: 'PRINCIPAL',
    items: [
      { id: 'dashboard',  label: 'Dashboard',   icon: '🏠' },
      { id: 'rooms',      label: 'Chambres',     icon: '🛏️' },
      { id: 'checkin',    label: 'Check-in',     icon: '✅' },
      { id: 'guests',     label: 'Clients',      icon: '👥' },
    ],
  },
  {
    title: 'FINANCES',
    items: [
      { id: 'shifts',     label: 'Shifts',       icon: '⏱️' },
      { id: 'finance',    label: 'Finances',     icon: '💰' },
      { id: 'invoices',   label: 'Factures',     icon: '🧾' },
    ],
  },
  {
    title: 'OPÉRATIONS',
    items: [
      { id: 'restaurant', label: 'Restaurant',   icon: '🍽️' },
      { id: 'canaux',     label: 'Canaux OTA',   icon: '📡' },
      { id: 'planning',   label: 'Planning',     icon: '🗓️' },
    ],
  },
  {
    title: 'ADMINISTRATION',
    items: [
      { id: 'equipe',     label: 'Équipe',       icon: '👤' },
      { id: 'properties', label: 'Propriétés',   icon: '⚙️' },
    ],
  },
];

export default function Sidebar() {
  const { staff, logout } = useAuth();
  const { page, setPage, selectedPropertyId, setSelectedPropertyId, propertyVersion } = useApp();
  const [properties, setProperties] = useState([]);

  useEffect(() => {
    invoke('properties:getAll', {}).then(list => {
      if (!list) return;
      setProperties(list);
      if (list.length > 0 && !selectedPropertyId) {
        setSelectedPropertyId(list[0].id);
      }
    });
  }, [propertyVersion]);

  const selectedProp = properties.find(p => p.id === selectedPropertyId);

  const roleLabels = {
    owner: 'Propriétaire', manager: 'Manager',
    receptionist: 'Réceptionniste', chef: 'Chef', accountant: 'Comptable',
  };

  function initials(name) {
    return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  }

  return (
    <div style={{
      width: 220, background: theme.dark, display: 'flex', flexDirection: 'column',
      height: '100vh', flexShrink: 0, overflow: 'hidden',
    }}>
      {/* Header / property */}
      <div style={{ padding: '18px 16px 14px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ fontSize: 18, fontWeight: 900, color: theme.white, letterSpacing: -0.5, marginBottom: 8 }}>
          <span style={{ color: theme.teal }}>R</span>bitRate
        </div>
        {properties.length > 1 ? (
          <select
            value={selectedPropertyId || ''}
            onChange={e => setSelectedPropertyId(e.target.value)}
            style={{
              width: '100%', background: 'rgba(255,255,255,0.08)',
              color: theme.white, border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 6, padding: '5px 8px', fontSize: 11, fontFamily: theme.font,
              cursor: 'pointer', outline: 'none',
            }}
          >
            {properties.map(p => <option key={p.id} value={p.id}>{p.display_name}</option>)}
          </select>
        ) : (
          <div style={{ fontSize: 11, color: theme.white, opacity: 0.5, fontWeight: 600 }}>
            {selectedProp?.display_name || 'Aucune propriété'}
          </div>
        )}
      </div>

      {/* Sectioned navigation */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
        {NAV_SECTIONS.map(section => (
          <div key={section.title} style={{ marginBottom: 4 }}>
            <div style={{
              fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.25)',
              letterSpacing: '1.5px', padding: '8px 20px 4px',
            }}>
              {section.title}
            </div>
            {section.items.map(item => {
              const active = page === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setPage(item.id)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                    padding: '9px 20px',
                    background: active ? 'rgba(15,118,110,0.15)' : 'transparent',
                    borderLeft: active ? '3px solid #0f766e' : '3px solid transparent',
                    border: 'none',
                    color: active ? '#0f766e' : 'rgba(255,255,255,0.6)',
                    fontSize: 13, fontWeight: active ? 700 : 400,
                    cursor: 'pointer', textAlign: 'left', fontFamily: theme.font,
                  }}
                >
                  <span style={{ fontSize: 15 }}>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Staff info + logout */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 30, height: 30, borderRadius: '50%', background: theme.teal, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: theme.white, fontSize: 11, fontWeight: 700,
          }}>
            {initials(staff.full_name)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: theme.white, fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {staff.full_name}
            </div>
            <div style={{ color: theme.white, opacity: 0.4, fontSize: 10 }}>
              {roleLabels[staff.role] || staff.role}
            </div>
          </div>
          <button
            onClick={logout}
            title="Déconnexion"
            style={{
              background: 'rgba(255,127,80,0.15)', border: 'none', color: theme.coral,
              borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 12,
            }}
          >⏻</button>
        </div>
      </div>
    </div>
  );
}
