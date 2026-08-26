import React, { useState, createContext, useContext, useCallback } from 'react';
import { theme } from './theme.js';
import Login from './screens/Login.jsx';
import Dashboard from './screens/Dashboard.jsx';
import Properties from './screens/Properties.jsx';
import Rooms from './screens/Rooms.jsx';
import Guests from './screens/Guests.jsx';
import CheckIn from './screens/CheckIn.jsx';
import Shifts from './screens/Shifts.jsx';
import Finance from './screens/Finance.jsx';
import Channels from './screens/Channels.jsx';
import Restaurant from './screens/Restaurant.jsx';
import Invoices from './screens/Invoices.jsx';
import Equipe from './screens/Equipe.jsx';
import Planning from './screens/Planning.jsx';
import Sidebar from './components/Sidebar.jsx';
import TopBar from './components/TopBar.jsx';

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
  { key: 'dashboard',  label: 'Tableau de bord', icon: '⊞' },
  { key: 'rooms',      label: 'Chambres',         icon: '🛏' },
  { key: 'checkin',    label: 'Check-in',          icon: '→' },
  { key: 'guests',     label: 'Clients',           icon: '👤', perm: 'can_manage_clients' },
  { key: 'finances',   label: 'Finances',          icon: '💰', perm: 'can_view_all_finances' },
  { key: 'shifts',     label: 'Shifts',            icon: '🕐' },
  { key: 'channels',   label: 'Canaux OTA',         icon: '📡', perm: 'can_manage_ota' },
  { key: 'invoices',   label: 'Factures',          icon: '📄', perm: 'can_view_invoices' },
  { key: 'restaurant', label: 'Restaurant',        icon: '🍽',  perm: 'can_manage_restaurant_menu' },
  { key: 'equipe',     label: 'Équipe',            icon: '👥', perm: 'can_manage_staff' },
  { key: 'planning',  label: 'Planning',           icon: '🗓️', perm: 'can_manage_staff' },
  { key: 'properties', label: 'Propriétés',        icon: '🏨', perm: 'can_manage_properties' },
];

export default function App() {
  const [staff, setStaff]             = useState(null);
  const [permissions, setPermissions] = useState({});
  const [page, setPage]               = useState('dashboard');
  const [selectedPropertyId, setSelectedPropertyId] = useState(null);
  const [propertyVersion, setPropertyVersion]       = useState(0);
  const [checkInRoomId, setCheckInRoomId]           = useState(null);

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
    channels:   <Channels />,
    restaurant: <Restaurant />,
    invoices:   <Invoices />,
    equipe:     <Equipe />,
    planning:   <Planning />,
  };

  return (
    <AuthContext.Provider value={{ staff, login, logout, can }}>
      <AppContext.Provider value={{
        page, setPage,
        selectedPropertyId, setSelectedPropertyId,
        propertyVersion, refreshProperties,
        checkInRoomId, setCheckInRoomId,
        navigateToCheckIn,
      }}>
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
      </AppContext.Provider>
    </AuthContext.Provider>
  );
}
