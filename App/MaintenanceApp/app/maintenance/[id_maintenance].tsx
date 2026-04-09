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
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
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

// ─── Constantes jours ────────────────────────────────────────────────────────
const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'] as const;
const JOURS_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const JOURS_JS = [1, 2, 3, 4, 5, 6, 0]; // correspondance getDay()

type Jour = typeof JOURS[number];
type PeriodeSlot = 'matin_arr' | 'matin_dep' | 'apm_arr' | 'apm_dep';
type HorairesState = Record<Jour, Record<PeriodeSlot, string>>;

function emptyHoraires(): HorairesState {
  const h: any = {};
  JOURS.forEach(j => { h[j] = { matin_arr: '', matin_dep: '', apm_arr: '', apm_dep: '' }; });
  return h;
}

function horairesFromMaintenance(maintenance: any): HorairesState {
  const h = emptyHoraires();
  let jours: any[] = [];
  try {
    const raw = maintenance.jours_intervention;
    if (raw) jours = typeof raw === 'object' ? raw : JSON.parse(raw);
  } catch { jours = []; }

  if (jours.length > 0) {
    jours.forEach((jour: any) => {
      const d = new Date(jour.date_jour);
      const idx = JOURS_JS.indexOf(d.getDay());
      if (idx === -1) return;
      const j = JOURS[idx];
      h[j].matin_arr = (jour.heure_arrivee_matin || '').substring(0, 5);
      h[j].matin_dep = (jour.heure_depart_matin  || '').substring(0, 5);
      h[j].apm_arr   = (jour.heure_arrivee_aprem || '').substring(0, 5);
      h[j].apm_dep   = (jour.heure_depart_aprem  || '').substring(0, 5);
    });
  } else if (maintenance.date_maintenance) {
    const d = new Date(maintenance.date_maintenance);
    const idx = JOURS_JS.indexOf(d.getDay());
    if (idx !== -1) {
      const j = JOURS[idx];
      h[j].matin_arr = (maintenance.heure_arrivee_matin || '').substring(0, 5);
      h[j].matin_dep = (maintenance.heure_depart_matin  || '').substring(0, 5);
      h[j].apm_arr   = (maintenance.heure_arrivee_aprem || '').substring(0, 5);
      h[j].apm_dep   = (maintenance.heure_depart_aprem  || '').substring(0, 5);
    }
  }
  return h;
}

function horairesToJours(horaires: HorairesState, dateIntervention: string): any[] {
  const isoDate = displayToISO(dateIntervention);
  const baseDate = isoDate ? new Date(isoDate) : new Date();
  const jours: any[] = [];
  JOURS.forEach((j, idx) => {
    const { matin_arr, matin_dep, apm_arr, apm_dep } = horaires[j];
    if (matin_arr || matin_dep || apm_arr || apm_dep) {
      const jourDate = new Date(baseDate);
      jourDate.setDate(jourDate.getDate() + (JOURS_JS[idx] - baseDate.getDay()));
      jours.push({
        date_jour:           jourDate.toISOString().split('T')[0],
        heure_arrivee_matin: matin_arr || null,
        heure_depart_matin:  matin_dep || null,
        heure_arrivee_aprem: apm_arr   || null,
        heure_depart_aprem:  apm_dep   || null,
      });
    }
  });
  return jours;
}

// ─── Constantes formulaire ────────────────────────────────────────────────────
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

const ETATS_MAINTENANCE = ['Planifiée', 'En cours', 'Terminée'];

// ─── Helpers date ─────────────────────────────────────────────────────────────
function isoToDisplay(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function displayToISO(display: string): string {
  const parts = display.split('/');
  if (parts.length !== 3 || parts[2].length !== 4) return '';
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

function formatDateInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

// ─── Parser opérateurs ────────────────────────────────────────────────────────
function parseOperateurs(str?: string | null): string[] {
  if (!str) return [];
  return str.split(/[\n,]/).map(s => s.trim()).filter(Boolean);
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function MaintenanceDetailsScreen() {
  const { id_maintenance, scanned_product_id } = useLocalSearchParams();
  const router = useRouter();
  const [maintenance, setMaintenance] = useState<Maintenance | null>(null);
  const [produitsAssocies, setProduitsAssocies] = useState<MaintenanceProduit[]>([]);
  const [produitsNonAssocies, setProduitsNonAssocies] = useState<Produit[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // ── Modal produit ─────────────────────────────────────────────────────────
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedProduitId, setSelectedProduitId] = useState<number | null>(null);
  const [selectedProduitName, setSelectedProduitName] = useState<string>('');
  const [formData, setFormData] = useState({
    etat: '',
    commentaire: '',
    etat_constate: '',
    travaux_effectues: '',
    ri_interne: '',
  });
  const [photos, setPhotos] = useState<string[]>([]);

  // ── Modal édition maintenance ─────────────────────────────────────────────
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [editHoraires, setEditHoraires] = useState<HorairesState>(emptyHoraires());
  const [editForm, setEditForm] = useState({
    type: '',
    date: '',
    etat: '',
    departement: '',
    commentaire: '',
    commentaire_interne: '',
    contact: '',
    type_produit: '',
    designation_produit_site: '',
    numero_commande: '',
    numero_ri: '',
    garantie: false,
    operateurs: [] as string[],
    operateurInput: '',
  });

  // ── Chargement ────────────────────────────────────────────────────────────
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
        setProduitsNonAssocies(allProduits.filter(p => !associatedIds.includes(p.id_produit)));
      }
    } catch (err) {
      Alert.alert('Erreur', 'Impossible de charger les données');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => { loadData(); }, [id_maintenance]);

  // ── Pré-remplissage du formulaire d'édition ───────────────────────────────
  const openEditModal = () => {
    if (!maintenance) return;
    const ops = parseOperateurs(maintenance.operateurs);
    setEditForm({
      type: maintenance.type || '',
      date: isoToDisplay(maintenance.date_maintenance),
      etat: maintenance.etat || '',
      departement: maintenance.departement || '',
      commentaire: maintenance.commentaire || '',
      commentaire_interne: maintenance.commentaire_interne || '',
      contact: maintenance.contact || '',
      type_produit: maintenance.type_produit || '',
      designation_produit_site: maintenance.designation_produit_site || '',
      numero_commande: maintenance.numero_commande || '',
      numero_ri: maintenance.numero_ri || '',
      garantie: maintenance.garantie === 1 || maintenance.garantie === true,
      operateurs: ops,
      operateurInput: '',
    });
    setEditHoraires(horairesFromMaintenance(maintenance));
    setShowTypeDropdown(false);
    setEditModalVisible(true);
  };

  // ── Soumission de l'édition ───────────────────────────────────────────────
  const handleEditSubmit = async () => {
    if (!editForm.type) {
      Alert.alert('Erreur', 'Veuillez sélectionner un type de maintenance');
      return;
    }
    const isoDate = displayToISO(editForm.date);
    if (!isoDate) {
      Alert.alert('Erreur', 'Format de date invalide. Utilisez JJ/MM/AAAA');
      return;
    }

    setEditSubmitting(true);
    try {
      const joursData = horairesToJours(editHoraires, editForm.date);
      await api.updateMaintenance(Number(id_maintenance), {
        type: editForm.type,
        date_maintenance: isoDate,
        etat: editForm.etat || null,
        departement: editForm.departement || null,
        commentaire: editForm.commentaire || null,
        commentaire_interne: editForm.commentaire_interne || null,
        contact: editForm.contact || null,
        type_produit: editForm.type_produit || null,
        designation_produit_site: editForm.designation_produit_site || null,
        numero_commande: editForm.numero_commande || null,
        numero_ri: editForm.numero_ri || null,
        garantie: editForm.garantie ? 1 : 0,
        operateurs: editForm.operateurs.length > 0 ? editForm.operateurs.join('\n') : null,
        jours_intervention: joursData.length > 0 ? JSON.stringify(joursData) : null,
      });

      Alert.alert('Succès', 'Maintenance modifiée avec succès');
      setEditModalVisible(false);
      loadData();
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Impossible de modifier la maintenance');
    } finally {
      setEditSubmitting(false);
    }
  };

  // ── Opérateurs (formulaire édition) ──────────────────────────────────────
  const addOperateur = () => {
    const val = editForm.operateurInput.trim().toUpperCase();
    if (!val || editForm.operateurs.includes(val)) {
      setEditForm(f => ({ ...f, operateurInput: '' }));
      return;
    }
    setEditForm(f => ({ ...f, operateurs: [...f.operateurs, val], operateurInput: '' }));
  };

  const removeOperateur = (initiale: string) => {
    setEditForm(f => ({ ...f, operateurs: f.operateurs.filter(o => o !== initiale) }));
  };

  // ── Scan produit ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (scanned_product_id && maintenance) {
      const productId = Number(scanned_product_id);
      const isAssociated = produitsAssocies.some(p => p.id_produit === productId);
      if (isAssociated) {
        Alert.alert('Produit déjà associé', 'Ce produit est déjà associé à cette maintenance');
        router.setParams({ scanned_product_id: undefined });
        return;
      }
      const verifyAndAdd = async () => {
        try {
          const produit = await api.getProductById(productId);
          if (produit.id_site !== maintenance.id_site) {
            Alert.alert('Produit incompatible', `Ce produit appartient à un autre site.`);
          } else {
            openAddProductForm(productId, produit.nom);
          }
        } catch (err: any) {
          Alert.alert('Produit introuvable', err.message || "Ce produit n'existe pas");
        } finally {
          router.setParams({ scanned_product_id: undefined });
        }
      };
      verifyAndAdd();
    }
  }, [scanned_product_id, maintenance, produitsAssocies]);

  const onRefresh = async () => { setRefreshing(true); await loadData(); };

  const handleScanPress = () => {
    router.push({
      pathname: '/(tabs)/scanner',
      params: { id_maintenance: String(id_maintenance), return_to: 'maintenance' },
    });
  };

  // ── Modal produit — ouverture ─────────────────────────────────────────────
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
    if (status !== 'granted') { Alert.alert('Permission refusée'); return; }
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
    if (status !== 'granted') { Alert.alert('Permission refusée'); return; }
    if (photos.length >= 5) { Alert.alert('Limite atteinte', '5 photos maximum'); return; }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (!result.canceled && result.assets?.[0]) {
      setPhotos([...photos, result.assets[0].uri]);
    }
  };

  const removePhoto = (index: number) => setPhotos(photos.filter((_, i) => i !== index));

  const handleCancelProduit = () => {
    Alert.alert('Annuler', 'Annuler les modifications ?', [
      { text: 'Non', style: 'cancel' },
      {
        text: 'Oui', style: 'destructive',
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

  const handleSubmitProduit = async () => {
    if (!selectedProduitId) return;
    if (!formData.etat) { Alert.alert('Erreur', 'Veuillez sélectionner un état'); return; }
    try {
      if (isEditMode) {
        await api.updateProductMaintenance({
          id_maintenance: Number(id_maintenance),
          id_produit: selectedProduitId,
          ...formData,
        });
      } else {
        await api.addProductToMaintenance({
          id_maintenance: Number(id_maintenance),
          id_produit: selectedProduitId,
          ...formData,
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
        await fetch(`${Config.API_URL}/photos/multiple`, { method: 'POST', body: form, headers: { 'Content-Type': 'multipart/form-data' } });
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
    Alert.alert('Retirer le produit', `Retirer "${nom}" de cette maintenance ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Retirer', style: 'destructive',
        onPress: async () => {
          try {
            await api.removeProductFromMaintenance(id_maint, id_produit);
            Alert.alert('Succès', 'Produit retiré');
            loadData();
          } catch { Alert.alert('Erreur', 'Impossible de retirer le produit'); }
        },
      },
    ]);
  };

  // ── Rendu ─────────────────────────────────────────────────────────────────
  if (!maintenance) {
    return (
      <View style={GlobalStyles.container}>
        <Text style={{ color: Colors.textSecondary, textAlign: 'center', marginTop: 40 }}>Chargement...</Text>
      </View>
    );
  }

  const { color, icon } = getStatusConfig(maintenance.etat);
  const operateurs = parseOperateurs(maintenance.operateurs);
  const operateursDisplay = operateurs.length > 0 ? operateurs.join(' / ') : null;

  const infoRows = [
    { label: 'N° RI / Chrono :', value: maintenance.numero_ri || 'N/A' },
    { label: 'Désignation :', value: maintenance.designation_produit_site || 'N/A' },
    { label: "Type d'intervention :", value: maintenance.types_intervention || maintenance.type || 'N/A' },
    { label: 'Département :', value: maintenance.departement || 'N/A' },
    ...(maintenance.date_demande ? [{ label: 'Date demande :', value: formatDate(maintenance.date_demande) }] : []),
    ...(maintenance.date_accord_client ? [{ label: 'Date accord client :', value: formatDate(maintenance.date_accord_client) }] : []),
    { label: 'Date intervention :', value: formatDate(maintenance.date_maintenance) },
    ...(maintenance.client_nom || maintenance.site_nom ? [{ label: 'Client :', value: maintenance.client_nom || maintenance.site_nom || 'N/A' }] : []),
    { label: 'Contact :', value: maintenance.contact || 'N/A' },
    { label: 'Type panneau / produit :', value: maintenance.type_produit || 'N/A' },
    { label: 'N° Affaire / CDE :', value: maintenance.numero_commande || 'N/A' },
    { label: 'Personnes affectées :', value: operateursDisplay || 'N/A' },
    { label: 'État :', value: maintenance.etat || 'N/A', valueColor: color },
    { label: 'Garantie :', value: maintenance.garantie === 1 || maintenance.garantie === true ? '✅ Oui' : '❌ Non' },
    ...(maintenance.commentaire ? [{ label: 'Commentaire :', value: maintenance.commentaire }] : []),
    ...(maintenance.commentaire_interne ? [{ label: '🔒 Commentaire interne :', value: maintenance.commentaire_interne }] : []),
  ];

  return (
    <View style={GlobalStyles.container}>
      {/* ── HEADER ── */}
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

        {/* ── BOUTON MODIFIER MAINTENANCE ── */}
        <TouchableOpacity style={styles.editMaintenanceBtn} onPress={openEditModal}>
          <Text style={styles.editMaintenanceBtnText}>✏️ Modifier la maintenance</Text>
        </TouchableOpacity>

        {/* ── BOUTON SCANNER ── */}
        <TouchableOpacity style={styles.scanButton} onPress={handleScanPress}>
          <Text style={styles.scanButtonText}>📷 Scanner un produit</Text>
        </TouchableOpacity>

        {/* ── PRODUITS ASSOCIÉS ── */}
        <View style={{ marginBottom: 16 }}>
          <Text style={styles.sectionTitle}>✅ Produits associés ({produitsAssocies.length})</Text>
          {produitsAssocies.length === 0 ? (
            <EmptyState icon="📦" title="Aucun produit associé" subtitle="Scannez un QR code pour ajouter un produit" />
          ) : (
            produitsAssocies.map(produit => (
              <TouchableOpacity key={produit.id_produit} onPress={() => router.push(`../products/${produit.id_produit}`)} activeOpacity={0.7}>
                <Card title={produit.nom} badge={produit.etat || 'N/A'} badgeColor={getEtatColor(produit.etat)} borderLeftColor={getEtatColor(produit.etat)}>
                  {produit.departement && <Text style={CardStyles.cardText}>📂 {produit.departement}</Text>}
                  {produit.commentaire && <Text style={CardStyles.cardComment}>💬 {produit.commentaire}</Text>}
                  {produit.etat_constate && <Text style={CardStyles.cardText}>📋 État constaté: {produit.etat_constate}</Text>}
                  {produit.travaux_effectues && <Text style={CardStyles.cardText}>🔧 Travaux: {produit.travaux_effectues}</Text>}
                  <View style={styles.cardActions}>
                    <TouchableOpacity style={styles.editButton} onPress={(e: any) => { e.stopPropagation(); openEditProductForm(produit); }}>
                      <Text style={styles.editButtonText}>✏️ Modifier</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.deleteButton} onPress={(e: any) => { e.stopPropagation(); handleDeleteProduct(produit.id_produit, Number(id_maintenance), produit.nom); }}>
                      <Text style={styles.deleteButtonText}>🗑️ Retirer</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.tapHint}>Appuyez pour voir les détails →</Text>
                </Card>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* ── PRODUITS NON ASSOCIÉS ── */}
        <View style={{ marginBottom: 16 }}>
          <Text style={styles.sectionTitle}>⏳ Produits non associés ({produitsNonAssocies.length})</Text>
          {produitsNonAssocies.length === 0 ? (
            <EmptyState icon="✅" title="Tous les produits sont associés" subtitle="Tous les équipements du site ont été traités" />
          ) : (
            produitsNonAssocies.map(produit => (
              <TouchableOpacity key={produit.id_produit} onPress={() => openAddProductForm(produit.id_produit, produit.nom)} activeOpacity={0.7}>
                <Card title={produit.nom} borderLeftColor={Colors.gray}>
                  {produit.departement && <Text style={CardStyles.cardText}>📂 {produit.departement}</Text>}
                  {produit.description && <Text style={CardStyles.cardText}>📝 {produit.description}</Text>}
                  <Text style={styles.addHint}>Appuyez pour associer à cette maintenance</Text>
                </Card>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* ═══════════════════════════════════════════════════════════════════
          MODAL — MODIFIER LA MAINTENANCE
      ═══════════════════════════════════════════════════════════════════ */}
      <Modal visible={editModalVisible} animationType="slide" transparent onRequestClose={() => setEditModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

              {/* Titre */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>📝 Modifier la maintenance</Text>
              </View>

              {/* ── Type ── */}
              <Text style={styles.label}>🔧 Type *</Text>
              <TouchableOpacity
                style={styles.dropdownBtn}
                onPress={() => setShowTypeDropdown(!showTypeDropdown)}
              >
                <Text style={[styles.dropdownBtnText, !editForm.type && { color: Colors.textMuted }]}>
                  {editForm.type || '-- Sélectionner --'}
                </Text>
                <Text style={{ color: Colors.textSecondary }}>{showTypeDropdown ? '▲' : '▼'}</Text>
              </TouchableOpacity>
              {showTypeDropdown && (
                <View style={styles.dropdownList}>
                  {TYPES_MAINTENANCE.map(t => (
                    <TouchableOpacity
                      key={t}
                      style={[styles.dropdownItem, editForm.type === t && styles.dropdownItemActive]}
                      onPress={() => { setEditForm(f => ({ ...f, type: t })); setShowTypeDropdown(false); }}
                    >
                      <Text style={[styles.dropdownItemText, editForm.type === t && styles.dropdownItemTextActive]}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* ── Date ── */}
              <Text style={styles.label}>📅 Date *</Text>
              <TextInput
                style={styles.input}
                value={editForm.date}
                onChangeText={text => setEditForm(f => ({ ...f, date: formatDateInput(text) }))}
                placeholder="JJ/MM/AAAA"
                placeholderTextColor={Colors.textMuted}
                keyboardType="numeric"
                maxLength={10}
              />

              {/* ── État ── */}
              <Text style={styles.label}>📊 État</Text>
              <View style={styles.chipRow}>
                {ETATS_MAINTENANCE.map(e => {
                  const c = e === 'Terminée' ? Colors.success : e === 'En cours' ? Colors.warning : Colors.primary;
                  return (
                    <TouchableOpacity
                      key={e}
                      style={[styles.chip, editForm.etat === e && { backgroundColor: c, borderColor: c }]}
                      onPress={() => setEditForm(f => ({ ...f, etat: e }))}
                    >
                      <Text style={[styles.chipText, editForm.etat === e && { color: Colors.white }]}>
                        {e === 'Terminée' ? '✅' : e === 'En cours' ? '⚙️' : '📅'} {e}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* ── N° RI ── */}
              <Text style={styles.label}>📄 N° RI / Chrono</Text>
              <TextInput style={styles.input} value={editForm.numero_ri} onChangeText={t => setEditForm(f => ({ ...f, numero_ri: t }))} placeholder="Ex: RI251210" placeholderTextColor={Colors.textMuted} />

              {/* ── Département ── */}
              <Text style={styles.label}>🏷️ Département</Text>
              <TextInput style={styles.input} value={editForm.departement} onChangeText={t => setEditForm(f => ({ ...f, departement: t }))} placeholder="Ex: STEP, SDRT..." placeholderTextColor={Colors.textMuted} />

              {/* ── Contact ── */}
              <Text style={styles.label}>👤 Contact</Text>
              <TextInput style={styles.input} value={editForm.contact} onChangeText={t => setEditForm(f => ({ ...f, contact: t }))} placeholder="Contact sur site" placeholderTextColor={Colors.textMuted} />

              {/* ── Type produit ── */}
              <Text style={styles.label}>📦 Type panneau / produit</Text>
              <TextInput style={styles.input} value={editForm.type_produit} onChangeText={t => setEditForm(f => ({ ...f, type_produit: t }))} placeholder="Ex: TJT, PMV..." placeholderTextColor={Colors.textMuted} />

              {/* ── Désignation ── */}
              <Text style={styles.label}>🏷️ Désignation produit / site</Text>
              <TextInput style={styles.input} value={editForm.designation_produit_site} onChangeText={t => setEditForm(f => ({ ...f, designation_produit_site: t }))} placeholder="Désignation" placeholderTextColor={Colors.textMuted} />

              {/* ── N° commande ── */}
              <Text style={styles.label}>🔢 N° Affaire / CDE</Text>
              <TextInput style={styles.input} value={editForm.numero_commande} onChangeText={t => setEditForm(f => ({ ...f, numero_commande: t }))} placeholder="N° commande" placeholderTextColor={Colors.textMuted} />

              {/* ── Commentaire ── */}
              <Text style={styles.label}>💬 Commentaire</Text>
              <TextInput style={styles.textArea} value={editForm.commentaire} onChangeText={t => setEditForm(f => ({ ...f, commentaire: t }))} placeholder="Commentaire visible par le client" placeholderTextColor={Colors.textMuted} multiline numberOfLines={3} textAlignVertical="top" />

              {/* ── Commentaire interne ── */}
              <Text style={styles.label}>🔒 Commentaire interne</Text>
              <TextInput style={styles.textArea} value={editForm.commentaire_interne} onChangeText={t => setEditForm(f => ({ ...f, commentaire_interne: t }))} placeholder="Non visible par le client" placeholderTextColor={Colors.textMuted} multiline numberOfLines={3} textAlignVertical="top" />

              {/* ── Opérateurs ── */}
              <Text style={styles.label}>👷 Opérateurs (initiales)</Text>
              <View style={styles.operateurInputRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={editForm.operateurInput}
                  onChangeText={t => setEditForm(f => ({ ...f, operateurInput: t }))}
                  placeholder="Ex: JD"
                  placeholderTextColor={Colors.textMuted}
                  maxLength={3}
                  autoCapitalize="characters"
                  onSubmitEditing={addOperateur}
                  returnKeyType="done"
                />
                <TouchableOpacity style={styles.addTagButton} onPress={addOperateur}>
                  <Text style={styles.addTagButtonText}>＋</Text>
                </TouchableOpacity>
              </View>
              {editForm.operateurs.length > 0 && (
                <View style={styles.tagsRow}>
                  {editForm.operateurs.map(op => (
                    <TouchableOpacity key={op} style={styles.tag} onPress={() => removeOperateur(op)}>
                      <Text style={styles.tagText}>{op}</Text>
                      <Text style={styles.tagRemove}> ✕</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <Text style={styles.hint}>Tapez les initiales puis ＋. Appuyez sur un tag pour le retirer.</Text>

              {/* ── Horaires 7 jours ── */}
              <Text style={styles.label}>🕐 Horaires d'intervention</Text>
              <Text style={styles.horaireHint}>Matin ☀️ et Après-midi 🌤️ — laissez vide si non travaillé</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={true} style={styles.horaireScroll}>
                <View>
                  {/* En-tête jours */}
                  <View style={styles.horaireRow}>
                    <View style={styles.horaireLabelCell} />
                    {JOURS_LABELS.map(l => (
                      <View key={l} style={styles.horaireHeaderCell}>
                        <Text style={styles.horaireHeaderText}>{l}</Text>
                      </View>
                    ))}
                  </View>
                  {/* Matin Arrivée */}
                  <View style={styles.horaireRow}>
                    <View style={styles.horaireLabelCell}>
                      <Text style={styles.horairePeriode}>☀️ Mat.</Text>
                      <Text style={styles.horaireSlot}>Arr.</Text>
                    </View>
                    {JOURS.map(j => (
                      <View key={j} style={styles.horaireCell}>
                        <TextInput
                          style={styles.horaireInput}
                          value={editHoraires[j].matin_arr}
                          onChangeText={v => setEditHoraires(h => ({ ...h, [j]: { ...h[j], matin_arr: v } }))}
                          placeholder="--:--"
                          placeholderTextColor={Colors.textMuted}
                          keyboardType="numbers-and-punctuation"
                          maxLength={5}
                        />
                      </View>
                    ))}
                  </View>
                  {/* Matin Départ */}
                  <View style={styles.horaireRow}>
                    <View style={styles.horaireLabelCell}>
                      <Text style={styles.horairePeriode} />
                      <Text style={styles.horaireSlot}>Dép.</Text>
                    </View>
                    {JOURS.map(j => (
                      <View key={j} style={styles.horaireCell}>
                        <TextInput
                          style={styles.horaireInput}
                          value={editHoraires[j].matin_dep}
                          onChangeText={v => setEditHoraires(h => ({ ...h, [j]: { ...h[j], matin_dep: v } }))}
                          placeholder="--:--"
                          placeholderTextColor={Colors.textMuted}
                          keyboardType="numbers-and-punctuation"
                          maxLength={5}
                        />
                      </View>
                    ))}
                  </View>
                  {/* Séparateur */}
                  <View style={styles.horaireSeparator} />
                  {/* APM Arrivée */}
                  <View style={styles.horaireRow}>
                    <View style={styles.horaireLabelCell}>
                      <Text style={styles.horairePeriode}>🌤️ APM.</Text>
                      <Text style={styles.horaireSlot}>Arr.</Text>
                    </View>
                    {JOURS.map(j => (
                      <View key={j} style={styles.horaireCell}>
                        <TextInput
                          style={styles.horaireInput}
                          value={editHoraires[j].apm_arr}
                          onChangeText={v => setEditHoraires(h => ({ ...h, [j]: { ...h[j], apm_arr: v } }))}
                          placeholder="--:--"
                          placeholderTextColor={Colors.textMuted}
                          keyboardType="numbers-and-punctuation"
                          maxLength={5}
                        />
                      </View>
                    ))}
                  </View>
                  {/* APM Départ */}
                  <View style={styles.horaireRow}>
                    <View style={styles.horaireLabelCell}>
                      <Text style={styles.horairePeriode} />
                      <Text style={styles.horaireSlot}>Dép.</Text>
                    </View>
                    {JOURS.map(j => (
                      <View key={j} style={styles.horaireCell}>
                        <TextInput
                          style={styles.horaireInput}
                          value={editHoraires[j].apm_dep}
                          onChangeText={v => setEditHoraires(h => ({ ...h, [j]: { ...h[j], apm_dep: v } }))}
                          placeholder="--:--"
                          placeholderTextColor={Colors.textMuted}
                          keyboardType="numbers-and-punctuation"
                          maxLength={5}
                        />
                      </View>
                    ))}
                  </View>
                </View>
              </ScrollView>

              {/* ── Garantie ── */}
              <View style={styles.garantieRow}>
                <Text style={styles.garantieLabel}>{editForm.garantie ? '✅' : '❌'} Sous garantie</Text>
                <Switch
                  value={editForm.garantie}
                  onValueChange={v => setEditForm(f => ({ ...f, garantie: v }))}
                  trackColor={{ false: Colors.gray300, true: Colors.success }}
                  thumbColor={editForm.garantie ? Colors.black : Colors.textSecondary}
                />
              </View>

              {/* ── Boutons ── */}
              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setEditModalVisible(false)}>
                  <Text style={styles.modalBtnText}>✕ Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.submitButton, editSubmitting && { opacity: 0.6 }]}
                  onPress={handleEditSubmit}
                  disabled={editSubmitting}
                >
                  <Text style={styles.modalBtnText}>{editSubmitting ? '⏳ Enregistrement...' : '✓ Enregistrer'}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════════════
          MODAL — PRODUIT
      ═══════════════════════════════════════════════════════════════════ */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={handleCancelProduit}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{isEditMode ? 'Modifier le produit' : 'Associer un produit'}</Text>
                {selectedProduitName ? <Text style={styles.modalSubtitle}>{selectedProduitName}</Text> : null}
              </View>

              <Text style={styles.label}>État *</Text>
              <View style={styles.etatContainer}>
                {['OK', 'NOK', 'Passable', 'Non vérifié'].map(etat => (
                  <TouchableOpacity
                    key={etat}
                    style={[styles.etatButton, formData.etat === etat && styles.etatButtonActive]}
                    onPress={() => setFormData({ ...formData, etat })}
                  >
                    <Text style={[styles.etatButtonText, formData.etat === etat && styles.etatButtonTextActive]}>{etat}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Commentaire général</Text>
              <TextInput style={styles.textArea} placeholder="Commentaire sur l'état du produit" placeholderTextColor={Colors.textMuted} value={formData.commentaire} onChangeText={text => setFormData({ ...formData, commentaire: text })} multiline numberOfLines={3} />

              <Text style={styles.label}>État constaté</Text>
              <TextInput style={styles.textArea} placeholder="Décrivez l'état constaté" placeholderTextColor={Colors.textMuted} value={formData.etat_constate} onChangeText={text => setFormData({ ...formData, etat_constate: text })} multiline numberOfLines={4} />

              <Text style={styles.label}>Travaux effectués</Text>
              <TextInput style={styles.textArea} placeholder="Détaillez les travaux effectués" placeholderTextColor={Colors.textMuted} value={formData.travaux_effectues} onChangeText={text => setFormData({ ...formData, travaux_effectues: text })} multiline numberOfLines={4} />

              <Text style={styles.label}>RI interne</Text>
              <TextInput style={styles.input} placeholder="RI interne non visible par le client" placeholderTextColor={Colors.textMuted} value={formData.ri_interne} onChangeText={text => setFormData({ ...formData, ri_interne: text })} />

              {!isEditMode && (
                <>
                  <Text style={styles.label}>Photos ({photos.length}/5)</Text>
                  <View style={styles.photoButtonsContainer}>
                    <TouchableOpacity style={[styles.photoButton, styles.cameraButton]} onPress={takePhoto} disabled={photos.length >= 5}>
                      <Text style={styles.photoButtonText}>📷 Prendre une photo</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.photoButton, styles.galleryButton]} onPress={pickImages} disabled={photos.length >= 5}>
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
                <TouchableOpacity style={[styles.cancelButton]} onPress={handleCancelProduit}>
                  <Text style={styles.modalBtnText}>✕ Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.submitButton} onPress={handleSubmitProduit}>
                  <Text style={styles.modalBtnText}>{isEditMode ? '✓ Enregistrer' : '✓ Associer'}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // ── Bouton modifier maintenance ──────────────────────────────────────────
  editMaintenanceBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  editMaintenanceBtnText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  },

  // ── Scan ─────────────────────────────────────────────────────────────────
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
  scanButtonText: { color: Colors.white, fontSize: 18, fontWeight: '600' },

  // ── Sections ─────────────────────────────────────────────────────────────
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: 12,
  },
  tapHint: { marginTop: 8, fontSize: 12, color: Colors.primary, fontWeight: '500', fontStyle: 'italic' },
  addHint: { marginTop: 8, fontSize: 12, color: Colors.success, fontWeight: '600', fontStyle: 'italic' },

  // ── Card actions ──────────────────────────────────────────────────────────
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

  // ── Modal commun ──────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '92%',
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
    fontSize: 22,
    fontWeight: '700',
    color: Colors.primary,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },

  // ── Formulaire ────────────────────────────────────────────────────────────
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginTop: 14,
    marginBottom: 6,
  },
  input: {
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: Colors.text,
  },
  textArea: {
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: Colors.text,
    minHeight: 80,
    textAlignVertical: 'top',
  },

  // ── Dropdown type ─────────────────────────────────────────────────────────
  dropdownBtn: {
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownBtnText: { fontSize: 15, color: Colors.text },
  dropdownList: {
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    marginTop: 4,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dropdownItemActive: { backgroundColor: Colors.blueDim },
  dropdownItemText: { fontSize: 14, color: Colors.text },
  dropdownItemTextActive: { color: Colors.primary, fontWeight: '600' },

  // ── Chips état ────────────────────────────────────────────────────────────
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.surface2,
  },
  chipText: { fontSize: 13, fontWeight: '600', color: Colors.text },

  // ── Opérateurs ────────────────────────────────────────────────────────────
  operateurInputRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  addTagButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTagButtonText: { color: Colors.white, fontSize: 18, fontWeight: '700' },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  tagText: { color: Colors.white, fontWeight: '700', fontSize: 13, letterSpacing: 1 },
  tagRemove: { color: Colors.white, fontSize: 11, opacity: 0.8 },
  hint: { fontSize: 12, color: Colors.textMuted, marginTop: 5, fontStyle: 'italic' },

  // ── Garantie ─────────────────────────────────────────────────────────────
  garantieRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    padding: 12,
    backgroundColor: Colors.surface2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  garantieLabel: { fontSize: 15, fontWeight: '600', color: Colors.text },

  // ── Boutons modal ─────────────────────────────────────────────────────────
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 24, marginBottom: 8 },
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
  modalBtnText: { color: Colors.white, fontSize: 15, fontWeight: '700' },

  // ── Photos produit ────────────────────────────────────────────────────────
  etatContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  etatButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.surface2,
  },
  etatButtonActive: { borderColor: Colors.primary, backgroundColor: Colors.blueDim },
  etatButtonText: { fontSize: 13, fontWeight: '600', color: Colors.text },
  etatButtonTextActive: { color: Colors.primary },
  photoButtonsContainer: { flexDirection: 'row', gap: 8 },
  photoButton: { flex: 1, borderRadius: 8, padding: 12, alignItems: 'center' },
  cameraButton: { backgroundColor: Colors.primary },
  galleryButton: { backgroundColor: Colors.secondary },
  photoButtonText: { color: Colors.white, fontSize: 13, fontWeight: '600' },
  photosPreview: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  photoItem: { position: 'relative', width: 90, height: 90 },
  photoImage: { width: '100%', height: '100%', borderRadius: 8 },
  removePhotoButton: {
    position: 'absolute', top: -8, right: -8,
    backgroundColor: Colors.danger, borderRadius: 10,
    width: 22, height: 22, alignItems: 'center', justifyContent: 'center',
  },
  removePhotoText: { color: Colors.white, fontSize: 12, fontWeight: '700' },

  // ── Tableau horaires ──────────────────────────────────────────────────────
  horaireHint: {
    fontSize: 11,
    color: Colors.textMuted,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  horaireScroll: {
    marginTop: 4,
    marginBottom: 4,
  },
  horaireRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  horaireHeaderCell: {
    width: 52,
    alignItems: 'center',
    paddingVertical: 6,
    backgroundColor: Colors.primary,
    marginHorizontal: 1,
    borderRadius: 4,
  },
  horaireHeaderText: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  horaireLabelCell: {
    width: 58,
    paddingRight: 6,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  horairePeriode: {
    fontSize: 10,
    color: Colors.primary,
    fontWeight: '700',
  },
  horaireSlot: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  horaireCell: {
    width: 52,
    marginHorizontal: 1,
  },
  horaireInput: {
    backgroundColor: Colors.surface3,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 4,
    paddingVertical: 5,
    paddingHorizontal: 4,
    fontSize: 12,
    color: Colors.text,
    textAlign: 'center',
    fontFamily: 'monospace',
  },
  horaireSeparator: {
    height: 6,
  },
});