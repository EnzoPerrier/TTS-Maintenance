import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { Card } from '../../components/ui/Card';
import { SearchBar } from '../../components/ui/SearchBar';
import { CardStyles, GlobalStyles } from '../../constants/Styles';
import { useSites } from '../../hooks/useSites';

export default function SitesScreen() {
  const router = useRouter();
  const { sites, refreshing, refresh } = useSites();
  const [search, setSearch] = useState('');

  const filtered = sites.filter(s =>
    s.nom?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={GlobalStyles.container}>
      <View style={GlobalStyles.header}>
        <Text style={GlobalStyles.headerTitle}>🏢 Sites</Text>
        <Text style={GlobalStyles.headerSubtitle}>
          {sites.length} site(s) disponible(s)
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
          placeholder="Rechercher un site..."
        />

        {filtered.map(site => (
          <Card
            key={site.id_site}
            title={site.nom}
            badge={`ID: ${site.id_site}`}
            onPress={() => router.push(`/sites/${site.id_site}`)}
          >
            <Text style={CardStyles.cardText}>
              📍 {site.adresse || 'Adresse non spécifiée'}
            </Text>
            <Text style={CardStyles.cardText}>
              👤 Client: {site.id_client}
            </Text>
          </Card>
        ))}
      </ScrollView>
    </View>
  );
}