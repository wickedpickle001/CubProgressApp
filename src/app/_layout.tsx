import { Tabs } from 'expo-router';
import { Text } from 'react-native';

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
          tabBarIcon: () => <Text>🏠</Text>,
        }}
      />
      <Tabs.Screen
        name="badges"
        options={{
          title: 'Badges',
          tabBarIcon: () => <Text>🏅</Text>,
        }}
      />
      <Tabs.Screen
        name="approve"
        options={{
          title: 'Approve',
          tabBarIcon: () => <Text>✅</Text>,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Account',
          tabBarIcon: () => <Text>👤</Text>,
        }}
      />
      <Tabs.Screen
        name="users"
        options={{
          href: null,
          title: 'Users',
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          href: null,
        }}
      />

            <Tabs.Screen
        name="badge/[name]"
        options={{
          href: null,
          title: 'Badge',
        }}
      />

    </Tabs>
  );
}