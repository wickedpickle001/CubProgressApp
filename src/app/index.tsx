import { useCallback, useState } from 'react';
import { ImageBackground, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';

function todayStamp() {
  return new Date().toISOString().slice(0, 10);
}

export default function HomeScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [akela, setAkela] = useState('');
  const [challenge, setChallenge] = useState('');
  const [eventText, setEventText] = useState('');
  const [shout, setShout] = useState('');
  const [approved, setApproved] = useState(0);
  const [waiting, setWaiting] = useState(0);
  const [paused, setPaused] = useState(false);

  useFocusEffect(useCallback(() => { loadHome(); }, []));

  async function loadHome() {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    if (!user) return;
    const { data: profile } = await supabase
      .from('profiles')
      .select('pack_name, full_name, active')
      .eq('id', user.id)
      .maybeSingle();
    if (profile?.active === false) {
      setPaused(true);
      return;
    }
    setPaused(false);
    const first = (profile?.full_name || '').split(' ')[0];
    setName(first);
    const packName = profile?.pack_name;
    if (!packName) return;
    const today = todayStamp();

    const { data: note } = await supabase.from('akela_notes').select('message, expires_at').eq('pack_name', packName).order('created_at', { ascending: false }).limit(1).maybeSingle();
    setAkela(!note || (note.expires_at && note.expires_at < today) ? '' : note.message || '');

    const { data: weekly } = await supabase.from('weekly_challenges').select('title, expires_at').eq('pack_name', packName).order('created_at', { ascending: false }).limit(1).maybeSingle();
    setChallenge(!weekly || (weekly.expires_at && weekly.expires_at < today) ? '' : weekly.title || '');

    const { data: nextEvent } = await supabase.from('pack_events').select('title, event_date, status').eq('pack_name', packName).gte('event_date', today).order('event_date').limit(5);
    const live = (nextEvent || []).find((row) => row.status !== 'cancelled');
    if (live) {
      const days = Math.max(0, Math.ceil((new Date(live.event_date).getTime() - Date.now()) / 86400000));
      setEventText(`${live.title} · ${live.event_date} · ${days} day(s)`);
    } else setEventText('');

    const { data: shouts } = await supabase.from('shoutouts').select('message, expires_at').eq('pack_name', packName).order('created_at', { ascending: false }).limit(1).maybeSingle();
    setShout(!shouts || (shouts.expires_at && shouts.expires_at < today) ? '' : shouts.message || '');

    const { data: mine } = await supabase.from('badge_submissions').select('status').eq('user_id', user.id);
    setApproved((mine || []).filter((row) => row.status === 'approved').length);
    setWaiting((mine || []).filter((row) => row.status === 'rejected' || row.status === 'pending').length);
  }

  if (paused) {
    return (
      <View style={styles.paused}>
        <Text style={styles.title}>Account paused</Text>
        <Text style={styles.subtitle}>Ask your leader if you need this account turned back on.</Text>
      </View>
    );
  }

  return (
    <ImageBackground source={require('../../assets/images/splash-icon.png')} style={styles.background} imageStyle={styles.backgroundImage}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>DO YOUR BEST</Text>
        {!!name && <Text style={styles.badge}>Hello {name}</Text>}
        <Text style={styles.subtitle}>Interest badges, good turns and pack life.</Text>
        <Text style={styles.subtitle}>I promise to do my best to do my duty to God and my country; To keep the Law of the Wolf Cub Pack. And to do a good turn to somebody every day.</Text>
        <Text style={styles.badge}>in Memory of Lord Robert Baden-Powell of Gilwell</Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your badges</Text>
          <Text style={styles.cardText}>{approved} approved. {waiting} still with a leader or sent back.</Text>
          <TouchableOpacity onPress={() => router.push('/badges')}><Text style={styles.link}>Open badges</Text></TouchableOpacity>
        </View>
        <View style={styles.card}><Text style={styles.cardTitle}>Akela says</Text><Text style={styles.cardText}>{akela || 'No new notice yet.'}</Text></View>
        <View style={styles.card}><Text style={styles.cardTitle}>Weekly challenge</Text><Text style={styles.cardText}>{challenge || 'No challenge this week.'}</Text></View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Next pack event</Text>
          <Text style={styles.cardText}>{eventText || 'No date set.'}</Text>
          <TouchableOpacity onPress={() => router.push('/calendar')}><Text style={styles.link}>Open calendar</Text></TouchableOpacity>
        </View>
        <View style={styles.card}><Text style={styles.cardTitle}>Shout-out</Text><Text style={styles.cardText}>{shout || 'No shout-out yet.'}</Text></View>
      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: '#1a3c34' },
  backgroundImage: { opacity: 0.18, resizeMode: 'contain' },
  paused: { flex: 1, backgroundColor: '#1a3c34', alignItems: 'center', justifyContent: 'center', padding: 24 },
  container: { backgroundColor: 'rgba(26, 60, 52, 0.55)', alignItems: 'center', padding: 20, paddingBottom: 40 },
  title: { fontSize: 36, fontWeight: 'bold', color: '#ffffff', marginBottom: 12, textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#a8d5c0', marginBottom: 8, textAlign: 'center' },
  badge: { fontSize: 16, color: '#ffd700', fontWeight: '600', marginBottom: 8, textAlign: 'center' },
  card: { width: '100%', backgroundColor: '#2a5a4a', borderRadius: 12, padding: 16, marginTop: 12 },
  cardTitle: { color: '#ffd700', fontWeight: 'bold', marginBottom: 6 },
  cardText: { color: '#ffffff' },
  link: { color: '#ffd700', fontWeight: 'bold', marginTop: 8 },
});
