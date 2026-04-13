'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { ExpeditionCard } from '@/app/components/ExpeditionCard';
import { Compass, Loader2 } from 'lucide-react';
import { expeditionApi, explorerApi, type Expedition } from '@/app/services/api';
import { calculateDaysElapsed } from '@/app/utils/dateFormat';
import { useAuth } from '@/app/context/AuthContext';
import { useProFeatures } from '@/app/hooks/useProFeatures';
import { ExpeditionCardSkeleton, SKELETON_COUNT } from '@/app/components/skeletons/CardSkeletons';
import { ErrorState } from '@/app/components/ErrorState';
import { ConfirmationModal } from '@/app/components/ConfirmationModal';
import { toast } from 'sonner';

export function ExpeditionsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user } = useAuth();
  const { canAdoptBlueprints } = useProFeatures();

  // API data state
  const [apiExpeditions, setApiExpeditions] = useState<Expedition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookmarkedExpeditions, setBookmarkedExpeditions] = useState<Set<string>>(new Set());

  // Pagination state
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [totalResults, setTotalResults] = useState(0);

  // Filter & search state
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Loading state for async actions
  const [bookmarkingInProgress, setBookmarkingInProgress] = useState<Set<string>>(new Set());
  const [showActiveExpeditionModal, setShowActiveExpeditionModal] = useState(false);

  // Handle adopt blueprint — block if user has active/planned expedition
  const handleAdoptBlueprint = async (expeditionId: string) => {
    if (!isAuthenticated) {
      router.push('/auth');
      return;
    }
    if (!canAdoptBlueprints) {
      // Guides cannot adopt their own (or any) blueprints — they create them.
      toast.error('Guide accounts cannot launch blueprints');
      return;
    }
    try {
      // Check if user has any active or planned expeditions
      const userExps = await explorerApi.getExpeditions(user!.username);
      const hasActiveOrPlanned = userExps.data.some(
        (e: any) => (e.status === 'active' || e.status === 'planned'),
      );
      if (hasActiveOrPlanned) {
        setShowActiveExpeditionModal(true);
        return;
      }
      const res = await expeditionApi.adopt(expeditionId);
      router.push(`/expedition-quick-entry/${res.expeditionId}`);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Failed to launch blueprint';
      toast.error(msg);
    }
  };

  // Handle bookmark expedition with loading state
  const handleBookmarkExpedition = async (expeditionId: string) => {
    if (!isAuthenticated) {
      router.push('/auth');
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
    setPage(1);
    try {
      const data = await expeditionApi.getAll({ page: 1, limit: 20 });
      setApiExpeditions(data.data || []);
      setTotalResults(data.results || 0);
      setHasMore((data.data || []).length < (data.results || 0));
    } catch {
      setError('Failed to load expeditions. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load more expeditions
  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    const nextPage = page + 1;
    try {
      const data = await expeditionApi.getAll({ page: nextPage, limit: 20 });
      const newExpeditions = data.data || [];
      setApiExpeditions(prev => [...prev, ...newExpeditions]);
      setPage(nextPage);
      setHasMore(newExpeditions.length > 0 && (apiExpeditions.length + newExpeditions.length) < (data.results || 0));

      // Update bookmark state for new expeditions
      const newBookmarked = newExpeditions.filter(e => e.bookmarked && e.id).map(e => e.id!);
      if (newBookmarked.length > 0) {
        setBookmarkedExpeditions(prev => new Set([...prev, ...newBookmarked]));
      }
    } catch (err) {
      console.error('Error loading more expeditions:', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, page, apiExpeditions.length]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await expeditionApi.getAll({ page: 1, limit: 20 });
        if (!cancelled) {
          setApiExpeditions(data.data || []);
          setTotalResults(data.results || 0);
          setHasMore((data.data || []).length < (data.results || 0));

          // Initialize bookmark state from API data
          const bookmarkedSet = new Set<string>();
          (data.data || []).forEach(exp => {
            if (exp.bookmarked && exp.id) {
              bookmarkedSet.add(exp.id);
            }
          });
          setBookmarkedExpeditions(bookmarkedSet);
        }
      } catch {
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
  const transformedExpeditions = useMemo(() => apiExpeditions.map(exp => ({
    id: exp.publicId || exp.id || '',
    title: exp.title,
    explorer: exp.author?.username || exp.explorer?.username || 'Unknown',
    journal: exp.author?.name || exp.author?.username || exp.explorer?.name || exp.explorer?.username || 'Unknown',
    description: exp.description || '',
    category: exp.category || '',
    region: exp.region || '',
    locationName: exp.locationName || '',
    startDate: exp.startDate || '',
    endDate: exp.endDate || '',
    status: (exp.status === 'active' ? 'active' : exp.status === 'completed' ? 'completed' : exp.status === 'cancelled' ? 'cancelled' : 'planned') as 'active' | 'completed' | 'planned' | 'cancelled',
    daysActive: calculateDaysElapsed(exp.startDate, exp.endDate, exp.status),
    goal: exp.goal || 0,
    raised: (exp.raised || 0) + (exp.recurringStats?.totalCommitted || 0),
    sponsors: exp.sponsorsCount || 0,
    entries: exp.entriesCount || 0,
    distance: exp.totalDistanceKm || 0,
    waypointsCount: exp.waypointsCount || 0,
    currentLocation: '',
    coordinates: '',
    imageUrl: exp.coverImage || 'https://images.unsplash.com/photo-1503806837798-ea0ce2e6402e?w=800',
    terrain: '',
    averageSpeed: 0,
    daysRemaining: exp.endDate ? Math.max(0, Math.floor((new Date(exp.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : null,
    visibility: (exp.visibility || 'public') as 'public' | 'off-grid' | 'private',
    // Sponsorship visibility: only show if goal is set (implies Pro account and sponsorships enabled)
    sponsorshipsEnabled: (exp.goal || 0) > 0,
    explorerIsPro: (exp.goal || 0) > 0,
    stripeConnected: exp.author?.stripeAccountConnected === true,
    isBlueprint: exp.isBlueprint === true,
    mode: exp.mode,
    adoptionsCount: exp.adoptionsCount ?? 0,
    averageRating: exp.averageRating,
    ratingsCount: exp.ratingsCount ?? 0,
    elevationMinM: exp.elevationMinM,
    elevationMaxM: exp.elevationMaxM,
    estimatedDurationH: exp.estimatedDurationH,
    waypointCoords: (exp.waypoints || [])
      .filter(w => w.lat != null && w.lon != null)
      .map(w => ({ lat: w.lat!, lng: w.lon! })),
  })), [apiExpeditions]);

  // Apply filters and search
  const filteredExpeditions = useMemo(() => {
    let result = transformedExpeditions;

    // Apply filter
    if (activeFilter === 'active') {
      result = result.filter(e => e.status === 'active');
    } else if (activeFilter === 'planned') {
      result = result.filter(e => e.status === 'planned');
    } else if (activeFilter === 'completed') {
      result = result.filter(e => e.status === 'completed');
    } else if (activeFilter === 'sponsored') {
      result = result.filter(e => e.sponsorshipsEnabled && e.explorerIsPro && e.stripeConnected && e.raised < e.goal);
    } else if (activeFilter === 'blueprints') {
      result = result.filter(e => e.isBlueprint);
    }

    // Apply search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(e =>
        e.title.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.explorer.toLowerCase().includes(q) ||
        e.journal.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        e.region.toLowerCase().includes(q)
      );
    }

    return result;
  }, [transformedExpeditions, activeFilter, searchQuery]);

  const expeditions = filteredExpeditions;

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-12">
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
                : 'bg-[#2a2a2a] text-white hover:scale-105'
            }`}
          >
            EXPLORERS
          </Link>
          <Link
            href="/expeditions"
            className={`px-3 md:px-4 py-2 text-xs font-bold shrink-0 transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#4676ac] ${
              isActive('/expeditions')
                ? 'bg-[#4676ac] text-white'
                : 'bg-[#2a2a2a] text-white hover:scale-105'
            }`}
          >
            EXPEDITIONS
          </Link>
          <Link
            href="/entries"
            className={`px-3 md:px-4 py-2 text-xs font-bold shrink-0 transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#4676ac] ${
              isActive('/entries')
                ? 'bg-[#4676ac] text-white'
                : 'bg-[#2a2a2a] text-white hover:scale-105'
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
              {loading ? 'LOADING...' : error ? 'ERROR' : expeditions.length !== transformedExpeditions.length ? `${expeditions.length} / ${transformedExpeditions.length} RESULTS` : `${expeditions.length} RESULTS`}
            </span>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search expeditions by title, explorer, location, or category..."
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

          <div className="flex flex-wrap gap-1.5 md:gap-2 lg:gap-3 text-xs mt-4">
            {[
              { key: 'all', label: 'ALL' },
              { key: 'active', label: 'ACTIVE' },
              { key: 'planned', label: 'PLANNED' },
              { key: 'completed', label: 'COMPLETED' },
              { key: 'sponsored', label: 'SEEKING SPONSORS' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActiveFilter(key)}
                className={`px-3 py-1.5 whitespace-nowrap font-bold transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none ${
                  activeFilter === key
                    ? 'bg-[#4676ac] text-white hover:bg-[#365a87] focus-visible:ring-[#4676ac]'
                    : 'border border-[#202020] dark:border-[#616161] dark:text-[#e5e5e5] hover:bg-[#95a2aa] dark:hover:bg-[#3a3a3a] focus-visible:ring-[#616161]'
                }`}
              >
                {label}
              </button>
            ))}
            <button
              onClick={() => setActiveFilter('blueprints')}
              className={`px-3 py-1.5 whitespace-nowrap font-bold transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none ${
                activeFilter === 'blueprints'
                  ? 'bg-[#4676ac] text-white hover:bg-[#365a87] focus-visible:ring-[#4676ac]'
                  : 'border border-[#202020] dark:border-[#616161] dark:text-[#e5e5e5] hover:bg-[#95a2aa] dark:hover:bg-[#3a3a3a] focus-visible:ring-[#616161]'
              }`}
            >
              BLUEPRINTS
            </button>
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
      ) : expeditions.length === 0 && transformedExpeditions.length > 0 ? (
        // No results after filtering
        <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-12 text-center">
          <Compass className="w-16 h-16 text-[#b5bcc4] dark:text-[#616161] mx-auto mb-4" aria-hidden="true" />
          <h3 className="text-lg font-bold text-[#202020] dark:text-[#e5e5e5] mb-2">
            No results match your filters
          </h3>
          <p className="text-sm text-[#616161] dark:text-[#b5bcc4]">
            Try adjusting your search or filter criteria.
          </p>
        </div>
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
            const percentage = expedition.goal > 0 ? Math.min((expedition.raised / expedition.goal) * 100, 100) : 0;

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
                journalEntries={expedition.entries}
                fundingGoal={expedition.goal}
                fundingCurrent={expedition.raised}
                fundingPercentage={percentage}
                backers={expedition.sponsors}
                distance={expedition.distance}
                status={expedition.status}
                region={expedition.region}
                locationName={expedition.locationName}
                visibility={expedition.visibility}
                terrain={expedition.terrain}
                averageSpeed={expedition.averageSpeed}
                sponsorshipsEnabled={expedition.sponsorshipsEnabled}
                explorerIsPro={expedition.explorerIsPro}
                stripeConnected={expedition.stripeConnected}
                isBlueprint={expedition.isBlueprint}
                mode={expedition.mode}
                adoptionsCount={expedition.adoptionsCount}
                averageRating={expedition.averageRating}
                ratingsCount={expedition.ratingsCount}
                elevationMinM={expedition.elevationMinM}
                elevationMaxM={expedition.elevationMaxM}
                estimatedDurationH={expedition.estimatedDurationH}
                waypointCoords={expedition.waypointCoords}
                onViewJournal={() => router.push(`/expedition/${expedition.id}`)}
                onViewExplorer={() => router.push(`/journal/${expedition.explorer}`)}
                onSupport={() => router.push(`/sponsor/${expedition.id}`)}
                onAdopt={() => handleAdoptBlueprint(expedition.id)}
                isBookmarked={bookmarkedExpeditions.has(expedition.id)}
                isBookmarkLoading={bookmarkingInProgress.has(expedition.id)}
                onBookmark={() => handleBookmarkExpedition(expedition.id)}
              />
            );
          })}
        </div>
      )}

      {!loading && !error && expeditions.length > 0 && hasMore && (
        <div className="mt-6 text-center">
          <button
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            className="px-6 py-3 bg-[#616161] text-white hover:bg-[#4676ac] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#4676ac] text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            {isLoadingMore && <Loader2 className="w-4 h-4 animate-spin" />}
            {isLoadingMore ? 'LOADING...' : 'LOAD MORE EXPEDITIONS'}
          </button>
        </div>
      )}
      <ConfirmationModal
        isOpen={showActiveExpeditionModal}
        onClose={() => setShowActiveExpeditionModal(false)}
        onConfirm={() => setShowActiveExpeditionModal(false)}
        title="Cannot Launch Blueprint"
        confirmLabel="OK"
      >
        <p className="text-sm text-[#616161] dark:text-[#b5bcc4]">
          You already have an active or planned expedition. Complete or cancel your current expedition before launching a new one from a blueprint.
        </p>
      </ConfirmationModal>
    </div>
  );
}
