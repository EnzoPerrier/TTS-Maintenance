import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { Config } from '../constants/Config';
import { Maintenance } from '../types';
import { api } from '../utils/api';

export const useMaintenances = () => {
  const [maintenances, setMaintenances] = useState<Maintenance[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadMaintenances = async () => {
    try {
      const data = await api.getMaintenances();
      setMaintenances(data);
    } catch (err) {
      Alert.alert('Erreur', Config.ERROR_MESSAGES.LOAD_MAINTENANCES);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const refresh = async () => {
    setRefreshing(true);
    await loadMaintenances();
  };

  useEffect(() => {
    loadMaintenances();
  }, []);

  return { maintenances, loading, refreshing, refresh };
};