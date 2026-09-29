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
const SIXES = ['Red', 'Yellow', 'Blue', 'Green', 'White', 'Orange'];

export default function UsersScreen() {
  const [role, setMyRole] = useState('');
  const [myPack, setMyPack] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [links, setLinks] = useState<any[]>([]);

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
      .select('id, full_name, role, pack_name, pack_status, six_name, active')
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
    const { data: parentRows } = await supabase.from('parent_links').select('*').eq('status', 'pending');
    const mine = (parentRows || []).filter((row) => profile?.role === 'admin' || row.pack_name === profile?.pack_name);
    setLinks(mine);
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

  async function setSix(id: string, six: string) {
    const { error } = await supabase.from('profiles').update({ six_name: six }).eq('id', id);
    if (error) Alert.alert('Could not set Six', error.message);
    else loadData();
  }

  async function setActive(id: string, active: boolean) {
    const { data: sessionData } = await supabase.auth.getSession();
    const { error } = await supabase.from('profiles').update({ active }).eq('id', id);
    if (error) Alert.alert('Could not update', error.message);
    else {
      await supabase.from('audit_log').insert({ actor_id: sessionData.session?.user?.id, action: active ? 'reactivate' : 'pause', detail: id });
      loadData();
    }
  }

  async function linkParent(link: any, cubId: string) {
    const { error } = await supabase.from('parent_links').update({ cub_id: cubId, status: 'approved' }).eq('id', link.id);
    if (error) Alert.alert('Could not link', error.message);
    else loadData();
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
          <Text style={styles.status}>Six: {person.six_name || 'not set'} · {person.active === false ? 'paused' : 'active'}</Text>
          <View style={styles.row}>
            {SIXES.map((six) => (
              <TouchableOpacity key={six} style={styles.packButton} onPress={() => setSix(person.id, six)}>
                <Text style={styles.packText}>{six}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.rejectButton} onPress={() => setActive(person.id, person.active === false)}>
            <Text style={styles.rejectText}>{person.active === false ? 'Turn account back on' : 'Pause account'}</Text>
          </TouchableOpacity>
        </View>
      ))}
      <Text style={styles.heading}>Parent links</Text>
      {links.length === 0 && <Text style={styles.subtitle}>No parents waiting.</Text>}
      {links.map((link) => (
        <View key={link.id} style={styles.card}>
          <Text style={styles.cardTitle}>Parent asked for {link.cub_name}</Text>
          <Text style={styles.status}>{link.pack_name}</Text>
          {users.filter((person) => (person.full_name || '').toLowerCase().includes((link.cub_name || '').toLowerCase())).map((person) => (
            <TouchableOpacity key={person.id} style={styles.button} onPress={() => linkParent(link, person.id)}>
              <Text style={styles.buttonText}>Link to {person.full_name}</Text>
            </TouchableOpacity>
          ))}
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