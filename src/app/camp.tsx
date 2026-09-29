import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../lib/supabase';

export default function CampScreen() {
  const [role, setRole] = useState('cub');
  const [pack, setPack] = useState('');
  const [userId, setUserId] = useState('');
  const [lists, setLists] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [title, setTitle] = useState('');
  const [labels, setLabels] = useState('');

  useFocusEffect(useCallback(() => { load(); }, []));

  async function load() {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    if (!user) return;
    setUserId(user.id);
    const { data: me } = await supabase.from('profiles').select('role, pack_name').eq('id', user.id).maybeSingle();
    setRole(me?.role || 'cub');
    setPack(me?.pack_name || '');
    const { data: kitLists, error } = await supabase.from('kit_lists').select('*').eq('pack_name', me?.pack_name || '').eq('active', true);
    if (error) return;
    setLists(kitLists || []);
    const ids = (kitLists || []).map((row) => row.id);
    if (!ids.length) { setItems([]); return; }
    const { data: kitItems } = await supabase.from('kit_items').select('*').in('list_id', ids).order('sort');
    setItems(kitItems || []);
    const { data: mine } = await supabase.from('kit_checks').select('item_id, packed').eq('user_id', user.id);
    const map: Record<string, boolean> = {};
    mine?.forEach((row) => { map[row.item_id] = row.packed; });
    setChecks(map);
  }

  async function createList() {
    const bits = labels.split(',').map((item) => item.trim()).filter(Boolean);
    if (!title.trim() || !bits.length) return;
    const { data, error } = await supabase.from('kit_lists').insert({ pack_name: pack, title: title.trim() }).select('id').single();
    if (error || !data) { Alert.alert('Could not save', error?.message || 'No list'); return; }
    const rows = bits.map((label, index) => ({ list_id: data.id, label, sort: index + 1 }));
    const { error: itemError } = await supabase.from('kit_items').insert(rows);
    if (itemError) Alert.alert('Items', itemError.message);
    setTitle(''); setLabels('');
    load();
  }

  async function toggle(itemId: string) {
    const packed = !checks[itemId];
    setChecks((prev) => ({ ...prev, [itemId]: packed }));
    const { error } = await supabase.from('kit_checks').upsert({ item_id: itemId, user_id: userId, packed });
    if (error) Alert.alert('Could not save', error.message);
  }

  const leader = role === 'leader' || role === 'admin';

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.heading}>Camp kit</Text>
      <Text style={styles.note}>Tick what is packed. Do not add your home address or travel plans.</Text>
      {leader && (
        <View style={styles.card}>
          <TextInput style={styles.input} placeholder="List name, for example River camp" placeholderTextColor="#88b8a8" value={title} onChangeText={setTitle} />
          <TextInput style={styles.input} placeholder="Items separated by commas" placeholderTextColor="#88b8a8" value={labels} onChangeText={setLabels} />
          <TouchableOpacity style={styles.button} onPress={createList}><Text style={styles.buttonText}>Save kit list</Text></TouchableOpacity>
        </View>
      )}
      {lists.map((list) => (
        <View key={list.id} style={styles.card}>
          <Text style={styles.title}>{list.title}</Text>
          {items.filter((item) => item.list_id === list.id).map((item) => (
            <TouchableOpacity key={item.id} onPress={() => toggle(item.id)}>
              <Text style={styles.item}>{checks[item.id] ? 'Packed' : 'Still to pack'} · {item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a3c34', padding: 20 },
  heading: { color: '#fff', fontSize: 24, fontWeight: 'bold', textAlign: 'center' },
  note: { color: '#a8d5c0', textAlign: 'center', marginVertical: 10 },
  card: { backgroundColor: '#2a5a4a', borderRadius: 12, padding: 14, marginBottom: 12 },
  title: { color: '#ffd700', fontWeight: 'bold', fontSize: 18, marginBottom: 8 },
  item: { color: '#fff', paddingVertical: 8 },
  input: { backgroundColor: '#1a3c34', color: '#fff', borderRadius: 8, padding: 10, marginBottom: 8 },
  button: { backgroundColor: '#ffd700', padding: 10, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#1a3c34', fontWeight: 'bold' },
});
