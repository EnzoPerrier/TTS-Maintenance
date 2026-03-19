import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Linking,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Card } from '../../components/ui/Card';
import { InfoCard } from '../../components/ui/InfoCard';
import { StatCard } from '../../components/ui/StatCard';
import { Colors } from '../../constants/Colors';
import { CardStyles, GlobalStyles } from '../../constants/Styles';
import { Client, Site } from '../../types';
import { api } from '../../utils/api';

export default function ClientDetailsScreen() {
  const { id_client } = useLocalSearchParams();
  const router = useRouter();

  const [client, setClient] = useState<Client | null>(null);
  const [sites, setSites] = useState<Site[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [clientData, allSites] = await Promise.all([
        api.getClientById(Number(id_client)),
        api.getSites(),
      ]);
      setClient(clientData);
      setSites(allSites.filter((s) => s.id_client === Number(id_client)));
    } catch (err) {
      Alert.alert('Erreur', 'Impossible de charger les données');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id_client]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
  };

  const handleCall = (tel: string) => {
    Linking.openURL(`tel:${tel}`);
  };

  const handleEmail = (email: string) => {
    Linking.openURL(`mailto:${email}`);
  };

  const handleDeleteSite = (id_site: number, nom: string) => {
    Alert.alert(
      'Supprimer le site',
      `Voulez-vous vraiment supprimer "${nom}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteSite(id_site);
              Alert.alert('Succès', 'Site supprimé avec succès');
              loadData();
            } catch (err: any) {
              Alert.alert('Impossible de supprimer', err.message || 'Ce site a peut-être des équipements ou maintenances associés.');
            }
          },
        },
      ]
    );
  };

  if (!client) {
    return (
      <View style={GlobalStyles.container}>
        <Text style={styles.loading}>Chargement...</Text>
      </View>
    );
  }

  return (
    <View style={GlobalStyles.container}>
      {/* Header */}
      <View style={GlobalStyles.header}>
        <TouchableOpacity onPress={() => router.back()} style={GlobalStyles.backButton}>
          <Text style={GlobalStyles.backButtonText}>← Retour</Text>
        </TouchableOpacity>
        <Text style={GlobalStyles.headerTitle}>👤 {client.nom}</Text>
        <Text style={GlobalStyles.headerSubtitle}>Détails du client</Text>
      </View>

      <ScrollView
        style={GlobalStyles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* ── INFOS CLIENT ──────────────────────────────────────────────── */}
        <InfoCard
          title="Informations"
          icon="📋"
          rows={[
            { label: 'Nom :', value: client.nom },
            { label: 'Contact :', value: client.contact || 'N/A' },
            { label: 'Adresse :', value: client.adresse || 'N/A' },
            { label: 'Email :', value: client.email || 'N/A' },
            { label: 'Téléphone :', value: client.telephone || 'N/A' },
            { label: 'Date de création :', value: client.date_creation || 'N/A' },
          ]}
        />

        {/* ── BOUTONS CONTACT RAPIDE ────────────────────────────────────── */}
        {(client.telephone || client.email) && (
          <View style={styles.contactRow}>
            {client.telephone && (
              <TouchableOpacity
                style={styles.contactBtn}
                onPress={() => handleCall(client.telephone!)}
              >
                <Text style={styles.contactBtnIcon}>📞</Text>
                <Text style={styles.contactBtnText}>Appeler</Text>
              </TouchableOpacity>
            )}
            {client.email && (
              <TouchableOpacity
                style={[styles.contactBtn, styles.contactBtnEmail]}
                onPress={() => handleEmail(client.email!)}
              >
                <Text style={styles.contactBtnIcon}>📧</Text>
                <Text style={styles.contactBtnText}>Email</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ── STATISTIQUES ──────────────────────────────────────────────── */}
        <View style={styles.statsRow}>
          <StatCard number={sites.length} label="Sites" />
        </View>

        {/* ── SITES ASSOCIÉS ────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏢 Sites associés ({sites.length})</Text>

          {sites.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>🏢</Text>
              <Text style={styles.emptyText}>Aucun site associé à ce client</Text>
            </View>
          ) : (
            sites.map((site) => (
              <TouchableOpacity
                key={site.id_site}
                onPress={() => router.push(`/sites/${site.id_site}`)}
                activeOpacity={0.7}
              >
                <Card title={site.nom}>
                  <Text style={CardStyles.cardText}>
                    📍 {site.adresse || 'Adresse non spécifiée'}
                  </Text>
                  {site.gps_lat && site.gps_lng && (
                    <Text style={CardStyles.cardText}>
                      🗺️ {site.gps_lat}, {site.gps_lng}
                    </Text>
                  )}

                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      style={styles.detailsBtn}
                      onPress={() => router.push(`/sites/${site.id_site}`)}
                    >
                      <Text style={styles.actionBtnText}>Détails →</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleDeleteSite(site.id_site, site.nom);
                      }}
                    >
                      <Text style={styles.actionBtnText}>🗑️ Supprimer</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.tapHint}>Appuyez pour voir les détails →</Text>
                </Card>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    textAlign: 'center',
    marginTop: 40,
    color: Colors.gray600,
    fontSize: 16,
  },

  // ── Contact rapide ────────────────────────────────────────────────────────
  contactRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  contactBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  contactBtnEmail: {
    backgroundColor: Colors.secondary,
    shadowColor: Colors.secondary,
  },
  contactBtnIcon: {
    fontSize: 18,
  },
  contactBtnText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '700',
  },

  // ── Stats ─────────────────────────────────────────────────────────────────
  statsRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },

  // ── Section sites ─────────────────────────────────────────────────────────
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 12,
  },

  // ── Empty state ───────────────────────────────────────────────────────────
  emptyBox: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.gray200,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  emptyText: {
    color: Colors.gray600,
    fontSize: 14,
    fontStyle: 'italic',
  },

  // ── Card actions ──────────────────────────────────────────────────────────
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.gray200,
  },
  detailsBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteBtn: {
    flex: 1,
    backgroundColor: Colors.danger,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionBtnText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '600',
  },
  tapHint: {
    marginTop: 6,
    fontSize: 11,
    color: Colors.primary,
    fontStyle: 'italic',
  },
});