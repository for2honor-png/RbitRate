import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Modal, ScrollView,
} from 'react-native';
import { api } from '../api';
import { theme } from '../theme';

const TAG_COLOR = {
  vip:       { bg: '#fef9c3', text: '#a16207' },
  blacklist: { bg: '#fee2e2', text: '#991b1b' },
  regular:   { bg: '#e8f4f0', text: '#0f766e' },
};

function TagBadge({ tag }) {
  const c = TAG_COLOR[tag] || TAG_COLOR.regular;
  return (
    <View style={[s.tag, { backgroundColor: c.bg }]}>
      <Text style={[s.tagTxt, { color: c.text }]}>{tag?.toUpperCase() || 'REGULAR'}</Text>
    </View>
  );
}

function GuestCard({ guest, onPress }) {
  const isBlacklist = guest.tag === 'blacklist';
  return (
    <TouchableOpacity style={[s.card, isBlacklist && s.cardBlacklist]} onPress={() => onPress(guest)}>
      <View style={{ flex: 1 }}>
        <Text style={[s.cardName, isBlacklist && { color: theme.coral }]}>
          {guest.last_name} {guest.first_name}
        </Text>
        <Text style={s.cardSub}>{guest.nationality} · {guest.document_number}</Text>
        {guest.phone && <Text style={s.cardSub}>📞 {guest.phone}</Text>}
      </View>
      <TagBadge tag={guest.tag} />
    </TouchableOpacity>
  );
}

export default function GuestSearch() {
  const [query, setQuery]       = useState('');
  const [results, setResults]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail]     = useState(null);
  const timer = useRef(null);

  function handleSearch(q) {
    setQuery(q);
    if (timer.current) clearTimeout(timer.current);
    if (q.length < 2) { setResults([]); return; }
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.searchGuests(q);
        setResults(res || []);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 400);
  }

  async function openGuest(guest) {
    try {
      const d = await api.getGuest(guest.id);
      setDetail(d);
      setSelected(guest);
    } catch {
      setSelected(guest);
      setDetail({ guest, history: [] });
    }
  }

  return (
    <View style={s.root}>
      <View style={s.searchBar}>
        <Text style={s.searchIcon}>🔍</Text>
        <TextInput
          style={s.searchInput}
          value={query}
          onChangeText={handleSearch}
          placeholder="Nom, prénom ou n° document..."
          placeholderTextColor="#64748b"
          autoFocus
        />
        {loading && <ActivityIndicator color={theme.teal} size="small" />}
      </View>

      <FlatList
        data={results}
        keyExtractor={g => g.id}
        renderItem={({ item }) => <GuestCard guest={item} onPress={openGuest} />}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          query.length < 2 ? (
            <View style={s.empty}>
              <Text style={s.emptyIcon}>👥</Text>
              <Text style={s.emptyTxt}>Tapez au moins 2 caractères pour rechercher</Text>
            </View>
          ) : !loading ? (
            <View style={s.empty}>
              <Text style={s.emptyTxt}>Aucun client trouvé</Text>
            </View>
          ) : null
        }
      />

      {/* Guest detail modal */}
      <Modal visible={!!selected} animationType="slide">
        <View style={s.modal}>
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={() => { setSelected(null); setDetail(null); }}>
              <Text style={s.back}>← Retour</Text>
            </TouchableOpacity>
            <TagBadge tag={selected?.tag} />
          </View>

          <ScrollView contentContainerStyle={s.modalContent}>
            <Text style={[s.detailName, selected?.tag === 'blacklist' && { color: theme.coral }]}>
              {selected?.last_name} {selected?.first_name}
            </Text>
            {selected?.tag === 'blacklist' && (
              <View style={s.blacklistBanner}>
                <Text style={s.blacklistTxt}>⚠ Client sur liste noire — vérifiez avant d'accepter la réservation</Text>
              </View>
            )}

            <View style={s.infoBlock}>
              {[
                ['Nationalité',  selected?.nationality],
                ['Naissance',    selected?.date_of_birth],
                ['Lieu naiss.',  selected?.place_of_birth],
                ['Profession',   selected?.profession],
                ['Téléphone',    selected?.phone],
                ['Email',        selected?.email],
                ['Document',     `${selected?.document_type || ''} ${selected?.document_number || ''}`],
                ['Délivré à',    selected?.document_issued_at],
                ['Adresse',      selected?.permanent_address],
              ].filter(([,v]) => v).map(([label, value]) => (
                <View key={label} style={s.infoRow}>
                  <Text style={s.infoLabel}>{label}</Text>
                  <Text style={s.infoVal}>{value}</Text>
                </View>
              ))}
            </View>

            <Text style={s.historyTitle}>Historique des séjours ({detail?.history?.length || 0})</Text>
            {(detail?.history || []).map((r, i) => (
              <View key={i} style={s.historyCard}>
                <Text style={s.historyProp}>{r.property_name}</Text>
                <Text style={s.historyRoom}>Ch. {r.room_number} · {r.check_in_date} → {r.check_out_date}</Text>
                <Text style={s.historyAmt}>{r.total_amount} MAD</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root:          { flex: 1, backgroundColor: theme.dark },
  searchBar:     { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2a3840', margin: 16, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 4 },
  searchIcon:    { fontSize: 16, marginRight: 8 },
  searchInput:   { flex: 1, color: theme.cream, fontSize: 15, padding: 10 },
  empty:         { alignItems: 'center', paddingTop: 60 },
  emptyIcon:     { fontSize: 40, marginBottom: 10 },
  emptyTxt:      { color: '#64748b', fontSize: 14 },
  card:          { backgroundColor: '#2a3840', borderRadius: 12, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center' },
  cardBlacklist: { borderLeftWidth: 4, borderLeftColor: theme.coral },
  cardName:      { color: theme.cream, fontWeight: '700', fontSize: 15 },
  cardSub:       { color: '#94a3b8', fontSize: 12, marginTop: 2 },
  tag:           { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  tagTxt:        { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  modal:         { flex: 1, backgroundColor: theme.dark },
  modalHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 60, backgroundColor: '#2a3840' },
  back:          { color: theme.teal, fontSize: 16, fontWeight: '700' },
  modalContent:  { padding: 20, paddingBottom: 40 },
  detailName:    { fontSize: 22, fontWeight: '900', color: theme.cream, marginBottom: 12 },
  blacklistBanner: { backgroundColor: '#fee2e2', borderRadius: 8, padding: 12, marginBottom: 16 },
  blacklistTxt:  { color: '#991b1b', fontWeight: '600', fontSize: 13 },
  infoBlock:     { backgroundColor: '#2a3840', borderRadius: 12, padding: 16, marginBottom: 20 },
  infoRow:       { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#1f2a2e' },
  infoLabel:     { width: 90, color: '#94a3b8', fontSize: 13 },
  infoVal:       { flex: 1, color: theme.cream, fontSize: 13 },
  historyTitle:  { fontSize: 13, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  historyCard:   { backgroundColor: '#2a3840', borderRadius: 10, padding: 12, marginBottom: 8 },
  historyProp:   { color: theme.teal, fontWeight: '700', fontSize: 13 },
  historyRoom:   { color: theme.cream, fontSize: 12, marginTop: 2 },
  historyAmt:    { color: '#94a3b8', fontSize: 12, marginTop: 2 },
});
