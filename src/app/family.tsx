import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../lib/supabase';

export default function FamilyScreen() {
  const [cubName, setCubName] = useState('');
  const [links, setLinks] = useState<any[]>([]);
  const [badges, setBadges] = useState<any[]>([]);

  useFocusEffect(useCallback(() => { load(); }, []));

  async function load() {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    if (!user) return;
    const { data, error } = await supabase.from('parent_links').select('*').eq('parent_id', user.id).order('created_at', { ascending: false });
    if (error) {
      Alert.alert('Not ready', 'Run the new database script, then try again.');
      return;
    }
    setLinks(data || []);
    const approved = (data || []).find((row) => row.status === 'approved' && row.cub_id);
    if (approved?.cub_id) {
      const { data: rows } = await supabase
        .from('badge_submissions')
        .select('badge_name, status, review_note')
        .eq('user_id', approved.cub_id)
        .order('created_at', { ascending: false });
      setBadges(rows || []);
    } else setBadges([]);
  }

  async function requestLink() {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    if (!user || !cubName.trim()) return;
    const { data: me } = await supabase.from('profiles').select('pack_name, role').eq('id', user.id).maybeSingle();
    if (me?.role !== 'parent' && me?.role !== 'admin') {
      Alert.alert('Parent account', 'Create the account as a parent on the Account tab.');
      return;
    }
    const { error } = await supabase.from('parent_links').insert({
      parent_id: user.id,
      pack_name: me.pack_name,
      cub_name: cubName.trim(),
      status: 'pending',
    });
    if (error) Alert.alert('Could not ask', error.message);
    else {
      setCubName('');
      Alert.alert('Asked', 'A leader must link you to your cub.');
      load();
    }
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.heading}>My child</Text>
      <Text style={styles.note}>You only see a cub after a leader links you. You cannot approve badges.</Text>
      <TextInput style={styles.input} placeholder="Cub first name" placeholderTextColor="#88b8a8" value={cubName} onChangeText={setCubName} />
      <TouchableOpacity style={styles.button} onPress={requestLink}>
        <Text style={styles.buttonText}>Ask to link</Text>
      </TouchableOpacity>
      {links.map((link) => (
        <Text key={link.id} style={styles.note}>{link.cub_name}: {link.status}</Text>
      ))}
      {badges.map((row, index) => (
        <View key={`${row.badge_name}-${index}`} style={styles.card}>
          <Text style={styles.title}>{row.badge_name}</Text>
          <Text style={styles.note}>{row.status}</Text>
          {!!row.review_note && <Text style={styles.note}>Leader: {row.review_note}</Text>}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a3c34', padding: 20 },
  heading: { color: '#ffffff', fontSize: 24, fontWeight: 'bold', textAlign: 'center' },
  note: { color: '#a8d5c0', marginVertical: 8 },
  input: { backgroundColor: '#2a5a4a', color: '#fff', borderRadius: 10, padding: 12, marginBottom: 8 },
  button: { backgroundColor: '#ffd700', padding: 12, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#1a3c34', fontWeight: 'bold' },
  card: { backgroundColor: '#2a5a4a', borderRadius: 12, padding: 14, marginTop: 10 },
  title: { color: '#ffd700', fontWeight: 'bold' },
});
