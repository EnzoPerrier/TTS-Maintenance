/**
 * Composant bouton pour ouvrir l'application de navigation
 */

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { Colors } from '../../constants/Colors';
import { openNavigation, showNavigationMenu } from '../../utils/navigationUtils';

interface NavigationButtonProps {
  lat: number;
  lng: number;
  label?: string;
  showMenu?: boolean; // Si true, affiche le menu de sélection, sinon ouvre directement
  style?: ViewStyle;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
}

export const NavigationButton: React.FC<NavigationButtonProps> = ({
  lat,
  lng,
  label,
  showMenu = true,
  style,
  variant = 'primary',
  size = 'medium',
}) => {
  const handlePress = () => {
    if (showMenu) {
      showNavigationMenu(lat, lng, label);
    } else {
      openNavigation(lat, lng, label);
    }
  };

  const getButtonStyle = () => {
    const styles = [localStyles.button];
    
    // Variant
    if (variant === 'primary') {
      styles.push(localStyles.buttonPrimary);
    } else if (variant === 'secondary') {
      styles.push(localStyles.buttonSecondary);
    } else if (variant === 'outline') {
      styles.push(localStyles.buttonOutline);
    }
    
    // Size
    if (size === 'small') {
      styles.push(localStyles.buttonSmall);
    } else if (size === 'large') {
      styles.push(localStyles.buttonLarge);
    }
    
    return styles;
  };

  const getTextStyle = () => {
    const styles = [localStyles.buttonText];
    
    if (variant === 'outline') {
      styles.push(localStyles.buttonTextOutline);
    }
    
    if (size === 'small') {
      styles.push(localStyles.buttonTextSmall);
    } else if (size === 'large') {
      styles.push(localStyles.buttonTextLarge);
    }
    
    return styles;
  };

  return (
    <TouchableOpacity
      style={[...getButtonStyle(), style]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Text style={getTextStyle()}>
        🧭 Itinéraire
      </Text>
    </TouchableOpacity>
  );
};

const localStyles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonPrimary: {
    backgroundColor: Colors.primary,
  },
  buttonSecondary: {
    backgroundColor: Colors.success,
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: Colors.primary,
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonSmall: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  buttonLarge: {
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  buttonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextOutline: {
    color: Colors.primary,
  },
  buttonTextSmall: {
    fontSize: 14,
  },
  buttonTextLarge: {
    fontSize: 18,
  },
});