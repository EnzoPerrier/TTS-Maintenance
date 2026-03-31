import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { setUnauthorizedHandler, tokenStorage } from '../utils/api';

// Setter global accessible depuis login.tsx
export let setGlobalToken: (token: string | null) => void = () => {};

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [token, setToken] = useState<string | null | undefined>(undefined);

  // Exposer le setter globalement
  useEffect(() => {
    setGlobalToken = setToken;
  }, []);

  // Charger le token au démarrage
  useEffect(() => {
    tokenStorage.get().then(setToken).catch(() => setToken(null));
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

  // Handler de déconnexion
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setToken(null);
    });
  }, []);

  if (token === undefined) return null;

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