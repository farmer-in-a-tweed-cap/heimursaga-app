import React, { useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { colors as brandColors, mono } from '@/theme/tokens';

interface AvatarProps {
  size?: number;
  name: string;
  pro?: boolean;
  imageUrl?: string;
}

export function Avatar({ size = 32, name, pro, imageUrl }: AvatarProps) {
  const [imgError, setImgError] = useState(false);
  const initial = name.charAt(0).toUpperCase();
  const borderColor = pro ? brandColors.copper : brandColors.lightGray;
  const bw = size >= 48 ? 3 : 2;
  const innerSize = size - bw * 2;
  const showImage = imageUrl && !imgError;

  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderWidth: bw,
          borderColor,
        },
      ]}
      accessibilityLabel={`${name}'s avatar`}
      accessibilityRole="image"
    >
      {showImage ? (
        <Image
          source={{ uri: imageUrl }}
          style={{ width: innerSize, height: innerSize }}
          resizeMode="cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <Text
          style={[
            styles.initial,
            { fontSize: size * 0.38 },
          ]}
        >
          {initial}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    backgroundColor: brandColors.copper,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  initial: {
    color: '#fff',
    fontWeight: '700',
    fontFamily: mono,
  },
});
