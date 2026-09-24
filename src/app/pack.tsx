import { useCallback, useState } from 'react';
import {
  Alert,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../lib/supabase';

const QUIZ = [
  {
    q: 'What is the Cub motto?',
    options: ['Be Prepared', 'Do Your Best', 'Always Ready'],
    answer: 'Do Your Best',
  },
  {
    q: 'A good turn means you should...',
    options: ['Help someone each day', 'Run faster', 'Stay at home'],
    answer: 'Help someone each day',
  },
  {
    q: 'Who started Scouting?',
    options: ['Nelson Mandela', 'Lord Baden-Powell', 'Shaka Zulu'],
    answer: 'Lord Baden-Powell',
  },
];

function todayStamp() {
  return new Date().toISOString().slice(0, 10);
}

export default function PackScreen() {
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState('');
  const [packName, setPackName] = useState('');
  const [sixName, setSixName] = useState('');
  const [streak, setStreak] = useState(0);
  const [didToday, setDidToday] = useState(false);
  const [approvedBadges, setApprovedBadges] = useState(0);
  const [shoutouts, setShoutouts] = useState<any[]>([]);
  const [challenge, setChallenge] = useState<any>(null);
  const [challengeDone, setChallengeDone] = useState(false);
  const [event, setEvent] = useState<any>(null);
  const [akela, setAkela] = useState('');
  const [newShout, setNewShout] = useState('');
  const [newChallenge, setNewChallenge] = useState('');
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [newAkela, setNewAkela] = useState('');
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizResult, setQuizResult] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  async function loadData() {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    if (!user) {
      setUserId(null);
      return;
    }
    setUserId(user.id);

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, pack_name, six_name')
      .eq('id', user.id)
      .maybeSingle();

    setRole(profile?.role || 'cub');
    setPackName(profile?.pack_name || '');
    setSixName(profile?.six_name || '');

    const { data: turns } = await supabase
      .from('good_turns')
      .select('turn_date')
      .eq('user_id', user.id)
      .order('turn_date', { ascending: false });

    const dates = (turns || []).map((row) => row.turn_date);
    setDidToday(dates[0] === todayStamp());
    let count = 0;
    const cursor = new Date();
    while (dates.includes(cursor.toISOString().slice(0, 10))) {
      count += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    setStreak(count);

    const { data: approved } = await supabase
      .from('badge_submissions')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'approved');
    setApprovedBadges(approved?.length || 0);

    if (profile?.pack_name) {
      const { data: shouts } = await supabase
        .from('shoutouts')
        .select('message, created_at')
        .eq('pack_name', profile.pack_name)
        .order('created_at', { ascending: false })
        .limit(5);
      setShoutouts(shouts || []);

      const { data: weekly } = await supabase
        .from('weekly_challenges')
        .select('*')
        .eq('pack_name', profile.pack_name)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      setChallenge(weekly || null);

      if (weekly) {
        const { data: done } = await supabase
          .from('challenge_done')
          .select('id')
          .eq('user_id', user.id)
          .eq('challenge_id', weekly.id)
          .maybeSingle();
        setChallengeDone(!!done);
      }

      const { data: nextEvent } = await supabase
        .from('pack_events')
        .select('*')
        .eq('pack_name', profile.pack_name)
        .gte('event_date', todayStamp())
        .order('event_date')
        .limit(1)
        .maybeSingle();
      setEvent(nextEvent || null);

      const { data: note } = await supabase
        .from('akela_notes')
        .select('message')
        .eq('pack_name', profile.pack_name)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      setAkela(note?.message || '');
    }
  }

  async function markGoodTurn() {
    if (!userId) return;
    const { error } = await supabase.from('good_turns').upsert({
      user_id: userId,
      turn_date: todayStamp(),
    });
    if (error) {
      Alert.alert('Could not save', error.message);
      return;
    }
    loadData();
  }

  async function completeChallenge() {
    if (!userId || !challenge) return;
    const { error } = await supabase.from('challenge_done').upsert({
      user_id: userId,
      challenge_id: challenge.id,
    });
    if (error) {
      Alert.alert('Could not save', error.message);
      return;
    }
    loadData();
  }

  async function postShout() {
    if (!packName || !newShout.trim()) return;
    const { error } = await supabase.from('shoutouts').insert({
      pack_name: packName,
      message: newShout.trim(),
      created_by: userId,
    });
    if (error) {
      Alert.alert('Could not post', error.message);
      return;
    }
    setNewShout('');
    loadData();
  }

  async function postChallenge() {
    if (!packName || !newChallenge.trim()) return;
    const { error } = await supabase.from('weekly_challenges').insert({
      pack_name: packName,
      title: newChallenge.trim(),
      created_by: userId,
    });
    if (error) {
      Alert.alert('Could not save', error.message);
      return;
    }
    setNewChallenge('');
    loadData();
  }

  async function postEvent() {
    if (!packName || !newEventTitle.trim() || !newEventDate.trim()) return;
    const { error } = await supabase.from('pack_events').insert({
      pack_name: packName,
      title: newEventTitle.trim(),
      event_date: newEventDate.trim(),
    });
    if (error) {
      Alert.alert('Could not save', error.message);
      return;
    }
    setNewEventTitle('');
    setNewEventDate('');
    loadData();
  }

  async function postAkela() {
    if (!packName || !newAkela.trim()) return;
    const { error } = await supabase.from('akela_notes').insert({
      pack_name: packName,
      message: newAkela.trim(),
      created_by: userId,
    });
    if (error) {
      Alert.alert('Could not save', error.message);
      return;
    }
    setNewAkela('');
    loadData();
  }

  const wolf =
    approvedBadges >= 6 ? '🐺 Gold wolf' : approvedBadges >= 3 ? '🐺 Growing wolf' : '🐺 Cub wolf';

  const daysLeft = event
    ? Math.max(
        0,
        Math.ceil((new Date(event.event_date).getTime() - Date.now()) / 86400000)
      )
    : null;

  const quiz = QUIZ[quizIndex];
  const isLeader = role === 'leader' || role === 'admin';

  return (
    <ImageBackground
      source={require('../../assets/images/splash-icon.png')}
      style={styles.background}
      imageStyle={styles.backgroundImage}
    >
      <ScrollView style={styles.container}>
        <Text style={styles.heading}>Pack Fun</Text>
        <Text style={styles.meta}>
          {packName || 'No pack'} {sixName ? `· Six: ${sixName}` : ''}
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{wolf}</Text>
          <Text style={styles.cardText}>{approvedBadges} badge(s) approved</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Good turn streak: {streak} day(s)</Text>
          <TouchableOpacity style={styles.button} onPress={markGoodTurn} disabled={didToday}>
            <Text style={styles.buttonText}>{didToday ? 'Done for today' : 'I did a good turn today'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Akela says</Text>
          <Text style={styles.cardText}>{akela || 'No message yet.'}</Text>
          {isLeader && (
            <>
              <TextInput
                style={styles.input}
                placeholder="Message for the pack"
                placeholderTextColor="#88b8a8"
                value={newAkela}
                onChangeText={setNewAkela}
              />
              <TouchableOpacity style={styles.button} onPress={postAkela}>
                <Text style={styles.buttonText}>Post message</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Weekly challenge</Text>
          <Text style={styles.cardText}>{challenge?.title || 'No challenge this week.'}</Text>
          {!!challenge && (
            <TouchableOpacity style={styles.button} onPress={completeChallenge} disabled={challengeDone}>
              <Text style={styles.buttonText}>{challengeDone ? 'You finished it' : 'I finished the challenge'}</Text>
            </TouchableOpacity>
          )}
          {isLeader && (
            <>
              <TextInput
                style={styles.input}
                placeholder="New weekly challenge"
                placeholderTextColor="#88b8a8"
                value={newChallenge}
                onChangeText={setNewChallenge}
              />
              <TouchableOpacity style={styles.button} onPress={postChallenge}>
                <Text style={styles.buttonText}>Set challenge</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Next pack event</Text>
          <Text style={styles.cardText}>
            {event
              ? `${event.title} · ${event.event_date} · ${daysLeft} day(s)`
              : 'No date set.'}
          </Text>
          {isLeader && (
            <>
              <TextInput
                style={styles.input}
                placeholder="Event name"
                placeholderTextColor="#88b8a8"
                value={newEventTitle}
                onChangeText={setNewEventTitle}
              />
              <TextInput
                style={styles.input}
                placeholder="Date YYYY-MM-DD"
                placeholderTextColor="#88b8a8"
                value={newEventDate}
                onChangeText={setNewEventDate}
              />
              <TouchableOpacity style={styles.button} onPress={postEvent}>
                <Text style={styles.buttonText}>Save event</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Shout-outs</Text>
          {shoutouts.map((item) => (
            <Text key={item.created_at} style={styles.cardText}>
              • {item.message}
            </Text>
          ))}
          {isLeader && (
            <>
              <TextInput
                style={styles.input}
                placeholder="Well done to..."
                placeholderTextColor="#88b8a8"
                value={newShout}
                onChangeText={setNewShout}
              />
              <TouchableOpacity style={styles.button} onPress={postShout}>
                <Text style={styles.buttonText}>Post shout-out</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Quick quiz</Text>
          <Text style={styles.cardText}>{quiz.q}</Text>
          {quiz.options.map((option) => (
            <TouchableOpacity
              key={option}
              style={styles.quizButton}
              onPress={() => {
                setQuizResult(option === quiz.answer ? 'Yes! Well done.' : 'Try again.');
                if (option === quiz.answer) {
                  setQuizIndex((prev) => (prev + 1) % QUIZ.length);
                }
              }}
            >
              <Text style={styles.quizText}>{option}</Text>
            </TouchableOpacity>
          ))}
          {!!quizResult && <Text style={styles.meta}>{quizResult}</Text>}
        </View>
      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: '#1a3c34' },
  backgroundImage: { opacity: 0.18, resizeMode: 'contain' },
  container: { flex: 1, backgroundColor: 'rgba(26, 60, 52, 0.55)', padding: 20 },
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  meta: { color: '#a8d5c0', textAlign: 'center', marginBottom: 16 },
  card: {
    backgroundColor: '#2a5a4a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: { color: '#ffd700', fontWeight: 'bold', fontSize: 16, marginBottom: 6 },
  cardText: { color: '#a8d5c0', marginBottom: 8 },
  input: {
    backgroundColor: '#1a3c34',
    color: '#ffffff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  button: {
    backgroundColor: '#ffd700',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  buttonText: { color: '#1a3c34', fontWeight: 'bold' },
  quizButton: {
    backgroundColor: '#1a3c34',
    padding: 10,
    borderRadius: 8,
    marginBottom: 6,
  },
  quizText: { color: '#ffffff', fontWeight: 'bold' },
});
