import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors as brandColors, mono } from '@/theme/tokens';

interface BadgeProps {
  count: number;
  size?: number;
}

export function Badge({ count, size = 16 }: BadgeProps) {
  if (count <= 0) return null;

  return (
    <View style={[styles.badge, { width: size, height: size, minWidth: size }]}>
      <Text style={[styles.text, { fontSize: size * 0.56 }]}>
        {count > 99 ? '99+' : count}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: brandColors.copper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#ffffff',
    fontFamily: mono,
    fontWeight: '700',
  },
});
