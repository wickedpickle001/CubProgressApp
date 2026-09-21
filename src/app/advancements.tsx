import { ScrollView, StyleSheet, Text, View } from 'react-native';

export default function AdvancementsScreen() {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.heading}>Your Advancement Journey</Text>

      {/* Silver Wolf */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🥈 Silver Wolf</Text>
        <Text style={styles.cardText}>First major stage</Text>
        <Text style={styles.status}>Status: Not started</Text>
      </View>

      {/* Gold Wolf */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🥇 Gold Wolf</Text>
        <Text style={styles.cardText}>Second major stage</Text>
        <Text style={styles.status}>Status: Not started</Text>
      </View>

      {/* Leaping Wolf */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🐺 Leaping Wolf</Text>
        <Text style={styles.cardText}>Final Cub stage</Text>
        <Text style={styles.status}>Status: Not started</Text>
      </View>
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
  },
});