import React, { forwardRef } from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { mono, borders } from '@/theme/tokens';

interface HTextFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
}

export const HTextField = forwardRef<TextInput, HTextFieldProps>(
  function HTextField({ label, ...inputProps }, ref) {
    const { colors, dark } = useTheme();

    return (
      <View style={styles.container}>
        <Text
          style={[
            styles.label,
            { color: colors.textSecondary },
          ]}
        >
          {label}
        </Text>
        <TextInput
          ref={ref}
          {...inputProps}
          accessibilityLabel={label}
          placeholderTextColor={dark ? '#4a4a4a' : '#b5bcc4'}
          style={[
            styles.input,
            {
              backgroundColor: colors.inputBackground,
              borderColor: colors.border,
              color: colors.text,
            },
          ]}
        />
      </View>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.7,
    fontFamily: mono,
    marginBottom: 6,
  },
  input: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: borders.thick,
    borderRadius: borders.radius,
    fontSize: 16,
  },
});
