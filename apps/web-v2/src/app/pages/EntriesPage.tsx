'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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

  // Filter & search state
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

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
  const transformedEntries = useMemo(() => apiEntries.map(entry => ({
    id: entry.id || '', // API returns id as the publicId
    title: entry.title,
    explorerName: entry.author?.username || entry.explorer?.username || 'Unknown',
    explorerId: entry.author?.username || entry.explorer?.username || '',
    expeditionName: entry.expedition?.title || entry.trip?.title || '',
    expeditionId: entry.expedition?.id || entry.trip?.id || '',
    location: entry.place || '',
    date: entry.date || entry.createdAt || '',
    excerpt: entry.content
      ? entry.content.length <= 300
        ? entry.content
        : entry.content.substring(0, 300).replace(/\s+\S*$/, '') + '...'
      : '',
    mediaCount: entry.mediaCount || 0,
    views: entry.viewsCount || 0,
    wordCount: entry.wordCount || 0,
    type: entry.entryType || 'standard',
    coverImageUrl: entry.coverImage,
  })), [apiEntries]);

  // Apply filters and search
  const filteredEntries = useMemo(() => {
    let result = transformedEntries;

    // Apply filter
    if (activeFilter === 'most-viewed') {
      result = [...result].sort((a, b) => b.views - a.views);
    } else if (activeFilter === 'standard') {
      result = result.filter(e => e.type === 'standard');
    } else if (activeFilter === 'photo-essay') {
      result = result.filter(e => e.type === 'photo-essay');
    } else if (activeFilter === 'data-log') {
      result = result.filter(e => e.type === 'data-log');
    }

    // Apply search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(e =>
        e.title.toLowerCase().includes(q) ||
        e.excerpt.toLowerCase().includes(q) ||
        e.explorerName.toLowerCase().includes(q) ||
        e.location.toLowerCase().includes(q)
      );
    }

    return result;
  }, [transformedEntries, activeFilter, searchQuery]);

  const entries = filteredEntries;

  return (
    <div className="max-w-[1600px] mx-auto px-6 py-12">
      {/* Page Header */}
      <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] mb-6">
        {/* Submenu Banner */}
        <div className="bg-[#616161] px-3 md:px-6 py-3 flex items-center gap-2 md:gap-3 border-b-2 border-[#202020] dark:border-[#4a4a4a] overflow-x-auto">
          <span className="text-xs text-[#e5e5e5] font-bold shrink-0 hidden md:inline">DISCOVER:</span>
          <Link
            href="/explorers"
            className={`px-3 md:px-4 py-2 text-xs font-bold shrink-0 transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#4676ac] ${
              isActive('/explorers')
                ? 'bg-[#4676ac] text-white'
                : 'bg-[#2a2a2a] text-white hover:bg-[#ac6d46]'
            }`}
          >
            EXPLORERS
          </Link>
          <Link
            href="/expeditions"
            className={`px-3 md:px-4 py-2 text-xs font-bold shrink-0 transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#4676ac] ${
              isActive('/expeditions')
                ? 'bg-[#4676ac] text-white'
                : 'bg-[#2a2a2a] text-white hover:bg-[#ac6d46]'
            }`}
          >
            EXPEDITIONS
          </Link>
          <Link
            href="/entries"
            className={`px-3 md:px-4 py-2 text-xs font-bold shrink-0 transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#4676ac] ${
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
              {loading ? 'LOADING...' : error ? 'ERROR' : entries.length !== transformedEntries.length ? `${entries.length} / ${transformedEntries.length} ENTRIES` : `${entries.length} ENTRIES`}
            </span>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search entries by title, explorer, location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-3 md:px-4 py-2 border-2 border-[#b5bcc4] dark:border-[#3a3a3a] dark:bg-[#2a2a2a] dark:text-[#e5e5e5] focus:border-[#ac6d46] outline-none text-xs md:text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="px-3 md:px-4 py-2 bg-[#616161] text-white text-xs md:text-sm hover:bg-[#4a4a4a] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#616161] whitespace-nowrap"
              >
                CLEAR
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2 text-xs mt-4">
            {[
              { key: 'all', label: 'ALL' },
              { key: 'most-viewed', label: 'MOST VIEWED' },
              { key: 'standard', label: 'STANDARD' },
              { key: 'photo-essay', label: 'PHOTO ESSAY' },
              { key: 'data-log', label: 'DATA LOG' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActiveFilter(key)}
                className={`px-3 py-1.5 whitespace-nowrap transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none ${
                  activeFilter === key
                    ? 'bg-[#4676ac] text-white hover:bg-[#365a87] focus-visible:ring-[#4676ac]'
                    : 'border border-[#202020] dark:border-[#616161] dark:text-[#e5e5e5] hover:bg-[#95a2aa] dark:hover:bg-[#3a3a3a] focus-visible:ring-[#616161]'
                }`}
              >
                {label}
              </button>
            ))}
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
      ) : entries.length === 0 && transformedEntries.length > 0 ? (
        // No results after filtering
        <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-12 text-center">
          <FileText className="w-16 h-16 text-[#b5bcc4] dark:text-[#616161] mx-auto mb-4" aria-hidden="true" />
          <h3 className="text-lg font-bold text-[#202020] dark:text-[#e5e5e5] mb-2">
            No results match your filters
          </h3>
          <p className="text-sm text-[#616161] dark:text-[#b5bcc4]">
            Try adjusting your search or filter criteria.
          </p>
        </div>
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
