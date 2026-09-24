import { useCallback, useState } from 'react';
import {
  Alert,
  ImageBackground,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';

const AVATARS = ['🐺', '🦁', '🐻', '🦉', '🦊', '🐰', '🐼', '🦆'];
const SIXES = ['Red Six', 'White Six', 'Black Six', 'Brown Six', 'Grey Six'];

export default function AvatarScreen() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [avatar, setAvatar] = useState('🐺');
  const [sixName, setSixName] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadAvatar();
    }, [])
  );

  async function loadAvatar() {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    if (!user) return;
    setUserId(user.id);
    const { data } = await supabase
      .from('profiles')
      .select('avatar, six_name')
      .eq('id', user.id)
      .maybeSingle();
    if (data?.avatar) setAvatar(data.avatar);
    if (data?.six_name) setSixName(data.six_name);
  }

  async function saveAvatar(next: string) {
    if (!userId) return;
    const { error } = await supabase.from('profiles').update({ avatar: next }).eq('id', userId);
    if (error) Alert.alert('Could not save', error.message);
    else setAvatar(next);
  }

  async function saveSix(next: string) {
    if (!userId) return;
    const { error } = await supabase.from('profiles').update({ six_name: next }).eq('id', userId);
    if (error) Alert.alert('Could not save', error.message);
    else setSixName(next);
  }

  return (
    <ImageBackground
      source={require('../../assets/images/splash-icon.png')}
      style={styles.background}
      imageStyle={styles.backgroundImage}
    >
      <View style={styles.container}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Choose your avatar</Text>
        <Text style={styles.current}>{avatar}</Text>
        <View style={styles.row}>
          {AVATARS.map((item) => (
            <TouchableOpacity key={item} style={styles.pick} onPress={() => saveAvatar(item)}>
              <Text style={styles.emoji}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.title}>My Six</Text>
        <Text style={styles.meta}>{sixName || 'Not set'}</Text>
        <View style={styles.row}>
          {SIXES.map((item) => (
            <TouchableOpacity key={item} style={styles.six} onPress={() => saveSix(item)}>
              <Text style={styles.buttonText}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: '#1a3c34' },
  backgroundImage: { opacity: 0.18, resizeMode: 'contain' },
  container: {
    flex: 1,
    backgroundColor: 'rgba(26, 60, 52, 0.55)',
    padding: 20,
    justifyContent: 'center',
  },
  back: { color: '#ffd700', fontWeight: 'bold', marginBottom: 16 },
  title: { color: '#ffffff', fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginTop: 16 },
  current: { fontSize: 64, textAlign: 'center', marginVertical: 12 },
  meta: { color: '#a8d5c0', textAlign: 'center', marginBottom: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12 },
  pick: {
    backgroundColor: '#2a5a4a',
    width: 70,
    height: 70,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  six: { backgroundColor: '#ffd700', padding: 10, borderRadius: 8 },
  buttonText: { color: '#1a3c34', fontWeight: 'bold' },
  emoji: { fontSize: 32 },
});
