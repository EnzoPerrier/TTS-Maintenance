import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
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
import { Card } from '../../components/ui/Card';
import { InfoCard } from '../../components/ui/InfoCard';
import { NavigationButton } from '../../components/ui/NavigationButton';
import { StatCard } from '../../components/ui/StatCard';
import { Colors } from '../../constants/Colors';
import { CardStyles, GlobalStyles } from '../../constants/Styles';
import { Client, Maintenance, Produit, Site } from '../../types';
import { api } from '../../utils/api';
import { formatDate } from '../../utils/formatters';
import { getEtatColor, getStatusConfig } from '../../utils/helpers';

const TYPES_MAINTENANCE = [
  'Installation',
  'Intervention curative',
  'Révision',
  'Contrat de maintenance',
  'Location',
  'Accident',
  'Vandalisme',
  'Orage',
  'Autre',
];

// ── Helpers date ─────────────────────────────────────────────────────────────
// Aujourd'hui au format JJ/MM/AAAA
function todayDisplay(): string {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

// Formate la saisie au fil des caractères : ajoute les "/" automatiquement
function formatDateInput(raw: string): string {
  // Ne garde que les chiffres
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

// Convertit JJ/MM/AAAA → AAAA-MM-JJ pour l'API
function displayToISO(display: string): string {
  const parts = display.split('/');
  if (parts.length !== 3 || parts[2].length !== 4) return '';
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

export default function SiteDetailsScreen() {
  const { id_site } = useLocalSearchParams();
  const router = useRouter();
  const [site, setSite] = useState<Site | null>(null);
  const [equipements, setEquipements] = useState<Produit[]>([]);
  const [maintenances, setMaintenances] = useState<Maintenance[]>([]);
  const [client, setClient] = useState<Client | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // ── Modal ajout produit ──────────────────────────────────────────────────
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [newProduct, setNewProduct] = useState({
    nom: '',
    departement: '',
    etat: '',
    description: '',
  });

  // ── Modal ajout maintenance ──────────────────────────────────────────────
  const [showAddMaintenanceModal, setShowAddMaintenanceModal] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [newMaintenance, setNewMaintenance] = useState({
    type: '',
    date: todayDisplay(),   // stocké en JJ/MM/AAAA
    etat: 'Planifiée',
    departement: '',
    commentaire: '',
    numero_ri: '',
    contact: '',
  });
  const [submittingMaint, setSubmittingMaint] = useState(false);

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
      // Charger les infos du client
      if (siteData.id_client) {
        const clientData = await api.getClientById(Number(siteData.id_client));
        setClient(clientData);
      }
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

  // ── Supprimer produit ────────────────────────────────────────────────────
  const handleDeleteProduct = (id_produit: number, nom: string) => {
    Alert.alert(
      'Supprimer le produit',
      `Êtes-vous sûr de vouloir supprimer "${nom}" ?`,
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
          },
        },
      ]
    );
  };

  // ── Supprimer maintenance ────────────────────────────────────────────────
  const handleDeleteMaintenance = (id_maintenance: number, type: string) => {
    Alert.alert(
      'Supprimer la maintenance',
      `Êtes-vous sûr de vouloir supprimer la maintenance "${type}" ?`,
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
          },
        },
      ]
    );
  };

  // ── Ajouter produit ──────────────────────────────────────────────────────
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
      setNewProduct({ nom: '', departement: '', etat: '', description: '' });
      loadData();
    } catch (err) {
      Alert.alert('Erreur', "Impossible d'ajouter le produit");
    }
  };

  // ── Ajouter maintenance ──────────────────────────────────────────────────
  const handleAddMaintenance = async () => {
    if (!newMaintenance.type) {
      Alert.alert('Erreur', 'Veuillez sélectionner un type de maintenance');
      return;
    }
    const isoDate = displayToISO(newMaintenance.date);
    if (!isoDate) {
      Alert.alert('Erreur', 'Format de date invalide. Utilisez JJ/MM/AAAA');
      return;
    }
    setSubmittingMaint(true);
    try {
      const result = await api.createMaintenance({
        id_site: Number(id_site),
        date_maintenance: isoDate,
        type: newMaintenance.type,
        etat: newMaintenance.etat || null,
        departement: newMaintenance.departement || null,
        commentaire: newMaintenance.commentaire || null,
        numero_ri: newMaintenance.numero_ri || null,
        contact: newMaintenance.contact || null,
      });
      setShowAddMaintenanceModal(false);
      setNewMaintenance({
        type: '',
        date: todayDisplay(),
        etat: 'Planifiée',
        departement: '',
        commentaire: '',
        numero_ri: '',
        contact: '',
      });
      loadData();
      Alert.alert('Succès', 'Maintenance créée avec succès !', [
        {
          text: 'Voir la maintenance',
          onPress: () => router.push(`../maintenance/${result.id_maintenance}`),
        },
        { text: 'OK' },
      ]);
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Impossible de créer la maintenance');
    } finally {
      setSubmittingMaint(false);
    }
  };

  if (!site) {
    return (
      <View style={GlobalStyles.container}>
        <Text>Chargement...</Text>
      </View>
    );
  }

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
            { label: 'Nom :', value: site.nom },
            { label: 'Client :', value: client?.nom || String(site.id_client) },
            { label: 'Contact :', value: client?.contact || 'N/A' },
            { label: 'Email :', value: client?.email || 'N/A' },
            { label: 'Téléphone :', value: client?.telephone || 'N/A' },
            { label: 'Adresse :', value: site.adresse || 'N/A' },
            ...(site.gps_lat ? [{ label: 'Latitude :', value: String(site.gps_lat) }] : []),
            ...(site.gps_lng ? [{ label: 'Longitude :', value: String(site.gps_lng) }] : []),
            { label: 'Date de création :', value: site.date_creation || 'N/A' },
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

        {/* ── ÉQUIPEMENTS ─────────────────────────────────────────────────── */}
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

          {equipements.map((equi) => (
            <TouchableOpacity
              key={equi.id_produit}
              onPress={() => router.push(`../products/${equi.id_produit}`)}
              activeOpacity={0.7}
            >
              <Card title={equi.nom} borderLeftColor={getEtatColor(equi.etat)}>
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

        {/* ── MAINTENANCES ────────────────────────────────────────────────── */}
        <View style={{ marginBottom: 16 }}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🔧 Maintenances ({maintenances.length})</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowAddMaintenanceModal(true)}
            >
              <Text style={styles.addButtonText}>+ Ajouter</Text>
            </TouchableOpacity>
          </View>

          {maintenances.map((maint) => {
            const { color, icon } = getStatusConfig(maint.etat);
            return (
              <TouchableOpacity
                key={maint.id_maintenance}
                onPress={() => router.push(`../maintenance/${maint.id_maintenance}`)}
                activeOpacity={0.7}
              >
                <Card title={`${icon} ${maint.type}`} borderLeftColor={color}>
                  <Text style={CardStyles.cardText}>📅 {formatDate(maint.date_maintenance)}</Text>
                  <Text style={CardStyles.cardText}>
                    État:{' '}
                    <Text style={{ color, fontWeight: '600' }}>{maint.etat || 'N/A'}</Text>
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

      {/* ── MODAL AJOUT PRODUIT ───────────────────────────────────────────── */}
      <Modal
        visible={showAddProductModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAddProductModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>📦 Ajouter un produit</Text>

              <Text style={styles.label}>Nom *</Text>
              <TextInput
                style={styles.input}
                placeholder="Nom du produit"
                placeholderTextColor={Colors.gray600}
                value={newProduct.nom}
                onChangeText={(text) => setNewProduct({ ...newProduct, nom: text })}
              />

              <Text style={styles.label}>Département</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: STEP, SDRT..."
                placeholderTextColor={Colors.gray600}
                value={newProduct.departement}
                onChangeText={(text) => setNewProduct({ ...newProduct, departement: text })}
              />

              <Text style={styles.label}>État</Text>
              <View style={styles.chipRow}>
                {['OK', 'NOK', 'Passable'].map((etat) => {
                  const color =
                    etat === 'OK' ? Colors.success : etat === 'NOK' ? Colors.danger : Colors.warning;
                  return (
                    <TouchableOpacity
                      key={etat}
                      style={[
                        styles.chip,
                        newProduct.etat === etat && { backgroundColor: color, borderColor: color },
                      ]}
                      onPress={() => setNewProduct({ ...newProduct, etat })}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          newProduct.etat === etat && { color: Colors.white },
                        ]}
                      >
                        {etat}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.label}>Description</Text>
              <TextInput
                style={styles.textArea}
                placeholder="Description du produit"
                placeholderTextColor={Colors.gray600}
                value={newProduct.description}
                onChangeText={(text) => setNewProduct({ ...newProduct, description: text })}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setShowAddProductModal(false);
                    setNewProduct({ nom: '', departement: '', etat: '', description: '' });
                  }}
                >
                  <Text style={styles.modalBtnText}>✕ Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.submitButton} onPress={handleAddProduct}>
                  <Text style={styles.modalBtnText}>✓ Ajouter</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── MODAL AJOUT MAINTENANCE ───────────────────────────────────────── */}
      <Modal
        visible={showAddMaintenanceModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAddMaintenanceModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>🔧 Ajouter une maintenance</Text>

              {/* Date */}
              <Text style={styles.label}>📅 Date *</Text>
              <TextInput
                style={styles.input}
                value={newMaintenance.date}
                onChangeText={(text) =>
                  setNewMaintenance({ ...newMaintenance, date: formatDateInput(text) })
                }
                placeholder="JJ/MM/AAAA"
                placeholderTextColor={Colors.gray600}
                keyboardType="numeric"
                maxLength={10}
              />

              {/* Type */}
              <Text style={styles.label}>🔧 Type *</Text>
              <TouchableOpacity
                style={styles.dropdownBtn}
                onPress={() => setShowTypeDropdown(!showTypeDropdown)}
              >
                <Text style={[styles.dropdownBtnText, !newMaintenance.type && { color: Colors.gray600 }]}>
                  {newMaintenance.type || '-- Sélectionner --'}
                </Text>
                <Text style={{ color: Colors.gray600 }}>{showTypeDropdown ? '▲' : '▼'}</Text>
              </TouchableOpacity>
              {showTypeDropdown && (
                <View style={styles.dropdownList}>
                  {TYPES_MAINTENANCE.map((t) => (
                    <TouchableOpacity
                      key={t}
                      style={[
                        styles.dropdownItem,
                        newMaintenance.type === t && styles.dropdownItemActive,
                      ]}
                      onPress={() => {
                        setNewMaintenance({ ...newMaintenance, type: t });
                        setShowTypeDropdown(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.dropdownItemText,
                          newMaintenance.type === t && styles.dropdownItemTextActive,
                        ]}
                      >
                        {t}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* État */}
              <Text style={styles.label}>📊 État</Text>
              <View style={styles.chipRow}>
                {['Planifiée', 'En cours', 'Terminée'].map((e) => {
                  const color =
                    e === 'Terminée' ? Colors.success : e === 'En cours' ? Colors.warning : Colors.primary;
                  return (
                    <TouchableOpacity
                      key={e}
                      style={[
                        styles.chip,
                        newMaintenance.etat === e && { backgroundColor: color, borderColor: color },
                      ]}
                      onPress={() => setNewMaintenance({ ...newMaintenance, etat: e })}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          newMaintenance.etat === e && { color: Colors.white },
                        ]}
                      >
                        {e}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Département */}
              <Text style={styles.label}>🏷️ Département</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: STEP, SDRT..."
                placeholderTextColor={Colors.gray600}
                value={newMaintenance.departement}
                onChangeText={(text) => setNewMaintenance({ ...newMaintenance, departement: text })}
              />

              {/* N° RI */}
              <Text style={styles.label}>📄 Numéro de RI</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: RI251210"
                placeholderTextColor={Colors.gray600}
                value={newMaintenance.numero_ri}
                onChangeText={(text) => setNewMaintenance({ ...newMaintenance, numero_ri: text })}
              />

              {/* Contact */}
              <Text style={styles.label}>👤 Contact</Text>
              <TextInput
                style={styles.input}
                placeholder="Contact sur site"
                placeholderTextColor={Colors.gray600}
                value={newMaintenance.contact}
                onChangeText={(text) => setNewMaintenance({ ...newMaintenance, contact: text })}
              />

              {/* Commentaire */}
              <Text style={styles.label}>💬 Commentaire</Text>
              <TextInput
                style={styles.textArea}
                placeholder="Commentaire (optionnel)"
                placeholderTextColor={Colors.gray600}
                value={newMaintenance.commentaire}
                onChangeText={(text) => setNewMaintenance({ ...newMaintenance, commentaire: text })}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setShowAddMaintenanceModal(false);
                    setShowTypeDropdown(false);
                    setNewMaintenance({
                      type: '',
                      date: todayDisplay(),
                      etat: 'Planifiée',
                      departement: '',
                      commentaire: '',
                      numero_ri: '',
                      contact: '',
                    });
                  }}
                >
                  <Text style={styles.modalBtnText}>✕ Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.submitButton, submittingMaint && styles.btnDisabled]}
                  onPress={handleAddMaintenance}
                  disabled={submittingMaint}
                >
                  <Text style={styles.modalBtnText}>
                    {submittingMaint ? '⏳...' : '✓ Créer'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.primary,
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
  // ── Modal ────────────────────────────────────────────────────────────────
modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: Colors.borderBright,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.primary,
    textAlign: 'center',
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: Colors.text,
    backgroundColor: Colors.surface2,
  },
  textArea: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: Colors.text,
    backgroundColor: Colors.surface2,
    minHeight: 80,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.surface3,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  dropdownBtn: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface2,
  },
  dropdownBtnText: {
    fontSize: 15,
    color: Colors.text,
  },
  dropdownList: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    marginTop: 4,
    backgroundColor: Colors.surface,
    elevation: 4,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dropdownItemActive: {
    backgroundColor: Colors.primary + '22',
  },
  dropdownItemText: {
    fontSize: 15,
    color: Colors.text,
  },
  dropdownItemTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    marginBottom: 8,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: Colors.danger,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButton: {
    flex: 1,
    backgroundColor: Colors.success,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalBtnText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.6,
  },
});