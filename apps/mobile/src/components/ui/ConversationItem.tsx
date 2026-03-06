import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { Avatar } from './Avatar';
import { Badge } from './Badge';
import { mono, colors as brandColors } from '@/theme/tokens';

interface ConversationItemProps {
  username: string;
  message: string;
  time: string;
  unreadCount: number;
  onPress?: () => void;
}

export function ConversationItem({
  username,
  message,
  time,
  unreadCount,
  onPress,
}: ConversationItemProps) {
  const { colors } = useTheme();

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <Avatar size={36} name={username} />
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.username}>{username}</Text>
          <Text style={[styles.time, { color: colors.textTertiary }]}>{time}</Text>
        </View>
        <View style={styles.bottomRow}>
          <Text
            style={[styles.message, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            {message}
          </Text>
          <Badge count={unreadCount} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  content: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  username: {
    fontSize: 14,
    color: brandColors.copper,
    fontWeight: '600',
  },
  time: {
    fontSize: 11,
    fontFamily: mono,
    fontWeight: '600',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 3,
  },
  message: {
    fontSize: 15,
    flex: 1,
    marginRight: 8,
  },
});
