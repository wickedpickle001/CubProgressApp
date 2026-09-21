import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../lib/supabase';

const STAGES = [
  { key: 'silver_wolf', title: '🥈 Silver Wolf', text: 'First major stage' },
  { key: 'gold_wolf', title: '🥇 Gold Wolf', text: 'Second major stage' },
  { key: 'leaping_wolf', title: '🐺 Leaping Wolf', text: 'Final Cub stage' },
  { key: 'link_badge', title: '🔗 Link Badge', text: 'Bridge from Cubs to Scouts' },
];

export default function AdvancementsScreen() {
  const [userId, setUserId] = useState<string | null>(null);
  const [statuses, setStatuses] = useState<Record<string, string>>({});

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    if (!user) {
      setUserId(null);
      return;
    }

    setUserId(user.id);

    const { data, error } = await supabase
      .from('advancements')
      .select('stage, status')
      .eq('user_id', user.id);

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    const next: Record<string, string> = {};
    STAGES.forEach((stage) => {
      next[stage.key] = 'not_started';
    });
    data?.forEach((row) => {
      next[row.stage] = row.status;
    });
    setStatuses(next);
  }

  async function updateStatus(stage: string, status: string) {
    if (!userId) {
      Alert.alert('Please sign in', 'Use the Account tab first.');
      return;
    }

    const { error } = await supabase.from('advancements').upsert(
      {
        user_id: userId,
        stage,
        status,
      },
      { onConflict: 'user_id,stage' }
    );

    if (error) {
      Alert.alert('Could not save', error.message);
      return;
    }

    setStatuses((prev) => ({ ...prev, [stage]: status }));
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.heading}>Your Advancement Journey</Text>
      {!userId && (
        <Text style={styles.note}>Sign in on the Account tab to save progress.</Text>
      )}

      {STAGES.map((stage) => (
        <View key={stage.key} style={styles.card}>
          <Text style={styles.cardTitle}>{stage.title}</Text>
          <Text style={styles.cardText}>{stage.text}</Text>
          <Text style={styles.status}>
            Status: {statuses[stage.key] || 'not_started'}
          </Text>

          <View style={styles.row}>
            <TouchableOpacity
              style={styles.smallButton}
              onPress={() => updateStatus(stage.key, 'in_progress')}
            >
              <Text style={styles.smallButtonText}>In progress</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.smallButton}
              onPress={() => updateStatus(stage.key, 'complete')}
            >
              <Text style={styles.smallButtonText}>Complete</Text>
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
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 24,
    textAlign: 'center',
  },
  note: {
    color: '#ffd700',
    textAlign: 'center',
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#2a5a4a',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffd700',
    marginBottom: 6,
  },
  cardText: {
    fontSize: 16,
    color: '#a8d5c0',
    marginBottom: 8,
  },
  status: {
    fontSize: 14,
    color: '#ffffff',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  smallButton: {
    backgroundColor: '#ffd700',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  smallButtonText: {
    color: '#1a3c34',
    fontWeight: 'bold',
  },
});