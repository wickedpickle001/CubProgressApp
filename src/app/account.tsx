import type { Session } from '@supabase/supabase-js';
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

export default function AccountScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('cub');
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) {
        loadProfile(data.session.user.id);
      }
    });

    const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        loadProfile(newSession.user.id);
      }
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  async function loadProfile(userId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('full_name, role')
      .eq('id', userId)
      .maybeSingle();

    if (data) {
      setFullName(data.full_name || '');
      setRole(data.role || 'cub');
    }
  }

  async function saveProfile(userId: string) {
    const { error } = await supabase.from('profiles').upsert({
      id: userId,
      full_name: fullName || email,
      role,
    });

    if (error) {
      Alert.alert('Profile error', error.message);
    }
  }

  async function signUp() {
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email, password });
    setLoading(false);

    if (error) {
      Alert.alert('Sign up error', error.message);
      return;
    }

    if (data.user) {
      await saveProfile(data.user.id);
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

  async function updateRole(nextRole: string) {
    setRole(nextRole);
    if (session?.user) {
      const { error } = await supabase.from('profiles').upsert({
        id: session.user.id,
        full_name: fullName || session.user.email,
        role: nextRole,
      });
      if (error) Alert.alert('Could not save role', error.message);
    }
  }

  if (session) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>You are signed in</Text>
        <Text style={styles.subtitle}>{session.user.email}</Text>

        <Text style={styles.label}>I am a</Text>
        <View style={styles.row}>
          {['cub', 'parent', 'leader'].map((item) => (
            <TouchableOpacity
              key={item}
              style={[styles.chip, role === item && styles.chipActive]}
              onPress={() => updateRole(item)}
            >
              <Text style={styles.chipText}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.button} onPress={signOut}>
          <Text style={styles.buttonText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Account</Text>
      <Text style={styles.subtitle}>Cubs, parents and leaders sign in here</Text>

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

      <Text style={styles.label}>I am a</Text>
      <View style={styles.row}>
        {['cub', 'parent', 'leader'].map((item) => (
          <TouchableOpacity
            key={item}
            style={[styles.chip, role === item && styles.chipActive]}
            onPress={() => setRole(item)}
          >
            <Text style={styles.chipText}>{item}</Text>
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
  label: {
    color: '#ffffff',
    marginBottom: 8,
    fontWeight: 'bold',
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    backgroundColor: '#2a5a4a',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  chipActive: {
    backgroundColor: '#ffd700',
  },
  chipText: {
    color: '#1a3c34',
    fontWeight: 'bold',
    textTransform: 'capitalize',
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