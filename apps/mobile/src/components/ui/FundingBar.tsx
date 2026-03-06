import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { colors as brandColors, mono } from '@/theme/tokens';

interface FundingBarProps {
  raised: number;
  goal: number;
}

export function FundingBar({ raised, goal }: FundingBarProps) {
  const { dark, colors } = useTheme();
  const pct = goal > 0 ? Math.min((raised / goal) * 100, 100) : 0;

  return (
    <View>
      <View
        style={[
          styles.track,
          { backgroundColor: dark ? '#2a2a2a' : '#e5e5e5' },
        ]}
      >
        <View
          style={[
            styles.fill,
            { width: `${pct}%`, backgroundColor: brandColors.copper },
          ]}
        />
      </View>
      <View style={styles.labels}>
        <Text style={[styles.amount, { color: colors.textTertiary }]}>
          ${raised.toLocaleString()} / ${goal.toLocaleString()}
        </Text>
        <Text style={styles.pct}>{Math.round(pct)}%</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 6,
  },
  fill: {
    height: '100%',
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  amount: {
    fontSize: 12,
    fontFamily: mono,
    fontWeight: '600',
  },
  pct: {
    fontSize: 12,
    fontFamily: mono,
    fontWeight: '700',
    color: brandColors.copper,
  },
});
