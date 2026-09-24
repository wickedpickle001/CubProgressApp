import { useCallback, useState } from 'react';
import {
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';

export default function CubsScreen() {
  const router = useRouter();
  const [cubs, setCubs] = useState<any[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadCubs();
    }, [])
  );

  async function loadCubs() {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    if (!user) return;

    const { data: me } = await supabase
      .from('profiles')
      .select('pack_name')
      .eq('id', user.id)
      .maybeSingle();
    if (!me?.pack_name) return;

    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, avatar, six_name, role')
      .eq('pack_name', me.pack_name)
      .eq('pack_status', 'approved')
      .order('full_name');

    setCubs(data || []);
  }

  return (
    <ImageBackground
      source={require('../../assets/images/splash-icon.png')}
      style={styles.background}
      imageStyle={styles.backgroundImage}
    >
      <ScrollView style={styles.container}>
        <Text style={styles.heading}>Pack friends</Text>
        {cubs.map((cub) => (
          <TouchableOpacity
            key={cub.id}
            style={styles.card}
            onPress={() => router.push({ pathname: '/cub/[id]', params: { id: cub.id } })}
          >
            <Text style={styles.cardTitle}>
              {cub.avatar || '🐺'} {cub.full_name || 'Cub'}
            </Text>
            <Text style={styles.cardText}>
              {cub.six_name ? `Six: ${cub.six_name}` : cub.role}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: '#1a3c34' },
  backgroundImage: { opacity: 0.18, resizeMode: 'contain' },
  container: { flex: 1, backgroundColor: 'rgba(26, 60, 52, 0.55)', padding: 20 },
  heading: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#2a5a4a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: { color: '#ffd700', fontWeight: 'bold', fontSize: 18 },
  cardText: { color: '#a8d5c0', marginTop: 4 },
});
