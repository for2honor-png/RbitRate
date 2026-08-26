import React, { Component, useEffect, useRef, useState } from 'react';
import { AppState, ScrollView, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { loadStoredConfig } from './src/api';
import { getDb } from './src/db/index';
import { syncNow } from './src/db/sync';
import { AppContext } from './src/context/AppContext';

import Setup       from './src/screens/Setup';
import Login       from './src/screens/Login';
import Dashboard   from './src/screens/Dashboard';
import RoomBoard   from './src/screens/RoomBoard';
import CheckIn     from './src/screens/CheckIn';
import GuestSearch from './src/screens/GuestSearch';
import Shifts      from './src/screens/Shifts';
import Kitchen     from './src/screens/Kitchen';

const Tab   = createBottomTabNavigator();
const Stack = createStackNavigator();

const T = '#0f766e';
const D = '#1f2a2e';
const B = '#faf7f2';

// ── Global error boundary ────────────────────────────────────────────────────
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error.message, info.componentStack);
  }
  render() {
    if (this.state.error) {
      return (
        <View style={{ flex: 1, backgroundColor: '#1a0000', padding: 24, paddingTop: 60 }}>
          <Text style={{ color: '#ff6b6b', fontSize: 16, fontWeight: '800', marginBottom: 12 }}>
            Crash détecté — envoyer à l'équipe
          </Text>
          <ScrollView>
            <Text style={{ color: '#ffaaaa', fontSize: 12, fontFamily: 'monospace' }}>
              {this.state.error.message}
              {'\n\n'}
              {this.state.error.stack}
            </Text>
          </ScrollView>
        </View>
      );
    }
    return this.props.children;
  }
}

// ── Navigation ────────────────────────────────────────────────────────────────
const TAB_ICONS = {
  Accueil: '🏠', Chambres: '🛏', 'Check-in': '✚',
  Clients: '👥', Shifts: '⏱', Cuisine: '🍳',
};

function TabIcon({ name, color }) {
  return <Text style={{ fontSize: 19, color }}>{TAB_ICONS[name] || '●'}</Text>;
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color }) => <TabIcon name={route.name} color={color} />,
        tabBarStyle: { backgroundColor: D, borderTopColor: 'transparent', height: 60, paddingBottom: 8 },
        tabBarActiveTintColor: T,
        tabBarInactiveTintColor: '#ffffff55',
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
        headerStyle: { backgroundColor: D },
        headerTintColor: B,
        headerTitleStyle: { fontWeight: '800', fontSize: 17 },
      })}
    >
      <Tab.Screen name="Accueil"   component={Dashboard}   options={{ title: 'Tableau de bord' }} />
      <Tab.Screen name="Chambres"  component={RoomBoard}   options={{ title: 'Chambres' }} />
      <Tab.Screen name="Check-in"  component={CheckIn}     options={{ title: 'Check-in' }} />
      <Tab.Screen name="Clients"   component={GuestSearch} options={{ title: 'Clients' }} />
      <Tab.Screen name="Shifts"    component={Shifts}      options={{ title: 'Shifts' }} />
      <Tab.Screen name="Cuisine"   component={Kitchen}     options={{ title: 'Cuisine' }} />
    </Tab.Navigator>
  );
}

// ── Root app ──────────────────────────────────────────────────────────────────
function AppInner() {
  const [state, setState] = useState({
    ready: false, hasServer: true, isLoggedIn: false,
    currentStaff: null, currentProperty: null,
  });
  const syncTimer = useRef(null);
  const dbRef     = useRef(null);

  useEffect(() => {
    async function init() {
      let hasServer = true;
      let isLoggedIn = false;

      // Load stored auth — never crash on this
      try {
        const cfg = await loadStoredConfig();
        hasServer  = cfg.hasServer  ?? true;
        isLoggedIn = cfg.hasToken   ?? false;
      } catch (e) {
        console.error('[init] loadStoredConfig failed:', e.message);
      }

      // Initialize DB
      try {
        dbRef.current = await getDb();
      } catch (e) {
        console.error('[init] getDb failed:', e.message);
      }

      // Initial sync — best-effort, never crash
      try {
        if (dbRef.current) await syncNow(dbRef.current);
      } catch (e) {
        console.error('[init] syncNow failed:', e.message);
      }

      setState(s => ({ ...s, ready: true, hasServer, isLoggedIn }));
    }

    init().catch(e => {
      // Last-resort: even if init() itself throws, show the login screen
      console.error('[init] fatal:', e.message);
      setState(s => ({ ...s, ready: true, hasServer: true, isLoggedIn: false }));
    });

    // Background sync every 2 minutes — silent failures
    syncTimer.current = setInterval(() => {
      if (dbRef.current) syncNow(dbRef.current).catch(() => {});
    }, 120000);

    const sub = AppState.addEventListener('change', next => {
      if (next === 'active' && dbRef.current) {
        syncNow(dbRef.current).catch(() => {});
      }
    });

    return () => {
      clearInterval(syncTimer.current);
      sub.remove();
    };
  }, []);

  if (!state.ready) {
    return (
      <View style={{ flex: 1, backgroundColor: D, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: B, fontSize: 18, fontWeight: '800' }}>RbitRate</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppContext.Provider value={{ state, setState }}>
          <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
              {!state.hasServer  && <Stack.Screen name="Setup" component={Setup} />}
              {!state.isLoggedIn && <Stack.Screen name="Login" component={Login} />}
              {state.isLoggedIn  && <Stack.Screen name="Main"  component={MainTabs} />}
            </Stack.Navigator>
          </NavigationContainer>
        </AppContext.Provider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppInner />
    </ErrorBoundary>
  );
}
