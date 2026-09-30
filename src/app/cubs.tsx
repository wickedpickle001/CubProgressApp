import { useCallback, useState } from 'react';
import { ImageBackground, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';

export default function CubsScreen() {
  const router = useRouter();
  const [cubs, setCubs] = useState<any[]>([]);
  const [mine, setMine] = useState('');
  const [packTotal, setPackTotal] = useState(0);

  useFocusEffect(useCallback(() => { loadCubs(); }, []));

  async function loadCubs() {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    if (!user) return;
    const { data: me } = await supabase.from('profiles').select('pack_name, six_name').eq('id', user.id).maybeSingle();
    if (!me?.pack_name) return;
    setMine(me.six_name || '');
    const first = await supabase.from('profiles').select('id, full_name, avatar, six_name').eq('pack_name', me.pack_name).eq('pack_status', 'approved').eq('active', true).order('full_name');
    const { data } = first.error ? await supabase.from('profiles').select('id, full_name, avatar, six_name').eq('pack_name', me.pack_name).eq('pack_status', 'approved').order('full_name') : first;
    const rows = data || [];
    if (!rows.length) {
      const { data: fallback } = await supabase.from('profiles').select('id, full_name, avatar, six_name').eq('pack_name', me.pack_name).eq('pack_status', 'approved').order('full_name');
      setCubs(fallback || []);
    } else setCubs(rows);
    const start = new Date();
    const day = start.getDay() || 7;
    start.setDate(start.getDate() - day + 1);
    const { data: counted, error: countError } = await supabase.rpc('pack_good_turn_count', {
      since_date: start.toISOString().slice(0, 10),
    });
    setPackTotal(!countError && typeof counted === 'number' ? counted : 0);
  }

  const groups = cubs.reduce<Record<string, any[]>>((all, cub) => {
    const key = cub.six_name || 'Not in a Six yet';
    all[key] = all[key] || [];
    all[key].push(cub);
    return all;
  }, {});

  return (
    <ImageBackground source={require('../../assets/images/splash-icon.png')} style={styles.background} imageStyle={styles.backgroundImage}>
      <ScrollView style={styles.container}>
        <Text style={styles.heading}>My Six</Text>
        <Text style={styles.note}>{mine ? `You are in ${mine} Six.` : 'Your leader will put you in a Six.'}</Text>
        <Text style={styles.note}>Our pack logged {packTotal} good turns this week.</Text>
        <TouchableOpacity style={styles.button} onPress={() => router.push('/avatar')}><Text style={styles.buttonText}>Choose my avatar</Text></TouchableOpacity>
        {Object.keys(groups).map((six) => (
          <View key={six}>
            <Text style={styles.six}>{six}</Text>
            {groups[six].map((cub) => (
              <TouchableOpacity key={cub.id} style={styles.card} onPress={() => router.push({ pathname: '/cub/[id]', params: { id: cub.id } })}>
                <Text style={styles.cardTitle}>{cub.avatar || 'Cub'} {cub.full_name || 'Cub'}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: '#1a3c34' },
  backgroundImage: { opacity: 0.18, resizeMode: 'contain' },
  container: { flex: 1, backgroundColor: 'rgba(26, 60, 52, 0.55)', padding: 20 },
  heading: { color: '#ffffff', fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  note: { color: '#a8d5c0', textAlign: 'center', marginBottom: 8 },
  six: { color: '#ffd700', fontWeight: 'bold', marginTop: 12, marginBottom: 6 },
  button: { backgroundColor: '#ffd700', padding: 12, borderRadius: 8, alignItems: 'center', marginVertical: 12 },
  buttonText: { color: '#1a3c34', fontWeight: 'bold' },
  card: { backgroundColor: '#2a5a4a', borderRadius: 12, padding: 16, marginBottom: 8 },
  cardTitle: { color: '#ffffff', fontWeight: 'bold', fontSize: 16 },
});
