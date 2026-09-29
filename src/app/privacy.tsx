import { ScrollView, StyleSheet, Text } from 'react-native';

export default function PrivacyScreen() {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.heading}>Privacy and safety</Text>
      <Text style={styles.text}>Cub Progress is a test app for a Cub pack. It is not for public release until Scouts South Africa and a privacy review say it is ready.</Text>
      <Text style={styles.text}>Cubs only see their own pack. There is no chat and no public profile.</Text>
      <Text style={styles.text}>Photos, videos and voice notes are badge evidence. They are for the cub, a linked parent, and the pack leaders. They are not a public gallery.</Text>
      <Text style={styles.text}>Other cubs do not see email addresses, phone numbers, birth dates or addresses.</Text>
      <Text style={styles.text}>A new cub stays pending until a leader accepts them. Nobody can make themselves a leader.</Text>
      <Text style={styles.text}>A parent only sees a child after a leader links the accounts.</Text>
      <Text style={styles.text}>This screen is not a legal POPIA certificate. A lawyer and head office still need to review the app.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a3c34', padding: 20 },
  heading: { color: '#ffd700', fontSize: 24, fontWeight: 'bold', marginBottom: 12 },
  text: { color: '#ffffff', fontSize: 16, lineHeight: 24, marginBottom: 12 },
});
