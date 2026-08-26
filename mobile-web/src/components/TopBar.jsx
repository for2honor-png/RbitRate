import { useState, useEffect } from 'react';
import { C } from '../theme';

const ROLE_LABELS = {
  owner: 'Propriétaire',
  admin: 'Admin',
  manager: 'Manager',
  receptionist: 'Réceptionniste',
  chef: 'Chef',
  accountant: 'Comptable',
};

function initials(name) {
  if (!name) return '';
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

// Desktop-only top bar (>= 768px), shown alongside the sidebar.
export default function TopBar({ title, property, staff }) {
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const on  = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  return (
    <div style={{
      height: 56, background: C.white, borderBottom: `1px solid ${C.border}`,
      display: 'flex', alignItems: 'center', padding: '0 32px', gap: 16, flexShrink: 0,
    }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: C.dark, flex: 1 }}>{title}</div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }} title={online ? 'Connecté' : 'Hors ligne'}>
        <span style={{
          width: 8, height: 8, borderRadius: '50%',
          background: online ? '#22c55e' : '#ef4444', display: 'inline-block',
        }} />
        <span style={{ fontSize: 12, color: C.gray }}>{online ? 'En ligne' : 'Hors ligne'}</span>
      </div>

      {property?.display_name && (
        <div style={{ fontSize: 13, color: C.gray, borderLeft: `1px solid ${C.border}`, paddingLeft: 16 }}>
          {property.display_name}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderLeft: `1px solid ${C.border}`, paddingLeft: 16 }}>
        <div style={{
          width: 30, height: 30, borderRadius: '50%', background: C.teal,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: C.white, fontSize: 11, fontWeight: 700, flexShrink: 0,
        }}>
          {initials(staff?.full_name)}
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.dark, lineHeight: 1.2 }}>{staff?.full_name}</div>
          <div style={{ fontSize: 11, color: C.gray, lineHeight: 1.2 }}>{ROLE_LABELS[staff?.role] || staff?.role}</div>
        </div>
      </div>
    </div>
  );
}
