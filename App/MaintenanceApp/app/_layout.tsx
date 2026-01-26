import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="sites/[id_site]" options={{ headerShown: false }} />
      <Stack.Screen name="products/[id_produit]" options={{ headerShown: false }} />
      <Stack.Screen name="maintenance/[id_maintenance]" options={{ headerShown: false }} />
    </Stack>
  );
}