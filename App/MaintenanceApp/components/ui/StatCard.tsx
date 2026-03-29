import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '../../constants/Colors';

interface StatCardProps {
  number: number;
  label: string;
  accent?: 'blue' | 'orange' | 'green';
}

export const StatCard: React.FC<StatCardProps> = ({
  number,
  label,
  accent = 'blue',
}) => {
  const accentColor =
    accent === 'orange' ? Colors.accent :
    accent === 'green'  ? Colors.success :
    Colors.primary;

  return (
    <View style={styles.container}>
      <View style={[styles.topBar, { backgroundColor: accentColor }]} />
      <Text style={[styles.number, { color: accentColor }]}>{number}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
  },
  topBar: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 2,
    opacity: 0.8,
  },
  number: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -1,
    marginBottom: 4,
    marginTop: 6,
  },
  label: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});