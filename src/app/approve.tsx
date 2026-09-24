import { useAudioPlayer } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { useFocusEffect } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Image,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../lib/supabase';

function VideoPlayerBox({ uri, id }: { uri: string; id: number }) {
  const [localUri, setLocalUri] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function download() {
      const dest = `${FileSystem.cacheDirectory}video-${id}.mp4`;
      const result = await FileSystem.downloadAsync(uri, dest);
      if (active) setLocalUri(result.uri);
    }
    if (uri) download();
    return () => {
      active = false;
    };
  }, [uri, id]);

  if (!localUri) return <Text style={styles.cardText}>Loading video...</Text>;
  return <ReadyVideo uri={localUri} />;
}

function ReadyVideo({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (video) => {
    video.loop = false;
  });
  return <VideoView player={player} style={styles.player} nativeControls contentFit="contain" />;
}

function AudioPlayerBox({ uri, id }: { uri: string; id: number }) {
  const [localUri, setLocalUri] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function download() {
      const dest = `${FileSystem.cacheDirectory}audio-${id}.m4a`;
      const result = await FileSystem.downloadAsync(uri, dest);
      if (active) setLocalUri(result.uri);
    }
    if (uri) download();
    return () => {
      active = false;
    };
  }, [uri, id]);

  if (!localUri) return <Text style={styles.cardText}>Loading voice note...</Text>;
  return <ReadyAudio uri={localUri} />;
}

function ReadyAudio({ uri }: { uri: string }) {
  const player = useAudioPlayer(uri);

  async function playAgain() {
    try {
      await player.seekTo(0);
    } catch {}
    player.play();
  }

  return (
    <TouchableOpacity style={styles.smallButton} onPress={playAgain}>
      <Text style={styles.smallButtonText}>Play voice note</Text>
    </TouchableOpacity>
  );
}

export default function ApproveScreen() {
  const [canApprove, setCanApprove] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [reviewNotes, setReviewNotes] = useState<Record<number, string>>({});

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

    const { data: submissions, error } = await supabase
      .from('badge_submissions')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    const withDetails = [];
    for (const submission of submissions || []) {
      const { data: cub } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', submission.user_id)
        .maybeSingle();

      const { data: progress } = await supabase
        .from('badge_progress')
        .select('requirement_key, evidence_text, completed, photo_data')
        .eq('user_id', submission.user_id)
        .eq('badge_name', submission.badge_name);

      const { data: savedFiles } = await supabase
        .from('badge_files')
        .select('id, requirement_key, file_type, file_path')
        .eq('user_id', submission.user_id)
        .eq('badge_name', submission.badge_name)
        .order('created_at');

      const filesByRequirement: Record<string, any[]> = {};
      for (const file of savedFiles || []) {
        const { data: signed } = await supabase.storage
          .from('badge-evidence')
          .createSignedUrl(file.file_path, 60 * 60 * 24 * 7);

        if (!filesByRequirement[file.requirement_key]) {
          filesByRequirement[file.requirement_key] = [];
        }
        filesByRequirement[file.requirement_key].push({
          ...file,
          uri: signed?.signedUrl || '',
        });
      }

      withDetails.push({
        ...submission,
        cubName: cub?.full_name || 'Unknown cub',
        progress: progress || [],
        filesByRequirement,
      });
    }

    setItems(withDetails);
  }

  async function updateStatus(id: number, status: string) {
    const reviewNote = reviewNotes[id]?.trim() || '';
    if (!reviewNote) {
      Alert.alert(
        'Note required',
        status === 'approved'
          ? 'Write that you are happy the requirements were met before approving.'
          : 'Tell the cub what to fix before rejecting.'
      );
      return;
    }

    const { error } = await supabase
      .from('badge_submissions')
      .update({
        status,
        review_note: reviewNote,
      })
      .eq('id', id);

    if (error) {
      Alert.alert('Could not update', error.message);
      return;
    }

    loadData();
  }

  if (!canApprove) {
    return (
      <ImageBackground
        source={require('../../assets/images/splash-icon.png')}
        style={styles.background}
        imageStyle={styles.backgroundImage}
      >
        <View style={styles.center}>
          <Text style={styles.title}>Leaders and admin only</Text>
          <Text style={styles.subtitle}>
            A main admin must assign you the Leader role before you can approve badges.
          </Text>
        </View>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground
      source={require('../../assets/images/splash-icon.png')}
      style={styles.background}
      imageStyle={styles.backgroundImage}
    >
      <ScrollView style={styles.container}>
        <Text style={styles.heading}>Approve Badges</Text>

        {items.length === 0 && (
          <Text style={styles.subtitle}>No pending submissions.</Text>
        )}

        {items.map((item) => (
          <View key={item.id} style={styles.card}>
            <Text style={styles.cubName}>Cub: {item.cubName}</Text>
            <Text style={styles.cardTitle}>{item.badge_name}</Text>
            <Text style={styles.status}>Status: {item.status}</Text>

            {item.progress.map((row: any) => (
              <View key={row.requirement_key} style={styles.requirement}>
                <Text style={styles.requirementTitle}>
                  {row.completed ? '☑' : '☐'} {row.requirement_key}
                </Text>
                {!!row.evidence_text && (
                  <Text style={styles.cardText}>{row.evidence_text}</Text>
                )}
                {!!row.photo_data && (
                  <Image source={{ uri: row.photo_data }} style={styles.photo} />
                )}

                {(item.filesByRequirement[row.requirement_key] || []).map((file: any) => (
                  <View key={file.id} style={styles.fileBox}>
                    {file.file_type === 'image' && !!file.uri && (
                      <Image source={{ uri: file.uri }} style={styles.photo} />
                    )}
                    {file.file_type === 'video' && !!file.uri && (
                      <VideoPlayerBox uri={file.uri} id={file.id} />
                    )}
                    {file.file_type === 'audio' && !!file.uri && (
                      <AudioPlayerBox uri={file.uri} id={file.id} />
                    )}
                  </View>
                ))}
              </View>
            ))}

            <TextInput
              style={styles.input}
              placeholder="Required note: say why you approve or what the cub must fix"
              placeholderTextColor="#88b8a8"
              multiline
              value={reviewNotes[item.id] || ''}
              onChangeText={(text) =>
                setReviewNotes((prev) => ({ ...prev, [item.id]: text }))
              }
            />

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
  center: {
    flex: 1,
    backgroundColor: 'rgba(26, 60, 52, 0.55)',
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
  cubName: {
    color: '#ffffff',
    fontWeight: 'bold',
    marginBottom: 6,
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
  requirement: {
    marginBottom: 12,
  },
  requirementTitle: {
    color: '#ffffff',
    fontWeight: 'bold',
    marginBottom: 6,
  },
  photo: {
    width: '100%',
    height: 160,
    borderRadius: 8,
    marginTop: 6,
  },
  fileBox: {
    marginTop: 8,
  },
  player: {
    width: '100%',
    height: 200,
    backgroundColor: '#1a3c34',
    marginTop: 8,
  },
  input: {
    backgroundColor: '#1a3c34',
    color: '#ffffff',
    borderRadius: 10,
    padding: 12,
    minHeight: 70,
    textAlignVertical: 'top',
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
  smallButton: {
    backgroundColor: '#1a3c34',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  smallButtonText: {
    color: '#ffd700',
    fontWeight: 'bold',
  },
});