import AsyncStorage from '@react-native-async-storage/async-storage';

const SERVER_IP_KEY = 'server_ip';
export const DEFAULT_IP = 'www.ttsmaintenance.com';

export const getServerIp = async (): Promise<string> => {
  try {
    const stored = await AsyncStorage.getItem(SERVER_IP_KEY);
    // Valide que ce qu'on a stocké ressemble à une IP ou hostname
    if (stored && stored.trim().length > 0) {
      return stored.trim();
    }
    return DEFAULT_IP;
  } catch {
    // Fichier corrompu donc on efface et on repart proprement
    try { await AsyncStorage.removeItem(SERVER_IP_KEY); } catch { /* ignore */ }
    return DEFAULT_IP;
  }
};

export const setServerIp = async (ip: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(SERVER_IP_KEY, ip.trim());
  } catch (e) {
    console.error('setServerIp error:', e);
  }
};

export const getApiUrl = async (): Promise<string> => {
  const ip = await getServerIp();
  return `https://${ip}/api`;
};