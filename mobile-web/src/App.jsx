import React, { useState, createContext, useContext, useCallback, useEffect } from 'react';
import { theme } from './theme.js';
import { invoke } from './db.js';
import Login      from './screens/Login.jsx';
import Dashboard  from './screens/Dashboard.jsx';
import Properties from './screens/Properties.jsx';
import Rooms      from './screens/Rooms.jsx';
import Guests     from './screens/Guests.jsx';
import CheckIn    from './screens/CheckIn.jsx';
import Shifts     from './screens/Shifts.jsx';
import Finance    from './screens/Finance.jsx';
import Channels   from './screens/Channels.jsx';
import Restaurant from './screens/Restaurant.jsx';
import Invoices   from './screens/Invoices.jsx';
import Equipe     from './screens/Equipe.jsx';
import Planning   from './screens/Planning.jsx';
import Sidebar    from './components/Sidebar.jsx';
import TopBar     from './components/TopBar.jsx';

export const AuthContext = createContext(null);
export const AppContext  = createContext(null);

export function useAuth() { return useContext(AuthContext); }
export function useApp()  { return useContext(AppContext); }

const ROLE_DEFAULTS = {
  owner: {
    can_edit_rooms: true, can_view_all_finances: true, can_manage_all_shifts: true,
    can_manage_clients: true, can_view_invoices: true, can_manage_ota: true,
    can_manage_restaurant_menu: true, can_view_kitchen: true,
    can_manage_properties: true, can_manage_staff: true,
  },
  manager: {
    can_edit_rooms: true, can_view_all_finances: true, can_manage_all_shifts: true,
    can_manage_clients: true, can_view_invoices: true, can_manage_ota: true,
    can_manage_restaurant_menu: true, can_view_kitchen: true,
    can_manage_properties: false, can_manage_staff: false,
  },
  receptionist: {
    can_edit_rooms: false, can_view_all_finances: false, can_manage_all_shifts: false,
    can_manage_clients: false, can_view_invoices: false, can_manage_ota: false,
    can_manage_restaurant_menu: false, can_view_kitchen: true,
    can_manage_properties: false, can_manage_staff: false,
  },
};

function resolvePermissions(staffRecord) {
  if (staffRecord.role === 'owner') return { ...ROLE_DEFAULTS.owner };
  const defaults = ROLE_DEFAULTS[staffRecord.role] || ROLE_DEFAULTS.receptionist;
  let custom = {};
  try { custom = JSON.parse(staffRecord.permissions || '{}'); } catch (_) {}
  return { ...defaults, ...custom };
}

export const NAV_ITEMS = [
  { key: 'dashboard',  label: 'Tableau de bord', icon: '🏠' },
  { key: 'rooms',      label: 'Chambres',         icon: '🛏️' },
  { key: 'checkin',    label: 'Check-in',         icon: '✅' },
  { key: 'guests',     label: 'Clients',          icon: '👥' },
  { key: 'shifts',     label: 'Shifts',           icon: '⏱️' },
  { key: 'finances',   label: 'Finances',         icon: '💰' },
  { key: 'finance',    label: 'Finances',         icon: '💰' },
  { key: 'invoices',   label: 'Factures',         icon: '🧾' },
  { key: 'restaurant', label: 'Restaurant',       icon: '🍽️' },
  { key: 'channels',   label: 'Canaux OTA',       icon: '📡' },
  { key: 'canaux',     label: 'Canaux OTA',       icon: '📡' },
  { key: 'planning',   label: 'Planning',         icon: '🗓️' },
  { key: 'equipe',     label: 'Équipe',           icon: '👤' },
  { key: 'properties', label: 'Propriétés',       icon: '⚙️' },
];

const MOBILE_NAV = [
  { id: 'dashboard', icon: '🏠', label: 'Accueil' },
  { id: 'rooms',     icon: '🛏️', label: 'Chambres' },
  { id: 'checkin',   icon: '✅', label: 'Check-in' },
  { id: 'guests',    icon: '👥', label: 'Clients' },
];

const MOBILE_MORE = [
  { id: 'shifts',     label: 'Shifts',      icon: '⏱️' },
  { id: 'finance',    label: 'Finances',    icon: '💰' },
  { id: 'invoices',   label: 'Factures',    icon: '🧾' },
  { id: 'restaurant', label: 'Restaurant',  icon: '🍽️' },
  { id: 'canaux',     label: 'OTA',         icon: '📡' },
  { id: 'planning',   label: 'Planning',    icon: '🗓️' },
  { id: 'equipe',     label: 'Équipe',      icon: '👤' },
  { id: 'properties', label: 'Propriétés',  icon: '⚙️' },
];

function initials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

export default function App() {
  const [staff, setStaff]             = useState(null);
  const [permissions, setPermissions] = useState({});
  const [page, setPage]               = useState('dashboard');
  const [selectedPropertyId, setSelectedPropertyId] = useState(null);
  const [propertyVersion, setPropertyVersion]       = useState(0);
  const [checkInRoomId, setCheckInRoomId]           = useState(null);
  const [isDesktop, setIsDesktop]     = useState(() => window.innerWidth >= 768);
  const [properties, setProperties]   = useState([]);
  const [showMore, setShowMore]        = useState(false);

  useEffect(() => {
    const fn = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);

  useEffect(() => {
    if (!staff) return;
    invoke('properties:getAll', {}).then(r => {
      if (Array.isArray(r)) {
        setProperties(r);
        if (!selectedPropertyId && r.length > 0) setSelectedPropertyId(r[0].id);
      }
    });
  }, [staff, propertyVersion]);

  const currentProperty = properties.find(p => p.id === selectedPropertyId) || null;

  function refreshProperties() { setPropertyVersion(v => v + 1); }

  function navigateToCheckIn(roomId = null) {
    setCheckInRoomId(roomId);
    setPage('checkin');
  }

  const login = useCallback((staffRecord) => {
    const perms = resolvePermissions(staffRecord);
    setPermissions(perms);
    setStaff(staffRecord);
  }, []);

  const logout = useCallback(() => {
    setStaff(null);
    setPermissions({});
    setPage('dashboard');
  }, []);

  const can = useCallback((permission) => {
    if (!staff) return false;
    if (staff.role === 'owner') return true;
    return !!permissions[permission];
  }, [staff, permissions]);

  if (!staff) {
    return (
      <AuthContext.Provider value={{ staff, login, logout, can }}>
        <Login />
      </AuthContext.Provider>
    );
  }

  const screenMap = {
    dashboard:  <Dashboard />,
    properties: <Properties />,
    rooms:      <Rooms />,
    guests:     <Guests />,
    checkin:    <CheckIn />,
    shifts:     <Shifts />,
    finances:   <Finance />,
    finance:    <Finance />,
    channels:   <Channels />,
    canaux:     <Channels />,
    restaurant: <Restaurant />,
    invoices:   <Invoices />,
    equipe:     <Equipe />,
    planning:   <Planning />,
  };

  const ctxValue = {
    page, setPage,
    selectedPropertyId, setSelectedPropertyId,
    propertyVersion, refreshProperties,
    checkInRoomId, setCheckInRoomId,
    navigateToCheckIn,
    isDesktop,
    currentProperty,
  };

  return (
    <AuthContext.Provider value={{ staff, login, logout, can }}>
      <AppContext.Provider value={ctxValue}>
        {isDesktop ? (
          /* ── Desktop layout (unchanged) ── */
          <div style={{ display: 'flex', height: '100vh', fontFamily: theme.font, background: theme.cream, overflow: 'hidden' }}>
            <Sidebar />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <TopBar navItems={NAV_ITEMS} />
              <main style={{ flex: 1, overflow: 'auto', padding: 24 }}>
                {screenMap[page] || (
                  <div style={{ color: theme.dark, opacity: 0.4, marginTop: 60, textAlign: 'center', fontSize: 18 }}>
                    Cette section sera disponible dans une prochaine phase.
                  </div>
                )}
              </main>
            </div>
          </div>
        ) : (
          /* ── Mobile layout ── */
          <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', fontFamily: theme.font, background: theme.cream, overflow: 'hidden' }}>
            {/* Mobile top header */}
            <div style={{
              height: 52, background: '#1f2a2e', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0 16px',
            }}>
              <div style={{ fontSize: 16, fontWeight: 900, color: '#0f766e' }}>RbitRate</div>
              <div style={{
                fontSize: 12, color: 'rgba(255,255,255,0.6)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                maxWidth: 150, textAlign: 'center',
              }}>
                {currentProperty?.display_name}
              </div>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', background: '#0f766e',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, color: 'white', flexShrink: 0,
                cursor: 'pointer',
              }}
                onClick={logout}
                title="Déconnexion"
              >
                {initials(staff?.full_name)}
              </div>
            </div>

            {/* Mobile content */}
            <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingBottom: 60 }}>
              {screenMap[page] || (
                <div style={{ textAlign: 'center', padding: 40, opacity: 0.4 }}>
                  Cette section n'est pas disponible en mode mobile.
                </div>
              )}
            </main>

            {/* Mobile bottom nav */}
            <div style={{
              position: 'fixed', bottom: 0, left: 0, right: 0,
              height: 60, background: '#1f2a2e',
              display: 'flex', borderTop: '1px solid rgba(255,255,255,0.08)',
              zIndex: 100,
            }}>
              {MOBILE_NAV.map(item => {
                const active = page === item.id;
                return (
                  <button key={item.id} onClick={() => setPage(item.id)} style={{
                    flex: 1, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: 2,
                    background: 'transparent', border: 'none', minHeight: 44,
                    color: active ? '#0f766e' : 'rgba(255,255,255,0.4)',
                    fontSize: 10, cursor: 'pointer', padding: '6px 0',
                  }}>
                    <span style={{ fontSize: 20 }}>{item.icon}</span>
                    <span style={{ fontWeight: active ? 700 : 400 }}>{item.label}</span>
                  </button>
                );
              })}
              {/* Plus button */}
              <button onClick={() => setShowMore(s => !s)} style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 2,
                background: 'transparent', border: 'none', minHeight: 44,
                color: showMore ? '#0f766e' : 'rgba(255,255,255,0.4)',
                fontSize: 10, cursor: 'pointer', padding: '6px 0',
              }}>
                <span style={{ fontSize: 20 }}>☰</span>
                <span style={{ fontWeight: showMore ? 700 : 400 }}>Plus</span>
              </button>
            </div>

            {/* More drawer */}
            {showMore && (
              <>
                <div
                  onClick={() => setShowMore(false)}
                  style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200 }}
                />
                <div style={{
                  position: 'fixed', bottom: 0, left: 0, right: 0,
                  background: '#1f2a2e', borderRadius: '20px 20px 0 0',
                  padding: '20px 0 40px', zIndex: 201,
                  maxHeight: '70vh', overflowY: 'auto',
                }}>
                  <div style={{
                    width: 40, height: 4, background: 'rgba(255,255,255,0.2)',
                    borderRadius: 2, margin: '0 auto 20px',
                  }} />
                  <div style={{
                    display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
                    gap: 8, padding: '0 16px',
                  }}>
                    {MOBILE_MORE.map(item => (
                      <button key={item.id} onClick={() => { setPage(item.id); setShowMore(false); }} style={{
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', gap: 6,
                        padding: '16px 8px',
                        background: 'rgba(255,255,255,0.05)',
                        border: 'none', borderRadius: 12,
                        color: 'rgba(255,255,255,0.8)',
                        fontSize: 11, cursor: 'pointer', fontFamily: theme.font,
                      }}>
                        <span style={{ fontSize: 24 }}>{item.icon}</span>
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                  <div style={{
                    margin: '20px 16px 0', padding: 16,
                    background: 'rgba(255,255,255,0.05)', borderRadius: 12,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <div>
                      <div style={{ color: 'white', fontSize: 13, fontWeight: 600 }}>{staff?.full_name}</div>
                      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, textTransform: 'capitalize' }}>{staff?.role}</div>
                    </div>
                    <button onClick={() => { setShowMore(false); logout(); }} style={{
                      padding: '8px 16px',
                      background: 'rgba(255,127,80,0.2)', border: '1px solid rgba(255,127,80,0.4)',
                      borderRadius: 8, color: '#ff7f50', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    }}>Déconnexion</button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </AppContext.Provider>
    </AuthContext.Provider>
  );
}
