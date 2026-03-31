import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
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
import { EmptyState } from '../../components/ui/EmptyState';
import { InfoCard } from '../../components/ui/InfoCard';
import { Colors } from '../../constants/Colors';
import { Config } from '../../constants/Config';
import { CardStyles, GlobalStyles } from '../../constants/Styles';
import { Maintenance, MaintenanceProduit, Produit } from '../../types';
import { api } from '../../utils/api';
import { formatDate } from '../../utils/formatters';
import { getEtatColor, getStatusConfig } from '../../utils/helpers';

// Même logique que le front web
function parseOperateurs(str?: string | null): string[] {
  if (!str) return [];
  return str.split(/[\n,]/).map(s => s.trim()).filter(Boolean);
}

export default function MaintenanceDetailsScreen() {
  const { id_maintenance, scanned_product_id } = useLocalSearchParams();
  const router = useRouter();
  const [maintenance, setMaintenance] = useState<Maintenance | null>(null);
  const [produitsAssocies, setProduitsAssocies] = useState<MaintenanceProduit[]>([]);
  const [produitsNonAssocies, setProduitsNonAssocies] = useState<Produit[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedProduitId, setSelectedProduitId] = useState<number | null>(null);
  const [selectedProduitName, setSelectedProduitName] = useState<string>('');

  // Formulaire produit
  const [formData, setFormData] = useState({
    etat: '',
    commentaire: '',
    etat_constate: '',
    travaux_effectues: '',
    ri_interne: '',
  });
  const [photos, setPhotos] = useState<string[]>([]);

  const loadData = async () => {
    try {
      const [maintData, produitsData] = await Promise.all([
        api.getMaintenanceById(Number(id_maintenance)),
        api.getProductsByMaintenance(Number(id_maintenance)),
      ]);

      setMaintenance(maintData);
      setProduitsAssocies(produitsData);

      if (maintData.id_site) {
        const allProduits = await api.getProductsBySite(maintData.id_site);
        const associatedIds = produitsData.map(p => p.id_produit);
        const nonAssocies = allProduits.filter(p => !associatedIds.includes(p.id_produit));
        setProduitsNonAssocies(nonAssocies);
      }
    } catch (err) {
      Alert.alert('Erreur', 'Impossible de charger les données');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id_maintenance]);

  useEffect(() => {
    if (scanned_product_id && maintenance) {
      const productId = Number(scanned_product_id);
      const isAssociated = produitsAssocies.some(p => p.id_produit === productId);

      if (isAssociated) {
        Alert.alert('Produit déjà associé', 'Ce produit est déjà associé à cette maintenance', [{ text: 'OK' }]);
        router.setParams({ scanned_product_id: undefined });
        return;
      }

      const verifyAndAddProduct = async () => {
        try {
          const produit = await api.getProductById(productId);
          if (produit.id_site !== maintenance.id_site) {
            Alert.alert(
              'Produit incompatible',
              `Ce produit appartient à un autre site.\n\nProduit: ${produit.nom}\nSite: ${produit.id_site}\nMaintenance site: ${maintenance.id_site}`,
              [{ text: 'OK' }]
            );
          } else {
            openAddProductForm(productId, produit.nom);
          }
        } catch (err: any) {
          Alert.alert('Produit introuvable', err.message || "Ce produit n'existe pas dans la base de données", [{ text: 'OK' }]);
        } finally {
          router.setParams({ scanned_product_id: undefined });
        }
      };

      verifyAndAddProduct();
    }
  }, [scanned_product_id, maintenance, produitsAssocies]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
  };

  const handleScanPress = () => {
    router.push({
      pathname: '/(tabs)/scanner',
      params: { id_maintenance: String(id_maintenance), return_to: 'maintenance' },
    });
  };

  const openAddProductForm = (id_produit: number, produitName = '') => {
    setIsEditMode(false);
    setSelectedProduitId(id_produit);
    setSelectedProduitName(produitName);
    setFormData({ etat: '', commentaire: '', etat_constate: '', travaux_effectues: '', ri_interne: '' });
    setPhotos([]);
    setModalVisible(true);
  };

  const openEditProductForm = (produit: MaintenanceProduit) => {
    setIsEditMode(true);
    setSelectedProduitId(produit.id_produit);
    setSelectedProduitName(produit.nom);
    setFormData({
      etat: produit.etat || '',
      commentaire: produit.commentaire || '',
      etat_constate: produit.etat_constate || '',
      travaux_effectues: produit.travaux_effectues || '',
      ri_interne: produit.ri_interne || '',
    });
    setPhotos([]);
    setModalVisible(true);
  };

  const pickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission refusée', 'Nous avons besoin de la permission pour accéder à vos photos');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 5 - photos.length,
    });
    if (!result.canceled && result.assets) {
      setPhotos([...photos, ...result.assets.map(a => a.uri)]);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission refusée', 'Nous avons besoin de la permission pour accéder à la caméra');
      return;
    }
    if (photos.length >= 5) {
      Alert.alert('Limite atteinte', 'Vous ne pouvez ajouter que 5 photos maximum');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (!result.canceled && result.assets?.[0]) {
      setPhotos([...photos, result.assets[0].uri]);
    }
  };

  const removePhoto = (index: number) => setPhotos(photos.filter((_, i) => i !== index));

  const handleCancel = () => {
    Alert.alert('Annuler', 'Êtes-vous sûr de vouloir annuler ? Les données saisies seront perdues.', [
      { text: 'Non', style: 'cancel' },
      {
        text: 'Oui',
        style: 'destructive',
        onPress: () => {
          setModalVisible(false);
          setIsEditMode(false);
          setFormData({ etat: '', commentaire: '', etat_constate: '', travaux_effectues: '', ri_interne: '' });
          setPhotos([]);
          setSelectedProduitId(null);
          setSelectedProduitName('');
        },
      },
    ]);
  };

  const handleSubmit = async () => {
    if (!selectedProduitId) return;
    if (!formData.etat) {
      Alert.alert('Erreur', 'Veuillez sélectionner un état');
      return;
    }

    try {
      if (isEditMode) {
        await api.updateProductMaintenance({
          id_maintenance: Number(id_maintenance),
          id_produit: selectedProduitId,
          etat: formData.etat,
          commentaire: formData.commentaire || '',
          etat_constate: formData.etat_constate || '',
          travaux_effectues: formData.travaux_effectues || '',
          ri_interne: formData.ri_interne || '',
        });
      } else {
        await api.addProductToMaintenance({
          id_maintenance: Number(id_maintenance),
          id_produit: selectedProduitId,
          etat: formData.etat,
          commentaire: formData.commentaire || '',
          etat_constate: formData.etat_constate || '',
          travaux_effectues: formData.travaux_effectues || '',
          ri_interne: formData.ri_interne || '',
        });
      }

      if (photos.length > 0) {
        const form = new FormData();
        photos.forEach(uri => {
          const filename = uri.split('/').pop()!;
          const match = /\.(\w+)$/.exec(filename);
          form.append('photos', { uri, name: filename, type: match ? `image/${match[1]}` : 'image' } as any);
        });
        form.append('id_maintenance', String(id_maintenance));
        form.append('id_produit', String(selectedProduitId));
        await fetch(`${Config.API_URL}/photos/multiple`, {
          method: 'POST',
          body: form,
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      Alert.alert('Succès', isEditMode ? 'Informations mises à jour' : 'Produit associé avec succès');
      setModalVisible(false);
      setIsEditMode(false);
      setFormData({ etat: '', commentaire: '', etat_constate: '', travaux_effectues: '', ri_interne: '' });
      setPhotos([]);
      setSelectedProduitId(null);
      setSelectedProduitName('');
      loadData();
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Impossible de sauvegarder');
    }
  };

  const handleDeleteProduct = (id_produit: number, id_maint: number, nom: string) => {
    Alert.alert('Retirer le produit', `Voulez-vous retirer "${nom}" de cette maintenance ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Retirer',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.removeProductFromMaintenance(id_maint, id_produit);
            Alert.alert('Succès', 'Produit retiré de la maintenance');
            loadData();
          } catch {
            Alert.alert('Erreur', 'Impossible de retirer le produit');
          }
        },
      },
    ]);
  };

  if (!maintenance) {
    return (
      <View style={GlobalStyles.container}>
        <Text>Chargement...</Text>
      </View>
    );
  }

  const { color, icon } = getStatusConfig(maintenance.etat);

  // Préparer les opérateurs depuis la string
  const operateurs = parseOperateurs(maintenance.operateurs);
  const operateursDisplay = operateurs.length > 0 ? operateurs.join(' / ') : null;

  // Construire les lignes de l'InfoCard — identique à l'affichage web
  const infoRows = [
    { label: 'N° RI / Chrono :', value: maintenance.numero_ri || 'N/A' },
    { label: 'Désignation produit / site :', value: maintenance.designation_produit_site || 'N/A' },
    { label: "Type d'intervention :", value: maintenance.types_intervention || maintenance.type || 'N/A' },
    { label: 'Département :', value: maintenance.departement || 'N/A' },
    ...(maintenance.date_demande
      ? [{ label: 'Date demande :', value: formatDate(maintenance.date_demande) }]
      : []),
    ...(maintenance.date_accord_client
      ? [{ label: 'Date accord client :', value: formatDate(maintenance.date_accord_client) }]
      : []),
    { label: 'Date intervention :', value: formatDate(maintenance.date_maintenance) },
    ...(maintenance.client_nom || maintenance.site_nom
      ? [{ label: 'Client :', value: maintenance.client_nom || maintenance.site_nom || 'N/A' }]
      : []),
    { label: 'Contact :', value: maintenance.contact || 'N/A' },
    { label: 'Type panneau / produit :', value: maintenance.type_produit || 'N/A' },
    { label: 'N° Affaire / CDE :', value: maintenance.numero_commande || 'N/A' },
    { label: 'Personnes affectées :', value: operateursDisplay || 'N/A' },
    { label: 'État :', value: maintenance.etat || 'N/A', valueColor: color },
    {
      label: 'Garantie :',
      value: maintenance.garantie === 1 || maintenance.garantie === true ? '✅ Oui' : '❌ Non',
    },
    ...(maintenance.commentaire
      ? [{ label: 'Commentaire :', value: maintenance.commentaire }]
      : []),
    ...(maintenance.commentaire_interne
      ? [{ label: '🔒 Commentaire interne :', value: maintenance.commentaire_interne }]
      : []),
  ];

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
        <InfoCard title="Informations" icon="📋" rows={infoRows} />

        <TouchableOpacity style={styles.scanButton} onPress={handleScanPress}>
          <Text style={styles.scanButtonText}>📷 Scanner un produit</Text>
        </TouchableOpacity>

        {/* ── Produits associés ── */}
        <View style={{ marginBottom: 16 }}>
          <Text style={styles.sectionTitle}>
            ✅ Produits associés ({produitsAssocies.length})
          </Text>
          {produitsAssocies.length === 0 ? (
            <EmptyState
              icon="📦"
              title="Aucun produit associé"
              subtitle="Scannez un QR code pour ajouter un produit"
            />
          ) : (
            produitsAssocies.map(produit => (
              <TouchableOpacity
                key={produit.id_produit}
                onPress={() => router.push(`../products/${produit.id_produit}`)}
                activeOpacity={0.7}
              >
                <Card
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
                  {produit.etat_constate && (
                    <Text style={CardStyles.cardText}>📋 État constaté: {produit.etat_constate}</Text>
                  )}
                  {produit.travaux_effectues && (
                    <Text style={CardStyles.cardText}>🔧 Travaux: {produit.travaux_effectues}</Text>
                  )}

                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={(e: any) => { e.stopPropagation(); openEditProductForm(produit); }}
                    >
                      <Text style={styles.editButtonText}>✏️ Modifier</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={(e: any) => { e.stopPropagation(); handleDeleteProduct(produit.id_produit, Number(id_maintenance), produit.nom); }}
                    >
                      <Text style={styles.deleteButtonText}>🗑️ Retirer</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.tapHint}>Appuyez pour voir les détails →</Text>
                </Card>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* ── Produits non associés ── */}
        <View style={{ marginBottom: 16 }}>
          <Text style={styles.sectionTitle}>
            ⏳ Produits non associés ({produitsNonAssocies.length})
          </Text>
          {produitsNonAssocies.length === 0 ? (
            <EmptyState
              icon="✅"
              title="Tous les produits sont associés"
              subtitle="Tous les équipements du site ont été traités"
            />
          ) : (
            produitsNonAssocies.map(produit => (
              <TouchableOpacity
                key={produit.id_produit}
                onPress={() => openAddProductForm(produit.id_produit, produit.nom)}
                activeOpacity={0.7}
              >
                <Card title={produit.nom} borderLeftColor={Colors.gray}>
                  {produit.departement && (
                    <Text style={CardStyles.cardText}>📂 {produit.departement}</Text>
                  )}
                  {produit.description && (
                    <Text style={CardStyles.cardText}>📝 {produit.description}</Text>
                  )}
                  <Text style={styles.addHint}>Appuyez pour associer à cette maintenance</Text>
                </Card>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* ── Modal produit ── */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCancel}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {isEditMode ? 'Modifier le produit' : 'Associer un produit'}
                </Text>
                {selectedProduitName && (
                  <Text style={styles.modalSubtitle}>{selectedProduitName}</Text>
                )}
              </View>

              <Text style={styles.label}>État *</Text>
              <View style={styles.etatContainer}>
                {['OK', 'NOK', 'Passable', 'Non vérifié'].map(etat => (
                  <TouchableOpacity
                    key={etat}
                    style={[styles.etatButton, formData.etat === etat && styles.etatButtonActive]}
                    onPress={() => setFormData({ ...formData, etat })}
                  >
                    <Text style={[styles.etatButtonText, formData.etat === etat && styles.etatButtonTextActive]}>
                      {etat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Commentaire général</Text>
              <TextInput
                style={styles.textArea}
                placeholder="Commentaire sur l'état du produit"
                value={formData.commentaire}
                onChangeText={text => setFormData({ ...formData, commentaire: text })}
                multiline
                numberOfLines={3}
              />

              <Text style={styles.label}>État constaté</Text>
              <TextInput
                style={styles.textArea}
                placeholder="Décrivez l'état constaté lors de la maintenance"
                value={formData.etat_constate}
                onChangeText={text => setFormData({ ...formData, etat_constate: text })}
                multiline
                numberOfLines={4}
              />

              <Text style={styles.label}>Travaux effectués</Text>
              <TextInput
                style={styles.textArea}
                placeholder="Détaillez les travaux effectués sur ce produit"
                value={formData.travaux_effectues}
                onChangeText={text => setFormData({ ...formData, travaux_effectues: text })}
                multiline
                numberOfLines={4}
              />

              <Text style={styles.label}>RI interne</Text>
              <TextInput
                style={styles.input}
                placeholder="RI interne non visible par le client"
                value={formData.ri_interne}
                onChangeText={text => setFormData({ ...formData, ri_interne: text })}
              />

              {!isEditMode && (
                <>
                  <Text style={styles.label}>Photos ({photos.length}/5)</Text>
                  <View style={styles.photoButtonsContainer}>
                    <TouchableOpacity
                      style={[styles.photoButton, styles.cameraButton]}
                      onPress={takePhoto}
                      disabled={photos.length >= 5}
                    >
                      <Text style={styles.photoButtonText}>📷 Prendre une photo</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.photoButton, styles.galleryButton]}
                      onPress={pickImages}
                      disabled={photos.length >= 5}
                    >
                      <Text style={styles.photoButtonText}>🖼️ Galerie</Text>
                    </TouchableOpacity>
                  </View>

                  {photos.length > 0 && (
                    <View style={styles.photosPreview}>
                      {photos.map((uri, index) => (
                        <View key={index} style={styles.photoItem}>
                          <Image source={{ uri }} style={styles.photoImage} />
                          <TouchableOpacity style={styles.removePhotoButton} onPress={() => removePhoto(index)}>
                            <Text style={styles.removePhotoText}>✕</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}
                </>
              )}

              <View style={styles.modalButtons}>
                <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={handleCancel}>
                  <Text style={styles.cancelButtonText}>✕ Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalButton, styles.submitButton]} onPress={handleSubmit}>
                  <Text style={styles.submitButtonText}>
                    {isEditMode ? '✓ Enregistrer' : '✓ Associer'}
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
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  editButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  editButtonText: { color: Colors.white, fontSize: 12, fontWeight: '600' },
  deleteButton: {
    flex: 1,
    backgroundColor: Colors.danger,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  deleteButtonText: { color: Colors.white, fontSize: 12, fontWeight: '600' },
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
    elevation: 4,
  },
  scanButtonText: { color: Colors.white, fontSize: 18, fontWeight: '600' },
  tapHint: {
    marginTop: 8,
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500',
    fontStyle: 'italic',
  },
  addHint: {
    marginTop: 8,
    fontSize: 12,
    color: Colors.success,
    fontWeight: '600',
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '90%',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: Colors.borderBright,
  },
  modalHeader: {
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.primary,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: Colors.surface2,
    color: Colors.text,
  },
  textArea: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: Colors.surface2,
    color: Colors.text,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  etatContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  etatButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.surface3,
  },
  etatButtonActive: { borderColor: Colors.primary, backgroundColor: Colors.primary },
  etatButtonText: { fontSize: 14, fontWeight: '600', color: Colors.text },
  etatButtonTextActive: { color: Colors.white },
  photoButtonsContainer: { flexDirection: 'row', gap: 8 },
  photoButton: { flex: 1, borderRadius: 8, padding: 14, alignItems: 'center' },
  cameraButton: { backgroundColor: Colors.primary },
  galleryButton: { backgroundColor: Colors.secondary },
  photoButtonText: { color: Colors.white, fontSize: 14, fontWeight: '600' },
  photosPreview: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  photoItem: { position: 'relative', width: 100, height: 100 },
  photoImage: { width: '100%', height: '100%', borderRadius: 8 },
  removePhotoButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: Colors.danger,
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removePhotoText: { color: Colors.white, fontSize: 14, fontWeight: '700' },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 24, marginBottom: 20 },
  modalButton: { flex: 1, padding: 16, borderRadius: 12, alignItems: 'center' },
  cancelButton: { backgroundColor: Colors.danger },
  cancelButtonText: { color: Colors.white, fontSize: 16, fontWeight: '600' },
  submitButton: { backgroundColor: Colors.success },
  submitButtonText: { color: Colors.white, fontSize: 16, fontWeight: '600' },
});