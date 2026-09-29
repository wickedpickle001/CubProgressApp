import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { supabase } from '../lib/supabase';

const STARTER = [
  { title: 'Reef knot', body: 'Practise with a leader. Do not tie anything around a person.', needs_adult: true },
  { title: 'Pack a day bag', body: 'Water, hat, jersey and a snack. An adult checks the bag before you leave.', needs_adult: true },
  { title: 'Stay with the pack', body: 'If you cannot see a leader, stop and call. Do not take a shortcut alone.', needs_adult: true },
  { title: 'A good turn', body: 'Help at home without being asked. You do not need a photo.', needs_adult: false },
];

export default function SkillsScreen() {
  const [extra, setExtra] = useState<{ title: string; body: string; needs_adult: boolean }[]>([]);

  useFocusEffect(useCallback(() => {
    supabase.from('skills').select('title, body, needs_adult').eq('active', true).then(({ data }) => {
      setExtra(data || []);
    });
  }, []));

  const items = [...STARTER, ...extra];

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.heading}>Cub skills</Text>
      <Text style={styles.note}>Pack learning for ages 7 to 11. This is not official Scouts South Africa training until head office checks it.</Text>
      {items.map((item) => (
        <View key={item.title} style={styles.card}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.body}>{item.body}</Text>
          {item.needs_adult && <Text style={styles.warn}>A parent or leader must be with you.</Text>}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a3c34', padding: 20 },
  heading: { color: '#ffffff', fontSize: 24, fontWeight: 'bold', textAlign: 'center' },
  note: { color: '#a8d5c0', marginVertical: 12, textAlign: 'center' },
  card: { backgroundColor: '#2a5a4a', borderRadius: 12, padding: 16, marginBottom: 12 },
  title: { color: '#ffd700', fontWeight: 'bold', fontSize: 18, marginBottom: 6 },
  body: { color: '#ffffff', lineHeight: 22 },
  warn: { color: '#ffd700', marginTop: 8, fontWeight: 'bold' },
});
