import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import Svg, { Path, Defs, ClipPath, Rect } from 'react-native-svg';
import { colors as brandColors } from '@/theme/tokens';

const STAR_PATH =
  'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z';

interface StarRatingProps {
  rating: number;
  maxStars?: number;
  size?: number;
  interactive?: boolean;
  onRatingChange?: (rating: number) => void;
  color?: string;
  emptyColor?: string;
}

export function StarRating({
  rating,
  maxStars = 5,
  size = 16,
  interactive = false,
  onRatingChange,
  color = brandColors.copper,
  emptyColor = '#4a4a4a',
}: StarRatingProps) {
  const gap = Math.round(size * 0.15);

  const renderStar = (index: number) => {
    const starNum = index + 1;
    const fill = Math.min(1, Math.max(0, rating - index));

    const star = (
      <Svg key={index} width={size} height={size} viewBox="0 0 24 24">
        {/* Empty star (background) */}
        <Path d={STAR_PATH} fill={emptyColor} />
        {/* Filled star (clipped for partial fill) */}
        {fill > 0 && (
          <>
            <Defs>
              <ClipPath id={`clip-${index}`}>
                <Rect x={0} y={0} width={24 * fill} height={24} />
              </ClipPath>
            </Defs>
            <Path d={STAR_PATH} fill={color} clipPath={`url(#clip-${index})`} />
          </>
        )}
      </Svg>
    );

    if (interactive) {
      return (
        <Pressable
          key={index}
          onPress={() => onRatingChange?.(starNum)}
          hitSlop={4}
          accessibilityRole="button"
          accessibilityLabel={`Rate ${starNum} star${starNum > 1 ? 's' : ''}`}
        >
          {star}
        </Pressable>
      );
    }

    return star;
  };

  return (
    <View style={[styles.row, { gap }]} accessibilityLabel={`${rating} out of ${maxStars} stars`}>
      {Array.from({ length: maxStars }, (_, i) => renderStar(i))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
