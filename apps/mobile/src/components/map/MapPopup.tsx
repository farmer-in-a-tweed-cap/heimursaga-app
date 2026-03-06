import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { mono, colors as brandColors, borders } from '@/theme/tokens';

export interface MapPopupProps {
  title: string;
  place?: string;
  date?: string;
  onClose: () => void;
  onPress: () => void;
  actionLabel: string;
}

export function MapPopup({ title, place, date, onClose, onPress, actionLabel }: MapPopupProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.wrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {title}
        </Text>
        <TouchableOpacity onPress={onClose} hitSlop={8}>
          <Text style={[styles.close, { color: colors.textTertiary }]}>{'\u2715'}</Text>
        </TouchableOpacity>
      </View>
      {place && (
        <Text style={[styles.place, { color: colors.textSecondary }]} numberOfLines={1}>
          {place}
        </Text>
      )}
      {date && (
        <Text style={[styles.date, { color: colors.textTertiary }]}>
          {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </Text>
      )}
      <TouchableOpacity style={styles.btn} onPress={onPress}>
        <Text style={styles.btnText}>{actionLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    borderWidth: borders.thick,
    padding: 10,
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontFamily: mono,
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  close: {
    fontSize: 14,
    fontWeight: '600',
  },
  place: {
    fontFamily: mono,
    fontSize: 12,
    marginTop: 2,
  },
  date: {
    fontFamily: mono,
    fontSize: 11,
    marginTop: 2,
  },
  btn: {
    marginTop: 8,
    backgroundColor: brandColors.copper,
    paddingVertical: 10,
    alignItems: 'center',
  },
  btnText: {
    fontFamily: mono,
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.6,
  },
});
