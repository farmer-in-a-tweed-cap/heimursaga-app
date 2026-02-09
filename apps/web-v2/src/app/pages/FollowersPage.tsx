'use client';

import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { ArrowLeft, Search, Users, UserCheck, Loader2, AlertTriangle } from 'lucide-react';
import { explorerApi, type ExplorerFollower, type ExplorerProfile } from '@/app/services/api';

export function FollowersPage() {
  const { username } = useParams<{ username: string }>();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'mutual' | 'pro'>('all');

  // API data state
  const [profile, setProfile] = useState<ExplorerProfile | null>(null);
  const [followers, setFollowers] = useState<ExplorerFollower[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch data from API
  useEffect(() => {
    if (!username) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [profileData, followersData] = await Promise.all([
          explorerApi.getByUsername(username).catch(() => null),
          explorerApi.getFollowers(username).catch(() => ({ data: [], results: 0 })),
        ]);

        if (!profileData) {
          setError('Explorer not found');
          return;
        }

        setProfile(profileData);
        setFollowers(followersData.data || []);
      } catch {
        setError('Failed to load followers');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [username]);

  // Filter followers
  const filteredFollowers = followers.filter(follower => {
    const matchesSearch = follower.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (follower.bio || '').toLowerCase().includes(searchQuery.toLowerCase());

    if (filterType === 'mutual') {
      return matchesSearch && follower.followed;
    } else if (filterType === 'pro') {
      return matchesSearch && follower.creator;
    }
    return matchesSearch;
  });

  // Loading state
  if (loading) {
    return (
      <div className="max-w-[1400px] mx-auto px-6 py-12">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-[#ac6d46]" />
          <span className="ml-3 text-[#616161]">Loading explorer journal...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !profile) {
    return (
      <div className="max-w-[1400px] mx-auto px-6 py-12">
        <div className="bg-white dark:bg-[#202020] border-2 border-[#ac6d46] p-8 text-center">
          <AlertTriangle className="w-12 h-12 text-[#ac6d46] mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2 dark:text-white">{error || 'Explorer not found'}</h2>
          <p className="text-[#616161] mb-4">Could not load follower data.</p>
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

  const mutualCount = followers.filter(f => f.followed).length;
  const proCount = followers.filter(f => f.creator).length;

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-12">
      {/* Header */}
      <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] mb-6">
        <div className="p-6 border-b-2 border-[#202020] dark:border-[#616161]">
          <button
            onClick={() => router.push(`/journal/${username}`)}
            className="flex items-center gap-2 text-sm text-[#616161] dark:text-[#b5bcc4] hover:text-[#ac6d46] dark:hover:text-[#ac6d46] mb-4 transition-all"
          >
            <ArrowLeft size={16} />
            <span>Back to Profile</span>
          </button>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-[#202020] dark:text-[#e5e5e5] mb-2">
                Followers of {profile.username}
              </h1>
              <p className="text-sm text-[#616161] dark:text-[#b5bcc4] font-mono">
                {followers.length} total followers
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-8 h-8 text-[#ac6d46]" />
            </div>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="p-4 border-b border-[#b5bcc4] dark:border-[#3a3a3a] bg-[#f5f5f5] dark:bg-[#2a2a2a]">
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[300px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#616161] dark:text-[#b5bcc4]" />
              <input
                type="text"
                placeholder="Search by username or bio..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border-2 border-[#202020] dark:border-[#616161] bg-white dark:bg-[#202020] text-sm text-[#202020] dark:text-[#e5e5e5] focus:outline-none focus:border-[#ac6d46] dark:focus:border-[#ac6d46]"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setFilterType('all')}
                className={`px-4 py-2 text-xs font-bold transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] ${
                  filterType === 'all'
                    ? 'bg-[#ac6d46] text-white border-2 border-[#ac6d46]'
                    : 'bg-white dark:bg-[#202020] text-[#202020] dark:text-[#e5e5e5] border-2 border-[#202020] dark:border-[#616161] hover:border-[#ac6d46] dark:hover:border-[#ac6d46]'
                }`}
              >
                ALL ({followers.length})
              </button>
              <button
                onClick={() => setFilterType('mutual')}
                className={`px-4 py-2 text-xs font-bold transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] ${
                  filterType === 'mutual'
                    ? 'bg-[#4676ac] text-white border-2 border-[#4676ac]'
                    : 'bg-white dark:bg-[#202020] text-[#202020] dark:text-[#e5e5e5] border-2 border-[#202020] dark:border-[#616161] hover:border-[#4676ac] dark:hover:border-[#4676ac]'
                }`}
              >
                MUTUAL ({mutualCount})
              </button>
              <button
                onClick={() => setFilterType('pro')}
                className={`px-4 py-2 text-xs font-bold transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] ${
                  filterType === 'pro'
                    ? 'bg-[#ac6d46] text-white border-2 border-[#ac6d46]'
                    : 'bg-white dark:bg-[#202020] text-[#202020] dark:text-[#e5e5e5] border-2 border-[#202020] dark:border-[#616161] hover:border-[#ac6d46] dark:hover:border-[#ac6d46]'
                }`}
              >
                PRO ONLY ({proCount})
              </button>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="px-4 py-2 bg-[#f5f5f5] dark:bg-[#2a2a2a] border-b border-[#b5bcc4] dark:border-[#3a3a3a]">
          <p className="text-xs text-[#616161] dark:text-[#b5bcc4] font-mono">
            Showing {filteredFollowers.length} of {followers.length} followers
          </p>
        </div>
      </div>

      {/* Followers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredFollowers.map((follower) => (
          <div
            key={follower.username}
            className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] hover:border-[#4676ac] dark:hover:border-[#4676ac] transition-all"
          >
            <div className="p-4">
              <div className="flex items-start gap-3 mb-3">
                <button
                  onClick={() => router.push(`/journal/${follower.username}`)}
                  className={`w-16 h-16 flex-shrink-0 overflow-hidden border-2 ${follower.creator ? 'border-[#ac6d46]' : 'border-[#b5bcc4] dark:border-[#616161]'} hover:border-[#4676ac] dark:hover:border-[#4676ac] transition-all bg-[#616161]`}
                >
                  {follower.picture ? (
                    <Image
                      src={follower.picture}
                      alt={follower.username}
                      className="w-full h-full object-cover"
                      width={64}
                      height={64}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white text-xl font-bold">
                      {follower.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <button
                      onClick={() => router.push(`/journal/${follower.username}`)}
                      className="text-sm font-bold text-[#202020] dark:text-[#e5e5e5] hover:text-[#ac6d46] dark:hover:text-[#ac6d46] transition-all truncate"
                    >
                      {follower.username}
                    </button>
                    {follower.creator && (
                      <span className="px-2 py-0.5 bg-[#ac6d46] text-white text-xs font-bold flex-shrink-0">
                        PRO
                      </span>
                    )}
                  </div>
                  {follower.followed && (
                    <div className="flex items-center gap-1 mb-1">
                      <UserCheck className="w-3 h-3 text-[#4676ac]" />
                      <span className="text-xs text-[#4676ac] font-bold">MUTUAL FOLLOW</span>
                    </div>
                  )}
                  {follower.bio && (
                    <div className="text-xs text-[#616161] dark:text-[#b5bcc4] line-clamp-2">
                      {follower.bio}
                    </div>
                  )}
                </div>
              </div>

              {/* View Profile Button */}
              <div className="pt-3 border-t border-[#b5bcc4] dark:border-[#3a3a3a]">
                <button
                  onClick={() => router.push(`/journal/${follower.username}`)}
                  className="w-full px-3 py-2 border border-[#202020] dark:border-[#616161] text-xs font-bold text-[#202020] dark:text-[#e5e5e5] hover:bg-[#4676ac] hover:border-[#4676ac] hover:text-white transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#4676ac]"
                >
                  VIEW JOURNAL
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* No Results */}
      {filteredFollowers.length === 0 && (
        <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-12 text-center">
          <Users className="w-12 h-12 text-[#b5bcc4] mx-auto mb-4" />
          <h3 className="text-lg font-bold text-[#202020] dark:text-[#e5e5e5] mb-2">No Followers Found</h3>
          <p className="text-sm text-[#616161] dark:text-[#b5bcc4]">
            {searchQuery ? 'Try adjusting your search query or filters' : 'This explorer has no followers yet'}
          </p>
        </div>
      )}
    </div>
  );
}
