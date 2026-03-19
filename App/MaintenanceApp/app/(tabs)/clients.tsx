import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Card } from '../../components/ui/Card';
import { SearchBar } from '../../components/ui/SearchBar';
import { Colors } from '../../constants/Colors';
import { CardStyles, GlobalStyles } from '../../constants/Styles';
import { useClients } from '../../hooks/useClients';
import { api } from '../../utils/api';

export default function ClientsScreen() {
  const router = useRouter();
  const { clients, refreshing, refresh } = useClients();
  const [search, setSearch] = useState('');

  const filtered = clients.filter((c) =>
    c.nom?.toLowerCase().includes(search.toLowerCase()) ||
    c.contact?.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = (id_client: number, nom: string) => {
    Alert.alert(
      'Supprimer le client',
      `Voulez-vous vraiment supprimer "${nom}" ?\n\nImpossible si le client a des sites associés.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteClient(id_client);
              Alert.alert('Succès', 'Client supprimé avec succès');
              refresh();
            } catch (err: any) {
              Alert.alert('Impossible de supprimer', err.message || 'Ce client a peut-être des sites associés.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={GlobalStyles.container}>
      <View style={GlobalStyles.header}>
        <Text style={GlobalStyles.headerTitle}>👥 Clients</Text>
        <Text style={GlobalStyles.headerSubtitle}>{clients.length} client(s)</Text>
      </View>

      <ScrollView
        style={GlobalStyles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
        <SearchBar value={search} onChangeText={setSearch} placeholder="Rechercher un client..." />

        {filtered.map((c) => (
          <Card key={c.id_client} title={c.nom}>
            {c.contact && <Text style={CardStyles.cardText}>👤 {c.contact}</Text>}
            {c.telephone && <Text style={CardStyles.cardText}>📞 {c.telephone}</Text>}
            {c.email && <Text style={CardStyles.cardText}>📧 {c.email}</Text>}
            {c.adresse && <Text style={CardStyles.cardText}>📍 {c.adresse}</Text>}

            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.detailsBtn}
                onPress={() => router.push(`/clients/${c.id_client}`)}
              >
                <Text style={styles.btnText}>Détails →</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => handleDelete(c.id_client, c.nom)}
              >
                <Text style={styles.btnText}>🗑️ Supprimer</Text>
              </TouchableOpacity>
            </View>
          </Card>
        ))}

        {filtered.length === 0 && (
          <Text style={styles.emptyText}>Aucun client trouvé</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
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
  btnText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    color: Colors.gray600,
    fontStyle: 'italic',
    padding: 24,
    fontSize: 15,
  },
});