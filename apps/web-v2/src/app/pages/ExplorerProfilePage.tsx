'use client';

import { useState, useEffect } from 'react';
import { ExternalLink, UserPlus, UserCheck, Globe, Twitter, Instagram, Youtube, Linkedin, Camera, Share2, Settings, AlertTriangle, Loader2, Users } from 'lucide-react';
import { ExplorerExpeditionsMap } from '@/app/components/ExplorerExpeditionsMap';
import { InteractionButtons } from '@/app/components/InteractionButtons';
import { ExpeditionCard } from '@/app/components/ExpeditionCard';
import { EntryCard } from '@/app/components/EntryCard';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';
import { ExplorerStatusBadge, getExplorerStatus, getCurrentExpeditionInfo } from '@/app/components/ExplorerStatusBadge';
import { useAuth } from '@/app/context/AuthContext';
import { formatLocationByPrivacy, type LocationData, type LocationPrivacyLevel } from '@/app/utils/locationPrivacy';
import { calculateDaysElapsed } from '@/app/utils/dateFormat';
import { explorerApi, entryApi, expeditionApi, type ExplorerProfile, type ExplorerEntry, type ExplorerExpedition, type ExplorerFollower } from '@/app/services/api';
import { CountryFlag } from '@/app/components/CountryFlag';
import { ContinentIcon } from '@/app/components/ContinentIcon';
import { calculatePassport } from '@/app/utils/passportCalculator';

/**
 * Format social link handles/usernames into full URLs
 */
function formatSocialLink(platform: 'website' | 'twitter' | 'instagram' | 'youtube', value: string | undefined): string {
  if (!value) return '';

  // Remove leading @ if present
  const cleanValue = value.replace(/^@/, '').trim();
  if (!cleanValue) return '';

  switch (platform) {
    case 'website':
      // If it's already a full URL, use it; otherwise add https://
      if (value.startsWith('http://') || value.startsWith('https://')) {
        return value;
      }
      return `https://${value}`;
    case 'twitter':
      // If it's already a full URL, use it
      if (value.includes('twitter.com') || value.includes('x.com')) {
        return value.startsWith('http') ? value : `https://${value}`;
      }
      return `https://x.com/${cleanValue}`;
    case 'instagram':
      // If it's already a full URL, use it
      if (value.includes('instagram.com')) {
        return value.startsWith('http') ? value : `https://${value}`;
      }
      return `https://instagram.com/${cleanValue}`;
    case 'youtube':
      // If it's already a full URL, use it
      if (value.includes('youtube.com') || value.includes('youtu.be')) {
        return value.startsWith('http') ? value : `https://${value}`;
      }
      // Assume it's a channel handle
      return `https://youtube.com/@${cleanValue}`;
    default:
      return value;
  }
}

export function ExplorerProfilePage() {
  const { username } = useParams<{ username: string }>();
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();

  // API data state
  const [profile, setProfile] = useState<ExplorerProfile | null>(null);
  const [entries, setEntries] = useState<ExplorerEntry[]>([]);
  const [expeditions, setExpeditions] = useState<ExplorerExpedition[]>([]);
  const [followers, setFollowers] = useState<ExplorerFollower[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookmarkedEntries, setBookmarkedEntries] = useState<Set<string>>(new Set());
  const [entryBookmarkingInProgress, setEntryBookmarkingInProgress] = useState<Set<string>>(new Set());
  const [bookmarkedExpeditions, setBookmarkedExpeditions] = useState<Set<string>>(new Set());
  const [isExplorerBookmarked, setIsExplorerBookmarked] = useState(false);
  const [explorerBookmarkLoading, setExplorerBookmarkLoading] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  // Handle bookmark explorer profile
  const handleBookmarkExplorer = async () => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (!username || explorerBookmarkLoading) return;

    setExplorerBookmarkLoading(true);
    try {
      await explorerApi.bookmark(username);
      setIsExplorerBookmarked(prev => !prev);
    } catch (err) {
      console.error('Error bookmarking explorer:', err);
    } finally {
      setExplorerBookmarkLoading(false);
    }
  };

  // Handle follow/unfollow explorer
  const handleFollowExplorer = async () => {
    if (!isAuthenticated) {
      router.push('/auth');
      return;
    }
    if (!username || followLoading) return;

    setFollowLoading(true);
    try {
      if (isFollowing) {
        await explorerApi.unfollow(username);
      } else {
        await explorerApi.follow(username);
      }
      setIsFollowing(prev => !prev);
    } catch (err) {
      console.error('Error following/unfollowing explorer:', err);
    } finally {
      setFollowLoading(false);
    }
  };

  // Handle bookmark entry
  const handleBookmarkEntry = async (entryId: string) => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (entryBookmarkingInProgress.has(entryId)) return;

    setEntryBookmarkingInProgress(prev => new Set(prev).add(entryId));
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
      setEntryBookmarkingInProgress(prev => {
        const next = new Set(prev);
        next.delete(entryId);
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
    }
  };

  // Check if this is the logged-in user's own profile
  const isOwnProfile = user && (username === user.username || username === String(user.id));

  // Determine the username to fetch (use logged-in user's username if viewing own profile by ID)
  const usernameToFetch = isOwnProfile && user ? user.username : username;

  // Fetch explorer data from API
  useEffect(() => {
    if (!usernameToFetch) return;

    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch all data in parallel
        const [profileData, entriesData, expeditionsData, followersData] = await Promise.all([
          explorerApi.getByUsername(usernameToFetch).catch(() => null),
          explorerApi.getEntries(usernameToFetch).catch(() => ({ data: [], results: 0 })),
          explorerApi.getExpeditions(usernameToFetch).catch(() => ({ data: [], results: 0 })),
          explorerApi.getFollowers(usernameToFetch).catch(() => ({ data: [], results: 0 })),
        ]);

        if (cancelled) return;

        if (!profileData) {
          setError('Explorer not found');
          return;
        }

        setProfile(profileData);
        setIsExplorerBookmarked(profileData.bookmarked || false);
        setIsFollowing(profileData.followed || false);
        setEntries(entriesData.data || []);
        setExpeditions(expeditionsData.data || []);
        setFollowers(followersData.data || []);
      } catch (err) {
        if (!cancelled) {
          setError('Failed to load profile');
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
  }, [usernameToFetch]);

  // Show loading state
  if (loading) {
    return (
      <div className="max-w-[1600px] mx-auto px-6 py-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-[#ac6d46]" />
          <span className="ml-3 text-[#616161]">Loading explorer journal...</span>
        </div>
      </div>
    );
  }

  // Show error state
  if (error || !profile) {
    return (
      <div className="max-w-[1600px] mx-auto px-6 py-8">
        <div className="bg-white dark:bg-[#202020] border-2 border-[#ac6d46] p-8 text-center">
          <AlertTriangle className="w-12 h-12 text-[#ac6d46] mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2 dark:text-white">{error || 'Explorer not found'}</h2>
          <p className="text-[#616161] mb-4">The explorer profile could not be loaded.</p>
          <button
            onClick={() => router.back()}
            className="px-6 py-2 bg-[#ac6d46] text-white font-bold hover:bg-[#8a5738] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46]"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Calculate passport data from entries (countries, continents, achievements)
  const passportData = calculatePassport(entries, expeditions, profile);

  // Build explorer object from API data + fallbacks for missing fields
  // TODO: Many fields are not yet provided by the API and use placeholder data
  const explorer = {
    // Core data from API
    id: username || '1',
    name: profile.username,
    fullName: profile.username, // API doesn't have display name
    accountType: (profile.creator ? 'explorer-pro' : 'explorer') as 'explorer-pro' | 'explorer',
    journalName: profile.name || profile.username,
    tagline: '', // Not in API
    bio: profile.bio || '',
    fromLocation: profile.locationFrom || '',
    fromCoordinates: '',
    currentLocation: profile.locationLives || '',
    currentCoordinates: '',
    location: profile.locationLives || profile.locationFrom || 'Location not set',
    coordinates: '',
    joined: profile.memberDate ? new Date(profile.memberDate).toISOString().split('T')[0] : '',
    lastActive: '',
    accountStatus: 'verified',
    privacyLevel: 'Regional Location Only' as LocationPrivacyLevel,
    avatarUrl: profile.picture || 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=200',
    coverImageUrl: profile.coverPhoto || 'https://images.unsplash.com/photo-1542224566-6e85f2e6772f?w=1200',

    // Stats from fetched data
    stats: {
      totalExpeditions: expeditions.length,
      activeExpeditions: expeditions.filter(e => e.status === 'active').length,
      completedExpeditions: expeditions.filter(e => e.status === 'completed').length,
      totalEntries: entries.length,
      totalPhotos: 0,
      totalVideo: 0,
      totalDistance: 0,
      daysOnRoad: 0,
      countriesVisited: passportData.countries.length,
      totalSponsored: 0,
      currentSponsors: 0,
      followers: followers.length,
      totalViews: 0,
    },

    // Equipment from API, with mock fallback for explorer1
    equipment: (profile.equipment && profile.equipment.length > 0)
      ? profile.equipment
      : (username === 'explorer1' ? [
          'Canon EOS R5 + RF 24-70mm f/2.8',
          'DJI Mavic 3 Pro',
          '2022 Toyota Land Cruiser',
          'Starlink Mini',
          'Goal Zero Yeti 1500X',
          'Jackery SolarSaga 100W Panels',
          'iKamper Skycamp 3.0 Rooftop Tent',
          'Garmin inReach Mini 2',
        ] : [] as string[]),

    // Links from API - format handles into full URLs
    links: {
      website: formatSocialLink('website', profile.website),
      portfolio: formatSocialLink('website', profile.portfolio),
      twitter: formatSocialLink('twitter', profile.twitter),
      instagram: formatSocialLink('instagram', profile.instagram),
      youtube: formatSocialLink('youtube', profile.youtube),
      linkedin: '',
    },

    // Followers from API
    recentFollowers: followers.slice(0, 4).map(f => ({
      id: f.username,
      name: f.username,
      accountType: (f.creator ? 'explorer-pro' : 'explorer') as 'explorer-pro' | 'explorer',
      avatarUrl: f.picture || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100',
      mutualFollow: f.followed || false,
      followedSince: '',
    })),

    // Expeditions from API
    activeExpeditions: expeditions
      .filter(e => e.status === 'active')
      .map(e => ({
        id: (e as any).id || e.publicId,
        title: e.title,
        description: e.description || '',
        coverImage: e.coverImage || '',
        status: 'active' as const,
        startDate: e.startDate || '',
        endDate: e.endDate || '',
        daysActive: calculateDaysElapsed(e.startDate, e.endDate, 'active'),
        currentLocation: '',
        goal: e.goal || 0,
        raised: e.raised || 0,
        sponsorsCount: e.sponsorsCount || 0,
        entriesCount: e.entriesCount || 0,
        lastEntry: '',
      })),

    // Recent expeditions (all statuses, limited to 5)
    recentExpeditions: expeditions.slice(0, 5).map(e => ({
        id: (e as any).id || e.publicId,
        title: e.title,
        description: e.description || '',
        coverImage: e.coverImage || '',
        status: (e.status || 'planned') as 'active' | 'completed' | 'planned',
        startDate: e.startDate || '',
        endDate: e.endDate || '',
        daysActive: calculateDaysElapsed(e.startDate, e.endDate, e.status),
        currentLocation: '',
        goal: e.goal || 0,
        raised: e.raised || 0,
        sponsorsCount: e.sponsorsCount || 0,
        entriesCount: e.entriesCount || 0,
      })),

    completedExpeditions: expeditions
      .filter(e => e.status === 'completed')
      .map(e => ({
        id: (e as any).id || e.publicId,
        title: e.title,
        completedDate: e.endDate || '',
        duration: 0,
        totalRaised: e.raised || 0,
        entries: e.entriesCount || 0,
      })),

    // Entries from API
    recentEntries: entries.slice(0, 5).map(e => ({
      id: e.id || e.publicId || '',
      title: e.title,
      expedition: e.expedition?.title || '',
      expeditionId: e.expedition?.id || '',
      date: e.date || e.createdAt || '',
      timeAgo: '',
      excerpt: e.content?.substring(0, 150) || '',
      mediaCount: (e as any).mediaCount || 0,
      wordCount: (e as any).wordCount || 0,
      type: (e as any).entryType || 'standard',
      location: e.place || '',
      coverImageUrl: (e as any).coverImage,
    })),

    // Passport/Collection - Calculated from entry locations and achievements
    passport: passportData,

    // API-specific
    followed: profile.followed || false,
    you: profile.you || false,
    stripeAccountConnected: profile.stripeAccountConnected || false,
  };

  // Transform API entries to map format (only entries with coordinates)
  const entriesForMap = entries
    .filter(e => e.lat != null && e.lon != null)
    .map(e => ({
      id: e.id || e.publicId || '',
      title: e.title,
      coords: { lat: e.lat!, lng: e.lon! },
      location: e.place || '',
      date: e.date || e.createdAt || '',
      excerpt: e.content?.substring(0, 200) || '',
      mediaCount: (e as any).mediaCount || 0,
      views: 0,
      explorerName: explorer.name,
      expeditionName: e.expedition?.title || '',
      expeditionStatus: 'completed' as const,
    }));

  // Check if there's an actual active expedition from the API
  const hasRealActiveExpedition = expeditions.some(e => e.status === 'active');

  // Find the best expedition to link sponsor button to (prefer active, then planned)
  const sponsorableExpedition = expeditions.find(e => e.status === 'active' && (e.goal || 0) > 0)
    || expeditions.find(e => e.status === 'planned' && (e.goal || 0) > 0);

  // For now, expeditions for map is empty until we have waypoint data from API
  // The map will default to all-entries view
  const expeditionsForMap: Array<{
    id: string;
    title: string;
    color: string;
    status: 'active' | 'completed';
    waypoints: Array<{ id: string; coords: { lat: number; lng: number }; status: 'completed' | 'current' | 'planned' }>;
    entries: typeof entriesForMap;
  }> = [];

  return (
    <div className="max-w-[1600px] mx-auto px-3 py-4 md:px-6 md:py-8">
      {/* Profile Header */}
      <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] mb-4 md:mb-6">
        {/* Banner Section with Custom Cover Image */}
        <div className="relative h-[280px] md:h-[400px] overflow-hidden">
          <ImageWithFallback
            src={explorer.coverImageUrl}
            alt={`${explorer.name} cover`}
            className="h-full w-full object-cover"
          />
          
          {/* Dark gradient overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#202020]/70 via-[#202020]/60 to-[#202020]/90" />
          
          {/* Explorer Status Banner - Top Border */}
          {(() => {
            // Use all expeditions (not just active) so PLANNING status can be detected
            const status = getExplorerStatus(explorer.recentExpeditions);
            const currentExpedition = getCurrentExpeditionInfo(explorer.recentExpeditions);
            
            return (
              <div className={`absolute top-0 left-0 right-0 py-1.5 px-3 md:py-2 md:px-6 z-10 ${
                status === 'EXPLORING' ? 'bg-[#ac6d46]' :
                status === 'PLANNING' ? 'bg-[#4676ac]' :
                'bg-[#616161]'
              }`}>
                <div className="flex items-center justify-start gap-2 md:gap-6 text-white text-xs md:text-sm font-mono">
                  <div className="flex items-center gap-1 md:gap-2">
                    <span className="hidden md:inline text-xs text-white/80">EXPLORER STATUS:</span>
                    <span className="font-bold">{status}</span>
                  </div>

                  {status === 'EXPLORING' && currentExpedition && (
                    <>
                      <div className="h-3 md:h-4 w-px bg-white/30"></div>
                      <div className="flex items-center gap-1 md:gap-2">
                        <span className="text-xs md:text-xs text-white/80">DAY:</span>
                        <span className="font-bold">{currentExpedition.daysActive}</span>
                      </div>
                      <div className="hidden md:block h-4 w-px bg-white/30"></div>
                      <div className="hidden md:flex items-center gap-2">
                        <span className="text-xs text-white/80">EXPEDITION:</span>
                        <Link
                          href={`/expedition/${currentExpedition.id}`}
                          className="font-bold hover:underline"
                        >
                          {currentExpedition.title}
                        </Link>
                      </div>
                    </>
                  )}

                  {status === 'PLANNING' && currentExpedition && (
                    <>
                      <div className="hidden md:block h-4 w-px bg-white/30"></div>
                      <div className="hidden md:flex items-center gap-2">
                        <span className="text-xs text-white/80">EXPEDITION:</span>
                        <Link
                          href={`/expedition/${currentExpedition.id}`}
                          className="font-bold hover:underline"
                        >
                          {currentExpedition.title}
                        </Link>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })()}
          
          {/* Banner Content */}
          <div className="absolute inset-0 flex flex-col p-4 pt-14 md:p-6 md:pt-16">
            <div className="flex items-start gap-3 md:gap-6 w-full">
              {/* Large Avatar */}
              <div className="flex-shrink-0 mt-2">
                <div className="w-20 h-20 md:w-40 md:h-40 border-2 md:border-4 border-[#ac6d46] overflow-hidden bg-[#202020]">
                  <img
                    src={explorer.avatarUrl}
                    alt={explorer.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              <div className="flex-1 pt-0 md:pt-2 min-w-0">
                <div className="flex items-center gap-2 md:gap-3 mb-1 flex-wrap">
                  <h1 className="text-lg md:text-3xl font-bold text-white truncate">{explorer.name}</h1>
                  <span className="px-2 py-0.5 md:px-3 md:py-1 bg-[#ac6d46] text-white text-xs md:text-xs font-bold rounded-full whitespace-nowrap">
                    {explorer.accountType === 'explorer-pro' ? 'EXPLORER PRO' : 'EXPLORER'}
                  </span>
                </div>
                <h2 className="text-sm md:text-xl text-[#ac6d46] mb-2 md:mb-3 truncate">{explorer.journalName}</h2>
                <div className="space-y-0.5 md:space-y-1 text-xs md:text-sm text-white">
                  <div className="flex items-center gap-2">
                    <span className="text-white/60 text-xs md:text-xs uppercase">From:</span>
                    <span className="font-bold truncate">{explorer.fromLocation || 'Not set'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-white/60 text-xs md:text-xs uppercase">Currently:</span>
                    <span className="font-bold truncate">{explorer.currentLocation || 'Not set'}</span>
                  </div>
                  <div className="hidden md:flex items-center gap-2">
                    <span className="text-white/60 text-xs uppercase">Joined:</span>
                    <span className="font-bold">{explorer.joined}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile Passport Collection */}
            {(explorer.passport.stamps.length > 0 || explorer.passport.countries.length > 0 || explorer.passport.continents.length > 0) && (
              <div className="flex lg:hidden items-center gap-3 mt-3 overflow-x-auto pb-1">
                {/* Stamps - smaller on mobile */}
                {explorer.passport.stamps.map((stamp) => (
                  <div key={stamp.id} title={stamp.name}>
                    {stamp.image ? (
                      <img src={stamp.image} alt={stamp.name} className="w-12 h-12 object-contain flex-shrink-0" />
                    ) : (
                      <div className="px-2 py-0.5 bg-[#ac6d46] text-white text-xs font-bold uppercase whitespace-nowrap rounded-full">
                        {stamp.name}
                      </div>
                    )}
                  </div>
                ))}
                {/* Continents */}
                {explorer.passport.continents.map((continent) => (
                  <ContinentIcon key={continent.code} code={continent.code} className="w-7 h-7 flex-shrink-0" title={continent.name} />
                ))}
                {/* Flags */}
                {explorer.passport.countries.slice(0, 10).map((country) => (
                  <CountryFlag key={country.code} code={country.code} className="w-5 h-3.5 flex-shrink-0" title={country.name} />
                ))}
                {explorer.passport.countries.length > 10 && (
                  <span className="text-xs text-white/70 whitespace-nowrap">+{explorer.passport.countries.length - 10}</span>
                )}
              </div>
            )}
          </div>

          {/* Passport Collection - Top Right (hidden on mobile) */}
          {(explorer.passport.stamps.length > 0 || explorer.passport.countries.length > 0 || explorer.passport.continents.length > 0) && (
            <div className="hidden lg:flex absolute top-12 right-6 flex-col items-end gap-4 max-w-[280px]">
              {/* Special Stamps */}
              {explorer.passport.stamps.length > 0 && (
                <div className="flex flex-nowrap justify-end gap-2">
                  {explorer.passport.stamps.map((stamp) => (
                    <div
                      key={stamp.id}
                      className="group relative"
                      title={`${stamp.name}: ${stamp.description}`}
                    >
                      {stamp.image ? (
                        <img
                          src={stamp.image}
                          alt={stamp.name}
                          className="w-32 h-32 object-contain drop-shadow-md"
                        />
                      ) : (
                        <div className="px-3 py-1 bg-[#ac6d46] text-white text-xs font-bold uppercase tracking-wide border border-[#8a5738] shadow-md rounded-full">
                          {stamp.name}
                        </div>
                      )}
                      {/* Tooltip */}
                      <div className="absolute bottom-full right-0 mb-1 hidden group-hover:block z-10">
                        <div className="bg-[#202020] text-white text-xs px-2 py-1 whitespace-nowrap border border-[#616161]">
                          <div className="font-bold">{stamp.name}</div>
                          <div className="font-normal text-[#b5bcc4]">{stamp.description}</div>
                          <div className="font-mono text-[#616161]">{stamp.earnedDate}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Continent Emblems */}
              {explorer.passport.continents.length > 0 && (
                <div className="flex justify-end gap-2">
                  {explorer.passport.continents.map((continent) => (
                    <div
                      key={continent.code}
                      className="group relative"
                    >
                      <ContinentIcon code={continent.code} className="w-10 h-10" title={continent.name} />
                      {/* Tooltip */}
                      <div className="absolute bottom-full right-0 mb-1 hidden group-hover:block z-10">
                        <div className="bg-[#202020] text-white text-xs px-2 py-1 whitespace-nowrap border border-[#616161]">
                          <div className="font-bold">{continent.name}</div>
                          <div className="font-mono text-[#616161]">First: {continent.firstVisit}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Country Flags */}
              {explorer.passport.countries.length > 0 && (
                <div className="flex flex-wrap justify-end gap-1 max-w-[240px]">
                  {explorer.passport.countries.slice(0, 20).map((country) => (
                    <div
                      key={country.code}
                      className="group relative cursor-default"
                      title={country.name}
                    >
                      <CountryFlag code={country.code} className="w-6 h-4 shadow-sm" title={country.name} />
                      {/* Tooltip */}
                      <div className="absolute bottom-full right-0 mb-1 hidden group-hover:block z-10">
                        <div className="bg-[#202020] text-white text-xs px-2 py-1 whitespace-nowrap border border-[#616161]">
                          <div className="font-bold">{country.name}</div>
                          <div className="font-mono text-[#616161]">First: {country.firstVisit}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {explorer.passport.countries.length > 20 && (
                    <span className="text-xs text-white/80 font-mono ml-1">
                      +{explorer.passport.countries.length - 20}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Stats Bar */}
        <div className={`grid ${profile.creator ? 'grid-cols-3 md:grid-cols-6' : 'grid-cols-3 md:grid-cols-5'} border-t-2 border-b-2 border-[#202020] dark:border-[#616161]`}>
          <div className="p-2 md:p-4 border-r border-b md:border-b-0 border-[#b5bcc4] dark:border-[#3a3a3a] flex flex-col items-center justify-center">
            <div className="text-lg md:text-2xl font-bold text-[#ac6d46]">{explorer.stats.totalExpeditions}</div>
            <div className="text-xs md:text-xs text-[#616161] dark:text-[#b5bcc4]">Expeditions</div>
          </div>
          <div className="p-2 md:p-4 border-r border-b md:border-b-0 border-[#b5bcc4] dark:border-[#3a3a3a] flex flex-col items-center justify-center">
            <div className="text-lg md:text-2xl font-bold dark:text-[#e5e5e5]">{explorer.stats.totalEntries}</div>
            <div className="text-xs md:text-xs text-[#616161] dark:text-[#b5bcc4]">Entries</div>
          </div>
          {/* Sponsored stat - only show for Explorer Pro accounts */}
          {profile.creator && (
            <div className="p-2 md:p-4 border-r border-b md:border-b-0 border-[#b5bcc4] dark:border-[#3a3a3a] flex flex-col items-center justify-center">
              <div className="text-lg md:text-2xl font-bold text-[#ac6d46]">${(explorer.stats.totalSponsored / 1000).toFixed(1)}k</div>
              <div className="text-xs md:text-xs text-[#616161] dark:text-[#b5bcc4]">Sponsored</div>
            </div>
          )}
          <div className="p-2 md:p-4 border-r border-[#b5bcc4] dark:border-[#3a3a3a] flex flex-col items-center justify-center">
            <div className="text-lg md:text-2xl font-bold dark:text-[#e5e5e5]">{explorer.stats.followers}</div>
            <div className="text-xs md:text-xs text-[#616161] dark:text-[#b5bcc4]">Followers</div>
          </div>
          <div className="p-2 md:p-4 border-r border-[#b5bcc4] dark:border-[#3a3a3a] flex flex-col items-center justify-center">
            <div className="text-lg md:text-2xl font-bold dark:text-[#e5e5e5]">{explorer.stats.countriesVisited}</div>
            <div className="text-xs md:text-xs text-[#616161] dark:text-[#b5bcc4]">Countries</div>
          </div>
          <div className="p-2 md:p-4 flex flex-col items-center justify-center">
            <div className="text-lg md:text-2xl font-bold dark:text-[#e5e5e5]">{passportData.continents.length}</div>
            <div className="text-xs md:text-xs text-[#616161] dark:text-[#b5bcc4]">Continents</div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="p-3 md:p-4 flex flex-wrap gap-2 md:gap-3">
          {/* Edit Profile button - Only shown on own profile */}
          {isOwnProfile && (
            <Link
              href="/edit-profile"
              className="px-2 py-1.5 md:px-3 md:py-2 bg-[#ac6d46] text-white hover:bg-[#8a5738] transition-all text-xs md:text-sm font-bold font-mono gap-1.5 md:gap-2 flex items-center"
            >
              <Settings size={14} className="md:w-4 md:h-4" strokeWidth={2} />
              <span>EDIT PROFILE</span>
            </Link>
          )}
          {/* Follow button - Hidden when not authenticated or on own profile */}
          {isAuthenticated && !isOwnProfile && (
            <button
              onClick={handleFollowExplorer}
              disabled={followLoading}
              className={`px-2 py-1.5 md:px-3 md:py-2 border-2 transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-50 disabled:active:scale-100 text-xs md:text-sm font-bold font-mono gap-1.5 md:gap-2 flex items-center ${
                isFollowing
                  ? 'bg-[#4676ac] border-[#4676ac] text-white hover:bg-[#365a87] hover:border-[#365a87] focus-visible:ring-[#4676ac]'
                  : 'border-[#202020] dark:border-[#616161] text-[#202020] dark:text-[#e5e5e5] hover:bg-[#4676ac] hover:border-[#4676ac] hover:text-white focus-visible:ring-[#4676ac]'
              }`}
            >
              {followLoading ? (
                <Loader2 size={14} className="md:w-4 md:h-4 animate-spin" />
              ) : isFollowing ? (
                <UserCheck size={14} className="md:w-4 md:h-4" strokeWidth={2} />
              ) : (
                <UserPlus size={14} className="md:w-4 md:h-4" strokeWidth={2} />
              )}
              <span>{isFollowing ? 'FOLLOWING' : 'FOLLOW'}</span>
            </button>
          )}
          {/* Sponsor button - Visible when explorer is Pro with active/planned expedition */}
          {!isOwnProfile && profile.creator && sponsorableExpedition && (
            <Link
              href={isAuthenticated ? `/sponsor/${sponsorableExpedition.id}` : `/login?redirect=${encodeURIComponent(`/sponsor/${sponsorableExpedition.id}`)}`}
              className="px-2 py-1.5 md:px-3 md:py-2 bg-[#ac6d46] text-white hover:bg-[#8a5738] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] text-xs md:text-sm font-bold font-mono gap-1.5 md:gap-2 flex items-center"
            >
              <Users size={14} className="md:w-4 md:h-4" strokeWidth={2} />
              <span>SPONSOR</span>
            </Link>
          )}
          {/* Share button - Always visible (public action) */}
          <button className="px-2 py-1.5 md:px-3 md:py-2 border-2 border-[#202020] dark:border-[#616161] text-[#202020] dark:text-[#e5e5e5] hover:bg-[#0a0a0a] hover:border-[#0a0a0a] hover:text-white dark:hover:bg-[#4a4a4a] dark:hover:border-[#4a4a4a] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#616161] text-xs md:text-sm font-bold font-mono gap-1.5 md:gap-2 flex items-center">
            <Share2 size={14} className="md:w-4 md:h-4" strokeWidth={2} />
            <span>SHARE</span>
          </button>
          {/* Bookmark button - Hidden on own profile */}
          {!isOwnProfile && (
            <InteractionButtons
              type="journal"
              itemId={explorer.id}
              isBookmarked={isExplorerBookmarked}
              isBookmarkLoading={explorerBookmarkLoading}
              onBookmark={handleBookmarkExplorer}
              size="md"
              showLabels={true}
            />
          )}
        </div>
      </div>

      {/* Map of All Expeditions */}
      <div className="mb-4 md:mb-6">
        {expeditionsForMap.length === 0 && entriesForMap.length === 0 ? (
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
            <div className="p-4 border-b-2 border-[#202020] dark:border-[#616161] bg-[#616161]">
              <h3 className="text-xs font-bold text-white">EXPEDITION MAP</h3>
            </div>
            <div
              className="relative h-[200px] md:h-[300px] overflow-hidden"
              style={{
                backgroundImage: `url(https://api.mapbox.com/styles/v1/mapbox/light-v11/static/0,20,1.5,0/1200x300@2x?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              {/* Gray overlay */}
              <div className="absolute inset-0 bg-[#b5bcc4]/80 dark:bg-[#202020]/80" />
              {/* Content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center p-4 md:p-8 text-center">
                <Globe className="w-8 h-8 md:w-12 md:h-12 text-[#616161] dark:text-[#b5bcc4] mb-2 md:mb-4" />
                {isOwnProfile ? (
                  <>
                    <p className="text-sm md:text-lg font-bold text-[#202020] dark:text-[#e5e5e5] mb-1 md:mb-2">
                      The world is full of stories. Share yours!
                    </p>
                    <p className="text-xs md:text-sm text-[#616161] dark:text-[#b5bcc4] mb-3 md:mb-6">
                      Start logging entries to see your journey unfold on the map.
                    </p>
                    <Link
                      href="/select-expedition"
                      className="inline-block px-4 py-2 md:px-6 md:py-3 bg-[#ac6d46] text-white font-bold hover:bg-[#8a5738] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] text-xs md:text-sm"
                    >
                      LOG YOUR FIRST ENTRY
                    </Link>
                  </>
                ) : (
                  <>
                    <p className="text-sm md:text-lg font-bold text-[#202020] dark:text-[#e5e5e5] mb-1 md:mb-2">
                      No expeditions mapped yet
                    </p>
                    <p className="text-xs md:text-sm text-[#616161] dark:text-[#b5bcc4]">
                      {explorer.name} hasn't logged any public entries.
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
          <ExplorerExpeditionsMap
            expeditions={expeditionsForMap}
            allEntries={entriesForMap}
            explorerName={explorer.name}
          />
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-2 space-y-4 md:space-y-6">
          {/* Recent Expeditions */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-4 md:p-6">
            <h3 className="text-xs md:text-sm font-bold mb-3 md:mb-4 border-b-2 border-[#202020] dark:border-[#616161] pb-2 dark:text-[#e5e5e5]">
              RECENT EXPEDITIONS
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {explorer.recentExpeditions.length > 0 ? (
                explorer.recentExpeditions.map((expedition) => (
                  <ExpeditionCard
                    key={expedition.id}
                    id={expedition.id}
                    title={expedition.title}
                    explorer={explorer.name}
                    description={expedition.description || ''}
                    imageUrl={expedition.coverImage || ''}
                    location={expedition.currentLocation || ''}
                    coordinates=""
                    startDate={expedition.startDate}
                    endDate={expedition.endDate || null}
                    daysElapsed={expedition.daysActive}
                    daysRemaining={null}
                    journalEntries={expedition.entriesCount}
                    lastUpdate=""
                    fundingGoal={expedition.goal}
                    fundingCurrent={expedition.raised}
                    fundingPercentage={expedition.goal > 0 ? (expedition.raised / expedition.goal) * 100 : 0}
                    backers={expedition.sponsorsCount}
                    distance={0}
                    status={expedition.status}
                    terrain=""
                    averageSpeed={0}
                    onViewJournal={() => router.push(`/expedition/${expedition.id}`)}
                    onSupport={() => router.push(`/sponsor/${expedition.id}`)}
                    sponsorshipsEnabled={expedition.goal > 0}
                    explorerIsPro={profile.creator}
                    isBookmarked={bookmarkedExpeditions.has(expedition.id)}
                    onBookmark={() => handleBookmarkExpedition(expedition.id)}
                  />
                ))
              ) : (
                <div className="col-span-2 text-center py-8 text-[#616161] dark:text-[#b5bcc4]">
                  No expeditions yet
                </div>
              )}
            </div>
            <button className="w-full mt-4 py-2 border-2 border-[#202020] dark:border-[#616161] dark:text-[#e5e5e5] hover:bg-[#0a0a0a] hover:text-white dark:hover:bg-[#4a4a4a] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#616161] text-sm">
              VIEW ALL EXPEDITIONS ({explorer.stats.totalExpeditions})
            </button>
          </div>

          {/* Recent Journal Entries */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-4 md:p-6">
            <h3 className="text-xs md:text-sm font-bold mb-3 md:mb-4 border-b-2 border-[#202020] dark:border-[#616161] pb-2 dark:text-[#e5e5e5]">
              RECENT JOURNAL ENTRIES
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {explorer.recentEntries.length > 0 ? (
                explorer.recentEntries.map((entry) => (
                  <EntryCard
                    key={entry.id}
                    id={entry.id}
                    title={entry.title}
                    explorerUsername={explorer.id}
                    expeditionName={entry.expedition}
                    location={entry.location || ''}
                    date={entry.date}
                    excerpt={entry.excerpt}
                    mediaCount={entry.mediaCount}
                    views={0}
                    wordCount={entry.wordCount || 0}
                    type={entry.type}
                    coverImageUrl={entry.coverImageUrl}
                    onReadEntry={() => router.push(`/entry/${entry.id}`)}
                    onViewExpedition={() => entry.expeditionId && router.push(`/expedition/${entry.expeditionId}`)}
                    isBookmarked={bookmarkedEntries.has(entry.id)}
                    onBookmark={() => handleBookmarkEntry(entry.id)}
                  />
                ))
              ) : (
                <div className="col-span-2 text-center py-8 text-[#616161] dark:text-[#b5bcc4]">
                  No entries yet
                </div>
              )}
            </div>
            <button className="w-full mt-4 py-2 border-2 border-[#202020] dark:border-[#616161] dark:text-[#e5e5e5] hover:bg-[#0a0a0a] hover:text-white dark:hover:bg-[#4a4a4a] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#616161] text-sm">
              VIEW ALL ENTRIES ({explorer.stats.totalEntries})
            </button>
          </div>
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-4 md:space-y-6">
          {/* Bio */}
          {explorer.bio && (
            <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-4">
              <h3 className="text-xs font-bold mb-2 border-b border-[#202020] dark:border-[#616161] pb-2 dark:text-[#e5e5e5]">BIOGRAPHY</h3>
              <p className="text-xs text-[#202020] dark:text-[#e5e5e5] leading-relaxed">{explorer.bio}</p>
            </div>
          )}

          {/* Links & Portfolio */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-4">
            <h3 className="text-xs font-bold mb-3 border-b border-[#202020] dark:border-[#616161] pb-2 dark:text-[#e5e5e5]">LINKS & PORTFOLIO</h3>
            <div className="space-y-2">
              {explorer.links.website && (
                <a 
                  href={explorer.links.website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 bg-[#f5f5f5] dark:bg-[#2a2a2a] border border-[#b5bcc4] dark:border-[#3a3a3a] hover:border-[#ac6d46] dark:hover:border-[#ac6d46] transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] group"
                >
                  <Globe className="w-4 h-4 text-[#ac6d46] flex-shrink-0" />
                  <span className="text-xs font-bold text-[#202020] dark:text-[#e5e5e5] flex-1 truncate">Website</span>
                  <ExternalLink className="w-3 h-3 text-[#616161] dark:text-[#b5bcc4] opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              )}
              {explorer.links.portfolio && (
                <a 
                  href={explorer.links.portfolio} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 bg-[#f5f5f5] dark:bg-[#2a2a2a] border border-[#b5bcc4] dark:border-[#3a3a3a] hover:border-[#ac6d46] dark:hover:border-[#ac6d46] transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] group"
                >
                  <Camera className="w-4 h-4 text-[#ac6d46] flex-shrink-0" />
                  <span className="text-xs font-bold text-[#202020] dark:text-[#e5e5e5] flex-1 truncate">Photography Portfolio</span>
                  <ExternalLink className="w-3 h-3 text-[#616161] dark:text-[#b5bcc4] opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              )}
              {explorer.links.instagram && (
                <a 
                  href={explorer.links.instagram} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 bg-[#f5f5f5] dark:bg-[#2a2a2a] border border-[#b5bcc4] dark:border-[#3a3a3a] hover:border-[#ac6d46] dark:hover:border-[#ac6d46] transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] group"
                >
                  <Instagram className="w-4 h-4 text-[#ac6d46] flex-shrink-0" />
                  <span className="text-xs font-bold text-[#202020] dark:text-[#e5e5e5] flex-1 truncate">Instagram</span>
                  <ExternalLink className="w-3 h-3 text-[#616161] dark:text-[#b5bcc4] opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              )}
              {explorer.links.youtube && (
                <a 
                  href={explorer.links.youtube} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 bg-[#f5f5f5] dark:bg-[#2a2a2a] border border-[#b5bcc4] dark:border-[#3a3a3a] hover:border-[#ac6d46] dark:hover:border-[#ac6d46] transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] group"
                >
                  <Youtube className="w-4 h-4 text-[#ac6d46] flex-shrink-0" />
                  <span className="text-xs font-bold text-[#202020] dark:text-[#e5e5e5] flex-1 truncate">YouTube</span>
                  <ExternalLink className="w-3 h-3 text-[#616161] dark:text-[#b5bcc4] opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              )}
              {explorer.links.twitter && (
                <a 
                  href={explorer.links.twitter} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 bg-[#f5f5f5] dark:bg-[#2a2a2a] border border-[#b5bcc4] dark:border-[#3a3a3a] hover:border-[#ac6d46] dark:hover:border-[#ac6d46] transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] group"
                >
                  <Twitter className="w-4 h-4 text-[#ac6d46] flex-shrink-0" />
                  <span className="text-xs font-bold text-[#202020] dark:text-[#e5e5e5] flex-1 truncate">Twitter / X</span>
                  <ExternalLink className="w-3 h-3 text-[#616161] dark:text-[#b5bcc4] opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              )}
              {explorer.links.linkedin && (
                <a 
                  href={explorer.links.linkedin} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 bg-[#f5f5f5] dark:bg-[#2a2a2a] border border-[#b5bcc4] dark:border-[#3a3a3a] hover:border-[#ac6d46] dark:hover:border-[#ac6d46] transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] group"
                >
                  <Linkedin className="w-4 h-4 text-[#ac6d46] flex-shrink-0" />
                  <span className="text-xs font-bold text-[#202020] dark:text-[#e5e5e5] flex-1 truncate">LinkedIn</span>
                  <ExternalLink className="w-3 h-3 text-[#616161] dark:text-[#b5bcc4] opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              )}
            </div>
          </div>

          {/* Equipment */}
          {explorer.equipment.length > 0 && (
            <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-4">
              <h3 className="text-xs font-bold mb-3 border-b border-[#202020] dark:border-[#616161] pb-2 dark:text-[#e5e5e5]">EQUIPMENT & GEAR</h3>
              <div className="space-y-1">
                {explorer.equipment.map((item, idx) => (
                  <div key={idx} className="text-xs px-2 py-1 bg-[#b5bcc4] dark:bg-[#3a3a3a] text-[#202020] dark:text-[#e5e5e5]">
                    • {item}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Passport / Collection Stats */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-4">
            <h3 className="text-xs font-bold mb-3 border-b border-[#202020] dark:border-[#616161] pb-2 dark:text-[#e5e5e5]">
              PASSPORT
            </h3>
            <div className="space-y-3 text-xs">
              {/* Exploration Stats */}
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-[#616161] dark:text-[#b5bcc4]">Countries Visited</span>
                  <span className="font-bold dark:text-[#e5e5e5]">{explorer.passport.countries.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#616161] dark:text-[#b5bcc4]">Continents</span>
                  <span className="font-bold dark:text-[#e5e5e5]">{explorer.passport.continents.length} of 7</span>
                </div>
              </div>

              {/* Stamps/Achievements */}
              {explorer.passport.stamps.length > 0 && (
                <div className="border-t border-[#b5bcc4] dark:border-[#3a3a3a] pt-3">
                  <div className="text-xs font-bold text-[#616161] dark:text-[#b5bcc4] mb-2 uppercase">Stamps Earned</div>
                  <div className="space-y-2">
                    {explorer.passport.stamps.map((stamp) => (
                      <div key={stamp.id} className="border-l-2 border-[#ac6d46] pl-2 py-0.5">
                        <div className="font-bold dark:text-[#e5e5e5]">{stamp.name}</div>
                        <div className="text-[#616161] dark:text-[#b5bcc4]">{stamp.description}</div>
                        <div className="text-[#616161] dark:text-[#b5bcc4] font-mono">{stamp.earnedDate}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Countries */}
              {explorer.passport.countries.length > 0 && (
                <div className="border-t border-[#b5bcc4] dark:border-[#3a3a3a] pt-3">
                  <div className="text-xs font-bold text-[#616161] dark:text-[#b5bcc4] mb-2 uppercase">Recent Countries</div>
                  <div className="space-y-1.5">
                    {explorer.passport.countries.slice(-5).reverse().map((country) => (
                      <div key={country.code} className="flex items-center justify-between">
                        <span className="flex items-center gap-2 dark:text-[#e5e5e5]">
                          <CountryFlag code={country.code} className="w-5 h-3.5" title={country.name} />
                          {country.name}
                        </span>
                        <span className="text-[#616161] dark:text-[#b5bcc4] font-mono">{country.firstVisit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Explorer Network */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-4">
            <h3 className="text-xs font-bold mb-3 border-b border-[#202020] dark:border-[#616161] pb-2 dark:text-[#e5e5e5]">
              EXPLORER NETWORK
            </h3>
            
            {/* Recent Followers */}
            <div className="mb-3">
              <div className="text-xs text-[#616161] dark:text-[#b5bcc4] font-mono mb-2">
                Recent Followers ({explorer.recentFollowers.length} of {explorer.stats.followers})
              </div>
              <div className="space-y-2">
                {explorer.recentFollowers.map((follower) => (
                  <button
                    key={follower.id}
                    onClick={() => router.push(`/journal/${follower.id}`)}
                    className="w-full flex items-center gap-2 p-2 bg-[#f5f5f5] dark:bg-[#2a2a2a] border border-[#b5bcc4] dark:border-[#3a3a3a] hover:border-[#4676ac] dark:hover:border-[#4676ac] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#4676ac] group"
                  >
                    <div className="w-8 h-8 flex-shrink-0 overflow-hidden border border-[#b5bcc4] dark:border-[#616161]">
                      <img 
                        src={follower.avatarUrl} 
                        alt={follower.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold text-[#202020] dark:text-[#e5e5e5] truncate">
                          {follower.name}
                        </span>
                        {follower.accountType === 'explorer-pro' && (
                          <span className="px-1 bg-[#ac6d46] text-white text-xs font-bold flex-shrink-0 rounded-full">PRO</span>
                        )}
                        {follower.mutualFollow && (
                          <span className="px-1 bg-[#4676ac] text-white text-xs font-bold flex-shrink-0 rounded-full">MUTUAL</span>
                        )}
                      </div>
                      <div className="text-xs text-[#616161] dark:text-[#b5bcc4] font-mono">
                        Following since {follower.followedSince}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* View All Links */}
            <div className="pt-3 border-t border-[#b5bcc4] dark:border-[#3a3a3a] space-y-2">
              <button 
                onClick={() => router.push(`/journal/${explorer.id}/followers`)}
                className="w-full px-3 py-2 border border-[#202020] dark:border-[#616161] text-xs font-bold text-[#202020] dark:text-[#e5e5e5] hover:bg-[#0a0a0a] hover:text-white dark:hover:bg-[#4a4a4a] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#616161]"
              >
                VIEW ALL FOLLOWERS ({explorer.stats.followers})
              </button>
              <button 
                onClick={() => router.push(`/journal/${explorer.id}/following`)}
                className="w-full px-3 py-2 border border-[#202020] dark:border-[#616161] text-xs font-bold text-[#202020] dark:text-[#e5e5e5] hover:bg-[#0a0a0a] hover:text-white dark:hover:bg-[#4a4a4a] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#616161]"
              >
                VIEW FOLLOWING
              </button>
            </div>
          </div>

          {/* Detailed Statistics */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-4">
            <h3 className="text-xs font-bold mb-3 border-b border-[#202020] dark:border-[#616161] pb-2 dark:text-[#e5e5e5]">DETAILED STATISTICS</h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-[#616161] dark:text-[#b5bcc4]">Total Expeditions</span>
                <span className="font-bold dark:text-[#e5e5e5]">{explorer.stats.totalExpeditions}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#616161] dark:text-[#b5bcc4]">Completed</span>
                <span className="font-bold dark:text-[#e5e5e5]">{explorer.stats.completedExpeditions}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#616161] dark:text-[#b5bcc4]">Photos Uploaded</span>
                <span className="font-bold dark:text-[#e5e5e5]">{explorer.stats.totalPhotos.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#616161] dark:text-[#b5bcc4]">Videos Uploaded</span>
                <span className="font-bold dark:text-[#e5e5e5]">{explorer.stats.totalVideo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#616161] dark:text-[#b5bcc4]">Total Views</span>
                <span className="font-bold dark:text-[#e5e5e5]">{explorer.stats.totalViews.toLocaleString()}</span>
              </div>
              {/* Sponsorship stats - only show for Explorer Pro accounts */}
              {profile.creator && (
                <>
                  <div className="flex justify-between border-t border-[#b5bcc4] dark:border-[#3a3a3a] pt-2">
                    <span className="text-[#616161] dark:text-[#b5bcc4]">Current Sponsors</span>
                    <span className="font-bold text-[#ac6d46]">{explorer.stats.currentSponsors}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#616161] dark:text-[#b5bcc4]">Total Sponsored</span>
                    <span className="font-bold text-[#ac6d46]">${explorer.stats.totalSponsored.toLocaleString()}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Completed Expeditions */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-4">
            <h3 className="text-xs font-bold mb-3 border-b border-[#202020] dark:border-[#616161] pb-2 dark:text-[#e5e5e5]">
              COMPLETED EXPEDITIONS ({explorer.completedExpeditions.length})
            </h3>
            <div className="space-y-2">
              {explorer.completedExpeditions.map((expedition) => (
                <div key={expedition.id} className="text-xs border border-[#b5bcc4] dark:border-[#3a3a3a] p-2">
                  <div className="font-bold mb-1 dark:text-[#e5e5e5]">{expedition.title}</div>
                  <div className="text-[#616161] dark:text-[#b5bcc4] font-mono space-y-1">
                    <div>Completed: {expedition.completedDate}</div>
                    <div>Duration: {expedition.duration} days</div>
                    <div>Entries: {expedition.entries}</div>
                    <div className="text-[#ac6d46]">Raised: ${expedition.totalRaised.toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* System Information */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-4">
            <h3 className="text-xs font-bold mb-3 border-b border-[#202020] dark:border-[#616161] pb-2 dark:text-[#e5e5e5]">SYSTEM INFORMATION</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[#616161] dark:text-[#b5bcc4]">Account Type</span>
                <span className="font-bold dark:text-[#e5e5e5]">
                  {explorer.accountType === 'explorer-pro' ? 'Explorer Pro' : 'Explorer'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#616161] dark:text-[#b5bcc4]">Member Since</span>
                <span className="font-bold font-mono dark:text-[#e5e5e5]">{explorer.joined}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#616161] dark:text-[#b5bcc4]">Profile ID</span>
                <span className="font-bold font-mono dark:text-[#e5e5e5] text-xs">{explorer.id}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}