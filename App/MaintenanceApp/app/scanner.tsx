import { CameraView, useCameraPermissions } from 'expo-camera';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const API = 'http://192.168.1.127:3000';

export default function ScannerScreen() {
  const router = useRouter();
  const { id_maintenance, maintenance_type, maintenance_date } = useLocalSearchParams();
  const cameraRef = useRef(null);

  const [scanned, setScanned] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [produit, setProduit] = useState(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [loading, setLoading] = useState(false);
  const [cameraMode, setCameraMode] = useState('scan'); // 'scan' ou 'photo'

  // Formulaire
  const [etat, setEtat] = useState('');
  const [commentaire, setCommentaire] = useState('');
  const [photos, setPhotos] = useState([]);

  // Gérer le scan du QR code
  const handleBarcodeScanned = async ({ data }) => {
    if (scanned) return;
    setScanned(true);

    try {
      const parsed = JSON.parse(data);
      const id_qr = parsed.id_qr;

      if (!id_qr) {
        Alert.alert('Erreur', 'QR Code invalide');
        setScanned(false);
        return;
      }

      // Récupérer les infos du produit via le QR
      const res = await fetch(`${API}/qrcodes/scan/${id_qr}`);
      const qrData = await res.json();

      if (qrData.status === 'vierge') {
        Alert.alert('QR Code vierge', "Ce QR code n'est associé à aucun produit");
        setScanned(false);
        return;
      }

      // Charger les détails du produit
      const produitRes = await fetch(`${API}/produits/${qrData.produit.id_produit}`);
      const produitData = await produitRes.json();
      
      setProduit(produitData);
      setShowForm(true);
    } catch (err) {
      console.error(err);
      Alert.alert('Erreur', 'Impossible de lire le QR code');
      setScanned(false);
    }
  };

  // Prendre une photo
  const takePhoto = async () => {
    if (!cameraRef.current) {
      Alert.alert('Erreur', 'Caméra non disponible');
      return;
    }

    if (photos.length >= 5) {
      Alert.alert('Limite atteinte', 'Maximum 5 photos autorisées');
      return;
    }

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
      });
      
      setPhotos([...photos, { uri: photo.uri }]);
      setCameraMode('scan');
      Alert.alert('Photo prise', 'Photo ajoutée avec succès');
    } catch (err) {
      console.error(err);
      Alert.alert('Erreur', 'Impossible de prendre la photo');
    }
  };

  // Soumettre le formulaire
  const handleSubmit = async () => {
    if (!etat) {
      Alert.alert('Erreur', 'Veuillez sélectionner un état');
      return;
    }

    setLoading(true);

    try {
      // 1. Associer le produit à la maintenance
      const assocRes = await fetch(`${API}/maintenance-produits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_maintenance,
          id_produit: produit.id_produit,
          etat,
          commentaire,
        }),
      });

      if (!assocRes.ok) {
        const error = await assocRes.json();
        throw new Error(error.error || "Erreur lors de l'association");
      }

      // 2. Upload des photos si présentes
      if (photos.length > 0) {
        const formData = new FormData();

        photos.forEach((photo, index) => {
          formData.append('photos', {
            uri: photo.uri,
            type: 'image/jpeg',
            name: `photo-${Date.now()}-${index}.jpg`,
          } as any);
        });

        formData.append('id_maintenance', id_maintenance as string);
        formData.append('id_produit', produit.id_produit.toString());
        if (commentaire) {
          formData.append('commentaire', commentaire);
        }

        const photosRes = await fetch(`${API}/photos/multiple`, {
          method: 'POST',
          body: formData,
        });

        if (!photosRes.ok) {
          console.warn('Erreur lors de l\'upload des photos');
        }
      }

      Alert.alert('Succès ✅', 'Produit ajouté à la maintenance', [
        {
          text: 'Scanner un autre produit',
          onPress: () => {
            setShowForm(false);
            setProduit(null);
            setEtat('');
            setCommentaire('');
            setPhotos([]);
            setScanned(false);
          },
        },
        {
          text: 'Terminer',
          onPress: () => router.back(),
        },
      ]);
    } catch (err: any) {
      Alert.alert('Erreur', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Vérification des permissions
  if (!permission) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.permissionIcon}>📷</Text>
        <Text style={styles.permissionText}>
          Accès caméra requis pour scanner les QR codes
        </Text>
        <TouchableOpacity style={styles.primaryButton} onPress={requestPermission}>
          <Text style={styles.primaryButtonText}>Autoriser l'accès</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Mode caméra pour prendre une photo
  if (cameraMode === 'photo' && showForm) {
    return (
      <View style={styles.container}>
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFillObject}
          facing="back"
        />
        <View style={styles.cameraOverlay}>
          <TouchableOpacity
            style={styles.cameraCancelButton}
            onPress={() => setCameraMode('scan')}
          >
            <Text style={styles.cameraCancelButtonText}>← Annuler</Text>
          </TouchableOpacity>
          <Text style={styles.cameraInstruction}>
            Photo {photos.length + 1}/5
          </Text>
        </View>
        <View style={styles.cameraControls}>
          <TouchableOpacity
            style={styles.cameraButton}
            onPress={takePhoto}
          >
            <View style={styles.cameraButtonInner} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Formulaire d'ajout
  if (showForm && produit) {
    return (
      <View style={styles.container}>
        <View style={styles.headerForm}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              setShowForm(false);
              setProduit(null);
              setEtat('');
              setCommentaire('');
              setPhotos([]);
              setScanned(false);
            }}
          >
            <Text style={styles.backButtonText}>← Retour au scan</Text>
          </TouchableOpacity>
          <Text style={styles.headerFormTitle}>Ajouter à la maintenance</Text>
        </View>

        <ScrollView style={styles.form}>
          {/* Maintenance */}
          <View style={styles.infoCard}>
            <Text style={styles.infoCardTitle}>📋 Maintenance</Text>
            <Text style={styles.infoCardText}>{maintenance_type}</Text>
            <Text style={styles.infoCardDate}>
              {new Date(maintenance_date as string).toLocaleDateString('fr-FR')}
            </Text>
          </View>

          {/* Produit */}
          <View style={styles.infoCard}>
            <Text style={styles.infoCardTitle}>📦 Produit scanné</Text>
            <Text style={styles.infoCardText}>{produit.nom}</Text>
            {produit.departement && (
              <Text style={styles.infoCardSubtext}>Département: {produit.departement}</Text>
            )}
            {produit.description && (
              <Text style={styles.infoCardSubtext}>{produit.description}</Text>
            )}
          </View>

          {/* État */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>État du produit *</Text>
            <View style={styles.stateButtons}>
              {[
                { label: 'OK', icon: '✅', color: '#28A745' },
                { label: 'NOK', icon: '❌', color: '#DC3545' },
                { label: 'Passable', icon: '⚠️', color: '#FFC107' },
                { label: 'Non vérifié', icon: '❓', color: '#6C757D' },
              ].map((state) => (
                <TouchableOpacity
                  key={state.label}
                  style={[
                    styles.stateButton,
                    etat === state.label && { 
                      backgroundColor: state.color,
                      borderColor: state.color,
                    },
                  ]}
                  onPress={() => setEtat(state.label)}
                >
                  <Text
                    style={[
                      styles.stateButtonText,
                      etat === state.label && styles.stateButtonTextActive,
                    ]}
                  >
                    {state.icon} {state.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Commentaire */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Commentaire (optionnel)</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Notes sur l'état du produit..."
              placeholderTextColor="#6C757D"
              value={commentaire}
              onChangeText={setCommentaire}
              multiline
              numberOfLines={4}
            />
          </View>

          {/* Photos */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Photos ({photos.length}/5)</Text>
            <TouchableOpacity
              style={[
                styles.photoButton,
                photos.length >= 5 && styles.photoButtonDisabled,
              ]}
              onPress={() => setCameraMode('photo')}
              disabled={photos.length >= 5}
            >
              <Text style={styles.photoButtonText}>
                📷 {photos.length >= 5 ? 'Limite atteinte' : 'Prendre une photo'}
              </Text>
            </TouchableOpacity>

            {photos.length > 0 && (
              <View style={styles.photosGrid}>
                {photos.map((photo, index) => (
                  <View key={index} style={styles.photoPreview}>
                    <Image source={{ uri: photo.uri }} style={styles.photoImage} />
                    <TouchableOpacity
                      style={styles.photoRemove}
                      onPress={() => setPhotos(photos.filter((_, i) => i !== index))}
                    >
                      <Text style={styles.photoRemoveText}>×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Boutons */}
          <View style={styles.formActions}>
            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.submitButtonText}>✓ Valider l'ajout</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setShowForm(false);
                setProduit(null);
                setEtat('');
                setCommentaire('');
                setPhotos([]);
                setScanned(false);
              }}
            >
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  // Scanner de QR code
  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFillObject}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
      />

      <View style={styles.overlay}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>← Retour</Text>
          </TouchableOpacity>
          <View style={styles.maintenanceInfo}>
            <Text style={styles.maintenanceType}>{maintenance_type}</Text>
            <Text style={styles.maintenanceDate}>
              📅 {new Date(maintenance_date as string).toLocaleDateString('fr-FR')}
            </Text>
          </View>
        </View>

        <View style={styles.scanArea}>
          <View style={styles.scanFrame}>
            <View style={[styles.corner, styles.cornerTopLeft]} />
            <View style={[styles.corner, styles.cornerTopRight]} />
            <View style={[styles.corner, styles.cornerBottomLeft]} />
            <View style={[styles.corner, styles.cornerBottomRight]} />
          </View>
          <Text style={styles.instruction}>
            Placez le QR code du produit dans le cadre
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6C757D',
  },
  permissionIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  permissionText: {
    fontSize: 16,
    color: '#343A40',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  primaryButton: {
    backgroundColor: '#0066CC',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  overlay: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
  },
  headerForm: {
    backgroundColor: '#0066CC',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerFormTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFF',
    marginTop: 10,
  },
  backButton: {
    alignSelf: 'flex-start',
  },
  backButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  maintenanceInfo: {
    marginTop: 12,
  },
  maintenanceType: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '600',
  },
  maintenanceDate: {
    color: '#E3F2FD',
    fontSize: 14,
    marginTop: 4,
  },
  scanArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#4CAF50',
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  instruction: {
    marginTop: 30,
    color: '#FFF',
    fontSize: 16,
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 12,
    borderRadius: 8,
    maxWidth: '80%',
  },
  form: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    padding: 16,
  },
  infoCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#DEE2E6',
  },
  infoCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0066CC',
    marginBottom: 8,
  },
  infoCardText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#343A40',
    marginBottom: 4,
  },
  infoCardSubtext: {
    fontSize: 14,
    color: '#6C757D',
    marginTop: 4,
  },
  infoCardDate: {
    fontSize: 14,
    color: '#6C757D',
    marginTop: 4,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#343A40',
    marginBottom: 8,
  },
  stateButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  stateButton: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#DEE2E6',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  stateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#343A40',
  },
  stateButtonTextActive: {
    color: '#FFF',
  },
  textArea: {
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#DEE2E6',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  photoButton: {
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#0066CC',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  photoButtonDisabled: {
    backgroundColor: '#F8F9FA',
    borderColor: '#DEE2E6',
  },
  photoButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0066CC',
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  photoPreview: {
    width: 100,
    height: 100,
    position: 'relative',
  },
  photoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  photoRemove: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#DC3545',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoRemoveText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 20,
  },
  formActions: {
    marginTop: 20,
    marginBottom: 40,
  },
  submitButton: {
    backgroundColor: '#0066CC',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  submitButtonDisabled: {
    backgroundColor: '#6C757D',
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#6C757D',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cameraOverlay: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
  },
  cameraCancelButton: {
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  cameraCancelButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cameraInstruction: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  cameraControls: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  cameraButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 5,
    borderColor: '#0066CC',
  },
  cameraButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#0066CC',
  },
});