import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { Avatar } from './Avatar';
import { mono, colors as brandColors } from '@/theme/tokens';

interface NotificationItemProps {
  username: string;
  action: string;
  detail?: string;
  amount?: string;
  time: string;
  unread: boolean;
  onPress?: () => void;
}

export function NotificationItem({
  username,
  action,
  detail,
  amount,
  time,
  unread,
  onPress,
}: NotificationItemProps) {
  const { dark, colors } = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.container,
        {
          backgroundColor: unread
            ? dark
              ? 'rgba(172,109,70,0.06)'
              : 'rgba(172,109,70,0.03)'
            : 'transparent',
        },
      ]}
    >
      <View style={styles.dot}>
        {unread && <View style={styles.dotInner} />}
      </View>
      <Avatar size={32} name={username} />
      <View style={styles.content}>
        <Text style={[styles.text, { color: colors.text }]}>
          <Text style={styles.username}>{username}</Text>{' '}
          {action}
          {amount && <Text style={styles.amount}> {amount}</Text>}
        </Text>
        {detail && (
          <Text style={[styles.detail, { color: colors.textTertiary }]}>
            {detail}
          </Text>
        )}
        <Text style={[styles.time, { color: colors.textTertiary }]}>{time}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  dot: {
    width: 6,
    paddingTop: 8,
    flexShrink: 0,
  },
  dotInner: {
    width: 6,
    height: 6,
    backgroundColor: brandColors.copper,
  },
  content: {
    flex: 1,
  },
  text: {
    fontSize: 15,
    lineHeight: 20,
  },
  username: {
    color: brandColors.copper,
    fontWeight: '600',
  },
  amount: {
    fontWeight: '700',
    color: brandColors.green,
    fontFamily: mono,
  },
  detail: {
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 2,
  },
  time: {
    fontSize: 12,
    fontFamily: mono,
    fontWeight: '600',
    marginTop: 4,
  },
});
