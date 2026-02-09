'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { InteractionButtons } from '@/app/components/InteractionButtons';
import { ViewLocationMap } from '@/app/components/ViewLocationMap';
import { InlineLocationMap } from '@/app/components/InlineLocationMap';
import { UserPlus, UserCheck, ExternalLink, Loader2, AlertTriangle } from 'lucide-react';
import { entryApi, commentApi, explorerApi, type Entry, type Comment } from '@/app/services/api';

export function JournalEntryPage() {
  const { entryId } = useParams<{ entryId: string }>();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);

  // API data state
  const [apiEntry, setApiEntry] = useState<Entry | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Comments state
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsHasMore, setCommentsHasMore] = useState(false);
  const [commentsCursor, setCommentsCursor] = useState<string | undefined>();
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  // Follow state
  const [isFollowingExplorer, setIsFollowingExplorer] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  // Bookmark state
  const [entryBookmarkLoading, setEntryBookmarkLoading] = useState(false);

  // Handle bookmark entry
  const handleBookmarkEntry = async () => {
    if (!entryId || entryBookmarkLoading) return;

    setEntryBookmarkLoading(true);
    try {
      await entryApi.bookmark(entryId);
    } catch (err) {
      console.error('Error bookmarking entry:', err);
    } finally {
      setEntryBookmarkLoading(false);
    }
  };

  // Handle follow/unfollow explorer
  const handleFollowExplorer = async (username: string) => {
    if (!isAuthenticated || !username) {
      router.push('/login');
      return;
    }
    setFollowLoading(true);
    try {
      if (isFollowingExplorer) {
        await explorerApi.unfollow(username);
        setIsFollowingExplorer(false);
      } else {
        await explorerApi.follow(username);
        setIsFollowingExplorer(true);
      }
    } catch (err) {
      console.error('Error following/unfollowing explorer:', err);
    } finally {
      setFollowLoading(false);
    }
  };

  // Fetch entry from API
  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      if (!entryId) return;
      setLoading(true);
      setNotFound(false);
      try {
        const data = await entryApi.getById(entryId);
        if (!cancelled) {
          setApiEntry(data);
          // Initialize follow state from API data
          if (data.followingAuthor !== undefined) {
            setIsFollowingExplorer(data.followingAuthor);
          }
        }
      } catch (err: any) {
        if (!cancelled) {
          if (err?.status === 404) {
            setNotFound(true);
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    fetchData();

    return () => {
      cancelled = true;
    };
  }, [entryId]);

  // Fetch comments when entry is loaded
  useEffect(() => {
    let cancelled = false;

    const fetchComments = async () => {
      if (!entryId || !apiEntry) return;
      setCommentsLoading(true);
      try {
        const response = await commentApi.getByEntryId(entryId);
        if (!cancelled) {
          setComments(response.data || []);
          setCommentsHasMore(response.hasMore || false);
          setCommentsCursor(response.nextCursor);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Error fetching comments:', err);
        }
      } finally {
        if (!cancelled) {
          setCommentsLoading(false);
        }
      }
    };
    fetchComments();

    return () => {
      cancelled = true;
    };
  }, [entryId, apiEntry]);

  // Load more comments
  const loadMoreComments = async () => {
    if (!entryId || !commentsCursor || commentsLoading) return;
    setCommentsLoading(true);
    try {
      const response = await commentApi.getByEntryId(entryId, 20, commentsCursor);
      setComments(prev => [...prev, ...(response.data || [])]);
      setCommentsHasMore(response.hasMore || false);
      setCommentsCursor(response.nextCursor);
    } catch (err) {
      console.error('Error loading more comments:', err);
    } finally {
      setCommentsLoading(false);
    }
  };

  // Submit a new comment
  const handleSubmitComment = async () => {
    const trimmedComment = newComment.trim();
    // Validate: not empty, within length limit, not already submitting
    if (!entryId || !trimmedComment || trimmedComment.length > 2000 || submittingComment) return;
    setSubmittingComment(true);
    try {
      const comment = await commentApi.create(entryId, trimmedComment);
      setComments(prev => [comment, ...prev]);
      setNewComment('');
      setShowCommentForm(false);
    } catch (err) {
      console.error('Error submitting comment:', err);
    } finally {
      setSubmittingComment(false);
    }
  };

  // Submit a reply to a comment
  const handleSubmitReply = async (parentId: string) => {
    const trimmedReply = replyText.trim();
    // Validate: not empty, within length limit, not already submitting
    if (!entryId || !trimmedReply || trimmedReply.length > 2000 || submittingComment) return;
    setSubmittingComment(true);
    try {
      const reply = await commentApi.create(entryId, trimmedReply, parentId);
      // Add the reply to the parent comment's replies array
      setComments(prev => prev.map(comment => {
        if (comment.id === parentId) {
          return {
            ...comment,
            replies: [...(comment.replies || []), reply]
          };
        }
        return comment;
      }));
      setReplyText('');
      setReplyingTo(null);
    } catch (err) {
      console.error('Error submitting reply:', err);
    } finally {
      setSubmittingComment(false);
    }
  };


  // Transform API entry data to match component format
  const transformApiEntry = (api: Entry) => {
    const wordCount = api.content ? api.content.split(/\s+/).length : 0;
    // Get lat/lon directly from entry (entries are distinct from waypoints)
    const lat = api.lat || 0;
    const lon = api.lon || 0;
    // Get author info
    const author = api.author || api.explorer;
    // Get expedition info - check both trip and expedition fields
    const expedition = api.trip || api.expedition;
    const expeditionId = expedition?.id || (expedition as any)?.publicId || '';

    return {
      id: api.id || api.publicId || '',
      entryNumber: api.entryNumber || 1,
      title: api.title,
      date: api.date || api.createdAt || '',
      lastModified: api.createdAt || '',
      publishedTime: api.createdAt ? new Date(api.createdAt).toLocaleTimeString() : '',

      explorerId: author?.username || '',
      explorerName: author?.username || 'Unknown', // Use username for display
      explorerPicture: author?.picture,
      journalId: '', // Not in API yet
      journalName: author?.name || author?.username || 'Unknown',

      expeditionId,
      expeditionTitle: expedition?.title || '',
      expeditionDay: api.expeditionDay || 1,
      expeditionTotalEntries: expedition?.entriesCount || 0,
      expeditionSponsorshipsEnabled: true, // Not in API yet

      location: api.place || 'Unknown location',
      coords: { lat, lng: lon },
      elevation: 0, // Not in API yet
      timezone: 'UTC', // Not in API yet
      weather: '', // Not in API yet

      content: api.content || '',

      media: api.media?.map((m, idx) => ({
        id: m.id || `media-${idx}`,
        type: 'image',
        url: m.original || m.url || '',
        thumbnail: m.thumbnail || m.url || '',
        caption: m.caption || '',
        altText: m.altText || '',
        credit: m.credit || '',
      })) || [],
      coverPhotoUrl: api.coverImage || api.media?.[0]?.original || api.media?.[0]?.url || '',

      tags: [] as string[], // Not in API yet
      category: 'standard',
      visibility: api.public ? 'public' : 'private',
      commentsEnabled: api.commentsEnabled ?? true,

      views: 0, // Not in API yet
      reactions: { heart: api.likesCount || 0, bookmark: api.bookmarksCount || 0, share: 0 },
      commentsCount: api.commentsCount || 0,

      entrySponsors: 0, // Not in API yet
      entryFunding: 0, // Not in API yet

      wordCount,
      readTime: Math.ceil(wordCount / 200),
      mediaSize: '0 MB',
      uploadBandwidth: '0 MB/s',

      // API flags
      liked: api.liked,
      bookmarked: api.bookmarked,
      createdByMe: api.createdByMe,
      sponsored: api.sponsored,
    };
  };

  // Transform entry data if we have API data
  const entry = apiEntry ? transformApiEntry(apiEntry) : null;

  // Check if user is entry owner
  const isOwner = isAuthenticated && entry && user?.username === entry.explorerId;

  // Loading state
  if (loading) {
    return (
      <div className="max-w-[1600px] mx-auto px-6 py-8">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#ac6d46]" />
          <span className="ml-3 text-[#616161]">Loading entry...</span>
        </div>
      </div>
    );
  }

  // Not found state
  if (notFound || !entry) {
    return (
      <div className="max-w-[1600px] mx-auto px-6 py-8">
        <div className="flex flex-col items-center justify-center py-20">
          <AlertTriangle className="h-12 w-12 text-[#ac6d46] mb-4" />
          <h1 className="text-2xl font-bold mb-2 dark:text-[#e5e5e5]">Entry Not Found</h1>
          <p className="text-[#616161] dark:text-[#b5bcc4] mb-6">The entry you're looking for doesn't exist or has been removed.</p>
          <Link
            href="/entries"
            className="px-6 py-3 bg-[#ac6d46] text-white hover:bg-[#8a5738] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] font-bold"
          >
            BROWSE ENTRIES
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto px-6 py-8">
      {/* Breadcrumb Navigation */}
      <div className="mb-6 text-xs font-mono text-[#b5bcc4] dark:text-[#b5bcc4]">
        <Link href="/explorers" className="hover:text-[#ac6d46]">EXPLORERS</Link>
        {' > '}
        <Link href={`/journal/${entry.explorerId}`} className="hover:text-[#ac6d46]">{entry.explorerName?.toUpperCase()}</Link>
        {entry.expeditionId && entry.expeditionTitle && (
          <>
            {' > '}
            <Link href={`/expedition/${entry.expeditionId}`} className="hover:text-[#ac6d46]">{entry.expeditionTitle.toUpperCase()}</Link>
          </>
        )}
        {' > '}
        <span className="text-[#4676ac] font-bold">{entry.title?.toUpperCase() || 'ENTRY'}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - Left & Center Columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Entry Header */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
            {/* Banner with optional cover photo background */}
            <div
              className="relative text-white p-6 border-b-2 border-[#202020] dark:border-[#616161] overflow-hidden"
              style={{
                backgroundColor: entry.coverPhotoUrl ? 'transparent' : undefined,
              }}
            >
              {/* Cover Photo Background */}
              {entry.coverPhotoUrl && (
                <>
                  <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{
                      backgroundImage: `url(${entry.coverPhotoUrl})`,
                    }}
                  />
                  {/* Dark overlay for text readability */}
                  <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/70 to-black/90" />
                </>
              )}

              {/* Content - positioned above background */}
              <div className="relative z-10">
                {!entry.coverPhotoUrl && (
                  <div className="absolute inset-0 -z-10 bg-[#202020] dark:bg-[#1a1a1a]" />
                )}

                {/* Badges */}
                <div className="flex items-center gap-2 mb-4 flex-wrap">
                  <span className="px-2 py-1 bg-[#ac6d46] text-white text-xs rounded-full">{entry.category.toUpperCase()}</span>
                  <span className="px-2 py-1 bg-[#616161] dark:bg-[#3a3a3a] text-white text-xs rounded-full">{entry.visibility.toUpperCase()}</span>
                  {entry.sponsored && (
                    <span className="px-2 py-1 bg-[#4676ac] text-white text-xs rounded-full">SPONSORED</span>
                  )}
                </div>

                {/* Title */}
                <h1 className="text-2xl lg:text-3xl font-bold mb-4 drop-shadow-lg">{entry.title}</h1>

                {/* Avatar and Metadata Row */}
                <div className="flex gap-4 items-center">
                  {/* Explorer Avatar */}
                  <Link href={`/journal/${entry.explorerId}`} className="flex-shrink-0">
                    <div className="w-16 h-16 border-2 border-[#ac6d46] overflow-hidden bg-[#202020] hover:border-[#4676ac] transition-all shadow-lg">
                      <img
                        src={entry.explorerPicture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${entry.explorerId}`}
                        alt={entry.explorerName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </Link>
                  
                  {/* Metadata Lines */}
                  <div className="flex flex-col justify-center">
                    <div className="text-sm text-[#e5e5e5] drop-shadow">
                      By <Link href={`/journal/${entry.explorerId}`} className="text-[#ac6d46] hover:text-[#d4976e] font-bold">{entry.explorerName}</Link>
                      {' • '}
                      <Link href={`/journal/${entry.explorerId}/journal/${entry.journalId}`} className="hover:text-[#ac6d46]">{entry.journalName}</Link>
                    </div>
                    {entry.expeditionId && entry.expeditionTitle && (
                      <div className="text-sm text-[#ac6d46] drop-shadow">
                        <Link href={`/expedition/${entry.expeditionId}`} className="hover:text-[#d4976e] font-bold">{entry.expeditionTitle}</Link>
                        {' • Day '}{entry.expeditionDay}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="p-4 flex flex-wrap gap-3 items-center justify-between border-b-2 border-[#202020] dark:border-[#616161]">
              {isOwner ? (
                <div className="flex flex-wrap gap-2">
                  <Link 
                    href={`/edit-entry/${entry.id}`}
                    className="px-4 py-2 bg-[#ac6d46] text-white hover:bg-[#8a5738] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] text-xs font-bold"
                  >
                    EDIT ENTRY
                  </Link>
                  <button className="px-4 py-2 border-2 border-[#616161] hover:bg-[#95a2aa] dark:hover:bg-[#2a2a2a] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#616161] text-xs dark:text-[#e5e5e5]">
                    CHANGE VISIBILITY
                  </button>
                </div>
              ) : (
                <InteractionButtons
                  type="entry"
                  itemId={entry.id}
                  expeditionId={entry.expeditionId}
                  sponsorshipsEnabled={entry.expeditionSponsorshipsEnabled}
                  explorerIsPro={true}
                  initialBookmarks={entry.reactions.bookmark}
                  isBookmarked={entry.bookmarked || false}
                  isBookmarkLoading={entryBookmarkLoading}
                  size="md"
                  showLabels={true}
                  onBookmark={handleBookmarkEntry}
                  onSponsor={() => entry.expeditionId ? router.push(`/sponsor/${entry.expeditionId}`) : undefined}
                />
              )}
              <div className="text-xs text-[#616161] dark:text-[#b5bcc4] font-mono">
                {entry.views.toLocaleString()} views
              </div>
            </div>

            {/* Entry Content */}
            <div className="p-6 lg:p-8">
              <div className="prose prose-sm max-w-none">
                {entry.content.split('\n\n').map((paragraph, idx) => (
                  <p key={idx} className="text-sm lg:text-base leading-relaxed text-[#202020] dark:text-[#e5e5e5] mb-4">
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div className="px-6 pb-6">
              <div className="flex flex-wrap gap-2">
                {entry.tags.map((tag) => (
                  <Link
                    key={tag}
                    href={`/entries`}
                    className="px-3 py-1 bg-[#b5bcc4] text-[#202020] text-xs hover:bg-[#ac6d46] hover:text-white transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46]"
                  >
                    #{tag}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Media Gallery */}
          {entry.media.length > 0 && (
            <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
              <div className="bg-[#616161] text-white p-4 border-b-2 border-[#202020] dark:border-[#616161] flex items-center justify-between">
                <h2 className="text-sm font-bold">MEDIA GALLERY ({entry.media.length})</h2>
                <span className="text-xs font-mono text-[#b5bcc4]">Total Size: {entry.mediaSize}</span>
              </div>

              {/* Main Image Display */}
              <div className="relative bg-[#202020] aspect-video">
                <div className="w-full h-full flex items-center justify-center">
                  {entry.media[activeMediaIndex]?.url ? (
                    <img
                      src={entry.media[activeMediaIndex].url}
                      alt={entry.media[activeMediaIndex].altText || entry.media[activeMediaIndex].caption || `Image ${activeMediaIndex + 1}`}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full bg-[#616161] flex items-center justify-center text-white text-sm">
                      No image available
                    </div>
                  )}
                </div>
                
                {/* Image Navigation */}
                {entry.media.length > 1 && (
                  <>
                    <button
                      onClick={() => setActiveMediaIndex(Math.max(0, activeMediaIndex - 1))}
                      disabled={activeMediaIndex === 0}
                      className="absolute left-4 top-1/2 -translate-y-1/2 px-4 py-2 bg-[#202020] text-white hover:bg-[#ac6d46] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
                    >
                      ←
                    </button>
                    <button
                      onClick={() => setActiveMediaIndex(Math.min(entry.media.length - 1, activeMediaIndex + 1))}
                      disabled={activeMediaIndex === entry.media.length - 1}
                      className="absolute right-4 top-1/2 -translate-y-1/2 px-4 py-2 bg-[#202020] text-white hover:bg-[#ac6d46] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
                    >
                      →
                    </button>
                  </>
                )}

                {/* Image Counter */}
                <div className="absolute bottom-4 right-4 px-3 py-1 bg-[#202020] text-white text-xs font-mono">
                  {activeMediaIndex + 1} / {entry.media.length}
                </div>
              </div>

              {/* Image Info */}
              {(entry.media[activeMediaIndex]?.caption || entry.media[activeMediaIndex]?.credit) && (
                <div className="p-4 bg-[#f5f5f5] dark:bg-[#2a2a2a] border-t-2 border-[#202020] dark:border-[#616161]">
                  {entry.media[activeMediaIndex].caption && (
                    <div className="text-sm text-[#202020] dark:text-[#e5e5e5] mb-2">{entry.media[activeMediaIndex].caption}</div>
                  )}
                  {entry.media[activeMediaIndex].credit && (
                    <div className="text-xs text-[#616161] dark:text-[#b5bcc4] font-mono">Photo: {entry.media[activeMediaIndex].credit}</div>
                  )}
                </div>
              )}

              {/* Thumbnail Strip */}
              {entry.media.length > 1 && (
                <div className="p-4 border-t border-[#b5bcc4] flex gap-2 overflow-x-auto">
                  {entry.media.map((item, idx) => (
                    <button
                      key={item.id}
                      onClick={() => setActiveMediaIndex(idx)}
                      className={`flex-shrink-0 w-20 h-20 border-2 ${
                        idx === activeMediaIndex ? 'border-[#4676ac]' : 'border-[#b5bcc4]'
                      } hover:border-[#8a5738] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#4676ac] overflow-hidden`}
                    >
                      {item.thumbnail || item.url ? (
                        <img
                          src={item.thumbnail || item.url}
                          alt={item.altText || item.caption || `Thumbnail ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-[#616161] flex items-center justify-center text-white text-xs">
                          {idx + 1}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Location Map */}
          <div className="bg-white border-2 border-[#202020]">
            <div className="bg-[#616161] text-white p-4 border-b-2 border-[#202020]">
              <h2 className="text-sm font-bold">ENTRY LOCATION</h2>
            </div>
            <div className="relative h-[300px] overflow-hidden">
              <InlineLocationMap
                lat={entry.coords.lat}
                lng={entry.coords.lng}
                locationName={entry.location}
                className="h-full"
              />

              {/* Location Info Overlay */}
              <div className="absolute bottom-4 left-4 bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-3 text-xs font-mono z-10">
                <div className="text-[#616161] dark:text-[#b5bcc4]">GPS Coordinates:</div>
                <div className="font-bold dark:text-[#e5e5e5]">{entry.coords.lat.toFixed(6)}°N</div>
                <div className="font-bold dark:text-[#e5e5e5]">{entry.coords.lng.toFixed(6)}°E</div>
                <div className="text-[#616161] dark:text-[#b5bcc4] mt-2">Elevation:</div>
                <div className="font-bold dark:text-[#e5e5e5]">{entry.elevation}m</div>
                <div className="text-[#616161] dark:text-[#b5bcc4] mt-2">Timezone:</div>
                <div className="font-bold dark:text-[#e5e5e5]">{entry.timezone}</div>
              </div>
            </div>
            <div className="p-4 bg-[#f5f5f5] dark:bg-[#2a2a2a] border-t-2 border-[#202020] dark:border-[#616161] flex gap-2 flex-wrap">
{entry.expeditionId && (
                <Link
                  href={`/expedition/${entry.expeditionId}`}
                  className="px-4 py-2 border-2 border-[#202020] dark:border-[#616161] text-[#202020] dark:text-[#e5e5e5] hover:bg-[#202020] hover:text-white dark:hover:bg-[#3a3a3a] transition-all text-xs font-bold whitespace-nowrap"
                >
                  VIEW ON EXPEDITION MAP
                </Link>
              )}
              <a
                href={`https://www.google.com/maps?q=${entry.coords.lat},${entry.coords.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 border-2 border-[#202020] dark:border-[#616161] text-[#202020] dark:text-[#e5e5e5] hover:bg-[#202020] hover:text-white dark:hover:bg-[#3a3a3a] transition-all text-xs font-bold whitespace-nowrap flex items-center gap-2"
              >
                OPEN IN GOOGLE MAPS
                <ExternalLink size={14} />
              </a>
              <button
                onClick={() => setShowMapModal(true)}
                className="px-4 py-2 border-2 border-[#202020] dark:border-[#616161] text-[#202020] dark:text-[#e5e5e5] hover:bg-[#202020] hover:text-white dark:hover:bg-[#3a3a3a] transition-all text-xs font-bold whitespace-nowrap"
              >
                VIEW INTERACTIVE MAP
              </button>
            </div>
          </div>

          {/* Entry Notes Section */}
          {entry.commentsEnabled && (
            <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
              <div className="bg-[#4676ac] text-white p-4 border-b-2 border-[#202020] dark:border-[#616161] flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold font-mono tracking-wide">ENTRY NOTES</h2>
                  <div className="text-xs font-mono text-[#b5bcc4] mt-0.5">{entry.commentsCount} {entry.commentsCount === 1 ? 'NOTE' : 'NOTES'} LOGGED</div>
                </div>
                {isAuthenticated && (
                  <button
                    onClick={() => setShowCommentForm(!showCommentForm)}
                    className="px-4 py-2 bg-[#ac6d46] hover:bg-[#8a5738] border-2 border-[#202020] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] text-xs font-bold font-mono"
                  >
                    {showCommentForm ? '✕ CANCEL' : '+ LOG NOTE'}
                  </button>
                )}
              </div>

              {/* Note Form */}
              {showCommentForm && isAuthenticated && (
                <div className="p-4 bg-[#f5f5f5] dark:bg-[#2a2a2a] border-b-2 border-[#202020] dark:border-[#616161]">
                  <div className="text-xs font-mono text-[#616161] dark:text-[#b5bcc4] mb-2">
                    LOGGING AS: <span className="text-[#ac6d46] font-bold">{user?.username?.toUpperCase()}</span> • {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}
                  </div>
                  <textarea
                    className="w-full px-3 py-2 border-2 border-[#b5bcc4] dark:border-[#3a3a3a] focus:border-[#ac6d46] outline-none text-sm mb-1 dark:bg-[#202020] dark:text-[#e5e5e5] font-mono"
                    rows={3}
                    placeholder="Share your thoughts on this entry..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value.slice(0, 2000))}
                    maxLength={2000}
                  />
                  <div className="flex justify-between items-center mb-2">
                    <span className={`text-xs font-mono ${newComment.length > 1800 ? 'text-red-500' : 'text-[#616161] dark:text-[#b5bcc4]'}`}>
                      {newComment.length}/2000
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSubmitComment}
                      disabled={submittingComment || !newComment.trim()}
                      className="px-4 py-2 bg-[#ac6d46] text-white hover:bg-[#8a5738] border-2 border-[#202020] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] text-xs font-bold font-mono disabled:opacity-50 disabled:active:scale-100"
                    >
                      {submittingComment ? 'LOGGING...' : 'LOG NOTE'}
                    </button>
                    <button
                      onClick={() => {
                        setShowCommentForm(false);
                        setNewComment('');
                      }}
                      className="px-4 py-2 border-2 border-[#616161] dark:border-[#3a3a3a] dark:text-[#e5e5e5] hover:bg-[#b5bcc4] dark:hover:bg-[#3a3a3a] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#616161] text-xs font-mono"
                    >
                      CANCEL
                    </button>
                  </div>
                </div>
              )}

              {/* Notes List - Individual cards per note */}
              {commentsLoading && comments.length === 0 ? (
                <div className="p-4 text-center text-[#616161] dark:text-[#b5bcc4] font-mono text-sm">
                  <Loader2 className="h-5 w-5 animate-spin inline-block mr-2" />
                  Loading notes...
                </div>
              ) : comments.length === 0 ? (
                <div className="p-6 text-center">
                  <div className="text-[#616161] dark:text-[#b5bcc4] font-mono text-sm mb-1">NO NOTES LOGGED YET</div>
                  <div className="text-[#b5bcc4] dark:text-[#616161] text-xs">Be the first explorer to leave a note on this entry.</div>
                </div>
              ) : (
                <div className="p-4 space-y-3">
                  {comments.map((comment, index) => (
                    <div key={comment.id} className="border border-[#b5bcc4] dark:border-[#3a3a3a] bg-white dark:bg-[#1a1a1a]">
                      {/* Note Card Header */}
                      <div className="flex items-center justify-between px-3 py-2 border-b border-[#e5e5e5] dark:border-[#3a3a3a]">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-[#616161] dark:text-[#b5bcc4]">
                            #{comments.length - index}
                          </span>
                          {comment.author.creator && (
                            <span className="px-2 py-0.5 bg-[#ac6d46] text-white text-xs font-mono font-bold rounded-full">AUTHOR</span>
                          )}
                        </div>
                        <span className="text-xs font-mono text-[#616161] dark:text-[#b5bcc4]">
                          {new Date(comment.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}
                        </span>
                      </div>

                      {/* Note Content */}
                      <div className="px-3 py-3">
                        <div className="flex items-start gap-3">
                          <Link href={`/journal/${comment.author.username}`} className="flex-shrink-0">
                            <div className="w-10 h-10 border-2 border-[#4676ac] overflow-hidden bg-[#616161] hover:border-[#ac6d46] transition-colors">
                              <img
                                src={comment.author.picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.author.username}`}
                                alt={comment.author.username}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          </Link>
                          <div className="flex-1">
                            <Link href={`/journal/${comment.author.username}`} className="font-bold text-sm hover:text-[#ac6d46] dark:text-[#e5e5e5] font-mono">
                              {comment.author.username}
                            </Link>
                            <p className="text-sm text-[#202020] dark:text-[#e5e5e5] mt-1 leading-relaxed">{comment.content}</p>

                            {/* Respond Button */}
                            {isAuthenticated && (
                              <button
                                onClick={() => {
                                  setReplyingTo(replyingTo === comment.id ? null : comment.id);
                                  setReplyText('');
                                }}
                                className="mt-3 text-xs text-[#616161] dark:text-[#b5bcc4] hover:text-[#ac6d46] dark:hover:text-[#ac6d46] font-mono font-bold transition-all"
                              >
                                {replyingTo === comment.id ? '✕ CANCEL' : '↳ RESPOND'}
                              </button>
                            )}

                            {/* Inline Response Form */}
                            {replyingTo === comment.id && isAuthenticated && (
                              <div className="mt-3 p-3 bg-[#f5f5f5] dark:bg-[#2a2a2a] border-2 border-[#b5bcc4] dark:border-[#3a3a3a]">
                                <div className="text-xs font-mono text-[#616161] dark:text-[#b5bcc4] mb-2">
                                  RESPONDING TO: <span className="text-[#4676ac] font-bold">{comment.author.username.toUpperCase()}</span>
                                </div>
                                <textarea
                                  className="w-full px-3 py-2 border-2 border-[#b5bcc4] dark:border-[#3a3a3a] focus:border-[#ac6d46] outline-none text-xs mb-1 dark:bg-[#202020] dark:text-[#e5e5e5] font-mono"
                                  rows={2}
                                  placeholder="Write your response..."
                                  value={replyText}
                                  onChange={(e) => setReplyText(e.target.value.slice(0, 2000))}
                                  maxLength={2000}
                                />
                                <div className="flex justify-between items-center mb-2">
                                  <span className={`text-xs font-mono ${replyText.length > 1800 ? 'text-red-500' : 'text-[#616161] dark:text-[#b5bcc4]'}`}>
                                    {replyText.length}/2000
                                  </span>
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleSubmitReply(comment.id)}
                                    disabled={submittingComment || !replyText.trim()}
                                    className="px-3 py-1.5 bg-[#ac6d46] text-white hover:bg-[#8a5738] border-2 border-[#202020] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] text-xs font-mono font-bold disabled:opacity-50 disabled:active:scale-100"
                                  >
                                    {submittingComment ? 'LOGGING...' : 'LOG RESPONSE'}
                                  </button>
                                  <button
                                    onClick={() => {
                                      setReplyingTo(null);
                                      setReplyText('');
                                    }}
                                    className="px-3 py-1.5 border-2 border-[#616161] dark:border-[#3a3a3a] dark:text-[#e5e5e5] hover:bg-[#b5bcc4] dark:hover:bg-[#3a3a3a] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#616161] text-xs font-mono"
                                  >
                                    CANCEL
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Responses Section - Contained within the note card */}
                      {comment.replies && comment.replies.length > 0 && (
                        <div className="border-t border-[#e5e5e5] dark:border-[#3a3a3a] bg-[#fafafa] dark:bg-[#1e1e1e] px-3 py-2">
                          <div className="ml-8 pl-3 border-l-2 border-[#b5bcc4] dark:border-[#616161]">
                            <div className="text-xs font-mono text-[#616161] dark:text-[#b5bcc4] font-bold mb-2">
                              {comment.replies.length} {comment.replies.length === 1 ? 'RESPONSE' : 'RESPONSES'}
                            </div>
                            <div className="space-y-2">
                              {comment.replies.map((reply) => (
                                <div key={reply.id} className="flex items-start gap-2">
                                  <Link href={`/journal/${reply.author.username}`} className="flex-shrink-0">
                                    <div className="w-6 h-6 border border-[#4676ac] overflow-hidden bg-[#616161] hover:border-[#ac6d46] transition-colors">
                                      <img
                                        src={reply.author.picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${reply.author.username}`}
                                        alt={reply.author.username}
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                  </Link>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <Link href={`/journal/${reply.author.username}`} className="font-bold text-xs hover:text-[#ac6d46] dark:text-[#e5e5e5] font-mono">
                                        {reply.author.username}
                                      </Link>
                                      <span className="text-xs text-[#616161] dark:text-[#b5bcc4] font-mono">
                                        {new Date(reply.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()}
                                      </span>
                                    </div>
                                    <p className="text-xs text-[#202020] dark:text-[#e5e5e5] mt-0.5 leading-relaxed">{reply.content}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {commentsHasMore && (
                <div className="p-4 border-t-2 border-[#202020] dark:border-[#616161]">
                  <button
                    onClick={loadMoreComments}
                    disabled={commentsLoading}
                    className="w-full py-2 border-2 border-[#202020] dark:border-[#616161] dark:text-[#e5e5e5] hover:bg-[#4676ac] hover:text-white hover:border-[#4676ac] dark:hover:bg-[#4676ac] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#4676ac] text-xs font-mono font-bold disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
                  >
                    {commentsLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                    <span>↓ LOAD MORE NOTES</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Entry Navigation */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-4">
            <div className="flex items-center justify-center gap-4">
              {entry.expeditionId ? (
                <Link
                  href={`/expedition/${entry.expeditionId}`}
                  className="px-6 py-3 bg-[#616161] dark:bg-[#3a3a3a] text-white hover:bg-[#ac6d46] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] text-sm whitespace-nowrap"
                >
                  VIEW EXPEDITION
                </Link>
              ) : (
                <Link
                  href={`/journal/${entry.explorerId}`}
                  className="px-6 py-3 bg-[#616161] dark:bg-[#3a3a3a] text-white hover:bg-[#ac6d46] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] text-sm whitespace-nowrap"
                >
                  VIEW EXPLORER
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Expedition Context - Only show for expedition entries */}
          {entry.expeditionId && entry.expeditionTitle && (
            <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-4">
              <h3 className="text-xs font-bold mb-3 border-b border-[#202020] dark:border-[#616161] pb-2 dark:text-[#e5e5e5]">
                EXPEDITION CONTEXT
              </h3>
              <div>
                <Link href={`/expedition/${entry.expeditionId}`} className="block mb-3">
                  <h4 className="font-bold text-sm hover:text-[#ac6d46] transition-all mb-1 dark:text-[#e5e5e5]">
                    {entry.expeditionTitle}
                  </h4>
                </Link>
                <div className="text-xs space-y-2 text-[#616161] dark:text-[#b5bcc4] font-mono">
                  <div className="flex justify-between">
                    <span>Expedition Day:</span>
                    <span className="font-bold text-[#202020] dark:text-[#e5e5e5]">{entry.expeditionDay}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Entries:</span>
                    <span className="font-bold text-[#202020] dark:text-[#e5e5e5]">{entry.expeditionTotalEntries}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>This Entry:</span>
                    <span className="font-bold text-[#4676ac]">#{entry.entryNumber}</span>
                  </div>

                  {/* Sponsorship Impact Rows (only if sponsorships enabled) */}
                  {entry.expeditionSponsorshipsEnabled && entry.entrySponsors !== undefined && (
                    <>
                      <div className="h-px bg-[#b5bcc4] dark:bg-[#3a3a3a] my-2" />
                      <div className="flex justify-between">
                        <span>Entry Sponsors:</span>
                        <span className="font-bold text-[#ac6d46]">{entry.entrySponsors}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Entry Funding:</span>
                        <span className="font-bold text-[#ac6d46]">${entry.entryFunding.toLocaleString()}</span>
                      </div>
                    </>
                  )}
                </div>
                <Link
                  href={`/expedition/${entry.expeditionId}`}
                  className="block w-full mt-4 py-2.5 bg-[#ac6d46] text-white text-center hover:bg-[#8a5738] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] text-xs font-bold whitespace-nowrap"
                >
                  VIEW ALL ENTRIES
                </Link>
              </div>
            </div>
          )}

          {/* Explorer Profile */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-4">
            <h3 className="text-xs font-bold mb-3 border-b border-[#202020] dark:border-[#616161] pb-2 dark:text-[#e5e5e5]">
              ABOUT THE EXPLORER
            </h3>
            <div>
              <div className="flex items-center gap-3 mb-3">
                <Link href={`/journal/${entry.explorerId}`} className="flex-shrink-0">
                  <div className="w-16 h-16 border-2 border-[#ac6d46] overflow-hidden bg-[#616161] hover:border-[#4676ac] transition-all">
                    <img
                      src={entry.explorerPicture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${entry.explorerId}`}
                      alt={entry.explorerName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </Link>
                <div>
                  <Link href={`/journal/${entry.explorerId}`} className="font-bold hover:text-[#ac6d46] transition-all focus-visible:outline-none focus-visible:underline dark:text-[#e5e5e5]">
                    {entry.explorerName}
                  </Link>
                  <div className="text-xs text-[#616161] dark:text-[#b5bcc4] font-mono">{entry.explorerId}</div>
                </div>
              </div>
              <Link
                href={`/journal/${entry.explorerId}/journal/${entry.journalId}`}
                className="block text-xs text-[#616161] dark:text-[#b5bcc4] mb-3 hover:text-[#ac6d46]"
              >
                Journal: {entry.journalName}
              </Link>
              <div className="flex gap-2">
                <Link
                  href={`/journal/${entry.explorerId}`}
                  className="flex-1 py-2.5 bg-[#4676ac] text-white text-center hover:bg-[#365a87] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#4676ac] text-xs font-bold whitespace-nowrap"
                >
                  VIEW JOURNAL
                </Link>
                <button
                  onClick={() => handleFollowExplorer(entry.explorerId)}
                  disabled={followLoading}
                  className={`px-4 py-2.5 border-2 transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:active:scale-100 text-xs font-bold whitespace-nowrap flex items-center gap-2 ${
                    isFollowingExplorer
                      ? 'border-[#4676ac] bg-[#4676ac] text-white hover:bg-[#365a87] focus-visible:ring-[#4676ac]'
                      : 'border-[#202020] dark:border-[#616161] text-[#202020] dark:text-[#e5e5e5] hover:bg-[#ac6d46] hover:border-[#ac6d46] hover:text-white focus-visible:ring-[#ac6d46]'
                  }`}
                >
                  {followLoading ? (
                    <Loader2 size={14} strokeWidth={2.5} className="animate-spin" />
                  ) : isFollowingExplorer ? (
                    <UserCheck size={14} strokeWidth={2.5} />
                  ) : (
                    <UserPlus size={14} strokeWidth={2.5} />
                  )}
                  {isFollowingExplorer ? 'FOLLOWING' : 'FOLLOW'}
                </button>
              </div>
            </div>
          </div>

          {/* Related Entries */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-4">
            <h3 className="text-xs font-bold mb-3 border-b border-[#202020] dark:border-[#616161] pb-2 dark:text-[#e5e5e5]">
              LOCATION DATA
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <div className="text-[#616161] dark:text-[#b5bcc4] mb-1">Location Name:</div>
                <div className="font-bold text-sm dark:text-[#e5e5e5]">{entry.location}</div>
              </div>
              <div>
                <div className="text-[#616161] dark:text-[#b5bcc4] mb-1">GPS Coordinates:</div>
                <div className="font-mono font-bold dark:text-[#e5e5e5]">
                  {entry.coords.lat.toFixed(6)}°, {entry.coords.lng.toFixed(6)}°
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[#616161] dark:text-[#b5bcc4] mb-1">Elevation:</div>
                  <div className="font-bold dark:text-[#e5e5e5]">{entry.elevation}m</div>
                </div>
                <div>
                  <div className="text-[#616161] dark:text-[#b5bcc4] mb-1">Timezone:</div>
                  <div className="font-bold dark:text-[#e5e5e5]">{entry.timezone}</div>
                </div>
              </div>
              <div>
                <div className="text-[#616161] dark:text-[#b5bcc4] mb-1">Weather:</div>
                <div className="font-bold dark:text-[#e5e5e5]">{entry.weather}</div>
              </div>
              <div className="pt-2 border-t border-[#b5bcc4] dark:border-[#3a3a3a]">
                <button 
                  onClick={() => setShowMapModal(true)}
                  className="w-full py-2 bg-[#4676ac] text-white hover:bg-[#365a87] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#4676ac] font-bold"
                >
                  VIEW ON MAP
                </button>
              </div>
            </div>
          </div>

          {/* Time Data */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-4">
            <h3 className="text-xs font-bold mb-3 border-b border-[#202020] dark:border-[#616161] pb-2 dark:text-[#e5e5e5]">
              TIME DATA
            </h3>
            <div className="space-y-3 text-xs font-mono">
              <div>
                <div className="text-[#616161] dark:text-[#b5bcc4] mb-1">Entry Date:</div>
                <div className="font-bold dark:text-[#e5e5e5]">{entry.date}</div>
              </div>
              <div>
                <div className="text-[#616161] dark:text-[#b5bcc4] mb-1">Published:</div>
                <div className="font-bold dark:text-[#e5e5e5]">{entry.date} {entry.publishedTime}</div>
              </div>
              <div>
                <div className="text-[#616161] dark:text-[#b5bcc4] mb-1">Last Modified:</div>
                <div className="font-bold dark:text-[#e5e5e5]">{entry.lastModified}</div>
              </div>
              {entry.expeditionId && (
                <div>
                  <div className="text-[#616161] dark:text-[#b5bcc4] mb-1">Expedition Day:</div>
                  <div className="font-bold text-[#4676ac]">Day {entry.expeditionDay}</div>
                </div>
              )}
              <div>
                <div className="text-[#616161] dark:text-[#b5bcc4] mb-1">Local Timezone:</div>
                <div className="font-bold dark:text-[#e5e5e5]">{entry.timezone}</div>
              </div>
              <div>
                <div className="text-[#616161] dark:text-[#b5bcc4] mb-1">Read Time:</div>
                <div className="font-bold dark:text-[#e5e5e5]">{entry.readTime} min</div>
              </div>
            </div>
          </div>

          {/* Entry Statistics */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-4">
            <h3 className="text-xs font-bold mb-3 border-b border-[#202020] dark:border-[#616161] pb-2 dark:text-[#e5e5e5]">
              ENTRY STATISTICS
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-[#616161] dark:text-[#b5bcc4]">Total Views</span>
                <span className="font-bold dark:text-[#e5e5e5]">{entry.views.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#616161] dark:text-[#b5bcc4]">Reactions</span>
                <span className="font-bold dark:text-[#e5e5e5]">{entry.reactions.heart + entry.reactions.bookmark}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#616161] dark:text-[#b5bcc4]">Notes</span>
                <span className="font-bold dark:text-[#e5e5e5]">{entry.commentsCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#616161] dark:text-[#b5bcc4]">Shares</span>
                <span className="font-bold dark:text-[#e5e5e5]">{entry.reactions.share}</span>
              </div>
              <div className="flex justify-between pt-3 border-t border-[#b5bcc4] dark:border-[#3a3a3a]">
                <span className="text-[#616161] dark:text-[#b5bcc4]">Media Files</span>
                <span className="font-bold dark:text-[#e5e5e5]">{entry.media.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#616161] dark:text-[#b5bcc4]">Word Count</span>
                <span className="font-bold dark:text-[#e5e5e5]">{entry.wordCount}</span>
              </div>
            </div>
          </div>

          {/* System Metadata */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-4">
            <h3 className="text-xs font-bold mb-3 border-b border-[#202020] dark:border-[#616161] pb-2 dark:text-[#e5e5e5]">
              SYSTEM METADATA
            </h3>
            <div className="text-xs font-mono space-y-2 text-[#616161] dark:text-[#b5bcc4]">
              <div>
                <span className="text-[#202020] dark:text-[#e5e5e5] font-bold">Entry ID:</span>
                <div className="text-xs break-all">{entry.id}</div>
              </div>
              <div>
                <span className="text-[#202020] dark:text-[#e5e5e5] font-bold">Published:</span>
                <div>{entry.date} {entry.publishedTime}</div>
              </div>
              <div>
                <span className="text-[#202020] dark:text-[#e5e5e5] font-bold">Last Modified:</span>
                <div>{entry.lastModified}</div>
              </div>
              <div>
                <span className="text-[#202020] dark:text-[#e5e5e5] font-bold">Media Storage:</span>
                <div>{entry.mediaSize}</div>
              </div>
              <div>
                <span className="text-[#202020] dark:text-[#e5e5e5] font-bold">Upload Speed:</span>
                <div>{entry.uploadBandwidth}</div>
              </div>
              <div>
                <span className="text-[#202020] dark:text-[#e5e5e5] font-bold">Visibility:</span>
                <div>{entry.visibility}</div>
              </div>
              <div>
                <span className="text-[#202020] dark:text-[#e5e5e5] font-bold">Notes:</span>
                <div>{entry.commentsEnabled ? 'Enabled' : 'Disabled'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Map Modal */}
      {showMapModal && (
        <ViewLocationMap
          lat={entry.coords.lat}
          lng={entry.coords.lng}
          locationName={entry.location}
          elevation={entry.elevation}
          onClose={() => setShowMapModal(false)}
        />
      )}
    </div>
  );
}