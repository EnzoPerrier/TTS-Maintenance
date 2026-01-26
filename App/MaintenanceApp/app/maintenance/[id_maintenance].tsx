import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { InfoCard } from '../../components/ui/InfoCard';
import { Colors } from '../../constants/Colors';
import { CardStyles, GlobalStyles } from '../../constants/Styles';
import { Maintenance, MaintenanceProduit } from '../../types';
import { api } from '../../utils/api';
import { formatDate } from '../../utils/formatters';
import { getEtatColor, getStatusConfig } from '../../utils/helpers';

export default function MaintenanceDetailsScreen() {
  const { id_maintenance } = useLocalSearchParams();
  const router = useRouter();
  const [maintenance, setMaintenance] = useState<Maintenance | null>(null);
  const [produits, setProduits] = useState<MaintenanceProduit[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [maintData, produitsData] = await Promise.all([
        api.getMaintenanceById(Number(id_maintenance)),
        api.getProductsByMaintenance(Number(id_maintenance)),
      ]);

      setMaintenance(maintData);
      setProduits(produitsData);
    } catch (err) {
      Alert.alert('Erreur', 'Impossible de charger les données');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id_maintenance]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
  };

  if (!maintenance) {
    return (
      <View style={GlobalStyles.container}>
        <Text>Chargement...</Text>
      </View>
    );
  }

  const { color, icon } = getStatusConfig(maintenance.etat);

  return (
    <View style={GlobalStyles.container}>
      <View style={GlobalStyles.header}>
        <TouchableOpacity onPress={() => router.back()} style={GlobalStyles.backButton}>
          <Text style={GlobalStyles.backButtonText}>← Retour</Text>
        </TouchableOpacity>
        <Text style={GlobalStyles.headerTitle}>{icon} {maintenance.type}</Text>
        <Text style={GlobalStyles.headerSubtitle}>Détails de la maintenance</Text>
      </View>

      <ScrollView
        style={GlobalStyles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Informations */}
        <InfoCard
          title="Informations"
          icon="📋"
          rows={[
            { label: 'Date:', value: formatDate(maintenance.date_maintenance) },
            { label: 'Type:', value: maintenance.type },
            { label: 'État:', value: maintenance.etat || 'N/A', valueColor: color },
            ...(maintenance.departement
              ? [{ label: 'Département:', value: maintenance.departement }]
              : []),
            ...(maintenance.commentaire
              ? [{ label: 'Commentaire:', value: maintenance.commentaire }]
              : []),
          ]}
        />

        {/* Bouton scanner */}
        <TouchableOpacity
          style={styles.scanButton}
          onPress={() => Alert.alert('Scanner', 'Utilisez l\'onglet Scanner pour ajouter un produit')}
        >
          <Text style={styles.scanButtonText}>📷 Scanner un produit</Text>
        </TouchableOpacity>

        {/* Produits associés */}
        <View style={{ marginBottom: 16 }}>
          <Text style={styles.sectionTitle}>📦 Produits associés ({produits.length})</Text>
          {produits.length === 0 ? (
            <EmptyState
              icon="📦"
              title="Aucun produit associé"
              subtitle="Scannez un QR code pour ajouter un produit"
            />
          ) : (
            produits.map(produit => (
              <Card
                key={produit.id_produit}
                title={produit.nom}
                badge={produit.etat || 'N/A'}
                badgeColor={getEtatColor(produit.etat)}
                borderLeftColor={getEtatColor(produit.etat)}
              >
                {produit.departement && (
                  <Text style={CardStyles.cardText}>📂 {produit.departement}</Text>
                )}
                {produit.commentaire && (
                  <Text style={CardStyles.cardComment}>💬 {produit.commentaire}</Text>
                )}
              </Card>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: 12,
  },
  scanButton: {
    backgroundColor: Colors.success,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: Colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  scanButtonText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: '600',
  },
});