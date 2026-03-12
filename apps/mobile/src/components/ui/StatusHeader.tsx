import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { statusColors, mono } from '@/theme/tokens';

interface StatusHeaderProps {
  status: 'active' | 'planned' | 'completed' | 'cancelled';
  label: string;
  right?: string;
  dotColor?: string;
  /** 'card' (default): gray bar with colored dot. 'detail': full status-colored bar, white text, no dot. */
  variant?: 'card' | 'detail';
}

export function StatusHeader({ status, label, right, dotColor, variant = 'card' }: StatusHeaderProps) {
  const { dark, colors } = useTheme();
  const isDetail = variant === 'detail';
  const barColor = dotColor ?? statusColors[status];

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isDetail ? barColor : colors.statusBar },
      ]}
    >
      <View style={styles.left}>
        {!isDetail && (
          <View style={[styles.dot, { backgroundColor: barColor }]} />
        )}
        <Text style={[styles.label, { color: isDetail ? '#ffffff' : colors.text }]}>{label}</Text>
      </View>
      {right ? (
        <Text style={[styles.right, { color: isDetail ? 'rgba(255,255,255,0.7)' : colors.textTertiary }]}>
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
