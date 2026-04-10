import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { statusColors, mono } from '@/theme/tokens';

interface StatusHeaderProps {
  status: 'active' | 'planned' | 'completed' | 'cancelled' | 'published';
  label: string;
  right?: string;
  dotColor?: string;
  /** 'card' (default): gray bar with colored dot. 'detail': full status-colored bar, white text, no dot. */
  variant?: 'card' | 'detail';
  onRightPress?: () => void;
}

export function StatusHeader({ status, label, right, dotColor, variant = 'card', onRightPress }: StatusHeaderProps) {
  const { dark, colors } = useTheme();
  const isDetail = variant === 'detail';
  const barColor = dotColor ?? statusColors[status];

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isDetail ? barColor : colors.statusBar },
      ]}
    >
      <View style={styles.left}>
        {!isDetail && (
          <View style={[styles.dot, { backgroundColor: barColor }]} />
        )}
        <Text style={[styles.label, { color: isDetail ? '#ffffff' : colors.text }]} numberOfLines={1}>{label}</Text>
      </View>
      {right ? (
        onRightPress ? (
          <Pressable onPress={onRightPress} hitSlop={8} style={styles.rightPressable}>
            <Text
              style={[
                styles.right,
                !isDetail && styles.rightCard,
                { color: isDetail ? '#ffffff' : colors.textSecondary },
              ]}
              numberOfLines={1}
            >
              {right} ›
            </Text>
          </Pressable>
        ) : (
          <Text
            style={[
              styles.right,
              !isDetail && styles.rightCard,
              { color: isDetail ? 'rgba(255,255,255,0.7)' : colors.textSecondary },
            ]}
            numberOfLines={1}
          >
            {right}
          </Text>
        )
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  dot: {
    width: 8,
    height: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    fontFamily: mono,
    flexShrink: 1,
  },
  right: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: mono,
  },
  rightCard: {
    fontSize: 10,
    flexShrink: 0,
    marginLeft: 8,
  },
  rightPressable: {
    flexShrink: 0,
    marginLeft: 8,
  },
});
