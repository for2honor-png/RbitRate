const SCREEN_TITLES = {
  dashboard: 'Tableau de bord',
  rooms:     'Chambres',
  checkin:   'Check-in',
  guests:    'Clients',
  shifts:    'Shifts',
  canaux:    'Canaux OTA',
};

export default function TopBar({ currentScreen, staff }) {
  return (
    <div style={{
      height: 56,
      background: 'white',
      borderBottom: '1px solid #e8e2d8',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 32px',
      flexShrink: 0,
    }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: '#1f2a2e' }}>
        {SCREEN_TITLES[currentScreen] || currentScreen}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13, color: '#666' }}>
        <span>{staff?.full_name}</span>
        <span style={{
          padding: '3px 10px',
          background: '#0f766e18', color: '#0f766e',
          borderRadius: 20, fontSize: 11, fontWeight: 600,
          textTransform: 'capitalize',
        }}>
          {staff?.role}
        </span>
      </div>
    </div>
  );
}
