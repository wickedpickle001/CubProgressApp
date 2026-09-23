import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
    Alert,
    Image,
    Linking,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { supabase } from '../../lib/supabase';

const BADGE_NAMES = [
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

function slugify(badge: string) {
  return badge.replace(/^[^A-Za-z]+/, '').replace(/\s+/g, '-').toLowerCase();
}

function findBadge(slug: string) {
  return BADGE_NAMES.find((badge) => slugify(badge) === slug) || slug;
}

const DEFAULT_REQUIREMENTS = [
  'Requirement 1',
  'Requirement 2',
  'Requirement 3',
  'Requirement 4',
];

const SPECIAL_REQUIREMENTS: Record<string, string[]> = {
  '🏕️ Aircraft Badge': [
    'Requirement 1: Identify different aircraft',
    'Requirement 2: Make and fly a model aircraft',
    'Requirement 3: Sketch and label aircraft parts',
    'Requirement 4: Sketch and label an airfield',
  ],
};

export default function BadgeDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ name: string }>();
  const slug = String(params.name || '');
  const badgeName = findBadge(slug);
  const requirements = SPECIAL_REQUIREMENTS[badgeName] || DEFAULT_REQUIREMENTS;

  const [userId, setUserId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [photoPaths, setPhotoPaths] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      async function loadProgress() {
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData.session?.user;
        if (!user || cancelled) {
          if (!user) setUserId(null);
          return;
        }

        setUserId(user.id);

        const { data, error } = await supabase
          .from('badge_progress')
          .select('requirement_key, evidence_text, completed, photo_url, photo_data')
          .eq('user_id', user.id)
          .eq('badge_name', badgeName);

        if (error) {
          Alert.alert('Error', error.message);
          return;
        }

        const nextNotes: Record<string, string> = {};
        const nextDone: Record<string, boolean> = {};
        const nextPhotos: Record<string, string> = {};
        const nextPaths: Record<string, string> = {};

        for (const row of data || []) {
          nextNotes[row.requirement_key] = row.evidence_text || '';
          nextDone[row.requirement_key] = !!row.completed;
          if (row.photo_url) nextPaths[row.requirement_key] = row.photo_url;
          if (row.photo_data) nextPhotos[row.requirement_key] = row.photo_data;
        }

        if (cancelled) return;

        setNotes(nextNotes);
        setDone(nextDone);
        setPhotoPaths(nextPaths);
        setPhotos(nextPhotos);
      }

      loadProgress();
      return () => {
        cancelled = true;
      };
    }, [badgeName])
  );

  async function pickPhoto(item: string) {
    if (!userId) {
      Alert.alert('Please sign in', 'Use the Account tab first.');
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow photo access.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.4,
      base64: true,
    });

    if (result.canceled || !result.assets?.[0]) return;

    const image = result.assets[0];
    const dataUrl = image.base64 ? `data:image/jpeg;base64,${image.base64}` : image.uri;
    setPhotos((prev) => ({ ...prev, [item]: dataUrl }));

    const fileName = `${userId}/${slugify(badgeName)}/${Date.now()}.jpg`;
    const response = await fetch(image.uri);
    const arrayBuffer = await response.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from('badge-evidence')
      .upload(fileName, arrayBuffer, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (uploadError) {
      Alert.alert('Upload failed', uploadError.message);
      return;
    }

    setPhotoPaths((prev) => ({ ...prev, [item]: fileName }));
  }

  async function saveProgress() {
    if (!userId) {
      Alert.alert('Please sign in', 'Use the Account tab first.');
      return;
    }

    setSaving(true);

    const rows = requirements.map((item) => ({
      user_id: userId,
      badge_name: badgeName,
      requirement_key: item,
      evidence_text: notes[item] || '',
      completed: !!done[item],
      photo_url: photoPaths[item] || null,
      photo_data: photos[item] || null,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('badge_progress')
      .upsert(rows, { onConflict: 'user_id,badge_name,requirement_key' });

    setSaving(false);

    if (error) {
      Alert.alert('Could not save', error.message);
      return;
    }

    Alert.alert('Saved', 'You can come back later and continue.');
  }

  async function submitForApproval() {
    if (!userId) {
      Alert.alert('Please sign in', 'Use the Account tab first.');
      return;
    }

    const evidence = requirements
      .map((item) => {
        const photo = photoPaths[item] || photos[item] ? '\nPhoto attached' : '';
        return `${item}: ${notes[item] || 'No note yet'} (${done[item] ? 'done' : 'not done'})${photo}`;
      })
      .join('\n\n');

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

    Alert.alert('Submitted', 'A leader can now review this badge.');
  }

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity onPress={() => router.back()}>
        <Text style={styles.back}>← Back to badges</Text>
      </TouchableOpacity>

      <Text style={styles.heading}>{badgeName}</Text>

      <TouchableOpacity
        onPress={() =>
          Linking.openURL(
            `https://scoutwiki.scouts.org.za/wiki/Cub_${badgeName
              .replace(/^[^A-Za-z]+/, '')
              .replace(/\s+/g, '_')}`
          )
        }
      >
        <Text style={styles.link}>View official requirements</Text>
      </TouchableOpacity>

      {requirements.map((item) => (
        <View key={item} style={styles.card}>
          <TouchableOpacity onPress={() => setDone((prev) => ({ ...prev, [item]: !prev[item] }))}>
            <Text style={styles.cardTitle}>
              {done[item] ? '☑' : '☐'} {item}
            </Text>
          </TouchableOpacity>

          <TextInput
            style={styles.input}
            placeholder="Add evidence for this requirement"
            placeholderTextColor="#88b8a8"
            multiline
            value={notes[item] || ''}
            onChangeText={(text) => setNotes((prev) => ({ ...prev, [item]: text }))}
          />

          {!!photos[item] && <Image source={{ uri: photos[item] }} style={styles.photo} />}

          <TouchableOpacity style={styles.photoButton} onPress={() => pickPhoto(item)}>
            <Text style={styles.photoButtonText}>
              {photos[item] ? 'Change photo' : 'Add photo'}
            </Text>
          </TouchableOpacity>
        </View>
      ))}

      <TouchableOpacity style={styles.button} onPress={saveProgress} disabled={saving}>
        <Text style={styles.buttonText}>{saving ? 'Saving...' : 'Save progress'}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryButton} onPress={submitForApproval}>
        <Text style={styles.secondaryText}>Submit badge for approval</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a3c34',
    padding: 20,
  },
  back: {
    color: '#ffd700',
    marginBottom: 12,
    fontWeight: 'bold',
  },
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  link: {
    color: '#ffd700',
    marginBottom: 16,
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: '#2a5a4a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: {
    color: '#ffffff',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1a3c34',
    color: '#ffffff',
    borderRadius: 10,
    padding: 12,
    minHeight: 70,
    textAlignVertical: 'top',
    marginBottom: 10,
  },
  photo: {
    width: '100%',
    height: 180,
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: '#1a3c34',
  },
  photoButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#1a3c34',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  photoButtonText: {
    color: '#ffd700',
    fontWeight: 'bold',
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
  },
  secondaryButton: {
    padding: 14,
    alignItems: 'center',
    marginBottom: 40,
  },
  secondaryText: {
    color: '#ffd700',
    fontWeight: 'bold',
  },
});