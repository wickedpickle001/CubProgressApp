import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../lib/supabase';

const PACKS = ['11th PMB', '4th PMB', '1st Howick'];

export default function UsersScreen() {
  const [role, setMyRole] = useState('');
  const [myPack, setMyPack] = useState('');
  const [users, setUsers] = useState<any[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  async function loadData() {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    if (!user) {
      setMyRole('');
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, pack_name')
      .eq('id', user.id)
      .maybeSingle();

    setMyRole(profile?.role || '');
    setMyPack(profile?.pack_name || '');

    if (profile?.role !== 'admin' && profile?.role !== 'leader') {
      return;
    }

    let query = supabase
      .from('profiles')
      .select('id, full_name, role, pack_name, pack_status')
      .order('full_name');

    if (profile?.role === 'leader' && profile.pack_name) {
      query = query.eq('pack_name', profile.pack_name);
    }

    const { data, error } = await query;
    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    setUsers(data || []);
  }

  async function setRole(id: string, nextRole: string) {
    const { error } = await supabase.from('profiles').update({ role: nextRole }).eq('id', id);
    if (error) {
      Alert.alert('Could not update', error.message);
      return;
    }
    loadData();
  }

  async function setPack(id: string, packName: string) {
    const { error } = await supabase.from('profiles').update({ pack_name: packName }).eq('id', id);
    if (error) {
      Alert.alert('Could not update pack', error.message);
      return;
    }
    loadData();
  }

  async function setPackStatus(id: string, packStatus: string) {
    const { error } = await supabase.from('profiles').update({ pack_status: packStatus }).eq('id', id);
    if (error) {
      Alert.alert('Could not update access', error.message);
      return;
    }
    loadData();
  }

  if (role !== 'admin' && role !== 'leader') {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Leaders and admin only</Text>
        <Text style={styles.subtitle}>Only pack leaders and the main admin can manage cubs.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.heading}>{role === 'admin' ? 'Manage all packs' : `Manage ${myPack}`}</Text>
      <Text style={styles.subtitle}>Accept cubs into the pack before they can take part.</Text>

      {users.map((person) => (
        <View key={person.id} style={styles.card}>
          <Text style={styles.cardTitle}>{person.full_name || 'No name'}</Text>
          <Text style={styles.status}>Role: {person.role}</Text>
          <Text style={styles.status}>Pack: {person.pack_name || 'Not set'}</Text>
          <Text style={styles.status}>Access: {person.pack_status || 'pending'}</Text>

          <View style={styles.row}>
            <TouchableOpacity style={styles.button} onPress={() => setPackStatus(person.id, 'approved')}>
              <Text style={styles.buttonText}>Accept into pack</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.rejectButton} onPress={() => setPackStatus(person.id, 'rejected')}>
              <Text style={styles.rejectText}>Reject</Text>
            </TouchableOpacity>
          </View>

          {role === 'admin' && (
            <>
              <View style={styles.row}>
                <TouchableOpacity style={styles.button} onPress={() => setRole(person.id, 'cub')}>
                  <Text style={styles.buttonText}>Cub</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.button} onPress={() => setRole(person.id, 'leader')}>
                  <Text style={styles.buttonText}>Leader</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.row}>
                {PACKS.map((pack) => (
                  <TouchableOpacity
                    key={pack}
                    style={[styles.packButton, person.pack_name === pack && styles.packActive]}
                    onPress={() => setPack(person.id, pack)}
                  >
                    <Text style={styles.packText}>{pack}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a3c34',
    padding: 20,
  },
  center: {
    flex: 1,
    backgroundColor: '#1a3c34',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    color: '#a8d5c0',
    textAlign: 'center',
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#2a5a4a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: {
    color: '#ffd700',
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 6,
  },
  status: {
    color: '#ffffff',
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  button: {
    backgroundColor: '#ffd700',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  buttonText: {
    color: '#1a3c34',
    fontWeight: 'bold',
  },
  rejectButton: {
    backgroundColor: '#7a2a2a',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  rejectText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  packButton: {
    backgroundColor: '#1a3c34',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  packActive: {
    backgroundColor: '#ffd700',
  },
  packText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
});