'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Square, Play, Pause } from 'lucide-react';
import { useAudioRecorder } from '@/app/hooks/useAudioRecorder';

interface VoiceNoteRecorderProps {
  onPost: (audioBlob: Blob, durationSeconds: number, caption?: string) => Promise<void>;
  disabled?: boolean;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function VoiceNoteRecorder({ onPost, disabled }: VoiceNoteRecorderProps) {
  const { state, audioBlob, audioDuration, waveformPeaks, start, stop, reset, error } = useAudioRecorder();
  const [caption, setCaption] = useState('');
  const [posting, setPosting] = useState(false);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const waveformRef = useRef<HTMLDivElement | null>(null);

  // Clean up audio URL on unmount or reset
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, []);

  const getAudio = useCallback(() => {
    if (previewAudioRef.current) return previewAudioRef.current;
    if (!audioBlob) return null;

    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const url = URL.createObjectURL(audioBlob);
    previewUrlRef.current = url;

    const audio = new Audio(url);
    audio.onended = () => {
      setPreviewPlaying(false);
      setPlaybackProgress(1);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
    previewAudioRef.current = audio;
    return audio;
  }, [audioBlob]);

  const startProgressTracking = () => {
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    progressIntervalRef.current = setInterval(() => {
      const audio = previewAudioRef.current;
      if (audio && audio.duration) {
        setPlaybackProgress(audio.currentTime / audio.duration);
      }
    }, 50);
  };

  const togglePreview = () => {
    const audio = getAudio();
    if (!audio) return;

    if (previewPlaying) {
      audio.pause();
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      setPreviewPlaying(false);
    } else {
      // If at end, restart
      if (playbackProgress >= 0.99) {
        audio.currentTime = 0;
        setPlaybackProgress(0);
      }
      audio.play();
      startProgressTracking();
      setPreviewPlaying(true);
    }
  };

  const handleScrub = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = getAudio();
    if (!audio || !waveformRef.current) return;

    const rect = waveformRef.current.getBoundingClientRect();
    const fraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = fraction * (audio.duration || audioDuration);
    setPlaybackProgress(fraction);
  };

  const handlePost = async () => {
    if (!audioBlob) return;
    setPosting(true);
    try {
      await onPost(audioBlob, audioDuration, caption.trim() || undefined);
      setCaption('');
      cleanupPreview();
      reset();
    } catch {
      // Error handled by parent
    } finally {
      setPosting(false);
    }
  };

  const cleanupPreview = () => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    setPreviewPlaying(false);
    setPlaybackProgress(0);
  };

  const handleDiscard = () => {
    cleanupPreview();
    setCaption('');
    reset();
  };

  if (error) {
    const errorMessages: Record<string, { title: string; hint: string }> = {
      mic_denied: {
        title: 'Microphone access denied',
        hint: 'Click the lock/settings icon in your browser address bar to allow microphone access, then try again.',
      },
      mic_not_found: {
        title: 'No microphone detected',
        hint: 'Connect a microphone and try again.',
      },
      mic_unavailable: {
        title: 'Could not access microphone',
        hint: 'Make sure no other app is using the microphone.',
      },
    };
    const msg = errorMessages[error] || { title: error, hint: '' };

    return (
      <div className="p-3 bg-[#994040]/10 border border-[#994040]">
        <div className="text-xs font-bold text-[#994040] font-mono">{msg.title}</div>
        {msg.hint && <div className="text-xs text-[#994040]/80 mt-1">{msg.hint}</div>}
        <button
          onClick={reset}
          className="mt-2 px-3 py-1 bg-[#994040] text-white text-xs font-bold uppercase hover:bg-[#803535] transition-colors"
          style={{ fontFamily: 'Jost, system-ui, sans-serif', letterSpacing: '0.14em' }}
        >
          Try Again
        </button>
      </div>
    );
  }

  // Idle state: show record button
  if (state === 'idle') {
    return (
      <button
        onClick={start}
        disabled={disabled}
        className="flex items-center gap-2 px-3 py-2 bg-[#4676ac] text-white text-xs font-bold uppercase hover:bg-[#3a6596] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        style={{ fontFamily: 'Jost, system-ui, sans-serif', letterSpacing: '0.14em' }}
      >
        <Mic className="w-3.5 h-3.5" />
        Record Voice Note
      </button>
    );
  }

  // Recording state: show timer + stop
  if (state === 'recording') {
    return (
      <div className="flex items-center gap-3 p-3 bg-[#994040]/10 border border-[#994040]">
        <div className="w-2 h-2 bg-[#994040] rounded-full animate-pulse" />
        <div className="flex-1">
          <div className="w-full h-1.5 bg-[#b5bcc4] dark:bg-[#616161]">
            <div
              className="h-full bg-[#994040] transition-all"
              style={{ width: `${(audioDuration / 60) * 100}%` }}
            />
          </div>
          <span className="text-xs font-mono text-[#994040] mt-0.5 block">
            {audioDuration}s / 60s
          </span>
        </div>
        <button
          onClick={stop}
          className="p-2 bg-[#994040] text-white hover:bg-[#803535] transition-colors"
          title="Stop recording"
        >
          <Square className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  // Stopped state: waveform preview, caption, log/discard
  const playedBars = waveformPeaks.length > 0
    ? Math.floor(playbackProgress * waveformPeaks.length)
    : 0;

  return (
    <div className="space-y-2 p-3 bg-[#f5f5f5] dark:bg-[#2a2a2a] border border-[#b5bcc4] dark:border-[#616161]">
      {/* Waveform player */}
      <div className="flex items-center gap-2">
        <button
          onClick={togglePreview}
          className="shrink-0 w-8 h-8 flex items-center justify-center bg-[#4676ac] text-white"
          title={previewPlaying ? 'Pause' : 'Preview'}
        >
          {previewPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
        </button>

        {/* Waveform */}
        <div
          ref={waveformRef}
          className="flex-1 flex items-center gap-px h-8 cursor-pointer"
          onClick={handleScrub}
        >
          {waveformPeaks.length > 0 ? (
            waveformPeaks.map((peak, i) => (
              <div
                key={i}
                className="flex-1 rounded-sm transition-colors"
                style={{
                  height: `${peak * 100}%`,
                  minHeight: 2,
                  backgroundColor: i < playedBars ? '#4676ac' : '#b5bcc4',
                }}
              />
            ))
          ) : (
            // Placeholder while decoding
            Array.from({ length: 60 }, (_, i) => (
              <div
                key={i}
                className="flex-1 rounded-sm bg-[#b5bcc4] dark:bg-[#616161]"
                style={{ height: '20%', minHeight: 2 }}
              />
            ))
          )}
        </div>

        {/* Time */}
        <span className="shrink-0 text-[10px] font-mono text-[#616161] dark:text-[#b5bcc4] w-10 text-right">
          {formatTime(playbackProgress * audioDuration)}/{formatTime(audioDuration)}
        </span>
      </div>

      <input
        type="text"
        value={caption}
        onChange={(e) => setCaption(e.target.value.slice(0, 200))}
        placeholder="Add a caption (optional)"
        maxLength={200}
        className="w-full px-2 py-1.5 text-xs border border-[#b5bcc4] dark:border-[#616161] bg-white dark:bg-[#202020] text-[#202020] dark:text-[#e5e5e5] font-serif focus:outline-none focus:border-[#4676ac]"
      />

      <div className="flex items-center gap-2">
        <button
          onClick={handlePost}
          disabled={posting}
          className="px-3 py-1.5 bg-[#4676ac] text-white text-xs font-bold uppercase hover:bg-[#3a6596] disabled:opacity-50 transition-colors"
          style={{ fontFamily: 'Jost, system-ui, sans-serif', letterSpacing: '0.14em' }}
        >
          {posting ? 'Logging...' : 'Log'}
        </button>
        <button
          onClick={handleDiscard}
          disabled={posting}
          className="px-3 py-1.5 bg-[#994040] text-white text-xs font-bold uppercase hover:bg-[#803535] disabled:opacity-50 transition-colors"
          style={{ fontFamily: 'Jost, system-ui, sans-serif', letterSpacing: '0.14em' }}
        >
          Discard
        </button>
      </div>
    </div>
  );
}
