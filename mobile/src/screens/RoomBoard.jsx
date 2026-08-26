import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Modal,
  RefreshControl, ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { api } from '../api';
import { useAppContext } from '../context/AppContext';
import { theme } from '../theme';

const STATUS_COLOR = {
  available:   theme.teal,
  occupied:    theme.coral,
  cleaning:    theme.saffron,
  maintenance: theme.gray,
};
const STATUS_LABEL = {
  available:   'Libre',
  occupied:    'Occupée',
  cleaning:    'Nettoyage',
  maintenance: 'Maintenance',
};

function RoomCell({ room, onPress }) {
  const color = STATUS_COLOR[room.status] || theme.gray;
  const isOccupied = room.status === 'occupied';
  return (
    <TouchableOpacity style={[s.cell, { borderTopColor: color, borderTopWidth: 3 }]} onPress={() => onPress(room)}>
      <Text style={s.cellNum}>{room.room_number}</Text>
      {isOccupied && room.last_name && (
        <Text style={s.cellGuest} numberOfLines={1}>{room.last_name}</Text>
      )}
      <View style={[s.cellDot, { backgroundColor: color }]} />
    </TouchableOpacity>
  );
}

export default function RoomBoard() {
  const navigation = useNavigation();
  const { state } = useAppContext();
  const propId = state.currentProperty?.id;

  const [rooms, setRooms]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRef]    = useState(false);
  const [selected, setSelected] = useState(null);
  const [payMethod, setPayMethod] = useState('cash');
  const [checking, setChecking]   = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!propId) return;
    if (!silent) setLoading(true);
    try {
      const data = await api.getRooms(propId);
      setRooms(data || []);
    } catch { /* silently ignore */ }
    finally { setLoading(false); setRef(false); }
  }, [propId]);

  useFocusEffect(useCallback(() => { load(true); }, [load]));

  function handlePress(room) {
    if (room.status === 'available') {
      navigation.navigate('Check-in', { preselectedRoom: room });
    } else if (room.status === 'occupied') {
      setPayMethod('cash');
      setSelected(room);
    } else {
      Alert.alert(
        STATUS_LABEL[room.status],
        `Chambre ${room.room_number}`,
        [
          { text: 'Annuler' },
          { text: 'Marquer Disponible', onPress: async () => {
            await api.updateRoomStatus(room.id, 'available');
            load(true);
          }},
        ]
      );
    }
  }

  async function handleCheckout() {
    if (!selected) return;
    const balance = Math.max(0, (selected.total_amount || 0) - (selected.paid_amount || 0));
    const shifts  = await api.getActiveShifts(propId).catch(() => []);
    const shiftId = shifts?.[0]?.id || null;
    setChecking(true);
    try {
      await api.checkout({
        reservation_id: selected.reservation_id,
        room_id:        selected.id,
        amount:         balance,
        payment_method: payMethod,
        shift_id:       shiftId,
        property_id:    propId,
      });
      setSelected(null);
      load(true);
    } catch (e) {
      Alert.alert('Erreur', e.message);
    } finally {
      setChecking(false);
    }
  }

  if (loading) {
    return <View style={s.center}><ActivityIndicator color={theme.teal} size="large" /></View>;
  }

  const balance = selected ? Math.max(0, (selected.total_amount || 0) - (selected.paid_amount || 0)) : 0;

  return (
    <View style={{ flex: 1, backgroundColor: theme.dark }}>
      {/* Legend */}
      <View style={s.legend}>
        {Object.entries(STATUS_COLOR).map(([st, col]) => (
          <View key={st} style={s.legendItem}>
            <View style={[s.legendDot, { backgroundColor: col }]} />
            <Text style={s.legendTxt}>{STATUS_LABEL[st]}</Text>
          </View>
        ))}
      </View>

      <FlatList
        data={rooms}
        keyExtractor={r => r.id}
        numColumns={4}
        contentContainerStyle={s.grid}
        renderItem={({ item }) => <RoomCell room={item} onPress={handlePress} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRef(true); load(); }} tintColor={theme.teal} />}
      />

      {/* Checkout bottom sheet */}
      <Modal visible={!!selected} animationType="slide" transparent>
        <View style={s.overlay}>
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>
              {selected?.last_name} {selected?.first_name}
            </Text>
            <Text style={s.sheetSub}>Ch. {selected?.room_number}</Text>
            {selected?.check_out_date && (
              <Text style={s.sheetInfo}>Départ : {selected.check_out_date}</Text>
            )}
            {balance > 0 && (
              <Text style={s.sheetBalance}>Solde dû : {balance.toFixed(2)} MAD</Text>
            )}

            {balance > 0 && (
              <>
                <Text style={s.payLabel}>Mode de paiement</Text>
                <View style={s.payRow}>
                  {[['cash','Espèces'],['card','Carte'],['bank_transfer','Virement']].map(([v, l]) => (
                    <TouchableOpacity
                      key={v}
                      style={[s.payBtn, payMethod === v && s.payBtnActive]}
                      onPress={() => setPayMethod(v)}
                    >
                      <Text style={[s.payBtnTxt, payMethod === v && { color: theme.teal }]}>{l}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            <TouchableOpacity style={s.checkoutBtn} onPress={handleCheckout} disabled={checking}>
              <Text style={s.checkoutBtnTxt}>
                {checking ? 'Traitement...' : balance > 0 ? `Encaisser ${balance.toFixed(2)} MAD et Check-out` : 'Check-out (solde nul)'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.cancelBtn} onPress={() => setSelected(null)}>
              <Text style={s.cancelBtnTxt}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  center:       { flex: 1, backgroundColor: theme.dark, alignItems: 'center', justifyContent: 'center' },
  legend:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 12, backgroundColor: '#1a2328' },
  legendItem:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot:    { width: 8, height: 8, borderRadius: 4 },
  legendTxt:    { color: '#94a3b8', fontSize: 11 },
  grid:         { padding: 8 },
  cell:         { flex: 1, margin: 4, backgroundColor: '#2a3840', borderRadius: 10, padding: 10, minHeight: 70, alignItems: 'center', justifyContent: 'space-between' },
  cellNum:      { color: theme.cream, fontWeight: '800', fontSize: 15 },
  cellGuest:    { color: '#94a3b8', fontSize: 9, textAlign: 'center' },
  cellDot:      { width: 6, height: 6, borderRadius: 3, marginTop: 4 },
  overlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet:        { backgroundColor: '#2a3840', borderRadius: 20, padding: 24, paddingBottom: 40 },
  sheetTitle:   { fontSize: 20, fontWeight: '800', color: theme.cream, marginBottom: 2 },
  sheetSub:     { fontSize: 13, color: '#94a3b8', marginBottom: 8 },
  sheetInfo:    { fontSize: 13, color: theme.cream, marginBottom: 4 },
  sheetBalance: { fontSize: 18, fontWeight: '900', color: theme.coral, marginVertical: 12 },
  payLabel:     { fontSize: 11, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  payRow:       { flexDirection: 'row', gap: 8, marginBottom: 16 },
  payBtn:       { flex: 1, padding: 10, borderRadius: 8, backgroundColor: '#1f2a2e', alignItems: 'center' },
  payBtnActive: { backgroundColor: `${theme.teal}20`, borderWidth: 1.5, borderColor: theme.teal },
  payBtnTxt:    { color: '#94a3b8', fontWeight: '600', fontSize: 13 },
  checkoutBtn:  { backgroundColor: theme.teal, borderRadius: 12, padding: 15, alignItems: 'center', marginBottom: 10 },
  checkoutBtnTxt: { color: theme.white, fontWeight: '800', fontSize: 15 },
  cancelBtn:    { alignItems: 'center', padding: 12 },
  cancelBtnTxt: { color: '#94a3b8', fontSize: 14 },
});
