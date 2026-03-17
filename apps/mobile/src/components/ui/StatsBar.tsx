import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { colors as brandColors, mono } from '@/theme/tokens';

interface Stat {
  value: string;
  suffix?: string;
  label: string;
}

interface StatsBarProps {
  stats: Stat[];
}

export function StatsBar({ stats }: StatsBarProps) {
  const { dark, colors } = useTheme();

  return (
    <View style={styles.container}>
      {stats.map((s, i) => {
        const isEven = i % 2 === 0;
        const valueColor = isEven ? brandColors.blue : brandColors.copper;
        const bgColor = isEven
          ? dark
            ? 'rgba(70,118,172,0.06)'
            : 'rgba(70,118,172,0.03)'
          : dark
            ? 'rgba(172,109,70,0.06)'
            : 'rgba(172,109,70,0.03)';

        return (
          <View
            key={s.label}
            style={[
              styles.stat,
              { backgroundColor: bgColor },
              i < stats.length - 1 && {
                borderRightWidth: 1,
                borderRightColor: colors.borderThin,
              },
            ]}
          >
            <Text style={[styles.value, { color: valueColor }]}>
              {s.value}
              {s.suffix && (
                <Text style={{ color: colors.textTertiary, fontSize: 13, fontWeight: '500' }}>
                  {s.suffix}
                </Text>
              )}
            </Text>
            <Text style={[styles.label, { color: colors.textTertiary }]}>
              {s.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 2,
  },
  value: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: mono,
    lineHeight: 24,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    fontFamily: mono,
    lineHeight: 15,
    marginTop: 4,
  },
});
