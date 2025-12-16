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
  const [refreshing, setRefreshing] = useState(false);

  const loadSite = async () => {
    const res = await fetch(`http://${ipServeur}:3000/sites/${id_site}`);
    const data = await res.json();
    setSite(data);
  };

  const loadMaintenances = async () => {
    const res = await fetch(
      `http://${ipServeur}:3000/maintenances/${id_site}`
    );
    const data = await res.json();
    setMaintenances(data);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadSite(), loadMaintenances()]);
    setRefreshing(false);
  };

  useEffect(() => {
    if (id_site) {
      loadSite();
      loadMaintenances();
    }
  }, [id_site]);

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 22, fontWeight: "bold" }}>
        Détail du site
      </Text>

      {!site ? (
        <Text style={{ marginTop: 10 }}>Chargement...</Text>
      ) : (
        <>
          <Text>ID : {site.id_site}</Text>
          <Text>Nom : {site.nom}</Text>
          <Text>Client : {site.id_client}</Text>
          <Text>Département : {site.department}</Text>
          <Text>Localisation : {site.location}</Text>
        </>
      )}

      <Text
        style={{ fontSize: 18, fontWeight: "bold", marginVertical: 15 }}
      >
        Maintenances
      </Text>

      <FlatList
        data={maintenances}
        keyExtractor={(item) => item.id_maintenance.toString()}
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
                params: { id_site: item.id_maintenance.toString() },
              })
            }
          >
            <Text>Date : {item.date}</Text>
            <Text>Technicien : {item.technicien}</Text>
            <Text>Statut : {item.statut}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
