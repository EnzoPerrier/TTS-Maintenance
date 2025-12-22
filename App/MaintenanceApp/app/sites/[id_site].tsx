import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const ipServeur = "192.168.1.127";

export default function SiteDetails() {
  const { id_site } = useLocalSearchParams();
  const router = useRouter();

  const [site, setSite] = useState<any>(null);
  const [maintenances, setMaintenances] = useState<any[]>([]);
  const [produits, setProduits] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [equipementsExpanded, setEquipementsExpanded] = useState(true);
  const [maintenancesExpanded, setMaintenancesExpanded] = useState(true);

  const loadSite = async () => {
    const res = await fetch(`http://${ipServeur}:3000/sites/${id_site}`);
    const data = await res.json();
    setSite(data);
  };

  const loadMaintenances = async () => {
    const res = await fetch(`http://${ipServeur}:3000/maintenances/AllMaintenancesBySiteID/${id_site}`);
    const data = await res.json();
    setMaintenances(data);
  };

  const loadProduits = async () => {
    const res = await fetch(`http://${ipServeur}:3000/produits/ProduitsBySiteID/${id_site}`);
    const data = await res.json();
    setProduits(data);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadSite(), loadMaintenances(), loadProduits()]);
    setRefreshing(false);
  };

  useEffect(() => {
    if (id_site) {
      loadSite();
      loadMaintenances();
      loadProduits();
    }
  }, [id_site]);

  return (
    <View style={{ padding: 20 }}>

      <FlatList
        data={equipementsExpanded ? produits : []}
        keyExtractor={(item) => `produit-${item.id_produit}`}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListHeaderComponent={() => (
          <View>
            {!site ? (
              <Text style={{ marginTop: 10 }}>Chargement...</Text>
            ) : (
              <>
              <Text style={{ fontSize: 22, fontWeight: "bold" }}>Détail du site</Text>
                <Text>ID : {site.id_site}</Text>
                <Text>Nom : {site.nom}</Text>
                <Text>Client : {site.id_client}</Text>
                <Text>Département : {site.department}</Text>
                <Text>Localisation : {site.location}</Text>
              </>
            )}

            <TouchableOpacity
              onPress={() => setEquipementsExpanded(!equipementsExpanded)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginVertical: 15,
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: "bold" }}>
                Equipements ({produits.length})
              </Text>
              <Text style={{ fontSize: 18, fontWeight: "bold" }}>
                {equipementsExpanded ? "▼" : "▶"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={{
              padding: 16,
              borderWidth: 1,
              borderColor: "#ddd",
              borderRadius: 10,
              marginBottom: 12,
            }}
          >
            <Text>id produit: {item.id_produit}</Text>
            <Text>nom : {item.nom}</Text>
            <Text>etat : {item.etat}</Text>
          </TouchableOpacity>
        )}
        ListFooterComponent={() => (
          <View>
            <TouchableOpacity
              onPress={() => setMaintenancesExpanded(!maintenancesExpanded)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginVertical: 15,
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: "bold" }}>
                Maintenances ({maintenances.length})
              </Text>
              <Text style={{ fontSize: 18, fontWeight: "bold" }}>
                {maintenancesExpanded ? "▼" : "▶"}
              </Text>
            </TouchableOpacity>

            {maintenancesExpanded && maintenances.map((item) => (
              <TouchableOpacity
                key={item.id_maintenance}
                style={{
                  padding: 16,
                  borderWidth: 1,
                  borderColor: "#ddd",
                  borderRadius: 10,
                  marginBottom: 12,
                }}
              >
                <Text>Date : {item.date_maintenance}</Text>
                <Text>Type : {item.type}</Text>
                <Text>Commentaire : {item.commentaire}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      />
    </View>
  );
}