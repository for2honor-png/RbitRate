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

// Desktop-only left navigation (>= 768px). Mirrors the Electron desktop
// app's sidebar; mobile keeps its existing bottom nav (see App.jsx).
export default function Sidebar({ current, navigate, nav, staff, property, logout }) {
  return (
    <div style={{
      width: 240, flexShrink: 0, height: '100vh', position: 'sticky', top: 0,
      background: C.dark, display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* Logo + property */}
      <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22, lineHeight: 1 }}>🐇</span>
          <div style={{ fontSize: 19, fontWeight: 900, color: C.white, letterSpacing: -0.5 }}>
            <span style={{ color: C.teal }}>R</span>bitRate
          </div>
        </div>
        <div style={{ marginTop: 8, fontSize: 12, color: C.white, opacity: 0.55, fontWeight: 600 }}>
          {property?.display_name || 'Aucune propriété'}
        </div>
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {nav.map(item => {
          const isActive = current === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                height: 44, padding: '0 16px',
                background: isActive ? `${C.teal}22` : 'transparent',
                borderLeft: isActive ? `3px solid ${C.teal}` : '3px solid transparent',
                color: isActive ? C.teal : 'rgba(255,255,255,0.7)',
                fontSize: 13, fontWeight: isActive ? 700 : 500,
                textAlign: 'left', minHeight: 0,
                transition: 'background .15s, color .15s',
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
            >
              <span style={{ fontSize: 15, width: 18, textAlign: 'center', flexShrink: 0 }}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Staff + logout */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%', background: C.teal,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: C.white, fontSize: 12, fontWeight: 700, flexShrink: 0,
          }}>
            {initials(staff?.full_name)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: C.white, fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {staff?.full_name}
            </div>
            <div style={{ color: C.white, opacity: 0.45, fontSize: 11 }}>
              {ROLE_LABELS[staff?.role] || staff?.role}
            </div>
          </div>
          <button onClick={logout} title="Déconnexion" style={{
            background: 'rgba(255,127,80,0.15)', border: 'none', color: C.coral,
            borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 12, minHeight: 0,
          }}>⏻</button>
        </div>
      </div>
    </div>
  );
}
