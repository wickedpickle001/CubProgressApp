import { useCallback, useState } from 'react';
import { ImageBackground, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

export default function CubProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [profile, setProfile] = useState<any>(null);
  const [approved, setApproved] = useState<string[]>([]);
  const [turns, setTurns] = useState(0);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [id])
  );

  async function loadProfile() {
    const { data } = await supabase
      .from('profiles')
      .select('full_name, avatar, six_name, pack_name, role')
      .eq('id', String(id))
      .maybeSingle();
    setProfile(data);

    const { data: badges } = await supabase
      .from('badge_submissions')
      .select('badge_name')
      .eq('user_id', String(id))
      .eq('status', 'approved');
    setApproved([...(new Set((badges || []).map((row) => row.badge_name)))]);

    const { data: goodTurns } = await supabase
      .from('good_turns')
      .select('turn_date')
      .eq('user_id', String(id));
    setTurns(goodTurns?.length || 0);
  }

  return (
    <ImageBackground
      source={require('../../../assets/images/splash-icon.png')}
      style={styles.background}
      imageStyle={styles.backgroundImage}
    >
      <ScrollView style={styles.container}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.heading}>
          {profile?.avatar || '🐺'} {profile?.full_name || 'Cub'}
        </Text>
        <Text style={styles.meta}>
          {profile?.pack_name} {profile?.six_name ? `· ${profile.six_name}` : ''}
        </Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Approved badges</Text>
          {approved.length === 0 ? (
            <Text style={styles.cardText}>None yet.</Text>
          ) : (
            approved.map((badge) => (
              <Text key={badge} style={styles.cardText}>
                🏅 {badge}
              </Text>
            ))
          )}
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Good turns</Text>
          <Text style={styles.cardText}>{turns} completed</Text>
        </View>
      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: '#1a3c34' },
  backgroundImage: { opacity: 0.18, resizeMode: 'contain' },
  container: { flex: 1, backgroundColor: 'rgba(26, 60, 52, 0.55)', padding: 20 },
  back: { color: '#ffd700', fontWeight: 'bold', marginBottom: 12 },
  heading: { color: '#ffffff', fontSize: 24, fontWeight: 'bold', marginBottom: 6 },
  meta: { color: '#a8d5c0', marginBottom: 16 },
  card: {
    backgroundColor: '#2a5a4a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: { color: '#ffd700', fontWeight: 'bold', marginBottom: 8 },
  cardText: { color: '#ffffff', marginBottom: 4 },
});
