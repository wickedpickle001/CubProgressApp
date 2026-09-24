import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioRecorder,
} from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
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

async function requireApprovedPack(userId: string) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('pack_status')
    .eq('id', userId)
    .maybeSingle();

  if (profile?.pack_status !== 'approved') {
    Alert.alert(
      'Waiting for pack approval',
      'A leader from your pack must accept you before you can save or submit badges.'
    );
    return false;
  }

  return true;
}

function base64ToArrayBuffer(base64: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

type BadgeFile = {
  id?: number;
  file_type: string;
  file_path: string;
  uri: string;
};

function VoiceNoteButton({ onRecorded }: { onRecorded: (uri: string) => void }) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [recording, setRecording] = useState(false);

  async function toggle() {
    const permission = await AudioModule.requestRecordingPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow the microphone.');
      return;
    }

    if (recording) {
      await recorder.stop();
      setRecording(false);
      if (recorder.uri) onRecorded(recorder.uri);
      return;
    }

    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
    setRecording(true);
  }

  return (
    <TouchableOpacity style={styles.photoButton} onPress={toggle}>
      <Text style={styles.photoButtonText}>{recording ? 'Stop voice note' : 'Add voice note'}</Text>
    </TouchableOpacity>
  );
}

function AudioPlayer({ uri }: { uri: string }) {
  const player = useAudioPlayer(uri);
  return (
    <TouchableOpacity style={styles.photoButton} onPress={() => player.play()}>
      <Text style={styles.photoButtonText}>Play voice note</Text>
    </TouchableOpacity>
  );
}

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
  const [files, setFiles] = useState<Record<string, BadgeFile[]>>({});
  const [saving, setSaving] = useState(false);
  const [locked, setLocked] = useState(false);
  const [leaderNote, setLeaderNote] = useState('');

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

        const { data: latest } = await supabase
          .from('badge_submissions')
          .select('status, review_note')
          .eq('user_id', user.id)
          .eq('badge_name', badgeName)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        setLocked(latest?.status === 'approved');
        setLeaderNote(latest?.review_note || '');

        const { data, error } = await supabase
          .from('badge_progress')
          .select('requirement_key, evidence_text, completed, photo_data')
          .eq('user_id', user.id)
          .eq('badge_name', badgeName);

        if (error) {
          Alert.alert('Error', error.message);
          return;
        }

        const nextNotes: Record<string, string> = {};
        const nextDone: Record<string, boolean> = {};
        const nextPhotos: Record<string, string> = {};
        data?.forEach((row) => {
          nextNotes[row.requirement_key] = row.evidence_text || '';
          nextDone[row.requirement_key] = !!row.completed;
          if (row.photo_data) nextPhotos[row.requirement_key] = row.photo_data;
        });

        const { data: savedFiles } = await supabase
          .from('badge_files')
          .select('id, requirement_key, file_type, file_path')
          .eq('user_id', user.id)
          .eq('badge_name', badgeName)
          .order('created_at');

        const nextFiles: Record<string, BadgeFile[]> = {};
        for (const row of savedFiles || []) {
          const { data: signed } = await supabase.storage
            .from('badge-evidence')
            .createSignedUrl(row.file_path, 60 * 60 * 24 * 7);

          if (!nextFiles[row.requirement_key]) nextFiles[row.requirement_key] = [];
          nextFiles[row.requirement_key].push({
            id: row.id,
            file_type: row.file_type,
            file_path: row.file_path,
            uri: signed?.signedUrl || '',
          });
        }

        if (cancelled) return;
        setNotes(nextNotes);
        setDone(nextDone);
        setPhotos(nextPhotos);
        setFiles(nextFiles);
      }

      loadProgress();
      return () => {
        cancelled = true;
      };
    }, [badgeName])
  );

  async function uploadLocalFile(localUri: string, fileType: string, item: string) {
    if (!userId || locked) return;

    const ext = fileType === 'image' ? 'jpg' : fileType === 'video' ? 'mp4' : 'm4a';
    const filePath = `${userId}/${slugify(badgeName)}/${Date.now()}-${Math.floor(Math.random() * 1000)}.${ext}`;
    const contentType =
      fileType === 'image' ? 'image/jpeg' : fileType === 'video' ? 'video/mp4' : 'audio/mp4';

    const base64 = await FileSystem.readAsStringAsync(localUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const { error: uploadError } = await supabase.storage
      .from('badge-evidence')
      .upload(filePath, base64ToArrayBuffer(base64), { contentType, upsert: false });

    if (uploadError) {
      Alert.alert('Upload failed', uploadError.message);
      return;
    }

    const { data: inserted, error } = await supabase
      .from('badge_files')
      .insert({
        user_id: userId,
        badge_name: badgeName,
        requirement_key: item,
        file_type: fileType,
        file_path: filePath,
      })
      .select('id')
      .single();

    if (error) {
      Alert.alert('Could not save file', error.message);
      return;
    }

    setFiles((prev) => ({
      ...prev,
      [item]: [
        ...(prev[item] || []),
        {
          id: inserted.id,
          file_type: fileType,
          file_path: filePath,
          uri: localUri,
        },
      ],
    }));
  }

  async function removeFile(item: string, file: BadgeFile) {
    if (locked) return;
    if (file.file_path) {
      await supabase.storage.from('badge-evidence').remove([file.file_path]);
    }
    if (file.id) {
      const { error } = await supabase.from('badge_files').delete().eq('id', file.id);
      if (error) {
        Alert.alert('Could not remove', error.message);
        return;
      }
    }
    setFiles((prev) => ({
      ...prev,
      [item]: (prev[item] || []).filter((entry) => entry.file_path !== file.file_path),
    }));
  }

  async function pickImage(item: string) {
    if (locked) return;
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
      quality: 0.5,
      allowsMultipleSelection: true,
    });
    if (result.canceled) return;
    for (const asset of result.assets) {
      await uploadLocalFile(asset.uri, 'image', item);
    }
  }

  async function pickVideo(item: string) {
    if (locked) return;
    if (!userId) {
      Alert.alert('Please sign in', 'Use the Account tab first.');
      return;
    }
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow video access.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      videoMaxDuration: 20,
      quality: 0.4,
    });
    if (result.canceled || !result.assets?.[0]) return;
    await uploadLocalFile(result.assets[0].uri, 'video', item);
  }

  async function saveProgress() {
    if (locked) {
      Alert.alert('Badge approved', 'This badge is locked and cannot be edited.');
      return;
    }
    if (!userId) {
      Alert.alert('Please sign in', 'Use the Account tab first.');
      return;
    }
    if (!(await requireApprovedPack(userId))) return;

    setSaving(true);
    const rows = requirements.map((item) => ({
      user_id: userId,
      badge_name: badgeName,
      requirement_key: item,
      evidence_text: notes[item] || '',
      completed: !!done[item],
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
    Alert.alert('Saved', 'Your notes and files are kept for later.');
  }

  async function submitForApproval() {
    if (locked) {
      Alert.alert('Badge approved', 'This badge is locked and cannot be edited.');
      return;
    }
    if (!userId) {
      Alert.alert('Please sign in', 'Use the Account tab first.');
      return;
    }
    if (!(await requireApprovedPack(userId))) return;

    const evidence = requirements
      .map((item) => {
        const count = files[item]?.length || 0;
        return `${item}: ${notes[item] || 'No note yet'} (${done[item] ? 'done' : 'not done'}, ${count} file(s))`;
      })
      .join('\n');

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
      {locked && (
        <Text style={styles.locked}>
          This badge has been approved and is locked.
          {leaderNote ? `\nLeader said: ${leaderNote}` : ''}
        </Text>
      )}

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
          <TouchableOpacity
            disabled={locked}
            onPress={() => setDone((prev) => ({ ...prev, [item]: !prev[item] }))}
          >
            <Text style={styles.cardTitle}>
              {done[item] ? '☑' : '☐'} {item}
            </Text>
          </TouchableOpacity>

          <TextInput
            style={styles.input}
            placeholder="Add written evidence"
            placeholderTextColor="#88b8a8"
            multiline
            editable={!locked}
            value={notes[item] || ''}
            onChangeText={(text) => setNotes((prev) => ({ ...prev, [item]: text }))}
          />

          {!!photos[item] && (
            <View style={styles.fileBox}>
              <Image source={{ uri: photos[item] }} style={styles.photo} />
            </View>
          )}

          {(files[item] || []).map((file, index) => (
            <View key={`${file.file_path}-${index}`} style={styles.fileBox}>
              {file.file_type === 'image' && !!file.uri && (
                <Image source={{ uri: file.uri }} style={styles.photo} />
              )}
              {file.file_type === 'video' && (
                <Text style={styles.fileLabel}>Video attached</Text>
              )}
              {file.file_type === 'audio' && !!file.uri && <AudioPlayer uri={file.uri} />}
              {!locked && (
                <TouchableOpacity style={styles.removeButton} onPress={() => removeFile(item, file)}>
                  <Text style={styles.removeText}>Remove</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}

          {!locked && (
            <View style={styles.row}>
              <TouchableOpacity style={styles.photoButton} onPress={() => pickImage(item)}>
                <Text style={styles.photoButtonText}>Add photo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.photoButton} onPress={() => pickVideo(item)}>
                <Text style={styles.photoButtonText}>Add video</Text>
              </TouchableOpacity>
              <VoiceNoteButton onRecorded={(uri) => uploadLocalFile(uri, 'audio', item)} />
            </View>
          )}
        </View>
      ))}

      {!locked && (
        <>
          <TouchableOpacity style={styles.button} onPress={saveProgress} disabled={saving}>
            <Text style={styles.buttonText}>{saving ? 'Saving...' : 'Save progress'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={submitForApproval}>
            <Text style={styles.secondaryText}>Submit badge for approval</Text>
          </TouchableOpacity>
        </>
      )}
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
  locked: {
    color: '#ffd700',
    marginBottom: 12,
    fontWeight: 'bold',
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
  fileBox: {
    marginBottom: 8,
  },
  fileLabel: {
    color: '#ffd700',
    marginBottom: 8,
    fontWeight: 'bold',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoButton: {
    backgroundColor: '#1a3c34',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  photoButtonText: {
    color: '#ffd700',
    fontWeight: 'bold',
  },
  removeButton: {
    alignSelf: 'flex-start',
    marginTop: 4,
    marginBottom: 8,
  },
  removeText: {
    color: '#ffb4b4',
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