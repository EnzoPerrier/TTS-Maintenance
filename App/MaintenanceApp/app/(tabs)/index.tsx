import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, RefreshControl, Text, TextInput, TouchableOpacity, View } from "react-native";

const ipServeur = "192.168.1.127";

export default function Index() {
  const router = useRouter();
  const [search, setSearch] = useState("");

  // Récupération via API Node.js
  const [sites, setSites] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadSites = async () => {
    try {
      const res = await fetch(`http://${ipServeur}:3000/sites`);
      const data = await res.json();
      setSites(data);
    } catch (err) {
      console.error("Erreur fetch sites", err);
    }
  };

  useEffect(() => {
    loadSites();
  }, []);

  // Pull to refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await loadSites();
    setRefreshing(false);
  };

  const filtered = sites
    .filter((s) => s.nom) 
    .filter((s) => s.nom.toLowerCase().includes(search.toLowerCase()));

  return (
    <View style={{ flex: 1, padding: 16 }}>
      {/* Barre de recherche */}
      <TextInput
        placeholder="Rechercher un site..."
        placeholderTextColor="#888"
        value={search}
        onChangeText={setSearch}
        style={{
          borderWidth: 1,
          borderColor: "#ccc",
          padding: 10,
          borderRadius: 8,
          marginBottom: 16,
        }}
      />

      {/* Liste des sites AVEC pull-to-refresh */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id_site.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={{
              padding: 16,
              borderWidth: 1,
              borderColor: "#ddd",
              borderRadius: 10,
              marginBottom: 12,
            }}
            onPress={() =>
              router.push({
                pathname: "/sites/[id_site]",
                params: { id_site: item.id_site.toString() },
              })
            }
          >
            <Text style={{ fontSize: 18, fontWeight: "600" }}>{item.nom}</Text>
            <Text>Client : {item.id_client}</Text>
            <Text>Dernière maintenance : {item.lastMaintenance}</Text>
            <Text>Département : {item.departement}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
