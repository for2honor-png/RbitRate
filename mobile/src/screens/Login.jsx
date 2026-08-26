import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
  Alert, ScrollView, Pressable,
} from 'react-native';
import { api, setAuthToken } from '../api';
import { useAppContext } from '../context/AppContext';
import { theme } from '../theme';

export default function Login() {
  const { setState } = useAppContext();
  const [staff, setStaff]         = useState([]);
  const [selected, setSelected]   = useState(null);
  const [pin, setPin]             = useState('');
  const [loading, setLoading]     = useState(true);
  const [logging, setLogging]     = useState(false);

  useEffect(() => {
    api.getStaffList()
      .then(list => { setStaff(list || []); setLoading(false); })
      .catch(() => { setLoading(false); Alert.alert('Erreur', 'Impossible de contacter le bureau'); });
  }, []);

  function pressDigit(d) {
    if (pin.length >= 4) return;
    setPin(p => p + d);
  }

  function pressDelete() {
    setPin(p => p.slice(0, -1));
  }

  async function handleLogin() {
    if (!selected) { Alert.alert('', 'Sélectionnez un membre du personnel'); return; }
    if (pin.length !== 4) { Alert.alert('', 'Entrez votre code PIN à 4 chiffres'); return; }
    setLogging(true);
    try {
      const { token, staff: me } = await api.login({ staff_id: selected.id, pin });
      await setAuthToken(token);
      setState(s => ({ ...s, isLoggedIn: true, currentStaff: me }));
    } catch {
      Alert.alert('PIN incorrect', 'Vérifiez votre code PIN');
      setPin('');
    } finally {
      setLogging(false);
    }
  }

  useEffect(() => {
    if (pin.length === 4 && selected) handleLogin();
  }, [pin]);

  if (loading) {
    return (
      <View style={s.root}>
        <ActivityIndicator color={theme.teal} size="large" />
      </View>
    );
  }

  const DIGITS = [['1','2','3'],['4','5','6'],['7','8','9'],['','0','⌫']];

  return (
    <ScrollView contentContainerStyle={s.root} keyboardShouldPersistTaps="handled">
      <Text style={s.logo}>RbitRate</Text>

      <Text style={s.label}>Personnel</Text>
      <View style={s.staffRow}>
        {staff.map(m => (
          <TouchableOpacity
            key={m.id}
            style={[s.staffBtn, selected?.id === m.id && s.staffBtnActive]}
            onPress={() => { setSelected(m); setPin(''); }}
          >
            <View style={[s.avatar, selected?.id === m.id && s.avatarActive]}>
              <Text style={s.avatarTxt}>{m.full_name.charAt(0).toUpperCase()}</Text>
            </View>
            <Text style={[s.staffName, selected?.id === m.id && { color: theme.teal }]} numberOfLines={1}>
              {m.full_name.split(' ')[0]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {selected && (
        <>
          <Text style={s.label}>Code PIN</Text>
          <View style={s.pinRow}>
            {[0,1,2,3].map(i => (
              <View key={i} style={[s.pinDot, pin.length > i && s.pinDotFilled]} />
            ))}
          </View>

          <View style={s.pad}>
            {DIGITS.map((row, ri) => (
              <View key={ri} style={s.padRow}>
                {row.map((d, di) => (
                  <Pressable
                    key={di}
                    style={({ pressed }) => [s.padKey, !d && s.padKeyEmpty, pressed && d && s.padKeyPressed]}
                    onPress={() => d === '⌫' ? pressDelete() : d ? pressDigit(d) : null}
                  >
                    <Text style={s.padKeyTxt}>{d}</Text>
                  </Pressable>
                ))}
              </View>
            ))}
          </View>

          <TouchableOpacity style={s.btn} onPress={handleLogin} disabled={logging}>
            {logging
              ? <ActivityIndicator color={theme.white} />
              : <Text style={s.btnTxt}>Se connecter</Text>
            }
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root:           { flexGrow: 1, backgroundColor: theme.dark, padding: 24, alignItems: 'center', paddingTop: 60 },
  logo:           { fontSize: 28, fontWeight: '900', color: theme.teal, marginBottom: 32 },
  label:          { fontSize: 11, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12, alignSelf: 'flex-start', width: '100%' },
  staffRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 28, width: '100%' },
  staffBtn:       { alignItems: 'center', width: 70 },
  staffBtnActive: {},
  avatar:         { width: 50, height: 50, borderRadius: 25, backgroundColor: '#2a3840', alignItems: 'center', justifyContent: 'center', marginBottom: 5 },
  avatarActive:   { backgroundColor: `${theme.teal}22`, borderWidth: 2, borderColor: theme.teal },
  avatarTxt:      { fontSize: 20, fontWeight: '800', color: theme.cream },
  staffName:      { fontSize: 11, color: '#94a3b8', textAlign: 'center' },
  pinRow:         { flexDirection: 'row', gap: 16, marginBottom: 28 },
  pinDot:         { width: 16, height: 16, borderRadius: 8, backgroundColor: '#2a3840', borderWidth: 2, borderColor: '#3a4850' },
  pinDotFilled:   { backgroundColor: theme.teal, borderColor: theme.teal },
  pad:            { width: '100%', maxWidth: 280, gap: 12, marginBottom: 24 },
  padRow:         { flexDirection: 'row', justifyContent: 'center', gap: 12 },
  padKey:         { width: 72, height: 72, borderRadius: 36, backgroundColor: '#2a3840', alignItems: 'center', justifyContent: 'center' },
  padKeyEmpty:    { backgroundColor: 'transparent' },
  padKeyPressed:  { backgroundColor: '#3a4850' },
  padKeyTxt:      { fontSize: 24, fontWeight: '700', color: theme.cream },
  btn:            { backgroundColor: theme.teal, borderRadius: 12, padding: 15, alignItems: 'center', width: '100%', maxWidth: 280 },
  btnTxt:         { color: theme.white, fontWeight: '800', fontSize: 15 },
});
