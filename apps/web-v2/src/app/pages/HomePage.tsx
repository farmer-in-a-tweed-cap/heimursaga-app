'use client';

import { ExplorerMap } from "@/app/components/ExplorerMap";
import { JournalGrid } from "@/app/components/JournalGrid";
import { ExpeditionCard } from "@/app/components/ExpeditionCard";
import { ExplorerCard } from "@/app/components/ExplorerCard";
import { PlatformStats } from "@/app/components/PlatformStats";
import { FollowedExplorerStrip } from "@/app/components/FollowedExplorerStrip";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { Globe, Users, Loader2 } from "lucide-react";
import { expeditionApi, explorerApi, entryApi, type Expedition, type ExplorerListItem, type Entry } from "@/app/services/api";
import { calculateDaysElapsed } from "@/app/utils/dateFormat";

// Shared transform: raw API expedition -> ExpeditionCard props
function transformExpedition(exp: Expedition) {
  return {
    id: exp.publicId || exp.id || '',
    title: exp.title,
    explorer: exp.explorer?.username || exp.author?.username || 'Unknown',
    explorerUsername: exp.explorer?.username || exp.author?.username || '',
    description: exp.description || '',
    imageUrl: exp.coverImage || '',
    location: '',
    coordinates: '',
    startDate: exp.startDate || '',
    endDate: exp.endDate || '',
    daysElapsed: calculateDaysElapsed(exp.startDate, exp.endDate, exp.status),
    daysRemaining: exp.endDate ? Math.max(0, Math.floor((new Date(exp.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : null,
    journalEntries: exp.entriesCount || 0,
    lastUpdate: '',
    fundingGoal: exp.goal || 0,
    fundingCurrent: exp.raised || 0,
    fundingPercentage: exp.goal ? ((exp.raised || 0) / exp.goal) * 100 : 0,
    backers: exp.sponsorsCount || 0,
    distance: 0,
    status: (exp.status === 'active' ? 'active' : exp.status === 'completed' ? 'completed' : 'planned') as 'active' | 'completed' | 'planned',
    terrain: '',
    averageSpeed: 0,
    sponsorshipsEnabled: (exp.goal || 0) > 0,
    explorerIsPro: (exp.goal || 0) > 0,
  };
}

// Shared transform: raw API explorer -> ExplorerCard props
function transformExplorer(exp: ExplorerListItem) {
  return {
    id: exp.username,
    username: exp.username,
    journalName: exp.name || '',
    imageUrl: exp.picture || '',
    location: exp.locationLives || exp.locationFrom || '',
    accountType: (exp.creator ? 'explorer-pro' : 'explorer') as 'explorer-pro' | 'explorer',
    joined: exp.memberDate ? new Date(exp.memberDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '',
    activeExpeditions: 0,
    totalEntries: exp.entriesCount || 0,
    totalSponsored: 0,
    followers: 0,
    totalViews: 0,
    tagline: exp.bio || '',
  };
}

// Shared transform: raw API entry -> JournalGrid props
function transformEntry(entry: Entry) {
  return {
    id: entry.id || entry.publicId || '',
    title: entry.title,
    explorerUsername: entry.author?.username || 'unknown',
    expeditionName: entry.expedition?.title || entry.trip?.title || '',
    expeditionId: entry.expedition?.id || entry.trip?.id || '',
    location: entry.place || '',
    date: entry.date || entry.createdAt || '',
    excerpt: entry.content || '',
    mediaCount: entry.mediaCount || 0,
    wordCount: entry.wordCount || 0,
    type: entry.entryType || 'standard',
    coverImageUrl: entry.coverImage,
    bookmarked: entry.bookmarked || false,
  };
}

export function HomePage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [viewMode, setViewMode] = useState<'global' | 'following'>('global');
  const [viewModeRestored, setViewModeRestored] = useState(false);

  // Restore saved tab after hydration
  useEffect(() => {
    const saved = localStorage.getItem('heimursaga_home_tab');
    if (saved === 'following') setViewMode('following');
    setViewModeRestored(true);
  }, []);

  // Persist tab selection (only after initial restore to avoid overwriting)
  useEffect(() => {
    if (viewModeRestored) {
      localStorage.setItem('heimursaga_home_tab', viewMode);
    }
  }, [viewMode, viewModeRestored]);

  // API data state (global)
  const [expeditions, setExpeditions] = useState<Expedition[]>([]);
  const [explorers, setExplorers] = useState<ExplorerListItem[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [explorerCount, setExplorerCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Following data state
  const [followingExpeditions, setFollowingExpeditions] = useState<Expedition[]>([]);
  const [followingExplorers, setFollowingExplorers] = useState<ExplorerListItem[]>([]);
  const [followingEntries, setFollowingEntries] = useState<Entry[]>([]);
  const [followingLoading, setFollowingLoading] = useState(false);
  const [followingLoaded, setFollowingLoaded] = useState(false);

  // Interaction state
  const [followedExplorers, setFollowedExplorers] = useState<Set<string>>(new Set());
  const [bookmarkedExplorers, setBookmarkedExplorers] = useState<Set<string>>(new Set());
  const [bookmarkedExpeditions, setBookmarkedExpeditions] = useState<Set<string>>(new Set());

  // Loading states
  const [explorerBookmarkingInProgress, setExplorerBookmarkingInProgress] = useState<Set<string>>(new Set());
  const [explorerFollowingInProgress, setExplorerFollowingInProgress] = useState<Set<string>>(new Set());
  const [expeditionBookmarkingInProgress, setExpeditionBookmarkingInProgress] = useState<Set<string>>(new Set());

  // Handle bookmark explorer
  const handleBookmarkExplorer = async (username: string) => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (explorerBookmarkingInProgress.has(username)) return;

    setExplorerBookmarkingInProgress(prev => new Set(prev).add(username));
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
      setExplorerBookmarkingInProgress(prev => {
        const next = new Set(prev);
        next.delete(username);
        return next;
      });
    }
  };

  // Handle follow/unfollow explorer
  const handleFollowExplorer = async (username: string) => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (explorerFollowingInProgress.has(username)) return;

    setExplorerFollowingInProgress(prev => new Set(prev).add(username));
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
      // Invalidate following cache so next tab switch re-fetches
      setFollowingLoaded(false);
    } catch (err) {
      console.error('Error following/unfollowing explorer:', err);
    } finally {
      setExplorerFollowingInProgress(prev => {
        const next = new Set(prev);
        next.delete(username);
        return next;
      });
    }
  };

  // Handle bookmark expedition
  const handleBookmarkExpedition = async (expeditionId: string) => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (expeditionBookmarkingInProgress.has(expeditionId)) return;

    setExpeditionBookmarkingInProgress(prev => new Set(prev).add(expeditionId));
    try {
      await expeditionApi.bookmark(expeditionId);
      setBookmarkedExpeditions(prev => {
        const next = new Set(prev);
        if (next.has(expeditionId)) {
          next.delete(expeditionId);
        } else {
          next.add(expeditionId);
        }
        return next;
      });
    } catch (err) {
      console.error('Error bookmarking expedition:', err);
    } finally {
      setExpeditionBookmarkingInProgress(prev => {
        const next = new Set(prev);
        next.delete(expeditionId);
        return next;
      });
    }
  };

  // Fetch global data from API
  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [expeditionsData, explorersData, entriesData] = await Promise.all([
          expeditionApi.getAll().catch(() => ({ data: [], results: 0 })),
          explorerApi.getAll().catch(() => ({ data: [], results: 0 })),
          entryApi.getAll().catch(() => ({ data: [], results: 0 })),
        ]);
        if (!cancelled) {
          setExpeditions(expeditionsData.data || []);
          setExplorers(explorersData.data || []);
          setEntries(entriesData.data || []);
          setExplorerCount(explorersData.results || 0);

          // Initialize followed state from API data
          const followedSet = new Set<string>();
          (explorersData.data || []).forEach(exp => {
            if (exp.followed) {
              followedSet.add(exp.username);
            }
          });
          setFollowedExplorers(followedSet);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Error fetching home page data:', err);
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
  }, []);

  // Fetch following data when tab is selected
  useEffect(() => {
    if (viewMode !== 'following' || !isAuthenticated || followingLoaded) return;

    let cancelled = false;

    const fetchFollowingData = async () => {
      setFollowingLoading(true);
      try {
        const [expeditionsData, explorersData, entriesData] = await Promise.all([
          expeditionApi.getAll('following').catch(() => ({ data: [], results: 0 })),
          explorerApi.getAll('following').catch(() => ({ data: [], results: 0 })),
          entryApi.getAll('following').catch(() => ({ data: [], results: 0 })),
        ]);
        if (!cancelled) {
          setFollowingExpeditions(expeditionsData.data || []);
          setFollowingExplorers(explorersData.data || []);
          setFollowingEntries(entriesData.data || []);
          setFollowingLoaded(true);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Error fetching following data:', err);
        }
      } finally {
        if (!cancelled) {
          setFollowingLoading(false);
        }
      }
    };
    fetchFollowingData();

    return () => {
      cancelled = true;
    };
  }, [viewMode, isAuthenticated, followingLoaded]);

  // Transform global data
  const featuredExpeditions = expeditions.slice(0, 3).map(transformExpedition);
  const featuredExplorers = explorers.slice(0, 3).map(transformExplorer);
  const recentEntries = entries.slice(0, 6).map(transformEntry);

  // Transform following data
  const followingExpeditionCards = followingExpeditions.map(transformExpedition);
  const followingExplorerCards = followingExplorers.map(transformExplorer);
  const followingEntryCards = followingEntries.slice(0, 12).map(transformEntry);

  // Derive explorer status from recentExpeditions
  const getExplorerStatus = useCallback((exp: ExplorerListItem): 'exploring' | 'planning' | 'resting' => {
    if (!exp.recentExpeditions?.length) return 'resting';
    if (exp.recentExpeditions.some(e => e.status === 'active')) return 'exploring';
    if (exp.recentExpeditions.some(e => e.status === 'planned')) return 'planning';
    return 'resting';
  }, []);

  // Build followed explorer strip data
  const followedExplorerStripData = followingExplorers.map(exp => ({
    username: exp.username,
    name: exp.name,
    picture: exp.picture,
    isPro: exp.creator === true,
    status: getExplorerStatus(exp),
    lastEntryDate: exp.lastEntryDate,
  }));

  const hasFollowingContent = followingExpeditionCards.length > 0 || followingEntryCards.length > 0 || followedExplorerStripData.length > 0;

  return (
    <>
      {/* Heimursaga Tagline - Full Width Spread */}
      <div className="bg-[#404040] dark:bg-[#2a2a2a]">
        <div className="max-w-[1600px] mx-auto px-6 pt-12 pb-0">
          <div className="tagline-spread text-[#e5e5e5] dark:text-[#e5e5e5] font-bold text-sm sm:text-base md:text-lg">
            EXPLORE · DISCOVER · SHARE · SPONSOR · INSPIRE
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 py-12">
        {/* Platform Statistics */}
        <PlatformStats
          explorerCount={explorerCount}
          expeditionCount={expeditions.length}
          entryCount={entries.length}
        />

        {/* View Mode Toggle */}
        <div className="mt-6 grid grid-cols-2 gap-0 border-2 border-[#202020] dark:border-[#616161] overflow-hidden">
          {/* GLOBAL Option */}
          <button
            onClick={() => setViewMode('global')}
            className={`p-4 transition-all text-sm ${
              viewMode === 'global'
                ? 'bg-[#ac6d46] border-r-2 border-[#202020] dark:border-[#616161] text-white'
                : 'bg-white dark:bg-[#202020] border-r-2 border-[#202020] dark:border-[#616161] text-[#202020] dark:text-white hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a]'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Globe className="w-4 h-4" />
              <span className="font-bold">GLOBAL</span>
              <span className={`font-mono ${viewMode === 'global' ? 'text-white/80' : 'text-[#616161] dark:text-[#b5bcc4]'}`}>
                ({explorerCount} explorer{explorerCount !== 1 ? 's' : ''})
              </span>
            </div>
          </button>

          {/* FOLLOWING Option */}
          <button
            onClick={() => setViewMode('following')}
            disabled={!isAuthenticated}
            className={`p-4 transition-all text-sm ${
              viewMode === 'following'
                ? 'bg-[#4676ac] text-white'
                : isAuthenticated
                  ? 'bg-white dark:bg-[#202020] text-[#202020] dark:text-white hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a]'
                  : 'bg-[#e5e5e5] dark:bg-[#1a1a1a] text-[#b5bcc4] cursor-not-allowed opacity-60'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Users className="w-4 h-4" />
              <span className="font-bold">FOLLOWING</span>
              <span className={`font-mono ${viewMode === 'following' ? 'text-white/80' : isAuthenticated ? 'text-[#616161] dark:text-[#b5bcc4]' : 'text-[#b5bcc4]'}`}>
                {isAuthenticated
                  ? `(${followedExplorers.size} explorer${followedExplorers.size !== 1 ? 's' : ''})`
                  : '(login required)'}
              </span>
            </div>
          </button>
        </div>

        {/* Loading State (global) */}
        {viewMode === 'global' && loading && (
          <div className="mt-8 flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[#4676ac]" />
            <span className="ml-3 text-[#616161] dark:text-[#b5bcc4]">Loading...</span>
          </div>
        )}

        {/* FOLLOWING MODE */}
        {viewMode === 'following' && isAuthenticated && (
          <>
            {/* Loading State (following) */}
            {followingLoading && (
              <div className="mt-8 flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-[#4676ac]" />
                <span className="ml-3 text-[#616161] dark:text-[#b5bcc4]">Loading your feed...</span>
              </div>
            )}

            {/* Empty State: user follows nobody or followed explorers have no content */}
            {!followingLoading && followingLoaded && !hasFollowingContent && (
              <div className="mt-4 bg-[#f5f5f5] dark:bg-[#2a2a2a] border-2 border-[#4676ac] p-6 text-center">
                <Users className="w-8 h-8 text-[#4676ac] mx-auto mb-3" />
                <h3 className="font-bold mb-2 text-[#202020] dark:text-white">
                  {followedExplorers.size === 0 ? 'No Explorers Followed Yet' : 'No Recent Activity'}
                </h3>
                <p className="text-xs text-[#616161] dark:text-[#b5bcc4] mb-3 max-w-md mx-auto">
                  {followedExplorers.size === 0
                    ? 'Follow explorers to see their latest entries, expeditions, and updates in your personalized feed.'
                    : 'The explorers you follow haven\'t posted any content yet. Check back later or discover more explorers.'}
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => setViewMode('global')}
                    className="px-4 py-2 bg-[#4676ac] text-white hover:bg-[#3a5f8c] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#4676ac] text-xs font-bold"
                  >
                    BROWSE GLOBAL
                  </button>
                  <button
                    onClick={() => router.push('/explorers')}
                    className="px-4 py-2 border-2 border-[#4676ac] text-[#4676ac] hover:bg-[#4676ac] hover:text-white transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#4676ac] text-xs font-bold"
                  >
                    DISCOVER EXPLORERS
                  </button>
                </div>
              </div>
            )}

            {/* Following Content */}
            {!followingLoading && followingLoaded && hasFollowingContent && (
              <>
                {/* Followed Explorer Strip */}
                {followedExplorerStripData.length > 0 && (
                  <div className="mt-6">
                    <FollowedExplorerStrip
                      explorers={followedExplorerStripData}
                      onViewExplorer={(username) => router.push(`/journal/${username}`)}
                    />
                  </div>
                )}

                {/* Explorer Map - Following Context */}
                <div className="mt-6">
                  <ExplorerMap context="following" />
                </div>

                {/* Expeditions from Followed Explorers */}
                {followingExpeditionCards.length > 0 && (
                  <div className="mt-8">
                    <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-6 mb-6">
                      <div className="flex items-center justify-between mb-4 border-b-2 border-[#202020] dark:border-[#616161] pb-2">
                        <h3 className="text-sm font-bold dark:text-[#e5e5e5]">EXPEDITIONS FROM FOLLOWED EXPLORERS</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {followingExpeditionCards.map((expedition) => (
                          <ExpeditionCard
                            key={expedition.id}
                            {...expedition}
                            onViewJournal={() => router.push(`/expedition/${expedition.id}`)}
                            onSupport={() => router.push(`/sponsor/${expedition.id}`)}
                            onViewExplorer={() => router.push(`/journal/${expedition.explorerUsername}`)}
                            isBookmarked={bookmarkedExpeditions.has(expedition.id)}
                            isBookmarkLoading={expeditionBookmarkingInProgress.has(expedition.id)}
                            onBookmark={() => handleBookmarkExpedition(expedition.id)}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Journal Entries from Followed Explorers */}
                {followingEntryCards.length > 0 && (
                  <div className="mt-8">
                    <JournalGrid
                      entries={followingEntryCards}
                      title="JOURNAL ENTRIES FROM FOLLOWED"
                    />
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* GLOBAL MODE - Discovery Content */}
        {viewMode === 'global' && !loading && (
          <>
            {/* Global Explorer Map - Primary Element */}
            <div className="mt-8">
              <ExplorerMap />
            </div>

            {/* Featured Expeditions */}
            {featuredExpeditions.length > 0 && (
              <div className="mt-8">
                <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-6 mb-6">
                  <div className="flex items-center justify-between mb-4 border-b-2 border-[#202020] dark:border-[#616161] pb-2">
                    <h3 className="text-sm font-bold dark:text-[#e5e5e5]">FEATURED EXPEDITIONS</h3>
                    <button
                      onClick={() => router.push('/expeditions')}
                      className="text-xs text-[#4676ac] hover:text-[#365a87] font-mono"
                    >
                      VIEW ALL →
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {featuredExpeditions.map((expedition) => (
                      <ExpeditionCard
                        key={expedition.id}
                        {...expedition}
                        onViewJournal={() => router.push(`/expedition/${expedition.id}`)}
                        onSupport={() => router.push(`/sponsor/${expedition.id}`)}
                        onViewExplorer={() => router.push(`/journal/${expedition.explorerUsername}`)}
                        isBookmarked={bookmarkedExpeditions.has(expedition.id)}
                        isBookmarkLoading={expeditionBookmarkingInProgress.has(expedition.id)}
                        onBookmark={() => handleBookmarkExpedition(expedition.id)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Featured Explorers */}
            {featuredExplorers.length > 0 && (
              <div className="mt-8">
                <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-6 mb-6">
                  <div className="flex items-center justify-between mb-4 border-b-2 border-[#202020] dark:border-[#616161] pb-2">
                    <h3 className="text-sm font-bold dark:text-[#e5e5e5]">FEATURED EXPLORERS</h3>
                    <button
                      onClick={() => router.push('/explorers')}
                      className="text-xs text-[#4676ac] hover:text-[#365a87] font-mono"
                    >
                      VIEW ALL →
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {featuredExplorers.map((explorer) => (
                      <ExplorerCard
                        key={explorer.id}
                        {...explorer}
                        isFollowing={followedExplorers.has(explorer.id)}
                        isBookmarked={bookmarkedExplorers.has(explorer.id)}
                        isFollowLoading={explorerFollowingInProgress.has(explorer.id)}
                        isBookmarkLoading={explorerBookmarkingInProgress.has(explorer.id)}
                        onViewProfile={() => router.push(`/journal/${explorer.id}`)}
                        onViewJournal={() => router.push(`/journal/${explorer.id}`)}
                        onSupport={() => router.push(`/journal/${explorer.id}`)}
                        onFollow={() => handleFollowExplorer(explorer.id)}
                        onBookmark={() => handleBookmarkExplorer(explorer.id)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Recent Journal Entries */}
            {recentEntries.length > 0 && (
              <div className="mt-8">
                <JournalGrid
                  entries={recentEntries}
                  onViewAll={() => router.push('/entries')}
                />
              </div>
            )}

            {/* Empty State */}
            {featuredExpeditions.length === 0 && featuredExplorers.length === 0 && recentEntries.length === 0 && (
              <div className="mt-8 bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-12 text-center">
                <Globe className="w-12 h-12 text-[#b5bcc4] mx-auto mb-4" />
                <h3 className="font-bold text-lg mb-2 dark:text-[#e5e5e5]">Welcome to Heimursaga</h3>
                <p className="text-sm text-[#616161] dark:text-[#b5bcc4] mb-6 max-w-md mx-auto">
                  Be among the first explorers to share your expeditions and journal entries with the world.
                </p>
                <button
                  onClick={() => router.push('/signup')}
                  className="px-6 py-3 bg-[#ac6d46] text-white hover:bg-[#8a5738] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] text-sm font-bold"
                >
                  START YOUR JOURNEY
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
