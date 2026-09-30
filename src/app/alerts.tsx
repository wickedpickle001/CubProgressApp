import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { supabase } from '../lib/supabase';

export default function AlertsScreen() {
  const [rows, setRows] = useState<any[]>([]);
  const [note, setNote] = useState('');

  useFocusEffect(useCallback(() => { load(); }, []));

  async function load() {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    if (!user) return;
    const { data: me } = await supabase.from('profiles').select('pack_name').eq('id', user.id).maybeSingle();
    const pack = me?.pack_name || 'none';
    const parts = [`user_id.eq.${user.id}`, `and(user_id.is.null,pack_name.eq.${pack})`];
    const { data: links } = await supabase
      .from('parent_links')
      .select('cub_id')
      .eq('parent_id', user.id)
      .eq('status', 'approved');
    for (const link of links || []) {
      if (link.cub_id) parts.push(`user_id.eq.${link.cub_id}`);
    }
    const { data, error } = await supabase
      .from('app_notifications')
      .select('id, title, body, created_at')
      .or(parts.join(','))
      .order('created_at', { ascending: false })
      .limit(30);
    if (error) setNote('Notices will show after the new database script is run.');
    else {
      setNote('');
      setRows(data || []);
    }
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.heading}>Pack notices</Text>
      {!!note && <Text style={styles.note}>{note}</Text>}
      {rows.length === 0 && !note && <Text style={styles.note}>No new notices. Your leader has not posted one yet.</Text>}
      {rows.map((row) => (
        <View key={row.id} style={styles.card}>
          <Text style={styles.title}>{row.title}</Text>
          <Text style={styles.body}>{row.body}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a3c34', padding: 20 },
  heading: { color: '#ffffff', fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 12 },
  note: { color: '#a8d5c0', textAlign: 'center', marginBottom: 12 },
  card: { backgroundColor: '#2a5a4a', borderRadius: 12, padding: 16, marginBottom: 12 },
  title: { color: '#ffd700', fontWeight: 'bold', marginBottom: 6 },
  body: { color: '#ffffff' },
});
