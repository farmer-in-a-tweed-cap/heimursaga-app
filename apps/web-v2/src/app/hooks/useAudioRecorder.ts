import { useState, useRef, useCallback, useEffect } from 'react';

type RecorderState = 'idle' | 'recording' | 'stopped';

interface UseAudioRecorderReturn {
  state: RecorderState;
  audioBlob: Blob | null;
  audioDuration: number;
  waveformPeaks: number[];
  start: () => Promise<void>;
  stop: () => void;
  reset: () => void;
  error: string | null;
}

/** Downsample audio buffer into N normalized peak values (0–1). */
export function extractPeaks(audioBuffer: AudioBuffer, barCount: number): number[] {
  const rawData = audioBuffer.getChannelData(0);
  const samplesPerBar = Math.floor(rawData.length / barCount);
  const peaks: number[] = [];
  let maxPeak = 0;

  for (let i = 0; i < barCount; i++) {
    let sum = 0;
    const start = i * samplesPerBar;
    for (let j = start; j < start + samplesPerBar && j < rawData.length; j++) {
      sum += Math.abs(rawData[j]);
    }
    const avg = sum / samplesPerBar;
    peaks.push(avg);
    if (avg > maxPeak) maxPeak = avg;
  }

  // Normalize to 0–1
  if (maxPeak === 0) return peaks.map(() => 0.05);
  return peaks.map(p => Math.max(0.05, p / maxPeak));
}

export function useAudioRecorder(): UseAudioRecorderReturn {
  const [state, setState] = useState<RecorderState>('idle');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [waveformPeaks, setWaveformPeaks] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getMimeType = (): string => {
    if (typeof MediaRecorder === 'undefined') return 'audio/webm';
    if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) return 'audio/webm;codecs=opus';
    if (MediaRecorder.isTypeSupported('audio/webm')) return 'audio/webm';
    if (MediaRecorder.isTypeSupported('audio/mp4')) return 'audio/mp4';
    if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) return 'audio/ogg;codecs=opus';
    return 'audio/webm';
  };

  // Extract waveform peaks when audioBlob changes
  useEffect(() => {
    if (!audioBlob) {
      // Deferred to next microtask to satisfy react-compiler
      const id = requestAnimationFrame(() => setWaveformPeaks([]));
      return () => cancelAnimationFrame(id);
    }

    let cancelled = false;
    (async () => {
      try {
        const arrayBuffer = await audioBlob.arrayBuffer();
        const audioCtx = new AudioContext();
        const decoded = await audioCtx.decodeAudioData(arrayBuffer);
        if (!cancelled) {
          setWaveformPeaks(extractPeaks(decoded, 60));
        }
        audioCtx.close();
      } catch {
        // Fallback: generate placeholder bars
        if (!cancelled) {
          setWaveformPeaks(Array.from({ length: 60 }, () => 0.1 + Math.random() * 0.3));
        }
      }
    })();
    return () => { cancelled = true; };
  }, [audioBlob]);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (autoStopRef.current) {
      clearTimeout(autoStopRef.current);
      autoStopRef.current = null;
    }
    if (mediaRecorderRef.current?.stream) {
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
    }
    mediaRecorderRef.current = null;
  }, []);

  const start = useCallback(async () => {
    try {
      setError(null);
      setAudioBlob(null);
      setAudioDuration(0);
      setWaveformPeaks([]);
      chunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getMimeType();
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
        const baseMime = mimeType.split(';')[0];
        const blob = new Blob(chunksRef.current, { type: baseMime });
        setAudioBlob(blob);
        setAudioDuration(Math.min(duration, 60));
        setState('stopped');
        cleanup();
      };

      recorder.onerror = () => {
        setError('Recording failed');
        setState('idle');
        cleanup();
      };

      startTimeRef.current = Date.now();
      recorder.start(1000); // collect data every second
      setState('recording');

      // Track elapsed time
      timerRef.current = setInterval(() => {
        const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000);
        setAudioDuration(Math.min(elapsed, 60));
      }, 500);

      // Auto-stop at 60 seconds
      autoStopRef.current = setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
      }, 60000);
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('mic_denied');
      } else if (err.name === 'NotFoundError') {
        setError('mic_not_found');
      } else {
        setError('mic_unavailable');
      }
      setState('idle');
    }
  }, [cleanup]);

  const stop = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const reset = useCallback(() => {
    cleanup();
    setAudioBlob(null);
    setAudioDuration(0);
    setWaveformPeaks([]);
    setError(null);
    setState('idle');
    chunksRef.current = [];
  }, [cleanup]);

  return { state, audioBlob, audioDuration, waveformPeaks, start, stop, reset, error };
}
