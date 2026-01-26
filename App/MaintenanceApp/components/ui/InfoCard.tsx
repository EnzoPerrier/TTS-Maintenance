import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '../../constants/Colors';

interface InfoRow {
  label: string;
  value: string;
  valueColor?: string;
}

interface InfoCardProps {
  title: string;
  icon?: string;
  rows: InfoRow[];
}

export const InfoCard: React.FC<InfoCardProps> = ({ title, icon, rows }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {icon && `${icon} `}{title}
      </Text>
      {rows.map((row, index) => (
        <View key={index} style={styles.row}>
          <Text style={styles.label}>{row.label}</Text>
          <Text style={[styles.value, row.valueColor && { color: row.valueColor }]}>
            {row.value}
          </Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: Colors.gray200,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray50,
  },
  label: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '600',
    width: 120,
  },
  value: {
    flex: 1,
    fontSize: 14,
    color: Colors.textPrimary,
  },
});