import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { Card } from '../../components/ui/Card';
import { SearchBar } from '../../components/ui/SearchBar';
import { CardStyles, GlobalStyles } from '../../constants/Styles';
import { useClients } from '../../hooks/useClients';
import { useProducts } from '../../hooks/useProducts';
import { useSites } from '../../hooks/useSites';
import { getEtatColor } from '../../utils/helpers';

export default function ProductsScreen() {
  const router = useRouter();
  const { products, refreshing, refresh } = useProducts();
  const { sites } = useSites();
  const { clients } = useClients();
  const [search, setSearch] = useState('');

  const filtered = products.filter(p =>
    p.nom?.toLowerCase().includes(search.toLowerCase()) ||
    p.departement?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={GlobalStyles.container}>
      <View style={GlobalStyles.header}>
        <Text style={GlobalStyles.headerTitle}>📦 Produits</Text>
        <Text style={GlobalStyles.headerSubtitle}>
          {products.length} produit(s) disponible(s)
        </Text>
      </View>

      <ScrollView
        style={GlobalStyles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} />
        }
      >
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Rechercher un produit..."
        />

        {filtered.map(product => {
          const site = sites.find(s => s.id_site === product.id_site);
          const client = site ? clients.find(c => c.id_client === site.id_client) : null;

          return (
            <Card
              key={product.id_produit}
              title={product.nom}
              badge={product.etat || 'N/A'}
              badgeColor={getEtatColor(product.etat)}
              borderLeftColor={getEtatColor(product.etat)}
              onPress={() => router.push(`/products/${product.id_produit}`)}
            >
              {client && (
                <Text style={CardStyles.cardText}>👤 {client.nom}</Text>
              )}
              {site && (
                <Text style={CardStyles.cardText}>🏢 {site.nom}</Text>
              )}
              {product.departement && (
                <Text style={CardStyles.cardText}>📂 {product.departement}</Text>
              )}
              {product.description && (
                <Text style={CardStyles.cardText} numberOfLines={2}>
                  📝 {product.description}
                </Text>
              )}
            </Card>
          );
        })}
      </ScrollView>
    </View>
  );
}