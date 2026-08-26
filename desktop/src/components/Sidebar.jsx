import React, { useState, useEffect } from 'react';
import { theme } from '../theme.js';
import { useAuth, useApp, NAV_ITEMS } from '../App.jsx';

export default function Sidebar() {
  const { staff, logout, can } = useAuth();
  const { page, setPage, selectedPropertyId, setSelectedPropertyId, propertyVersion } = useApp();
  const [properties, setProperties] = useState([]);

  useEffect(() => {
    window.db.invoke('properties:getAll', {}).then(list => {
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
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  }

  const visibleItems = NAV_ITEMS.filter(item => !item.perm || can(item.perm));

  return (
    <div style={{
      width: 240, background: theme.dark, display: 'flex', flexDirection: 'column',
      height: '100vh', flexShrink: 0, overflow: 'hidden',
    }}>
      {/* Header / property */}
      <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/rbitrate-logo.svg" alt="RbitRate" style={{ width: 28, height: 28, flexShrink: 0 }} />
          <div style={{ fontSize: 20, fontWeight: 900, color: theme.white, letterSpacing: -0.5 }}>
            <span style={{ color: theme.teal }}>R</span>bitRate
          </div>
        </div>
        {properties.length > 1 ? (
          <select
            value={selectedPropertyId || ''}
            onChange={e => setSelectedPropertyId(e.target.value)}
            style={{
              marginTop: 10, width: '100%', background: 'rgba(255,255,255,0.08)',
              color: theme.white, border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 6, padding: '6px 8px', fontSize: 12, fontFamily: theme.font,
              cursor: 'pointer', outline: 'none',
            }}
          >
            {properties.map(p => <option key={p.id} value={p.id}>{p.display_name}</option>)}
          </select>
        ) : (
          <div style={{ marginTop: 8, fontSize: 12, color: theme.white, opacity: 0.6, fontWeight: 600 }}>
            {selectedProp?.display_name || 'Aucune propriété'}
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {visibleItems.map(item => {
          const isActive = page === item.key;
          return (
            <button
              key={item.key}
              onClick={() => setPage(item.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                width: '100%', padding: '10px 16px',
                background: isActive ? 'rgba(15,118,110,0.18)' : 'transparent',
                border: 'none', borderLeft: isActive ? `3px solid ${theme.teal}` : '3px solid transparent',
                color: isActive ? theme.teal : 'rgba(255,255,255,0.7)',
                cursor: 'pointer',
                fontSize: 13, fontFamily: theme.font, fontWeight: isActive ? 700 : 400,
                textAlign: 'left', transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: 15 }}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Staff info + logout */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%', background: theme.teal,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: theme.white, fontSize: 12, fontWeight: 700, flexShrink: 0,
          }}>
            {initials(staff.full_name)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: theme.white, fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {staff.full_name}
            </div>
            <div style={{ color: theme.white, opacity: 0.45, fontSize: 11 }}>
              {roleLabels[staff.role] || staff.role}
            </div>
          </div>
          <button
            onClick={logout}
            title="Déconnexion"
            style={{
              background: 'rgba(255,127,80,0.15)', border: 'none', color: theme.coral,
              borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 12, fontFamily: theme.font,
            }}
          >
            ⏻
          </button>
        </div>
      </div>
    </div>
  );
}
