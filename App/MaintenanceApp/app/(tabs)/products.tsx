import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { Card } from '../../components/ui/Card';
import { SearchBar } from '../../components/ui/SearchBar';
import { CardStyles, GlobalStyles } from '../../constants/Styles';
import { useProducts } from '../../hooks/useProducts';
import { getEtatColor } from '../../utils/helpers';

export default function ProductsScreen() {
  const router = useRouter();
  const { products, refreshing, refresh } = useProducts();
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

        {filtered.map(product => (
          <Card
            key={product.id_produit}
            title={product.nom}
            badge={product.etat || 'N/A'}
            badgeColor={getEtatColor(product.etat)}
            borderLeftColor={getEtatColor(product.etat)}
            onPress={() => router.push(`/products/${product.id_produit}`)}
          >
            {product.departement && (
              <Text style={CardStyles.cardText}>📂 {product.departement}</Text>
            )}
            {product.description && (
              <Text style={CardStyles.cardText} numberOfLines={2}>
                📝 {product.description}
              </Text>
            )}
          </Card>
        ))}
      </ScrollView>
    </View>
  );
}