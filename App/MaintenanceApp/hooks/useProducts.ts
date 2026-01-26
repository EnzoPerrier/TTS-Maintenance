import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { Config } from '../constants/Config';
import { Produit } from '../types';
import { api } from '../utils/api';

export const useProducts = () => {
  const [products, setProducts] = useState<Produit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadProducts = async () => {
    try {
      const data = await api.getProducts();
      setProducts(data);
    } catch (err) {
      Alert.alert('Erreur', Config.ERROR_MESSAGES.LOAD_PRODUCTS);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const refresh = async () => {
    setRefreshing(true);
    await loadProducts();
  };

  useEffect(() => {
    loadProducts();
  }, []);

  return { products, loading, refreshing, refresh };
};