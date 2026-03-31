import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { Colors } from '../../constants/Colors';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        headerStyle: { backgroundColor: Colors.surface },
        headerShadowVisible: false,
        headerTintColor: Colors.text,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopWidth: 1,
          borderTopColor: Colors.border,
          paddingBottom: 8,
          paddingTop: 8,
          height: 62,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: 0.4,
        },
      }}
    >

      <Tabs.Screen
        name="clients"
        options={{
          title: 'Clients',
          headerShown: false,
          tabBarIcon: () => <Text style={{ fontSize: 22 }}>👤</Text>,
        }}
      />

      <Tabs.Screen
        name="index"
        options={{
          title: 'Sites',
          headerShown: false,
          tabBarIcon: () => <Text style={{ fontSize: 22 }}>🏢</Text>,
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: 'Produits',
          headerShown: false,
          tabBarIcon: () => <Text style={{ fontSize: 22 }}>📦</Text>,
        }}
      />
      <Tabs.Screen
        name="maintenances"
        options={{
          title: 'Maintenances',
          headerShown: false,
          tabBarIcon: () => <Text style={{ fontSize: 22 }}>🔧</Text>,
        }}
      />
      <Tabs.Screen
        name="scanner"
        options={{
          title: 'Scanner',
          headerShown: false,
          tabBarIcon: () => <Text style={{ fontSize: 22 }}>📷</Text>,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Paramètres',
          headerShown: false,
          tabBarIcon: () => <Text style={{ fontSize: 22 }}>⚙️</Text>,
        }}
      />
    </Tabs>
  );
}