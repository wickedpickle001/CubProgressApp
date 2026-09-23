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

export default function ApproveScreen() {
  const [canApprove, setCanApprove] = useState(false);
  const [items, setItems] = useState<any[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  async function loadData() {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    if (!user) {
      setCanApprove(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      Alert.alert('Profile error', profileError.message);
      setCanApprove(false);
      return;
    }

    const allowed = profile?.role === 'leader' || profile?.role === 'admin';
    setCanApprove(allowed);
    if (!allowed) return;

    const { data, error } = await supabase
      .from('badge_submissions')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    setItems(data || []);
  }

  async function updateStatus(id: number, status: string) {
    const { error } = await supabase
      .from('badge_submissions')
      .update({ status })
      .eq('id', id);

    if (error) {
      Alert.alert('Could not update', error.message);
      return;
    }

    loadData();
  }

  if (!canApprove) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Leaders and admin only</Text>
        <Text style={styles.subtitle}>
          A main admin must assign you the Leader role before you can approve badges.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.heading}>Approve Badges</Text>

      {items.length === 0 && (
        <Text style={styles.subtitle}>No pending submissions.</Text>
      )}

      {items.map((item) => (
        <View key={item.id} style={styles.card}>
          <Text style={styles.cardTitle}>{item.badge_name}</Text>
          <Text style={styles.cardText}>{item.evidence_text}</Text>
          <Text style={styles.status}>Status: {item.status}</Text>

          <View style={styles.row}>
            <TouchableOpacity
              style={styles.button}
              onPress={() => updateStatus(item.id, 'approved')}
            >
              <Text style={styles.buttonText}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.rejectButton}
              onPress={() => updateStatus(item.id, 'rejected')}
            >
              <Text style={styles.rejectText}>Reject</Text>
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
    marginBottom: 20,
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
  },
  card: {
    backgroundColor: '#2a5a4a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffd700',
    marginBottom: 6,
  },
  cardText: {
    color: '#a8d5c0',
    marginBottom: 8,
  },
  status: {
    color: '#ffffff',
    fontStyle: 'italic',
    marginBottom: 12,
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
});