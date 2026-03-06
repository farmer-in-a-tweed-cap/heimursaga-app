import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeContext';
import { HCard } from '@/components/ui/HCard';
import { StatusHeader } from '@/components/ui/StatusHeader';
import { Avatar } from '@/components/ui/Avatar';
import { mono, colors as brandColors } from '@/theme/tokens';
import { Svg, Path, Circle } from 'react-native-svg';
import type { Entry } from '@/types/api';

interface EntryListItemProps {
  entry: Entry;
  showAuthor?: boolean;
}

export function EntryListItem({ entry, showAuthor = false }: EntryListItemProps) {
  const { dark, colors } = useTheme();
  const router = useRouter();

  const dateStr = entry.createdAt
    ? new Date(entry.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()
    : '';

  const expeditionRef = entry.trip ?? entry.expedition;

  return (
    <TouchableOpacity onPress={() => router.push(`/entry/${entry.id}`)}>
      <HCard>
        <StatusHeader
          status={(entry.trip?.status as 'active' | 'planned' | 'completed' | 'cancelled') ?? 'active'}
          label="JOURNAL ENTRY"
          right={dateStr}
        />
        <View style={styles.body}>
          {entry.content && (
            <View style={styles.quoteWrap}>
              <Text style={[styles.quoteMark, { color: colors.borderThin }]}>"</Text>
              <Text
                style={[styles.excerpt, { color: colors.text }]}
                numberOfLines={3}
              >
                {entry.content}
              </Text>
            </View>
          )}

          <View style={[styles.footer, { borderTopColor: colors.borderThin }]}>
            {showAuthor && (
              <View style={styles.authorRow}>
                <Avatar size={18} name={entry.author.username} />
                <Text style={styles.authorName}>{entry.author.username}</Text>
                {expeditionRef && (
                  <Text style={[styles.expeditionName, { color: colors.textTertiary }]}>
                    · {expeditionRef.title}
                  </Text>
                )}
              </View>
            )}
            {entry.place && (
              <View style={styles.locationRow}>
                <Svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke={colors.textTertiary} strokeWidth={3}>
                  <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <Circle cx={12} cy={10} r={3} />
                </Svg>
                <Text style={[styles.location, { color: colors.textTertiary }]}>
                  {entry.place}
                </Text>
                {entry.lat != null && entry.lon != null && (
                  <>
                    <Text style={[styles.location, { color: colors.textTertiary }]}> · </Text>
                    <Text style={[styles.coords, { color: brandColors.blue }]}>
                      {Math.abs(entry.lat).toFixed(2)}{entry.lat >= 0 ? 'N' : 'S'} / {Math.abs(entry.lon).toFixed(2)}{entry.lon >= 0 ? 'E' : 'W'}
                    </Text>
                  </>
                )}
              </View>
            )}
          </View>
        </View>
      </HCard>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  body: {
    padding: 12,
    paddingTop: 12,
    paddingBottom: 10,
  },
  quoteWrap: {
    paddingLeft: 20,
    position: 'relative',
  },
  quoteMark: {
    position: 'absolute',
    left: 0,
    top: -4,
    fontSize: 32,
    fontFamily: 'Georgia',
    lineHeight: 32,
  },
  excerpt: {
    fontSize: 16,
    lineHeight: 26,
    fontStyle: 'italic',
  },
  footer: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  authorName: {
    fontSize: 13,
    color: brandColors.copper,
    fontWeight: '600',
  },
  expeditionName: {
    fontSize: 13,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  location: {
    fontFamily: mono,
    fontSize: 12,
    fontWeight: '600',
  },
  coords: {
    fontFamily: mono,
    fontSize: 12,
    fontWeight: '600',
  },
});
