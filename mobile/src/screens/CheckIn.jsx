import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { api } from '../api';
import { useAppContext } from '../context/AppContext';
import { theme } from '../theme';

const FIELD_S = {
  backgroundColor: '#2a3840', color: '#e2e8f0', borderRadius: 8,
  padding: 12, fontSize: 14, borderWidth: 1, borderColor: '#3a4850', marginBottom: 12,
};

function Field({ label, ...props }) {
  return (
    <View>
      {label && <Text style={s.label}>{label}</Text>}
      <TextInput style={FIELD_S} placeholderTextColor="#64748b" {...props} />
    </View>
  );
}

function Section({ title, children }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

const today = () => new Date().toISOString().split('T')[0];
const tomorrow = () => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0]; };

export default function CheckIn() {
  const navigation = useNavigation();
  const route      = useRoute();
  const { state }  = useAppContext();
  const propId     = state.currentProperty?.id;

  const preselectedRoom = route.params?.preselectedRoom;
  const [rooms, setRooms] = useState([]);
  const [guestQuery, setGuestQuery] = useState('');
  const [guestResults, setGuestResults] = useState([]);
  const [searchTimer, setSearchTimer] = useState(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    last_name: '', first_name: '', date_of_birth: '', place_of_birth: '',
    nationality: '', profession: '', permanent_address: '',
    document_type: 'CIN', document_number: '', document_issued_at: '', document_issued_date: '',
    phone: '', email: '',
    room_id: preselectedRoom?.id || '',
    check_in_date: today(), check_out_date: tomorrow(),
    arrival_time: '', coming_from: '', going_to: '', morocco_entry_number: '',
    adults: '1', children: '0', price_per_night: '',
    payment_type: 'checkout', channel: 'direct',
    guest_id: null,
  });

  useEffect(() => {
    if (propId) {
      api.getRooms(propId).then(r => setRooms((r || []).filter(rm => rm.status === 'available')));
    }
  }, [propId]);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  function searchGuest(q) {
    setGuestQuery(q);
    if (searchTimer) clearTimeout(searchTimer);
    if (q.length < 2) { setGuestResults([]); return; }
    setSearchTimer(setTimeout(async () => {
      try {
        const results = await api.searchGuests(q);
        setGuestResults(results || []);
      } catch { setGuestResults([]); }
    }, 400));
  }

  function selectGuest(g) {
    setForm(f => ({
      ...f,
      guest_id: g.id, last_name: g.last_name, first_name: g.first_name,
      date_of_birth: g.date_of_birth || '', place_of_birth: g.place_of_birth || '',
      nationality: g.nationality || '', profession: g.profession || '',
      permanent_address: g.permanent_address || '',
      document_type: g.document_type || 'CIN', document_number: g.document_number || '',
      document_issued_at: g.document_issued_at || '', document_issued_date: g.document_issued_date || '',
      phone: g.phone || '', email: g.email || '',
    }));
    setGuestQuery(`${g.last_name} ${g.first_name}`);
    setGuestResults([]);
  }

  async function handleSubmit() {
    if (!form.room_id) { Alert.alert('', 'Sélectionnez une chambre'); return; }
    if (!form.last_name.trim()) { Alert.alert('', 'Nom de famille requis'); return; }
    if (!form.first_name.trim()) { Alert.alert('', 'Prénom requis'); return; }
    if (!form.check_in_date || !form.check_out_date) { Alert.alert('', 'Dates requises'); return; }

    setSaving(true);
    try {
      await api.checkIn({
        property_id: propId,
        room_id: form.room_id,
        guest_id: form.guest_id || null,
        guest: {
          last_name: form.last_name, first_name: form.first_name,
          date_of_birth: form.date_of_birth, place_of_birth: form.place_of_birth,
          nationality: form.nationality, profession: form.profession,
          permanent_address: form.permanent_address,
          document_type: form.document_type, document_number: form.document_number,
          document_issued_at: form.document_issued_at, document_issued_date: form.document_issued_date,
        },
        check_in_date: form.check_in_date, check_out_date: form.check_out_date,
        arrival_time: form.arrival_time, coming_from: form.coming_from,
        going_to: form.going_to, morocco_entry_number: form.morocco_entry_number,
        adults: parseInt(form.adults) || 1, children: parseInt(form.children) || 0,
        price_per_night: parseFloat(form.price_per_night) || 0,
        payment_type: form.payment_type, channel: form.channel,
      });
      Alert.alert('✓ Check-in effectué', `${form.last_name} ${form.first_name}`, [
        { text: 'OK', onPress: () => navigation.navigate('Chambres') },
      ]);
    } catch (e) {
      Alert.alert('Erreur', e.message);
    } finally {
      setSaving(false);
    }
  }

  const roomSelected = rooms.find(r => r.id === form.room_id) || preselectedRoom;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: theme.dark }}>
      <ScrollView contentContainerStyle={s.root} keyboardShouldPersistTaps="handled">

        {/* Guest search */}
        <Section title="Client">
          <Field
            label="Rechercher un client existant"
            value={guestQuery}
            onChangeText={searchGuest}
            placeholder="Nom, prénom ou n° document..."
          />
          {guestResults.map(g => (
            <TouchableOpacity key={g.id} style={s.result} onPress={() => selectGuest(g)}>
              <Text style={s.resultName}>{g.last_name} {g.first_name}</Text>
              <Text style={s.resultSub}>{g.nationality} · {g.document_number}</Text>
            </TouchableOpacity>
          ))}
          {form.guest_id && <Text style={s.guestBadge}>✓ Client existant sélectionné</Text>}
        </Section>

        {/* Guest info */}
        <Section title="Identité">
          <View style={s.row}>
            <View style={{ flex: 1 }}><Field label="Nom *" value={form.last_name} onChangeText={v => set('last_name', v)} placeholder="ALAMI" /></View>
            <View style={{ width: 10 }} />
            <View style={{ flex: 1 }}><Field label="Prénom *" value={form.first_name} onChangeText={v => set('first_name', v)} placeholder="Mohammed" /></View>
          </View>
          <View style={s.row}>
            <View style={{ flex: 1 }}><Field label="Date naissance" value={form.date_of_birth} onChangeText={v => set('date_of_birth', v)} placeholder="AAAA-MM-JJ" /></View>
            <View style={{ width: 10 }} />
            <View style={{ flex: 1 }}><Field label="Lieu naissance" value={form.place_of_birth} onChangeText={v => set('place_of_birth', v)} placeholder="Tanger" /></View>
          </View>
          <Field label="Nationalité" value={form.nationality} onChangeText={v => set('nationality', v)} placeholder="Marocaine" />
          <Field label="Profession" value={form.profession} onChangeText={v => set('profession', v)} placeholder="Ingénieur" />
          <Field label="Adresse permanente" value={form.permanent_address} onChangeText={v => set('permanent_address', v)} placeholder="..." multiline />
        </Section>

        {/* Document */}
        <Section title="Document d'identité">
          <View style={s.row}>
            {['CIN','Passeport','Carte séjour','Permis'].map(t => (
              <TouchableOpacity key={t} style={[s.docChip, form.document_type === t && s.docChipActive]} onPress={() => set('document_type', t)}>
                <Text style={[s.docChipTxt, form.document_type === t && { color: theme.teal }]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Field label="N° document" value={form.document_number} onChangeText={v => set('document_number', v)} placeholder="AB123456" />
          <View style={s.row}>
            <View style={{ flex: 1 }}><Field label="Délivré à" value={form.document_issued_at} onChangeText={v => set('document_issued_at', v)} placeholder="Rabat" /></View>
            <View style={{ width: 10 }} />
            <View style={{ flex: 1 }}><Field label="Le" value={form.document_issued_date} onChangeText={v => set('document_issued_date', v)} placeholder="AAAA-MM-JJ" /></View>
          </View>
        </Section>

        {/* Room & Dates */}
        <Section title="Chambre & Dates">
          <Text style={s.label}>Chambre *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            {rooms.map(r => (
              <TouchableOpacity key={r.id} style={[s.roomChip, form.room_id === r.id && s.roomChipActive]} onPress={() => set('room_id', r.id)}>
                <Text style={[s.roomChipTxt, form.room_id === r.id && { color: theme.teal }]}>Ch. {r.room_number}</Text>
                <Text style={s.roomPrice}>{r.price_per_night} MAD</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {roomSelected && !rooms.find(r => r.id === form.room_id) && (
            <Text style={s.roomPre}>Chambre pré-sélectionnée : Ch. {preselectedRoom?.room_number}</Text>
          )}
          <View style={s.row}>
            <View style={{ flex: 1 }}><Field label="Arrivée *" value={form.check_in_date} onChangeText={v => set('check_in_date', v)} placeholder="AAAA-MM-JJ" /></View>
            <View style={{ width: 10 }} />
            <View style={{ flex: 1 }}><Field label="Départ *" value={form.check_out_date} onChangeText={v => set('check_out_date', v)} placeholder="AAAA-MM-JJ" /></View>
          </View>
          <View style={s.row}>
            <View style={{ flex: 1 }}><Field label="Heure d'arrivée" value={form.arrival_time} onChangeText={v => set('arrival_time', v)} placeholder="14:00" /></View>
            <View style={{ width: 10 }} />
            <View style={{ flex: 1 }}><Field label="Prix/nuit (MAD)" value={form.price_per_night} onChangeText={v => set('price_per_night', v)} keyboardType="numeric" placeholder="350" /></View>
          </View>
          <View style={s.row}>
            <View style={{ flex: 1 }}><Field label="Adultes" value={form.adults} onChangeText={v => set('adults', v)} keyboardType="numeric" /></View>
            <View style={{ width: 10 }} />
            <View style={{ flex: 1 }}><Field label="Enfants" value={form.children} onChangeText={v => set('children', v)} keyboardType="numeric" /></View>
          </View>
        </Section>

        {/* Travel */}
        <Section title="Voyage">
          <View style={s.row}>
            <View style={{ flex: 1 }}><Field label="Venant de" value={form.coming_from} onChangeText={v => set('coming_from', v)} placeholder="Casablanca" /></View>
            <View style={{ width: 10 }} />
            <View style={{ flex: 1 }}><Field label="Allant à" value={form.going_to} onChangeText={v => set('going_to', v)} placeholder="Tétouan" /></View>
          </View>
          <Field label="N° entrée Maroc" value={form.morocco_entry_number} onChangeText={v => set('morocco_entry_number', v)} placeholder="..." />
        </Section>

        {/* Payment */}
        <Section title="Paiement">
          <Text style={s.label}>Mode</Text>
          <View style={s.row}>
            {[['checkout','À la sortie'],['immediate','Immédiat'],['deposit','Acompte']].map(([v, l]) => (
              <TouchableOpacity key={v} style={[s.docChip, form.payment_type === v && s.docChipActive]} onPress={() => set('payment_type', v)}>
                <Text style={[s.docChipTxt, form.payment_type === v && { color: theme.teal }]}>{l}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Section>

        <TouchableOpacity style={s.submitBtn} onPress={handleSubmit} disabled={saving}>
          {saving
            ? <ActivityIndicator color={theme.white} />
            : <Text style={s.submitTxt}>✓ Confirmer le Check-in</Text>
          }
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root:         { padding: 16, paddingBottom: 40 },
  section:      { backgroundColor: '#2a3840', borderRadius: 12, padding: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  label:        { fontSize: 11, fontWeight: '600', color: '#94a3b8', marginBottom: 5 },
  row:          { flexDirection: 'row' },
  result:       { backgroundColor: '#1f2a2e', borderRadius: 8, padding: 12, marginBottom: 6 },
  resultName:   { color: theme.cream, fontWeight: '700', fontSize: 14 },
  resultSub:    { color: '#94a3b8', fontSize: 12, marginTop: 2 },
  guestBadge:   { color: theme.teal, fontSize: 12, fontWeight: '600', marginTop: 4 },
  docChip:      { flex: 1, padding: 8, borderRadius: 8, backgroundColor: '#1f2a2e', alignItems: 'center', marginRight: 6, marginBottom: 10 },
  docChipActive:{ backgroundColor: `${theme.teal}20`, borderWidth: 1.5, borderColor: theme.teal },
  docChipTxt:   { color: '#94a3b8', fontWeight: '600', fontSize: 11 },
  roomChip:     { padding: 10, borderRadius: 8, backgroundColor: '#1f2a2e', marginRight: 8, minWidth: 80, alignItems: 'center' },
  roomChipActive:{ backgroundColor: `${theme.teal}20`, borderWidth: 1.5, borderColor: theme.teal },
  roomChipTxt:  { color: theme.cream, fontWeight: '700', fontSize: 13 },
  roomPrice:    { color: '#94a3b8', fontSize: 11, marginTop: 2 },
  roomPre:      { color: theme.teal, fontSize: 12, marginBottom: 8 },
  submitBtn:    { backgroundColor: theme.teal, borderRadius: 12, padding: 17, alignItems: 'center', marginTop: 8 },
  submitTxt:    { color: theme.white, fontWeight: '800', fontSize: 16 },
});
