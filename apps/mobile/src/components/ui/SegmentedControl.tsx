import React from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { colors as brandColors, mono, borders } from '@/theme/tokens';

interface SegmentedControlProps {
  options: string[];
  active: number;
  onSelect?: (index: number) => void;
  borderless?: boolean;
}

export function SegmentedControl({
  options,
  active,
  onSelect,
  borderless,
}: SegmentedControlProps) {
  const { dark, colors } = useTheme();

  return (
    <View
      style={[
        styles.container,
        !borderless && {
          borderWidth: borders.thick,
          borderColor: colors.border,
        },
      ]}
    >
      {options.map((opt, i) => {
        const isActive = i === active;
        return (
          <Pressable
            key={opt}
            onPress={() => onSelect?.(i)}
            style={[
              styles.option,
              {
                backgroundColor: isActive
                  ? brandColors.copper
                  : dark
                    ? brandColors.black
                    : brandColors.white,
              },
              i > 0 && {
                borderLeftWidth: borders.thick,
                borderLeftColor: colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.label,
                {
                  color: isActive
                    ? '#ffffff'
                    : dark
                      ? colors.textSecondary
                      : colors.textSecondary,
                },
              ]}
            >
              {opt}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
  },
  option: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.7,
    fontFamily: mono,
  },
});
