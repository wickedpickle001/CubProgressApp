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

export default function UsersScreen() {
  const [isAdmin, setIsAdmin] = useState(false);
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
      setIsAdmin(false);
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.role !== 'admin') {
      setIsAdmin(false);
      return;
    }

    setIsAdmin(true);

    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .order('full_name');

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    setUsers(data || []);
  }

  async function setRole(id: string, role: string) {
    const { error } = await supabase.from('profiles').update({ role }).eq('id', id);
    if (error) {
      Alert.alert('Could not update', error.message);
      return;
    }
    loadData();
  }

  if (!isAdmin) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Main admin only</Text>
        <Text style={styles.subtitle}>
          Only the main admin can assign Cub and Leader roles.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.heading}>Assign Roles</Text>
      <Text style={styles.subtitle}>New people start as Cubs. Change leaders here.</Text>

      {users.map((person) => (
        <View key={person.id} style={styles.card}>
          <Text style={styles.cardTitle}>{person.full_name || 'No name'}</Text>
          <Text style={styles.status}>Current role: {person.role}</Text>
          <View style={styles.row}>
            <TouchableOpacity style={styles.button} onPress={() => setRole(person.id, 'cub')}>
              <Text style={styles.buttonText}>Cub</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={() => setRole(person.id, 'leader')}>
              <Text style={styles.buttonText}>Leader</Text>
            </TouchableOpacity>
          </View>
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
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
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
});