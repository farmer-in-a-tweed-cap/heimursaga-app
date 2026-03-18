'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { usePageOwner } from '@/app/context/PageOwnerContext';
import { InteractionButtons } from '@/app/components/InteractionButtons';
import { InlineLocationMap } from '@/app/components/InlineLocationMap';
import { QuickSponsorButton } from '@/app/components/QuickSponsorButton';
import { UserPlus, UserCheck, ExternalLink, Loader2, AlertTriangle, Trash2, Share2, ShieldAlert } from 'lucide-react';
import { ReportModal } from '@/app/components/ReportModal';
import { toast } from 'sonner';
import { entryApi, commentApi, explorerApi, type Entry, type Comment } from '@/app/services/api';
import { formatDateWithOptionalTime, formatDateTime } from '@/app/utils/dateFormat';

export function JournalEntryPage() {
  const { entryId } = useParams<{ entryId: string }>();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { setIsOwnContent } = usePageOwner();
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [showCommentForm, setShowCommentForm] = useState(false);

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

  // Edit/delete state
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);

  // Follow state
  const [isFollowingExplorer, setIsFollowingExplorer] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  // Delete state
  const [confirmingDeleteEntry, setConfirmingDeleteEntry] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Share state
  const [shareMenuOpen, setShareMenuOpen] = useState(false);

  // Bookmark state
  const [entryBookmarkLoading, setEntryBookmarkLoading] = useState(false);

  // Report state
  const [reportOpen, setReportOpen] = useState(false);

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

  // Handle delete entry
  const handleDeleteEntry = async () => {
    if (!entryId) return;
    setIsDeleting(true);
    try {
      await entryApi.delete(entryId);
      toast.success('Entry deleted');
      const expedition = apiEntry?.trip || apiEntry?.expedition;
      if (expedition?.id) {
        router.push(`/expedition/${expedition.id}`);
      } else {
        router.push('/');
      }
    } catch {
      toast.error('Failed to delete entry');
    } finally {
      setIsDeleting(false);
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
          if (err?.status === 404 || err?.status === 403) {
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

  // Edit a comment or reply
  const handleEditComment = async (commentId: string) => {
    const trimmed = editCommentText.trim();
    if (!trimmed || trimmed.length > 2000 || editSaving) return;
    setEditSaving(true);
    try {
      await commentApi.update(commentId, trimmed);
      // Update in local state (could be a top-level comment or a nested reply)
      setComments(prev => prev.map(c => {
        if (c.id === commentId) return { ...c, content: trimmed };
        if (c.replies) {
          return { ...c, replies: c.replies.map(r => r.id === commentId ? { ...r, content: trimmed } : r) };
        }
        return c;
      }));
      setEditingCommentId(null);
      setEditCommentText('');
    } catch (err) {
      console.error('Error editing comment:', err);
      toast.error('Failed to edit comment');
    } finally {
      setEditSaving(false);
    }
  };

  // Delete a comment or reply
  const handleDeleteComment = async (commentId: string, parentId?: string) => {
    setIsDeleteLoading(true);
    try {
      await commentApi.delete(commentId);
      if (parentId) {
        // Remove reply from parent
        setComments(prev => prev.map(c => {
          if (c.id === parentId && c.replies) {
            return { ...c, replies: c.replies.filter(r => r.id !== commentId) };
          }
          return c;
        }));
      } else {
        // Remove top-level comment
        setComments(prev => prev.filter(c => c.id !== commentId));
      }
      setConfirmDeleteId(null);
    } catch (err) {
      console.error('Error deleting comment:', err);
      toast.error('Failed to delete comment');
    } finally {
      setIsDeleteLoading(false);
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
      publishedAt: api.createdAt || '',
      lastModified: api.updatedAt || api.createdAt || '',

      explorerId: author?.username || '',
      explorerName: author?.username || 'Unknown', // Use username for display
      explorerPicture: author?.picture,
      explorerIsPro: api.author?.creator === true,
      journalId: '', // Not in API yet
      journalName: author?.name || author?.username || 'Unknown',

      expeditionId,
      expeditionTitle: expedition?.title || '',
      expeditionDay: api.expeditionDay || 1,
      expeditionTotalEntries: expedition?.entriesCount || 0,
      expeditionStatus: expedition?.status || '',
      expeditionSponsorshipsEnabled: (expedition?.goal ?? 0) > 0 || (expedition?.sponsorsCount ?? 0) > 0,
      expeditionGoal: expedition?.goal || 0,
      expeditionRaised: expedition?.raised || 0,
      expeditionSponsorsCount: expedition?.sponsorsCount || 0,
      stripeAccountConnected: api.author?.stripeAccountConnected === true,

      location: api.place || 'Unknown location',
      coords: { lat, lng: lon },
      entryType: (api.entryType || 'standard') as 'standard' | 'photo' | 'video' | 'data' | 'waypoint',
      metadata: (api.metadata || undefined) as { [key: string]: string | number | boolean | null | undefined } | undefined,

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
      visibility: api.visibility || (api.public ? 'public' : 'private'),
      commentsEnabled: api.commentsEnabled ?? true,

      views: 0, // Not in API yet
      reactions: { heart: api.likesCount || 0, bookmark: api.bookmarksCount || 0, share: 0 },
      commentsCount: api.commentsCount || 0,


      wordCount,
      readTime: Math.ceil(wordCount / 200),

      // API flags
      liked: api.liked,
      bookmarked: api.bookmarked,
      createdByMe: api.createdByMe,
      sponsored: api.sponsored,
      isMilestone: api.isMilestone || false,

      // Quick sponsor
      quickSponsorsCount: api.quickSponsorsCount || 0,
      quickSponsorsTotal: api.quickSponsorsTotal || 0,
    };
  };

  // Transform entry data if we have API data
  const entry = apiEntry ? transformApiEntry(apiEntry) : null;

  // Check if user is entry owner
  const isOwner = isAuthenticated && entry && user?.username === entry.explorerId;

  // Signal ownership to Header nav highlighting
  useEffect(() => {
    setIsOwnContent(!!isOwner);
    return () => setIsOwnContent(false);
  }, [isOwner, setIsOwnContent]);

  // Loading state
  if (loading) {
    return (
      <div className="max-w-[1600px] mx-auto px-6 py-12">
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
      <div className="max-w-[1600px] mx-auto px-6 py-12">
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
    <div className="max-w-[1600px] mx-auto px-6 py-12">
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
              className={`relative text-white p-6 border-b-2 border-[#202020] dark:border-[#616161] overflow-hidden ${!entry.coverPhotoUrl ? 'bg-[#202020] dark:bg-[#1a1a1a]' : ''}`}
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

                {/* Badges */}
                <div className="flex items-center gap-2 mb-4 flex-wrap">
                  {entry.isMilestone && (
                    <span className="px-2 py-1 bg-[#ac6d46] text-white text-xs font-bold rounded-full">MILESTONE</span>
                  )}
                  <span
                    className="px-2 py-1 text-white text-xs rounded-full"
                    style={{
                      backgroundColor: entry.entryType === 'photo' ? '#4676ac'
                        : entry.entryType === 'video' ? '#4676ac'
                        : entry.entryType === 'data' ? '#616161'
                        : '#4676ac'
                    }}
                  >
                    {entry.entryType === 'photo' ? 'PHOTO'
                      : entry.entryType === 'video' ? 'VIDEO'
                      : entry.entryType === 'data' ? 'DATA'
                      : 'STANDARD'}
                  </span>
                  <span className="px-2 py-1 bg-[#616161] dark:bg-[#3a3a3a] text-white text-xs rounded-full">{entry.visibility.toUpperCase()}</span>
                  {!entry.expeditionId && (
                    <span className="px-2 py-1 bg-[#3a3a3a] text-white text-xs rounded-full">STANDALONE</span>
                  )}
                  {entry.sponsored && (
                    <span className="px-2 py-1 bg-[#4676ac] text-white text-xs rounded-full">SPONSORED</span>
                  )}
                </div>

                {/* Title */}
                <h1 className="font-serif text-2xl lg:text-3xl font-bold mb-4 drop-shadow-lg" style={{ lineHeight: 1.15 }}>{entry.title}</h1>

                {/* Avatar and Metadata Row */}
                <div className="flex gap-4 items-center">
                  {/* Explorer Avatar */}
                  <Link href={`/journal/${entry.explorerId}`} className="flex-shrink-0">
                    <div className={`w-16 h-16 border-2 ${entry.explorerIsPro ? 'border-[#ac6d46]' : 'border-[#616161]'} overflow-hidden bg-[#202020] hover:border-[#4676ac] transition-all shadow-lg`}>
                      <Image
                        src={entry.explorerPicture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${entry.explorerId}`}
                        alt={entry.explorerName}
                        className="w-full h-full object-cover"
                        width={64}
                        height={64}
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
                  {entry.expeditionStatus !== 'cancelled' && (
                    <Link
                      href={`/edit-entry/${entry.id}`}
                      className="px-4 py-2 bg-[#ac6d46] text-white hover:bg-[#8a5738] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] text-xs font-bold"
                    >
                      EDIT ENTRY
                    </Link>
                  )}
                  <div className="relative">
                    <button
                      onClick={() => setShareMenuOpen(!shareMenuOpen)}
                      className="px-4 py-2 border-2 border-[#202020] dark:border-[#616161] hover:bg-[#202020] hover:text-white dark:hover:bg-[#616161] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#202020] text-xs font-bold flex items-center gap-2 dark:text-[#e5e5e5]"
                    >
                      <Share2 size={14} />
                      SHARE
                    </button>
                    {shareMenuOpen && (
                      <div className="absolute top-full mt-2 left-0 bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] shadow-lg z-50 min-w-[200px]">
                        <div className="border-b-2 border-[#202020] dark:border-[#616161] p-2 bg-[#616161] text-white">
                          <div className="text-xs font-bold font-mono">SHARE OPTIONS:</div>
                        </div>
                        <div className="p-2 space-y-1">
                          <button
                            onClick={() => { navigator.clipboard.writeText(window.location.href); setShareMenuOpen(false); }}
                            className="w-full text-left px-3 py-2 text-xs font-mono hover:bg-[#b5bcc4] dark:hover:bg-[#3a3a3a] transition-all dark:text-[#e5e5e5] flex items-center gap-2"
                          >
                            COPY LINK
                          </button>
                          <button
                            onClick={() => { window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}`, '_blank'); setShareMenuOpen(false); }}
                            className="w-full text-left px-3 py-2 text-xs font-mono hover:bg-[#b5bcc4] dark:hover:bg-[#3a3a3a] transition-all dark:text-[#e5e5e5] flex items-center gap-2"
                          >
                            SHARE ON X/TWITTER
                          </button>
                          <button
                            onClick={() => { window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`, '_blank'); setShareMenuOpen(false); }}
                            className="w-full text-left px-3 py-2 text-xs font-mono hover:bg-[#b5bcc4] dark:hover:bg-[#3a3a3a] transition-all dark:text-[#e5e5e5] flex items-center gap-2"
                          >
                            SHARE ON FACEBOOK
                          </button>
                          <button
                            onClick={() => { window.open(`mailto:?subject=Check this out&body=${encodeURIComponent(window.location.href)}`, '_blank'); setShareMenuOpen(false); }}
                            className="w-full text-left px-3 py-2 text-xs font-mono hover:bg-[#b5bcc4] dark:hover:bg-[#3a3a3a] transition-all dark:text-[#e5e5e5] flex items-center gap-2"
                          >
                            SHARE VIA EMAIL
                          </button>
                          <button
                            onClick={() => setShareMenuOpen(false)}
                            className="w-full text-left px-3 py-2 text-xs font-mono hover:bg-[#b5bcc4] dark:hover:bg-[#3a3a3a] transition-all text-[#616161] dark:text-[#b5bcc4] flex items-center gap-2"
                          >
                            CANCEL
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setConfirmingDeleteEntry(true)}
                    className="px-4 py-2 border-2 border-[#994040] text-[#994040] hover:bg-[#994040] hover:text-white transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#994040] text-xs font-bold flex items-center gap-2"
                  >
                    <Trash2 size={14} />
                    DELETE
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <InteractionButtons
                    type="entry"
                    itemId={entry.id}
                    expeditionId={entry.expeditionId}
                    expeditionStatus={entry.expeditionStatus}
                    sponsorshipsEnabled={entry.expeditionSponsorshipsEnabled}
                    explorerIsPro={entry.explorerIsPro}
                    stripeConnected={entry.stripeAccountConnected}
                    initialBookmarks={entry.reactions.bookmark}
                    isBookmarked={entry.bookmarked || false}
                    isBookmarkLoading={entryBookmarkLoading}
                    size="md"
                    showLabels={true}
                    onBookmark={handleBookmarkEntry}
                    onSponsor={() => entry.expeditionId ? router.push(`/sponsor/${entry.expeditionId}`) : undefined}
                  />
                  <button
                    onClick={() => setReportOpen(true)}
                    className="p-2 text-[#b5bcc4] hover:text-[#994040] transition-colors"
                    title="Report this entry"
                  >
                    <ShieldAlert size={14} />
                  </button>
                </div>
              )}
              <div className="text-xs text-[#616161] dark:text-[#b5bcc4] font-mono">
                {entry.views.toLocaleString()} views
              </div>
            </div>

            {/* Data Metrics (above content) */}
            {entry.entryType === 'data' && !!entry.metadata && (
              <div className="p-6 lg:p-8 pb-0 space-y-4">
                {/* Environmental Data */}
                {(entry.metadata.temperature != null || entry.metadata.humidity != null || entry.metadata.windSpeed != null || entry.metadata.pressure != null) && (
                  <div className="border-2 border-[#4676ac] p-4">
                    <div className="text-xs font-bold mb-3 text-[#4676ac]">ENVIRONMENTAL DATA</div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      {entry.metadata.temperature != null && (
                        <div>
                          <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">Temperature</div>
                          <div className="font-bold text-sm dark:text-[#e5e5e5] font-mono">{entry.metadata.temperature}°C</div>
                        </div>
                      )}
                      {entry.metadata.humidity != null && (
                        <div>
                          <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">Humidity</div>
                          <div className="font-bold text-sm dark:text-[#e5e5e5] font-mono">{entry.metadata.humidity}%</div>
                        </div>
                      )}
                      {entry.metadata.windSpeed != null && (
                        <div>
                          <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">Wind Speed</div>
                          <div className="font-bold text-sm dark:text-[#e5e5e5] font-mono">{entry.metadata.windSpeed} km/h</div>
                        </div>
                      )}
                      {entry.metadata.pressure != null && (
                        <div>
                          <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">Pressure</div>
                          <div className="font-bold text-sm dark:text-[#e5e5e5] font-mono">{entry.metadata.pressure} hPa</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Activity Metrics */}
                {(entry.metadata.distanceCovered != null || entry.metadata.elevationGain != null || entry.metadata.duration != null || entry.metadata.avgSpeed != null) && (
                  <div className="border-2 border-[#ac6d46] p-4">
                    <div className="text-xs font-bold mb-3 text-[#ac6d46]">ACTIVITY METRICS</div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      {entry.metadata.distanceCovered != null && (
                        <div>
                          <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">Distance</div>
                          <div className="font-bold text-sm dark:text-[#e5e5e5] font-mono">{entry.metadata.distanceCovered} km</div>
                        </div>
                      )}
                      {entry.metadata.elevationGain != null && (
                        <div>
                          <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">Elevation Gain</div>
                          <div className="font-bold text-sm dark:text-[#e5e5e5] font-mono">{entry.metadata.elevationGain} m</div>
                        </div>
                      )}
                      {entry.metadata.duration != null && (
                        <div>
                          <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">Duration</div>
                          <div className="font-bold text-sm dark:text-[#e5e5e5] font-mono">{entry.metadata.duration} hrs</div>
                        </div>
                      )}
                      {entry.metadata.avgSpeed != null && (
                        <div>
                          <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">Avg Speed</div>
                          <div className="font-bold text-sm dark:text-[#e5e5e5] font-mono">{entry.metadata.avgSpeed} km/h</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Photo-Essay Inline Gallery (above narrative) */}
            {entry.entryType === 'photo' && entry.media.length > 0 && (
              <div className="p-6 lg:p-8 pb-0 space-y-4">
                {entry.media.map((item, idx) => (
                  <div key={item.id || idx} className="border border-[#b5bcc4] dark:border-[#3a3a3a] overflow-hidden">
                    <div className="relative bg-[#202020]">
                      {item.url ? (
                        <Image
                          src={item.url}
                          alt={item.altText || item.caption || `Photo ${idx + 1}`}
                          className="w-full h-auto object-contain max-h-[600px]"
                          width={0}
                          height={0}
                          sizes="100vw"
                          style={{ width: '100%', height: 'auto' }}
                        />
                      ) : (
                        <div className="w-full h-48 bg-[#616161] flex items-center justify-center text-white text-sm">
                          No image available
                        </div>
                      )}
                    </div>
                    {(item.caption || item.credit) && (
                      <div className="bg-[#f5f5f5] dark:bg-[#2a2a2a] p-3 border-t border-[#b5bcc4] dark:border-[#3a3a3a]">
                        {item.caption && (
                          <div className="text-sm text-[#202020] dark:text-[#e5e5e5] italic">{item.caption}</div>
                        )}
                        {item.credit && (
                          <div className="text-xs text-[#616161] dark:text-[#b5bcc4] font-mono mt-1">Photo: {item.credit}</div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Video Embed */}
            {entry.entryType === 'video' && !!entry.metadata && !!(entry.metadata as Record<string, unknown>).videoUrl && (
              <div className="p-6 lg:p-8 pb-0">
                <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                  <iframe
                    className="absolute inset-0 w-full h-full"
                    src={(() => {
                      const url = String((entry.metadata as Record<string, unknown>).videoUrl);
                      // YouTube
                      const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/);
                      if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
                      // Vimeo
                      const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
                      if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
                      return url;
                    })()}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title="Video"
                  />
                </div>
              </div>
            )}

            {/* Entry Content */}
            <div className="p-6 lg:p-8">
              {!!(entry.metadata as Record<string, unknown>)?.loggedDuringPlanning && (
                <div className="flex items-center gap-2 mb-5 px-3 py-2 border-l-4 border-[#4676ac] bg-[#f5f7fa] dark:bg-[#1a1e24]">
                  <span className="text-[10px] font-bold font-mono tracking-wider text-[#4676ac]">LOGGED DURING EXPEDITION PLANNING</span>
                </div>
              )}
              {entry.entryType === 'data' && (
                <div className="text-xs font-bold mb-3 text-[#616161] dark:text-[#b5bcc4]">TECHNICAL NOTES</div>
              )}
              {entry.entryType === 'photo' && (
                <div className="text-xs font-bold mb-3 text-[#616161] dark:text-[#b5bcc4]">ESSAY NARRATIVE</div>
              )}
              {entry.entryType === 'video' && (
                <div className="text-xs font-bold mb-3 text-[#616161] dark:text-[#b5bcc4]">DESCRIPTION</div>
              )}
              <div className="prose prose-sm max-w-none">
                {entry.content.split('\n\n').map((paragraph, idx) => (
                  <p key={idx} className="font-serif font-normal text-[15px] lg:text-base text-[#202020] dark:text-[#e5e5e5] mb-4" style={{ lineHeight: 1.85 }}>
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

          {/* Media Gallery (hidden for photo type to avoid duplication with inline gallery) */}
          {entry.media.length > 0 && entry.entryType !== 'photo' && (
            <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
              <div className="bg-[#616161] text-white p-4 border-b-2 border-[#202020] dark:border-[#616161] flex items-center justify-between">
                <h2 className="text-sm font-bold">MEDIA GALLERY ({entry.media.length})</h2>
              </div>

              {/* Main Image Display */}
              <div className="relative bg-[#202020] aspect-video">
                <div className="w-full h-full flex items-center justify-center">
                  {entry.media[activeMediaIndex]?.url ? (
                    <Image
                      src={entry.media[activeMediaIndex].url}
                      alt={entry.media[activeMediaIndex].altText || entry.media[activeMediaIndex].caption || `Image ${activeMediaIndex + 1}`}
                      className="w-full h-full object-contain"
                      width={0}
                      height={0}
                      sizes="100vw"
                      style={{ width: '100%', height: '100%' }}
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
                        <Image
                          src={item.thumbnail || item.url}
                          alt={item.altText || item.caption || `Thumbnail ${idx + 1}`}
                          className="w-full h-full object-cover"
                          width={80}
                          height={80}
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
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
            <div className="bg-[#ac6d46] text-white p-4 border-b-2 border-[#202020] dark:border-[#616161]">
              <h2 className="text-sm font-bold">ENTRY LOCATION</h2>
            </div>
            <div className="px-4 py-3 border-b-2 border-[#202020] dark:border-[#616161] text-xs space-y-1">
              <div>
                <span className="text-[#616161] dark:text-[#b5bcc4]">Location: </span>
                <span className="font-bold dark:text-[#e5e5e5]">{entry.location}</span>
              </div>
              <div className="font-mono">
                <span className="text-[#616161] dark:text-[#b5bcc4]">GPS: </span>
                <span className="font-bold dark:text-[#e5e5e5]">{entry.coords.lat.toFixed(6)}°, {entry.coords.lng.toFixed(6)}°</span>
              </div>
            </div>
            <div className="relative overflow-hidden h-[300px]">
              <InlineLocationMap
                lat={entry.coords.lat}
                lng={entry.coords.lng}
                locationName={entry.location}
                className="h-full"
              />
            </div>
            {entry.entryType === 'standard' && !!entry.metadata && (
                  (() => {
                    const meta = entry.metadata as Record<string, unknown>;
                    const hasMetadata = meta.weather || meta.distanceTraveled != null || meta.mood || meta.expenses != null;
                    if (!hasMetadata) return null;
                    return (
                      <div className="px-4 py-3 border-t-2 border-[#202020] dark:border-[#616161] grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                        {meta.weather ? (
                          <div>
                            <div className="text-[#616161] dark:text-[#b5bcc4]">Weather:</div>
                            <div className="font-bold dark:text-[#e5e5e5]">{String(meta.weather)}</div>
                          </div>
                        ) : null}
                        {meta.distanceTraveled != null ? (
                          <div>
                            <div className="text-[#616161] dark:text-[#b5bcc4]">Distance:</div>
                            <div className="font-bold dark:text-[#e5e5e5] font-mono">{String(meta.distanceTraveled)} km</div>
                          </div>
                        ) : null}
                        {meta.mood ? (
                          <div>
                            <div className="text-[#616161] dark:text-[#b5bcc4]">Mood/Energy:</div>
                            <div className="font-bold dark:text-[#e5e5e5]">{String(meta.mood)}</div>
                          </div>
                        ) : null}
                        {meta.expenses != null ? (
                          <div>
                            <div className="text-[#616161] dark:text-[#b5bcc4]">Expenses:</div>
                            <div className="font-bold dark:text-[#e5e5e5] font-mono">${String(meta.expenses)}</div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })()
                )}
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
                          {comment.author.username === entry?.explorerId && (
                            <span className="px-2 py-0.5 bg-[#ac6d46] text-white text-xs font-mono font-bold rounded-full">AUTHOR</span>
                          )}
                        </div>
                        <span className="text-xs font-mono text-[#616161] dark:text-[#b5bcc4]">
                          {new Date(comment.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}
                        </span>
                      </div>

                      {/* Delete confirmation */}
                      {confirmDeleteId === comment.id && (
                        <div className="px-3 py-2 bg-[#994040]/10 border-b border-[#994040]/30 flex items-center justify-between">
                          <span className="text-xs font-mono text-[#994040] font-bold">DELETE THIS NOTE AND ALL RESPONSES?</span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleDeleteComment(comment.id)}
                              disabled={isDeleteLoading}
                              className="px-3 py-1 bg-[#994040] text-white text-xs font-mono font-bold hover:bg-[#7a3333] transition-colors disabled:opacity-50"
                            >
                              {isDeleteLoading ? 'DELETING...' : 'CONFIRM'}
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-3 py-1 border border-[#994040]/30 text-xs font-mono text-[#994040] hover:bg-[#994040]/10 transition-colors"
                            >
                              CANCEL
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Note Content */}
                      <div className="px-3 py-3">
                        <div className="flex items-start gap-3">
                          <Link href={`/journal/${comment.author.username}`} className="flex-shrink-0">
                            <div className={`w-10 h-10 border-2 ${comment.author.creator ? 'border-[#ac6d46]' : 'border-[#616161] dark:border-[#3a3a3a]'} overflow-hidden bg-[#616161] hover:border-[#4676ac] transition-colors`}>
                              <Image
                                src={comment.author.picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.author.username}`}
                                alt={comment.author.username}
                                className="w-full h-full object-cover"
                                width={40}
                                height={40}
                              />
                            </div>
                          </Link>
                          <div className="flex-1">
                            <Link href={`/journal/${comment.author.username}`} className="font-bold text-sm hover:text-[#ac6d46] dark:text-[#e5e5e5] font-mono">
                              {comment.author.username}
                            </Link>

                            {/* Edit form or content */}
                            {editingCommentId === comment.id ? (
                              <div className="mt-1">
                                <textarea
                                  className="w-full px-3 py-2 border-2 border-[#4676ac] focus:border-[#4676ac] outline-none text-sm mb-1 dark:bg-[#202020] dark:text-[#e5e5e5] font-mono"
                                  rows={3}
                                  value={editCommentText}
                                  onChange={(e) => setEditCommentText(e.target.value.slice(0, 2000))}
                                  maxLength={2000}
                                />
                                <div className="flex justify-between items-center mb-2">
                                  <span className={`text-xs font-mono ${editCommentText.length > 1800 ? 'text-red-500' : 'text-[#616161] dark:text-[#b5bcc4]'}`}>
                                    {editCommentText.length}/2000
                                  </span>
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleEditComment(comment.id)}
                                    disabled={editSaving || !editCommentText.trim() || editCommentText === comment.content}
                                    className="px-3 py-1.5 bg-[#4676ac] text-white hover:bg-[#365d8a] border-2 border-[#202020] transition-all active:scale-[0.98] text-xs font-mono font-bold disabled:opacity-50 disabled:active:scale-100"
                                  >
                                    {editSaving ? 'SAVING...' : 'SAVE'}
                                  </button>
                                  <button
                                    onClick={() => { setEditingCommentId(null); setEditCommentText(''); }}
                                    className="px-3 py-1.5 border-2 border-[#616161] dark:border-[#3a3a3a] dark:text-[#e5e5e5] hover:bg-[#b5bcc4] dark:hover:bg-[#3a3a3a] transition-all active:scale-[0.98] text-xs font-mono"
                                  >
                                    CANCEL
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] mt-1 leading-relaxed">{comment.content}</p>
                            )}

                            {/* Action buttons: edit/delete for own, respond for all */}
                            {editingCommentId !== comment.id && (
                              <div className="mt-3 flex items-center gap-3">
                                {comment.createdByMe && (
                                  <>
                                    <button
                                      onClick={() => {
                                        setEditingCommentId(comment.id);
                                        setEditCommentText(comment.content);
                                        setConfirmDeleteId(null);
                                      }}
                                      className="text-xs text-[#616161] dark:text-[#b5bcc4] hover:text-[#4676ac] dark:hover:text-[#4676ac] font-mono font-bold transition-all"
                                    >
                                      EDIT
                                    </button>
                                    <button
                                      onClick={() => setConfirmDeleteId(confirmDeleteId === comment.id ? null : comment.id)}
                                      className="text-xs text-[#616161] dark:text-[#b5bcc4] hover:text-[#994040] dark:hover:text-[#994040] font-mono font-bold transition-all"
                                    >
                                      DELETE
                                    </button>
                                  </>
                                )}
                                {isAuthenticated && (
                                  <button
                                    onClick={() => {
                                      setReplyingTo(replyingTo === comment.id ? null : comment.id);
                                      setReplyText('');
                                    }}
                                    className="text-xs text-[#616161] dark:text-[#b5bcc4] hover:text-[#ac6d46] dark:hover:text-[#ac6d46] font-mono font-bold transition-all"
                                  >
                                    {replyingTo === comment.id ? '✕ CANCEL' : '↳ RESPOND'}
                                  </button>
                                )}
                              </div>
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
                                    <div className={`w-6 h-6 border ${reply.author.creator ? 'border-[#ac6d46]' : 'border-[#616161] dark:border-[#3a3a3a]'} overflow-hidden bg-[#616161] hover:border-[#4676ac] transition-colors`}>
                                      <Image
                                        src={reply.author.picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${reply.author.username}`}
                                        alt={reply.author.username}
                                        className="w-full h-full object-cover"
                                        width={24}
                                        height={24}
                                      />
                                    </div>
                                  </Link>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <Link href={`/journal/${reply.author.username}`} className="font-bold text-xs hover:text-[#ac6d46] dark:text-[#e5e5e5] font-mono">
                                        {reply.author.username}
                                      </Link>
                                      {reply.author.username === entry?.explorerId && (
                                        <span className="px-1.5 py-0.5 bg-[#ac6d46] text-white text-[10px] font-mono font-bold rounded-full leading-none">AUTHOR</span>
                                      )}
                                      <span className="text-xs text-[#616161] dark:text-[#b5bcc4] font-mono">
                                        {new Date(reply.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()}
                                      </span>
                                      {reply.createdByMe && editingCommentId !== reply.id && confirmDeleteId !== reply.id && (
                                        <span className="flex items-center gap-1 ml-auto">
                                          <button
                                            onClick={() => {
                                              setEditingCommentId(reply.id);
                                              setEditCommentText(reply.content);
                                              setConfirmDeleteId(null);
                                            }}
                                            className="text-[10px] font-mono text-[#b5bcc4] hover:text-[#4676ac] transition-colors"
                                          >
                                            EDIT
                                          </button>
                                          <span className="text-[#b5bcc4]">|</span>
                                          <button
                                            onClick={() => setConfirmDeleteId(reply.id)}
                                            className="text-[10px] font-mono text-[#b5bcc4] hover:text-[#994040] transition-colors"
                                          >
                                            DELETE
                                          </button>
                                        </span>
                                      )}
                                    </div>

                                    {/* Delete reply confirmation */}
                                    {confirmDeleteId === reply.id && (
                                      <div className="mt-1 flex items-center gap-2">
                                        <span className="text-[10px] font-mono text-[#994040] font-bold">DELETE?</span>
                                        <button
                                          onClick={() => handleDeleteComment(reply.id, comment.id)}
                                          disabled={isDeleteLoading}
                                          className="text-[10px] font-mono font-bold text-white bg-[#994040] px-2 py-0.5 hover:bg-[#7a3333] transition-colors disabled:opacity-50"
                                        >
                                          {isDeleteLoading ? '...' : 'YES'}
                                        </button>
                                        <button
                                          onClick={() => setConfirmDeleteId(null)}
                                          className="text-[10px] font-mono text-[#616161] hover:text-[#202020] dark:hover:text-[#e5e5e5] transition-colors"
                                        >
                                          NO
                                        </button>
                                      </div>
                                    )}

                                    {/* Edit reply form or content */}
                                    {editingCommentId === reply.id ? (
                                      <div className="mt-1">
                                        <textarea
                                          className="w-full px-2 py-1 border-2 border-[#4676ac] outline-none text-xs dark:bg-[#202020] dark:text-[#e5e5e5] font-mono"
                                          rows={2}
                                          value={editCommentText}
                                          onChange={(e) => setEditCommentText(e.target.value.slice(0, 2000))}
                                          maxLength={2000}
                                        />
                                        <div className="flex items-center gap-2 mt-1">
                                          <span className={`text-[10px] font-mono ${editCommentText.length > 1800 ? 'text-red-500' : 'text-[#616161] dark:text-[#b5bcc4]'}`}>
                                            {editCommentText.length}/2000
                                          </span>
                                          <button
                                            onClick={() => handleEditComment(reply.id)}
                                            disabled={editSaving || !editCommentText.trim() || editCommentText === reply.content}
                                            className="px-2 py-0.5 bg-[#4676ac] text-white text-[10px] font-mono font-bold hover:bg-[#365d8a] transition-colors disabled:opacity-50"
                                          >
                                            {editSaving ? '...' : 'SAVE'}
                                          </button>
                                          <button
                                            onClick={() => { setEditingCommentId(null); setEditCommentText(''); }}
                                            className="text-[10px] font-mono text-[#616161] hover:text-[#202020] dark:hover:text-[#e5e5e5] transition-colors"
                                          >
                                            CANCEL
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <p className="text-xs text-[#202020] dark:text-[#e5e5e5] mt-0.5 leading-relaxed">{reply.content}</p>
                                    )}
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

          {/* Quick Sponsor CTA */}
          {!isOwner && entry.explorerIsPro && entry.stripeAccountConnected && (
            <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-4">
              <div className="flex flex-col items-center gap-2">
                <p className="text-xs text-[#616161] dark:text-[#b5bcc4]">Appreciate this entry? Show your support.</p>
                <QuickSponsorButton
                  entryPublicId={entry.id}
                  authorUsername={entry.explorerName}
                  isProAuthor={entry.explorerIsPro}
                  stripeConnected={entry.stripeAccountConnected}
                  expeditionId={['planned', 'active'].includes(entry.expeditionStatus) ? entry.expeditionId : undefined}
                  expeditionTitle={['planned', 'active'].includes(entry.expeditionStatus) ? entry.expeditionTitle : undefined}
                />
              </div>
            </div>
          )}
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
                  {entry.expeditionStatus && (
                    <div className="flex justify-between">
                      <span>Status:</span>
                      <span className={`font-bold ${
                        entry.expeditionStatus === 'active' ? 'text-[#598636]' :
                        entry.expeditionStatus === 'completed' ? 'text-[#616161] dark:text-[#b5bcc4]' :
                        entry.expeditionStatus === 'cancelled' ? 'text-[#994040]' :
                        'text-[#4676ac]'
                      }`}>
                        {entry.expeditionStatus.toUpperCase()}
                      </span>
                    </div>
                  )}
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

                  {/* Expedition Sponsorship Totals (only if sponsorships enabled) */}
                  {entry.expeditionSponsorshipsEnabled && (
                    <>
                      <div className="h-px bg-[#b5bcc4] dark:bg-[#3a3a3a] my-2" />
                      <div className="flex justify-between">
                        <span>Sponsors:</span>
                        <span className="font-bold text-[#ac6d46]">{entry.expeditionSponsorsCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Raised:</span>
                        <span className="font-bold text-[#ac6d46]">${entry.expeditionRaised.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    </>
                  )}
                </div>
                <Link
                  href={`/expedition/${entry.expeditionId}`}
                  className="block w-full mt-4 py-2.5 bg-[#ac6d46] text-white text-center hover:bg-[#8a5738] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] text-xs font-bold whitespace-nowrap"
                >
                  VIEW EXPEDITION
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
                  <div className={`w-16 h-16 border-2 ${entry.explorerIsPro ? 'border-[#ac6d46]' : 'border-[#616161]'} overflow-hidden bg-[#616161] hover:border-[#4676ac] transition-all`}>
                    <Image
                      src={entry.explorerPicture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${entry.explorerId}`}
                      alt={entry.explorerName}
                      className="w-full h-full object-cover"
                      width={64}
                      height={64}
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
                  className="flex-1 py-2.5 bg-[#ac6d46] text-white text-center hover:bg-[#8a5738] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] text-xs font-bold whitespace-nowrap"
                >
                  VIEW JOURNAL
                </Link>
                <button
                  onClick={() => handleFollowExplorer(entry.explorerId)}
                  disabled={followLoading}
                  className={`px-4 py-2.5 border-2 transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:active:scale-100 text-xs font-bold whitespace-nowrap flex items-center gap-2 ${
                    isFollowingExplorer
                      ? 'border-[#4676ac] bg-[#4676ac] text-white hover:bg-[#365a87] focus-visible:ring-[#4676ac]'
                      : 'border-[#202020] dark:border-[#616161] text-[#202020] dark:text-[#e5e5e5] hover:bg-[#616161] hover:border-[#616161] hover:text-white focus-visible:ring-[#616161]'
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

          {/* Time Data */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-4">
            <h3 className="text-xs font-bold mb-3 border-b border-[#202020] dark:border-[#616161] pb-2 dark:text-[#e5e5e5]">
              TIME DATA
            </h3>
            <div className="space-y-3 text-xs font-mono">
              <div>
                <div className="text-[#616161] dark:text-[#b5bcc4] mb-1">Entry Date:</div>
                <div className="font-bold dark:text-[#e5e5e5]">{formatDateWithOptionalTime(entry.date)}</div>
              </div>
              <div>
                <div className="text-[#616161] dark:text-[#b5bcc4] mb-1">Published:</div>
                <div className="font-bold dark:text-[#e5e5e5]">{formatDateTime(entry.publishedAt)}</div>
              </div>
              <div>
                <div className="text-[#616161] dark:text-[#b5bcc4] mb-1">Last Modified:</div>
                <div className="font-bold dark:text-[#e5e5e5]">{formatDateTime(entry.lastModified)}</div>
              </div>
              {entry.expeditionId && (
                <div>
                  <div className="text-[#616161] dark:text-[#b5bcc4] mb-1">Expedition Day:</div>
                  <div className="font-bold text-[#4676ac]">Day {entry.expeditionDay}</div>
                </div>
              )}
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
                <div>{formatDateTime(entry.publishedAt)}</div>
              </div>
              <div>
                <span className="text-[#202020] dark:text-[#e5e5e5] font-bold">Last Modified:</span>
                <div>{formatDateTime(entry.lastModified)}</div>
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

      {/* Delete Entry Confirmation Modal */}
      {confirmingDeleteEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-[#202020]/60" onClick={() => setConfirmingDeleteEntry(false)} />
          <div className="relative w-[90%] max-w-md bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
            <div className="bg-[#994040] text-white p-4 border-b-2 border-[#202020] dark:border-[#616161] flex items-center gap-3">
              <Trash2 size={18} />
              <h3 className="text-sm font-bold">DELETE ENTRY</h3>
            </div>
            <div className="p-6">
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5] mb-1">
                Are you sure you want to delete this entry?
              </p>
              <p className="text-sm font-bold text-[#202020] dark:text-[#e5e5e5] mb-4">
                &ldquo;{entry?.title}&rdquo;
              </p>
              <p className="text-xs text-[#616161] dark:text-[#b5bcc4] mb-6">
                This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmingDeleteEntry(false)}
                  className="flex-1 px-4 py-2.5 border-2 border-[#202020] dark:border-[#616161] text-[#202020] dark:text-[#e5e5e5] hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] transition-all text-xs font-bold"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleDeleteEntry}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2.5 bg-[#994040] text-white hover:bg-[#7a3333] transition-all text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  {isDeleting ? 'DELETING...' : 'DELETE ENTRY'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {apiEntry && (
        <ReportModal
          isOpen={reportOpen}
          onClose={() => setReportOpen(false)}
          contentType="entry"
          contentId={apiEntry.id}
        />
      )}

    </div>
  );
}