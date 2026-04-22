import AsyncStorage from '@react-native-async-storage/async-storage';

const SERVER_IP_KEY = 'server_ip';
const DEFAULT_IP = '192.168.1.127';

/** Retourne l'IP stockée, ou l'IP par défaut */
export const getServerIp = async (): Promise<string> => {
  const stored = await AsyncStorage.getItem(SERVER_IP_KEY);
  return stored ?? DEFAULT_IP;
};

/** Sauvegarde une nouvelle IP */
export const setServerIp = async (ip: string): Promise<void> => {
  await AsyncStorage.setItem(SERVER_IP_KEY, ip.trim());
};

/** Retourne l'URL de base de l'API à partir de l'IP stockée */
export const getApiUrl = async (): Promise<string> => {
  const ip = await getServerIp();
  return `http://${ip}/api`;
};

export { DEFAULT_IP };
