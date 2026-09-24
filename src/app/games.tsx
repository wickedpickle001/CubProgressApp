import { useEffect, useRef, useState } from 'react';
import {
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

type Mode = 'menu' | 'memory' | 'tap' | 'scramble' | 'trail' | 'done';

const FACES = ['Wolf', 'Lion', 'Bear', 'Owl', 'Fox', 'Rabbit', 'Panda', 'Duck'];
const MEMORY_SIZES = [3, 4, 6];

const SENTENCES = [
  ['Do', 'your', 'best'],
  ['Help', 'someone', 'every', 'day'],
  ['Keep', 'the', 'Law', 'of', 'the', 'Pack'],
  ['A', 'Cub', 'is', 'kind', 'and', 'brave'],
  ['Look', 'wide', 'and', 'do', 'a', 'good', 'turn'],
  ['Be', 'loyal', 'to', 'your', 'Six', 'and', 'your', 'pack'],
];

const TRAIL = [
  { q: 'The path splits. Which way?', options: ['Follow the markers', 'Leave the path', 'Run ahead alone'], answer: 'Follow the markers' },
  { q: 'A cub drops a water bottle.', options: ['Pick it up for them', 'Kick it away', 'Pretend you did not see'], answer: 'Pick it up for them' },
  { q: 'You hear thunder.', options: ['Tell the leader', 'Hide from the group', 'Climb the tallest tree'], answer: 'Tell the leader' },
  { q: 'The stream is fast.', options: ['Wait and cross with a leader', 'Wade in by yourself', 'Throw stones at fish'], answer: 'Wait and cross with a leader' },
  { q: 'You spot litter on the trail.', options: ['Pick up what is safe', 'Add your wrapper', 'Leave broken glass'], answer: 'Pick up what is safe' },
  { q: 'Your Six is tired.', options: ['Share a joke and walk together', 'Race off and leave them', 'Complain the whole way'], answer: 'Share a joke and walk together' },
  { q: 'You are unsure of the next marker.', options: ['Stop and check with Akela', 'Guess and keep going', 'Turn the sign around'], answer: 'Stop and check with Akela' },
  { q: 'Camp is in sight.', options: ['Help carry a bag', 'Rush the food table', 'Sit and wait to be served'], answer: 'Help carry a bag' },
];

function shuffle<T>(list: T[]) {
  const next = [...list];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function starsFor(score: number) {
  if (score >= 80) return 'Three stars';
  if (score >= 40) return 'Two stars';
  return 'One star';
}

export default function GamesScreen() {
  const [mode, setMode] = useState<Mode>('menu');
  const [title, setTitle] = useState('');
  const [score, setScore] = useState(0);
  const [best, setBest] = useState<Record<string, number>>({});

  const [level, setLevel] = useState(0);
  const [lives, setLives] = useState(3);
  const [cards, setCards] = useState<{ id: number; face: string; open: boolean; done: boolean }[]>([]);
  const [moves, setMoves] = useState(0);
  const lock = useRef(false);
  const scoreRef = useRef(0);

  const [timeLeft, setTimeLeft] = useState(20);
  const [showPaw, setShowPaw] = useState(true);
  const [combo, setCombo] = useState(0);
  const [tapNote, setTapNote] = useState('Tap only when it says PAW');
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);
  const playing = useRef(false);

  const [sentenceIndex, setSentenceIndex] = useState(0);
  const [pool, setPool] = useState<string[]>([]);
  const [built, setBuilt] = useState<string[]>([]);

  const [step, setStep] = useState(0);
  const [trailNote, setTrailNote] = useState('');

  useEffect(() => {
    return () => {
      if (tick.current) clearInterval(tick.current);
    };
  }, []);

  function setPoints(next: number) {
    scoreRef.current = next;
    setScore(next);
  }

  function finish(game: string, finalScore: number) {
    playing.current = false;
    if (tick.current) clearInterval(tick.current);
    setBest((prev) => ({ ...prev, [game]: Math.max(prev[game] || 0, finalScore) }));
    setPoints(finalScore);
    setTitle(game);
    setMode('done');
  }

  function goMenu() {
    playing.current = false;
    if (tick.current) clearInterval(tick.current);
    lock.current = false;
    setMode('menu');
  }

  function startMemory(nextLevel = 0) {
    const pairs = MEMORY_SIZES[nextLevel];
    const faces = FACES.slice(0, pairs);
    setCards(
      shuffle([...faces, ...faces]).map((face, id) => ({
        id,
        face,
        open: false,
        done: false,
      }))
    );
    setLevel(nextLevel);
    setMoves(0);
    setLives(3);
    if (nextLevel === 0) setPoints(0);
    lock.current = false;
    setMode('memory');
  }

  function flipCard(id: number) {
    if (lock.current) return;
    const card = cards.find((item) => item.id === id);
    if (!card || card.open || card.done) return;
    const opened = cards.filter((item) => item.open && !item.done);
    if (opened.length >= 2) return;

    const next = cards.map((item) => (item.id === id ? { ...item, open: true } : item));
    setCards(next);
    const nowOpen = next.filter((item) => item.open && !item.done);
    if (nowOpen.length < 2) return;

    setMoves((n) => n + 1);
    lock.current = true;
    const [a, b] = nowOpen;
    setTimeout(() => {
      if (a.face === b.face) {
        const matched = next.map((item) =>
          item.face === a.face ? { ...item, done: true, open: true } : item
        );
        setCards(matched);
        setPoints(scoreRef.current + 10);
        lock.current = false;
        if (matched.every((item) => item.done)) {
          if (level < MEMORY_SIZES.length - 1) {
            setTimeout(() => startMemory(level + 1), 400);
          } else {
            finish('Paw memory', scoreRef.current + lives * 5);
          }
        }
      } else {
        setCards((prev) =>
          prev.map((item) => (item.id === a.id || item.id === b.id ? { ...item, open: false } : item))
        );
        const left = lives - 1;
        setLives(left);
        lock.current = false;
        if (left <= 0) finish('Paw memory', scoreRef.current);
      }
    }, 650);
  }

  function nextTarget() {
    setShowPaw(Math.random() > 0.35);
  }

  function startTap() {
    playing.current = true;
    setPoints(0);
    setCombo(0);
    setTimeLeft(20);
    setShowPaw(true);
    setTapNote('Tap only when it says PAW');
    setMode('tap');
    if (tick.current) clearInterval(tick.current);
    tick.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (!playing.current) return prev;
        if (prev <= 1) {
          playing.current = false;
          if (tick.current) clearInterval(tick.current);
          finish('Do Your Best tap', scoreRef.current);
          return 0;
        }
        return prev - 1;
      });
      if (playing.current) nextTarget();
    }, 1000);
  }

  function pressTarget() {
    if (!playing.current) return;
    if (showPaw) {
      const nextCombo = combo + 1;
      setCombo(nextCombo);
      setPoints(scoreRef.current + 2 + Math.floor(nextCombo / 3));
      setTapNote('Good tap');
    } else {
      setCombo(0);
      setPoints(Math.max(0, scoreRef.current - 2));
      setTapNote('That was a rock. Wait for PAW.');
    }
    nextTarget();
  }

  function loadSentence(index: number) {
    const words = SENTENCES[index];
    setPool(shuffle(words.map((word, i) => `${word}#${i}`)));
    setBuilt([]);
    setSentenceIndex(index);
  }

  function startScramble() {
    setPoints(0);
    setLives(3);
    loadSentence(0);
    setMode('scramble');
  }

  function pickWord(token: string) {
    setBuilt((prev) => [...prev, token]);
    setPool((prev) => prev.filter((item) => item !== token));
  }

  useEffect(() => {
    if (mode !== 'scramble' || pool.length > 0 || built.length === 0) return;
    const answer = SENTENCES[sentenceIndex].join(' ');
    const attempt = built.map((token) => token.split('#')[0]).join(' ');
    if (attempt === answer) {
      const nextScore = scoreRef.current + 15;
      setPoints(nextScore);
      if (sentenceIndex < SENTENCES.length - 1) {
        setTimeout(() => loadSentence(sentenceIndex + 1), 500);
      } else {
        finish('Law scramble', nextScore + lives * 5);
      }
    } else {
      const left = lives - 1;
      setLives(left);
      if (left <= 0) finish('Law scramble', scoreRef.current);
      else loadSentence(sentenceIndex);
    }
  }, [pool, built, mode]);

  function startTrail() {
    setPoints(0);
    setLives(3);
    setStep(0);
    setTrailNote('');
    setMode('trail');
  }

  function chooseTrail(option: string) {
    const correct = option === TRAIL[step].answer;
    if (!correct) {
      const left = lives - 1;
      setLives(left);
      setTrailNote('Wrong path. Try again.');
      if (left <= 0) finish('Trail walk', scoreRef.current);
      return;
    }
    const nextScore = scoreRef.current + 12;
    setPoints(nextScore);
    setTrailNote('Good path.');
    if (step < TRAIL.length - 1) setStep((n) => n + 1);
    else finish('Trail walk', nextScore + lives * 8);
  }

  return (
    <ImageBackground
      source={require('../../assets/images/splash-icon.png')}
      style={styles.background}
      imageStyle={styles.backgroundImage}
    >
      <ScrollView scrollEnabled={mode !== 'tap'} contentContainerStyle={styles.container}>
        <Text style={styles.heading}>Cub Games</Text>
        {mode !== 'menu' && (
          <TouchableOpacity onPress={goMenu}>
            <Text style={styles.back}>Back to games</Text>
          </TouchableOpacity>
        )}

        {mode === 'menu' && (
          <>
            <Text style={styles.meta}>Longer rounds. Levels, lives and a score.</Text>
            {[
              ['Paw memory', 'Match the animal names across 3 boards.', () => startMemory(0)],
              ['Do Your Best tap', '20 seconds. Tap the big button only when it says PAW.', startTap],
              ['Law scramble', 'Six sentences, getting longer. A wrong order costs a life.', startScramble],
              ['Trail walk', 'Eight choices. Three wrong turns end the hike.', startTrail],
            ].map(([label, blurb, action]) => (
              <TouchableOpacity key={String(label)} style={styles.menuCard} onPress={action as () => void}>
                <Text style={styles.cardTitle}>{label as string}</Text>
                <Text style={styles.meta}>{blurb as string}</Text>
                {!!best[label as string] && <Text style={styles.best}>Best {best[label as string]}</Text>}
              </TouchableOpacity>
            ))}
          </>
        )}

        {mode === 'memory' && (
          <>
            <Text style={styles.hud}>
              Board {level + 1} of 3. Moves {moves}. Lives {lives}. Score {score}
            </Text>
            <View style={styles.grid}>
              {cards.map((card) => (
                <TouchableOpacity key={card.id} style={styles.memCard} onPress={() => flipCard(card.id)}>
                  <Text style={styles.face}>{card.open || card.done ? card.face : '?'}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {mode === 'tap' && (
          <View>
            <Text style={styles.hud}>
              Time {timeLeft}. Combo {combo}. Score {score}
            </Text>
            <Text style={styles.meta}>{tapNote}</Text>
            <TouchableOpacity
              style={[styles.target, showPaw ? styles.paw : styles.rock]}
              onPress={pressTarget}
            >
              <Text style={styles.targetWord}>{showPaw ? 'PAW' : 'ROCK'}</Text>
              <Text style={styles.targetHint}>{showPaw ? 'Tap me' : 'Do not tap'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {mode === 'scramble' && (
          <>
            <Text style={styles.hud}>
              Sentence {sentenceIndex + 1} of {SENTENCES.length}. Lives {lives}. Score {score}
            </Text>
            <View style={styles.built}>
              <Text style={styles.builtText}>
                {built.map((token) => token.split('#')[0]).join(' ') || 'Tap the words in order'}
              </Text>
            </View>
            <View style={styles.row}>
              {pool.map((token) => (
                <TouchableOpacity key={token} style={styles.word} onPress={() => pickWord(token)}>
                  <Text style={styles.wordText}>{token.split('#')[0]}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {mode === 'trail' && (
          <View style={styles.menuCard}>
            <Text style={styles.hud}>
              Step {step + 1} of {TRAIL.length}. Lives {lives}. Score {score}
            </Text>
            <Text style={styles.cardTitle}>{TRAIL[step].q}</Text>
            {TRAIL[step].options.map((option) => (
              <TouchableOpacity key={option} style={styles.word} onPress={() => chooseTrail(option)}>
                <Text style={styles.wordText}>{option}</Text>
              </TouchableOpacity>
            ))}
            {!!trailNote && <Text style={styles.meta}>{trailNote}</Text>}
          </View>
        )}

        {mode === 'done' && (
          <View style={styles.menuCard}>
            <Text style={styles.cardTitle}>{title} finished</Text>
            <Text style={styles.score}>{score}</Text>
            <Text style={styles.meta}>{starsFor(score)}</Text>
            <Text style={styles.best}>Best this visit: {best[title] || score}</Text>
            <TouchableOpacity style={styles.play} onPress={goMenu}>
              <Text style={styles.playText}>Play another</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: '#1a3c34' },
  backgroundImage: { opacity: 0.18, resizeMode: 'contain' },
  container: {
    backgroundColor: 'rgba(26, 60, 52, 0.55)',
    padding: 20,
    paddingBottom: 48,
  },
  heading: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  back: { color: '#ffd700', fontWeight: 'bold', marginBottom: 12 },
  meta: { color: '#a8d5c0', marginBottom: 8, textAlign: 'center' },
  hud: { color: '#ffd700', fontWeight: 'bold', marginBottom: 12, textAlign: 'center' },
  menuCard: {
    backgroundColor: '#2a5a4a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: { color: '#ffd700', fontWeight: 'bold', fontSize: 18, marginBottom: 6 },
  best: { color: '#ffffff', marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  memCard: {
    width: 96,
    height: 72,
    backgroundColor: '#2a5a4a',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  face: { color: '#ffffff', fontWeight: 'bold', textAlign: 'center' },
  target: {
    height: 220,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  paw: { backgroundColor: '#ffd700' },
  rock: { backgroundColor: '#7a2a2a' },
  targetWord: { color: '#1a3c34', fontSize: 42, fontWeight: 'bold' },
  targetHint: { color: '#1a3c34', fontSize: 16, marginTop: 8, fontWeight: 'bold' },
  built: {
    minHeight: 64,
    backgroundColor: '#143028',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  builtText: { color: '#ffffff', fontSize: 18, textAlign: 'center' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  word: {
    backgroundColor: '#ffd700',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  wordText: { color: '#1a3c34', fontWeight: 'bold' },
  score: { color: '#ffffff', fontSize: 48, fontWeight: 'bold', textAlign: 'center' },
  play: {
    backgroundColor: '#ffd700',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  playText: { color: '#1a3c34', fontWeight: 'bold' },
});
