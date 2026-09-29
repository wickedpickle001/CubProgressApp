import { useEffect, useRef, useState } from 'react';
import {
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Mode = 'menu' | 'memory' | 'tap' | 'scramble' | 'trail' | 'done';
type Target = 'paw' | 'rock' | 'six';

const BEST_KEY = 'cub-game-best';
const FACES = ['Wolf', 'Lion', 'Bear', 'Owl', 'Fox', 'Rabbit', 'Panda', 'Duck'];
const MEMORY_SIZES = [3, 4, 6, 8];

const SENTENCES = [
  ['Do', 'your', 'best'],
  ['Help', 'someone', 'today'],
  ['A', 'Cub', 'is', 'kind'],
  ['Keep', 'the', 'Pack', 'Law'],
  ['Look', 'wide', 'and', 'listen'],
  ['Share', 'with', 'your', 'Six'],
  ['Be', 'brave', 'and', 'helpful'],
  ['A', 'good', 'turn', 'every', 'day'],
  ['Follow', 'the', 'trail', 'markers'],
  ['Loyal', 'cubs', 'help', 'their', 'pack'],
];

const TRAIL = [
  { q: 'The path splits. Which way?', options: ['Follow the markers', 'Leave the path', 'Run ahead alone'], answer: 'Follow the markers' },
  { q: 'A cub drops a water bottle.', options: ['Pick it up for them', 'Kick it away', 'Pretend you did not see'], answer: 'Pick it up for them' },
  { q: 'You hear thunder.', options: ['Tell the leader', 'Hide from the group', 'Climb the tallest tree'], answer: 'Tell the leader' },
  { q: 'The stream is fast.', options: ['Wait and cross with a leader', 'Wade in by yourself', 'Throw stones at fish'], answer: 'Wait and cross with a leader' },
  { q: 'You spot litter on the trail.', options: ['Pick up what is safe', 'Add your wrapper', 'Leave broken glass'], answer: 'Pick up what is safe' },
  { q: 'Your Six is tired.', options: ['Walk together and share a joke', 'Race off and leave them', 'Complain the whole way'], answer: 'Walk together and share a joke' },
  { q: 'You are unsure of the next marker.', options: ['Stop and check with Akela', 'Guess and keep going', 'Turn the sign around'], answer: 'Stop and check with Akela' },
  { q: 'Someone forgot a hat.', options: ['Carry it to them', 'Hide it in a bush', 'Wear it and laugh'], answer: 'Carry it to them' },
  { q: 'The cook needs help.', options: ['Wash a cup', 'Eat before the others', 'Splash water around'], answer: 'Wash a cup' },
  { q: 'A younger cub is scared of the dark.', options: ['Walk beside them', 'Tell them to be quiet', 'Run ahead with the torch'], answer: 'Walk beside them' },
  { q: 'You find a bird nest. What do you do?', options: ['Look, then leave it alone', 'Take an egg', 'Poke the nest'], answer: 'Look, then leave it alone' },
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
  if (score >= 120) return 'Three stars';
  if (score >= 60) return 'Two stars';
  return 'One star';
}

function rollTarget(): Target {
  const roll = Math.random();
  if (roll < 0.55) return 'paw';
  if (roll < 0.8) return 'rock';
  return 'six';
}

function tapDelay(secondsLeft: number) {
  if (secondsLeft > 30) return 1200;
  if (secondsLeft > 15) return 850;
  return 600;
}

export default function GamesScreen() {
  const [mode, setMode] = useState<Mode>('menu');
  const [title, setTitle] = useState('');
  const [score, setScore] = useState(0);
  const [best, setBest] = useState<Record<string, number>>({});

  const [level, setLevel] = useState(0);
  const [lives, setLives] = useState(5);
  const [cards, setCards] = useState<{ id: number; face: string; open: boolean; done: boolean }[]>([]);
  const [moves, setMoves] = useState(0);
  const lock = useRef(false);
  const scoreRef = useRef(0);
  const livesRef = useRef(5);

  const [timeLeft, setTimeLeft] = useState(45);
  const [target, setTarget] = useState<Target>('paw');
  const [combo, setCombo] = useState(0);
  const [tapNote, setTapNote] = useState('Tap PAW. Tap SIX for extra. Never tap ROCK.');
  const tick = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playing = useRef(false);

  const [sentenceIndex, setSentenceIndex] = useState(0);
  const [pool, setPool] = useState<string[]>([]);
  const [built, setBuilt] = useState<string[]>([]);
  const checking = useRef(false);

  const [step, setStep] = useState(0);
  const [trailOptions, setTrailOptions] = useState<string[]>(TRAIL[0].options);
  const [trailNote, setTrailNote] = useState('');

  useEffect(() => {
    AsyncStorage.getItem(BEST_KEY).then((raw) => {
      if (raw) setBest(JSON.parse(raw));
    }).catch(() => undefined);
    return () => {
      if (tick.current) clearTimeout(tick.current);
    };
  }, []);

  function setPoints(next: number) {
    scoreRef.current = next;
    setScore(next);
  }

  function setLifeCount(next: number) {
    livesRef.current = next;
    setLives(next);
  }

  function finish(game: string, finalScore: number) {
    playing.current = false;
    if (tick.current) clearTimeout(tick.current);
    setBest((prev) => {
      const next = { ...prev, [game]: Math.max(prev[game] || 0, finalScore) };
      AsyncStorage.setItem(BEST_KEY, JSON.stringify(next)).catch(() => undefined);
      return next;
    });
    setPoints(finalScore);
    setTitle(game);
    setMode('done');
  }

  function goMenu() {
    playing.current = false;
    if (tick.current) clearTimeout(tick.current);
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
    if (nextLevel === 0) {
      setPoints(0);
      setLifeCount(5);
    }
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
          const bonus = scoreRef.current + livesRef.current * 4;
          if (level < MEMORY_SIZES.length - 1) {
            setTimeout(() => startMemory(level + 1), 450);
          } else {
            finish('Paw memory', bonus);
          }
        }
      } else {
        setCards((prev) =>
          prev.map((item) => (item.id === a.id || item.id === b.id ? { ...item, open: false } : item))
        );
        const left = livesRef.current - 1;
        setLifeCount(left);
        lock.current = false;
        if (left <= 0) finish('Paw memory', scoreRef.current);
      }
    }, 700);
  }

  function armTap(seconds: number) {
    if (tick.current) clearTimeout(tick.current);
    tick.current = setTimeout(() => {
      if (!playing.current) return;
      const next = seconds - 1;
      setTimeLeft(next);
      setTarget(rollTarget());
      if (next <= 0) {
        finish('Do Your Best tap', scoreRef.current);
        return;
      }
      armTap(next);
    }, tapDelay(seconds));
  }

  function startTap() {
    playing.current = true;
    setPoints(0);
    setCombo(0);
    setTimeLeft(45);
    setTarget('paw');
    setTapNote('Tap PAW. Tap SIX for extra. Never tap ROCK.');
    setMode('tap');
    armTap(45);
  }

  function pressTarget() {
    if (!playing.current) return;
    if (target === 'paw') {
      const nextCombo = combo + 1;
      setCombo(nextCombo);
      setPoints(scoreRef.current + 2 + Math.floor(nextCombo / 4));
      setTapNote('Good paw.');
    } else if (target === 'six') {
      const nextCombo = combo + 1;
      setCombo(nextCombo);
      setPoints(scoreRef.current + 5);
      setTapNote('Six bonus.');
    } else {
      setCombo(0);
      setPoints(Math.max(0, scoreRef.current - 3));
      setTapNote('That was a rock.');
    }
    setTarget(rollTarget());
  }

  function loadSentence(index: number) {
    checking.current = false;
    const words = SENTENCES[index];
    setPool(shuffle(words.map((word, i) => word + '#' + i)));
    setBuilt([]);
    setSentenceIndex(index);
  }

  function startScramble() {
    setPoints(0);
    setLifeCount(4);
    loadSentence(0);
    setMode('scramble');
  }

  function pickWord(token: string) {
    if (checking.current) return;
    setBuilt((prev) => [...prev, token]);
    setPool((prev) => prev.filter((item) => item !== token));
  }

  function undoWord() {
    if (checking.current) return;
    setBuilt((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setPool((words) => [...words, last]);
      return prev.slice(0, -1);
    });
  }

  useEffect(() => {
    if (mode !== 'scramble' || pool.length > 0 || built.length === 0 || checking.current) return;
    checking.current = true;
    const answer = SENTENCES[sentenceIndex].join(' ');
    const attempt = built.map((token) => token.split('#')[0]).join(' ');
    if (attempt === answer) {
      const nextScore = scoreRef.current + 12 + sentenceIndex * 2;
      setPoints(nextScore);
      if (sentenceIndex < SENTENCES.length - 1) {
        setTimeout(() => loadSentence(sentenceIndex + 1), 450);
      } else {
        finish('Law scramble', nextScore + livesRef.current * 6);
      }
    } else {
      const left = livesRef.current - 1;
      setLifeCount(left);
      if (left <= 0) finish('Law scramble', scoreRef.current);
      else setTimeout(() => loadSentence(sentenceIndex), 400);
    }
  }, [pool, built, mode, sentenceIndex]);

  function startTrail() {
    setPoints(0);
    setLifeCount(4);
    setStep(0);
    setTrailOptions(shuffle(TRAIL[0].options));
    setTrailNote('Choose the Cub way. The answers are mixed up.');
    setMode('trail');
  }

  function chooseTrail(option: string) {
    const correct = option === TRAIL[step].answer;
    if (!correct) {
      const left = livesRef.current - 1;
      setLifeCount(left);
      setTrailNote('Wrong path. The choices have been mixed again.');
      setTrailOptions(shuffle(TRAIL[step].options));
      if (left <= 0) finish('Trail walk', scoreRef.current);
      return;
    }
    const nextScore = scoreRef.current + 10;
    setPoints(nextScore);
    if (step < TRAIL.length - 1) {
      const nextStep = step + 1;
      setStep(nextStep);
      setTrailOptions(shuffle(TRAIL[nextStep].options));
      setTrailNote('Good path. Keep going.');
    } else {
      finish('Trail walk', nextScore + livesRef.current * 8);
    }
  }

  function replay() {
    if (title === 'Paw memory') startMemory(0);
    else if (title === 'Do Your Best tap') startTap();
    else if (title === 'Law scramble') startScramble();
    else if (title === 'Trail walk') startTrail();
    else goMenu();
  }

  const speedLabel = timeLeft > 30 ? 'Slow' : timeLeft > 15 ? 'Fast' : 'Faster';
  const targetStyle = target === 'paw' ? styles.paw : target === 'six' ? styles.six : styles.rock;
  const targetWord = target === 'paw' ? 'PAW' : target === 'six' ? 'SIX' : 'ROCK';
  const targetHint = target === 'rock' ? 'Do not tap' : 'Tap me';

  return (
    <ImageBackground
      source={require('../../assets/images/splash-icon.png')}
      style={styles.background}
      imageStyle={styles.backgroundImage}
    >
      <ScrollView scrollEnabled={mode !== 'tap'} contentContainerStyle={styles.container}>
        <Text style={styles.heading}>Cub Games</Text>
        {mode !== 'menu' && mode !== 'done' && (
          <TouchableOpacity onPress={goMenu}>
            <Text style={styles.back}>Back to games</Text>
          </TouchableOpacity>
        )}

        {mode === 'menu' && (
          <>
            <Text style={styles.meta}>Longer rounds. Your best score is saved on this phone.</Text>
            {[
              ['Paw memory', '4 boards, up to 16 cards. You have 5 lives for the whole game.', () => startMemory(0)],
              ['Do Your Best tap', '45 seconds. It gets faster. Tap PAW and SIX. Never tap ROCK.', startTap],
              ['Law scramble', '10 sentences. Undo a word if you tap the wrong one.', startScramble],
              ['Trail walk', '12 camp choices. The answers are shuffled. You have 4 lives.', startTrail],
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
              Board {level + 1} of {MEMORY_SIZES.length}. Moves {moves}. Lives {lives}. Score {score}
            </Text>
            <View style={styles.grid}>
              {cards.map((card) => (
                <TouchableOpacity key={card.id} style={[styles.memCard, card.done && styles.memDone]} onPress={() => flipCard(card.id)}>
                  <Text style={styles.face}>{card.open || card.done ? card.face : '?'}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {mode === 'tap' && (
          <View>
            <Text style={styles.hud}>
              Time {timeLeft}. {speedLabel}. Combo {combo}. Score {score}
            </Text>
            <Text style={styles.meta}>{tapNote}</Text>
            <TouchableOpacity style={[styles.target, targetStyle]} onPress={pressTarget}>
              <Text style={target === 'rock' ? styles.targetWordLight : styles.targetWord}>{targetWord}</Text>
              <Text style={target === 'rock' ? styles.targetHintLight : styles.targetHint}>{targetHint}</Text>
            </TouchableOpacity>
          </View>
        )}

        {mode === 'scramble' && (
          <>
            <Text style={styles.hud}>
              Sentence {sentenceIndex + 1} of {SENTENCES.length}. Lives {lives}. Score {score}
            </Text>
            <Text style={styles.meta}>Starts with {SENTENCES[sentenceIndex][0]}</Text>
            <View style={styles.built}>
              <Text style={styles.builtText}>
                {built.map((token) => token.split('#')[0]).join(' ') || 'Tap the words in order'}
              </Text>
            </View>
            <TouchableOpacity style={styles.undo} onPress={undoWord}>
              <Text style={styles.undoText}>Undo last word</Text>
            </TouchableOpacity>
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
            {trailOptions.map((option) => (
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
            <Text style={styles.best}>Best on this phone: {best[title] || score}</Text>
            <TouchableOpacity style={styles.play} onPress={replay}>
              <Text style={styles.playText}>Play again</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={goMenu}>
              <Text style={styles.back}>Back to games</Text>
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
  back: { color: '#ffd700', fontWeight: 'bold', marginBottom: 12, textAlign: 'center' },
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
  memDone: { backgroundColor: '#143028' },
  face: { color: '#ffffff', fontWeight: 'bold', textAlign: 'center' },
  target: {
    height: 240,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  paw: { backgroundColor: '#ffd700' },
  six: { backgroundColor: '#7ec8e3' },
  rock: { backgroundColor: '#7a2a2a' },
  targetWord: { color: '#1a3c34', fontSize: 48, fontWeight: 'bold' },
  targetHint: { color: '#1a3c34', fontSize: 16, marginTop: 8, fontWeight: 'bold' },
  targetWordLight: { color: '#ffffff', fontSize: 48, fontWeight: 'bold' },
  targetHintLight: { color: '#ffffff', fontSize: 16, marginTop: 8, fontWeight: 'bold' },
  built: {
    minHeight: 64,
    backgroundColor: '#143028',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  builtText: { color: '#ffffff', fontSize: 18, textAlign: 'center' },
  undo: {
    alignSelf: 'center',
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  undoText: { color: '#ffd700', fontWeight: 'bold' },
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
    marginBottom: 8,
  },
  playText: { color: '#1a3c34', fontWeight: 'bold' },
});
