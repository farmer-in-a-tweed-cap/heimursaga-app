'use client';

import { Bookmark, FileText, Map, User, Lock, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { explorerApi, entryApi, expeditionApi, ExplorerEntry } from '@/app/services/api';
import { EntryCardLandscape } from '@/app/components/EntryCardLandscape';
import { ExpeditionCardLandscape } from '@/app/components/ExpeditionCardLandscape';
import { ExplorerCardLandscape } from '@/app/components/ExplorerCardLandscape';

type BookmarkType = 'all' | 'entries' | 'expeditions' | 'explorers';

interface BookmarkedExpedition {
  id: string;
  title: string;
  description?: string;
  status: string;
  startDate?: string;
  endDate?: string;
  coverPhoto?: string;
  goal?: number;
  raised?: number;
  sponsorsCount?: number;
  entriesCount?: number;
  bookmarksCount?: number;
  explorer: {
    username: string;
    name?: string;
    picture?: string;
  };
  bookmarkedAt?: string;
}

interface BookmarkedExplorer {
  username: string;
  name?: string;
  bio?: string;
  picture?: string;
  locationFrom?: string;
  locationLives?: string;
  isPremium?: boolean;
  entriesCount?: number;
  expeditionsCount?: number;
  followersCount?: number;
  bookmarkedAt?: string;
}

export function BookmarksPage() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [activeFilter, setActiveFilter] = useState<BookmarkType>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [bookmarkedEntries, setBookmarkedEntries] = useState<ExplorerEntry[]>([]);
  const [bookmarkedExpeditions, setBookmarkedExpeditions] = useState<BookmarkedExpedition[]>([]);
  const [bookmarkedExplorers, setBookmarkedExplorers] = useState<BookmarkedExplorer[]>([]);

  useEffect(() => {
    if (!isAuthenticated) return;

    let cancelled = false;

    const fetchBookmarks = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const [entriesRes, expeditionsRes, explorersRes] = await Promise.all([
          explorerApi.getBookmarkedEntries(),
          explorerApi.getBookmarkedExpeditions(),
          explorerApi.getBookmarkedExplorers(),
        ]);

        if (!cancelled) {
          setBookmarkedEntries(entriesRes.data || []);
          setBookmarkedExpeditions(expeditionsRes.data || []);
          setBookmarkedExplorers(explorersRes.data || []);
        }
      } catch {
        if (!cancelled) {
          setError('Failed to load bookmarks. Please try again.');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchBookmarks();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const handleUnbookmarkEntry = async (entryId: string) => {
    try {
      await entryApi.bookmark(entryId);
      setBookmarkedEntries(prev => prev.filter(e => e.id !== entryId));
    } catch (err) {
      console.error('Failed to unbookmark entry:', err);
    }
  };

  const handleUnbookmarkExpedition = async (expeditionId: string) => {
    try {
      await expeditionApi.bookmark(expeditionId);
      setBookmarkedExpeditions(prev => prev.filter(e => e.id !== expeditionId));
    } catch (err) {
      console.error('Failed to unbookmark expedition:', err);
    }
  };

  const handleUnbookmarkExplorer = async (username: string) => {
    try {
      await explorerApi.bookmark(username);
      setBookmarkedExplorers(prev => prev.filter(e => e.username !== username));
    } catch (err) {
      console.error('Failed to unbookmark explorer:', err);
    }
  };

  const calculateDaysElapsed = (startDate?: string, endDate?: string, status?: string) => {
    if (!startDate) return 0;
    const start = new Date(startDate);
    const end = status === 'completed' && endDate ? new Date(endDate) : new Date();
    return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  };

  // Authentication gate
  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
          <div className="p-6 border-b-2 border-[#202020] dark:border-[#616161] bg-[#616161] text-white">
            <div className="flex items-center gap-3">
              <Lock size={24} strokeWidth={2} />
              <h2 className="text-lg font-bold">AUTHENTICATION REQUIRED</h2>
            </div>
          </div>
          <div className="p-8 text-center">
            <p className="text-sm text-[#616161] dark:text-[#b5bcc4] mb-6">
              You must be logged in to view your bookmarks. Please log in to access your saved content.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => router.push('/auth?from=' + pathname)}
                className="px-6 py-3 bg-[#ac6d46] text-white font-bold hover:bg-[#8a5738] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] text-sm"
              >
                LOG IN / REGISTER
              </button>
              <button
                onClick={() => router.push('/')}
                className="px-6 py-3 border-2 border-[#202020] dark:border-[#616161] text-[#202020] dark:text-[#e5e5e5] font-bold hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#202020] dark:focus-visible:ring-[#616161] text-sm"
              >
                GO TO HOMEPAGE
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Filter logic
  const filteredEntries = activeFilter === 'all' || activeFilter === 'entries' ? bookmarkedEntries : [];
  const filteredExpeditions = activeFilter === 'all' || activeFilter === 'expeditions' ? bookmarkedExpeditions : [];
  const filteredExplorers = activeFilter === 'all' || activeFilter === 'explorers' ? bookmarkedExplorers : [];

  const totalCount = bookmarkedEntries.length + bookmarkedExpeditions.length + bookmarkedExplorers.length;

  if (isLoading) {
    return (
      <div className="max-w-[1000px] mx-auto px-6 py-12">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#ac6d46]" />
          <span className="ml-3 text-[#616161] dark:text-[#b5bcc4]">Loading bookmarks...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-[1000px] mx-auto px-6 py-12">
        <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 p-6 text-center">
          <p className="text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-[#ac6d46] text-white font-bold hover:bg-[#8a5738] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] text-sm"
          >
            TRY AGAIN
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1000px] mx-auto px-6 py-12">
      {/* Page Header */}
      <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-6 mb-6">
        <div className="flex items-center justify-between mb-4 border-b-2 border-[#202020] dark:border-[#616161] pb-2">
          <div className="flex items-center gap-3">
            <Bookmark className="w-6 h-6 text-[#ac6d46]" />
            <h1 className="text-2xl font-bold dark:text-[#e5e5e5]">BOOKMARKS</h1>
          </div>
          <span className="text-xs text-[#616161] dark:text-[#b5bcc4] font-mono">{totalCount} SAVED ITEMS</span>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          <button
            onClick={() => setActiveFilter('all')}
            className="px-3 py-1.5 whitespace-nowrap flex items-center gap-1 hover:bg-[#365a87] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#4676ac]"
            style={{ backgroundColor: activeFilter === 'all' ? '#4676ac' : 'transparent', color: activeFilter === 'all' ? '#ffffff' : undefined, border: activeFilter === 'all' ? 'none' : '1px solid #616161' }}
          >
            <Bookmark className="w-3 h-3" />
            ALL ({totalCount})
          </button>
          <button
            onClick={() => setActiveFilter('entries')}
            className="px-3 py-1.5 border border-[#202020] dark:border-[#616161] dark:text-[#e5e5e5] hover:bg-[#95a2aa] dark:hover:bg-[#3a3a3a] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#4676ac] whitespace-nowrap flex items-center gap-1"
            style={{ backgroundColor: activeFilter === 'entries' ? '#4676ac' : 'transparent', color: activeFilter === 'entries' ? '#ffffff' : undefined, borderColor: activeFilter === 'entries' ? '#4676ac' : undefined }}
          >
            <FileText className="w-3 h-3" />
            ENTRIES ({bookmarkedEntries.length})
          </button>
          <button
            onClick={() => setActiveFilter('expeditions')}
            className="px-3 py-1.5 border border-[#202020] dark:border-[#616161] dark:text-[#e5e5e5] hover:bg-[#95a2aa] dark:hover:bg-[#3a3a3a] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#4676ac] whitespace-nowrap flex items-center gap-1"
            style={{ backgroundColor: activeFilter === 'expeditions' ? '#4676ac' : 'transparent', color: activeFilter === 'expeditions' ? '#ffffff' : undefined, borderColor: activeFilter === 'expeditions' ? '#4676ac' : undefined }}
          >
            <Map className="w-3 h-3" />
            EXPEDITIONS ({bookmarkedExpeditions.length})
          </button>
          <button
            onClick={() => setActiveFilter('explorers')}
            className="px-3 py-1.5 border border-[#202020] dark:border-[#616161] dark:text-[#e5e5e5] hover:bg-[#95a2aa] dark:hover:bg-[#3a3a3a] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#4676ac] whitespace-nowrap flex items-center gap-1"
            style={{ backgroundColor: activeFilter === 'explorers' ? '#4676ac' : 'transparent', color: activeFilter === 'explorers' ? '#ffffff' : undefined, borderColor: activeFilter === 'explorers' ? '#4676ac' : undefined }}
          >
            <User className="w-3 h-3" />
            EXPLORERS ({bookmarkedExplorers.length})
          </button>
        </div>
      </div>

      {/* Empty State */}
      {totalCount === 0 && (
        <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-12 text-center">
          <Bookmark className="w-12 h-12 text-[#b5bcc4] mx-auto mb-4" />
          <h3 className="text-lg font-bold dark:text-[#e5e5e5] mb-2">NO BOOKMARKS YET</h3>
          <p className="text-sm text-[#616161] dark:text-[#b5bcc4] mb-6">
            Save entries, expeditions, and explorers to find them easily later.
          </p>
          <button
            onClick={() => router.push('/expeditions')}
            className="px-6 py-3 bg-[#ac6d46] text-white font-bold hover:bg-[#8a5738] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] text-sm"
          >
            EXPLORE EXPEDITIONS
          </button>
        </div>
      )}

      {/* Bookmarked Entries */}
      {filteredEntries.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-bold mb-4 px-1 text-[#b5bcc4]">JOURNAL ENTRIES ({filteredEntries.length})</h2>
          <div className="space-y-3">
            {filteredEntries.map((entry) => (
              <EntryCardLandscape
                key={entry.id}
                id={entry.id}
                title={entry.title}
                explorerUsername={entry.author?.username || 'Unknown'}
                expeditionName={entry.expedition?.title || ''}
                location={entry.place || 'Location not set'}
                date={entry.createdAt || entry.date || ''}
                excerpt={entry.content?.replace(/<[^>]*>/g, '').substring(0, 200) || ''}
                type="Entry"
                onClick={() => router.push(`/entry/${entry.id}`)}
                onUnbookmark={() => handleUnbookmarkEntry(entry.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Bookmarked Expeditions */}
      {filteredExpeditions.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-bold mb-4 px-1 text-[#b5bcc4]">EXPEDITIONS ({filteredExpeditions.length})</h2>
          <div className="space-y-3">
            {filteredExpeditions.map((expedition) => (
              <ExpeditionCardLandscape
                key={expedition.id}
                id={expedition.id}
                title={expedition.title}
                explorerUsername={expedition.explorer?.username || 'Unknown'}
                imageUrl={expedition.coverPhoto || ''}
                location=""
                status={(expedition.status as 'active' | 'completed' | 'planned' | 'paused') || 'active'}
                daysElapsed={calculateDaysElapsed(expedition.startDate, expedition.endDate, expedition.status)}
                journalEntries={expedition.entriesCount || 0}
                fundingPercentage={expedition.goal && expedition.goal > 0 ? Math.round(((expedition.raised || 0) / expedition.goal) * 100) : 0}
                backers={expedition.sponsorsCount || 0}
                sponsorshipsEnabled={(expedition.goal || 0) > 0}
                explorerIsPro={(expedition.goal || 0) > 0}
                onClick={() => router.push(`/expedition/${expedition.id}`)}
                onUnbookmark={() => handleUnbookmarkExpedition(expedition.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Bookmarked Explorers */}
      {filteredExplorers.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-bold mb-4 px-1 text-[#b5bcc4]">EXPLORERS ({filteredExplorers.length})</h2>
          <div className="space-y-3">
            {filteredExplorers.map((explorer) => (
              <ExplorerCardLandscape
                key={explorer.username}
                id={explorer.username}
                username={explorer.username}
                journalName={explorer.name || explorer.username}
                avatarUrl={explorer.picture || ''}
                location={explorer.locationLives || explorer.locationFrom || ''}
                accountType={explorer.isPremium ? 'explorer-pro' : 'explorer'}
                activeExpeditions={explorer.expeditionsCount || 0}
                totalEntries={explorer.entriesCount || 0}
                totalViews={explorer.followersCount || 0}
                onClick={() => router.push(`/journal/${explorer.username}`)}
                onUnbookmark={() => handleUnbookmarkExplorer(explorer.username)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
