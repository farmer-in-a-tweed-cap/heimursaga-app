import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { mono } from '@/theme/tokens';

interface MetadataItem {
  label: string;
  value: string;
}

interface MetadataGridProps {
  items: MetadataItem[];
}

export function MetadataGrid({ items }: MetadataGridProps) {
  const { dark, colors } = useTheme();

  return (
    <View
      style={[
        styles.grid,
        {
          backgroundColor: dark ? 'rgba(70,118,172,0.06)' : 'rgba(70,118,172,0.03)',
          borderColor: colors.borderThin,
        },
      ]}
    >
      {items.map((item, i) => (
        <View key={item.label} style={styles.cell}>
          <Text style={[styles.label, { color: colors.textTertiary }]}>{item.label}</Text>
          <Text style={[styles.value, { color: colors.textSecondary }]}>{item.value}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    borderWidth: 1,
  },
  cell: {
    width: '50%',
    paddingVertical: 4,
  },
  label: {
    fontFamily: mono,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.64,
    marginBottom: 2,
  },
  value: {
    fontFamily: mono,
    fontSize: 13,
    fontWeight: '600',
  },
});
