import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { GlobalStyles } from '../../constants/Styles';
import { useClients } from '../../hooks/useClients';
import { useSites } from '../../hooks/useSites';
import { api } from '../../utils/api';

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

export default function AddMaintenanceScreen() {
  const router = useRouter();
  const { sites } = useSites();
  const { clients } = useClients();

  // Champs du formulaire
  const [idSite, setIdSite] = useState<number | null>(null);
  const [dateMaintenance, setDateMaintenance] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [type, setType] = useState('');
  const [etat, setEtat] = useState('Planifiée');
  const [departement, setDepartement] = useState('');
  const [commentaire, setCommentaire] = useState('');
  const [commentaireInterne, setCommentaireInterne] = useState('');
  const [contact, setContact] = useState('');
  const [typeProduit, setTypeProduit] = useState('');
  const [designationProduitSite, setDesignationProduitSite] = useState('');
  const [numeroCommande, setNumeroCommande] = useState('');
  const [numeroRi, setNumeroRi] = useState('');
  const [garantie, setGarantie] = useState(false);

  // Opérateurs — liste de tags, envoyés comme string "JD, ML, AB"
  const [operateurs, setOperateurs] = useState<string[]>([]);
  const [operateurInput, setOperateurInput] = useState('');

  // Horaires
  const [heureArriveeMatin, setHeureArriveeMatin] = useState('');
  const [heureDepartMatin, setHeureDepartMatin] = useState('');
  const [heureArriveeAprem, setHeureArriveeAprem] = useState('');
  const [heureDepartAprem, setHeureDepartAprem] = useState('');

  // UI
  const [showSiteDropdown, setShowSiteDropdown] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const selectedSite = sites.find(s => s.id_site === idSite);
  const selectedClient = selectedSite
    ? clients.find(c => c.id_client === selectedSite.id_client)
    : null;

  const addOperateur = () => {
    const val = operateurInput.trim().toUpperCase();
    if (!val || operateurs.includes(val)) {
      setOperateurInput('');
      return;
    }
    setOperateurs([...operateurs, val]);
    setOperateurInput('');
  };

  const removeOperateur = (initiale: string) => {
    setOperateurs(operateurs.filter(o => o !== initiale));
  };

  const handleSubmit = async () => {
    if (!idSite) {
      Alert.alert('Erreur', 'Veuillez sélectionner un site');
      return;
    }
    if (!type) {
      Alert.alert('Erreur', 'Veuillez sélectionner un type de maintenance');
      return;
    }

    setSubmitting(true);
    try {
      const result = await api.createMaintenance({
        id_site: idSite,
        date_maintenance: dateMaintenance.toISOString().split('T')[0],
        type,
        etat,
        commentaire: commentaire || null,
        operateurs: operateurs.length > 0 ? operateurs.join(', ') : null,
        heure_arrivee_matin: heureArriveeMatin || null,
        heure_depart_matin: heureDepartMatin || null,
        heure_arrivee_aprem: heureArriveeAprem || null,
        heure_depart_aprem: heureDepartAprem || null,
        garantie: garantie ? 1 : 0,
        commentaire_interne: commentaireInterne || null,
        contact: contact || null,
        type_produit: typeProduit || null,
        designation_produit_site: designationProduitSite || null,
        numero_commande: numeroCommande || null,
        numero_ri: numeroRi || null,
        departement: departement || null,
      });

      Alert.alert('Succès', 'Maintenance créée avec succès', [
        {
          text: 'Voir la maintenance',
          onPress: () => router.replace(`/maintenance/${result.id_maintenance}`),
        },
        { text: 'Retour', onPress: () => router.back() },
      ]);
    } catch (err) {
      Alert.alert('Erreur', 'Impossible de créer la maintenance');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (date: Date) =>
    date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <View style={GlobalStyles.container}>
      <View style={GlobalStyles.header}>
        <TouchableOpacity onPress={() => router.back()} style={GlobalStyles.backButton}>
          <Text style={GlobalStyles.backButtonText}>← Retour</Text>
        </TouchableOpacity>
        <Text style={GlobalStyles.headerTitle}>➕ Nouvelle maintenance</Text>
        <Text style={GlobalStyles.headerSubtitle}>Remplissez les informations ci-dessous</Text>
      </View>

      <ScrollView style={GlobalStyles.scrollView} keyboardShouldPersistTaps="handled">

        {/* ── SECTION 1 : INFORMATIONS GÉNÉRALES ── */}
        <SectionHeader icon="ℹ️" title="Informations générales" />

        {/* Site */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>🏢 Site *</Text>
          <TouchableOpacity
            style={styles.dropdownButton}
            onPress={() => { setShowSiteDropdown(!showSiteDropdown); setShowTypeDropdown(false); }}
          >
            <Text style={[styles.dropdownButtonText, !selectedSite && styles.placeholder]}>
              {selectedSite
                ? `${selectedSite.nom}${selectedClient ? ` — ${selectedClient.nom}` : ''}`
                : '-- Sélectionner un site --'}
            </Text>
            <Text style={styles.dropdownArrow}>{showSiteDropdown ? '▲' : '▼'}</Text>
          </TouchableOpacity>
          {showSiteDropdown && (
            <View style={styles.dropdownList}>
              {sites.map(site => {
                const client = clients.find(c => c.id_client === site.id_client);
                return (
                  <TouchableOpacity
                    key={site.id_site}
                    style={[styles.dropdownItem, idSite === site.id_site && styles.dropdownItemActive]}
                    onPress={() => { setIdSite(site.id_site); setShowSiteDropdown(false); }}
                  >
                    <Text style={[styles.dropdownItemText, idSite === site.id_site && styles.dropdownItemTextActive]}>
                      {site.nom}
                    </Text>
                    {client && (
                      <Text style={styles.dropdownItemSub}>{client.nom}</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Date */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>📅 Date *</Text>
          <TouchableOpacity style={styles.dropdownButton} onPress={() => setShowDatePicker(true)}>
            <Text style={styles.dropdownButtonText}>{formatDate(dateMaintenance)}</Text>
            <Text style={styles.dropdownArrow}>📅</Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={dateMaintenance}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, d) => { setShowDatePicker(false); if (d) setDateMaintenance(d); }}
            />
          )}
        </View>

        {/* Type */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>🔧 Type de maintenance *</Text>
          <TouchableOpacity
            style={styles.dropdownButton}
            onPress={() => { setShowTypeDropdown(!showTypeDropdown); setShowSiteDropdown(false); }}
          >
            <Text style={[styles.dropdownButtonText, !type && styles.placeholder]}>
              {type || '-- Sélectionner --'}
            </Text>
            <Text style={styles.dropdownArrow}>{showTypeDropdown ? '▲' : '▼'}</Text>
          </TouchableOpacity>
          {showTypeDropdown && (
            <View style={styles.dropdownList}>
              {TYPES_MAINTENANCE.map(t => (
                <TouchableOpacity
                  key={t}
                  style={[styles.dropdownItem, type === t && styles.dropdownItemActive]}
                  onPress={() => { setType(t); setShowTypeDropdown(false); }}
                >
                  <Text style={[styles.dropdownItemText, type === t && styles.dropdownItemTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* État */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>📊 État</Text>
          <View style={styles.chipRow}>
            {ETATS_MAINTENANCE.map(e => {
              const isActive = etat === e;
              const color = e === 'Terminée' ? Colors.success : e === 'En cours' ? Colors.warning : Colors.primary;
              return (
                <TouchableOpacity
                  key={e}
                  style={[styles.chip, isActive && { backgroundColor: color, borderColor: color }]}
                  onPress={() => setEtat(e)}
                >
                  <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                    {e === 'Terminée' ? '✅' : e === 'En cours' ? '⚙️' : '📅'} {e}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Département */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>🏷️ Département</Text>
          <TextInput style={styles.input} value={departement} onChangeText={setDepartement}
            placeholder="Ex: STEP, SDRT..." placeholderTextColor={Colors.gray600} />
        </View>

        {/* Numéro RI */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>📄 Numéro de RI</Text>
          <TextInput style={styles.input} value={numeroRi} onChangeText={setNumeroRi}
            placeholder="Ex: RI251210" placeholderTextColor={Colors.gray600} />
        </View>

        {/* Numéro de commande */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>🔢 N° de commande / affaire</Text>
          <TextInput style={styles.input} value={numeroCommande} onChangeText={setNumeroCommande}
            placeholder="N° Commande" placeholderTextColor={Colors.gray600} />
        </View>

        {/* Contact */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>👤 Contact</Text>
          <TextInput style={styles.input} value={contact} onChangeText={setContact}
            placeholder="Contact sur site" placeholderTextColor={Colors.gray600} />
        </View>

        {/* Type de produit */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>📦 Type de produit</Text>
          <TextInput style={styles.input} value={typeProduit} onChangeText={setTypeProduit}
            placeholder="Ex: TJT, PMV..." placeholderTextColor={Colors.gray600} />
        </View>

        {/* Désignation produit site */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>🏷️ Désignation produit / site</Text>
          <TextInput style={styles.input} value={designationProduitSite} onChangeText={setDesignationProduitSite}
            placeholder="Désignation spécifique" placeholderTextColor={Colors.gray600} />
        </View>

        {/* Commentaire */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>💬 Commentaire</Text>
          <TextInput style={styles.textArea} value={commentaire} onChangeText={setCommentaire}
            placeholder="Commentaire visible par le client..." placeholderTextColor={Colors.gray600}
            multiline numberOfLines={3} textAlignVertical="top" />
        </View>

        {/* Commentaire interne */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>🔒 Commentaire interne</Text>
          <TextInput style={styles.textArea} value={commentaireInterne} onChangeText={setCommentaireInterne}
            placeholder="Non visible par le client..." placeholderTextColor={Colors.gray600}
            multiline numberOfLines={3} textAlignVertical="top" />
        </View>

        {/* ── SECTION 2 : OPÉRATEURS ── */}
        <SectionHeader icon="👷" title="Opérateurs (initiales)" />

        <View style={styles.fieldGroup}>
          <View style={styles.operateurInputRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={operateurInput}
              onChangeText={setOperateurInput}
              placeholder="Ex: JD"
              placeholderTextColor={Colors.gray600}
              maxLength={3}
              autoCapitalize="characters"
              onSubmitEditing={addOperateur}
              returnKeyType="done"
            />
            <TouchableOpacity style={styles.addTagButton} onPress={addOperateur}>
              <Text style={styles.addTagButtonText}>＋</Text>
            </TouchableOpacity>
          </View>

          {operateurs.length > 0 && (
            <View style={styles.tagsRow}>
              {operateurs.map(op => (
                <TouchableOpacity key={op} style={styles.tag} onPress={() => removeOperateur(op)}>
                  <Text style={styles.tagText}>{op}</Text>
                  <Text style={styles.tagRemove}> ✕</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          <Text style={styles.hint}>
            Tapez les initiales puis ＋ ou Entrée. Appuyez sur un tag pour le retirer.
          </Text>
        </View>

        {/* ── SECTION 3 : HORAIRES ── */}
        <SectionHeader icon="🕐" title="Horaires d'intervention" />

        <View style={styles.horairesGrid}>
          <HoraireBlock title="☀️ Matin"
            arrivee={heureArriveeMatin} depart={heureDepartMatin}
            onArriveeChange={setHeureArriveeMatin} onDepartChange={setHeureDepartMatin} />
          <HoraireBlock title="🌙 Après-midi"
            arrivee={heureArriveeAprem} depart={heureDepartAprem}
            onArriveeChange={setHeureArriveeAprem} onDepartChange={setHeureDepartAprem} />
        </View>

        {/* ── SECTION 4 : GARANTIE ── */}
        <SectionHeader icon="✅" title="Garantie" />

        <View style={styles.garantieRow}>
          <Text style={styles.garantieLabel}>{garantie ? '✅' : '☐'} Sous garantie</Text>
          <Switch value={garantie} onValueChange={setGarantie}
            trackColor={{ false: Colors.gray300, true: Colors.success }}
            thumbColor={garantie ? Colors.white : Colors.gray600} />
        </View>

        {/* ── BOUTONS ── */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={[styles.btn, styles.btnCancel]} onPress={() => router.back()}>
            <Text style={styles.btnText}>✕ Annuler</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, styles.btnSubmit, submitting && styles.btnDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            <Text style={styles.btnText}>
              {submitting ? '⏳ Création...' : '✓ Créer la maintenance'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ─── Sous-composants ──────────────────────────────────────────────────────────

function SectionHeader({ icon, title }: { icon: string; title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionIcon}>{icon}</Text>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

function HoraireBlock({ title, arrivee, depart, onArriveeChange, onDepartChange }: {
  title: string; arrivee: string; depart: string;
  onArriveeChange: (v: string) => void; onDepartChange: (v: string) => void;
}) {
  return (
    <View style={styles.horaireBlock}>
      <Text style={styles.horaireTitle}>{title}</Text>
      <View style={styles.horaireFields}>
        <View style={{ flex: 1 }}>
          <Text style={styles.labelSmall}>Arrivée</Text>
          <TextInput style={styles.input} value={arrivee} onChangeText={onArriveeChange}
            placeholder="08:00" placeholderTextColor={Colors.gray600} keyboardType="numbers-and-punctuation" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.labelSmall}>Départ</Text>
          <TextInput style={styles.input} value={depart} onChangeText={onDepartChange}
            placeholder="12:00" placeholderTextColor={Colors.gray600} keyboardType="numbers-and-punctuation" />
        </View>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.primary + '15', borderLeftWidth: 4, borderLeftColor: Colors.primary,
    paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8,
    marginHorizontal: 16, marginTop: 20, marginBottom: 4,
  },
  sectionIcon: { fontSize: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.primary },
  fieldGroup: { marginHorizontal: 16, marginTop: 14 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 6 },
  labelSmall: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 4 },
  input: {
    borderWidth: 1, borderColor: Colors.gray300, borderRadius: 10,
    padding: 12, fontSize: 15, color: Colors.text,
    backgroundColor: Colors.background || Colors.white,
  },
  textArea: {
    borderWidth: 1, borderColor: Colors.gray300, borderRadius: 10,
    padding: 12, fontSize: 15, color: Colors.text,
    backgroundColor: Colors.background || Colors.white,
    minHeight: 80, textAlignVertical: 'top',
  },
  dropdownButton: {
    borderWidth: 1, borderColor: Colors.gray300, borderRadius: 10, padding: 12,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Colors.background || Colors.white,
  },
  dropdownButtonText: { fontSize: 15, color: Colors.text, flex: 1 },
  placeholder: { color: Colors.gray600 },
  dropdownArrow: { fontSize: 12, color: Colors.gray600, marginLeft: 8 },
  dropdownList: {
    borderWidth: 1, borderColor: Colors.gray300, borderRadius: 10, marginTop: 4,
    backgroundColor: Colors.white,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 8, elevation: 4, zIndex: 100,
  },
  dropdownItem: {
    paddingVertical: 12, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: Colors.gray50 + '40',
  },
  dropdownItemActive: { backgroundColor: Colors.primary + '15' },
  dropdownItemText: { fontSize: 15, color: Colors.text },
  dropdownItemTextActive: { color: Colors.primary, fontWeight: '600' },
  dropdownItemSub: { fontSize: 12, color: Colors.gray600, marginTop: 2 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20,
    borderWidth: 2, borderColor: Colors.gray300, backgroundColor: Colors.white,
  },
  chipText: { fontSize: 13, fontWeight: '600', color: Colors.text },
  chipTextActive: { color: Colors.white },
  operateurInputRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  addTagButton: {
    backgroundColor: Colors.primary, borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center', justifyContent: 'center',
  },
  addTagButtonText: { color: Colors.white, fontSize: 20, fontWeight: '700' },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  tag: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.primary, borderRadius: 20,
    paddingVertical: 6, paddingHorizontal: 14,
  },
  tagText: { color: Colors.white, fontWeight: '700', fontSize: 14, letterSpacing: 1 },
  tagRemove: { color: Colors.white, fontSize: 12, opacity: 0.8 },
  hint: { fontSize: 12, color: Colors.gray600, marginTop: 6, fontStyle: 'italic' },
  horairesGrid: { flexDirection: 'row', gap: 10, marginHorizontal: 16, marginTop: 14 },
  horaireBlock: {
    flex: 1, backgroundColor: Colors.gray50 + '80', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: Colors.gray300,
  },
  horaireTitle: { fontSize: 14, fontWeight: '700', color: Colors.primary, marginBottom: 8, textAlign: 'center' },
  horaireFields: { flexDirection: 'row', gap: 8 },
  garantieRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: 16, marginTop: 14, padding: 14,
    backgroundColor: Colors.white, borderRadius: 10, borderWidth: 1, borderColor: Colors.gray300,
  },
  garantieLabel: { fontSize: 15, fontWeight: '600', color: Colors.text },
  actionButtons: { flexDirection: 'row', gap: 12, marginHorizontal: 16, marginTop: 28 },
  btn: {
    flex: 1, paddingVertical: 15, borderRadius: 12, alignItems: 'center',
    shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 3,
  },
  btnCancel: { backgroundColor: Colors.danger, shadowColor: Colors.danger },
  btnSubmit: { backgroundColor: Colors.success, shadowColor: Colors.success },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: Colors.white, fontSize: 15, fontWeight: '700' },
});