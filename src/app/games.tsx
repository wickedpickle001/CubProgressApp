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

const FACES = ['\uD83D\uDC3A', '\uD83E\uDD81', '\uD83D\uDC3B', '\uD83E\uDD89', '\uD83E\uDD8A', '\uD83D\uDC30', '\uD83D\uDC3C', '\uD83E\uDD86'];
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
  if (score >= 80) return '\u2B50\u2B50\u2B50';
  if (score >= 40) return '\u2B50\u2B50';
  return '\u2B50';
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

  const [timeLeft, setTimeLeft] = useState(30);
  const [paw, setPaw] = useState({ top: 40, left: 40 });
  const [rocks, setRocks] = useState<{ id: number; top: number; left: number }[]>([]);
  const [combo, setCombo] = useState(0);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);

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

  function finish(game: string, finalScore: number) {
    if (tick.current) clearInterval(tick.current);
    setBest((prev) => ({ ...prev, [game]: Math.max(prev[game] || 0, finalScore) }));
    setScore(finalScore);
    setTitle(game);
    setMode('done');
  }

  function goMenu() {
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
    if (nextLevel === 0) setScore(0);
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
        setScore((n) => n + 10);
        lock.current = false;
        if (matched.every((item) => item.done)) {
          if (level < MEMORY_SIZES.length - 1) {
            setTimeout(() => startMemory(level + 1), 400);
          } else {
            finish('Paw memory', score + 10 + lives * 5);
          }
        }
      } else {
        setCards((prev) =>
          prev.map((item) => (item.id === a.id || item.id === b.id ? { ...item, open: false } : item))
        );
        setLives((n) => {
          const left = n - 1;
          if (left <= 0) finish('Paw memory', score);
          return left;
        });
        lock.current = false;
      }
    }, 650);
  }

  function placePaw() {
    setPaw({
      top: 20 + Math.floor(Math.random() * 180),
      left: 20 + Math.floor(Math.random() * 180),
    });
    setRocks(
      Array.from({ length: 2 }, (_, id) => ({
        id,
        top: 20 + Math.floor(Math.random() * 180),
        left: 20 + Math.floor(Math.random() * 180),
      }))
    );
  }

  function startTap() {
    setScore(0);
    setCombo(0);
    setTimeLeft(30);
    placePaw();
    setMode('tap');
    if (tick.current) clearInterval(tick.current);
    tick.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (tick.current) clearInterval(tick.current);
          return 0;
        }
        return prev - 1;
      });
      placePaw();
    }, 900);
  }

  useEffect(() => {
    if (mode === 'tap' && timeLeft === 0) finish('Paw tap', score);
  }, [timeLeft, mode]);

  function hitPaw() {
    const nextCombo = combo + 1;
    setCombo(nextCombo);
    setScore((n) => n + 1 + Math.floor(nextCombo / 3));
    placePaw();
  }

  function hitRock() {
    setCombo(0);
    setScore((n) => Math.max(0, n - 2));
    setLives((n) => n);
  }

  function loadSentence(index: number) {
    const words = SENTENCES[index];
    setPool(shuffle(words.map((word, i) => `${word}#${i}`)));
    setBuilt([]);
    setSentenceIndex(index);
  }

  function startScramble() {
    setScore(0);
    setLives(3);
    loadSentence(0);
    setMode('scramble');
  }

  function pickWord(token: string) {
    setBuilt((prev) => [...prev, token]);
    setPool((prev) => prev.filter((item) => item !== token));
  }

  useEffect(() => {
    if (mode !== 'scramble' || pool.length > 0) return;
    const answer = SENTENCES[sentenceIndex].join(' ');
    const attempt = built.map((token) => token.split('#')[0]).join(' ');
    if (attempt === answer) {
      const nextScore = score + 15;
      setScore(nextScore);
      if (sentenceIndex < SENTENCES.length - 1) {
        setTimeout(() => loadSentence(sentenceIndex + 1), 500);
      } else {
        finish('Law scramble', nextScore + lives * 5);
      }
    } else {
      const left = lives - 1;
      setLives(left);
      if (left <= 0) finish('Law scramble', score);
      else loadSentence(sentenceIndex);
    }
  }, [pool, mode]);

  function startTrail() {
    setScore(0);
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
      if (left <= 0) finish('Trail walk', score);
      return;
    }
    const nextScore = score + 12;
    setScore(nextScore);
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
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.heading}>Cub Games</Text>
        {mode !== 'menu' && (
          <TouchableOpacity onPress={goMenu}>
            <Text style={styles.back}>\u2190 Games menu</Text>
          </TouchableOpacity>
        )}

        {mode === 'menu' && (
          <>
            <Text style={styles.meta}>Longer rounds. Levels, lives and a score.</Text>
            {[
              ['Paw memory', 'Match pairs across 3 boards. 3 wrong guesses and you stop.', () => startMemory(0)],
              ['Do Your Best tap', '30 seconds. The paw jumps. Rocks cost points.', startTap],
              ['Law scramble', 'Six sentences, getting longer. A wrong order costs a life.', startScramble],
              ['Trail walk', 'Eight choices. Three wrong turns end the hike.', startTrail],
            ].map(([label, blurb, action]) => (
              <TouchableOpacity key={String(label)} style={styles.menuCard} onPress={action as () => void}>
                <Text style={styles.cardTitle}>{label as string}</Text>
                <Text style={styles.meta}>{blurb as string}</Text>
                {!!best[label as string] && (
                  <Text style={styles.best}>Best {best[label as string]}</Text>
                )}
              </TouchableOpacity>
            ))}
          </>
        )}

        {mode === 'memory' && (
          <>
            <Text style={styles.hud}>
              Board {level + 1}/3 \u00b7 Moves {moves} \u00b7 Lives {'\u2764'.repeat(Math.max(lives, 0))} \u00b7 Score {score}
            </Text>
            <View style={styles.grid}>
              {cards.map((card) => (
                <TouchableOpacity key={card.id} style={styles.memCard} onPress={() => flipCard(card.id)}>
                  <Text style={styles.emoji}>{card.open || card.done ? card.face : '?'}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {mode === 'tap' && (
          <View>
            <Text style={styles.hud}>
              Time {timeLeft}s \u00b7 Combo {combo} \u00b7 Score {score}
            </Text>
            <View style={styles.arena}>
              <TouchableOpacity
                style={[styles.mover, { top: paw.top, left: paw.left, backgroundColor: '#ffd700' }]}
                onPress={hitPaw}
              >
                <Text style={styles.emoji}>\uD83D\uDC3E</Text>
              </TouchableOpacity>
              {rocks.map((rock) => (
                <TouchableOpacity
                  key={rock.id}
                  style={[styles.mover, { top: rock.top, left: rock.left, backgroundColor: '#7a2a2a' }]}
                  onPress={hitRock}
                >
                  <Text style={styles.emoji}>\uD83E\uDEA8</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.meta}>Tap the gold paw. Avoid the rocks. Combo every 3 hits.</Text>
          </View>
        )}

        {mode === 'scramble' && (
          <>
            <Text style={styles.hud}>
              Sentence {sentenceIndex + 1}/{SENTENCES.length} \u00b7 Lives {'\u2764'.repeat(Math.max(lives, 0))} \u00b7 Score {score}
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
              Step {step + 1}/{TRAIL.length} \u00b7 Lives {'\u2764'.repeat(Math.max(lives, 0))} \u00b7 Score {score}
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
    width: 72,
    height: 72,
    backgroundColor: '#2a5a4a',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 28 },
  arena: {
    height: 280,
    backgroundColor: '#143028',
    borderRadius: 16,
    marginBottom: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  mover: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
