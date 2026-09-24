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
    q: 'Silver Wolf is the first Cub advancement award. About how long should it take?',
    options: ['Two weeks', 'About two years', 'Ten years'],
    answer: 'About two years',
  },
  {
    q: 'Which Silver Wolf challenge is the Green Paw?',
    options: ['Awareness Challenge', 'Outdoor Challenge', 'Aptitude Challenge'],
    answer: 'Awareness Challenge',
  },
  {
    q: 'Which Silver Wolf challenge is the Yellow Paw?',
    options: ['Community Challenge', 'Promise and Law Challenge', 'Outdoor Challenge'],
    answer: 'Community Challenge',
  },
  {
    q: 'Which Silver Wolf challenge is the Blue Paw?',
    options: ['Aptitude Challenge', 'Outdoor Challenge', 'Awareness Challenge'],
    answer: 'Outdoor Challenge',
  },
  {
    q: 'Which Silver Wolf challenge is the Red Paw?',
    options: ['Aptitude Challenge', 'Community Challenge', 'Outdoor Challenge'],
    answer: 'Aptitude Challenge',
  },
  {
    q: 'After Silver Wolf, the next Cub advancement is usually...',
    options: ['Springbok Scout', 'Gold Wolf', 'Eagle Scout'],
    answer: 'Gold Wolf',
  },
  {
    q: 'A good turn is...',
    options: ['Helping someone each day', 'Winning a race', 'Skipping a meeting'],
    answer: 'Helping someone each day',
  },
  {
    q: 'The Promise and Law Challenge is part of which award?',
    options: ['Only Link Badge', 'Silver Wolf', 'Only Leaping Wolf'],
    answer: 'Silver Wolf',
  },
  {
    q: 'Who started Scouting?',
    options: ['Lord Baden-Powell', 'Nelson Mandela', 'Shaka Zulu'],
    answer: 'Lord Baden-Powell',
  },
];

function todayStamp() {
  return new Date().toISOString().slice(0, 10);
}

export default function PackScreen() {
  const [userId, setUserId] = useState<string | null>(null);
  const [didToday, setDidToday] = useState(false);
  const [todayNote, setTodayNote] = useState('');
  const [note, setNote] = useState('');
  const [streak, setStreak] = useState(0);
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

    const { data: turns } = await supabase
      .from('good_turns')
      .select('turn_date, note')
      .eq('user_id', user.id)
      .order('turn_date', { ascending: false });

    const dates = (turns || []).map((row) => row.turn_date);
    const today = todayStamp();
    setDidToday(dates[0] === today);
    setTodayNote(turns?.[0]?.turn_date === today ? turns[0].note || '' : '');

    let count = 0;
    const cursor = new Date();
    while (dates.includes(cursor.toISOString().slice(0, 10))) {
      count += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    setStreak(count);
  }

  async function submitGoodTurn() {
    if (!userId) {
      Alert.alert('Please sign in', 'Use the Account tab first.');
      return;
    }
    if (didToday) {
      Alert.alert('Already done', 'You can only log one good turn today.');
      return;
    }
    if (!note.trim()) {
      Alert.alert('Write a note', 'Tell us what good turn you did.');
      return;
    }

    const { error } = await supabase.from('good_turns').upsert({
      user_id: userId,
      turn_date: todayStamp(),
      note: note.trim(),
    });

    if (error) {
      Alert.alert('Could not save', error.message);
      return;
    }

    setNote('');
    loadData();
  }

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
          <Text style={styles.cardTitle}>Good turn</Text>
          <Text style={styles.cardText}>Streak: {streak} day(s)</Text>
          {didToday ? (
            <Text style={styles.cardText}>
              Already submitted today{todayNote ? `: ${todayNote}` : '.'}
            </Text>
          ) : (
            <>
              <TextInput
                style={styles.input}
                placeholder="What good turn did you do today?"
                placeholderTextColor="#88b8a8"
                multiline
                value={note}
                onChangeText={setNote}
              />
              <TouchableOpacity style={styles.button} onPress={submitGoodTurn}>
                <Text style={styles.buttonText}>Submit today\u2019s good turn</Text>
              </TouchableOpacity>
            </>
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
    marginBottom: 16,
  },
  meta: { color: '#a8d5c0', marginTop: 8 },
  card: {
    backgroundColor: '#2a5a4a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: { color: '#ffd700', fontWeight: 'bold', fontSize: 18, marginBottom: 8 },
  cardText: { color: '#a8d5c0', marginBottom: 8 },
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
