import { ImageBackground, StyleSheet, Text, View } from 'react-native';

export default function HomeScreen() {
  return (
    <ImageBackground
      source={require('../../assets/images/splash-icon.png')}
      style={styles.background}
      imageStyle={styles.backgroundImage}
    >
      <View style={styles.container}>
        <Text style={styles.title}>DO YOUR BEST</Text>
        <Text style={styles.subtitle}>Track your journey from</Text>
        <Text style={styles.badge}>Silver Wolf • Gold Wolf • Leaping Wolf</Text>
        <Text style={styles.subtitle}>
          I promise to do my best to do my duty to God and my country; To keep the Law of the Wolf Cub Pack. And to do a good turn to somebody every day.
        </Text>
        <Text style={styles.badge}>in Memory of Lord Robert Baden-Powell of Gilwell</Text>
      </View>
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
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#a8d5c0',
    marginBottom: 8,
    textAlign: 'center',
  },
  badge: {
    fontSize: 16,
    color: '#ffd700',
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
});