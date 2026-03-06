import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { colors as brandColors } from '@/theme/tokens';

interface CheckboxProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function Checkbox({ label, checked, onChange }: CheckboxProps) {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onChange(!checked)}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.box,
          {
            borderColor: checked ? brandColors.copper : colors.border,
            backgroundColor: checked ? brandColors.copper : 'transparent',
          },
        ]}
      >
        {checked && <Text style={styles.check}>✓</Text>}
      </View>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  box: {
    width: 14,
    height: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 11,
  },
  label: {
    fontSize: 15,
  },
});
