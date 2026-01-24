import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
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
  const [showAddForm, setShowAddForm] = useState(false);

  // Formulaire
  const [formData, setFormData] = useState({
    date_maintenance: new Date().toISOString().split('T')[0],
    type: '',
    etat: 'Planifiée',
    departement: '',
    commentaire: '',
    ri_interne: '',
  });

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

  const handleAddMaintenance = async () => {
    if (!selectedSite) {
      Alert.alert('Erreur', 'Veuillez sélectionner un site');
      return;
    }

    if (!formData.type) {
      Alert.alert('Erreur', 'Veuillez renseigner le type de maintenance');
      return;
    }

    try {
      const res = await fetch(`${API}/maintenances`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_site: selectedSite,
          ...formData,
        }),
      });

      if (!res.ok) {
        throw new Error('Erreur lors de la création');
      }

      Alert.alert('Succès', 'Maintenance créée avec succès');
      setShowAddForm(false);
      setFormData({
        date_maintenance: new Date().toISOString().split('T')[0],
        type: '',
        etat: 'Planifiée',
        departement: '',
        commentaire: '',
        ri_interne: '',
      });
      loadMaintenances(selectedSite);
    } catch (err) {
      Alert.alert('Erreur', err.message);
    }
  };

  const filteredSites = sites.filter((site) =>
    site.nom?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleMaintenancePress = (maintenance) => {
    router.push({
      pathname: '/maintenance-details',
      params: {
        id_maintenance: maintenance.id_maintenance,
        id_site: maintenance.id_site,
      },
    });
  };

  const getStatusConfig = (etat) => {
    const etatLower = (etat || '').toLowerCase();
    if (etatLower.includes('termin')) return { color: '#28A745', icon: '✅' };
    if (etatLower.includes('cours')) return { color: '#FFC107', icon: '⚙️' };
    if (etatLower.includes('planif')) return { color: '#0066CC', icon: '📅' };
    return { color: '#6C757D', icon: '🔧' };
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🔧 Maintenances</Text>
        <Text style={styles.headerSubtitle}>Gérer les maintenances par site</Text>
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
        {selectedSite && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Maintenances ({maintenances.length})</Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => setShowAddForm(true)}
              >
                <Text style={styles.addButtonText}>+ Ajouter</Text>
              </TouchableOpacity>
            </View>

            {maintenances.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateIcon}>📋</Text>
                <Text style={styles.emptyStateText}>Aucune maintenance pour ce site</Text>
                <TouchableOpacity
                  style={styles.emptyStateButton}
                  onPress={() => setShowAddForm(true)}
                >
                  <Text style={styles.emptyStateButtonText}>+ Créer une maintenance</Text>
                </TouchableOpacity>
              </View>
            ) : (
              maintenances.map((maintenance) => {
                const { color, icon } = getStatusConfig(maintenance.etat);

                return (
                  <TouchableOpacity
                    key={maintenance.id_maintenance}
                    style={[styles.maintenanceCard, { borderLeftColor: color }]}
                    onPress={() => handleMaintenancePress(maintenance)}
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
              })
            )}
          </View>
        )}
      </ScrollView>

      {/* Modal Ajout Maintenance */}
      <Modal
        visible={showAddForm}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddForm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>📝 Nouvelle Maintenance</Text>

            <ScrollView style={styles.modalForm}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Date *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.date_maintenance}
                  onChangeText={(text) => setFormData({ ...formData, date_maintenance: text })}
                  placeholder="YYYY-MM-DD"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Type de maintenance *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.type}
                  onChangeText={(text) => setFormData({ ...formData, type: text })}
                  placeholder="Ex: Maintenance préventive"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>État</Text>
                <View style={styles.stateButtonsRow}>
                  {['Planifiée', 'En cours', 'Terminée'].map((etat) => (
                    <TouchableOpacity
                      key={etat}
                      style={[
                        styles.stateButtonSmall,
                        formData.etat === etat && styles.stateButtonSmallActive,
                      ]}
                      onPress={() => setFormData({ ...formData, etat })}
                    >
                      <Text
                        style={[
                          styles.stateButtonSmallText,
                          formData.etat === etat && styles.stateButtonSmallTextActive,
                        ]}
                      >
                        {etat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Département</Text>
                <TextInput
                  style={styles.input}
                  value={formData.departement}
                  onChangeText={(text) => setFormData({ ...formData, departement: text })}
                  placeholder="Ex: Électricité"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Commentaire</Text>
                <TextInput
                  style={styles.textArea}
                  value={formData.commentaire}
                  onChangeText={(text) => setFormData({ ...formData, commentaire: text })}
                  placeholder="Notes..."
                  multiline
                  numberOfLines={4}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>RI Interne</Text>
                <TextInput
                  style={styles.input}
                  value={formData.ri_interne}
                  onChangeText={(text) => setFormData({ ...formData, ri_interne: text })}
                  placeholder="Référence interne"
                />
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalButtonSecondary}
                onPress={() => setShowAddForm(false)}
              >
                <Text style={styles.modalButtonSecondaryText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButtonPrimary}
                onPress={handleAddMaintenance}
              >
                <Text style={styles.modalButtonPrimaryText}>Créer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0066CC',
  },
  addButton: {
    backgroundColor: '#28A745',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
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
    marginBottom: 16,
  },
  emptyStateButton: {
    backgroundColor: '#28A745',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0066CC',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalForm: {
    maxHeight: '70%',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#343A40',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F8F9FA',
    borderWidth: 2,
    borderColor: '#DEE2E6',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    backgroundColor: '#F8F9FA',
    borderWidth: 2,
    borderColor: '#DEE2E6',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  stateButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  stateButtonSmall: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderWidth: 2,
    borderColor: '#DEE2E6',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  stateButtonSmallActive: {
    backgroundColor: '#0066CC',
    borderColor: '#0066CC',
  },
  stateButtonSmallText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#343A40',
  },
  stateButtonSmallTextActive: {
    color: '#FFF',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalButtonSecondary: {
    flex: 1,
    backgroundColor: '#6C757D',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  modalButtonSecondaryText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonPrimary: {
    flex: 1,
    backgroundColor: '#0066CC',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  modalButtonPrimaryText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});