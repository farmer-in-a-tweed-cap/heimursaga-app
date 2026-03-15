import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { HCard } from '@/components/ui/HCard';
import { StatusHeader } from '@/components/ui/StatusHeader';
import { Avatar } from '@/components/ui/Avatar';
import { mono, heading, colors as brandColors } from '@/theme/tokens';
import { Svg, Path, Circle } from 'react-native-svg';
import type { Entry } from '@/types/api';

interface EntryCardFullProps {
  entry: Entry;
  onPress: () => void;
  showAuthor?: boolean;
}

export function EntryCardFull({ entry, onPress, showAuthor = true }: EntryCardFullProps) {
  const { dark, colors } = useTheme();

  const dateStr = entry.createdAt
    ? new Date(entry.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()
    : '';

  const expeditionRef = entry.trip ?? entry.expedition;
  const coverUrl = entry.coverImage || entry.media?.[0]?.thumbnail || entry.media?.[0]?.original || entry.media?.[0]?.url;

  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Journal entry: ${entry.title}`} style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.98 : 1 }] })}>
      <HCard>
        <StatusHeader
          status="planned"
          label="JOURNAL ENTRY"
          dotColor={brandColors.blue}
          right={dateStr}
        />

        {/* Title zone */}
        <View style={[styles.titleWrap, { borderBottomColor: colors.borderThin }]}>
          <Text style={[styles.title, { color: colors.text }]}>{entry.title}</Text>
          {expeditionRef && (
            <Text style={[styles.expeditionLabel, { color: colors.textTertiary }]} numberOfLines={1}>
              {expeditionRef.title}
            </Text>
          )}
        </View>

        {/* Quote zone with optional cover photo background */}
        {entry.content && (
          <View style={styles.quoteZone}>
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
            <Text style={[styles.quoteMark, { color: 'rgba(70,118,172,0.2)' }]}>{'\u201C'}</Text>
            <Text
              style={[styles.excerpt, { color: dark ? '#e5e5e5' : '#202020' }]}
              numberOfLines={3}
            >
              {entry.content}
            </Text>
          </View>
        )}

        {/* Footer zone — author + location */}
        <View style={[styles.footer, { borderTopColor: colors.borderThin }]}>
          {showAuthor && (
            <View style={styles.authorRow}>
              <Avatar size={22} name={entry.author.username} imageUrl={entry.author.picture} pro={entry.author.creator} />
              <Text style={styles.authorName}>{entry.author.username}</Text>
            </View>
          )}
          {entry.place && (
            <View style={styles.locationRow}>
              <Svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke={colors.textTertiary} strokeWidth={3}>
                <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <Circle cx={12} cy={10} r={3} />
              </Svg>
              <Text style={[styles.locationText, { color: colors.textTertiary }]}>
                {entry.place}
              </Text>
              {entry.lat != null && entry.lon != null && (
                <>
                  <Text style={[styles.locationText, { color: colors.textTertiary }]}> · </Text>
                  <Text style={[styles.coordsText, { color: brandColors.blue }]}>
                    {Math.abs(entry.lat).toFixed(2)}{entry.lat >= 0 ? 'N' : 'S'} / {Math.abs(entry.lon).toFixed(2)}{entry.lon >= 0 ? 'E' : 'W'}
                  </Text>
                </>
              )}
            </View>
          )}
        </View>
      </HCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  titleWrap: {
    padding: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 20,
  },
  expeditionLabel: {
    fontFamily: mono,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.4,
    marginTop: 4,
  },
  quoteZone: {
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
  },
  excerpt: {
    fontSize: 14,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  footer: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  authorName: {
    fontSize: 12,
    color: brandColors.copper,
    fontWeight: '600',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  locationText: {
    fontFamily: mono,
    fontSize: 12,
    fontWeight: '600',
  },
  coordsText: {
    fontFamily: mono,
    fontSize: 12,
    fontWeight: '600',
  },
});
