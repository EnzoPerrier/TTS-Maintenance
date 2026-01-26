import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { Colors } from '../../constants/Colors';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        headerStyle: {
          backgroundColor: Colors.primary,
        },
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
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Sites',
          tabBarIcon: ({ color, focused }) => {
            return <Text style={{ fontSize: 24 }}>🏢</Text>;
          },
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: 'Produits',
          tabBarIcon: ({ color, focused }) => {
            return <Text style={{ fontSize: 24 }}>📦</Text>;
          },
        }}
      />
      <Tabs.Screen
        name="maintenances"
        options={{
          title: 'Maintenances',
          tabBarIcon: ({ color, focused }) => {
            return <Text style={{ fontSize: 24 }}>🔧</Text>;
          },
        }}
      />
      <Tabs.Screen
        name="scanner"
        options={{
          title: 'Scanner',
          tabBarIcon: ({ color, focused }) => {
            return <Text style={{ fontSize: 24 }}>📷</Text>;
          },
        }}
      />
    </Tabs>
  );
}