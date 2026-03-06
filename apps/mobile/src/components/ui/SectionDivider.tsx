import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { mono, fontSize, spacing, borders, colors as brandColors } from '@/theme/tokens';

interface SectionDividerProps {
  title: string;
  action?: string;
  onAction?: () => void;
}

export function SectionDivider({ title, action, onAction }: SectionDividerProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container]}>
      <View style={styles.row}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        {action && (
          <TouchableOpacity onPress={onAction}>
            <Text style={styles.action}>{action}</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={[styles.line, { backgroundColor: colors.border }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  title: {
    fontFamily: mono,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.88,
  },
  action: {
    fontFamily: mono,
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: brandColors.copper,
  },
  line: {
    height: borders.thick,
    marginTop: 6,
  },
});
