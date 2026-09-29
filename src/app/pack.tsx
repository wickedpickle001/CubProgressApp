import { useCallback, useState } from 'react';
import { Alert, ImageBackground, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  { q: 'What is the Cub motto?', options: ['Be Prepared', 'Do Your Best', 'Always Ready'], answer: 'Do Your Best' },
  { q: 'A good turn is...', options: ['Helping someone each day', 'Winning a race', 'Skipping a meeting'], answer: 'Helping someone each day' },
  { q: 'Interest badges are...', options: ['Done in any order', 'Only for leaders', 'A race'], answer: 'Done in any order' },
  { q: 'If you are unsure on a hike you should...', options: ['Stop and tell a leader', 'Run ahead', 'Hide'], answer: 'Stop and tell a leader' },
];

function todayStamp() { return new Date().toISOString().slice(0, 10); }
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
  if (total >= 7) earned.push('Week of Kindness');
  if (streak >= 3) earned.push('3 days in a row');
  return earned;
}

export default function PackScreen() {
  const [userId, setUserId] = useState<string | null>(null);
  const [didToday, setDidToday] = useState(false);
  const [note, setNote] = useState('');
  const [streak, setStreak] = useState(0);
  const [total, setTotal] = useState(0);
  const [history, setHistory] = useState<{ turn_date: string; note: string }[]>([]);
  const [packCount, setPackCount] = useState(0);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizResult, setQuizResult] = useState('');
  const task = todaysTask();

  useFocusEffect(useCallback(() => { loadData(); }, []));

  async function loadData() {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    if (!user) { setUserId(null); return; }
    setUserId(user.id);
    const draft = await AsyncStorage.getItem('good-turn-draft');
    if (draft) setNote(draft);
    const { data: turns } = await supabase.from('good_turns').select('turn_date, note').eq('user_id', user.id).order('turn_date', { ascending: false });
    const dates = (turns || []).map((row) => row.turn_date);
    const today = todayStamp();
    setDidToday(dates.includes(today));
    setHistory(turns || []);
    setTotal(dates.length);
    let count = 0;
    const cursor = new Date();
    while (dates.includes(cursor.toISOString().slice(0, 10))) {
      count += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    setStreak(count);
    const { data: me } = await supabase.from('profiles').select('pack_name').eq('id', user.id).maybeSingle();
    if (!me?.pack_name) return;
    const { data: packCubs } = await supabase.from('profiles').select('id').eq('pack_name', me.pack_name).eq('pack_status', 'approved');
    const ids = new Set((packCubs || []).map((row) => row.id));
    const { data: week } = await supabase.from('good_turns').select('user_id').gte('turn_date', weekStart());
    setPackCount((week || []).filter((row) => ids.has(row.user_id)).length);
  }

  async function submitGoodTurn() {
    if (!userId) { Alert.alert('Please sign in', 'Use the Account tab first.'); return; }
    if (!note.trim()) { Alert.alert('Write what you did', 'Say how you completed today’s good turn.'); return; }
    const { error } = await supabase.from('good_turns').upsert({
      user_id: userId,
      turn_date: todayStamp(),
      note: `${task} | ${note.trim()}`,
    });
    if (error) {
      await AsyncStorage.setItem('good-turn-draft', note);
      Alert.alert('Saved on this phone', 'It will try again when you are online. Tap I did it once more.');
      return;
    }
    await AsyncStorage.removeItem('good-turn-draft');
    setNote('');
    loadData();
  }

  const earned = awardsFor(total, streak);
  const quiz = QUIZ[quizIndex];

  return (
    <ImageBackground source={require('../../assets/images/splash-icon.png')} style={styles.background} imageStyle={styles.backgroundImage}>
      <ScrollView style={styles.container}>
        <Text style={styles.heading}>My Journey</Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Today’s good turn</Text>
          <Text style={styles.task}>{task}</Text>
          <Text style={styles.cardText}>{streak > 0 ? `You have helped ${streak} day(s) in a row. Missing a day is fine.` : 'One good turn a day. Missing a day does not reset your kindness.'}</Text>
          <Text style={styles.cardText}>Our pack has logged {packCount} good turns this week.</Text>
          <TextInput style={styles.input} placeholder="Write how you did this" placeholderTextColor="#88b8a8" multiline value={note} onChangeText={setNote} />
          <TouchableOpacity style={styles.button} onPress={submitGoodTurn}>
            <Text style={styles.buttonText}>{didToday ? 'Update today’s note' : 'I did it'}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>App awards</Text>
          <Text style={styles.cardText}>These are app stickers, not official Scout badges.</Text>
          {earned.length === 0 ? <Text style={styles.cardText}>Your first good turn earns a sticker.</Text> : earned.map((item) => <Text key={item} style={styles.award}>{item}</Text>)}
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your good turns</Text>
          {history.length === 0 && <Text style={styles.cardText}>None yet.</Text>}
          {history.slice(0, 8).map((row) => <Text key={row.turn_date} style={styles.cardText}>{row.turn_date}: {row.note}</Text>)}
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Cub quiz</Text>
          <Text style={styles.cardText}>{quiz.q}</Text>
          {quiz.options.map((option) => (
            <TouchableOpacity key={option} style={styles.quizButton} onPress={() => {
              const correct = option === quiz.answer;
              setQuizResult(correct ? 'Yes. Well done.' : 'Not quite. The safer or kinder answer is highlighted next time.');
              if (correct) setQuizIndex((prev) => (prev + 1) % QUIZ.length);
            }}>
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
  heading: { fontSize: 24, fontWeight: 'bold', color: '#ffffff', textAlign: 'center', marginBottom: 16 },
  card: { backgroundColor: '#2a5a4a', borderRadius: 12, padding: 16, marginBottom: 16 },
  cardTitle: { color: '#ffd700', fontWeight: 'bold', fontSize: 18, marginBottom: 8 },
  task: { color: '#ffffff', fontSize: 16, marginBottom: 8 },
  cardText: { color: '#a8d5c0', marginBottom: 8 },
  award: { color: '#ffd700', marginBottom: 6, fontWeight: 'bold' },
  input: { backgroundColor: '#1a3c34', color: '#ffffff', borderRadius: 10, padding: 12, minHeight: 70, textAlignVertical: 'top', marginBottom: 8 },
  button: { backgroundColor: '#ffd700', padding: 12, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#1a3c34', fontWeight: 'bold' },
  quizButton: { backgroundColor: '#1a3c34', padding: 10, borderRadius: 8, marginBottom: 6 },
  quizText: { color: '#ffffff', fontWeight: 'bold' },
});
