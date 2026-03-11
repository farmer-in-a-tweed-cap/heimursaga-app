import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Image, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Share, Alert } from 'react-native';
// SafeAreaView no longer needed – NavBar handles top inset
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useApi } from '@/hooks/useApi';
import { NavBar } from '@/components/ui/NavBar';
import { HCard } from '@/components/ui/HCard';
import { Avatar } from '@/components/ui/Avatar';
import { ImagePlaceholder } from '@/components/ui/ImagePlaceholder';
import { MetadataGrid } from '@/components/ui/MetadataGrid';
import { SectionDivider } from '@/components/ui/SectionDivider';
import { commentsApi, bookmarksApi } from '@/services/api';
import { Svg, Path } from 'react-native-svg';
import { QuickSponsorButton } from '@/components/ui/QuickSponsorButton';
import { TopoBackground } from '@/components/ui/TopoBackground';
import { mono, heading, colors as brandColors, borders } from '@/theme/tokens';
import type { Entry, Comment } from '@/types/api';

export default function EntryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { dark, colors } = useTheme();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [commentText, setCommentText] = useState('');
  const [bookmarked, setBookmarked] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);

  const { data: entry, loading, refetch: refetchEntry } = useApi<Entry>(
    id ? `/posts/${id}` : null,
  );
  const { data: commentsData, refetch: refetchComments } = useApi<{ data: Comment[]; count: number }>(
    id ? `/posts/${id}/comments` : null,
  );

  // Fetch sibling entries from the same expedition
  const tripId = entry?.trip?.id;
  const { data: expeditionData } = useApi<{ entries?: { id: string; title?: string; place?: string; expeditionDay?: number }[] }>(
    tripId ? `/trips/${tripId}` : null,
  );
  const siblingEntries = (expeditionData?.entries ?? [])
    .filter((e) => e.id !== id)
    .slice(0, 2);

  const comments = commentsData?.data ?? [];

  useEffect(() => {
    if (entry?.bookmarked != null) setBookmarked(entry.bookmarked);
  }, [entry?.bookmarked]);

  const handleShare = () => {
    Share.share({ url: `https://heimursaga.com/entry/${id}` });
  };

  const handleBookmark = async () => {
    if (!isAuthenticated) {
      router.push('/(auth)/login');
      return;
    }
    if (bookmarkLoading || !id) return;
    setBookmarkLoading(true);
    setBookmarked(prev => !prev);
    try {
      await bookmarksApi.toggleEntry(id);
    } catch {
      setBookmarked(prev => !prev);
    } finally {
      setBookmarkLoading(false);
    }
  };

  const handlePostComment = useCallback(async () => {
    if (!commentText.trim() || !id) return;
    try {
      await commentsApi.createComment(id, commentText.trim());
      setCommentText('');
      refetchComments();
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to post comment');
    }
  }, [commentText, id, refetchComments]);

  if (loading || !entry) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <NavBar onBack={() => router.back()} />
        <ActivityIndicator color={brandColors.copper} style={styles.loader} />
      </View>
    );
  }

  const metadataItems = [
    { label: 'DATE', value: entry.createdAt ? new Date(entry.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—' },
    { label: 'LOCATION', value: entry.place ?? '—' },
    ...(entry.lat != null && entry.lon != null
      ? [{ label: 'COORDINATES', value: `${Math.abs(entry.lat).toFixed(2)}${entry.lat >= 0 ? 'N' : 'S'} / ${Math.abs(entry.lon).toFixed(2)}${entry.lon >= 0 ? 'E' : 'W'}` }]
      : []),
    ...(entry.entryNumber != null ? [{ label: 'ENTRY #', value: String(entry.entryNumber) }] : []),
    ...(entry.expeditionDay != null ? [{ label: 'DAY', value: String(entry.expeditionDay) }] : []),
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TopoBackground topOffset={53} />
      <NavBar onBack={() => router.back()} />

      <ScrollView>
        {/* Hero image with overlay */}
        <View style={styles.heroWrap}>
          {entry.media?.[0] ? (
            <Image
              source={{ uri: entry.media[0].original || entry.media[0].thumbnail || entry.media[0].url }}
              style={styles.heroImage}
              resizeMode="cover"
            />
          ) : (
            <ImagePlaceholder height={240} />
          )}
          <View style={styles.heroOverlay}>
            <Text style={styles.heroType}>
              JOURNAL ENTRY{entry.expeditionDay ? ` · DAY ${entry.expeditionDay}` : ''}
            </Text>
            <Text style={styles.heroTitle}>{entry.title}</Text>
            <TouchableOpacity
              style={styles.heroAuthor}
              onPress={() => router.push(`/explorer/${entry.author.username}`)}
            >
              <Avatar size={20} name={entry.author.username} />
              <Text style={styles.heroAuthorText}>
                {entry.author.username}
                {entry.trip ? ` · ${entry.trip.title}` : ''}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Action bar */}
        <View style={[styles.actionBar, { borderTopColor: colors.border, borderBottomColor: colors.border, backgroundColor: colors.card }]}>
          <TouchableOpacity style={[styles.actionBtn, { borderRightWidth: 1, borderRightColor: colors.borderThin }]}>
            <Text style={[styles.actionText, { color: colors.textTertiary }]}>
              {comments.length} NOTES
            </Text>
          </TouchableOpacity>
          {user && entry.author && user.username === entry.author.username && (
            <TouchableOpacity
              style={[styles.iconBtn, { borderRightWidth: 1, borderRightColor: colors.borderThin }]}
              onPress={() => router.push(`/entry/edit/${id}`)}
            >
              <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={colors.textTertiary} strokeWidth={2}>
                <Path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <Path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </Svg>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.iconBtn, { borderRightWidth: 1, borderRightColor: colors.borderThin }]} onPress={handleShare}>
            <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={colors.textTertiary} strokeWidth={2}>
              <Path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13" />
            </Svg>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={handleBookmark}>
            <Svg
              width={14}
              height={14}
              viewBox="0 0 24 24"
              fill={bookmarked ? brandColors.copper : 'none'}
              stroke={bookmarked ? brandColors.copper : colors.textTertiary}
              strokeWidth={2}
            >
              <Path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </Svg>
          </TouchableOpacity>
        </View>

        {/* Metadata grid */}
        <View style={styles.contentWrap}>
          {metadataItems.length > 0 && (
            <View style={styles.metadataWrap}>
              <MetadataGrid items={metadataItems} />
            </View>
          )}

          {/* Body */}
          {entry.content && (
            <Text style={[styles.bodyText, { color: colors.text }]}>
              {entry.content}
            </Text>
          )}

          {/* Photos */}
          {entry.media && entry.media.length > 0 && (
            entry.media.map((m, idx) => {
              const uri = m.original || m.thumbnail || m.url;
              if (!uri) return null;
              return (
                <View key={m.id || idx}>
                  <View style={[styles.photoWrap, { borderColor: colors.border }]}>
                    <Image source={{ uri }} style={styles.photoImage} resizeMode="cover" />
                  </View>
                  {m.caption ? (
                    <Text style={[styles.photoCaption, { color: colors.textTertiary }]}>
                      {m.caption}
                    </Text>
                  ) : entry.media!.length > 1 ? (
                    <Text style={[styles.photoCaption, { color: colors.textTertiary }]}>
                      {idx + 1} of {entry.media!.length}
                    </Text>
                  ) : null}
                </View>
              );
            })
          )}
        </View>

        {/* Quick Sponsor */}
        {entry.author?.creator && entry.author?.stripeAccountConnected && user?.username !== entry.author.username && (
          <View style={styles.quickSponsorWrap}>
            <QuickSponsorButton
              entryId={entry.id}
              authorUsername={entry.author.username}
              onSuccess={refetchEntry}
            />
          </View>
        )}

        {/* Comments */}
        <View style={styles.contentWrap}>
          <View style={styles.commentsHeader}>
            <Text style={[styles.commentsTitle, { color: colors.text }]}>
              NOTES ({comments.length})
            </Text>
            <View style={[styles.commentsLine, { backgroundColor: colors.border }]} />
          </View>

          {comments.map((comment) => (
            <HCard key={comment.id}>
              <View style={styles.commentCard}>
                <View style={styles.commentTop}>
                  <View style={styles.commentAuthor}>
                    <Avatar size={22} name={comment.author?.username ?? '?'} imageUrl={comment.author?.picture} />
                    <Text style={styles.commentUsername}>{comment.author?.username ?? 'Unknown'}</Text>
                  </View>
                  <Text style={[styles.commentTime, { color: colors.textTertiary }]}>
                    {new Date(comment.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </Text>
                </View>
                <Text style={[styles.commentBody, { color: colors.text }]}>
                  {comment.content}
                </Text>
                {(comment.replies?.length ?? 0) > 0 && (
                  comment.replies!.map((reply) => (
                    <View key={reply.id} style={styles.replyCard}>
                      <View style={styles.commentTop}>
                        <View style={styles.commentAuthor}>
                          <Avatar size={18} name={reply.author?.username ?? '?'} imageUrl={reply.author?.picture} />
                          <Text style={styles.commentUsername}>{reply.author?.username ?? 'Unknown'}</Text>
                        </View>
                        <Text style={[styles.commentTime, { color: colors.textTertiary }]}>
                          {new Date(reply.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </Text>
                      </View>
                      <Text style={[styles.commentBody, { color: colors.text }]}>
                        {reply.content}
                      </Text>
                    </View>
                  ))
                )}
                <View style={styles.commentActions}>
                  <Text style={styles.replyBtn}>Reply</Text>
                </View>
              </View>
            </HCard>
          ))}

          {/* Comment input */}
          <View style={[styles.inputRow, { borderColor: colors.border }]}>
            <TextInput
              style={[styles.commentInput, { color: colors.text }]}
              placeholder="Write a note..."
              placeholderTextColor={colors.textTertiary}
              value={commentText}
              onChangeText={setCommentText}
            />
            <TouchableOpacity style={styles.postBtn} onPress={handlePostComment}>
              <Text style={styles.postBtnText}>POST</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Related entries */}
        {entry.trip && siblingEntries.length > 0 && (
          <View style={styles.relatedWrap}>
            <View style={styles.relatedHeader}>
              <Text style={[styles.relatedTitle, { color: colors.text }]}>FROM THIS EXPEDITION</Text>
              <View style={[styles.relatedLine, { backgroundColor: colors.border }]} />
            </View>
            <View style={styles.relatedCards}>
              {siblingEntries.map((sibling) => (
                <TouchableOpacity
                  key={sibling.id}
                  style={{ flex: 1 }}
                  onPress={() => router.push(`/entry/${sibling.id}`)}
                >
                  <HCard style={{ flex: 1 }}>
                    <View style={styles.relatedCardBody}>
                      {sibling.expeditionDay != null && (
                        <Text style={styles.relatedDay}>DAY {sibling.expeditionDay}</Text>
                      )}
                      <Text style={[styles.relatedLoc, { color: colors.text }]} numberOfLines={2}>
                        {sibling.title || sibling.place || 'Entry'}
                      </Text>
                    </View>
                  </HCard>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <View style={styles.spacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loader: { flex: 1 },
  heroWrap: {
    position: 'relative',
    minHeight: 240,
  },
  heroImage: {
    width: '100%',
    height: 240,
  },
  heroOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(32,32,32,0.65)',
    justifyContent: 'flex-end',
    padding: 16,
  },
  heroType: {
    fontFamily: mono,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.9,
    color: brandColors.copper,
    marginBottom: 8,
  },
  heroTitle: {
    fontFamily: heading,
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    lineHeight: 30,
  },
  heroAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  heroAuthorText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  actionBar: {
    flexDirection: 'row',
    borderTopWidth: borders.thick,
    borderBottomWidth: borders.thick,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  actionText: {
    fontFamily: mono,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  iconBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentWrap: {
    padding: 16,
  },
  metadataWrap: {
    marginBottom: 20,
  },
  photoWrap: {
    borderWidth: borders.thick,
    marginBottom: 6,
  },
  photoImage: {
    width: '100%',
    height: 220,
  },
  bodyText: {
    fontSize: 15,
    lineHeight: 28,
    marginTop: 16,
    marginBottom: 32,
  },
  commentsHeader: {
    marginBottom: 12,
  },
  commentsTitle: {
    fontFamily: mono,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.66,
    marginBottom: 6,
  },
  commentsLine: {
    height: 2,
  },
  commentCard: {
    padding: 12,
    paddingHorizontal: 14,
  },
  commentTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  commentAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  commentUsername: {
    fontSize: 12,
    color: brandColors.copper,
    fontWeight: '600',
  },
  commentTime: {
    fontFamily: mono,
    fontSize: 12,
  },
  commentBody: {
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
    marginLeft: 30,
  },
  commentActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 14,
    marginTop: 8,
  },
  replyBtn: {
    fontFamily: mono,
    fontSize: 12,
    fontWeight: '600',
    color: brandColors.copper,
  },
  inputRow: {
    flexDirection: 'row',
    borderWidth: borders.thick,
  },
  commentInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  },
  postBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: brandColors.copper,
    borderLeftWidth: borders.thick,
    borderLeftColor: brandColors.copper,
    justifyContent: 'center',
  },
  postBtnText: {
    fontFamily: mono,
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  quickSponsorWrap: { paddingHorizontal: 16, paddingBottom: 8 },
  spacer: { height: 32 },
  photoCaption: { fontSize: 12, fontStyle: 'italic', textAlign: 'center', marginBottom: 20 },
  relatedWrap: { padding: 16, paddingTop: 20 },
  relatedHeader: { marginBottom: 12 },
  relatedTitle: { fontFamily: mono, fontSize: 11, fontWeight: '700', letterSpacing: 0.66, marginBottom: 6 },
  relatedLine: { height: 2 },
  relatedCards: { flexDirection: 'row', gap: 8 },
  relatedCardBody: { padding: 8, paddingHorizontal: 10 },
  relatedDay: { fontFamily: mono, fontSize: 12, fontWeight: '700', color: brandColors.copper },
  relatedLoc: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  replyCard: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#e5e5e5' },
});
