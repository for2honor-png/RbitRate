import { C } from '../theme';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Tableau de bord', icon: '🏠' },
  { id: 'rooms',     label: 'Chambres',        icon: '🛏️' },
  { id: 'checkin',   label: 'Check-in',        icon: '✅' },
  { id: 'guests',    label: 'Clients',         icon: '👥' },
  { id: 'shifts',    label: 'Shifts',          icon: '⏱️' },
  { id: 'canaux',    label: 'Canaux OTA',      icon: '📡' },
];

export default function Sidebar({ currentScreen, onNavigate, staff, property, onLogout }) {
  return (
    <div style={{
      width: 240,
      height: '100vh',
      background: '#1f2a2e',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      position: 'sticky',
      top: 0,
      overflowY: 'auto',
    }}>
      {/* Logo */}
      <div style={{
        padding: '24px 20px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        <div style={{ fontSize: 22, fontWeight: 900, color: '#0f766e', letterSpacing: '-0.5px' }}>
          🐇 RbitRate
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
          {property?.display_name || 'Chargement...'}
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 0' }}>
        {NAV_ITEMS.map(item => {
          const active = currentScreen === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '11px 20px',
                background: active ? 'rgba(15,118,110,0.15)' : 'transparent',
                borderLeft: active ? '3px solid #0f766e' : '3px solid transparent',
                border: 'none',
                borderRadius: 0,
                color: active ? '#0f766e' : 'rgba(255,255,255,0.6)',
                fontSize: 13,
                fontWeight: active ? 700 : 400,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s',
                minHeight: 0,
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
            >
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Staff + logout */}
      <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: '50%',
            background: '#0f766e',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 700, color: 'white', flexShrink: 0,
          }}>
            {staff?.full_name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'white' }}>{staff?.full_name}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'capitalize' }}>{staff?.role}</div>
          </div>
        </div>
        <button
          onClick={onLogout}
          style={{
            width: '100%', padding: '8px',
            background: 'rgba(255,127,80,0.15)',
            border: '1px solid rgba(255,127,80,0.3)',
            borderRadius: 8, color: '#ff7f50',
            fontSize: 12, fontWeight: 600, cursor: 'pointer', minHeight: 0,
          }}
        >
          Déconnexion
        </button>
      </div>
    </div>
  );
}
