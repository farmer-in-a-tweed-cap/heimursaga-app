'use client';

import { useState, useRef, useCallback } from 'react';
import { Play, Pause, Trash2 } from 'lucide-react';
import type { VoiceNote } from '@/app/services/api';

interface VoiceNotePlayerProps {
  voiceNote: VoiceNote;
  noteNumber: number;
  expeditionStatus?: string;
  isOwner: boolean;
  onDelete?: (id: string) => void;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${date} ${time}`;
}

function getStatusBadgeColor(status?: string): string {
  switch (status?.toUpperCase()) {
    case 'PLANNING': return 'bg-[#4676ac]';
    case 'ACTIVE': return 'bg-[#ac6d46]';
    case 'COMPLETE':
    case 'COMPLETED': return 'bg-[#616161]';
    case 'CANCELLED': return 'bg-[#994040]';
    default: return 'bg-[#b5bcc4]';
  }
}

function getStatusLabel(status?: string): string {
  if (!status) return '';
  const upper = status.toUpperCase();
  if (upper === 'COMPLETED') return 'COMPLETE';
  return upper;
}

export function VoiceNotePlayer({ voiceNote, noteNumber, expeditionStatus, isOwner, onDelete }: VoiceNotePlayerProps) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const togglePlay = useCallback(() => {
    if (!audioRef.current) {
      const audio = new Audio(voiceNote.audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        setPlaying(false);
        setProgress(0);
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }

    if (playing) {
      audioRef.current.pause();
      if (intervalRef.current) clearInterval(intervalRef.current);
      setPlaying(false);
    } else {
      audioRef.current.play();
      intervalRef.current = setInterval(() => {
        if (audioRef.current) {
          setProgress(audioRef.current.currentTime / (voiceNote.durationSeconds || 1));
        }
      }, 100);
      setPlaying(true);
    }
  }, [playing, voiceNote.audioUrl, voiceNote.durationSeconds]);

  return (
    <div className="border-2 border-[#202020] dark:border-[#616161] border-l-4 border-l-[#4676ac] bg-white dark:bg-[#1a1a1a]">
      {/* Card Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#f5f5f5] dark:bg-[#2a2a2a] border-b-2 border-[#202020] dark:border-[#616161]">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 bg-[#4676ac] text-white text-xs font-mono font-bold rounded-full">
            NOTE #{noteNumber}
          </span>
          {expeditionStatus && (
            <span className={`px-1.5 py-0.5 text-xs font-mono font-bold text-white rounded-full ${getStatusBadgeColor(expeditionStatus)}`}>
              {getStatusLabel(expeditionStatus)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-[#616161] dark:text-[#b5bcc4]">
            {formatTimestamp(voiceNote.createdAt).toUpperCase()}
          </span>
          {isOwner && onDelete && (
            <button
              onClick={() => onDelete(voiceNote.id)}
              className="text-[#994040] hover:bg-[#994040]/10 p-1 transition-colors"
              title="Delete voice note"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Player Body */}
      <div className="p-3">
        <div className="flex items-center gap-3">
          {/* Play button */}
          <button
            onClick={togglePlay}
            className="shrink-0 w-9 h-9 flex items-center justify-center bg-[#4676ac] text-white hover:bg-[#3a6596] transition-colors"
            title={playing ? 'Pause' : 'Play'}
          >
            {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>

          <div className="flex-1 min-w-0">
            {/* Progress bar */}
            <div className="w-full h-1.5 bg-[#b5bcc4] dark:bg-[#616161]">
              <div
                className="h-full bg-[#4676ac] transition-all"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            {/* Duration + author */}
            <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-[#616161] dark:text-[#b5bcc4]" style={{ fontFamily: 'Jost, system-ui, sans-serif', letterSpacing: '0.14em' }}>
              <span>{formatDuration(voiceNote.durationSeconds)}</span>
              <span className="uppercase">{voiceNote.author.username}</span>
            </div>
          </div>
        </div>

        {/* Caption */}
        {voiceNote.caption && (
          <p className="text-xs font-serif text-[#202020] dark:text-[#e5e5e5] mt-2" style={{ lineHeight: 1.5 }}>
            {voiceNote.caption}
          </p>
        )}
      </div>
    </div>
  );
}
