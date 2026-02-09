'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { EntryCard } from '@/app/components/EntryCard';
import { FileText } from 'lucide-react';
import { entryApi, type Entry } from '@/app/services/api';
import { useAuth } from '@/app/context/AuthContext';
import { EntryCardSkeleton, SKELETON_COUNT } from '@/app/components/skeletons/CardSkeletons';
import { ErrorState } from '@/app/components/ErrorState';

export function EntriesPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();

  // API data state
  const [apiEntries, setApiEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookmarkedEntries, setBookmarkedEntries] = useState<Set<string>>(new Set());

  // Loading state for async actions
  const [bookmarkingInProgress, setBookmarkingInProgress] = useState<Set<string>>(new Set());

  // Handle bookmark entry with loading state
  const handleBookmarkEntry = async (entryId: string) => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    // Prevent duplicate requests
    if (bookmarkingInProgress.has(entryId)) return;

    setBookmarkingInProgress(prev => new Set(prev).add(entryId));
    try {
      await entryApi.bookmark(entryId);
      setBookmarkedEntries(prev => {
        const next = new Set(prev);
        if (next.has(entryId)) {
          next.delete(entryId);
        } else {
          next.add(entryId);
        }
        return next;
      });
    } catch (err) {
      console.error('Error bookmarking entry:', err);
    } finally {
      setBookmarkingInProgress(prev => {
        const next = new Set(prev);
        next.delete(entryId);
        return next;
      });
    }
  };

  // Fetch entries from API
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await entryApi.getAll();
      setApiEntries(data.data || []);
    } catch {
      setError('Failed to load entries. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await entryApi.getAll();
        if (!cancelled) {
          setApiEntries(data.data || []);
        }
      } catch {
        if (!cancelled) {
          setError('Failed to load entries. Please check your connection and try again.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const isActive = (path: string) => {
    if (path === '/explorers') return pathname.startsWith('/explorer');
    if (path === '/expeditions') return pathname.startsWith('/expedition');
    if (path === '/entries') return pathname.startsWith('/entries') || pathname.startsWith('/entry');
    return pathname === path;
  };

  // Transform API entries to match component props
  const transformedEntries = apiEntries.map(entry => ({
    id: entry.id || '', // API returns id as the publicId
    title: entry.title,
    explorerName: entry.author?.username || entry.explorer?.username || 'Unknown',
    explorerId: entry.author?.username || entry.explorer?.username || '',
    expeditionName: entry.expedition?.title || entry.trip?.title || '',
    expeditionId: entry.expedition?.id || entry.trip?.id || '',
    location: entry.place || '',
    date: entry.date || entry.createdAt || '',
    excerpt: entry.content?.substring(0, 300) || '',
    mediaCount: entry.media?.length || 0,
    views: 0, // Not in API
    wordCount: entry.content?.trim().split(/\s+/).filter(word => word.length > 0).length || 0,
    type: entry.entryType || 'standard',
    coverImageUrl: entry.coverImage,
  }));

  const entries = transformedEntries;

  return (
    <div className="max-w-[1600px] mx-auto px-6 py-12">
      {/* Page Header */}
      <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] mb-6">
        {/* Submenu Banner */}
        <div className="bg-[#616161] px-6 py-3 flex items-center gap-3 border-b-2 border-[#202020] dark:border-[#4a4a4a]">
          <span className="text-xs text-[#e5e5e5] font-bold">DISCOVER:</span>
          <Link
            href="/explorers"
            className={`px-4 py-2 text-xs font-bold transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#4676ac] ${
              isActive('/explorers')
                ? 'bg-[#4676ac] text-white'
                : 'bg-[#2a2a2a] text-white hover:bg-[#ac6d46]'
            }`}
          >
            EXPLORERS
          </Link>
          <Link
            href="/expeditions"
            className={`px-4 py-2 text-xs font-bold transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#4676ac] ${
              isActive('/expeditions')
                ? 'bg-[#4676ac] text-white'
                : 'bg-[#2a2a2a] text-white hover:bg-[#ac6d46]'
            }`}
          >
            EXPEDITIONS
          </Link>
          <Link
            href="/entries"
            className={`px-4 py-2 text-xs font-bold transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#4676ac] ${
              isActive('/entries')
                ? 'bg-[#4676ac] text-white'
                : 'bg-[#2a2a2a] text-white hover:bg-[#ac6d46]'
            }`}
          >
            ENTRIES
          </Link>
        </div>

        {/* Header Content */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-4 border-b-2 border-[#202020] dark:border-[#616161] pb-2">
            <h1 className="text-2xl font-bold dark:text-[#e5e5e5]">JOURNAL ENTRY DIRECTORY</h1>
            <span className="text-xs text-[#616161] dark:text-[#b5bcc4] font-mono">
              {loading ? 'LOADING...' : error ? 'ERROR' : `${entries.length} ENTRIES`}
            </span>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search entries by title, explorer, expedition, location, or category..."
              className="flex-1 px-3 md:px-4 py-2 border-2 border-[#b5bcc4] dark:border-[#3a3a3a] dark:bg-[#2a2a2a] dark:text-[#e5e5e5] focus:border-[#ac6d46] outline-none text-xs md:text-sm"
            />
            <button className="px-3 md:px-4 py-2 bg-[#ac6d46] text-white text-xs md:text-sm hover:bg-[#8a5738] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] whitespace-nowrap">
              SEARCH
            </button>
          </div>

          <div className="flex flex-wrap gap-2 text-xs mt-4">
            <button className="px-3 py-1.5 bg-[#4676ac] text-white whitespace-nowrap hover:bg-[#365a87] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#4676ac]">ALL ENTRIES</button>
            <button className="px-3 py-1.5 border border-[#202020] dark:border-[#616161] dark:text-[#e5e5e5] hover:bg-[#95a2aa] dark:hover:bg-[#3a3a3a] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#616161] whitespace-nowrap">RECENT</button>
            <button className="px-3 py-1.5 border border-[#202020] dark:border-[#616161] dark:text-[#e5e5e5] hover:bg-[#95a2aa] dark:hover:bg-[#3a3a3a] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#616161] whitespace-nowrap">MOST VIEWED</button>
            <button className="px-3 py-1.5 border border-[#202020] dark:border-[#616161] dark:text-[#e5e5e5] hover:bg-[#95a2aa] dark:hover:bg-[#3a3a3a] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#616161] whitespace-nowrap">PHOTO-ESSAY</button>
            <button className="px-3 py-1.5 border border-[#202020] dark:border-[#616161] dark:text-[#e5e5e5] hover:bg-[#95a2aa] dark:hover:bg-[#3a3a3a] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#616161] whitespace-nowrap">FIELD REPORT</button>
            <button className="px-3 py-1.5 border border-[#202020] dark:border-[#616161] dark:text-[#e5e5e5] hover:bg-[#95a2aa] dark:hover:bg-[#3a3a3a] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#616161] whitespace-nowrap">RESEARCH</button>
          </div>
        </div>
      </div>

      {/* Entry List */}
      {loading ? (
        // Loading skeleton grid
        <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-6">
          {SKELETON_COUNT.map((i) => (
            <EntryCardSkeleton key={i} />
          ))}
        </div>
      ) : error ? (
        // Error state
        <ErrorState
          title="Failed to load entries"
          message={error}
          onRetry={fetchData}
        />
      ) : entries.length === 0 ? (
        // Empty state
        <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-12 text-center">
          <FileText className="w-16 h-16 text-[#b5bcc4] dark:text-[#616161] mx-auto mb-4" aria-hidden="true" />
          <h3 className="text-lg font-bold text-[#202020] dark:text-[#e5e5e5] mb-2">
            No entries found
          </h3>
          <p className="text-sm text-[#616161] dark:text-[#b5bcc4]">
            Be the first to share a journal entry from your expedition.
          </p>
        </div>
      ) : (
        // Entry cards grid
        <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-6">
          {entries.map((entry) => (
            <EntryCard
              key={entry.id}
              id={entry.id}
              title={entry.title}
              explorerUsername={entry.explorerId}
              expeditionName={entry.expeditionName}
              location={entry.location}
              date={entry.date}
              excerpt={entry.excerpt}
              mediaCount={entry.mediaCount}
              views={entry.views}
              wordCount={entry.wordCount}
              type={entry.type}
              coverImageUrl={entry.coverImageUrl}
              onReadEntry={() => router.push(`/entry/${entry.id}`)}
              onViewExpedition={() => router.push(`/expedition/${entry.expeditionId}`)}
              onViewExplorer={() => router.push(`/journal/${entry.explorerId}`)}
              isBookmarked={bookmarkedEntries.has(entry.id)}
              isBookmarkLoading={bookmarkingInProgress.has(entry.id)}
              onBookmark={() => handleBookmarkEntry(entry.id)}
            />
          ))}
        </div>
      )}

      {/* Load More - TODO: Implement pagination */}
      {!loading && !error && entries.length > 0 && (
        <div className="mt-6 text-center">
          <button className="px-6 py-3 bg-[#616161] text-white hover:bg-[#4676ac] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#4676ac] text-sm font-bold">
            LOAD MORE ENTRIES
          </button>
        </div>
      )}
    </div>
  );
}
