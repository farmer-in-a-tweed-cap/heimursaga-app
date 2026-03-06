import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { mono } from '@/theme/tokens';

interface MessageBubbleProps {
  text: string;
  time: string;
  isMe: boolean;
}

export function MessageBubble({ text, time, isMe }: MessageBubbleProps) {
  const { dark, colors } = useTheme();

  const bubbleBg = isMe
    ? dark ? '#2a2a2a' : '#ffffff'
    : dark ? '#1a2a3a' : '#e8eef4';

  const bubbleBorder = isMe
    ? dark ? '#3a3a3a' : '#e5e5e5'
    : dark ? '#2a4060' : '#c8d8e8';

  return (
    <View style={[styles.row, isMe ? styles.rowRight : styles.rowLeft]}>
      <View style={[styles.bubble, { backgroundColor: bubbleBg, borderColor: bubbleBorder }]}>
        <Text style={[styles.text, { color: colors.text }]}>{text}</Text>
        <Text
          style={[
            styles.time,
            { color: colors.textTertiary },
            isMe ? styles.timeRight : styles.timeLeft,
          ]}
        >
          {time}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginBottom: 10,
  },
  rowRight: {
    alignItems: 'flex-end',
  },
  rowLeft: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
  },
  text: {
    fontSize: 16,
    lineHeight: 23,
  },
  time: {
    fontSize: 11,
    fontFamily: mono,
    fontWeight: '600',
    marginTop: 4,
  },
  timeRight: {
    textAlign: 'right',
  },
  timeLeft: {
    textAlign: 'left',
  },
});
