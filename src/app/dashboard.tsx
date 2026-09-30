import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../lib/supabase';

export default function DashboardScreen() {
  const router = useRouter();
  const [role, setRole] = useState('');
  const [pack, setPack] = useState('');
  const [cubs, setCubs] = useState(0);
  const [pending, setPending] = useState(0);
  const [badges, setBadges] = useState(0);
  const [events, setEvents] = useState<any[]>([]);

  useFocusEffect(useCallback(() => { load(); }, []));

  async function load() {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    if (!user) return;
    const { data: me } = await supabase.from('profiles').select('role, pack_name').eq('id', user.id).maybeSingle();
    setRole(me?.role || '');
    setPack(me?.pack_name || '');
    if (me?.role !== 'leader' && me?.role !== 'admin') return;
    let people = supabase.from('profiles').select('id, pack_status');
    if (me.role === 'leader') people = people.eq('pack_name', me.pack_name);
    const { data: rows } = await people;
    const list = rows || [];
    setCubs(list.filter((row) => row.pack_status === 'approved').length);
    setPending(list.filter((row) => row.pack_status !== 'approved').length);
    const { data: waiting } = await supabase.from('badge_submissions').select('id, user_id, status').eq('status', 'pending');
    if (me.role === 'admin') {
      setBadges(waiting?.length || 0);
    } else {
      const ids = new Set(list.map((row) => row.id));
      setBadges((waiting || []).filter((row) => ids.has(row.user_id)).length);
    }
    const { data: upcoming } = await supabase.from('pack_events').select('title, event_date').eq('pack_name', me.pack_name).order('event_date').limit(3);
    setEvents(upcoming || []);
  }

  if (role && role !== 'leader' && role !== 'admin') {
    return <View style={styles.center}><Text style={styles.heading}>Leaders only</Text></View>;
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.heading}>{pack || 'Pack'} dashboard</Text>
      <Text style={styles.stat}>{cubs} cubs accepted</Text>
      <Text style={styles.stat}>{pending} waiting to join</Text>
      <Text style={styles.stat}>{badges} badge submissions waiting</Text>
      <Text style={styles.section}>Next events</Text>
      {events.length === 0 && <Text style={styles.note}>No events yet.</Text>}
      {events.map((event) => <Text key={event.title + event.event_date} style={styles.note}>{event.title} · {event.event_date}</Text>)}
      <TouchableOpacity style={styles.button} onPress={() => router.push('/approve')}><Text style={styles.buttonText}>Review badges</Text></TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={() => router.push('/users')}><Text style={styles.buttonText}>Manage cubs</Text></TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={() => router.push('/calendar')}><Text style={styles.buttonText}>Calendar</Text></TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a3c34', padding: 20 },
  center: { flex: 1, backgroundColor: '#1a3c34', alignItems: 'center', justifyContent: 'center' },
  heading: { color: '#fff', fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 16 },
  stat: { color: '#ffd700', fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  section: { color: '#fff', fontWeight: 'bold', marginTop: 16, marginBottom: 8 },
  note: { color: '#a8d5c0', marginBottom: 6 },
  button: { backgroundColor: '#ffd700', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#1a3c34', fontWeight: 'bold' },
});
