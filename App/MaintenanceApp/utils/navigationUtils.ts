/**
 * Utilitaires pour ouvrir les applications de navigation
 * Compatible React Native (iOS et Android) avec Expo
 */

import { Alert, Linking, Platform } from 'react-native';

/**
 * Ouvre l'application de navigation avec les coordonnées GPS
 * Sur iOS: Apple Plans par défaut
 * Sur Android: Google Maps par défaut
 * 
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {string} label - Nom du lieu (optionnel)
 */
export const openNavigation = async (lat: number, lng: number, label?: string) => {
  const encodedLabel = label ? encodeURIComponent(label) : '';
  
  if (Platform.OS === 'ios') {
    // Sur iOS, utiliser Apple Plans
    const appleMapsUrl = `maps://maps.apple.com/?q=${encodedLabel}&ll=${lat},${lng}`;
    
    try {
      const supported = await Linking.canOpenURL(appleMapsUrl);
      if (supported) {
        await Linking.openURL(appleMapsUrl);
      } else {
        // Fallback vers Google Maps dans le navigateur
        const googleMapsUrl = `https://maps.google.com/maps?q=${lat},${lng}${label ? `&label=${encodedLabel}` : ''}`;
        await Linking.openURL(googleMapsUrl);
      }
    } catch (error) {
      console.error('Erreur lors de l\'ouverture de la navigation:', error);
      Alert.alert('Erreur', 'Impossible d\'ouvrir l\'application de navigation');
    }
  } else if (Platform.OS === 'android') {
    // Sur Android, utiliser Google Maps
    const googleMapsUrl = `google.navigation:q=${lat},${lng}`;
    
    try {
      const supported = await Linking.canOpenURL(googleMapsUrl);
      if (supported) {
        await Linking.openURL(googleMapsUrl);
      } else {
        // Fallback vers l'URL web de Google Maps
        const webUrl = `https://maps.google.com/maps?q=${lat},${lng}${label ? `&label=${encodedLabel}` : ''}`;
        await Linking.openURL(webUrl);
      }
    } catch (error) {
      console.error('Erreur lors de l\'ouverture de la navigation:', error);
      Alert.alert('Erreur', 'Impossible d\'ouvrir l\'application de navigation');
    }
  }
};

/**
 * Ouvre un menu de sélection pour choisir l'application de navigation
 * 
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {string} label - Nom du lieu (optionnel)
 */
export const showNavigationMenu = (lat: number, lng: number, label?: string) => {
  const encodedLabel = label ? encodeURIComponent(label) : '';
  
  const options = [
    {
      text: Platform.OS === 'ios' ? '🍎 Apple Plans' : '🗺️ Google Maps',
      onPress: () => openNavigation(lat, lng, label),
    },
    {
      text: '🚗 Waze',
      onPress: async () => {
        const wazeUrl = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes${label ? `&q=${encodedLabel}` : ''}`;
        try {
          const supported = await Linking.canOpenURL(wazeUrl);
          if (supported) {
            await Linking.openURL(wazeUrl);
          } else {
            Alert.alert('Waze non installé', 'Waze n\'est pas installé sur cet appareil');
          }
        } catch (error) {
          console.error('Erreur Waze:', error);
          Alert.alert('Erreur', 'Impossible d\'ouvrir Waze');
        }
      },
    },
    {
      text: '🗺️ Google Maps',
      onPress: async () => {
        const googleUrl = Platform.OS === 'ios'
          ? `comgooglemaps://?q=${lat},${lng}${label ? `&label=${encodedLabel}` : ''}`
          : `geo:${lat},${lng}?q=${lat},${lng}${label ? `(${encodedLabel})` : ''}`;
        
        try {
          const supported = await Linking.canOpenURL(googleUrl);
          if (supported) {
            await Linking.openURL(googleUrl);
          } else {
            // Fallback vers le web
            const webUrl = `https://maps.google.com/maps?q=${lat},${lng}${label ? `&label=${encodedLabel}` : ''}`;
            await Linking.openURL(webUrl);
          }
        } catch (error) {
          console.error('Erreur Google Maps:', error);
        }
      },
    },
    {
      text: 'Annuler',
      style: 'cancel',
    },
  ];
  
  Alert.alert(
    '🧭 Choisir une application',
    label ? `Navigation vers: ${label}` : 'Choisissez votre application de navigation',
    options,
    { cancelable: true }
  );
};

/**
 * Ouvre l'adresse dans une application de navigation
 * Utile quand on a une adresse textuelle plutôt que des coordonnées
 * 
 * @param {string} address - Adresse complète
 */
export const openNavigationByAddress = async (address: string) => {
  const encodedAddress = encodeURIComponent(address);
  
  if (Platform.OS === 'ios') {
    const appleMapsUrl = `maps://maps.apple.com/?q=${encodedAddress}`;
    
    try {
      const supported = await Linking.canOpenURL(appleMapsUrl);
      if (supported) {
        await Linking.openURL(appleMapsUrl);
      } else {
        const googleMapsUrl = `https://maps.google.com/maps?q=${encodedAddress}`;
        await Linking.openURL(googleMapsUrl);
      }
    } catch (error) {
      console.error('Erreur navigation:', error);
      Alert.alert('Erreur', 'Impossible d\'ouvrir l\'application de navigation');
    }
  } else if (Platform.OS === 'android') {
    const googleMapsUrl = `geo:0,0?q=${encodedAddress}`;
    
    try {
      const supported = await Linking.canOpenURL(googleMapsUrl);
      if (supported) {
        await Linking.openURL(googleMapsUrl);
      } else {
        const webUrl = `https://maps.google.com/maps?q=${encodedAddress}`;
        await Linking.openURL(webUrl);
      }
    } catch (error) {
      console.error('Erreur navigation:', error);
      Alert.alert('Erreur', 'Impossible d\'ouvrir l\'application de navigation');
    }
  }
};