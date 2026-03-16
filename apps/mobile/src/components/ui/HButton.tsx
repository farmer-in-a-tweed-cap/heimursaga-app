import React from 'react';
import { Pressable, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors as brandColors, mono, borders } from '@/theme/tokens';

type Variant = 'copper' | 'blue' | 'destructive';

interface HButtonProps {
  children: string;
  variant?: Variant;
  outline?: boolean;
  small?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
  disabled?: boolean;
}

const variantColors: Record<Variant, string> = {
  copper: brandColors.copper,
  blue: brandColors.blue,
  destructive: brandColors.red,
};

export function HButton({
  children,
  variant = 'copper',
  outline,
  small,
  onPress,
  style,
  disabled,
}: HButtonProps) {
  const color = variantColors[variant];
  const bg = outline ? 'transparent' : color;
  const textColor = outline ? color : '#ffffff';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={children}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: bg,
          borderColor: color,
          paddingVertical: small ? 8 : 14,
          paddingHorizontal: small ? 16 : 24,
          opacity: pressed ? 0.8 : disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.label,
          {
            color: textColor,
            fontSize: small ? 12 : 14,
          },
        ]}
      >
        {children}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderWidth: borders.thick,
    borderRadius: borders.radius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: mono,
    fontWeight: '700',
    letterSpacing: 0.7,
  },
});
