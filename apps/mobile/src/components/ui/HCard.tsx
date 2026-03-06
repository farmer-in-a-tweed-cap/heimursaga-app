import React from 'react';
import { View, ViewStyle, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { borders } from '@/theme/tokens';

interface HCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function HCard({ children, style }: HCardProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: borders.thick,
    borderRadius: borders.radius,
    marginBottom: 12,
    overflow: 'hidden',
  },
});
