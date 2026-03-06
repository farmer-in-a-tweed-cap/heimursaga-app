import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { statusColors, mono } from '@/theme/tokens';

interface StatusHeaderProps {
  status: 'active' | 'planned' | 'completed' | 'cancelled';
  label: string;
  right?: string;
  dotColor?: string;
}

export function StatusHeader({ status, label, right, dotColor }: StatusHeaderProps) {
  const { dark, colors } = useTheme();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.statusBar },
      ]}
    >
      <View style={styles.left}>
        <View
          style={[styles.dot, { backgroundColor: dotColor ?? statusColors[status] }]}
        />
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      </View>
      {right ? (
        <Text style={[styles.right, { color: colors.textTertiary }]}>
          {right}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    fontFamily: mono,
  },
  right: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: mono,
  },
});
