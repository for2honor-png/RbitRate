import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { setServerURL, loadStoredConfig } from '../api';
import { useAppContext } from '../context/AppContext';
import { theme } from '../theme';

export default function Setup({ navigation }) {
  const { setState } = useAppContext();
  const [ip, setIp]       = useState('');
  const [port, setPort]   = useState('3722');
  const [testing, setTesting] = useState(false);

  async function handleConnect() {
    const trimIp = ip.trim();
    if (!trimIp) { Alert.alert('Erreur', 'Entrez l\'adresse IP du bureau'); return; }
    setTesting(true);
    try {
      const testUrl = `http://${trimIp}:${port}/api/auth/staff-list`;
      const res = await fetch(testUrl, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) throw new Error('Serveur introuvable');
      await setServerURL(trimIp, parseInt(port, 10));
      setState(s => ({ ...s, hasServer: true }));
    } catch (e) {
      Alert.alert(
        'Connexion impossible',
        'Impossible de joindre le serveur. Vérifiez :\n• L\'adresse IP\n• Que RbitRate bureau est ouvert\n• Que vous êtes sur le même WiFi',
      );
    } finally {
      setTesting(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.root}>
      <View style={s.card}>
        <Text style={s.logo}>RbitRate</Text>
        <Text style={s.title}>Configuration</Text>
        <Text style={s.sub}>
          Entrez l'adresse IP de l'ordinateur de bureau où RbitRate est ouvert.
          Vous la trouverez dans la section QR Codes → Restaurant du bureau.
        </Text>

        <Text style={s.label}>Adresse IP du bureau</Text>
        <TextInput
          style={s.input}
          value={ip}
          onChangeText={setIp}
          placeholder="ex: 192.168.1.45"
          placeholderTextColor="#94a3b8"
          keyboardType="numeric"
          autoCapitalize="none"
        />

        <Text style={s.label}>Port API</Text>
        <TextInput
          style={s.input}
          value={port}
          onChangeText={setPort}
          placeholder="3722"
          placeholderTextColor="#94a3b8"
          keyboardType="numeric"
        />

        <TouchableOpacity style={s.btn} onPress={handleConnect} disabled={testing}>
          {testing
            ? <ActivityIndicator color={theme.white} />
            : <Text style={s.btnTxt}>Tester et enregistrer →</Text>
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: theme.dark, justifyContent: 'center', padding: 24 },
  card:   { backgroundColor: '#2a3840', borderRadius: 16, padding: 24 },
  logo:   { fontSize: 26, fontWeight: '900', color: theme.teal, marginBottom: 4 },
  title:  { fontSize: 20, fontWeight: '800', color: theme.cream, marginBottom: 8 },
  sub:    { fontSize: 13, color: '#94a3b8', lineHeight: 20, marginBottom: 24 },
  label:  { fontSize: 11, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  input:  { backgroundColor: '#1f2a2e', color: theme.cream, borderRadius: 10, padding: 13, fontSize: 15, marginBottom: 16, borderWidth: 1, borderColor: '#3a4850' },
  btn:    { backgroundColor: theme.teal, borderRadius: 10, padding: 15, alignItems: 'center', marginTop: 8 },
  btnTxt: { color: theme.white, fontWeight: '800', fontSize: 15 },
});
