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

const TASKS = [
  'Help at home without being asked.',
  'Say something kind to someone in your pack or family.',
  'Tidy a room or shared space.',
  'Help prepare or pack away a meal.',
  'Look after a pet or plant.',
  'Make a card or note for someone.',
  'Pick up litter somewhere safe with an adult.',
  'Help a younger child or sibling.',
  'Share a toy, book, or snack.',
  'Hold a door or carry something for someone.',
  'Spend 10 minutes helping with a chore.',
  'Call or visit a family member to say hello.',
  'Fill a water bottle and offer it to someone.',
  'Thank a leader, teacher, or parent.',
];

const QUIZ = [
  {
    q: 'What is the Cub motto?',
    options: ['Be Prepared', 'Do Your Best', 'Always Ready'],
    answer: 'Do Your Best',
  },
  {
    q: 'Silver Wolf should take about how long?',
    options: ['Two weeks', 'About two years', 'Ten years'],
    answer: 'About two years',
  },
  {
    q: 'Which Silver Wolf challenge is the Green Paw?',
    options: ['Awareness Challenge', 'Outdoor Challenge', 'Aptitude Challenge'],
    answer: 'Awareness Challenge',
  },
  {
    q: 'A good turn is...',
    options: ['Helping someone each day', 'Winning a race', 'Skipping a meeting'],
    answer: 'Helping someone each day',
  },
];

function todayStamp() {
  return new Date().toISOString().slice(0, 10);
}

function weekStart() {
  const date = new Date();
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1);
  return date.toISOString().slice(0, 10);
}

function todaysTask() {
  const start = new Date(new Date().getFullYear(), 0, 0);
  const diff = Math.floor((Date.now() - start.getTime()) / 86400000);
  return TASKS[diff % TASKS.length];
}

function awardsFor(total: number, streak: number) {
  const earned = [];
  if (total >= 1) earned.push('First Good Turn');
  if (total >= 3) earned.push('Helping Hands');
  if (streak >= 3) earned.push('3-Day Streak');
  if (total >= 7) earned.push('Week of Kindness');
  if (streak >= 7) earned.push('7-Day Streak');
  if (total >= 14) earned.push('Two-Week Helper');
  if (total >= 30) earned.push('Good Turn Champion');
  return earned;
}

export default function PackScreen() {
  const [userId, setUserId] = useState<string | null>(null);
  const [didToday, setDidToday] = useState(false);
  const [todayNote, setTodayNote] = useState('');
  const [note, setNote] = useState('');
  const [streak, setStreak] = useState(0);
  const [total, setTotal] = useState(0);
  const [board, setBoard] = useState<{ name: string; avatar: string; count: number }[]>([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizResult, setQuizResult] = useState('');
  const task = todaysTask();

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

    const { data: turns } = await supabase
      .from('good_turns')
      .select('turn_date, note')
      .eq('user_id', user.id)
      .order('turn_date', { ascending: false });

    const dates = (turns || []).map((row) => row.turn_date);
    const today = todayStamp();
    setDidToday(dates.includes(today));
    setTodayNote(turns?.find((row) => row.turn_date === today)?.note || '');
    setTotal(dates.length);

    let count = 0;
    const cursor = new Date();
    while (dates.includes(cursor.toISOString().slice(0, 10))) {
      count += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    setStreak(count);

    const { data: me } = await supabase
      .from('profiles')
      .select('pack_name')
      .eq('id', user.id)
      .maybeSingle();
    if (!me?.pack_name) return;

    const { data: packCubs } = await supabase
      .from('profiles')
      .select('id, full_name, avatar')
      .eq('pack_name', me.pack_name)
      .eq('pack_status', 'approved');

    const start = weekStart();
    const rows = [];
    for (const cub of packCubs || []) {
      const { data: weekTurns } = await supabase
        .from('good_turns')
        .select('turn_date')
        .eq('user_id', cub.id)
        .gte('turn_date', start);
      rows.push({
        name: cub.full_name || 'Cub',
        avatar: cub.avatar || '🐺',
        count: weekTurns?.length || 0,
      });
    }
    rows.sort((a, b) => b.count - a.count);
    setBoard(rows);
  }

  async function submitGoodTurn() {
    if (!userId) {
      Alert.alert('Please sign in', 'Use the Account tab first.');
      return;
    }
    if (didToday) {
      Alert.alert('Already done', 'Come back tomorrow for a new good turn.');
      return;
    }
    if (!note.trim()) {
      Alert.alert('Write what you did', 'Say how you completed today\u2019s good turn.');
      return;
    }

    const { error } = await supabase.from('good_turns').upsert({
      user_id: userId,
      turn_date: todayStamp(),
      note: `${task} | ${note.trim()}`,
    });
    if (error) {
      Alert.alert('Could not save', error.message);
      return;
    }
    setNote('');
    loadData();
  }

  const earned = awardsFor(total, streak);
  const quiz = QUIZ[quizIndex];

  return (
    <ImageBackground
      source={require('../../assets/images/splash-icon.png')}
      style={styles.background}
      imageStyle={styles.backgroundImage}
    >
      <ScrollView style={styles.container}>
        <Text style={styles.heading}>Pack Fun</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Today\u2019s good turn</Text>
          <Text style={styles.task}>{task}</Text>
          <Text style={styles.cardText}>
            Streak {streak} day(s) · Total {total}
          </Text>
          {didToday ? (
            <Text style={styles.cardText}>Done today. {todayNote}</Text>
          ) : (
            <>
              <TextInput
                style={styles.input}
                placeholder="Write how you did this good turn"
                placeholderTextColor="#88b8a8"
                multiline
                value={note}
                onChangeText={setNote}
              />
              <TouchableOpacity style={styles.button} onPress={submitGoodTurn}>
                <Text style={styles.buttonText}>I did it</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Kindness this week</Text>
          {board.length === 0 ? (
            <Text style={styles.cardText}>No pack scores yet.</Text>
          ) : (
            board.map((row, index) => (
              <Text key={row.name} style={styles.award}>
                {index + 1}. {row.avatar} {row.name} · {row.count}
              </Text>
            ))
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Good turn badges</Text>
          {earned.length === 0 ? (
            <Text style={styles.cardText}>Complete today\u2019s task to earn your first badge.</Text>
          ) : (
            earned.map((item) => (
              <Text key={item} style={styles.award}>
                🏅 {item}
              </Text>
            ))
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Cub quiz</Text>
          <Text style={styles.cardText}>{quiz.q}</Text>
          {quiz.options.map((option) => (
            <TouchableOpacity
              key={option}
              style={styles.quizButton}
              onPress={() => {
                const correct = option === quiz.answer;
                setQuizResult(correct ? 'Yes! Well done.' : 'Not quite. Try another.');
                if (correct) setQuizIndex((prev) => (prev + 1) % QUIZ.length);
              }}
            >
              <Text style={styles.quizText}>{option}</Text>
            </TouchableOpacity>
          ))}
          {!!quizResult && <Text style={styles.cardText}>{quizResult}</Text>}
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
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#2a5a4a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: { color: '#ffd700', fontWeight: 'bold', fontSize: 18, marginBottom: 8 },
  task: { color: '#ffffff', fontSize: 16, marginBottom: 8 },
  cardText: { color: '#a8d5c0', marginBottom: 8 },
  award: { color: '#ffd700', marginBottom: 6, fontWeight: 'bold' },
  input: {
    backgroundColor: '#1a3c34',
    color: '#ffffff',
    borderRadius: 10,
    padding: 12,
    minHeight: 70,
    textAlignVertical: 'top',
    marginBottom: 8,
  },
  button: {
    backgroundColor: '#ffd700',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
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
