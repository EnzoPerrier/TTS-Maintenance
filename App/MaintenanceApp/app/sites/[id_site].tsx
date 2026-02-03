import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Modal, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Card } from '../../components/ui/Card';
import { InfoCard } from '../../components/ui/InfoCard';
import { NavigationButton } from '../../components/ui/NavigationButton';
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
  
  // Modal ajout produit
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [newProduct, setNewProduct] = useState({
    nom: '',
    departement: '',
    etat: '',
    description: '',
  });

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

  const handleEquipementPress = (id_produit: number) => {
    router.push(`../products/${id_produit}`);
  };

  const handleMaintenancePress = (id_maintenance: number) => {
    router.push(`../maintenance/${id_maintenance}`);
  };

  const handleDeleteProduct = (id_produit: number, nom: string) => {
    Alert.alert(
      'Supprimer le produit',
      `Êtes-vous sûr de vouloir supprimer "${nom}" définitivement?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteProduct(id_produit);
              Alert.alert('Succès', 'Produit supprimé avec succès');
              loadData();
            } catch (err) {
              Alert.alert('Erreur', 'Impossible de supprimer le produit');
            }
          }
        }
      ]
    );
  };

  const handleDeleteMaintenance = (id_maintenance: number, type: string) => {
    Alert.alert(
      'Supprimer la maintenance',
      `Êtes-vous sûr de vouloir supprimer cette maintenance "${type}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteMaintenance(id_maintenance);
              Alert.alert('Succès', 'Maintenance supprimée avec succès');
              loadData();
            } catch (err) {
              Alert.alert('Erreur', 'Impossible de supprimer la maintenance');
            }
          }
        }
      ]
    );
  };

  const handleAddProduct = async () => {
    if (!newProduct.nom) {
      Alert.alert('Erreur', 'Le nom du produit est requis');
      return;
    }

    try {
      await api.createProduct({
        id_site: Number(id_site),
        nom: newProduct.nom,
        departement: newProduct.departement || null,
        etat: newProduct.etat || null,
        description: newProduct.description || null,
      });

      Alert.alert('Succès', 'Produit ajouté avec succès');
      setShowAddProductModal(false);
      setNewProduct({
        nom: '',
        departement: '',
        etat: '',
        description: '',
      });
      loadData();
    } catch (err) {
      Alert.alert('Erreur', 'Impossible d\'ajouter le produit');
    }
  };

  if (!site) {
    return (
      <View style={GlobalStyles.container}>
        <Text>Chargement...</Text>
      </View>
    );
  }

  // Vérifier si le site a des coordonnées GPS
  const hasGPS = site.gps_lat && site.gps_lng;

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
            ...(hasGPS ? [
              { label: 'GPS:', value: `${site.gps_lat}, ${site.gps_lng}` }
            ] : []),
          ]}
        />

        {/* Bouton Navigation GPS */}
        {hasGPS && (
          <View style={styles.navigationContainer}>
            <NavigationButton
              lat={Number(site.gps_lat)}
              lng={Number(site.gps_lng)}
              label={site.nom}
              showMenu={true}
              variant="primary"
              size="large"
            />
          </View>
        )}

        {/* Statistiques */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
          <StatCard number={equipements.length} label="Équipements" />
          <StatCard number={maintenances.length} label="Maintenances" />
        </View>

        {/* Équipements */}
        <View style={{ marginBottom: 16 }}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>📦 Équipements ({equipements.length})</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowAddProductModal(true)}
            >
              <Text style={styles.addButtonText}>+ Ajouter</Text>
            </TouchableOpacity>
          </View>
          
          {equipements.map(equi => (
            <TouchableOpacity
              key={equi.id_produit}
              onPress={() => handleEquipementPress(equi.id_produit)}
              activeOpacity={0.7}
            >
              <Card
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
                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleDeleteProduct(equi.id_produit, equi.nom);
                    }}
                  >
                    <Text style={styles.deleteButtonText}>🗑️ Supprimer</Text>
                  </TouchableOpacity>
                  <Text style={styles.tapHint}>Appuyez pour voir les détails →</Text>
                </View>
              </Card>
            </TouchableOpacity>
          ))}
          {equipements.length === 0 && (
            <Text style={styles.emptyText}>Aucun équipement sur ce site</Text>
          )}
        </View>

        {/* Maintenances */}
        <View style={{ marginBottom: 16 }}>
          <Text style={styles.sectionTitle}>🔧 Maintenances ({maintenances.length})</Text>
          {maintenances.map(maint => {
            const { color, icon } = getStatusConfig(maint.etat);
            return (
              <TouchableOpacity
                key={maint.id_maintenance}
                onPress={() => handleMaintenancePress(maint.id_maintenance)}
                activeOpacity={0.7}
              >
                <Card
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
                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleDeleteMaintenance(maint.id_maintenance, maint.type);
                      }}
                    >
                      <Text style={styles.deleteButtonText}>🗑️ Supprimer</Text>
                    </TouchableOpacity>
                    <Text style={styles.tapHint}>Appuyez pour voir les détails →</Text>
                  </View>
                </Card>
              </TouchableOpacity>
            );
          })}
          {maintenances.length === 0 && (
            <Text style={styles.emptyText}>Aucune maintenance pour ce site</Text>
          )}
        </View>
      </ScrollView>

      {/* Modal ajout produit */}
      <Modal
        visible={showAddProductModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddProductModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Ajouter un produit</Text>

            <Text style={styles.label}>Nom *</Text>
            <TextInput
              style={styles.input}
              placeholder="Nom du produit"
              value={newProduct.nom}
              onChangeText={(text) => setNewProduct({ ...newProduct, nom: text })}
            />

            <Text style={styles.label}>Département</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: STEP, SDRT..."
              value={newProduct.departement}
              onChangeText={(text) => setNewProduct({ ...newProduct, departement: text })}
            />

            <Text style={styles.label}>État</Text>
            <View style={styles.etatContainer}>
              {['OK', 'NOK', 'Passable', 'Non vérifié'].map(etat => (
                <TouchableOpacity
                  key={etat}
                  style={[
                    styles.etatButton,
                    newProduct.etat === etat && styles.etatButtonActive
                  ]}
                  onPress={() => setNewProduct({ ...newProduct, etat })}
                >
                  <Text style={[
                    styles.etatButtonText,
                    newProduct.etat === etat && styles.etatButtonTextActive
                  ]}>
                    {etat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Description</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Description du produit"
              value={newProduct.description}
              onChangeText={(text) => setNewProduct({ ...newProduct, description: text })}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowAddProductModal(false);
                  setNewProduct({
                    nom: '',
                    departement: '',
                    etat: '',
                    description: '',
                  });
                }}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={handleAddProduct}
              >
                <Text style={styles.submitButtonText}>Ajouter</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  navigationContainer: {
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addButton: {
    backgroundColor: Colors.success,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  addButtonText: {
    color: Colors.white,
    fontWeight: '600',
    fontSize: 14,
  },
  tapHint: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500',
    fontStyle: 'italic',
  },
  emptyText: {
    textAlign: 'center',
    color: Colors.textSecondary,
    fontStyle: 'italic',
    padding: 20,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  deleteButton: {
    backgroundColor: Colors.danger,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  deleteButtonText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.primary,
    textAlign: 'center',
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.gray,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: Colors.background,
  },
  textArea: {
    borderWidth: 1,
    borderColor: Colors.gray,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: Colors.background,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  etatContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  etatButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.gray,
    backgroundColor: Colors.white,
  },
  etatButtonActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  etatButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  etatButtonTextActive: {
    color: Colors.white,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: Colors.gray,
  },
  cancelButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: Colors.success,
  },
  submitButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});