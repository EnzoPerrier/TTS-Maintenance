import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../../constants/Colors';
import { CardStyles } from '../../constants/Styles';

interface CardProps {
  title: string;
  onPress?: () => void;
  badge?: string;
  badgeColor?: string;
  borderLeftColor?: string;
  children?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  title,
  onPress,
  badge,
  badgeColor,
  borderLeftColor,
  children,
}) => {
  const cardStyle = [
    CardStyles.card,
    borderLeftColor && { borderLeftWidth: 4, borderLeftColor },
  ];

  const content = (
    <View style={cardStyle}>
      <View style={CardStyles.cardHeader}>
        <Text style={CardStyles.cardTitle}>{title}</Text>
        {badge && (
          <View style={[styles.badge, { backgroundColor: badgeColor || Colors.gray600 }]}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
      </View>
      {children}
    </View>
  );

  if (onPress) {
    return <TouchableOpacity onPress={onPress}>{content}</TouchableOpacity>;
  }

  return content;
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
});