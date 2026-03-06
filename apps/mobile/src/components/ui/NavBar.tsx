import React from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeContext';
import { colors as brandColors, mono, borders } from '@/theme/tokens';

interface NavBarProps {
  onBack?: () => void;
  title?: string;
  right?: React.ReactNode;
}

export function NavBar({ onBack, title, right }: NavBarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + 14,
          backgroundColor: colors.card,
          borderBottomColor: colors.border,
        },
      ]}
    >
      {onBack ? (
        <Pressable onPress={onBack} style={styles.backButton} hitSlop={{ top: 12, bottom: 12, left: 8, right: 24 }}>
          <Text style={styles.backText}>{'\u2190'} Back</Text>
        </Pressable>
      ) : (
        <View style={styles.spacer} />
      )}
      {title ? (
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      ) : null}
      {right || <View style={styles.spacer} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: borders.thick,
    minHeight: 50,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backText: {
    color: brandColors.copper,
    fontSize: 15,
    fontWeight: '700',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.9,
    fontFamily: mono,
  },
  spacer: {
    width: 48,
  },
});
