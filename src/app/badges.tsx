import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../lib/supabase';

const BADGES = [
  '🏕️ Aircraft Badge',
  '🔧 Aquanaut Badge',
  '🎨 Archaeologist Badge',
  '🎨 Artist Badge',
  '🎨 Athlete Badge',
  '🎨 Birds Badge',
  '🎨 Boating Badge',
  '🎨 Chess Badge',
  '🎨 Citizen Badge',
  '🎨 Civil Emergency Badge',
  '🎨 Collector Badge',
  '🎨 Computer Badge',
  '🎨 Conservation Badge',
  '🎨 Cooking Badge',
  '🎨 Craftsman Badge',
  '🎨 Cycling Badge',
  '🎨 Drawing Badge',
  '🎨 Engineer Badge',
  '🎨 Entertaining Badge',
  '🎨 Entrepreneur Badge',
  '🎨 Family Camping Badge',
  '🎨 First Aid & Health Badge',
  '🎨 Fishing Badge',
  '🎨 Flying Models Badge',
  '🎨 Food for Life Badge',
  '🎨 Gardening Badge',
  '🎨 Geocaching Badge',
  '🎨 Geologist Badge',
  '🎨 Handcraft Badge',
  '🎨 Herpetologist Badge',
  '🎨 Hiking Badge',
  '🎨 Homecraft Badge',
  '🎨 Indigenous Games Badge',
  '🎨 Landscaping Badge',
  '🎨 Linguist Badge',
  '🎨 Masks Badge',
  '🎨 miniSASS Badge',
  '🎨 Model Boats Badge',
  '🎨 Naturalist Badge',
  '🎨 Nature Craft Badge',
  '🎨 Open Water Swimmer Badge',
  '🎨 Outdoorsman Badge',
  '🎨 Pets Badge',
  '🎨 Photography Badge',
  '🎨 Projects Badge',
  '🎨 Recycling Badge',
  '🎨 Religion and Life Badge',
  '🎨 Repairs Badge',
  '🎨 Repairs Badge',
  '🎨 Scholar Badge',
  '🎨 Scientist Badge',
  '🎨 Secret Codes Badge',
  '🎨 Showman Badge',
  '🎨 Signalling Badge',
  '🎨 Simple Machines Badge',
  '🎨 Singing Badge',
  '🎨 Skies Badge',
  '🎨 Sleep Out Badge',
  '🎨 Sportsman Badge',
  '🎨 Swimmer Badge',
  '🎨 Traveller Badge',
  '🎨 Working Toys Badge',
  '🎨 World Friendship Badge',
];

export default function BadgesScreen() {
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedBadge, setSelectedBadge] = useState<string | null>(null);
  const [evidence, setEvidence] = useState('');
  const [submissions, setSubmissions] = useState<any[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  async function loadData() {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    if (!user) {
      setUserId(null);
      return;
    }

    setUserId(user.id);

    const { data, error } = await supabase
      .from('badge_submissions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    setSubmissions(data || []);
  }

  function getStatus(badgeName: string) {
    const match = submissions.find((item) => item.badge_name === badgeName);
    return match ? match.status : 'Not started';
  }

  async function submitEvidence(badgeName: string) {
    if (!userId) {
      Alert.alert('Please sign in', 'Use the Account tab first.');
      return;
    }

    if (!evidence.trim()) {
      Alert.alert('Missing evidence', 'Type what the cub did first.');
      return;
    }

    const { error } = await supabase.from('badge_submissions').insert({
      user_id: userId,
      badge_name: badgeName,
      evidence_text: evidence,
      status: 'pending',
    });

    if (error) {
      Alert.alert('Could not submit', error.message);
      return;
    }

    setEvidence('');
    setSelectedBadge(null);
    Alert.alert('Submitted', `${badgeName} has been sent for approval.`);
    loadData();
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.heading}>Interest Badges</Text>
      <Text style={styles.subheading}>Log your evidence and submit for approval</Text>

      {BADGES.map((badge) => (
        <View key={badge} style={styles.card}>
          <Text style={styles.cardTitle}>{badge}</Text>
          <Text style={styles.cardText}>Status: {getStatus(badge)}</Text>

          {selectedBadge === badge ? (
            <>
              <TextInput
                style={styles.input}
                placeholder="Type the evidence here"
                placeholderTextColor="#88b8a8"
                multiline
                value={evidence}
                onChangeText={setEvidence}
              />
              <TouchableOpacity style={styles.button} onPress={() => submitEvidence(badge)}>
                <Text style={styles.buttonText}>Submit for approval</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setSelectedBadge(null)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={styles.button} onPress={() => setSelectedBadge(badge)}>
              <Text style={styles.buttonText}>Log progress</Text>
            </TouchableOpacity>
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
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  subheading: {
    fontSize: 14,
    color: '#a8d5c0',
    marginBottom: 24,
    textAlign: 'center',
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
    fontSize: 15,
    color: '#a8d5c0',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#1a3c34',
    color: '#ffffff',
    borderRadius: 10,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#ffd700',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  buttonText: {
    color: '#1a3c34',
    fontWeight: 'bold',
    fontSize: 14,
  },
  cancelText: {
    color: '#ffd700',
    marginTop: 10,
    fontWeight: 'bold',
  },
});