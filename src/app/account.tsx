import type { Session } from '@supabase/supabase-js';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../lib/supabase';

const PACKS = ['11th PMB', '4th PMB', '1st Howick'];

export default function AccountScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [packName, setPackName] = useState('');
  const [role, setRole] = useState('cub');
  const [packStatus, setPackStatus] = useState('pending');
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) loadProfile(data.session.user.id);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) loadProfile(newSession.user.id);
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  async function loadProfile(userId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('full_name, role, pack_name, pack_status')
      .eq('id', userId)
      .maybeSingle();

    if (data) {
      setFullName(data.full_name || '');
      setRole(data.role || 'cub');
      setPackName(data.pack_name || '');
      setPackStatus(data.pack_status || 'pending');
    }
  }

  async function signUp() {
    if (!packName) {
      Alert.alert('Choose a pack', 'Select 11th PMB, 4th PMB or 1st Howick.');
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email, password });
    setLoading(false);

    if (error) {
      Alert.alert('Sign up error', error.message);
      return;
    }

    if (data.user) {
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: data.user.id,
        full_name: fullName || email,
        role: 'cub',
        pack_name: packName,
        pack_status: 'pending',
      });

      if (profileError) {
        Alert.alert('Profile error', profileError.message);
      } else {
        Alert.alert(
          'Account created',
          'You are pending. A leader from that pack must accept you before you can use the pack features.'
        );
      }
    }
  }

  async function signIn() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) Alert.alert('Sign in error', error.message);
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  if (session) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>You are signed in</Text>
        <Text style={styles.subtitle}>{session.user.email}</Text>
        <Text style={styles.role}>Role: {role}</Text>
        <Text style={styles.role}>Pack: {packName || 'Not set'}</Text>
        <Text style={styles.role}>Pack access: {packStatus}</Text>

        {(role === 'admin' || role === 'leader') && (
          <TouchableOpacity style={styles.button} onPress={() => router.push('/users')}>
            <Text style={styles.buttonText}>Manage pack</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.button} onPress={signOut}>
          <Text style={styles.buttonText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Account</Text>
      <Text style={styles.subtitle}>Choose your pack. A leader will accept you.</Text>

      <TextInput
        style={styles.input}
        placeholder="Full name"
        placeholderTextColor="#88b8a8"
        value={fullName}
        onChangeText={setFullName}
      />

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#88b8a8"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#88b8a8"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <Text style={styles.label}>My pack</Text>
      <View style={styles.row}>
        {PACKS.map((pack) => (
          <TouchableOpacity
            key={pack}
            style={[styles.packButton, packName === pack && styles.packActive]}
            onPress={() => setPackName(pack)}
          >
            <Text style={styles.packText}>{pack}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.button} onPress={signIn} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Please wait...' : 'Sign In'}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryButton} onPress={signUp} disabled={loading}>
        <Text style={styles.secondaryText}>Create Account</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a3c34',
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#a8d5c0',
    textAlign: 'center',
    marginBottom: 24,
  },
  role: {
    color: '#ffd700',
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: 'bold',
  },
  label: {
    color: '#ffffff',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  packButton: {
    backgroundColor: '#2a5a4a',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  packActive: {
    backgroundColor: '#ffd700',
  },
  packText: {
    color: '#1a3c34',
    fontWeight: 'bold',
  },
  input: {
    backgroundColor: '#2a5a4a',
    color: '#ffffff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#ffd700',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#1a3c34',
    fontWeight: 'bold',
    fontSize: 16,
  },
  secondaryButton: {
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  secondaryText: {
    color: '#ffd700',
    fontWeight: 'bold',
  },
});