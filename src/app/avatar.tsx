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

export default function AvatarScreen() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [avatar, setAvatar] = useState('🐺');

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
    const { data } = await supabase.from('profiles').select('avatar').eq('id', user.id).maybeSingle();
    if (data?.avatar) setAvatar(data.avatar);
  }

  async function save(next: string) {
    if (!userId) {
      Alert.alert('Please sign in', 'Use the Account tab first.');
      return;
    }
    const { error } = await supabase.from('profiles').update({ avatar: next }).eq('id', userId);
    if (error) {
      Alert.alert('Could not save', error.message);
      return;
    }
    setAvatar(next);
    Alert.alert('Saved', 'Your friends will see this avatar.');
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
            <TouchableOpacity key={item} style={styles.pick} onPress={() => save(item)}>
              <Text style={styles.emoji}>{item}</Text>
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
  title: { color: '#ffffff', fontSize: 24, fontWeight: 'bold', textAlign: 'center' },
  current: { fontSize: 64, textAlign: 'center', marginVertical: 16 },
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12 },
  pick: {
    backgroundColor: '#2a5a4a',
    width: 70,
    height: 70,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 32 },
});
