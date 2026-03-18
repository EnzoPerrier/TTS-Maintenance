import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Card } from '../../components/ui/Card';
import { Colors } from '../../constants/Colors';
import { CardStyles, GlobalStyles } from '../../constants/Styles';
import { useClients } from '../../hooks/useClients';
import { useMaintenances } from '../../hooks/useMaintenances';
import { useSites } from '../../hooks/useSites';
import { formatDate } from '../../utils/formatters';
import { getStatusConfig } from '../../utils/helpers';

// Même logique que le front web : split sur virgule ou retour à la ligne
function parseOperateurs(str?: string | null): string[] {
  if (!str) return [];
  return str.split(/[\n,]/).map(s => s.trim()).filter(Boolean);
}

export default function MaintenancesScreen() {
  const router = useRouter();

  const { maintenances, refreshing, loadMaintenancesNotFinished } = useMaintenances();
  const { sites } = useSites();
  const { clients } = useClients();

  useEffect(() => {
    loadMaintenancesNotFinished();
  }, []);

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

      <TouchableOpacity
        style={{
          marginHorizontal: 16,
          marginTop: 12,
          marginBottom: 4,
          backgroundColor: Colors.primary,
          borderRadius: 12,
          padding: 14,
          alignItems: 'center',
          flexDirection: 'row',
          justifyContent: 'center',
          gap: 8,
          shadowColor: Colors.primary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 4,
        }}
        onPress={() => router.push('/maintenance/add')}
      >
        <Text style={{ color: Colors.white, fontSize: 22, fontWeight: '700' }}>➕</Text>
        <Text style={{ color: Colors.white, fontSize: 16, fontWeight: '700' }}>
          Nouvelle maintenance
        </Text>
      </TouchableOpacity>

      <ScrollView
        style={GlobalStyles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {maintenances.map(maintenance => {
          const { color, icon } = getStatusConfig(maintenance.etat);
          const site = sites.find(s => s.id_site === maintenance.id_site);
          const client = site ? clients.find(c => c.id_client === site.id_client) : null;

          const operateurs = parseOperateurs(maintenance.operateurs);
          const operateursDisplay = operateurs.length > 0 ? operateurs.join(' · ') : null;

          return (
            <Card
              key={maintenance.id_maintenance}
              title={`${icon} ${maintenance.type}`}
              badge={maintenance.etat || 'N/A'}
              badgeColor={color}
              borderLeftColor={color}
              onPress={() => router.push(`/maintenance/${maintenance.id_maintenance}`)}
            >
              <Text style={CardStyles.cardText}>
                📅 {formatDate(maintenance.date_maintenance)}
              </Text>

              {client && (
                <Text style={CardStyles.cardText}>👤 {client.nom}</Text>
              )}

              {site && (
                <Text style={CardStyles.cardText}>🏢 {site.nom}</Text>
              )}

              {operateursDisplay && (
                <Text style={CardStyles.cardText}>👷‍♂️ {operateursDisplay}</Text>
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