'use client';

import { useState, useEffect, useCallback } from 'react';
import { Lock } from 'lucide-react';
import { voiceNoteApi, uploadAudio, type VoiceNote } from '@/app/services/api';
import { VoiceNotePlayer } from './VoiceNotePlayer';
import { VoiceNoteRecorder } from './VoiceNoteRecorder';

interface VoiceNoteSectionProps {
  expeditionId: string | undefined;
  isOwner: boolean;
  isAuthenticated: boolean;
  explorerUsername?: string;
  expeditionStatus?: string;
}

export function VoiceNoteSection({
  expeditionId,
  isOwner,
  isAuthenticated,
  explorerUsername,
  expeditionStatus,
}: VoiceNoteSectionProps) {
  const [voiceNotes, setVoiceNotes] = useState<VoiceNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [locked, setLocked] = useState(false);
  const [dailyLimitReached, setDailyLimitReached] = useState(false);

  const fetchVoiceNotes = useCallback(async () => {
    if (!expeditionId) return;
    setLoading(true);
    try {
      const data = await voiceNoteApi.list(expeditionId);
      setVoiceNotes(data.voiceNotes);
      setDailyLimitReached(data.dailyLimit.used >= data.dailyLimit.max);
      setLocked(false);
    } catch (err: any) {
      if (err?.status === 403) {
        setLocked(true);
      }
    } finally {
      setLoading(false);
    }
  }, [expeditionId]);

  useEffect(() => {
    fetchVoiceNotes();
  }, [fetchVoiceNotes]);

  const handlePost = async (audioBlob: Blob, durationSeconds: number, caption?: string) => {
    if (!expeditionId) return;
    const { audioUrl } = await uploadAudio(audioBlob);
    await voiceNoteApi.create(expeditionId, { audioUrl, durationSeconds, caption });
    await fetchVoiceNotes();
  };

  const handleDelete = async (noteId: string) => {
    if (!expeditionId) return;
    await voiceNoteApi.delete(expeditionId, noteId);
    await fetchVoiceNotes();
  };

  // Nothing to show if locked and not authenticated
  if (locked && !isAuthenticated) return null;

  // Show locked state for non-Tier-3 users
  if (locked) {
    return (
      <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
        <div className="bg-[#4676ac] text-white p-4 border-b-2 border-[#202020] dark:border-[#616161]">
          <h2 className="text-sm font-bold font-mono tracking-wide">VOICE NOTES</h2>
          <div className="text-xs font-mono text-white/70 mt-0.5">SPONSOR EXCLUSIVE</div>
        </div>
        <div className="p-8 text-center">
          <Lock className="w-5 h-5 mx-auto mb-2 text-[#616161]" />
          <p className="text-xs font-serif text-[#616161] dark:text-[#b5bcc4] mb-3">
            Voice note updates are exclusive to Expedition Patrons.
          </p>
          {explorerUsername && (
            <a
              href={isAuthenticated ? `/sponsor/${expeditionId}` : `/auth?redirect=${encodeURIComponent(`/sponsor/${expeditionId}`)}`}
              className="inline-block px-6 py-3 bg-[#4676ac] text-white font-bold font-mono text-sm border-2 border-[#202020] hover:bg-[#3a6596] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#4676ac]"
            >
              BECOME AN EXPEDITION PATRON
            </a>
          )}
        </div>
      </div>
    );
  }

  const showRecorder = isOwner && !dailyLimitReached;

  return (
    <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
      {/* Header */}
      <div className="bg-[#4676ac] text-white p-4 border-b-2 border-[#202020] dark:border-[#616161] flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold font-mono tracking-wide">VOICE NOTES</h2>
          <div className="text-xs font-mono text-white/70 mt-0.5">
            {voiceNotes.length} {voiceNotes.length === 1 ? 'NOTE' : 'NOTES'} LOGGED
          </div>
        </div>
        {isOwner && dailyLimitReached && (
          <div className="px-3 py-1 bg-[#202020]/30 text-xs font-mono">
            DAILY LIMIT REACHED
          </div>
        )}
      </div>

      {/* Recorder for owner */}
      {showRecorder && (
        <div className="p-4 bg-[#f5f5f5] dark:bg-[#2a2a2a] border-b-2 border-[#202020] dark:border-[#616161]">
          <VoiceNoteRecorder
            onPost={handlePost}
            disabled={dailyLimitReached}
          />
        </div>
      )}

      {/* Voice notes list */}
      <div className="p-4">
        {loading && voiceNotes.length === 0 ? (
          <div className="text-xs font-mono text-[#616161] dark:text-[#b5bcc4] py-4 text-center">
            Loading...
          </div>
        ) : voiceNotes.length === 0 ? (
          <div className="border border-dashed border-[#b5bcc4] dark:border-[#3a3a3a] bg-[#f5f5f5] dark:bg-[#1a1a1a] p-8 text-center">
            <div className="text-sm font-bold font-mono text-[#616161] dark:text-[#b5bcc4] mb-1">
              NO VOICE NOTES YET
            </div>
            <div className="text-xs text-[#b5bcc4] dark:text-[#616161]">
              Audio updates from the explorer will appear here.
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {voiceNotes.map((vn, index) => (
              <VoiceNotePlayer
                key={vn.id}
                voiceNote={vn}
                noteNumber={voiceNotes.length - index}
                expeditionStatus={expeditionStatus}
                isOwner={isOwner}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
