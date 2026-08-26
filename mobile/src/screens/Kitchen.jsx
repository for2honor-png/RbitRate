import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../api';
import { useAppContext } from '../context/AppContext';
import { theme } from '../theme';

const STATUS = {
  pending:     { label: 'En attente',    color: theme.saffron,  next: 'in_progress', nextLabel: 'Prendre en charge' },
  in_progress: { label: 'En cours',      color: '#3b82f6',      next: 'ready',       nextLabel: 'Prêt' },
  ready:       { label: 'Prêt',          color: theme.teal,     next: 'served',      nextLabel: 'Servir' },
  served:      { label: 'Servi',         color: theme.gray,     next: null,          nextLabel: null },
};

function elapsed(createdAt) {
  if (!createdAt) return '';
  const ms = Date.now() - new Date(createdAt).getTime();
  const m  = Math.floor(ms / 60000);
  return m < 1 ? '< 1 min' : `${m} min`;
}

function OrderCard({ order, onAdvance }) {
  const st = STATUS[order.status] || STATUS.pending;
  const isOld = order.status === 'pending' && (Date.now() - new Date(order.created_at).getTime()) > 10 * 60 * 1000;

  return (
    <View style={[s.card, { borderTopColor: st.color, borderTopWidth: 4 }, isOld && s.cardUrgent]}>
      <View style={s.cardHeader}>
        <View>
          <Text style={s.cardTable}>{order.table_label || `Table #${order.table_id?.slice(-4)}`}</Text>
          <Text style={s.cardTime}>⏱ {elapsed(order.created_at)}</Text>
        </View>
        <View style={[s.statusBadge, { backgroundColor: `${st.color}20` }]}>
          <Text style={[s.statusBadgeTxt, { color: st.color }]}>{st.label}</Text>
        </View>
      </View>

      <View style={s.divider} />

      {(order.items || []).map((item, i) => (
        <View key={i} style={s.itemRow}>
          <Text style={s.itemQty}>×{item.qty}</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.itemName}>{item.name_fr || item.name_en || item.name_ar}</Text>
            {item.notes && <Text style={s.itemNote}>{item.notes}</Text>}
          </View>
          <Text style={s.itemPrice}>{((item.price || 0) * item.qty).toFixed(2)}</Text>
        </View>
      ))}

      {order.notes && (
        <View style={s.orderNotes}>
          <Text style={s.orderNotesLabel}>Notes :</Text>
          <Text style={s.orderNotesTxt}>{order.notes}</Text>
        </View>
      )}

      <View style={s.cardFooter}>
        <Text style={s.cardTotal}>{(order.total_amount || 0).toFixed(2)} MAD</Text>
        {st.next && (
          <TouchableOpacity style={[s.advanceBtn, { backgroundColor: st.color }]} onPress={() => onAdvance(order, st.next)}>
            <Text style={s.advanceBtnTxt}>{st.nextLabel} →</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export default function Kitchen() {
  const { state } = useAppContext();
  const propId    = state.currentProperty?.id;

  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRef]  = useState(false);
  const intervalRef           = useRef(null);

  const load = useCallback(async (silent = false) => {
    if (!propId) return;
    if (!silent) setLoading(true);
    try {
      const data = await api.getActiveOrders(propId);
      setOrders(data || []);
    } catch { /* ignore */ }
    finally { setLoading(false); setRef(false); }
  }, [propId]);

  useFocusEffect(useCallback(() => {
    load(true);
    intervalRef.current = setInterval(() => load(true), 5000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [load]));

  async function handleAdvance(order, nextStatus) {
    try {
      const shifts  = await api.getActiveShifts(propId).catch(() => []);
      const shiftId = shifts?.[0]?.id || null;
      await api.updateOrderStatus(order.id, { status: nextStatus, shift_id: shiftId });
      load(true);
    } catch (e) { /* ignore */ }
  }

  if (loading) {
    return <View style={s.center}><ActivityIndicator color={theme.teal} size="large" /></View>;
  }

  const groups = {
    pending:     orders.filter(o => o.status === 'pending'),
    in_progress: orders.filter(o => o.status === 'in_progress'),
    ready:       orders.filter(o => o.status === 'ready'),
  };

  return (
    <View style={s.root}>
      {/* Status summary bar */}
      <View style={s.bar}>
        {[['pending','En attente'],['in_progress','En cours'],['ready','Prêts']].map(([k, l]) => (
          <View key={k} style={[s.barItem, { borderBottomColor: STATUS[k].color, borderBottomWidth: 2 }]}>
            <Text style={[s.barCount, { color: STATUS[k].color }]}>{groups[k].length}</Text>
            <Text style={s.barLabel}>{l}</Text>
          </View>
        ))}
      </View>

      {orders.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyIcon}>🍳</Text>
          <Text style={s.emptyTxt}>Aucune commande active</Text>
          <Text style={s.emptySub}>Les nouvelles commandes apparaissent automatiquement.</Text>
        </View>
      ) : (
        <FlatList
          data={[...groups.pending, ...groups.in_progress, ...groups.ready]}
          keyExtractor={o => o.id}
          renderItem={({ item }) => <OrderCard order={item} onAdvance={handleAdvance} />}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRef(true); load(); }} tintColor={theme.teal} />}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root:           { flex: 1, backgroundColor: theme.dark },
  center:         { flex: 1, backgroundColor: theme.dark, alignItems: 'center', justifyContent: 'center' },
  bar:            { flexDirection: 'row', backgroundColor: '#1a2328', paddingVertical: 12 },
  barItem:        { flex: 1, alignItems: 'center', marginHorizontal: 8 },
  barCount:       { fontSize: 24, fontWeight: '900' },
  barLabel:       { fontSize: 10, color: '#94a3b8', marginTop: 2 },
  list:           { padding: 12, paddingBottom: 40 },
  card:           { backgroundColor: '#2a3840', borderRadius: 12, padding: 14, marginBottom: 12 },
  cardUrgent:     { backgroundColor: '#2a1f1f' },
  cardHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  cardTable:      { color: theme.cream, fontWeight: '800', fontSize: 16 },
  cardTime:       { color: '#94a3b8', fontSize: 12, marginTop: 2 },
  statusBadge:    { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  statusBadgeTxt: { fontSize: 12, fontWeight: '700' },
  divider:        { height: 1, backgroundColor: '#1f2a2e', marginBottom: 10 },
  itemRow:        { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  itemQty:        { color: theme.teal, fontWeight: '800', fontSize: 14, width: 28 },
  itemName:       { color: theme.cream, fontSize: 14, fontWeight: '600' },
  itemNote:       { color: '#94a3b8', fontSize: 11, marginTop: 2, fontStyle: 'italic' },
  itemPrice:      { color: '#94a3b8', fontSize: 12, marginLeft: 6, minWidth: 50, textAlign: 'right' },
  orderNotes:     { backgroundColor: '#1f2a2e', borderRadius: 8, padding: 10, marginTop: 8, flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  orderNotesLabel:{ color: theme.saffron, fontWeight: '700', fontSize: 12 },
  orderNotesTxt:  { flex: 1, color: '#94a3b8', fontSize: 12 },
  cardFooter:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  cardTotal:      { color: theme.cream, fontWeight: '900', fontSize: 16 },
  advanceBtn:     { borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14 },
  advanceBtnTxt:  { color: theme.white, fontWeight: '800', fontSize: 13 },
  empty:          { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIcon:      { fontSize: 50, marginBottom: 16 },
  emptyTxt:       { fontSize: 18, fontWeight: '800', color: theme.cream, marginBottom: 8 },
  emptySub:       { fontSize: 13, color: '#94a3b8', textAlign: 'center' },
});
