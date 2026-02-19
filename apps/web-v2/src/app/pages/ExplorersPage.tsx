'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { ExplorerCard } from '@/app/components/ExplorerCard';
import { Users } from 'lucide-react';
import { explorerApi, type ExplorerListItem } from '@/app/services/api';
import { useAuth } from '@/app/context/AuthContext';
import { ExplorerCardSkeleton, SKELETON_COUNT } from '@/app/components/skeletons/CardSkeletons';
import { ErrorState } from '@/app/components/ErrorState';
import { getExplorerStatus, getCurrentExpeditionInfo } from '@/app/components/ExplorerStatusBadge';

export function ExplorersPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();

  // API data state
  const [apiExplorers, setApiExplorers] = useState<ExplorerListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [followedExplorers, setFollowedExplorers] = useState<Set<string>>(new Set());
  const [bookmarkedExplorers, setBookmarkedExplorers] = useState<Set<string>>(new Set());

  // Filter & search state
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Loading states for async actions
  const [followingInProgress, setFollowingInProgress] = useState<Set<string>>(new Set());
  const [bookmarkingInProgress, setBookmarkingInProgress] = useState<Set<string>>(new Set());

  // Handle bookmark explorer with loading state
  const handleBookmarkExplorer = async (username: string) => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    // Prevent duplicate requests
    if (bookmarkingInProgress.has(username)) return;

    setBookmarkingInProgress(prev => new Set(prev).add(username));
    try {
      await explorerApi.bookmark(username);
      setBookmarkedExplorers(prev => {
        const next = new Set(prev);
        if (next.has(username)) {
          next.delete(username);
        } else {
          next.add(username);
        }
        return next;
      });
    } catch (err) {
      console.error('Error bookmarking explorer:', err);
    } finally {
      setBookmarkingInProgress(prev => {
        const next = new Set(prev);
        next.delete(username);
        return next;
      });
    }
  };

  // Handle follow/unfollow explorer with loading state
  const handleFollowExplorer = async (username: string) => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    // Prevent duplicate requests
    if (followingInProgress.has(username)) return;

    setFollowingInProgress(prev => new Set(prev).add(username));
    try {
      const isFollowed = followedExplorers.has(username);
      if (isFollowed) {
        await explorerApi.unfollow(username);
        setFollowedExplorers(prev => {
          const next = new Set(prev);
          next.delete(username);
          return next;
        });
      } else {
        await explorerApi.follow(username);
        setFollowedExplorers(prev => new Set(prev).add(username));
      }
    } catch (err) {
      console.error('Error following/unfollowing explorer:', err);
    } finally {
      setFollowingInProgress(prev => {
        const next = new Set(prev);
        next.delete(username);
        return next;
      });
    }
  };

  // Fetch explorers from API
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await explorerApi.getAll();
      setApiExplorers(data.data || []);

      // Initialize followed state from API data
      const followedSet = new Set<string>();
      (data.data || []).forEach(exp => {
        if (exp.followed) {
          followedSet.add(exp.username);
        }
      });
      setFollowedExplorers(followedSet);
    } catch {
      setError('Failed to load explorers. Please check your connection and try again.');
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
        const data = await explorerApi.getAll();
        if (!cancelled) {
          setApiExplorers(data.data || []);

          // Initialize followed state from API data
          const followedSet = new Set<string>();
          (data.data || []).forEach(exp => {
            if (exp.followed) {
              followedSet.add(exp.username);
            }
          });
          setFollowedExplorers(followedSet);
        }
      } catch {
        if (!cancelled) {
          setError('Failed to load explorers. Please check your connection and try again.');
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

  // Transform API explorers to match component props
  const transformedExplorers = useMemo(() => apiExplorers.map(exp => ({
    id: exp.username,
    username: exp.username,
    accountType: (exp.creator ? 'explorer-pro' : 'explorer') as 'explorer-pro' | 'explorer',
    journalName: exp.name || '',
    bio: exp.bio || '',
    location: exp.locationLives || exp.locationFrom || '',
    joined: exp.memberDate || '',
    activeExpeditions: exp.recentExpeditions?.filter(e => e.status === 'active').length || 0,
    totalExpeditions: 0,
    totalEntries: exp.entriesCount || 0,
    totalSponsored: 0,
    followers: 0,
    imageUrl: exp.picture || '',
    tagline: exp.bio || '',
    tags: [] as string[],
    recentExpeditions: exp.recentExpeditions || [],
    activeExpeditionOffGrid: exp.activeExpeditionOffGrid,
    creator: exp.creator,
    locationFrom: exp.locationFrom || '',
    locationLives: exp.locationLives || '',
  })), [apiExplorers]);

  // Apply filters and search
  const filteredExplorers = useMemo(() => {
    let result = transformedExplorers;

    // Apply filter
    if (activeFilter === 'active') {
      result = result.filter(e => e.recentExpeditions.some(exp => exp.status === 'active'));
    } else if (activeFilter === 'pro') {
      result = result.filter(e => e.creator === true);
    }

    // Apply search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(e =>
        e.username.toLowerCase().includes(q) ||
        e.journalName.toLowerCase().includes(q) ||
        e.bio.toLowerCase().includes(q) ||
        e.locationFrom.toLowerCase().includes(q) ||
        e.locationLives.toLowerCase().includes(q)
      );
    }

    return result;
  }, [transformedExplorers, activeFilter, searchQuery]);

  const explorers = filteredExplorers;

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
            <h1 className="text-2xl font-bold dark:text-[#e5e5e5]">EXPLORER DIRECTORY</h1>
            <span className="text-xs text-[#616161] dark:text-[#b5bcc4] font-mono">
              {loading ? 'LOADING...' : error ? 'ERROR' : explorers.length !== transformedExplorers.length ? `${explorers.length} / ${transformedExplorers.length} EXPLORERS` : `${explorers.length} EXPLORERS`}
            </span>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search explorers, journals, locations..."
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
              { key: 'active', label: 'ACTIVE NOW' },
              { key: 'pro', label: 'EXPLORER PRO' },
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

      {/* Explorer List */}
      {loading ? (
        // Loading skeleton grid
        <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-6">
          {SKELETON_COUNT.map((i) => (
            <ExplorerCardSkeleton key={i} />
          ))}
        </div>
      ) : error ? (
        // Error state
        <ErrorState
          title="Failed to load explorers"
          message={error}
          onRetry={fetchData}
        />
      ) : explorers.length === 0 && transformedExplorers.length > 0 ? (
        // No results after filtering
        <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-12 text-center">
          <Users className="w-16 h-16 text-[#b5bcc4] dark:text-[#616161] mx-auto mb-4" aria-hidden="true" />
          <h3 className="text-lg font-bold text-[#202020] dark:text-[#e5e5e5] mb-2">
            No results match your filters
          </h3>
          <p className="text-sm text-[#616161] dark:text-[#b5bcc4]">
            Try adjusting your search or filter criteria.
          </p>
        </div>
      ) : explorers.length === 0 ? (
        // Empty state
        <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-12 text-center">
          <Users className="w-16 h-16 text-[#b5bcc4] dark:text-[#616161] mx-auto mb-4" aria-hidden="true" />
          <h3 className="text-lg font-bold text-[#202020] dark:text-[#e5e5e5] mb-2">
            No explorers found
          </h3>
          <p className="text-sm text-[#616161] dark:text-[#b5bcc4]">
            Be the first to start an expedition and share your story with the world.
          </p>
        </div>
      ) : (
        // Explorer cards grid
        <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-6">
          {explorers.map((explorer) => {
            // Compute explorer status from their expeditions
            const expeditions = explorer.recentExpeditions || [];
            const explorerStatus = getExplorerStatus(expeditions, explorer.activeExpeditionOffGrid);
            const currentExpedition = getCurrentExpeditionInfo(expeditions);

            return (
              <ExplorerCard
                key={explorer.id}
                id={String(explorer.id)}
                username={explorer.username}
                accountType={explorer.accountType}
                journalName={explorer.journalName}
                tagline={explorer.tagline}
                location={explorer.location}
                joined={explorer.joined}
                activeExpeditions={explorer.activeExpeditions}
                totalEntries={explorer.totalEntries}
                totalSponsored={explorer.totalSponsored}
                followers={explorer.followers}
                imageUrl={explorer.imageUrl}
                explorerStatus={explorerStatus}
                currentExpeditionTitle={currentExpedition?.title}
                daysActive={currentExpedition?.daysActive}
                isFollowing={followedExplorers.has(String(explorer.id))}
                isBookmarked={bookmarkedExplorers.has(String(explorer.id))}
                isFollowLoading={followingInProgress.has(String(explorer.id))}
                isBookmarkLoading={bookmarkingInProgress.has(String(explorer.id))}
                onViewJournal={() => router.push(`/journal/${explorer.id}`)}
                onFollow={() => handleFollowExplorer(String(explorer.id))}
                onBookmark={() => handleBookmarkExplorer(String(explorer.id))}
              />
            );
          })}
        </div>
      )}

      {/* Load More - TODO: Implement pagination */}
      {!loading && !error && explorers.length > 0 && (
        <div className="mt-6 text-center">
          <button className="px-6 py-3 bg-[#616161] text-white hover:bg-[#4676ac] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#4676ac] text-sm font-bold">
            LOAD MORE EXPLORERS
          </button>
        </div>
      )}
    </div>
  );
}
