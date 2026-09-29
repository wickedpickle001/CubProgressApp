import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../lib/supabase';

const KINDS = ['meeting', 'camp', 'hike', 'outing', 'badge'];

export default function CalendarScreen() {
  const [role, setRole] = useState('cub');
  const [pack, setPack] = useState('');
  const [userId, setUserId] = useState('');
  const [events, setEvents] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [location, setLocation] = useState('');
  const [bring, setBring] = useState('');
  const [kind, setKind] = useState('meeting');

  useFocusEffect(useCallback(() => { load(); }, []));

  async function load() {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    if (!user) return;
    setUserId(user.id);
    const { data: me } = await supabase.from('profiles').select('role, pack_name').eq('id', user.id).maybeSingle();
    setRole(me?.role || 'cub');
    setPack(me?.pack_name || '');
    let query = supabase.from('pack_events').select('*').order('event_date');
    if (me?.role !== 'admin' && me?.pack_name) query = query.eq('pack_name', me.pack_name);
    const { data, error } = await query;
    if (error) Alert.alert('Calendar', error.message);
    setEvents((data || []).filter((row) => row.status !== 'cancelled'));
  }

  async function addEvent() {
    if (!title.trim() || !date.trim()) return;
    const { error } = await supabase.from('pack_events').insert({
      pack_name: pack,
      title: title.trim(),
      event_date: date.trim(),
      start_time: start.trim(),
      end_time: end.trim(),
      location: location.trim(),
      bring: bring.trim(),
      kind,
      status: 'planned',
    });
    if (error) Alert.alert('Could not save', error.message);
    else {
      await supabase.from('app_notifications').insert({
        pack_name: pack,
        title: 'New pack event',
        body: `${title.trim()} on ${date.trim()}`,
      });
      setTitle(''); setDate(''); setStart(''); setEnd(''); setLocation(''); setBring('');
      load();
    }
  }

  async function respond(eventId: string, response: string) {
    const { error } = await supabase.from('attendance').upsert({
      event_id: eventId,
      cub_id: userId,
      response,
      updated_at: new Date().toISOString(),
    });
    if (error) Alert.alert('Attendance', error.message);
    else Alert.alert('Saved', response === 'going' ? 'You are coming.' : 'You are not coming.');
  }

  async function cancel(id: string) {
    const { error } = await supabase.from('pack_events').update({ status: 'cancelled' }).eq('id', id);
    if (error) Alert.alert('Could not cancel', error.message);
    else load();
  }

  const leader = role === 'leader' || role === 'admin';

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.heading}>Pack calendar</Text>
      {leader && (
        <View style={styles.card}>
          <TextInput style={styles.input} placeholder="Event name" placeholderTextColor="#88b8a8" value={title} onChangeText={setTitle} />
          <TextInput style={styles.input} placeholder="Date YYYY-MM-DD" placeholderTextColor="#88b8a8" value={date} onChangeText={setDate} />
          <TextInput style={styles.input} placeholder="Start time" placeholderTextColor="#88b8a8" value={start} onChangeText={setStart} />
          <TextInput style={styles.input} placeholder="End time" placeholderTextColor="#88b8a8" value={end} onChangeText={setEnd} />
          <TextInput style={styles.input} placeholder="Where" placeholderTextColor="#88b8a8" value={location} onChangeText={setLocation} />
          <TextInput style={styles.input} placeholder="What to bring" placeholderTextColor="#88b8a8" value={bring} onChangeText={setBring} />
          <View style={styles.row}>
            {KINDS.map((item) => (
              <TouchableOpacity key={item} style={[styles.chip, kind === item && styles.chipOn]} onPress={() => setKind(item)}>
                <Text style={styles.chipText}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.button} onPress={addEvent}><Text style={styles.buttonText}>Add event</Text></TouchableOpacity>
        </View>
      )}
      {events.map((event) => (
        <View key={event.id} style={styles.card}>
          <Text style={styles.title}>{event.title}</Text>
          <Text style={styles.meta}>{event.kind || 'meeting'} · {event.event_date} {event.start_time || ''}</Text>
          {!!event.location && <Text style={styles.meta}>{event.location}</Text>}
          {!!event.bring && <Text style={styles.meta}>Bring: {event.bring}</Text>}
          <View style={styles.row}>
            <TouchableOpacity style={styles.button} onPress={() => respond(event.id, 'going')}><Text style={styles.buttonText}>Coming</Text></TouchableOpacity>
            <TouchableOpacity style={styles.ghost} onPress={() => respond(event.id, 'not_going')}><Text style={styles.ghostText}>Not coming</Text></TouchableOpacity>
            {leader && <TouchableOpacity onPress={() => cancel(event.id)}><Text style={styles.ghostText}>Cancel</Text></TouchableOpacity>}
          </View>
        </View>
      ))}
      {events.length === 0 && <Text style={styles.meta}>No events yet.</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a3c34', padding: 20 },
  heading: { color: '#fff', fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 12 },
  card: { backgroundColor: '#2a5a4a', borderRadius: 12, padding: 14, marginBottom: 12 },
  title: { color: '#ffd700', fontWeight: 'bold', fontSize: 18 },
  meta: { color: '#fff', marginTop: 4 },
  input: { backgroundColor: '#1a3c34', color: '#fff', borderRadius: 8, padding: 10, marginBottom: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: { backgroundColor: '#1a3c34', padding: 8, borderRadius: 8 },
  chipOn: { backgroundColor: '#ffd700' },
  chipText: { color: '#fff', fontWeight: 'bold' },
  button: { backgroundColor: '#ffd700', padding: 10, borderRadius: 8 },
  buttonText: { color: '#1a3c34', fontWeight: 'bold' },
  ghost: { padding: 10 },
  ghostText: { color: '#ffd700', fontWeight: 'bold' },
});
