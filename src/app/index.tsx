import { StyleSheet, Text, View } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>DO YOUR BEST</Text>
      <Text style={styles.subtitle}>Track your journey from</Text>
      <Text style={styles.badge}>Silver Wolf • Gold Wolf • Leaping Wolf</Text>
      <Text style={styles.subtitle}>I promise to do my best to do my duty to God and my country;To keep the Law of the Wolf Cub Pack.And to do a good turn to somebody every day.</Text>
      <Text style={styles.badge}>in Memory of Lord Robert Baden-Powell of Gilwell</Text>
     
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#622599',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
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
    fontSize: 12,
    color: '#a8d5c0',
  },
});