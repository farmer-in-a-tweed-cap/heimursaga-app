import React, { useState } from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { mono } from '@/theme/tokens';

interface CoverImageProps {
  uri?: string;
  height?: number | '100%';
  label?: string;
}

export function CoverImage({ uri, height = 160, label }: CoverImageProps) {
  const { dark } = useTheme();
  const [imgError, setImgError] = useState(false);

  if (uri && !imgError) {
    return (
      <Image
        source={{ uri }}
        style={[styles.image, { height }]}
        resizeMode="cover"
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <View
      style={[
        styles.placeholder,
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
  image: {
    width: '100%',
  },
  placeholder: {
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
