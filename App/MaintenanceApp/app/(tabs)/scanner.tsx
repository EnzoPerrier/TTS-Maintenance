import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../../constants/Colors';
import { GlobalStyles } from '../../constants/Styles';

export default function ScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const router = useRouter();

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View style={GlobalStyles.container}>
        <Text style={{ fontSize: 16, textAlign: 'center', marginBottom: 20 }}>
          📷 Accès à la caméra requis pour scanner un QR code
        </Text>

        <TouchableOpacity
          onPress={requestPermission}
          style={{
            backgroundColor: Colors.primary,
            padding: 14,
            borderRadius: 12,
            alignSelf: 'center',
          }}
        >
          <Text style={{ color: Colors.white, fontWeight: '600' }}>
            Autoriser la caméra
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleBarcodeScanned = ({ data }) => {
    try {
      setScanned(true);

      // 🔍 Parse le QR
      const parsed = JSON.parse(data);

      if (!parsed.id_qr) {
        throw new Error('QR invalide');
      }

      // renvoi vers la page produit
      router.push(`../sites/${parsed.id_qr}`);
    } catch (error) {
      Alert.alert(
        'QR Code invalide',
        'Le QR code scanné est incorrect.',
        [{ text: 'OK', onPress: () => setScanned(false) }]
      );
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.black }}>
      <CameraView
        style={{ flex: 1 }}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
      />

      <View
        style={{
          position: 'absolute',
          bottom: 40,
          left: 20,
          right: 20,
          backgroundColor: 'rgba(0,0,0,0.6)',
          padding: 20,
          borderRadius: 16,
          alignItems: 'center',
        }}
      >
        <Text style={{ color: Colors.white, fontSize: 20, fontWeight: '700' }}>
          📷 Scanner un QR Code
        </Text>
        <Text
          style={{
            color: Colors.gray100,
            fontSize: 14,
            marginTop: 8,
            textAlign: 'center',
          }}
        >
          Placez le QR code dans le cadre
        </Text>
      </View>
    </View>
  );
}
