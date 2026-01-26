import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Card } from '../../components/ui/Card';
import { InfoCard } from '../../components/ui/InfoCard';
import { StatCard } from '../../components/ui/StatCard';
import { Colors } from '../../constants/Colors';
import { CardStyles, GlobalStyles } from '../../constants/Styles';
import { Maintenance, Produit, Site } from '../../types';
import { api } from '../../utils/api';
import { formatDate } from '../../utils/formatters';
import { getEtatColor, getStatusConfig } from '../../utils/helpers';

export default function SiteDetailsScreen() {
  const { id_site } = useLocalSearchParams();
  const router = useRouter();
  const [site, setSite] = useState<Site | null>(null);
  const [equipements, setEquipements] = useState<Produit[]>([]);
  const [maintenances, setMaintenances] = useState<Maintenance[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [siteData, equiData, maintData] = await Promise.all([
        api.getSiteById(Number(id_site)),
        api.getProductsBySite(Number(id_site)),
        api.getMaintenancesBySite(Number(id_site)),
      ]);

      setSite(siteData);
      setEquipements(equiData);
      setMaintenances(maintData);
    } catch (err) {
      Alert.alert('Erreur', 'Impossible de charger les données');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id_site]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
  };

  if (!site) {
    return (
      <View style={GlobalStyles.container}>
        <Text>Chargement...</Text>
      </View>
    );
  }

  return (
    <View style={GlobalStyles.container}>
      <View style={GlobalStyles.header}>
        <TouchableOpacity onPress={() => router.back()} style={GlobalStyles.backButton}>
          <Text style={GlobalStyles.backButtonText}>← Retour</Text>
        </TouchableOpacity>
        <Text style={GlobalStyles.headerTitle}>{site.nom}</Text>
        <Text style={GlobalStyles.headerSubtitle}>Détails du site</Text>
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
            { label: 'ID Site:', value: String(site.id_site) },
            { label: 'Client:', value: String(site.id_client) },
            { label: 'Adresse:', value: site.adresse || 'N/A' },
          ]}
        />

        {/* Statistiques */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
          <StatCard number={equipements.length} label="Équipements" />
          <StatCard number={maintenances.length} label="Maintenances" />
        </View>

        {/* Équipements */}
        <View style={{ marginBottom: 16 }}>
          <Text style={styles.sectionTitle}>📦 Équipements ({equipements.length})</Text>
          {equipements.map(equi => (
            <Card
              key={equi.id_produit}
              title={equi.nom}
              borderLeftColor={getEtatColor(equi.etat)}
            >
              <Text style={CardStyles.cardText}>
                État:{' '}
                <Text style={{ color: getEtatColor(equi.etat), fontWeight: '600' }}>
                  {equi.etat || 'N/A'}
                </Text>
              </Text>
              {equi.departement && (
                <Text style={CardStyles.cardText}>Département: {equi.departement}</Text>
              )}
            </Card>
          ))}
        </View>

        {/* Maintenances */}
        <View style={{ marginBottom: 16 }}>
          <Text style={styles.sectionTitle}>🔧 Maintenances ({maintenances.length})</Text>
          {maintenances.map(maint => {
            const { color, icon } = getStatusConfig(maint.etat);
            return (
              <Card
                key={maint.id_maintenance}
                title={`${icon} ${maint.type}`}
                borderLeftColor={color}
              >
                <Text style={CardStyles.cardText}>
                  📅 {formatDate(maint.date_maintenance)}
                </Text>
                <Text style={CardStyles.cardText}>
                  État:{' '}
                  <Text style={{ color, fontWeight: '600' }}>
                    {maint.etat || 'N/A'}
                  </Text>
                </Text>
                {maint.commentaire && (
                  <Text style={CardStyles.cardComment}>💬 {maint.commentaire}</Text>
                )}
              </Card>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = {
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: 12,
  },
};