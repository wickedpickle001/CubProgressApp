import { StyleSheet, Text, View } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Cub Progress App</Text>
      <Text style={styles.subtitle}>Track your journey to</Text>
      <Text style={styles.badge}>Silver Wolf • Gold Wolf • Leaping Wolf</Text>
      <Text style={styles.note}>and Interest Badges</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a3c34',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 18,
    color: '#a8d5c0',
    marginBottom: 8,
  },
  badge: {
    fontSize: 16,
    color: '#ffd700',
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  note: {
    fontSize: 16,
    color: '#a8d5c0',
  },
});