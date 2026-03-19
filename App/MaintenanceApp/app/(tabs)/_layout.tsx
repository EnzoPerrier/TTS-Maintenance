import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { Colors } from '../../constants/Colors';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        headerStyle: { backgroundColor: Colors.primary },
        headerShadowVisible: false,
        headerTintColor: Colors.white,
        tabBarStyle: {
          backgroundColor: Colors.white,
          borderTopWidth: 1,
          borderTopColor: Colors.gray200,
          paddingBottom: 8,
          paddingTop: 8,
          height: 60,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Sites',
          headerShown: false,
          tabBarIcon: () => <Text style={{ fontSize: 22 }}>🏢</Text>,
        }}
      />
      <Tabs.Screen
        name="clients"
        options={{
          title: 'Clients',
          headerShown: false,
          tabBarIcon: () => <Text style={{ fontSize: 22 }}>👥</Text>,
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
    </Tabs>
  );
}