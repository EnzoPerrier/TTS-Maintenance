import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '../../constants/Colors';

interface BadgeProps {
  text: string;
  color?: string;
}

export const Badge: React.FC<BadgeProps> = ({ text, color = Colors.gray600 }) => {
  return (
    <View style={[styles.badge, { backgroundColor: color }]}>
      <Text style={styles.text}>{text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  text: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
});