import React from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { Svg, Circle, Path } from 'react-native-svg';
import { useTheme } from '@/theme/ThemeContext';
import { borders, spacing } from '@/theme/tokens';

interface SearchBarProps {
  placeholder?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  onSubmitEditing?: () => void;
}

export function SearchBar({
  placeholder = 'Search...',
  value,
  onChangeText,
  onSubmitEditing,
}: SearchBarProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.inputBackground,
          borderColor: colors.border,
        },
      ]}
    >
      <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={colors.textTertiary} strokeWidth={2}>
        <Circle cx={11} cy={11} r={8} />
        <Path d="M21 21l-4.35-4.35" />
      </Svg>
      <TextInput
        style={[styles.input, { color: colors.text }]}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmitEditing}
        returnKeyType="search"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: borders.thick,
  },
  input: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    padding: 0,
  },
});
