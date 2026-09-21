import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function BadgesScreen() {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.heading}>Interest Badges</Text>
      <Text style={styles.subheading}>Log your evidence and submit for approval</Text>

      {/* Example badge cards */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🏕️ Camper</Text>
        <Text style={styles.cardText}>Status: Not started</Text>
        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>Add Evidence</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>🔧 Handyman</Text>
        <Text style={styles.cardText}>Status: Not started</Text>
        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>Add Evidence</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>🎨 Artist</Text>
        <Text style={styles.cardText}>Status: Not started</Text>
        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>Add Evidence</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.note}>
        More badges will be added later. Leaders will be able to approve submissions.
      </Text>
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
  note: {
    fontSize: 13,
    color: '#a8d5c0',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
});