import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    Alert,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

const API = 'http://192.168.1.127:3000';

export default function MaintenancesScreen() {
  const router = useRouter();
  const [maintenances, setMaintenances] = useState([]);
  const [sites, setSites] = useState([]);
  const [selectedSite, setSelectedSite] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadSites();
  }, []);

  const loadSites = async () => {
    try {
      const res = await fetch(`${API}/sites`);
      const data = await res.json();
      setSites(data);
    } catch (err) {
      Alert.alert('Erreur', 'Impossible de charger les sites');
    }
  };

  const loadMaintenances = async (siteId) => {
    try {
      const res = await fetch(`${API}/maintenances/AllMaintenancesBySiteID/${siteId}`);
      const data = await res.json();
      setMaintenances(data);
      setSelectedSite(siteId);
    } catch (err) {
      Alert.alert('Erreur', 'Impossible de charger les maintenances');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSites();
    if (selectedSite) {
      await loadMaintenances(selectedSite);
    }
    setRefreshing(false);
  };

  const filteredSites = sites.filter((site) =>
    site.nom?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleMaintenanceSelect = (maintenance) => {
    router.push({
      pathname: '/scanner',
      params: {
        id_maintenance: maintenance.id_maintenance,
        maintenance_type: maintenance.type,
        maintenance_date: maintenance.date_maintenance,
      },
    });
  };

  const getStatusConfig = (etat) => {
    const etatLower = (etat || '').toLowerCase();
    
    if (etatLower.includes('termin')) {
      return { color: '#28A745', icon: '✅' };
    } else if (etatLower.includes('cours')) {
      return { color: '#FFC107', icon: '⚙️' };
    } else if (etatLower.includes('planif')) {
      return { color: '#0066CC', icon: '📅' };
    }
    return { color: '#6C757D', icon: '🔧' };
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🔧 Maintenances</Text>
        <Text style={styles.headerSubtitle}>Sélectionnez une maintenance puis scannez un QR</Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Recherche */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="🔍 Rechercher un site..."
            placeholderTextColor="#6C757D"
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        </View>

        {/* Sites */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sites ({filteredSites.length})</Text>
          {filteredSites.map((site) => (
            <TouchableOpacity
              key={site.id_site}
              style={[
                styles.siteCard,
                selectedSite === site.id_site && styles.siteCardActive,
              ]}
              onPress={() => loadMaintenances(site.id_site)}
            >
              <View style={styles.siteCardHeader}>
                <Text style={styles.siteCardTitle}>{site.nom}</Text>
                <View
                  style={[
                    styles.badge,
                    selectedSite === site.id_site && styles.badgeActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      selectedSite === site.id_site && styles.badgeTextActive,
                    ]}
                  >
                    {selectedSite === site.id_site ? '✓' : '○'}
                  </Text>
                </View>
              </View>
              <Text style={styles.siteCardAddress}>{site.adresse || 'Adresse non spécifiée'}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Maintenances */}
        {selectedSite && maintenances.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Maintenances ({maintenances.length})</Text>
            {maintenances.map((maintenance) => {
              const { color, icon } = getStatusConfig(maintenance.etat);

              return (
                <TouchableOpacity
                  key={maintenance.id_maintenance}
                  style={[styles.maintenanceCard, { borderLeftColor: color }]}
                  onPress={() => handleMaintenanceSelect(maintenance)}
                >
                  <View style={styles.maintenanceCardHeader}>
                    <Text style={styles.maintenanceCardIcon}>{icon}</Text>
                    <View style={styles.maintenanceCardContent}>
                      <Text style={styles.maintenanceCardTitle}>{maintenance.type}</Text>
                      <Text style={styles.maintenanceCardDate}>
                        📅 {new Date(maintenance.date_maintenance).toLocaleDateString('fr-FR')}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: color }]}>
                    <Text style={styles.statusBadgeText}>{maintenance.etat || 'N/A'}</Text>
                  </View>
                  {maintenance.commentaire && (
                    <Text style={styles.maintenanceCardComment} numberOfLines={2}>
                      💬 {maintenance.commentaire}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {selectedSite && maintenances.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>📋</Text>
            <Text style={styles.emptyStateText}>Aucune maintenance pour ce site</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: '#0066CC',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#E3F2FD',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  searchContainer: {
    marginBottom: 20,
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#DEE2E6',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0066CC',
    marginBottom: 12,
  },
  siteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#DEE2E6',
  },
  siteCardActive: {
    borderColor: '#0066CC',
    backgroundColor: '#E3F2FD',
  },
  siteCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  siteCardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#343A40',
    flex: 1,
  },
  siteCardAddress: {
    fontSize: 14,
    color: '#6C757D',
  },
  badge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E9ECEF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeActive: {
    backgroundColor: '#0066CC',
  },
  badgeText: {
    fontSize: 16,
    color: '#6C757D',
  },
  badgeTextActive: {
    color: '#FFFFFF',
  },
  maintenanceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: '#DEE2E6',
  },
  maintenanceCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  maintenanceCardIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  maintenanceCardContent: {
    flex: 1,
  },
  maintenanceCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#343A40',
    marginBottom: 4,
  },
  maintenanceCardDate: {
    fontSize: 14,
    color: '#6C757D',
  },
  maintenanceCardComment: {
    fontSize: 13,
    color: '#6C757D',
    fontStyle: 'italic',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  statusBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginTop: 20,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6C757D',
    textAlign: 'center',
  },
});