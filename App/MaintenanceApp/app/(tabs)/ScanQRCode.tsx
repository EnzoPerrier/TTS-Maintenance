import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

export default function QrcodeScan() {
  const [scanned, setScanned] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const router = useRouter();

  // Si les permissions ne sont pas encore chargées
  if (!permission) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Chargement...</Text>
      </View>
    );
  }

  // Si les permissions ne sont pas accordées
  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>
          {permission.canAskAgain
            ? "Accès caméra requis pour scanner les QR codes"
            : "Accès caméra refusé"}
        </Text>
        {permission.canAskAgain && (
          <Text
            style={styles.link}
            onPress={requestPermission}
          >
            Autoriser l'accès
          </Text>
        )}
      </View>
    );
  }

  // Fonction appelée quand un QR/code-barres est scanné
  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (scanned) return; // Évite les scans multiples
    
    setScanned(true);

    try {
      // Le QR code contient un JSON avec l'ID (ex: '{"id_qr": 42}')
 

      let productId: number | null = null;

      const parsed = JSON.parse(data);
      productId = parsed.id_qr;
      
      if (productId) {
        // Redirection vers la page du produit
        router.push(`/sites/${productId}`);
      } else {
        Alert.alert(
          "QR Code invalide",
          `Le code scanné ne contient pas d'ID de produit valide.\n\nContenu: ${data}`,
          [{ text: "Réessayer", onPress: () => setScanned(false) }]
        );
      }
    } catch (error) {
      Alert.alert(
        "Erreur de lecture",
        `Impossible de lire le QR code.\n\nErreur: ${error}`,
        [{ text: "Réessayer", onPress: () => setScanned(false) }]
      );
    }
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ["qr"],
        }}
      />

      {scanned && (
        <View style={styles.overlay}>
          <Text style={styles.overlayText}>QR Code scanné !</Text>
          <Text style={styles.overlaySubtext}>Redirection en cours...</Text>
        </View>
      )}

      <View style={styles.frame}>
        <View style={styles.cornerTopLeft} />
        <View style={styles.cornerTopRight} />
        <View style={styles.cornerBottomLeft} />
        <View style={styles.cornerBottomRight} />
      </View>

      <Text style={styles.instruction}>
        Placez le QR code dans le cadre
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    fontSize: 16,
    color: "#fff",
    textAlign: "center",
    marginBottom: 20,
  },
  link: {
    fontSize: 16,
    color: "#4CAF50",
    textDecorationLine: "underline",
    marginTop: 10,
  },
  overlay: {
    position: "absolute",
    top: "40%",
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
  },
  overlayText: {
    fontSize: 18,
    color: "#4CAF50",
    fontWeight: "bold",
  },
  overlaySubtext: {
    fontSize: 14,
    color: "#fff",
    marginTop: 5,
  },
  instruction: {
    position: "absolute",
    bottom: 100,
    fontSize: 16,
    color: "#fff",
    textAlign: "center",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    padding: 10,
    borderRadius: 5,
  },
  frame: {
    width: 250,
    height: 250,
    position: "relative",
  },
  cornerTopLeft: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 40,
    height: 40,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: "#4CAF50",
  },
  cornerTopRight: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 40,
    height: 40,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: "#4CAF50",
  },
  cornerBottomLeft: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: 40,
    height: 40,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: "#4CAF50",
  },
  cornerBottomRight: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: "#4CAF50",
  },
});