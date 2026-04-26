import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Colors } from '../constants/Colors';
import { setUnauthorizedHandler, tokenStorage } from '../utils/api';

export let setGlobalToken: (token: string | null) => void = () => {};

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [token, setToken] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    setGlobalToken = setToken;
  }, []);

  // Charger le token au démarrage — protégé contre la corruption
  useEffect(() => {
    const loadToken = async () => {
      try {
        const stored = await tokenStorage.get();
        setToken(stored ?? null);
      } catch {
        // SecureStore corrompu → on repart sans token
        try { await tokenStorage.remove(); } catch { /* ignore */ }
        setToken(null);
      }
    };
    loadToken();
  }, []);

  // Rediriger selon l'état du token
  useEffect(() => {
    if (token === undefined) return;

    const inLogin = segments[0] === 'login';

    if (!token && !inLogin) {
      router.replace('/login');
    } else if (token && inLogin) {
      router.replace('/(tabs)');
    }
  }, [token, segments]);

  useEffect(() => {
    setUnauthorizedHandler(() => setToken(null));
  }, []);

  // Écran de chargement au lieu de null
  if (token === undefined) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <Stack>
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="clients/[id_client]" options={{ headerShown: false }} />
      <Stack.Screen name="sites/[id_site]" options={{ headerShown: false }} />
      <Stack.Screen name="products/[id_produit]" options={{ headerShown: false }} />
      <Stack.Screen name="maintenance/[id_maintenance]" options={{ headerShown: false }} />
      <Stack.Screen name="maintenance/add" options={{ headerShown: false }} />
    </Stack>
  );
}