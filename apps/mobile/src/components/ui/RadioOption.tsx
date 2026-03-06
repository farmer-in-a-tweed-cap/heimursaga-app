import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { colors as brandColors, mono } from '@/theme/tokens';

interface RadioOptionProps {
  label: string;
  description?: string;
  selected: boolean;
  onSelect: () => void;
}

export function RadioOption({ label, description, selected, onSelect }: RadioOptionProps) {
  const { colors } = useTheme();

  return (
    <TouchableOpacity style={styles.container} onPress={onSelect} activeOpacity={0.7}>
      <View
        style={[
          styles.outer,
          { borderColor: selected ? brandColors.copper : colors.border },
        ]}
      >
        {selected && <View style={styles.inner} />}
      </View>
      <View style={styles.textWrap}>
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
        {description && (
          <Text style={[styles.desc, { color: colors.textSecondary }]}>{description}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 6,
  },
  outer: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  inner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: brandColors.copper,
  },
  textWrap: {
    flex: 1,
  },
  label: {
    fontFamily: mono,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  desc: {
    fontSize: 13,
    marginTop: 2,
  },
});
