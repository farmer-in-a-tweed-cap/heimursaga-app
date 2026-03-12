import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { HCard } from '@/components/ui/HCard';
import { StatusHeader } from '@/components/ui/StatusHeader';
import { Avatar } from '@/components/ui/Avatar';
import { mono, heading, colors as brandColors } from '@/theme/tokens';
import { Svg, Path, Circle } from 'react-native-svg';
import type { Entry } from '@/types/api';

interface EntryCardMiniProps {
  entry: Entry;
  onPress: () => void;
  showAuthor?: boolean;
}

export function EntryCardMini({ entry, onPress, showAuthor = true }: EntryCardMiniProps) {
  const { dark, colors } = useTheme();

  const expeditionRef = entry.trip ?? entry.expedition;
  const dateStr = entry.createdAt
    ? new Date(entry.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()
    : '';
  const coverUrl = entry.coverImage || entry.media?.[0]?.thumbnail || entry.media?.[0]?.original || entry.media?.[0]?.url;

  const rightLabel = entry.expeditionDay != null
    ? `DAY ${entry.expeditionDay}`
    : entry.createdAt
      ? new Date(entry.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()
      : '';

  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.98 : 1 }] })}>
      <HCard>
        <StatusHeader
          status="planned"
          label="JOURNAL ENTRY"
          dotColor={brandColors.blue}
          right={rightLabel}
        />

        {/* Excerpt area with optional cover photo background */}
        {entry.content && (
          <View style={[styles.excerptWrap, { borderBottomWidth: 1, borderBottomColor: colors.borderThin }]}>
            {coverUrl && (
              <Image source={{ uri: coverUrl }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
            )}
            <View style={[
              StyleSheet.absoluteFillObject,
              {
                backgroundColor: coverUrl
                  ? (dark ? 'rgba(26,26,26,0.82)' : 'rgba(248,247,245,0.82)')
                  : (dark ? '#1a1a1a' : '#f8f7f5'),
              },
            ]} />
            <Text style={styles.quoteMark}>{'\u201C'}</Text>
            <Text
              style={[styles.excerpt, { color: dark ? '#e5e5e5' : '#202020' }]}
              numberOfLines={3}
            >
              {entry.content}
            </Text>
          </View>
        )}

        <View style={styles.body}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
            {entry.title}
          </Text>
          {showAuthor && (
            <View style={styles.authorRow}>
              <Avatar size={16} name={entry.author.username} imageUrl={entry.author.picture} pro={entry.author.creator} />
              <Text style={styles.authorName}>{entry.author.username}</Text>
              {expeditionRef && (
                <Text style={[styles.expeditionName, { color: colors.textTertiary }]}>
                  · {expeditionRef.title}
                </Text>
              )}
            </View>
          )}
          {entry.place && (
            <View style={styles.metaRow}>
              <Svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke={colors.textTertiary} strokeWidth={3}>
                <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <Circle cx={12} cy={10} r={3} />
              </Svg>
              <Text style={[styles.meta, { color: colors.textTertiary }]}>
                {entry.place}
              </Text>
            </View>
          )}
          {dateStr !== '' && (
            <Text style={[styles.date, { color: colors.textTertiary }]}>
              {dateStr}
            </Text>
          )}
        </View>
      </HCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  excerptWrap: {
    overflow: 'hidden',
    paddingHorizontal: 14,
    paddingVertical: 14,
    paddingLeft: 36,
  },
  quoteMark: {
    position: 'absolute',
    left: 14,
    top: 6,
    fontSize: 28,
    fontFamily: heading,
    lineHeight: 36,
    color: 'rgba(70,118,172,0.2)',
  },
  excerpt: {
    fontSize: 13,
    lineHeight: 19,
    fontStyle: 'italic',
  },
  body: {
    padding: 12,
    paddingHorizontal: 14,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  authorName: {
    fontSize: 11,
    color: brandColors.copper,
    fontWeight: '600',
  },
  expeditionName: {
    fontSize: 11,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  meta: {
    fontFamily: mono,
    fontSize: 12,
    fontWeight: '600',
  },
  date: {
    fontFamily: mono,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 6,
  },
});
