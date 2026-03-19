import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Card } from '../../components/ui/Card';
import { SearchBar } from '../../components/ui/SearchBar';
import { Colors } from '../../constants/Colors';
import { CardStyles, GlobalStyles } from '../../constants/Styles';
import { useClients } from '../../hooks/useClients';
import { useSites } from '../../hooks/useSites';
import { api } from '../../utils/api';

export default function SitesScreen() {
  const router = useRouter();
  const { sites, refreshing, refresh } = useSites();
  const { clients } = useClients();
  const [search, setSearch] = useState('');

  const filtered = sites.filter(s =>
    s.nom?.toLowerCase().includes(search.toLowerCase())
  );

  const handleDeleteSite = (id_site: number, nom: string) => {
    Alert.alert(
      'Supprimer le site',
      `Voulez-vous vraiment supprimer "${nom}" ?\n\nCette action est irréversible.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteSite(id_site);
              Alert.alert('Succès', 'Site supprimé avec succès');
              refresh();
            } catch (err: any) {
              Alert.alert('Impossible de supprimer', err.message || 'Ce site a peut-être des équipements ou maintenances associés.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={GlobalStyles.container}>
      <View style={GlobalStyles.header}>
        <Text style={GlobalStyles.headerTitle}>🏢 Sites</Text>
        <Text style={GlobalStyles.headerSubtitle}>{sites.length} site(s) disponible(s)</Text>
      </View>

      <ScrollView
        style={GlobalStyles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
        <SearchBar value={search} onChangeText={setSearch} placeholder="Rechercher un site..." />

        {filtered.map(site => {
          const client = clients.find(c => c.id_client === site.id_client);
          return (
            <Card key={site.id_site} title={site.nom}>
              {client && <Text style={CardStyles.cardText}>👤 {client.nom}</Text>}
              <Text style={CardStyles.cardText}>📍 {site.adresse || 'Adresse non spécifiée'}</Text>

              <View style={styles.actions}>
                <TouchableOpacity style={styles.detailsBtn} onPress={() => router.push(`/sites/${site.id_site}`)}>
                  <Text style={styles.btnText}>Détails →</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteSite(site.id_site, site.nom)}>
                  <Text style={styles.btnText}>🗑️ Supprimer</Text>
                </TouchableOpacity>
              </View>
            </Card>
          );
        })}

        {filtered.length === 0 && <Text style={styles.emptyText}>Aucun site trouvé</Text>}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.gray200 },
  detailsBtn: { flex: 1, backgroundColor: Colors.primary, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  deleteBtn: { flex: 1, backgroundColor: Colors.danger, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  btnText: { color: Colors.white, fontSize: 13, fontWeight: '600' },
  emptyText: { textAlign: 'center', color: Colors.gray600, fontStyle: 'italic', padding: 24, fontSize: 15 },
});