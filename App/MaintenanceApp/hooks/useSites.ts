import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { api } from '../utils/api';
import { Site } from '../types';
import { Config } from '../constants/Config';

export const useSites = () => {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadSites = async () => {
    try {
      const data = await api.getSites();
      setSites(data);
    } catch (err) {
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