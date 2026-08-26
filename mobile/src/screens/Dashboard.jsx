import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { api } from '../api';
import { useAppContext } from '../context/AppContext';
import { theme } from '../theme';

export default function Dashboard() {
  const navigation = useNavigation();
  const { state, setState } = useAppContext();
  const { currentStaff, currentProperty } = state;

  const [data, setData]         = useState(null);
  const [props, setProps]       = useState([]);
  const [refreshing, setRef]    = useState(false);
  const [loading, setLoading]   = useState(true);
  const [connected, setConnected] = useState(true);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const properties = await api.getProperties();
      setProps(properties || []);
      const propId = currentProperty?.id || properties?.[0]?.id;
      if (propId) {
        if (!currentProperty && properties?.[0]) {
          setState(s => ({ ...s, currentProperty: properties[0] }));
        }
        const dash = await api.getDashboard(propId);
        setData(dash);
        setConnected(true);
      }
    } catch {
      setConnected(false);
    } finally {
      setLoading(false);
      setRef(false);
    }
  }, [currentProperty]);

  useFocusEffect(useCallback(() => { load(true); }, [load]));

  const total    = data?.total_rooms    || 0;
  const occupied = data?.occupied_rooms || 0;

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRef(true); load(); }} tintColor={theme.teal} />}
    >
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.greeting}>Bonjour, {currentStaff?.full_name?.split(' ')[0] || 'Staff'} 👋</Text>
          <Text style={s.propName}>{currentProperty?.display_name || 'RbitRate PMS'}</Text>
        </View>
        <View style={[s.dot, { backgroundColor: connected ? '#22c55e' : '#ef4444' }]}>
          <Text style={s.dotTxt}>{connected ? '●' : '○'}</Text>
        </View>
      </View>

      {/* Property selector */}
      {props.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.propScroll}>
          {props.map(p => (
            <TouchableOpacity
              key={p.id}
              style={[s.propChip, currentProperty?.id === p.id && s.propChipActive]}
              onPress={() => setState(s => ({ ...s, currentProperty: p }))}
            >
              <Text style={[s.propChipTxt, currentProperty?.id === p.id && { color: theme.teal }]}>{p.display_name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {loading ? (
        <ActivityIndicator color={theme.teal} size="large" style={{ marginTop: 40 }} />
      ) : (
        <>
          {/* KPI tiles */}
          <View style={s.kpiRow}>
            <View style={[s.kpi, { borderTopColor: theme.teal }]}>
              <Text style={s.kpiIcon}>🛏</Text>
              <Text style={s.kpiVal}>{occupied}/{total}</Text>
              <Text style={s.kpiLabel}>Occupées</Text>
            </View>
            <View style={[s.kpi, { borderTopColor: theme.coral }]}>
              <Text style={s.kpiIcon}>🚶</Text>
              <Text style={s.kpiVal}>{data?.check_ins_today || 0}</Text>
              <Text style={s.kpiLabel}>Arrivées</Text>
            </View>
            <View style={[s.kpi, { borderTopColor: theme.saffron }]}>
              <Text style={s.kpiIcon}>💰</Text>
              <Text style={s.kpiVal}>{(data?.revenue_today || 0).toLocaleString()}</Text>
              <Text style={s.kpiLabel}>MAD auj.</Text>
            </View>
          </View>

          {/* Occupancy summary */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Occupation</Text>
            <View style={s.statusRow}>
              <View style={[s.statusDot, { backgroundColor: theme.teal }]} />
              <Text style={s.statusLabel}>Disponibles</Text>
              <Text style={[s.statusCount, { color: theme.teal }]}>{total - occupied}</Text>
            </View>
            <View style={s.statusRow}>
              <View style={[s.statusDot, { backgroundColor: theme.coral }]} />
              <Text style={s.statusLabel}>Occupées</Text>
              <Text style={[s.statusCount, { color: theme.coral }]}>{occupied}</Text>
            </View>
          </View>

          {/* Quick actions */}
          <Text style={s.sectionTitle}>Actions rapides</Text>
          <View style={s.actions}>
            <TouchableOpacity style={[s.actionBtn, { backgroundColor: theme.teal }]} onPress={() => navigation.navigate('Check-in')}>
              <Text style={s.actionIcon}>✚</Text>
              <Text style={s.actionTxt}>Check-in</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#2a3840' }]} onPress={() => navigation.navigate('Chambres')}>
              <Text style={s.actionIcon}>🛏</Text>
              <Text style={s.actionTxt}>Chambres</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#2a3840' }]} onPress={() => navigation.navigate('Shifts')}>
              <Text style={s.actionIcon}>⏱</Text>
              <Text style={s.actionTxt}>Mon Shift</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root:         { flex: 1, backgroundColor: theme.dark },
  content:      { padding: 20, paddingBottom: 40 },
  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  greeting:     { fontSize: 18, fontWeight: '800', color: theme.cream },
  propName:     { fontSize: 13, color: '#94a3b8', marginTop: 2 },
  dot:          { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  dotTxt:       { fontSize: 10, color: theme.white, fontWeight: '900' },
  propScroll:   { marginBottom: 16 },
  propChip:     { paddingHorizontal: 14, paddingVertical: 7, backgroundColor: '#2a3840', borderRadius: 20, marginRight: 8 },
  propChipActive: { backgroundColor: `${theme.teal}20`, borderWidth: 1, borderColor: theme.teal },
  propChipTxt:  { color: '#94a3b8', fontWeight: '600', fontSize: 13 },
  kpiRow:       { flexDirection: 'row', gap: 10, marginBottom: 20 },
  kpi:          { flex: 1, backgroundColor: '#2a3840', borderRadius: 12, padding: 14, borderTopWidth: 3, alignItems: 'center' },
  kpiIcon:      { fontSize: 20, marginBottom: 4 },
  kpiVal:       { fontSize: 20, fontWeight: '900', color: theme.cream },
  kpiLabel:     { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  section:      { backgroundColor: '#2a3840', borderRadius: 12, padding: 16, marginBottom: 20 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  statusRow:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#1f2a2e' },
  statusDot:    { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  statusLabel:  { flex: 1, color: theme.cream, fontSize: 14 },
  statusCount:  { fontWeight: '800', fontSize: 16 },
  actions:      { flexDirection: 'row', gap: 10 },
  actionBtn:    { flex: 1, borderRadius: 12, padding: 16, alignItems: 'center' },
  actionIcon:   { fontSize: 22, marginBottom: 6 },
  actionTxt:    { color: theme.white, fontWeight: '700', fontSize: 12 },
});
