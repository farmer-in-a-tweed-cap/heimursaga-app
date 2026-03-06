import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { mono } from '@/theme/tokens';

interface ImagePlaceholderProps {
  height?: number;
  label?: string;
}

export function ImagePlaceholder({ height = 160, label }: ImagePlaceholderProps) {
  const { dark } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          height,
          backgroundColor: dark ? '#1a2332' : '#d4c8b8',
        },
      ]}
    >
      {label ? (
        <Text
          style={[
            styles.label,
            { color: dark ? '#3a4a5a' : '#b5a898' },
          ]}
        >
          {label}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    fontFamily: mono,
  },
});
