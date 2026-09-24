import { useCallback, useState } from 'react';
import {
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../lib/supabase';

function todayStamp() {
  return new Date().toISOString().slice(0, 10);
}

export default function HomeScreen() {
  const [akela, setAkela] = useState('');
  const [challenge, setChallenge] = useState('');
  const [eventText, setEventText] = useState('');
  const [shout, setShout] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadHome();
    }, [])
  );

  async function loadHome() {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    if (!user) {
      setAkela('');
      setChallenge('');
      setEventText('');
      setShout('');
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('pack_name')
      .eq('id', user.id)
      .maybeSingle();

    const packName = profile?.pack_name;
    if (!packName) return;

    const { data: note } = await supabase
      .from('akela_notes')
      .select('message')
      .eq('pack_name', packName)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setAkela(note?.message || '');

    const { data: weekly } = await supabase
      .from('weekly_challenges')
      .select('title')
      .eq('pack_name', packName)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setChallenge(weekly?.title || '');

    const { data: nextEvent } = await supabase
      .from('pack_events')
      .select('title, event_date')
      .eq('pack_name', packName)
      .gte('event_date', todayStamp())
      .order('event_date')
      .limit(1)
      .maybeSingle();

    if (nextEvent) {
      const days = Math.max(
        0,
        Math.ceil((new Date(nextEvent.event_date).getTime() - Date.now()) / 86400000)
      );
      setEventText(`${nextEvent.title} · ${nextEvent.event_date} · ${days} day(s)`);
    } else {
      setEventText('');
    }

    const { data: shouts } = await supabase
      .from('shoutouts')
      .select('message')
      .eq('pack_name', packName)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setShout(shouts?.message || '');
  }

  return (
    <ImageBackground
      source={require('../../assets/images/splash-icon.png')}
      style={styles.background}
      imageStyle={styles.backgroundImage}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>DO YOUR BEST</Text>
        <Text style={styles.subtitle}>Track your journey from</Text>
        <Text style={styles.badge}>Silver Wolf • Gold Wolf • Leaping Wolf</Text>
        <Text style={styles.subtitle}>
          I promise to do my best to do my duty to God and my country; To keep the Law of the Wolf Cub Pack. And to do a good turn to somebody every day.
        </Text>
        <Text style={styles.badge}>in Memory of Lord Robert Baden-Powell of Gilwell</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Akela says</Text>
          <Text style={styles.cardText}>{akela || 'No message yet.'}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Weekly challenge</Text>
          <Text style={styles.cardText}>{challenge || 'No challenge this week.'}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Next pack meeting</Text>
          <Text style={styles.cardText}>{eventText || 'No date set.'}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Shout-out</Text>
          <Text style={styles.cardText}>{shout || 'No shout-out yet.'}</Text>
        </View>
      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: '#1a3c34',
  },
  backgroundImage: {
    opacity: 0.18,
    resizeMode: 'contain',
  },
  container: {
    backgroundColor: 'rgba(26, 60, 52, 0.55)',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#a8d5c0',
    marginBottom: 8,
    textAlign: 'center',
  },
  badge: {
    fontSize: 16,
    color: '#ffd700',
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  card: {
    width: '100%',
    backgroundColor: '#2a5a4a',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
  },
  cardTitle: {
    color: '#ffd700',
    fontWeight: 'bold',
    marginBottom: 6,
  },
  cardText: {
    color: '#ffffff',
  },
});
