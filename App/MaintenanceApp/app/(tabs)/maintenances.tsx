import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { Card } from '../../components/ui/Card';
import { CardStyles, GlobalStyles } from '../../constants/Styles';
import { useMaintenances } from '../../hooks/useMaintenances';
import { useSites } from '../../hooks/useSites';
import { formatDate } from '../../utils/formatters';
import { getStatusConfig } from '../../utils/helpers';

export default function MaintenancesScreen() {
  const router = useRouter();

  const {
    maintenances,
    refreshing,
    loadMaintenancesNotFinished,
  } = useMaintenances();

  const { sites } = useSites();

  // Chargement initial : maintenances non terminées
  useEffect(() => {
    loadMaintenancesNotFinished();
  }, []);

  // Pull-to-refresh : recharge les non terminées
  const onRefresh = async () => {
    await loadMaintenancesNotFinished();
  };

  return (
    <View style={GlobalStyles.container}>
      <View style={GlobalStyles.header}>
        <Text style={GlobalStyles.headerTitle}>🔧 Maintenances en cours</Text>
        <Text style={GlobalStyles.headerSubtitle}>
          {maintenances.length} maintenance(s)
        </Text>
      </View>

      <ScrollView
        style={GlobalStyles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {maintenances.map(maintenance => {
          const { color, icon } = getStatusConfig(maintenance.etat);
          const site = sites.find(s => s.id_site === maintenance.id_site);

          return (
            <Card
              key={maintenance.id_maintenance}
              title={`${icon} ${maintenance.type}`}
              badge={maintenance.etat || 'N/A'}
              badgeColor={color}
              borderLeftColor={color}
              onPress={() =>
                router.push(`/maintenance/${maintenance.id_maintenance}`)
              }
            >
              <Text style={CardStyles.cardText}>
                📅 {formatDate(maintenance.date_maintenance)}
              </Text>

              {site && (
                <Text style={CardStyles.cardText}>🏢 {site.nom}</Text>
              )}

              {maintenance.commentaire && (
                <Text style={CardStyles.cardComment} numberOfLines={2}>
                  💬 {maintenance.commentaire}
                </Text>
              )}
            </Card>
          );
        })}
      </ScrollView>
    </View>
  );
}
