import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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

  const loadData = async () => {
    try {
      const [productData, photosData] = await Promise.all([
        api.getProductById(Number(id_produit)),
        api.getPhotosByProduct(Number(id_produit)),
      ]);

      setProduct(productData);
      setPhotos(photosData);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, [id_produit]);

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
        {/* Informations */}
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

        {/* Photos récentes */}
        {photos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📸 Photos récentes</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {photos.slice(0, 5).map(photo => (
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
          </View>
        )}
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
              <Image
                source={{ uri: `${Config.API_URL}${selectedPhoto.chemin_photo}` }}
                style={styles.photoModalImage}
                resizeMode="contain"
              />
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
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: 12,
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
});