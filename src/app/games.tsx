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

const ANIMALS = [
  { name: 'Wolf', mark: 'W', color: '#e0b322', ink: '#1a3c34' },
  { name: 'Lion', mark: 'L', color: '#e07a2f', ink: '#1a140c' },
  { name: 'Bear', mark: 'B', color: '#8d5a3c', ink: '#fff8ee' },
  { name: 'Owl', mark: 'O', color: '#7b6bb5', ink: '#fff8ee' },
  { name: 'Fox', mark: 'F', color: '#d4543c', ink: '#fff8ee' },
  { name: 'Rabbit', mark: 'R', color: '#e7a0b4', ink: '#1a3c34' },
  { name: 'Panda', mark: 'P', color: '#f4f1ea', ink: '#1a3c34' },
  { name: 'Duck', mark: 'D', color: '#3aa6a0', ink: '#062826' },
];

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

const MENU = [
  { key: 'Paw memory', blurb: 'Flip coloured animal tiles across 4 boards.', tint: '#e0b322' },
  { key: 'Do Your Best tap', blurb: 'A big changing badge. Gold and blue are safe. Red is not.', tint: '#e07a2f' },
  { key: 'Law scramble', blurb: 'Build the gold sentence from word tiles.', tint: '#7b6bb5' },
  { key: 'Trail walk', blurb: 'Follow the camp path. Each dot is a choice.', tint: '#3aa6a0' },
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

function animalFor(name: string) {
  return ANIMALS.find((item) => item.name === name) || ANIMALS[0];
}

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const width = Math.max(6, Math.min(100, (value / max) * 100));
  return (
    <View style={styles.barTrack}>
      <View style={[styles.barFill, { width: `${width}%`, backgroundColor: color }]} />
    </View>
  );
}

function Lives({ count }: { count: number }) {
  return (
    <View style={styles.lifeRow}>
      {Array.from({ length: 5 }, (_, index) => (
        <View key={index} style={[styles.lifeDot, index < count ? styles.lifeOn : styles.lifeOff]} />
      ))}
    </View>
  );
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
  const [tapNote, setTapNote] = useState('Gold PAW and blue SIX. Never the red ROCK.');
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
    AsyncStorage.getItem(BEST_KEY)
      .then((raw) => {
        if (raw) setBest(JSON.parse(raw));
      })
      .catch(() => undefined);
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
    const faces = ANIMALS.slice(0, pairs).map((item) => item.name);
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
          if (level < MEMORY_SIZES.length - 1) setTimeout(() => startMemory(level + 1), 450);
          else finish('Paw memory', bonus);
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
    setTapNote('Gold PAW and blue SIX. Never the red ROCK.');
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
      if (sentenceIndex < SENTENCES.length - 1) setTimeout(() => loadSentence(sentenceIndex + 1), 450);
      else finish('Law scramble', nextScore + livesRef.current * 6);
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
    setTrailNote('Pick the Cub way.');
    setMode('trail');
  }

  function chooseTrail(option: string) {
    const correct = option === TRAIL[step].answer;
    if (!correct) {
      const left = livesRef.current - 1;
      setLifeCount(left);
      setTrailNote('Wrong path. Try a different colour.');
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
      setTrailNote('Good path.');
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
  const targetColor = target === 'paw' ? '#e0b322' : target === 'six' ? '#3aa6a0' : '#c44536';
  const targetWord = target === 'paw' ? 'PAW' : target === 'six' ? 'SIX' : 'ROCK';
  const targetHint = target === 'rock' ? 'Leave it' : 'Tap';

  return (
    <ImageBackground
      source={require('../../assets/images/splash-icon.png')}
      style={styles.background}
      imageStyle={styles.backgroundImage}
    >
      <ScrollView scrollEnabled={mode !== 'tap'} contentContainerStyle={styles.container}>
        <Text style={styles.kicker}>PACK GAMES</Text>
        <Text style={styles.heading}>Do your best</Text>
        {mode !== 'menu' && mode !== 'done' && (
          <TouchableOpacity onPress={goMenu}>
            <Text style={styles.back}>Back to games</Text>
          </TouchableOpacity>
        )}

        {mode === 'menu' &&
          MENU.map((item) => (
            <TouchableOpacity
              key={item.key}
              style={styles.menuCard}
              onPress={() => {
                if (item.key === 'Paw memory') startMemory(0);
                if (item.key === 'Do Your Best tap') startTap();
                if (item.key === 'Law scramble') startScramble();
                if (item.key === 'Trail walk') startTrail();
              }}
            >
              <View style={[styles.swatch, { backgroundColor: item.tint }]} />
              <View style={styles.menuCopy}>
                <Text style={styles.cardTitle}>{item.key}</Text>
                <Text style={styles.metaLeft}>{item.blurb}</Text>
                {!!best[item.key] && <Text style={styles.best}>Best {best[item.key]}</Text>}
              </View>
            </TouchableOpacity>
          ))}

        {mode === 'memory' && (
          <>
            <Text style={styles.hud}>
              Board {level + 1} of {MEMORY_SIZES.length}  ·  Moves {moves}  ·  {score} pts
            </Text>
            <Lives count={lives} />
            <Bar value={level + 1} max={MEMORY_SIZES.length} color="#e0b322" />
            <View style={styles.grid}>
              {cards.map((card) => {
                const animal = animalFor(card.face);
                const shown = card.open || card.done;
                return (
                  <TouchableOpacity
                    key={card.id}
                    style={[
                      styles.tile,
                      {
                        backgroundColor: shown ? animal.color : '#10241f',
                        borderColor: card.done ? '#e0b322' : '#2f6a58',
                        opacity: card.done ? 0.55 : 1,
                      },
                    ]}
                    onPress={() => flipCard(card.id)}
                  >
                    <Text style={[styles.tileMark, { color: shown ? animal.ink : '#e0b322' }]}>
                      {shown ? animal.mark : ''}
                    </Text>
                    <Text style={[styles.tileName, { color: shown ? animal.ink : '#8fbfae' }]}>
                      {shown ? animal.name : 'Flip'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        {mode === 'tap' && (
          <View style={styles.tapWrap}>
            <Text style={styles.hud}>
              {timeLeft}s  ·  {speedLabel}  ·  Combo {combo}  ·  {score}
            </Text>
            <Bar value={timeLeft} max={45} color={targetColor} />
            <Text style={styles.meta}>{tapNote}</Text>
            <TouchableOpacity
              style={[styles.badge, { backgroundColor: targetColor, borderColor: '#fff4cc' }]}
              onPress={pressTarget}
            >
              <View style={styles.badgeInner}>
                <Text style={styles.badgeWord}>{targetWord}</Text>
                <Text style={styles.badgeHint}>{targetHint}</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {mode === 'scramble' && (
          <>
            <Text style={styles.hud}>
              Line {sentenceIndex + 1} of {SENTENCES.length}  ·  {score} pts
            </Text>
            <Lives count={lives} />
            <Bar value={sentenceIndex + 1} max={SENTENCES.length} color="#7b6bb5" />
            <View style={styles.sentenceBox}>
              {built.length === 0 ? (
                <Text style={styles.placeholder}>Tap the tiles in order</Text>
              ) : (
                <View style={styles.row}>
                  {built.map((token) => (
                    <View key={token} style={styles.placed}>
                      <Text style={styles.placedText}>{token.split('#')[0]}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
            <TouchableOpacity style={styles.undo} onPress={undoWord}>
              <Text style={styles.undoText}>Undo last word</Text>
            </TouchableOpacity>
            <View style={styles.row}>
              {pool.map((token, index) => (
                <TouchableOpacity
                  key={token}
                  style={[styles.chip, { backgroundColor: ANIMALS[index % ANIMALS.length].color }]}
                  onPress={() => pickWord(token)}
                >
                  <Text style={[styles.chipText, { color: ANIMALS[index % ANIMALS.length].ink }]}>
                    {token.split('#')[0]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {mode === 'trail' && (
          <View>
            <Text style={styles.hud}>
              Camp step {step + 1} of {TRAIL.length}  ·  {score} pts
            </Text>
            <Lives count={lives} />
            <View style={styles.path}>
              {TRAIL.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.pathDot,
                    index < step && styles.pathDone,
                    index === step && styles.pathNow,
                  ]}
                />
              ))}
            </View>
            <View style={styles.menuCard}>
              <Text style={styles.cardTitle}>{TRAIL[step].q}</Text>
              {trailOptions.map((option, index) => (
                <TouchableOpacity
                  key={option}
                  style={[styles.choice, { borderLeftColor: ANIMALS[index % 3].color }]}
                  onPress={() => chooseTrail(option)}
                >
                  <Text style={styles.choiceText}>{option}</Text>
                </TouchableOpacity>
              ))}
              {!!trailNote && <Text style={styles.meta}>{trailNote}</Text>}
            </View>
          </View>
        )}

        {mode === 'done' && (
          <View style={styles.result}>
            <Text style={styles.kicker}>ROUND OVER</Text>
            <Text style={styles.cardTitle}>{title}</Text>
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
  background: { flex: 1, backgroundColor: '#12352d' },
  backgroundImage: { opacity: 0.16, resizeMode: 'contain' },
  container: { padding: 18, paddingBottom: 56 },
  kicker: {
    color: '#e0b322',
    letterSpacing: 3,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  heading: {
    color: '#fffaf0',
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  back: { color: '#e0b322', fontWeight: 'bold', marginBottom: 12, textAlign: 'center' },
  meta: { color: '#c9e6da', marginTop: 8, textAlign: 'center' },
  metaLeft: { color: '#c9e6da', marginTop: 4 },
  hud: { color: '#fffaf0', fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
  menuCard: {
    flexDirection: 'row',
    backgroundColor: '#1d4a3e',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    alignItems: 'center',
  },
  swatch: { width: 18, alignSelf: 'stretch', borderRadius: 9, marginRight: 12 },
  menuCopy: { flex: 1 },
  cardTitle: { color: '#fffaf0', fontWeight: 'bold', fontSize: 18 },
  best: { color: '#e0b322', marginTop: 6, fontWeight: 'bold' },
  barTrack: {
    height: 10,
    backgroundColor: '#0c241e',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 14,
  },
  barFill: { height: 10, borderRadius: 8 },
  lifeRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 10 },
  lifeDot: { width: 16, height: 16, borderRadius: 8 },
  lifeOn: { backgroundColor: '#e0b322' },
  lifeOff: { backgroundColor: '#2a4038' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10 },
  tile: {
    width: 104,
    height: 104,
    borderRadius: 18,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileMark: { fontSize: 36, fontWeight: '900' },
  tileName: { fontSize: 13, fontWeight: 'bold', marginTop: 2 },
  tapWrap: { alignItems: 'center' },
  badge: {
    width: 260,
    height: 260,
    borderRadius: 130,
    borderWidth: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  badgeInner: {
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: 'rgba(0,0,0,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeWord: { color: '#fffaf0', fontSize: 42, fontWeight: '900' },
  badgeHint: { color: '#fffaf0', fontSize: 16, marginTop: 6, fontWeight: 'bold' },
  sentenceBox: {
    minHeight: 84,
    backgroundColor: '#0c241e',
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
    justifyContent: 'center',
  },
  placeholder: { color: '#8fbfae', textAlign: 'center' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  placed: { backgroundColor: '#e0b322', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 10 },
  placedText: { color: '#1a3c34', fontWeight: 'bold' },
  chip: { borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14 },
  chipText: { fontWeight: 'bold', fontSize: 16 },
  undo: { alignSelf: 'center', marginBottom: 12, padding: 8 },
  undoText: { color: '#e0b322', fontWeight: 'bold' },
  path: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginBottom: 12 },
  pathDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#2a4038' },
  pathDone: { backgroundColor: '#3aa6a0' },
  pathNow: { backgroundColor: '#e0b322', width: 18, height: 18, borderRadius: 9 },
  choice: {
    backgroundColor: '#12352d',
    borderRadius: 12,
    borderLeftWidth: 8,
    padding: 12,
    marginTop: 8,
  },
  choiceText: { color: '#fffaf0', fontWeight: 'bold' },
  result: {
    backgroundColor: '#1d4a3e',
    borderRadius: 22,
    padding: 22,
    alignItems: 'center',
  },
  score: { color: '#fffaf0', fontSize: 64, fontWeight: '900', marginVertical: 6 },
  play: {
    backgroundColor: '#e0b322',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
    marginTop: 14,
  },
  playText: { color: '#1a3c34', fontWeight: 'bold', fontSize: 16 },
});
