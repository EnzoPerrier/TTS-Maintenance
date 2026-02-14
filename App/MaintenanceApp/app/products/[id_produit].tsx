import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { InfoCard } from '../../components/ui/InfoCard';
import { Colors } from '../../constants/Colors';
import { Config } from '../../constants/Config';
import { GlobalStyles } from '../../constants/Styles';
import { Photo, Produit } from '../../types';
import { api } from '../../utils/api';
import { getEtatColor } from '../../utils/helpers';

export default function ProductDetailsScreen() {
  const { id_produit } = useLocalSearchParams();
  const router = useRouter();
  const [product, setProduct] = useState<Produit | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // États pour l'édition
  const [editedNom, setEditedNom] = useState('');
  const [editedEtat, setEditedEtat] = useState('');
  const [editedDepartement, setEditedDepartement] = useState('');
  const [editedDescription, setEditedDescription] = useState('');

  const loadData = async () => {
    try {
      const [productData, photosData] = await Promise.all([
        api.getProductById(Number(id_produit)),
        api.getPhotosByProduct(Number(id_produit)),
      ]);

      setProduct(productData);
      setPhotos(photosData);
      
      // Initialiser les champs d'édition
      setEditedNom(productData.nom || '');
      setEditedEtat(productData.etat || '');
      setEditedDepartement(productData.departement || '');
      setEditedDescription(productData.description || '');
    } catch (err) {
      console.error(err);
      Alert.alert('Erreur', 'Impossible de charger les données');
    }
  };

  useEffect(() => {
    loadData();
  }, [id_produit]);

  const handleSave = async () => {
  try {
    // Préparer les données exactement comme la version web
    const dataToSend = {
      nom: editedNom,
      etat: editedEtat || null,
      departement: editedDepartement || null,
      description: editedDescription || null,
    };

    console.log('Données envoyées:', dataToSend);
    console.log('URL:', `${Config.API_URL}/produits/${id_produit}`);

    const response = await fetch(`${Config.API_URL}/produits/${id_produit}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dataToSend),
    });

    console.log('Status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erreur response:', errorText);
      Alert.alert('Erreur', 'Impossible de mettre à jour le produit');
      return;
    }

    const result = await response.json();
    console.log('Résultat:', result);

    Alert.alert('Succès', 'Produit mis à jour');
    setIsEditing(false);
    loadData();
  } catch (err) {
    console.error('Erreur catch:', err);
    Alert.alert('Erreur', 'Impossible de mettre à jour le produit');
  }
};

  const handleCancelEdit = () => {
    // Réinitialiser les valeurs
    if (product) {
      setEditedNom(product.nom || '');
      setEditedEtat(product.etat || '');
      setEditedDepartement(product.departement || '');
      setEditedDescription(product.description || '');
    }
    setIsEditing(false);
  };

  const handleAddPhoto = async () => {
    try {
      // Demander les permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission refusée', 'Nous avons besoin de votre permission pour accéder aux photos');
        return;
      }

      // Ouvrir le sélecteur d'images
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const formData = new FormData();
        
        // @ts-ignore
        formData.append('photo', {
          uri: result.assets[0].uri,
          type: 'image/jpeg',
          name: `photo_${Date.now()}.jpg`,
        });
        
        formData.append('id_produit', String(id_produit));

        await api.uploadPhoto(formData);
        Alert.alert('Succès', 'Photo ajoutée');
        loadData();
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Erreur', 'Impossible d\'ajouter la photo');
    }
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission refusée', 'Nous avons besoin de votre permission pour accéder à la caméra');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const formData = new FormData();
        
        // @ts-ignore
        formData.append('photo', {
          uri: result.assets[0].uri,
          type: 'image/jpeg',
          name: `photo_${Date.now()}.jpg`,
        });
        
        formData.append('id_produit', String(id_produit));

        await api.uploadPhoto(formData);
        Alert.alert('Succès', 'Photo ajoutée');
        loadData();
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Erreur', 'Impossible de prendre la photo');
    }
  };

  const handleDeletePhoto = async (photoId: number) => {
    Alert.alert(
      'Confirmer la suppression',
      'Voulez-vous vraiment supprimer cette photo ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deletePhoto(photoId);
              Alert.alert('Succès', 'Photo supprimée');
              loadData();
              setSelectedPhoto(null);
            } catch (err) {
              console.error(err);
              Alert.alert('Erreur', 'Impossible de supprimer la photo');
            }
          },
        },
      ]
    );
  };

  const showPhotoOptions = () => {
    Alert.alert(
      'Ajouter une photo',
      'Choisissez une option',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Galerie', onPress: handleAddPhoto },
        { text: 'Caméra', onPress: handleTakePhoto },
      ]
    );
  };

  if (!product) {
    return (
      <View style={GlobalStyles.container}>
        <Text>Chargement...</Text>
      </View>
    );
  }

  return (
    <View style={GlobalStyles.container}>
      <View style={GlobalStyles.header}>
        <TouchableOpacity onPress={() => router.back()} style={GlobalStyles.backButton}>
          <Text style={GlobalStyles.backButtonText}>← Retour</Text>
        </TouchableOpacity>
        <Text style={GlobalStyles.headerTitle}>{product.nom}</Text>
        <Text style={GlobalStyles.headerSubtitle}>Détails du produit</Text>
      </View>

      <ScrollView style={GlobalStyles.scrollView}>
        {/* Boutons d'action */}
        <View style={styles.actionButtons}>
          {!isEditing ? (
            <TouchableOpacity style={styles.editButton} onPress={() => setIsEditing(true)}>
              <Text style={styles.editButtonText}>✏️ Modifier</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.editActions}>
              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <Text style={styles.saveButtonText}>✓ Enregistrer</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelButton} onPress={handleCancelEdit}>
                <Text style={styles.cancelButtonText}>✕ Annuler</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Informations */}
        // Dans [id_produit].tsx, remplacez la partie du formulaire d'édition pour l'état :

{!isEditing ? (
  <InfoCard
    title="Informations"
    icon="📋"
    rows={[
      { label: 'ID Produit:', value: String(product.id_produit) },
      {
        label: 'État:',
        value: product.etat || 'N/A',
        valueColor: getEtatColor(product.etat),
      },
      { label: 'Département:', value: product.departement || 'N/A' },
      ...(product.description
        ? [{ label: 'Description:', value: product.description }]
        : []),
    ]}
  />
) : (
  <View style={styles.editForm}>
    <Text style={styles.editFormTitle}>📋 Modifier les informations</Text>
    
    <Text style={styles.label}>Nom du produit</Text>
    <TextInput
      style={styles.input}
      value={editedNom}
      onChangeText={setEditedNom}
      placeholder="Nom du produit"
    />

    <Text style={styles.label}>État</Text>
    <View style={styles.pickerContainer}>
      <TouchableOpacity 
        style={styles.pickerButton}
        onPress={() => {
          Alert.alert(
            'Choisir l\'état',
            '',
            [
              { text: 'OK', onPress: () => setEditedEtat('OK') },
              { text: 'NOK', onPress: () => setEditedEtat('NOK') },
              { text: 'Passable', onPress: () => setEditedEtat('Passable') },
              { text: 'Non défini', onPress: () => setEditedEtat('') },
              { text: 'Annuler', style: 'cancel' },
            ]
          );
        }}
      >
        <Text style={styles.pickerButtonText}>
          {editedEtat || 'Sélectionner un état'}
        </Text>
        <Text style={styles.pickerArrow}>▼</Text>
      </TouchableOpacity>
    </View>

    <Text style={styles.label}>Département</Text>
    <TextInput
      style={styles.input}
      value={editedDepartement}
      onChangeText={setEditedDepartement}
      placeholder="Département"
    />

    <Text style={styles.label}>Description</Text>
    <TextInput
      style={[styles.input, styles.textArea]}
      value={editedDescription}
      onChangeText={setEditedDescription}
      placeholder="Description"
      multiline
      numberOfLines={4}
    />
  </View>
)}

        {/* Photos récentes */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>📸 Photos ({photos.length})</Text>
            <TouchableOpacity style={styles.addPhotoButton} onPress={showPhotoOptions}>
              <Text style={styles.addPhotoButtonText}>+ Ajouter</Text>
            </TouchableOpacity>
          </View>
          
          {photos.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {photos.map(photo => (
                <TouchableOpacity
                  key={photo.id_photo}
                  style={styles.photoThumbnail}
                  onPress={() => setSelectedPhoto(photo)}
                >
                  <Image
                    source={{ uri: `${Config.API_URL}${photo.chemin_photo}` }}
                    style={styles.photoImage}
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <Text style={styles.noPhotos}>Aucune photo pour ce produit</Text>
          )}
        </View>
      </ScrollView>

      {/* Modal photo */}
      <Modal
        visible={!!selectedPhoto}
        transparent={true}
        onRequestClose={() => setSelectedPhoto(null)}
      >
        <TouchableOpacity
          style={styles.photoModal}
          activeOpacity={1}
          onPress={() => setSelectedPhoto(null)}
        >
          <View style={styles.photoModalContent}>
            {selectedPhoto && (
              <>
                <Image
                  source={{ uri: `${Config.API_URL}${selectedPhoto.chemin_photo}` }}
                  style={styles.photoModalImage}
                  resizeMode="contain"
                />
                <TouchableOpacity
                  style={styles.photoModalDelete}
                  onPress={() => handleDeletePhoto(selectedPhoto.id_photo)}
                >
                  <Text style={styles.photoModalDeleteText}>🗑️ Supprimer</Text>
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity
              style={styles.photoModalClose}
              onPress={() => setSelectedPhoto(null)}
            >
              <Text style={styles.photoModalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  actionButtons: {
    marginBottom: 16,
  },
  editButton: {
    backgroundColor: Colors.primary,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  editButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
  },
  saveButton: {
    flex: 1,
    backgroundColor: Colors.success,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: Colors.gray600,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  editForm: {
    backgroundColor: Colors.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  editFormTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.gray800,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: Colors.gray100,
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.primary,
  },
  addPhotoButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  addPhotoButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  noPhotos: {
    textAlign: 'center',
    color: Colors.gray300,
    fontSize: 14,
    fontStyle: 'italic',
    padding: 20,
  },
  photoThumbnail: {
    width: 120,
    height: 120,
    marginRight: 12,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: Colors.gray200,
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoModal: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoModalContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoModalImage: {
    width: '90%',
    height: '90%',
  },
  photoModalClose: {
    position: 'absolute',
    top: 60,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoModalCloseText: {
    color: Colors.white,
    fontSize: 24,
    fontWeight: '600',
  },
  photoModalDelete: {
    position: 'absolute',
    bottom: 60,
    backgroundColor: Colors.error,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  photoModalDeleteText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },

   pickerContainer: {
    marginBottom: 12,
  },
  pickerButton: {
    backgroundColor: Colors.gray100,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.gray200,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerButtonText: {
    fontSize: 16,
    color: Colors.gray600,
  },
  pickerArrow: {
    fontSize: 12,
    color: Colors.gray300,
  },
});