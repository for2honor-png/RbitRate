import React from 'react';
import { theme } from '../theme.js';
import { useAuth, useApp } from '../App.jsx';

export default function TopBar({ navItems }) {
  const { staff } = useAuth();
  const { page } = useApp();

  const currentNav = navItems.find(n => n.key === page);

  function initials(name) {
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  }

  return (
    <div style={{
      height: 48, background: theme.white, borderBottom: `1px solid rgba(31,42,46,0.1)`,
      display: 'flex', alignItems: 'center', paddingLeft: 24, paddingRight: 20,
      gap: 12, flexShrink: 0,
    }}>
      <div style={{ flex: 1, fontSize: 14, fontWeight: 700, color: theme.dark }}>
        {currentNav?.label || 'Tableau de bord'}
      </div>

      <div style={{
        width: 30, height: 30, borderRadius: '50%', background: theme.teal,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: theme.white, fontSize: 11, fontWeight: 700,
      }}>
        {initials(staff.full_name)}
      </div>
    </div>
  );
}
