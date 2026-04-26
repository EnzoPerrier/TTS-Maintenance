import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'auth_token';

export const getToken = async (): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    try { await SecureStore.deleteItemAsync(TOKEN_KEY); } catch { /* ignore */ }
    return null;
  }
};

export const setToken = async (t: string): Promise<void> => {
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, t);
  } catch (e) {
    console.error('setToken error:', e);
  }
};

export const removeToken = async (): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch { /* ignore */ }
};