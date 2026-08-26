import { useState, useEffect } from 'react';
import Login       from './screens/Login';
import Dashboard   from './screens/Dashboard';
import RoomBoard   from './screens/RoomBoard';
import CheckIn     from './screens/CheckIn';
import GuestSearch from './screens/GuestSearch';
import Shifts      from './screens/Shifts';
import Fiche       from './screens/Fiche';
import Canaux      from './screens/Canaux';
import { C } from './theme';
import { can as canCheck } from './auth';

function getRoute() {
  const hash = window.location.hash.slice(1) || 'login';
  const qi   = hash.indexOf('?');
  const path = qi >= 0 ? hash.slice(0, qi) : hash;
  const params = new URLSearchParams(qi >= 0 ? hash.slice(qi + 1) : '');
  return { path, params };
}

const SCREENS = {
  login: Login, dashboard: Dashboard, rooms: RoomBoard,
  checkin: CheckIn, guests: GuestSearch, shifts: Shifts, fiche: Fiche,
  canaux: Canaux,
};

const ALL_NAV = [
  { path: 'dashboard', icon: '🏠', label: 'Accueil' },
  { path: 'rooms',     icon: '🛏', label: 'Chambres' },
  { path: 'checkin',  icon: '✚',  label: 'Check-in' },
  { path: 'guests',   icon: '👥', label: 'Clients',  perm: 'can_manage_clients' },
  { path: 'canaux',   icon: '🔗', label: 'OTA',      perm: 'can_manage_settings' },
];

export default function App() {
  const [route, setRoute]       = useState(getRoute());
  const [staff, setStaff]       = useState(() => JSON.parse(localStorage.getItem('rbitrate_staff') || 'null'));
  const [property, setProperty] = useState(() => JSON.parse(localStorage.getItem('rbitrate_property') || 'null'));

  useEffect(() => {
    const handle = () => setRoute(getRoute());
    window.addEventListener('hashchange', handle);
    return () => window.removeEventListener('hashchange', handle);
  }, []);

  useEffect(() => {
    if (!staff && route.path !== 'login') navigate('login');
  }, [staff, route.path]);

  const navigate = (path) => { window.location.hash = path; };

  const logout = () => {
    localStorage.removeItem('rbitrate_staff');
    localStorage.removeItem('rbitrate_property');
    localStorage.removeItem('rbitrate_permissions');
    setStaff(null);
    setProperty(null);
    navigate('login');
  };

  const can = (permission) => canCheck(permission);

  const ctx = { staff, setStaff, property, setProperty, navigate, logout, can };
  const Screen = SCREENS[route.path] || Dashboard;
  const showNav = route.path !== 'login' && route.path !== 'fiche' && !!staff;

  const visibleNav = ALL_NAV.filter(n => !n.perm || can(n.perm));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: showNav ? 64 : 0 }}>
        <Screen ctx={ctx} params={route.params} />
      </div>
      {showNav && <BottomNav current={route.path} navigate={navigate} nav={visibleNav} />}
    </div>
  );
}

function BottomNav({ current, navigate, nav }) {
  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 430,
      background: C.dark, display: 'flex',
      paddingBottom: 'env(safe-area-inset-bottom, 8px)',
      zIndex: 100, boxShadow: '0 -1px 0 rgba(255,255,255,.08)',
    }}>
      {nav.map(n => (
        <button key={n.path} onClick={() => navigate(n.path)} style={{
          flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', padding: '8px 0', background: 'none',
          color: current === n.path ? C.teal : '#ffffff55',
          fontSize: 10, fontWeight: 600, gap: 2, minHeight: 56,
          borderTop: current === n.path ? `2px solid ${C.teal}` : '2px solid transparent',
          transition: 'color .15s',
        }}>
          <span style={{ fontSize: 20 }}>{n.icon}</span>
          {n.label}
        </button>
      ))}
    </nav>
  );
}
