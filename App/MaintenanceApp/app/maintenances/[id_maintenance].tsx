import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Text,
  View
} from "react-native";

const ipServeur = "192.168.1.127";

export default function SiteDetails() {
  const { id_maintenance } = useLocalSearchParams();
  const router = useRouter();

  const [produit, setProduit] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadProduits = async () => {
    const res = await fetch(`http://${ipServeur}:3000/maintenances/ProductsByMaintenance/${id_maintenance}`);
    const data = await res.json();
    setProduit(data);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadProduits()]);
    setRefreshing(false);
  };

  useEffect(() => {
      loadProduits();
  });

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 22, fontWeight: "bold" }}>
        MAINTENANCE
      </Text>

      {!produit ? (
        <Text style={{ marginTop: 10 }}>Chargement...</Text>
      ) : (
        <>
          <Text>Produit : {produit.id_produit}</Text>
          
        </>
      )}

      <Text
        style={{ fontSize: 18, fontWeight: "bold", marginVertical: 15 }}
      >
        Maintenances
      </Text>
    </View>
  );
}
