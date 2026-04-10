import React from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeContext';
import { Avatar } from '@/components/ui/Avatar';
import { StarRating } from '@/components/ui/StarRating';
import { HCard } from '@/components/ui/HCard';
import { mono, heading, colors as brandColors, borders } from '@/theme/tokens';
import type { BlueprintReview } from '@/types/api';

interface ReviewsListProps {
  reviews: BlueprintReview[];
  averageRating?: number;
  ratingsCount?: number;
  loading?: boolean;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();
}

export function ReviewsList({ reviews, averageRating, ratingsCount, loading }: ReviewsListProps) {
  const { colors } = useTheme();
  const router = useRouter();

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator color={brandColors.copper} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Summary header */}
      <View style={styles.summaryWrap}>
        <HCard>
          <View style={styles.summary}>
            {(averageRating ?? 0) > 0 ? (
              <>
                <Text style={[styles.avgNumber, { color: colors.text }]}>
                  {averageRating!.toFixed(1)}
                </Text>
                <StarRating rating={averageRating ?? 0} size={18} />
                <Text style={[styles.countText, { color: colors.textTertiary }]}>
                  {ratingsCount ?? 0} review{(ratingsCount ?? 0) !== 1 ? 's' : ''}
                </Text>
              </>
            ) : (
              <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
                No reviews yet
              </Text>
            )}
          </View>
        </HCard>
      </View>

      {/* Individual reviews */}
      {reviews.map((review) => (
        <View key={review.id} style={styles.reviewWrap}>
          <HCard>
            <View style={styles.reviewInner}>
              <View style={styles.reviewHeader}>
                <Pressable
                  style={styles.authorRow}
                  onPress={() => review.explorer?.username && router.push(`/explorer/${review.explorer.username}`)}
                >
                  <Avatar
                    size={28}
                    name={review.explorer?.username ?? '?'}
                    imageUrl={review.explorer?.picture}
                  />
                  <Text style={styles.reviewAuthor} numberOfLines={1}>
                    {review.explorer?.username ?? 'Anonymous'}
                  </Text>
                </Pressable>
                <StarRating rating={review.rating} size={13} />
              </View>
              {review.text ? (
                <Text style={[styles.reviewText, { color: colors.textSecondary }]}>
                  {review.text}
                </Text>
              ) : null}
              <Text style={[styles.reviewDate, { color: colors.textTertiary }]}>
                {formatDate(review.createdAt)}
              </Text>
            </View>
          </HCard>
        </View>
      ))}

      {reviews.length === 0 && (averageRating ?? 0) === 0 && (
        <Text style={[styles.emptyText, { color: colors.textTertiary, paddingHorizontal: 16, marginTop: 12 }]}>
          Be the first to review this blueprint.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 24,
  },
  loadingWrap: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  summaryWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
  },
  avgNumber: {
    fontFamily: mono,
    fontSize: 22,
    fontWeight: '700',
  },
  countText: {
    fontFamily: mono,
    fontSize: 12,
    fontWeight: '600',
  },
  emptyText: {
    fontFamily: mono,
    fontSize: 13,
    fontWeight: '600',
  },
  reviewWrap: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  reviewInner: {
    padding: 14,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  reviewAuthor: {
    fontFamily: mono,
    fontSize: 12,
    fontWeight: '600',
    color: brandColors.copper,
  },
  reviewText: {
    fontFamily: heading,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  reviewDate: {
    fontFamily: mono,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginTop: 8,
  },
});
