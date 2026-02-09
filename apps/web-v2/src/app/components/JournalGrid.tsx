'use client';

import { useRouter } from "next/navigation";
import { EntryCard } from "@/app/components/EntryCard";
import { useAuth } from "@/app/context/AuthContext";
import { entryApi } from "@/app/services/api";
import { useState, useEffect } from "react";

interface JournalEntry {
  id: string;
  title: string;
  explorerUsername: string;
  expeditionName: string;
  expeditionId: string;
  location: string;
  date: string;
  excerpt: string;
  mediaCount: number;
  wordCount: number;
  type: string;
  coverImageUrl?: string;
  bookmarked?: boolean;
}

interface JournalGridProps {
  entries: JournalEntry[];
  onViewAll?: () => void;
  title?: string;
}

export function JournalGrid({ entries, onViewAll, title }: JournalGridProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [bookmarkedEntries, setBookmarkedEntries] = useState<Set<string>>(new Set());
  const [bookmarkingInProgress, setBookmarkingInProgress] = useState<Set<string>>(new Set());

  // Initialize bookmarked state from entries
  useEffect(() => {
    const bookmarked = new Set(entries.filter(e => e.bookmarked).map(e => e.id));
    setBookmarkedEntries(bookmarked);
  }, [entries]);

  // Handle bookmark entry
  const handleBookmarkEntry = async (entryId: string) => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
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

  if (entries.length === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 border-b-2 border-[#202020] dark:border-[#616161] pb-2 gap-2">
        <h3 className="text-sm font-bold dark:text-[#e5e5e5]">{title || 'RECENT JOURNAL ENTRIES'}</h3>
        {onViewAll && (
          <button
            onClick={onViewAll}
            className="text-xs text-[#4676ac] hover:text-[#365a87] font-mono"
          >
            VIEW ALL →
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {entries.map((entry) => (
          <EntryCard
            key={entry.id}
            id={entry.id}
            title={entry.title}
            explorerUsername={entry.explorerUsername}
            expeditionName={entry.expeditionName}
            location={entry.location}
            date={entry.date}
            excerpt={entry.excerpt}
            mediaCount={entry.mediaCount}
            views={0}
            wordCount={entry.wordCount}
            type={entry.type}
            coverImageUrl={entry.coverImageUrl}
            isBookmarked={bookmarkedEntries.has(entry.id)}
            isBookmarkLoading={bookmarkingInProgress.has(entry.id)}
            onReadEntry={() => router.push(`/entry/${entry.id}`)}
            onViewExpedition={() => entry.expeditionId && router.push(`/expedition/${entry.expeditionId}`)}
            onViewExplorer={() => router.push(`/journal/${entry.explorerUsername}`)}
            onBookmark={() => handleBookmarkEntry(entry.id)}
          />
        ))}
      </div>
    </div>
  );
}
