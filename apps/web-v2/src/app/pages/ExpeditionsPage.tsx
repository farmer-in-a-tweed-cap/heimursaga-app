'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { ExpeditionCard } from '@/app/components/ExpeditionCard';
import { Compass } from 'lucide-react';
import { expeditionApi, type Expedition } from '@/app/services/api';
import { calculateDaysElapsed } from '@/app/utils/dateFormat';
import { useAuth } from '@/app/context/AuthContext';
import { ExpeditionCardSkeleton, SKELETON_COUNT } from '@/app/components/skeletons/CardSkeletons';
import { ErrorState } from '@/app/components/ErrorState';

export function ExpeditionsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();

  // API data state
  const [apiExpeditions, setApiExpeditions] = useState<Expedition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookmarkedExpeditions, setBookmarkedExpeditions] = useState<Set<string>>(new Set());

  // Loading state for async actions
  const [bookmarkingInProgress, setBookmarkingInProgress] = useState<Set<string>>(new Set());

  // Handle bookmark expedition with loading state
  const handleBookmarkExpedition = async (expeditionId: string) => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    // Prevent duplicate requests
    if (bookmarkingInProgress.has(expeditionId)) return;

    setBookmarkingInProgress(prev => new Set(prev).add(expeditionId));
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
      setBookmarkingInProgress(prev => {
        const next = new Set(prev);
        next.delete(expeditionId);
        return next;
      });
    }
  };

  // Fetch expeditions from API
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await expeditionApi.getAll();
      setApiExpeditions(data.data || []);
    } catch (err) {
      setError('Failed to load expeditions. Please check your connection and try again.');
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
        const data = await expeditionApi.getAll();
        if (!cancelled) {
          setApiExpeditions(data.data || []);
        }
      } catch (err) {
        if (!cancelled) {
          setError('Failed to load expeditions. Please check your connection and try again.');
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

  // Transform API expeditions to match component props
  const transformedExpeditions = apiExpeditions.map(exp => ({
    id: exp.publicId || exp.id || '',
    title: exp.title,
    explorer: exp.explorer?.username || 'Unknown',
    journal: exp.explorer?.name || exp.explorer?.username || 'Unknown',
    description: exp.description || '',
    category: '',
    startDate: exp.startDate || '',
    endDate: exp.endDate || '',
    status: (exp.status === 'active' ? 'active' : exp.status === 'completed' ? 'completed' : 'planned') as 'active' | 'completed' | 'planned',
    daysActive: calculateDaysElapsed(exp.startDate, exp.endDate, exp.status),
    goal: exp.goal || 0,
    raised: exp.raised || 0,
    sponsors: exp.sponsorsCount || 0,
    entries: exp.entriesCount || 0,
    distance: 0,
    currentLocation: '',
    coordinates: '',
    imageUrl: exp.coverImage || 'https://images.unsplash.com/photo-1503806837798-ea0ce2e6402e?w=800',
    lastUpdate: 'Recently',
    terrain: '',
    averageSpeed: 0,
    daysRemaining: exp.endDate ? Math.max(0, Math.floor((new Date(exp.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : null,
    // Sponsorship visibility: only show if goal is set (implies Pro account and sponsorships enabled)
    sponsorshipsEnabled: (exp.goal || 0) > 0,
    explorerIsPro: (exp.goal || 0) > 0,
  }));

  const expeditions = transformedExpeditions;

  return (
    <div className="max-w-[1600px] mx-auto px-6 py-8">
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
            <h1 className="text-2xl font-bold dark:text-[#e5e5e5]">EXPEDITION DIRECTORY</h1>
            <span className="text-xs text-[#616161] dark:text-[#b5bcc4] font-mono">
              {loading ? 'LOADING...' : error ? 'ERROR' : `${expeditions.length} EXPEDITIONS`}
            </span>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search expeditions by title, explorer, location, or category..."
              className="flex-1 px-3 md:px-4 py-2 border-2 border-[#b5bcc4] dark:border-[#3a3a3a] dark:bg-[#2a2a2a] dark:text-[#e5e5e5] focus:border-[#ac6d46] outline-none text-xs md:text-sm"
            />
            <button className="px-3 md:px-4 py-2 bg-[#ac6d46] text-white text-xs md:text-sm hover:bg-[#8a5738] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] whitespace-nowrap">
              SEARCH
            </button>
          </div>

          <div className="flex flex-wrap gap-2 text-xs mt-4">
            <button className="px-3 py-1.5 bg-[#4676ac] text-white whitespace-nowrap hover:bg-[#365a87] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#4676ac]">ALL ACTIVE</button>
            <button className="px-3 py-1.5 border border-[#202020] dark:border-[#616161] dark:text-[#e5e5e5] hover:bg-[#95a2aa] dark:hover:bg-[#3a3a3a] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#616161] whitespace-nowrap">NEED SPONSORSHIP</button>
            <button className="px-3 py-1.5 border border-[#202020] dark:border-[#616161] dark:text-[#e5e5e5] hover:bg-[#95a2aa] dark:hover:bg-[#3a3a3a] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#616161] whitespace-nowrap">FULLY FUNDED</button>
            <button className="px-3 py-1.5 border border-[#202020] dark:border-[#616161] dark:text-[#e5e5e5] hover:bg-[#95a2aa] dark:hover:bg-[#3a3a3a] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#616161] whitespace-nowrap">RECENTLY STARTED</button>
            <button className="px-3 py-1.5 border border-[#202020] dark:border-[#616161] dark:text-[#e5e5e5] hover:bg-[#95a2aa] dark:hover:bg-[#3a3a3a] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#616161] whitespace-nowrap">BY CATEGORY</button>
          </div>
        </div>
      </div>

      {/* Expedition List */}
      {loading ? (
        // Loading skeleton grid
        <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-6">
          {SKELETON_COUNT.map((i) => (
            <ExpeditionCardSkeleton key={i} />
          ))}
        </div>
      ) : error ? (
        // Error state
        <ErrorState
          title="Failed to load expeditions"
          message={error}
          onRetry={fetchData}
        />
      ) : expeditions.length === 0 ? (
        // Empty state
        <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-12 text-center">
          <Compass className="w-16 h-16 text-[#b5bcc4] dark:text-[#616161] mx-auto mb-4" aria-hidden="true" />
          <h3 className="text-lg font-bold text-[#202020] dark:text-[#e5e5e5] mb-2">
            No expeditions found
          </h3>
          <p className="text-sm text-[#616161] dark:text-[#b5bcc4]">
            Be the first to start an expedition and share your adventure with the world.
          </p>
        </div>
      ) : (
        // Expedition cards grid
        <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-6">
          {expeditions.map((expedition) => {
            const percentage = Math.min((expedition.raised / expedition.goal) * 100, 100);

            return (
              <ExpeditionCard
                key={expedition.id}
                id={expedition.id}
                title={expedition.title}
                explorer={expedition.explorer}
                description={expedition.description}
                imageUrl={expedition.imageUrl}
                location={expedition.currentLocation}
                coordinates={expedition.coordinates}
                startDate={expedition.startDate}
                endDate={expedition.endDate}
                daysElapsed={expedition.daysActive}
                daysRemaining={expedition.daysRemaining}
                journalEntries={expedition.entries}
                lastUpdate={expedition.lastUpdate}
                fundingGoal={expedition.goal}
                fundingCurrent={expedition.raised}
                fundingPercentage={percentage}
                backers={expedition.sponsors}
                distance={expedition.distance}
                status={expedition.status}
                terrain={expedition.terrain}
                averageSpeed={expedition.averageSpeed}
                sponsorshipsEnabled={expedition.sponsorshipsEnabled}
                explorerIsPro={expedition.explorerIsPro}
                onViewJournal={() => router.push(`/expedition/${expedition.id}`)}
                onSupport={() => router.push(`/sponsor/${expedition.id}`)}
                isBookmarked={bookmarkedExpeditions.has(expedition.id)}
                isBookmarkLoading={bookmarkingInProgress.has(expedition.id)}
                onBookmark={() => handleBookmarkExpedition(expedition.id)}
              />
            );
          })}
        </div>
      )}

      {/* Load More - TODO: Implement pagination */}
      {!loading && !error && expeditions.length > 0 && (
        <div className="mt-6 text-center">
          <button className="px-6 py-3 bg-[#616161] text-white hover:bg-[#4676ac] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#4676ac] text-sm font-bold">
            LOAD MORE EXPEDITIONS
          </button>
        </div>
      )}
    </div>
  );
}
