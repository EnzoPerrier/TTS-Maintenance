import { useFocusEffect } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../../constants/Colors';
import { GlobalStyles } from '../../constants/Styles';

export default function ScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);
  const router = useRouter(); 
  const params = useLocalSearchParams(); 
  
  // Référence pour éviter les scans multiples
  const isProcessingRef = useRef(false);
  
  // Récupérer les paramètres de navigation
  const { id_maintenance, return_to } = params;

  // Réinitialiser quand on revient sur l'écran
  useFocusEffect(
    React.useCallback(() => {
      setScanned(false); //Réinitialiser scanned aussi
      setProcessing(false);
      isProcessingRef.current = false; // Réinitialiser la ref
      
      return () => {
        // Cleanup si nécessaire
      };
    }, [])
  );

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
    // Si déjà en cours de traitement, ignorer
    if (isProcessingRef.current || scanned) {
      console.log('Scan ignoré - déjà en traitement');
      return;
    }

    try {
      // Marquer comme en cours de traitement
      isProcessingRef.current = true;
      setScanned(true);
      setProcessing(true); 

      console.log('QR Code scanné:', data);

      // Parse le QR
      const parsed = JSON.parse(data);

      if (!parsed.id_qr) {
        throw new Error('QR invalide');
      }

      const id_produit = parsed.id_produit;

      // Vérifier si on vient d'une maintenance
      if (id_maintenance && return_to === 'maintenance') {
        // Redirection IMMÉDIATE sans Alert
        router.replace({
          pathname: `../maintenance/${id_maintenance}`,
          params: { scanned_product_id: String(id_produit) }
        });
      } else {
        // Comportement par défaut - aller vers les détails du produit
        router.push(`../products/${id_produit}`);
      }
    } catch (error) {
      console.error('Erreur scan:', error);
      
      // Réinitialiser en cas d'erreur
      isProcessingRef.current = false;
      setScanned(false);
      setProcessing(false); 
      
      Alert.alert(
        'QR Code invalide',
        'Le QR code scanné est incorrect.',
        [{ 
          text: 'OK',
          onPress: () => {
            isProcessingRef.current = false;
            setScanned(false);
            setProcessing(false);
          }
        }]
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

      {/* Overlay avec instructions */}
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
          {id_maintenance 
            ? 'Scannez un produit pour l\'associer à la maintenance'
            : 'Placez le QR code dans le cadre'
          }
        </Text>
        
        {/* Bouton annuler si on vient d'une maintenance */}
        {id_maintenance && (
          <TouchableOpacity
            style={{
              marginTop: 16,
              backgroundColor: Colors.danger,
              paddingVertical: 10,
              paddingHorizontal: 20,
              borderRadius: 8,
            }}
            onPress={() => {
              router.back();
            }}
          >
            <Text style={{ color: Colors.white, fontWeight: '600' }}>
              ✕ Annuler
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Cadre de scan visuel */}
      <View
        style={{
          position: 'absolute',
          top: '30%',
          left: '10%',
          right: '10%',
          height: 250,
          borderWidth: 2,
          borderColor: Colors.white,
          borderRadius: 16,
          backgroundColor: 'transparent',
        }}
      >
        {/* Coins du cadre */}
        <View
          style={{
            position: 'absolute',
            top: -2,
            left: -2,
            width: 30,
            height: 30,
            borderTopWidth: 4,
            borderLeftWidth: 4,
            borderColor: Colors.success,
          }}
        />
        <View
          style={{
            position: 'absolute',
            top: -2,
            right: -2,
            width: 30,
            height: 30,
            borderTopWidth: 4,
            borderRightWidth: 4,
            borderColor: Colors.success,
          }}
        />
        <View
          style={{
            position: 'absolute',
            bottom: -2,
            left: -2,
            width: 30,
            height: 30,
            borderBottomWidth: 4,
            borderLeftWidth: 4,
            borderColor: Colors.success,
          }}
        />
        <View
          style={{
            position: 'absolute',
            bottom: -2,
            right: -2,
            width: 30,
            height: 30,
            borderBottomWidth: 4,
            borderRightWidth: 4,
            borderColor: Colors.success,
          }}
        />
      </View>

      {/* Indicateur de scan en cours */}
      {scanned && (
        <View
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: [{ translateX: -50 }, { translateY: -50 }],
            backgroundColor: 'rgba(0,0,0,0.8)',
            padding: 20,
            borderRadius: 12,
          }}
        >
          <Text style={{ color: Colors.white, fontSize: 16, fontWeight: '600' }}>
            ⏳ Traitement...
          </Text>
        </View>
      )}
    </View>
  );
}