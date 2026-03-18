import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { Client } from '../types';
import { api } from '../utils/api';

export const useClients = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadClients = async () => {
    try {
      const data = await api.getClients();
      setClients(data);
    } catch (err) {
      Alert.alert('Erreur', 'Impossible de charger les clients');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const refresh = async () => {
    setRefreshing(true);
    await loadClients();
  };

  useEffect(() => {
    loadClients();
  }, []);

  return { clients, loading, refreshing, refresh };
};