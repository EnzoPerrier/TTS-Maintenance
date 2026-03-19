import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Card } from '../../components/ui/Card';
import { SearchBar } from '../../components/ui/SearchBar';
import { Colors } from '../../constants/Colors';
import { CardStyles, GlobalStyles } from '../../constants/Styles';
import { useProducts } from '../../hooks/useProducts';
import { api } from '../../utils/api';
import { getEtatColor } from '../../utils/helpers';

export default function ProductsScreen() {
  const router = useRouter();
  const { products, refreshing, refresh } = useProducts();
  const [search, setSearch] = useState('');

  const filtered = products.filter(p =>
    p.nom?.toLowerCase().includes(search.toLowerCase()) ||
    p.departement?.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = (id_produit: number, nom: string) => {
    Alert.alert(
      'Supprimer le produit',
      `Voulez-vous vraiment supprimer "${nom}" ?\n\nCette action est irréversible.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteProduct(id_produit);
              Alert.alert('Succès', 'Produit supprimé avec succès');
              refresh();
            } catch (err: any) {
              Alert.alert('Erreur', err.message || 'Impossible de supprimer ce produit.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={GlobalStyles.container}>
      <View style={GlobalStyles.header}>
        <Text style={GlobalStyles.headerTitle}>📦 Produits</Text>
        <Text style={GlobalStyles.headerSubtitle}>{products.length} produit(s)</Text>
      </View>

      <ScrollView
        style={GlobalStyles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
        <SearchBar value={search} onChangeText={setSearch} placeholder="Rechercher un produit..." />

        {filtered.map(p => (
          <Card key={p.id_produit} title={p.nom} borderLeftColor={getEtatColor(p.etat)}>
            <Text style={CardStyles.cardText}>
              État : <Text style={{ color: getEtatColor(p.etat), fontWeight: '600' }}>{p.etat || 'N/A'}</Text>
            </Text>
            {p.departement && <Text style={CardStyles.cardText}>📂 {p.departement}</Text>}
            {p.description && <Text style={CardStyles.cardText}>📝 {p.description}</Text>}

            <View style={styles.actions}>
              <TouchableOpacity style={styles.detailsBtn} onPress={() => router.push(`/products/${p.id_produit}`)}>
                <Text style={styles.btnText}>Détails →</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(p.id_produit, p.nom)}>
                <Text style={styles.btnText}>🗑️ Supprimer</Text>
              </TouchableOpacity>
            </View>
          </Card>
        ))}

        {filtered.length === 0 && <Text style={styles.emptyText}>Aucun produit trouvé</Text>}
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