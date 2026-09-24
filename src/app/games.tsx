import { useMemo, useState } from 'react';
import {
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const PAIRS = ['🐺', '🦁', '🐻', '🦉'];
const LAW_WORDS = ['Do', 'your', 'best', 'to', 'do', 'your', 'duty'];
const TRAIL = [
  { q: 'You see a marked trail. What next?', options: ['Follow the markers', 'Run into the bush', 'Leave the group'], answer: 'Follow the markers' },
  { q: 'A stream is ahead. What do you do?', options: ['Cross with a leader', 'Jump in alone', 'Throw rocks'], answer: 'Cross with a leader' },
  { q: 'You find litter. What is best?', options: ['Pick it up if safe', 'Add more litter', 'Ignore glass'], answer: 'Pick it up if safe' },
  { q: 'The sky looks dark. What next?', options: ['Tell Akela', 'Keep hiking farther', 'Hide your pack'], answer: 'Tell Akela' },
  { q: 'You reached the end. What do you say?', options: ['Do your best!', 'I give up', 'Go home angry'], answer: 'Do your best!' },
];

function shuffled<T>(list: T[]) {
  return [...list].sort(() => Math.random() - 0.5);
}

export default function GamesScreen() {
  const [mode, setMode] = useState<'menu' | 'memory' | 'tap' | 'scramble' | 'trail'>('menu');
  const [cards, setCards] = useState<{ id: number; face: string; open: boolean; done: boolean }[]>([]);
  const [openIds, setOpenIds] = useState<number[]>([]);
  const [tapScore, setTapScore] = useState(0);
  const [tapLeft, setTapLeft] = useState(0);
  const [words, setWords] = useState<string[]>([]);
  const [built, setBuilt] = useState<string[]>([]);
  const [trailIndex, setTrailIndex] = useState(0);
  const [trailMsg, setTrailMsg] = useState('');

  const targetLaw = useMemo(() => LAW_WORDS.join(' '), []);

  function startMemory() {
    const deck = shuffled([...PAIRS, ...PAIRS]).map((face, id) => ({
      id,
      face,
      open: false,
      done: false,
    }));
    setCards(deck);
    setOpenIds([]);
    setMode('memory');
  }

  function flip(id: number) {
    const card = cards.find((item) => item.id === id);
    if (!card || card.open || card.done || openIds.length === 2) return;
    const nextOpen = [...openIds, id];
    const nextCards = cards.map((item) => (item.id === id ? { ...item, open: true } : item));
    setCards(nextCards);
    setOpenIds(nextOpen);
    if (nextOpen.length === 2) {
      const [a, b] = nextOpen.map((itemId) => nextCards.find((item) => item.id === itemId)!);
      setTimeout(() => {
        if (a.face === b.face) {
          setCards((prev) => prev.map((item) => (item.face === a.face ? { ...item, done: true } : item)));
        } else {
          setCards((prev) => prev.map((item) => (nextOpen.includes(item.id) ? { ...item, open: false } : item)));
        }
        setOpenIds([]);
      }, 500);
    }
  }

  function startTap() {
    setTapScore(0);
    setTapLeft(15);
    setMode('tap');
    const timer = setInterval(() => {
      setTapLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function startScramble() {
    setWords(shuffled(LAW_WORDS));
    setBuilt([]);
    setMode('scramble');
  }

  function startTrail() {
    setTrailIndex(0);
    setTrailMsg('');
    setMode('trail');
  }

  return (
    <ImageBackground
      source={require('../../assets/images/splash-icon.png')}
      style={styles.background}
      imageStyle={styles.backgroundImage}
    >
      <ScrollView style={styles.container}>
        <Text style={styles.heading}>Cub Games</Text>
        {mode !== 'menu' && (
          <TouchableOpacity onPress={() => setMode('menu')}>
            <Text style={styles.back}>← Games menu</Text>
          </TouchableOpacity>
        )}

        {mode === 'menu' && (
          <>
            <TouchableOpacity style={styles.button} onPress={startMemory}>
              <Text style={styles.buttonText}>Paw memory</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={startTap}>
              <Text style={styles.buttonText}>Do Your Best tap</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={startScramble}>
              <Text style={styles.buttonText}>Law scramble</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={startTrail}>
              <Text style={styles.buttonText}>Trail walk</Text>
            </TouchableOpacity>
          </>
        )}

        {mode === 'memory' && (
          <View style={styles.grid}>
            {cards.map((card) => (
              <TouchableOpacity key={card.id} style={styles.card} onPress={() => flip(card.id)}>
                <Text style={styles.emoji}>{card.open || card.done ? card.face : '?'}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {mode === 'tap' && (
          <View style={styles.center}>
            <Text style={styles.meta}>Time {tapLeft} · Score {tapScore}</Text>
            {tapLeft > 0 ? (
              <>
                <TouchableOpacity style={styles.paw} onPress={() => setTapScore((n) => n + 1)}>
                  <Text style={styles.emoji}>🐾</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.rock} onPress={() => setTapScore((n) => Math.max(0, n - 1))}>
                  <Text style={styles.emoji}>🪨</Text>
                </TouchableOpacity>
                <Text style={styles.meta}>Tap the paw. Avoid the rock.</Text>
              </>
            ) : (
              <Text style={styles.heading}>Finished: {tapScore}</Text>
            )}
          </View>
        )}

        {mode === 'scramble' && (
          <>
            <Text style={styles.meta}>{built.join(' ') || 'Build the sentence'}</Text>
            <View style={styles.row}>
              {words.map((word, index) => (
                <TouchableOpacity
                  key={`${word}-${index}`}
                  style={styles.word}
                  onPress={() => {
                    setBuilt((prev) => [...prev, word]);
                    setWords((prev) => prev.filter((_, i) => i !== index));
                  }}
                >
                  <Text style={styles.buttonText}>{word}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {words.length === 0 && (
              <Text style={styles.meta}>
                {built.join(' ') === targetLaw ? 'Yes! Well done.' : 'Not quite. Try again from the menu.'}
              </Text>
            )}
          </>
        )}

        {mode === 'trail' && (
          <View style={styles.cardWide}>
            <Text style={styles.cardTitle}>
              Step {trailIndex + 1} of {TRAIL.length}
            </Text>
            <Text style={styles.meta}>{TRAIL[trailIndex].q}</Text>
            {TRAIL[trailIndex].options.map((option) => (
              <TouchableOpacity
                key={option}
                style={styles.button}
                onPress={() => {
                  const correct = option === TRAIL[trailIndex].answer;
                  setTrailMsg(correct ? 'Good path.' : 'Try another path.');
                  if (correct && trailIndex < TRAIL.length - 1) setTrailIndex((n) => n + 1);
                  if (correct && trailIndex === TRAIL.length - 1) setTrailMsg('You finished the trail!');
                }}
              >
                <Text style={styles.buttonText}>{option}</Text>
              </TouchableOpacity>
            ))}
            {!!trailMsg && <Text style={styles.meta}>{trailMsg}</Text>}
          </View>
        )}
      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: '#1a3c34' },
  backgroundImage: { opacity: 0.18, resizeMode: 'contain' },
  container: { flex: 1, backgroundColor: 'rgba(26, 60, 52, 0.55)', padding: 20 },
  heading: { color: '#ffffff', fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 16 },
  back: { color: '#ffd700', fontWeight: 'bold', marginBottom: 12 },
  button: {
    backgroundColor: '#ffd700',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonText: { color: '#1a3c34', fontWeight: 'bold' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  card: {
    width: 70,
    height: 70,
    backgroundColor: '#2a5a4a',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardWide: { backgroundColor: '#2a5a4a', borderRadius: 12, padding: 16 },
  cardTitle: { color: '#ffd700', fontWeight: 'bold', marginBottom: 8 },
  emoji: { fontSize: 28 },
  center: { alignItems: 'center' },
  meta: { color: '#a8d5c0', textAlign: 'center', marginBottom: 12 },
  paw: { backgroundColor: '#ffd700', padding: 24, borderRadius: 80, marginBottom: 12 },
  rock: { backgroundColor: '#7a2a2a', padding: 16, borderRadius: 12, marginBottom: 12 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  word: { backgroundColor: '#ffd700', padding: 10, borderRadius: 8 },
});
