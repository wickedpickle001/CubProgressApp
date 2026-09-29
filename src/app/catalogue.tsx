import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../lib/supabase';

export default function CatalogueScreen() {
  const [role, setRole] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [requirement, setRequirement] = useState('');
  const [rows, setRows] = useState<any[]>([]);

  useFocusEffect(useCallback(() => { load(); }, []));

  async function load() {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    if (!user) return;
    const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
    setRole(me?.role || '');
    const { data } = await supabase.from('badge_catalog').select('name, description, verified, archived').order('name');
    setRows(data || []);
  }

  async function addBadge(verified: boolean) {
    if (role !== 'admin' || !name.trim()) return;
    const { error } = await supabase.from('badge_catalog').upsert({
      name: name.trim(),
      description: description.trim(),
      verified,
      archived: false,
      updated_at: new Date().toISOString(),
    });
    if (error) { Alert.alert('Could not save', error.message); return; }
    if (requirement.trim()) {
      await supabase.from('badge_requirements').insert({
        badge_name: name.trim(),
        requirement: requirement.trim(),
        verified,
        version: 1,
        sort: 1,
      });
    }
    Alert.alert(verified ? 'Saved as verified' : 'Saved as awaiting verification', 'Unverified text is not shown to cubs as official.');
    setName(''); setDescription(''); setRequirement('');
    load();
  }

  if (role && role !== 'admin') {
    return <View style={styles.container}><Text style={styles.note}>Administrators only.</Text></View>;
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.heading}>Interest badge list</Text>
      <Text style={styles.note}>Do not type official requirements unless Scouts South Africa has approved that wording. Leave verified off until then.</Text>
      <TextInput style={styles.input} placeholder="Badge name" placeholderTextColor="#88b8a8" value={name} onChangeText={setName} />
      <TextInput style={styles.input} placeholder="Short description" placeholderTextColor="#88b8a8" value={description} onChangeText={setDescription} />
      <TextInput style={styles.input} placeholder="One requirement" placeholderTextColor="#88b8a8" value={requirement} onChangeText={setRequirement} />
      <TouchableOpacity style={styles.button} onPress={() => addBadge(false)}><Text style={styles.buttonText}>Save as not verified</Text></TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={() => addBadge(true)}><Text style={styles.buttonText}>Save as verified</Text></TouchableOpacity>
      {rows.map((row) => (
        <Text key={row.name} style={styles.note}>{row.name} · {row.verified ? 'verified' : 'awaiting verification'}{row.archived ? ' · archived' : ''}</Text>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a3c34', padding: 20 },
  heading: { color: '#fff', fontSize: 24, fontWeight: 'bold', textAlign: 'center' },
  note: { color: '#a8d5c0', marginVertical: 8 },
  input: { backgroundColor: '#2a5a4a', color: '#fff', borderRadius: 8, padding: 10, marginBottom: 8 },
  button: { backgroundColor: '#ffd700', padding: 12, borderRadius: 8, alignItems: 'center', marginBottom: 8 },
  buttonText: { color: '#1a3c34', fontWeight: 'bold' },
});
