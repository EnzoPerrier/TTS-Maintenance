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
    const res = await fetch(`http://${ipServeur}:3000/produits/${id_site}`);
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
        Détail du site
      </Text>

      {!produit ? (
        <Text style={{ marginTop: 10 }}>Chargement...</Text>
      ) : (
        <>
          <Text>ID : {produit.id_produit}</Text>
          <Text>Nom : {produit.nom}</Text>
          <Text>Type : {produit.type}</Text>
          <Text>Etat : {produit.etat}</Text>
          <Text>Description : {produit.description}</Text>
          <Text>Date de création : {produit.date_creation}</Text>
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
