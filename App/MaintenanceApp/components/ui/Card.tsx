import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '../../constants/Colors';

interface CardProps {
  title: string;
  children?: React.ReactNode;
  borderLeftColor?: string;
  badge?: string;
  badgeColor?: string;
}

export const Card: React.FC<CardProps> = ({
  title,
  children,
  borderLeftColor,
  badge,
  badgeColor = Colors.primary,
}) => {
  return (
    <View style={[styles.card, borderLeftColor && { borderLeftColor, borderLeftWidth: 4 }]}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {badge && (
          <View style={[styles.badge, { backgroundColor: badgeColor }]}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
      </View>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface2,
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    flex: 1,
    letterSpacing: -0.2,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  badgeText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
});