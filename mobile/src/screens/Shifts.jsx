import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal,
  TextInput, RefreshControl, Alert, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../api';
import { useAppContext } from '../context/AppContext';
import { theme } from '../theme';

const CAT_LABEL = {
  accommodation: 'Hébergement', fnb: 'F&B', other: 'Autre',
  advance: 'Avance', discount: 'Remise', expense: 'Dépense',
};
const METHOD_LABEL = { cash: 'Espèces', card: 'Carte', bank_transfer: 'Virement' };

function ShiftSummary({ shift }) {
  const income  = (shift.transactions || []).filter(t => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0);
  const expense = (shift.transactions || []).filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0);
  return (
    <View style={s.shiftCard}>
      <View style={s.shiftHeader}>
        <Text style={s.shiftTitle}>Shift ouvert</Text>
        <View style={[s.badge, { backgroundColor: '#22c55e20' }]}>
          <Text style={[s.badgeTxt, { color: '#22c55e' }]}>Actif</Text>
        </View>
      </View>
      <Text style={s.shiftStaff}>{shift.opened_by_name}</Text>
      <Text style={s.shiftDate}>Depuis le {shift.opened_at?.split('T')[0]} à {shift.opened_at?.split('T')[1]?.slice(0,5)}</Text>
      <View style={s.balRow}>
        <View style={s.balItem}>
          <Text style={s.balLabel}>Recettes</Text>
          <Text style={[s.balVal, { color: theme.teal }]}>{income.toFixed(2)}</Text>
        </View>
        <View style={s.balItem}>
          <Text style={s.balLabel}>Dépenses</Text>
          <Text style={[s.balVal, { color: theme.coral }]}>{expense.toFixed(2)}</Text>
        </View>
        <View style={s.balItem}>
          <Text style={s.balLabel}>Net</Text>
          <Text style={[s.balVal, { color: income - expense >= 0 ? theme.teal : theme.coral }]}>
            {(income - expense).toFixed(2)}
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function Shifts() {
  const { state } = useAppContext();
  const propId    = state.currentProperty?.id;

  const [shift, setShift]       = useState(null);
  const [txns, setTxns]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRef]    = useState(false);
  const [opening, setOpening]   = useState(false);
  const [showModal, setModal]   = useState(false);

  const [txForm, setTxForm] = useState({
    type: 'income', category: 'accommodation', amount: '',
    payment_method: 'cash', description: '',
  });
  const [savingTx, setSavingTx] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!propId) return;
    if (!silent) setLoading(true);
    try {
      const shifts = await api.getActiveShifts(propId);
      const active = shifts?.[0] || null;
      setShift(active);
      if (active) {
        const t = await api.getTransactions(active.id);
        setTxns(t || []);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); setRef(false); }
  }, [propId]);

  useFocusEffect(useCallback(() => { load(true); }, [load]));

  async function handleOpenShift() {
    if (!propId) return;
    setOpening(true);
    try {
      await api.openShift({ property_id: propId });
      load(true);
    } catch (e) {
      Alert.alert('Erreur', e.message);
    } finally {
      setOpening(false);
    }
  }

  async function handleAddTx() {
    if (!txForm.amount || isNaN(parseFloat(txForm.amount))) {
      Alert.alert('', 'Entrez un montant valide');
      return;
    }
    setSavingTx(true);
    try {
      await api.addTransaction({
        shift_id:       shift.id,
        property_id:    propId,
        type:           txForm.type,
        category:       txForm.category,
        amount:         parseFloat(txForm.amount),
        payment_method: txForm.payment_method,
        description:    txForm.description,
      });
      setModal(false);
      setTxForm({ type: 'income', category: 'accommodation', amount: '', payment_method: 'cash', description: '' });
      load(true);
    } catch (e) {
      Alert.alert('Erreur', e.message);
    } finally {
      setSavingTx(false);
    }
  }

  function setTx(k, v) { setTxForm(f => ({ ...f, [k]: v })); }

  if (loading) {
    return <View style={s.center}><ActivityIndicator color={theme.teal} size="large" /></View>;
  }

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRef(true); load(); }} tintColor={theme.teal} />}
    >
      {!shift ? (
        <View style={s.noShift}>
          <Text style={s.noShiftIcon}>⏱</Text>
          <Text style={s.noShiftTxt}>Aucun shift ouvert</Text>
          <Text style={s.noShiftSub}>Ouvrez un shift pour commencer à enregistrer des transactions.</Text>
          <TouchableOpacity style={s.openBtn} onPress={handleOpenShift} disabled={opening}>
            {opening
              ? <ActivityIndicator color={theme.white} />
              : <Text style={s.openBtnTxt}>Ouvrir le shift</Text>
            }
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <ShiftSummary shift={{ ...shift, transactions: txns }} />

          <TouchableOpacity style={s.addTxBtn} onPress={() => setModal(true)}>
            <Text style={s.addTxBtnTxt}>+ Ajouter une transaction</Text>
          </TouchableOpacity>

          <Text style={s.txTitle}>Transactions ({txns.length})</Text>
          {txns.length === 0 && (
            <Text style={s.noTxTxt}>Aucune transaction pour ce shift.</Text>
          )}
          {txns.map(t => (
            <View key={t.id} style={s.txCard}>
              <View style={{ flex: 1 }}>
                <Text style={s.txDesc}>{t.description || CAT_LABEL[t.category] || t.category}</Text>
                <Text style={s.txMeta}>{METHOD_LABEL[t.payment_method] || t.payment_method} · {t.created_at?.split('T')[1]?.slice(0,5)}</Text>
              </View>
              <Text style={[s.txAmt, { color: t.type === 'income' ? theme.teal : theme.coral }]}>
                {t.type === 'income' ? '+' : '-'}{(t.amount || 0).toFixed(2)} MAD
              </Text>
            </View>
          ))}
        </>
      )}

      {/* Add transaction modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={s.overlay}>
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>Nouvelle transaction</Text>

            <Text style={s.formLabel}>Type</Text>
            <View style={s.rowPills}>
              {[['income','Recette'],['expense','Dépense']].map(([v, l]) => (
                <TouchableOpacity key={v} style={[s.pill, txForm.type === v && s.pillActive]} onPress={() => setTx('type', v)}>
                  <Text style={[s.pillTxt, txForm.type === v && { color: theme.teal }]}>{l}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.formLabel}>Catégorie</Text>
            <View style={s.rowPills}>
              {(txForm.type === 'income'
                ? [['accommodation','Hébergement'],['fnb','F&B'],['other','Autre']]
                : [['expense','Dépense'],['advance','Avance'],['discount','Remise']]
              ).map(([v, l]) => (
                <TouchableOpacity key={v} style={[s.pill, txForm.category === v && s.pillActive]} onPress={() => setTx('category', v)}>
                  <Text style={[s.pillTxt, txForm.category === v && { color: theme.teal }]}>{l}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.formLabel}>Montant (MAD)</Text>
            <TextInput
              style={s.input} value={txForm.amount} onChangeText={v => setTx('amount', v)}
              keyboardType="numeric" placeholder="0.00" placeholderTextColor="#64748b"
            />

            <Text style={s.formLabel}>Mode de paiement</Text>
            <View style={s.rowPills}>
              {[['cash','Espèces'],['card','Carte'],['bank_transfer','Virement']].map(([v, l]) => (
                <TouchableOpacity key={v} style={[s.pill, txForm.payment_method === v && s.pillActive]} onPress={() => setTx('payment_method', v)}>
                  <Text style={[s.pillTxt, txForm.payment_method === v && { color: theme.teal }]}>{l}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.formLabel}>Description (optionnelle)</Text>
            <TextInput
              style={s.input} value={txForm.description} onChangeText={v => setTx('description', v)}
              placeholder="..." placeholderTextColor="#64748b"
            />

            <TouchableOpacity style={s.saveBtn} onPress={handleAddTx} disabled={savingTx}>
              {savingTx ? <ActivityIndicator color={theme.white} /> : <Text style={s.saveBtnTxt}>Enregistrer</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={s.cancelBtn} onPress={() => setModal(false)}>
              <Text style={s.cancelTxt}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root:       { flex: 1, backgroundColor: theme.dark },
  content:    { padding: 20, paddingBottom: 40 },
  center:     { flex: 1, backgroundColor: theme.dark, alignItems: 'center', justifyContent: 'center' },
  noShift:    { alignItems: 'center', paddingTop: 60 },
  noShiftIcon:{ fontSize: 50, marginBottom: 16 },
  noShiftTxt: { fontSize: 18, fontWeight: '800', color: theme.cream, marginBottom: 8 },
  noShiftSub: { fontSize: 13, color: '#94a3b8', textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  openBtn:    { backgroundColor: theme.teal, borderRadius: 12, padding: 15, paddingHorizontal: 32 },
  openBtnTxt: { color: theme.white, fontWeight: '800', fontSize: 15 },
  shiftCard:  { backgroundColor: '#2a3840', borderRadius: 12, padding: 16, marginBottom: 14 },
  shiftHeader:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  shiftTitle: { fontSize: 15, fontWeight: '800', color: theme.cream },
  badge:      { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeTxt:   { fontSize: 11, fontWeight: '700' },
  shiftStaff: { color: '#94a3b8', fontSize: 13, marginBottom: 2 },
  shiftDate:  { color: '#64748b', fontSize: 11, marginBottom: 14 },
  balRow:     { flexDirection: 'row' },
  balItem:    { flex: 1, alignItems: 'center' },
  balLabel:   { color: '#94a3b8', fontSize: 11, marginBottom: 4 },
  balVal:     { fontSize: 17, fontWeight: '900' },
  addTxBtn:   { backgroundColor: '#2a3840', borderRadius: 10, padding: 13, alignItems: 'center', marginBottom: 16, borderWidth: 1.5, borderColor: theme.teal, borderStyle: 'dashed' },
  addTxBtnTxt:{ color: theme.teal, fontWeight: '700', fontSize: 14 },
  txTitle:    { fontSize: 12, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  noTxTxt:    { color: '#64748b', fontSize: 13, textAlign: 'center', marginTop: 8 },
  txCard:     { backgroundColor: '#2a3840', borderRadius: 10, padding: 13, marginBottom: 8, flexDirection: 'row', alignItems: 'center' },
  txDesc:     { color: theme.cream, fontWeight: '600', fontSize: 13 },
  txMeta:     { color: '#64748b', fontSize: 11, marginTop: 2 },
  txAmt:      { fontWeight: '800', fontSize: 15, marginLeft: 8 },
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet:      { backgroundColor: '#2a3840', borderRadius: 20, padding: 24, paddingBottom: 40 },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: theme.cream, marginBottom: 16 },
  formLabel:  { fontSize: 11, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  rowPills:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  pill:       { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#1f2a2e', borderRadius: 20 },
  pillActive: { backgroundColor: `${theme.teal}20`, borderWidth: 1.5, borderColor: theme.teal },
  pillTxt:    { color: '#94a3b8', fontWeight: '600', fontSize: 13 },
  input:      { backgroundColor: '#1f2a2e', color: theme.cream, borderRadius: 8, padding: 12, fontSize: 14, marginBottom: 14 },
  saveBtn:    { backgroundColor: theme.teal, borderRadius: 12, padding: 15, alignItems: 'center', marginBottom: 10 },
  saveBtnTxt: { color: theme.white, fontWeight: '800', fontSize: 15 },
  cancelBtn:  { alignItems: 'center', padding: 10 },
  cancelTxt:  { color: '#94a3b8', fontSize: 14 },
});
