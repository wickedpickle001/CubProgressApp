import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

export default function Layout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: '#1a3c34' },
        headerTintColor: '#ffffff',
        tabBarStyle: { backgroundColor: '#1a3c34' },
        tabBarActiveTintColor: '#ffd700',
        tabBarInactiveTintColor: '#a8d5c0',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="pack"
        options={{
          title: 'My Journey',
          tabBarIcon: ({ color, size }) => <Ionicons name="paw" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="games"
        options={{
          title: 'Games',
          tabBarIcon: ({ color, size }) => <Ionicons name="game-controller" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="cubs"
        options={{
          title: 'My Six',
          tabBarIcon: ({ color, size }) => <Ionicons name="people" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="badges"
        options={{
          title: 'Badges',
          tabBarIcon: ({ color, size }) => <Ionicons name="ribbon" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Account',
          tabBarIcon: ({ color, size }) => <Ionicons name="person" color={color} size={size} />,
        }}
      />
      <Tabs.Screen name="avatar" options={{ href: null, title: 'Avatar' }} />
      <Tabs.Screen name="approve" options={{ href: null, title: 'Approve' }} />
      <Tabs.Screen name="users" options={{ href: null, title: 'Users' }} />
      <Tabs.Screen name="badge/[name]" options={{ href: null, title: 'Badge' }} />
      <Tabs.Screen name="cub/[id]" options={{ href: null, title: 'Cub' }} />
      <Tabs.Screen name="explore" options={{ href: null }} />
      <Tabs.Screen name="dashboard" options={{ href: null, title: 'Leader' }} />
      <Tabs.Screen name="calendar" options={{ href: null, title: 'Calendar' }} />
      <Tabs.Screen name="alerts" options={{ href: null, title: 'Notices' }} />
      <Tabs.Screen name="skills" options={{ href: null, title: 'Skills' }} />
      <Tabs.Screen name="camp" options={{ href: null, title: 'Camp kit' }} />
      <Tabs.Screen name="family" options={{ href: null, title: 'My child' }} />
      <Tabs.Screen name="privacy" options={{ href: null, title: 'Privacy' }} />
      <Tabs.Screen name="catalogue" options={{ href: null, title: 'Badge list' }} />
    </Tabs>
  );
}

