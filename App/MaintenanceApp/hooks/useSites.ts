import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { Config } from '../constants/Config';
import { Site } from '../types';
import { api } from '../utils/api';

export const useSites = () => {
  const [sites, setSites] = useState<Site[]>([]);  // ← tableau vide garanti
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadSites = async () => {
    try {
      const data = await api.getSites();
      setSites(Array.isArray(data) ? data : []);  // ← sécurité supplémentaire
    } catch (err) {
      setSites([]);
      Alert.alert('Erreur', Config.ERROR_MESSAGES.LOAD_SITES);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const refresh = async () => {
    setRefreshing(true);
    await loadSites();
  };

  useEffect(() => {
    loadSites();
  }, []);

  return { sites, loading, refreshing, refresh };
};