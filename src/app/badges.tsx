import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Alert,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity
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
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [progressCount, setProgressCount] = useState<Record<string, number>>({});
  const [statusByBadge, setStatusByBadge] = useState<Record<string, string>>({});
  const [notesByBadge, setNotesByBadge] = useState<Record<string, string>>({});

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

    const { data: progress } = await supabase
      .from('badge_progress')
      .select('badge_name, completed')
      .eq('user_id', user.id);

    const counts: Record<string, number> = {};
    progress?.forEach((row) => {
      if (row.completed) {
        counts[row.badge_name] = (counts[row.badge_name] || 0) + 1;
      }
    });
    setProgressCount(counts);

    const { data: submissions, error } = await supabase
      .from('badge_submissions')
      .select('badge_name, status, review_note')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    const statuses: Record<string, string> = {};
    const notes: Record<string, string> = {};
    submissions?.forEach((row) => {
      if (!statuses[row.badge_name]) {
        statuses[row.badge_name] = row.status;
        notes[row.badge_name] = row.review_note || '';
      }
    });
    setStatusByBadge(statuses);
    setNotesByBadge(notes);
  }

  function statusText(badge: string) {
    if (statusByBadge[badge]) return statusByBadge[badge];
    if (progressCount[badge]) return `${progressCount[badge]} requirement(s) saved`;
    return 'Not started';
  }

  return (
    <ImageBackground
      source={require('../../assets/images/splash-icon.png')}
      style={styles.background}
      imageStyle={styles.backgroundImage}
    >
      <ScrollView style={styles.container}>
        <Text style={styles.heading}>Interest Badges</Text>
        <Text style={styles.subheading}>Tap a badge to add evidence and save progress</Text>
        {!userId && <Text style={styles.note}>Sign in to save your progress.</Text>}

        {BADGES.map((badge, index) => (
          <TouchableOpacity
            key={`${index}-${badge}`}
            style={styles.card}
            onPress={() =>
              router.push({
                pathname: '/badge/[name]',
                params: {
                  name: badge.replace(/^[^A-Za-z]+/, '').replace(/\s+/g, '-').toLowerCase(),
                },
              })
            }
          >
            <Text style={styles.cardTitle}>{badge}</Text>
            <Text style={styles.cardText}>Status: {statusText(badge)}</Text>
            {!!notesByBadge[badge] && (
              <Text
                style={
                  statusByBadge[badge] === 'rejected' ? styles.rejectNote : styles.approveNote
                }
              >
                Leader said: {notesByBadge[badge]}
              </Text>
            )}
            <Text style={styles.open}>Open →</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: '#1a3c34',
  },
  backgroundImage: {
    opacity: 0.18,
    resizeMode: 'contain',
  },
  container: {
    flex: 1,
    backgroundColor: 'rgba(26, 60, 52, 0.55)',
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
    marginBottom: 16,
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
    fontSize: 15,
    color: '#a8d5c0',
    marginBottom: 8,
  },
  rejectNote: {
    color: '#ffb4b4',
    marginBottom: 8,
  },
  approveNote: {
    color: '#ffd700',
    marginBottom: 8,
  },
  open: {
    color: '#ffd700',
    fontWeight: 'bold',
  },
});