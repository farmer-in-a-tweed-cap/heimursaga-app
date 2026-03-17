'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname, useParams } from 'next/navigation';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useProFeatures } from '@/app/hooks/useProFeatures';
import { LocationMap } from '@/app/components/LocationMap';
import { DatePicker } from '@/app/components/DatePicker';
import { X, Image as ImageIcon, Clock, Lock, Camera, Loader2, AlertCircle, AlertTriangle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatDate, formatDateTime } from '@/app/utils/dateFormat';

import { entryApi, expeditionApi, uploadApi, Entry, type Expedition } from '@/app/services/api';
import { useContentValidation } from '@/app/hooks/useContentValidation';
import { checkImageExif, type ExifResult } from '@/app/utils/exifCheck';

export function EditEntryPage() {
  const { user, isAuthenticated } = useAuth();
  const { isPro } = useProFeatures();

  const { entryId } = useParams<{ entryId: string }>();
  const router = useRouter();
  const pathname = usePathname();
  const [entryType, setEntryType] = useState<'standard' | 'photo' | 'video' | 'data' | 'waypoint'>('standard');
  const [showMap, setShowMap] = useState(false);
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // API entry data
  const [apiEntry, setApiEntry] = useState<Entry | null>(null);

  // Media upload state
  const [uploadedMedia, setUploadedMedia] = useState<Array<{ id: string; name: string; type: string; size: number; url?: string; thumbnail?: string; exifResult?: ExifResult }>>([]);
  const [isUploading, setIsUploading] = useState(false);
  const mediaLimit = entryType === 'video' ? 0 : isPro ? (entryType === 'photo' ? 10 : 5) : 2;
  const [selectedMediaForEdit, setSelectedMediaForEdit] = useState<string | null>(null);
  const [mediaMetadata, setMediaMetadata] = useState<Record<string, { caption: string; altText: string; credit: string }>>({});
  const [coverPhotoId, setCoverPhotoId] = useState<string | null>(null);

  // AI content detection
  const [contentValidation, contentValidationActions] = useContentValidation();
  const [imageWarnings, setImageWarnings] = useState<Record<string, boolean>>({});
  const hasUnacknowledgedImageWarnings = uploadedMedia.some(
    m => m.exifResult?.isSuspicious && !imageWarnings[m.id]
  );
  
  // Content state for word count validation
  const [standardContent, setStandardContent] = useState('');
  const [photoContent] = useState('');
  const [videoContent, setVideoContent] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [dataContent] = useState('');
  const [entryTitle, setEntryTitle] = useState('');
  const [locationName, setLocationName] = useState('');
  const [entryDate, setEntryDate] = useState('');

  const [entryTime, setEntryTime] = useState('');
  const [commentsEnabled, setCommentsEnabled] = useState(true);

  // Auto-save state
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const lastSavedContentRef = useRef<string>('');
  const isAutoSavingRef = useRef(false);
  const isSubmittingRef = useRef(false);

  // Delete state
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Full expedition data for LocationMap context
  const [fullExpedition, setFullExpedition] = useState<Expedition | null>(null);
  const [markerOnCompletedSegment, setMarkerOnCompletedSegment] = useState(false);

  // Date range for the date picker
  // Past expeditions (both start & end in the past): startDate → endDate
  // Otherwise: publishDate → min(today, endDate)
  const { dateMin, dateMax } = useMemo(() => {
    const d = new Date();
    const todayLocal = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const start = fullExpedition?.startDate ? fullExpedition.startDate.slice(0, 10) : undefined;
    const end = fullExpedition?.endDate ? fullExpedition.endDate.slice(0, 10) : undefined;
    // Both dates exist and are in the past — use the expedition's actual timeframe
    if (start && end && start <= todayLocal && end <= todayLocal) {
      return { dateMin: start, dateMax: end };
    }
    const min = fullExpedition?.createdAt ? fullExpedition.createdAt.slice(0, 10) : undefined;
    let max = todayLocal;
    if (end && end < todayLocal) max = end;
    return { dateMin: min, dateMax: max };
  }, [fullExpedition?.createdAt, fullExpedition?.startDate, fullExpedition?.endDate]);

  // Allowed image types for upload
  const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

  // Validate file type and size
  const validateFile = (file: File): { valid: boolean; error?: string } => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return { valid: false, error: `${file.name}: Invalid file type. Allowed: JPG, PNG, WEBP, GIF` };
    }
    if (file.size > MAX_FILE_SIZE) {
      return { valid: false, error: `${file.name}: File too large. Maximum size is 25MB` };
    }
    return { valid: true };
  };

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = mediaLimit - uploadedMedia.length;
    const filesToUpload = Array.from(files).slice(0, remainingSlots);

    // Validate all files first
    const validFiles: File[] = [];
    const errors: string[] = [];
    for (const file of filesToUpload) {
      const validation = validateFile(file);
      if (validation.valid) {
        validFiles.push(file);
      } else if (validation.error) {
        errors.push(validation.error);
      }
    }

    // Show validation errors if any
    if (errors.length > 0) {
      setSubmitError(errors.join('\n'));
    }

    if (validFiles.length === 0) {
      e.target.value = '';
      return;
    }

    setIsUploading(true);

    for (const file of validFiles) {
      try {
        // Check EXIF data for AI-generated image detection
        const exifResult = await checkImageExif(file);

        const result = await uploadApi.upload(file);
        const newMedia = {
          id: result.uploadId,
          name: file.name,
          type: file.type,
          size: file.size,
          url: result.original,
          thumbnail: result.thumbnail,
          exifResult,
        };
        setUploadedMedia(prev => [...prev, newMedia]);
      } catch {
        setSubmitError(`Failed to upload ${file.name}`);
      }
    }

    setIsUploading(false);
    e.target.value = '';
  };

  // Load entry data on mount
  useEffect(() => {
    const fetchEntry = async () => {
      if (!entryId) {
        setLoadError('No entry ID provided');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setLoadError(null);

      try {
        const entry = await entryApi.getById(entryId);
        setApiEntry(entry);

        // Check if user owns this entry
        if (!entry.createdByMe) {
          setLoadError('You do not have permission to edit this entry');
          setIsLoading(false);
          return;
        }

        // Map API data to form state
        setEntryType(entry.entryType || 'standard');
        setEntryTitle(entry.title || '');
        setStandardContent(entry.content || '');
        setLocationName(entry.place || '');

        if (entry.lat && entry.lon) {
          setCoordinates({ lat: entry.lat, lng: entry.lon });
        }

        // Parse date and time from entry (stay in UTC to avoid timezone drift)
        if (entry.date) {
          const iso = typeof entry.date === 'string' ? entry.date : new Date(entry.date).toISOString();
          setEntryDate(iso.slice(0, 10));
          const time = iso.slice(11, 16);
          // Only populate time if it was explicitly set (not midnight default)
          if (time !== '00:00') setEntryTime(time);
        }

        // Load existing media
        if (entry.media && entry.media.length > 0) {
          const mappedMedia = entry.media.map((m, idx) => ({
            id: m.id || `media-${idx}`,
            name: m.original?.split('/').pop() || `image-${idx + 1}`,
            type: 'image/jpeg',
            size: 0,
            url: m.original || m.url || '',
            thumbnail: m.thumbnail || m.original || m.url || '',
          }));
          setUploadedMedia(mappedMedia);

          // Load media metadata
          const metadata: Record<string, { caption: string; altText: string; credit: string }> = {};
          entry.media.forEach((m, idx) => {
            const mediaId = m.id || `media-${idx}`;
            metadata[mediaId] = {
              caption: m.caption || '',
              altText: m.altText || '',
              credit: m.credit || '',
            };
          });
          setMediaMetadata(metadata);

          // Set cover photo by matching URLs (compare path portion to handle domain differences)
          if (entry.coverImage) {
            const coverPath = entry.coverImage.split('/').slice(-2).join('/'); // Get last 2 path segments
            const coverMedia = entry.media.find(m => {
              const originalPath = m.original?.split('/').slice(-2).join('/');
              const urlPath = m.url?.split('/').slice(-2).join('/');
              return originalPath === coverPath || urlPath === coverPath;
            });
            if (coverMedia) {
              setCoverPhotoId(coverMedia.id || 'media-0');
            }
          }
        }

        // Load video-specific data from metadata
        if (entry.entryType === 'video') {
          setVideoContent(entry.content || '');
          if (entry.metadata) {
            const meta = entry.metadata as Record<string, string>;
            if (meta.videoUrl) setVideoUrl(meta.videoUrl);
          }
        }

        // Set comments enabled state (default to true if not specified)
        setCommentsEnabled(entry.commentsEnabled !== false);

        setIsLoading(false);
      } catch {
        setLoadError('Failed to load entry. It may not exist or you may not have access.');
        setIsLoading(false);
      }
    };

    fetchEntry();
  }, [entryId]);

  // Fetch full expedition data for LocationMap context
  useEffect(() => {
    const expId = apiEntry?.trip?.id || apiEntry?.expedition?.id || apiEntry?.expedition?.publicId;
    if (!expId) return;

    let cancelled = false;
    const fetchExpedition = async () => {
      try {
        const data = await expeditionApi.getById(expId);
        if (!cancelled) setFullExpedition(data);
      } catch {
        // Silent fail - expedition context is optional for the map
      }
    };
    fetchExpedition();
    return () => { cancelled = true; };
  }, [apiEntry?.trip?.id, apiEntry?.expedition?.id, apiEntry?.expedition?.publicId]);

  // Word count function
  const countWords = (text: string): number => {
    const trimmed = text.trim();
    if (trimmed === '') return 0;
    return trimmed.split(/\s+/).length;
  };

  // Get word count for current entry type
  const getWordCount = (): number => {
    switch (entryType) {
      case 'standard':
        return countWords(standardContent);
      case 'photo':
        return countWords(photoContent);
      case 'video':
        return countWords(videoContent);
      case 'data':
        return countWords(dataContent);
      default:
        return 0;
    }
  };

  const wordCount = getWordCount();
  const minWords = entryType === 'standard' ? 200 : 20;
  const isWordCountValid = entryType === 'waypoint' || (wordCount >= minWords && wordCount <= 2000);

  // Get expedition info from API entry
  const expedition = apiEntry?.trip || apiEntry?.expedition;

  // Detect if entry is linked to a waypoint (coordinates should be locked)
  const isLinkedToWaypoint = useMemo(() => {
    if (!fullExpedition?.waypoints || !apiEntry?.id) return false;
    return fullExpedition.waypoints.some(wp =>
      (wp.entryIds || []).includes(apiEntry.id) || wp.entryId === apiEntry.id
    );
  }, [fullExpedition?.waypoints, apiEntry?.id]);

  // Build payload for saving
  const buildSavePayload = useCallback(() => {
    return {
      title: entryTitle,
      content: standardContent || photoContent || videoContent || dataContent,
      place: locationName,
      lat: coordinates?.lat,
      lon: coordinates?.lng,
      date: entryDate ? `${entryDate}T${entryTime || '00:00'}:00.000Z` : undefined,
      entryType,
      ...(entryType === 'video' && videoUrl ? { metadata: { videoUrl } } : {}),
      uploads: uploadedMedia.map(m => m.id),
      uploadCaptions: Object.fromEntries(
        Object.entries(mediaMetadata).map(([id, data]) => [id, data.caption])
      ),
      uploadAltTexts: Object.fromEntries(
        Object.entries(mediaMetadata).map(([id, data]) => [id, data.altText])
      ),
      uploadCredits: Object.fromEntries(
        Object.entries(mediaMetadata).map(([id, data]) => [id, data.credit])
      ),
      coverUploadId: coverPhotoId || undefined,
      commentsEnabled,
    };
  }, [entryTitle, standardContent, photoContent, videoContent, videoUrl, dataContent, locationName, coordinates, entryDate, entryTime, entryType, uploadedMedia, mediaMetadata, coverPhotoId, commentsEnabled]);

  // Auto-save function
  const performAutoSave = useCallback(async () => {
    if (!entryId || !apiEntry) return;

    const content = standardContent || photoContent || videoContent || dataContent;
    const mediaIds = uploadedMedia.map(m => m.id).join(',');
    const captionsStr = JSON.stringify(mediaMetadata);
    const contentSignature = `${entryTitle}|${content}|${locationName}|${coordinates?.lat}|${coordinates?.lng}|${entryType}|${videoUrl}|${mediaIds}|${captionsStr}|${coverPhotoId}`;

    // Skip if no changes
    if (contentSignature === lastSavedContentRef.current) return;

    setIsAutoSaving(true);
    isAutoSavingRef.current = true;
    try {
      const payload = buildSavePayload();
      await entryApi.update(entryId, payload);
      lastSavedContentRef.current = contentSignature;
      setLastSaved(new Date());
    } catch (err) {
      console.error('Auto-save failed:', err);
      // Silent fail for auto-save
    } finally {
      setIsAutoSaving(false);
      isAutoSavingRef.current = false;
    }
  }, [entryId, apiEntry, entryTitle, standardContent, photoContent, videoContent, videoUrl, dataContent, locationName, coordinates, buildSavePayload, uploadedMedia, mediaMetadata, coverPhotoId, entryType]);

  // Auto-save interval (every 30 seconds)
  useEffect(() => {
    if (!apiEntry) return; // Don't start auto-save until entry is loaded

    const interval = setInterval(() => {
      if (!isSubmittingRef.current && !isAutoSavingRef.current) {
        performAutoSave();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [performAutoSave, apiEntry]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!entryId || !apiEntry) return;

    // --- Form validation (toast notifications) ---
    const errors: string[] = [];

    if (!entryTitle.trim()) {
      errors.push('Entry title is required');
    }
    if (!entryDate) {
      errors.push('Entry date is required');
    }
    if (!locationName.trim()) {
      errors.push('Location name is required');
    }
    if (!coordinates) {
      errors.push('GPS coordinates are required');
    }
    if (!isWordCountValid) {
      if (wordCount < minWords) {
        errors.push(`Entry content must be at least ${minWords} words (currently ${wordCount})`);
      } else if (wordCount > 2000) {
        errors.push(`Entry content must not exceed 2,000 words (currently ${wordCount})`);
      }
    }

    if (errors.length > 0) {
      errors.forEach(msg => toast.error(msg));
      return;
    }

    setIsSubmitting(true);
    isSubmittingRef.current = true;
    setSubmitError(null);

    try {
      const payload = buildSavePayload();
      await entryApi.update(entryId, payload);
      router.push(`/entry/${entryId}`);
    } catch {
      const msg = 'Failed to update entry. Please try again.';
      toast.error(msg);
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
      isSubmittingRef.current = false;
    }
  };

  const handleDeleteEntry = async () => {
    setIsDeleting(true);
    try {
      await entryApi.delete(entryId);
      toast.success('Entry deleted');
      if (expedition?.id) {
        router.push(`/expedition/${expedition.id}`);
      } else {
        router.push('/');
      }
    } catch {
      toast.error('Failed to delete entry');
    } finally {
      setIsDeleting(false);
    }
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
              You must be logged in to edit journal entries. Please log in to continue.
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
                className="px-6 py-3 border-2 border-[#202020] dark:border-[#616161] text-[#202020] dark:text-[#e5e5e5] font-bold hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#616161] text-sm"
              >
                GO TO HOMEPAGE
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="max-w-[1600px] mx-auto px-6 py-12">
        <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-6">
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#616161] dark:text-[#b5bcc4] mb-4" />
            <div className="text-xl font-bold text-[#616161] dark:text-[#b5bcc4] font-mono">
              LOADING ENTRY DATA...
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (loadError) {
    return (
      <div className="max-w-[1600px] mx-auto px-6 py-12">
        <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
          <div className="p-6 border-b-2 border-[#202020] dark:border-[#616161] bg-red-600 text-white">
            <div className="flex items-center gap-3">
              <AlertCircle size={24} strokeWidth={2} />
              <h2 className="text-lg font-bold">ERROR LOADING ENTRY</h2>
            </div>
          </div>
          <div className="p-8 text-center">
            <p className="text-sm text-[#616161] dark:text-[#b5bcc4] mb-6">
              {loadError}
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => router.back()}
                className="px-6 py-3 bg-[#ac6d46] text-white font-bold hover:bg-[#8a5738] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] text-sm"
              >
                GO BACK
              </button>
              <button
                onClick={() => router.push('/')}
                className="px-6 py-3 border-2 border-[#202020] dark:border-[#616161] text-[#202020] dark:text-[#e5e5e5] font-bold hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#616161] text-sm"
              >
                GO TO HOMEPAGE
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Block editing entries on cancelled expeditions
  if (fullExpedition?.status === 'cancelled') {
    const expId = fullExpedition.id || fullExpedition.publicId;
    return (
      <div className="max-w-[1600px] mx-auto px-6 py-12">
        <div className="bg-white dark:bg-[#202020] border-2 border-[#994040] p-8 text-center">
          <X className="w-12 h-12 text-[#994040] mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2 dark:text-white">Expedition Cancelled</h2>
          <p className="text-[#616161] dark:text-[#b5bcc4] mb-4">This expedition has been cancelled. No new entries can be logged and existing entries cannot be edited.</p>
          <Link
            href={expId ? `/expedition/${expId}` : '/'}
            className="inline-block px-6 py-2 bg-[#994040] text-white font-bold hover:bg-[#7a3333] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#994040]"
          >
            Back to Expedition
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto px-6 py-12">
      {/* Page Header */}
      <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-6 mb-6">
        <div className="flex items-center justify-between mb-4 border-b-2 border-[#202020] dark:border-[#616161] pb-2">
          <div>
            <h1 className="text-2xl font-bold dark:text-[#e5e5e5]">EDIT JOURNAL ENTRY</h1>
            {expedition && (
              <div className="text-sm text-[#616161] dark:text-[#b5bcc4] mt-1">
                Expedition: <span className="text-[#ac6d46] font-bold">{expedition.title}</span>
                {apiEntry?.expeditionDay && ` • Day ${apiEntry.expeditionDay}`}
              </div>
            )}
          </div>
          <Link
            href={`/entry/${entryId}`}
            className="px-4 py-2 border-2 border-[#202020] dark:border-[#616161] dark:text-[#e5e5e5] hover:bg-[#95a2aa] dark:hover:bg-[#4a4a4a] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#616161] text-sm"
          >
            ← BACK TO ENTRY
          </Link>
        </div>
        
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-[#616161] dark:text-[#b5bcc4] font-mono">
          <span>ID: {apiEntry?.id}</span>
          <span>Created: {formatDateTime(apiEntry?.createdAt)}</span>
          <span className="text-[#4676ac]">
            {isAutoSaving ? 'Saving...' : lastSaved ? `Auto-saved ${lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Auto-save on'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - Entry Form */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-6">
            {/* Entry Type Display - LOCKED AFTER PUBLISHING */}
            <div className="mb-6">
              <div className="flex items-center justify-between p-3 bg-[#f5f5f5] dark:bg-[#2a2a2a] border-2 border-[#b5bcc4] dark:border-[#3a3a3a]">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-[#616161] dark:text-[#b5bcc4]">TYPE:</span>
                  <span className="text-sm font-bold text-[#202020] dark:text-[#e5e5e5]">
                    {entryType === 'standard' && 'STANDARD'}
                    {entryType === 'photo' && 'PHOTO'}
                    {entryType === 'video' && 'VIDEO'}
                    {entryType === 'data' && 'DATA'}
                    {entryType === 'waypoint' && 'WAYPOINT'}
                  </span>
                </div>
                <span className="px-2 py-0.5 bg-[#616161] text-white text-xs font-bold">
                  LOCKED
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Entry Title - ALL TYPES */}
              <div>
                <label className="block text-xs font-medium mb-2 text-[#202020] dark:text-[#e5e5e5]">
                  ENTRY TITLE
                  <span className="text-[#ac6d46] ml-1">*REQUIRED</span>
                </label>
                <input
                  type="text"
                  maxLength={75}
                  className="w-full px-4 py-3 border-2 border-[#b5bcc4] dark:border-[#3a3a3a] focus:border-[#ac6d46] outline-none text-sm dark:bg-[#2a2a2a] dark:text-[#e5e5e5]"
                  placeholder={
                    entryType === 'waypoint'
                      ? 'e.g., Rest Stop - Highway 87'
                      : 'e.g., Day 147: Samarkand at Sunrise'
                  }
                  value={entryTitle}
                  onChange={(e) => setEntryTitle(e.target.value)}
                />
                <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1 font-mono">
                  {entryTitle.length}/75 characters
                </div>
              </div>
              
              {/* Date & Time - ALL TYPES */}
              <div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium mb-2 text-[#202020] dark:text-[#e5e5e5]">
                      ENTRY DATE
                      <span className="text-[#ac6d46] ml-1">*REQUIRED</span>
                    </label>
                    <DatePicker
                      className="w-full px-4 py-3 border-2 border-[#b5bcc4] dark:border-[#3a3a3a] focus:border-[#ac6d46] outline-none text-sm dark:bg-[#2a2a2a] dark:text-[#e5e5e5]"
                      value={entryDate}
                      onChange={setEntryDate}
                      min={dateMin}
                      max={dateMax}
                    />
                    {dateMin && (
                      <p className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1 font-mono">
                        {dateMin} — {dateMax}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-2 text-[#202020] dark:text-[#e5e5e5]">
                      TIME
                      <span className="text-[#616161] dark:text-[#b5bcc4] ml-1 font-normal">(optional)</span>
                    </label>
                    <input
                      type="time"
                      className="w-full px-4 py-3 border-2 border-[#b5bcc4] dark:border-[#3a3a3a] focus:border-[#ac6d46] outline-none text-sm font-mono dark:bg-[#2a2a2a] dark:text-[#e5e5e5]"
                      value={entryTime}
                      onChange={(e) => setEntryTime(e.target.value)}
                    />
                  </div>
                </div>
                {entryDate && entryDate < dateMax && (
                  <div className="mt-2 px-2 py-1 bg-[#4676ac]/10 border-l-2 border-[#4676ac] text-xs text-[#4676ac] inline-block">
                    <Clock size={12} className="inline mr-1" />
                    Retrospective entry
                  </div>
                )}
              </div>

              {/* Location - ALL TYPES */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-2 text-[#202020] dark:text-[#e5e5e5]">
                    LOCATION NAME
                    <span className="text-[#ac6d46] ml-1">*REQUIRED</span>
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 border-2 border-[#b5bcc4] dark:border-[#3a3a3a] focus:border-[#ac6d46] outline-none text-sm dark:bg-[#2a2a2a] dark:text-[#e5e5e5]"
                    placeholder="e.g., Samarkand Region"
                    value={locationName}
                    onChange={(e) => setLocationName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-2 text-[#202020] dark:text-[#e5e5e5]">
                    GPS COORDINATES
                    <span className="text-[#ac6d46] ml-1">*REQUIRED</span>
                  </label>
                  <input
                    type="text"
                    className={`w-full px-4 py-3 border-2 outline-none text-sm font-mono ${
                      isLinkedToWaypoint
                        ? 'border-[#b5bcc4] dark:border-[#3a3a3a] bg-[#f5f5f5] dark:bg-[#1a1a1a] text-[#616161] dark:text-[#b5bcc4] cursor-not-allowed'
                        : 'border-[#b5bcc4] dark:border-[#3a3a3a] focus:border-[#ac6d46] dark:bg-[#2a2a2a] dark:text-[#e5e5e5]'
                    }`}
                    placeholder="e.g., 39.6270, 66.9750"
                    value={coordinates ? `${coordinates.lat}, ${coordinates.lng}` : ''}
                    readOnly={isLinkedToWaypoint}
                    onChange={(e) => {
                      if (isLinkedToWaypoint) return;
                      const [lat, lng] = e.target.value.split(',').map(Number);
                      if (!isNaN(lat) && !isNaN(lng)) {
                        setCoordinates({ lat, lng });
                      }
                    }}
                  />
                  {isLinkedToWaypoint ? (
                    <div className="mt-2 px-3 py-2 bg-[#f5f5f5] dark:bg-[#2a2a2a] border-l-2 border-[#4676ac] text-xs text-[#616161] dark:text-[#b5bcc4]">
                      <Lock size={12} className="inline mr-1" />
                      Coordinates locked to waypoint — edit location in the Expedition Builder
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="mt-2 w-full px-3 py-2 bg-[#4676ac] text-white text-xs font-bold hover:bg-[#365a87] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#4676ac]"
                      onClick={() => setShowMap(true)}
                    >
                      UPDATE LOCATION
                    </button>
                  )}
                </div>
              </div>
              


              {/* STANDARD ENTRY FIELDS */}
              {entryType === 'standard' && (
                <>
                  <div>
                    <label className="block text-xs font-medium mb-2 text-[#202020] dark:text-[#e5e5e5]">
                      ENTRY CONTENT
                      <span className="text-[#ac6d46] ml-1">*REQUIRED</span>
                    </label>
                    <textarea
                      className="w-full px-4 py-3 border-2 border-[#b5bcc4] dark:border-[#3a3a3a] focus:border-[#ac6d46] outline-none text-sm font-mono leading-relaxed dark:bg-[#2a2a2a] dark:text-[#e5e5e5]"
                      rows={16}
                      placeholder={`Write your journal entry here...

Share your experiences, observations, and reflections. Include details about:
• What you saw and experienced today
• People you met and conversations you had
• Cultural insights and observations
• Challenges and achievements
• Photos and their context
• Future plans and next destinations

Remember: Your sponsors and followers are reading this to understand your journey.`}
                      value={standardContent}
                      onChange={(e) => setStandardContent(e.target.value)}
                      onPaste={contentValidationActions.handlePaste}
                      onInput={contentValidationActions.handleInput}
                      onBlur={() => contentValidationActions.checkAiPhrases(standardContent)}
                    />
                    <div className="flex justify-between text-xs text-[#616161] dark:text-[#b5bcc4] mt-1 font-mono">
                      <span className={wordCount < minWords || wordCount > 2000 ? 'text-red-600 dark:text-red-400 font-bold' : ''}>
                        Word count: {wordCount} / 2,000 {wordCount > 0 && wordCount < minWords && `(Minimum: ${minWords})`} {wordCount > 2000 && `(Maximum: 2,000)`}
                      </span>
                      <span>Character count: {standardContent.length} / 50,000</span>
                    </div>
                    {wordCount > 0 && (wordCount < minWords || wordCount > 2000) && (
                      <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 border-l-2 border-red-600 text-xs text-red-700 dark:text-red-400">
                        <div className="font-bold mb-1">WORD COUNT REQUIREMENT:</div>
                        {wordCount < minWords && <div>• Your entry must be at least {minWords} words. Current: {wordCount} words ({minWords - wordCount} more needed)</div>}
                        {wordCount > 2000 && <div>• Your entry must not exceed 2,000 words. Current: {wordCount} words ({wordCount - 2000} over limit)</div>}
                      </div>
                    )}

                    {/* AI Content Detection Warnings */}
                    {contentValidation.hasPasteWarning && (
                      <div className="mt-3 p-4 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-500 text-sm">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <div className="font-bold text-amber-800 dark:text-amber-300 mb-1">HIGH PASTE CONTENT DETECTED</div>
                            <div className="text-amber-700 dark:text-amber-400 text-xs mb-2">
                              {Math.round(contentValidation.pasteRatio * 100)}% of your content appears to be pasted rather than typed.
                              <span className="block mt-1 font-bold">Our Terms of Service require original, human-created content. We screen all text and media for AI.</span>
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={contentValidation.pasteAcknowledged}
                                onChange={() => contentValidationActions.acknowledgePaste()}
                                className="w-4 h-4 border-2 border-amber-500 accent-amber-600"
                              />
                              <span className="text-xs font-bold text-amber-800 dark:text-amber-300">
                                I confirm this is my own original content
                              </span>
                            </label>
                          </div>
                        </div>
                      </div>
                    )}

                    {contentValidation.hasAiPhraseWarning && (
                      <div className="mt-3 p-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-500 text-sm">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <div className="font-bold text-red-800 dark:text-red-300 mb-1">AI-STYLE PHRASES DETECTED</div>
                            <div className="text-red-700 dark:text-red-400 text-xs mb-2">
                              Your content contains phrases commonly associated with AI-generated text:
                              <span className="block mt-1 font-mono text-xs bg-red-100 dark:bg-red-900/30 p-2 rounded">
                                {contentValidation.aiPhraseMatches.slice(0, 5).map(p => `"${p}"`).join(', ')}
                                {contentValidation.aiPhraseMatches.length > 5 && ` (+${contentValidation.aiPhraseMatches.length - 5} more)`}
                              </span>
                              <span className="block mt-2 font-bold">Our Terms of Service require original, human-created content. We screen all text and media for AI.</span>
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={contentValidation.aiPhraseAcknowledged}
                                onChange={() => contentValidationActions.acknowledgeAiPhrases()}
                                className="w-4 h-4 border-2 border-red-500 accent-red-600"
                              />
                              <span className="text-xs font-bold text-red-800 dark:text-red-300">
                                I confirm this is my own original writing, not AI-generated
                              </span>
                            </label>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-2 text-[#202020] dark:text-[#e5e5e5]">
                      MEDIA ATTACHMENTS
                      <span className="text-[#616161] dark:text-[#b5bcc4] ml-1">({uploadedMedia.length}/{mediaLimit} photos)</span>
                    </label>

                    {/* Consolidated Media Info */}
                    <div className="mb-3 p-3 bg-[#f5f5f5] dark:bg-[#2a2a2a] border-l-2 border-[#4676ac] text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[#616161] dark:text-[#b5bcc4]">
                          {isPro ? 'Pro: up to 10 photos' : 'Basic: up to 2 photos'}
                          {!isPro && (
                            <Link href="/settings/billing" className="text-[#ac6d46] hover:underline ml-1">
                              (Upgrade)
                            </Link>
                          )}
                        </span>
                        {uploadedMedia.length > 0 && (
                          <span className="text-[#616161] dark:text-[#b5bcc4]">
                            <Camera size={12} className="inline mr-1" />
                            {coverPhotoId ? 'Cover set' : 'No cover'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Uploaded Media Grid */}
                    {uploadedMedia.length > 0 && (
                      <div className="mb-3 grid grid-cols-1 gap-2">
                        {uploadedMedia.map((media) => (
                          <div
                            key={media.id}
                            className={`p-2 border ${
                              media.exifResult?.isSuspicious && !imageWarnings[media.id]
                                ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-900/10'
                                : coverPhotoId === media.id
                                ? 'border-[#ac6d46] bg-[#fff7f0] dark:bg-[#2a2420]'
                                : 'border-[#b5bcc4] dark:border-[#3a3a3a] bg-[#f5f5f5] dark:bg-[#2a2a2a]'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              {/* Thumbnail */}
                              {media.thumbnail ? (
                                <Image
                                  src={media.thumbnail}
                                  alt={media.name}
                                  className="w-12 h-12 sm:w-16 sm:h-16 object-cover border border-[#b5bcc4] dark:border-[#3a3a3a] flex-shrink-0"
                                  width={64}
                                  height={64}
                                />
                              ) : (
                                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-[#e5e5e5] dark:bg-[#3a3a3a] flex items-center justify-center flex-shrink-0">
                                  <ImageIcon size={24} className="text-[#616161]" />
                                </div>
                              )}

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-bold dark:text-[#e5e5e5] truncate">{media.name}</div>
                              <div className="text-xs text-[#616161] dark:text-[#b5bcc4] font-mono">
                                {(media.size / 1024 / 1024).toFixed(1)} MB
                              </div>
                              {mediaMetadata[media.id]?.caption && (
                                <div className="text-xs text-[#616161] dark:text-[#b5bcc4] truncate mt-0.5">
                                  "{mediaMetadata[media.id].caption}"
                                </div>
                              )}
                            </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1.5 sm:gap-2 mt-2 flex-wrap">
                              <button
                                type="button"
                                onClick={() => setCoverPhotoId(coverPhotoId === media.id ? null : media.id)}
                                className={`px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] ${
                                  coverPhotoId === media.id
                                    ? 'bg-[#ac6d46] text-white hover:bg-[#8a5738]'
                                    : 'border-2 border-[#ac6d46] text-[#ac6d46] hover:bg-[#ac6d46] hover:text-white'
                                }`}
                              >
                                <Camera size={14} />
                                {coverPhotoId === media.id ? 'COVER' : 'SET COVER'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setSelectedMediaForEdit(media.id)}
                                className="px-3 py-1.5 text-xs font-bold border-2 border-[#4676ac] text-[#4676ac] hover:bg-[#4676ac] hover:text-white flex items-center gap-1.5 transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#4676ac]"
                              >
                                CAPTION
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (coverPhotoId === media.id) setCoverPhotoId(null);
                                  setUploadedMedia(prev => prev.filter(m => m.id !== media.id));
                                  // Also clear the warning acknowledgment for this image
                                  setImageWarnings(prev => {
                                    const next = { ...prev };
                                    delete next[media.id];
                                    return next;
                                  });
                                }}
                                className="px-3 py-1.5 text-xs font-bold border-2 border-red-600 text-red-600 hover:bg-red-600 hover:text-white flex items-center gap-1.5 transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-red-600"
                              >
                                <X size={14} />
                                REMOVE
                              </button>
                            </div>

                            {/* EXIF Warning for potentially AI-generated image */}
                            {media.exifResult?.isSuspicious && (
                              <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-400 text-xs">
                                <div className="flex items-start gap-2">
                                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                                  <div className="flex-1">
                                    <div className="font-bold text-amber-800 dark:text-amber-300 mb-1">IMAGE AUTHENTICITY WARNING</div>
                                    <div className="text-amber-700 dark:text-amber-400 text-xs mb-2">
                                      {media.exifResult.suspiciousReasons.map((reason, idx) => (
                                        <div key={idx}>• {reason}</div>
                                      ))}
                                      <span className="block mt-1 font-bold">Our Terms of Service require original, human-created content. We screen all text and media for AI.</span>
                                    </div>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={imageWarnings[media.id] || false}
                                        onChange={() => setImageWarnings(prev => ({ ...prev, [media.id]: !prev[media.id] }))}
                                        className="w-3 h-3 border border-amber-500 accent-amber-600"
                                      />
                                      <span className="text-xs font-bold text-amber-800 dark:text-amber-300">
                                        I confirm this is an authentic photo I took myself
                                      </span>
                                    </label>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Upload Area */}
                    <label className={`block border-2 border-dashed p-4 text-center transition-all cursor-pointer ${
                      uploadedMedia.length >= mediaLimit || isUploading
                        ? 'border-[#b5bcc4] dark:border-[#3a3a3a] opacity-50 cursor-not-allowed'
                        : 'border-[#b5bcc4] dark:border-[#3a3a3a] hover:border-[#ac6d46]'
                    }`}>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleFileUpload}
                        disabled={uploadedMedia.length >= mediaLimit || isUploading}
                        className="hidden"
                      />
                      <div className="flex items-center justify-center gap-3">
                        <div className={`px-4 py-2 text-white text-sm font-bold ${
                          uploadedMedia.length >= mediaLimit || isUploading
                            ? 'bg-[#b5bcc4] cursor-not-allowed'
                            : 'bg-[#4676ac] hover:bg-[#365a87]'
                        }`}>
                          {isUploading ? (
                            <span className="flex items-center gap-2">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              UPLOADING...
                            </span>
                          ) : (
                            'ADD PHOTOS'
                          )}
                        </div>
                        <span className="text-xs text-[#616161] dark:text-[#b5bcc4] font-mono">
                          JPG, PNG, WEBP • Max 25MB
                        </span>
                      </div>
                    </label>
                  </div>
                </>
              )}

              {/* VIDEO ENTRY FIELDS */}
              {entryType === 'video' && (
                <>
                  <div>
                    <label className="block text-xs font-medium mb-2 text-[#202020] dark:text-[#e5e5e5]">
                      VIDEO URL
                      <span className="text-[#ac6d46] ml-1">*REQUIRED</span>
                    </label>
                    <input
                      type="url"
                      className="w-full px-4 py-3 border-2 border-[#b5bcc4] dark:border-[#3a3a3a] focus:border-[#ac6d46] outline-none text-sm font-mono dark:bg-[#2a2a2a] dark:text-[#e5e5e5]"
                      placeholder="https://www.youtube.com/watch?v=... or https://vimeo.com/..."
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                    />
                    <div className="mt-1 text-xs text-[#616161] dark:text-[#b5bcc4]">
                      YouTube or Vimeo links supported
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-2 text-[#202020] dark:text-[#e5e5e5]">
                      DESCRIPTION
                      <span className="text-[#ac6d46] ml-1">*REQUIRED</span>
                    </label>
                    <textarea
                      className="w-full px-4 py-3 border-2 border-[#b5bcc4] dark:border-[#3a3a3a] focus:border-[#ac6d46] outline-none text-sm font-mono leading-relaxed dark:bg-[#2a2a2a] dark:text-[#e5e5e5]"
                      rows={8}
                      placeholder={`Describe the footage and provide context...

• What is being shown in the video
• Where and when it was filmed
• Any relevant background or conditions`}
                      value={videoContent || standardContent}
                      onChange={(e) => {
                        setVideoContent(e.target.value);
                        setStandardContent(e.target.value);
                      }}
                    />
                    <div className="flex justify-between text-xs text-[#616161] dark:text-[#b5bcc4] mt-1">
                      <span className={wordCount < minWords || wordCount > 2000 ? 'text-red-600 dark:text-red-400 font-bold' : ''}>
                        Word count: {wordCount} / 2,000 {wordCount > 0 && wordCount < minWords && `(Minimum: ${minWords})`} {wordCount > 2000 && `(Maximum: 2,000)`}
                      </span>
                      <span>Character count: {(videoContent || standardContent).length} / 15,000</span>
                    </div>
                    {wordCount > 0 && (wordCount < minWords || wordCount > 2000) && (
                      <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 border-l-2 border-red-600 text-xs text-red-700 dark:text-red-400">
                        <div className="font-bold mb-1">WORD COUNT REQUIREMENT:</div>
                        {wordCount < minWords && <div>• Your entry must be at least {minWords} words. Current: {wordCount} words ({minWords - wordCount} more needed)</div>}
                        {wordCount > 2000 && <div>• Your entry must not exceed 2,000 words. Current: {wordCount} words ({wordCount - 2000} over limit)</div>}
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Privacy Settings - ALL TYPES */}
              <div className="border-2 border-[#202020] dark:border-[#616161] p-4 dark:bg-[#2a2a2a]">
                <div className="text-xs font-bold mb-3 dark:text-[#e5e5e5]">ENTRY VISIBILITY:</div>
                {expedition ? (
                  <div className="p-3 bg-[#f5f5f5] dark:bg-[#1a1a1a] border-l-4 border-[#4676ac] text-xs">
                    <strong className="text-[#202020] dark:text-[#e5e5e5]">
                      {(apiEntry?.visibility || 'public').toUpperCase()}
                    </strong>
                    <span className="text-[#616161] dark:text-[#b5bcc4]"> — derived from expedition</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <input
                        type="radio"
                        name="visibility"
                        id="vis-public"
                        className="mt-1"
                        defaultChecked={apiEntry?.visibility === 'public'}
                      />
                      <label htmlFor="vis-public" className="text-xs">
                        <strong className="text-[#202020] dark:text-[#e5e5e5]">Public:</strong>{' '}
                        <span className="text-[#616161] dark:text-[#b5bcc4]">Visible to everyone (recommended)</span>
                      </label>
                    </div>
                    <div className="flex items-start gap-2">
                      <input
                        type="radio"
                        name="visibility"
                        id="vis-offgrid"
                        className="mt-1"
                        defaultChecked={apiEntry?.visibility === 'off-grid'}
                      />
                      <label htmlFor="vis-offgrid" className="text-xs">
                        <strong className="text-[#202020] dark:text-[#e5e5e5]">Off-Grid:</strong>{' '}
                        <span className="text-[#616161] dark:text-[#b5bcc4]">Hidden from feeds and search, accessible via direct link</span>
                      </label>
                    </div>
                    <div className="flex items-start gap-2">
                      <input
                        type="radio"
                        name="visibility"
                        id="vis-private"
                        className="mt-1"
                        defaultChecked={apiEntry?.visibility === 'private'}
                      />
                      <label htmlFor="vis-private" className="text-xs">
                        <strong className="text-[#202020] dark:text-[#e5e5e5]">Private:</strong>{' '}
                        <span className="text-[#616161] dark:text-[#b5bcc4]">Only visible to you (draft mode)</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Entry Notes Settings */}
              <div className="border-2 border-[#202020] dark:border-[#616161] p-4 dark:bg-[#2a2a2a]">
                <div className="text-xs font-bold mb-3 dark:text-[#e5e5e5]">ENTRY NOTES:</div>
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    id="notes-enabled"
                    className="mt-1"
                    checked={commentsEnabled}
                    onChange={(e) => setCommentsEnabled(e.target.checked)}
                  />
                  <label htmlFor="notes-enabled" className="text-xs">
                    <strong className="text-[#202020] dark:text-[#e5e5e5]">Enable notes:</strong>{' '}
                    <span className="text-[#616161] dark:text-[#b5bcc4]">Allow explorers to leave notes on this entry</span>
                  </label>
                </div>
              </div>

              {/* Submit Error */}
              {submitError && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-600 text-red-700 dark:text-red-400 text-sm">
                  <div className="flex items-center gap-2">
                    <AlertCircle size={16} />
                    <span className="font-bold">Error:</span> {submitError}
                  </div>
                </div>
              )}

              {/* Action Buttons - ALL TYPES */}
              <div className="flex gap-3 pt-6 border-t-2 border-[#202020] dark:border-[#616161]">
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(true)}
                  className="px-4 py-3 border-2 border-[#994040] text-[#994040] hover:bg-[#994040] hover:text-white transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#994040] font-bold flex items-center gap-2 text-sm"
                >
                  <Trash2 size={16} />
                  DELETE
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-[#ac6d46] text-white font-bold hover:bg-[#8a5738] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  disabled={!isWordCountValid || isSubmitting || (contentValidation.hasWarnings && !contentValidation.allAcknowledged) || hasUnacknowledgedImageWarnings}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      UPDATING...
                    </>
                  ) : (contentValidation.hasWarnings && !contentValidation.allAcknowledged) || hasUnacknowledgedImageWarnings ? (
                    'ACKNOWLEDGE WARNINGS TO UPDATE'
                  ) : (
                    'UPDATE ENTRY'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Delete Entry Confirmation Modal */}
        {confirmingDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-[#202020]/60" onClick={() => setConfirmingDelete(false)} />
            <div className="relative w-[90%] max-w-md bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
              <div className="bg-[#994040] text-white p-4 border-b-2 border-[#202020] dark:border-[#616161] flex items-center gap-3">
                <Trash2 size={18} />
                <h3 className="text-sm font-bold">DELETE ENTRY</h3>
              </div>
              <div className="p-6">
                <p className="text-sm text-[#202020] dark:text-[#e5e5e5] mb-1">
                  Are you sure you want to delete this entry?
                </p>
                <p className="text-sm font-bold text-[#202020] dark:text-[#e5e5e5] mb-4">
                  &ldquo;{entryTitle}&rdquo;
                </p>
                <p className="text-xs text-[#616161] dark:text-[#b5bcc4] mb-6">
                  This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setConfirmingDelete(false)}
                    className="flex-1 px-4 py-2.5 border-2 border-[#202020] dark:border-[#616161] text-[#202020] dark:text-[#e5e5e5] hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] transition-all text-xs font-bold"
                  >
                    CANCEL
                  </button>
                  <button
                    onClick={handleDeleteEntry}
                    disabled={isDeleting}
                    className="flex-1 px-4 py-2.5 bg-[#994040] text-white hover:bg-[#7a3333] transition-all text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    {isDeleting ? 'DELETING...' : 'DELETE ENTRY'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Entry Status */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-4">
            <h3 className="text-xs font-bold mb-3 border-b border-[#202020] dark:border-[#616161] pb-2 dark:text-[#e5e5e5]">
              ENTRY STATUS
            </h3>
            <div className="space-y-2 text-xs">
              <div>
                <span className="text-[#616161] dark:text-[#b5bcc4]">Status:</span>
                <div className="font-bold text-[#4676ac]">
                  {apiEntry?.isDraft ? 'DRAFT' : 'PUBLISHED'}
                </div>
              </div>
              <div>
                <span className="text-[#616161] dark:text-[#b5bcc4]">Likes:</span>
                <div className="font-bold dark:text-[#e5e5e5]">{apiEntry?.likesCount ?? 0}</div>
              </div>
              <div>
                <span className="text-[#616161] dark:text-[#b5bcc4]">Comments:</span>
                <div className="font-bold dark:text-[#e5e5e5]">{apiEntry?.commentsCount ?? 0}</div>
              </div>
              <div>
                <span className="text-[#616161] dark:text-[#b5bcc4]">Bookmarks:</span>
                <div className="font-bold dark:text-[#e5e5e5]">{apiEntry?.bookmarksCount ?? 0}</div>
              </div>
            </div>
          </div>

          {/* Expedition Info */}
          {expedition && (
            <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-4">
              <h3 className="text-xs font-bold mb-3 border-b border-[#202020] dark:border-[#616161] pb-2 dark:text-[#e5e5e5]">
                EXPEDITION DETAILS
              </h3>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-[#616161] dark:text-[#b5bcc4]">Title:</span>
                  <div className="font-bold dark:text-[#e5e5e5]">{expedition.title}</div>
                </div>
                <div>
                  <span className="text-[#616161] dark:text-[#b5bcc4]">ID:</span>
                  <div className="font-mono dark:text-[#e5e5e5]">{(expedition as any).publicId || expedition.id}</div>
                </div>
                {apiEntry?.expeditionDay && (
                  <div>
                    <span className="text-[#616161] dark:text-[#b5bcc4]">Entry Day:</span>
                    <div className="font-bold dark:text-[#e5e5e5]">Day {apiEntry.expeditionDay}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Edit History */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-4">
            <h3 className="text-xs font-bold mb-3 border-b border-[#202020] dark:border-[#616161] pb-2 dark:text-[#e5e5e5]">
              EDIT HISTORY
            </h3>
            <div className="space-y-3 text-xs">
              <div className="p-2 bg-[#f5f5f5] dark:bg-[#2a2a2a] border-l-2 border-[#ac6d46]">
                <div className="flex items-center gap-1 mb-1">
                  <Clock className="w-3 h-3 text-[#ac6d46]" />
                  <span className="font-bold text-[#ac6d46]">Created</span>
                </div>
                <div className="text-[#616161] dark:text-[#b5bcc4] font-mono">
                  {formatDateTime(apiEntry?.createdAt)}
                </div>
              </div>
              <div className="text-[#616161] dark:text-[#b5bcc4]">
                <div>• Published: {formatDate(apiEntry?.createdAt)}</div>
                <div>• Last editor: {user?.username || 'You'}</div>
              </div>
            </div>
          </div>

          {/* Tips */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-4">
            <h3 className="text-xs font-bold mb-3 border-b border-[#202020] dark:border-[#616161] pb-2 dark:text-[#e5e5e5]">
              EDITING TIPS
            </h3>
            <div className="space-y-2 text-xs text-[#616161] dark:text-[#b5bcc4]">
              <div>• Sponsors and followers are not notified of edits</div>
              <div>• Major changes? Consider adding a comment explaining the update</div>
              <div>• Typo fixes and minor clarifications are normal</div>
              <div>• Original publish date is preserved</div>
              <div>• Edit history is tracked for transparency</div>
            </div>
          </div>
        </div>
      </div>

      {/* Location Map Modal - LocationMap renders its own modal wrapper */}
      {showMap && !isLinkedToWaypoint && (
        <LocationMap
          initialLat={coordinates?.lat}
          initialLng={coordinates?.lng}
          onLocationSelect={(lat, lng) => {
            setCoordinates({ lat, lng });
          }}
          onClose={() => setShowMap(false)}
          expeditionWaypoints={fullExpedition?.waypoints?.map((wp, idx) => ({
            id: String(wp.id),
            lat: wp.lat || 0,
            lng: wp.lon || 0,
            title: wp.title || `Waypoint ${idx + 1}`,
            type: idx === 0 ? 'start' as const : (idx === (fullExpedition?.waypoints?.length || 0) - 1 ? 'end' as const : 'standard' as const),
          }))}
          expeditionEntries={fullExpedition?.entries?.filter(e => e.lat && e.lon).map(e => ({
            id: e.id,
            lat: e.lat!,
            lng: e.lon!,
            title: e.title,
          }))}
          expeditionRouteGeometry={fullExpedition?.routeGeometry}
          isRoundTrip={fullExpedition?.isRoundTrip}
          currentLocationSource={fullExpedition?.currentLocationSource}
          currentLocationId={fullExpedition?.currentLocationId}
          onCompletedSegmentDrop={setMarkerOnCompletedSegment}
        />
      )}

      {/* Photo Metadata Modal */}
      {selectedMediaForEdit && (
        <div className="fixed inset-0 bg-[#202020]/90 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-6 max-w-2xl w-full">
            <div className="flex justify-between items-center mb-4 border-b-2 border-[#202020] dark:border-[#616161] pb-3">
              <h2 className="text-xl font-bold dark:text-[#e5e5e5]">PHOTO INFORMATION</h2>
              <button
                onClick={() => setSelectedMediaForEdit(null)}
                className="p-2 hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#616161]"
              >
                <X size={20} />
              </button>
            </div>
            <form className="space-y-4">
              {/* Photo Preview */}
              {(() => {
                const media = uploadedMedia.find(m => m.id === selectedMediaForEdit);
                return media ? (
                  <div>
                    {(media.url || media.thumbnail) ? (
                      <Image
                        src={media.url || media.thumbnail || ''}
                        alt={media.name}
                        className="w-full max-h-64 object-contain bg-[#f5f5f5] dark:bg-[#2a2a2a] border border-[#b5bcc4] dark:border-[#3a3a3a]"
                        width={600}
                        height={256}
                      />
                    ) : (
                      <div className="w-full h-40 bg-[#f5f5f5] dark:bg-[#2a2a2a] flex items-center justify-center border border-[#b5bcc4] dark:border-[#3a3a3a]">
                        <ImageIcon size={48} className="text-[#b5bcc4]" />
                      </div>
                    )}
                    <div className="mt-2 text-xs text-[#616161] dark:text-[#b5bcc4] font-mono truncate">
                      {media.name}
                    </div>
                  </div>
                ) : null;
              })()}

              <div>
                <label className="block text-xs font-medium mb-2 text-[#202020] dark:text-[#e5e5e5]">
                  CAPTION
                  <span className="text-[#616161] dark:text-[#b5bcc4] ml-1">(Optional)</span>
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-3 border-2 border-[#b5bcc4] dark:border-[#3a3a3a] focus:border-[#ac6d46] outline-none text-sm dark:bg-[#2a2a2a] dark:text-[#e5e5e5]"
                  placeholder="Describe what this photo shows"
                  value={mediaMetadata[selectedMediaForEdit]?.caption || ''}
                  onChange={(e) => setMediaMetadata(prev => ({
                    ...prev,
                    [selectedMediaForEdit]: {
                      ...prev[selectedMediaForEdit],
                      caption: e.target.value
                    }
                  }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-2 text-[#202020] dark:text-[#e5e5e5]">
                  ALT TEXT (for accessibility)
                  <span className="text-[#616161] dark:text-[#b5bcc4] ml-1">(Optional)</span>
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-3 border-2 border-[#b5bcc4] dark:border-[#3a3a3a] focus:border-[#ac6d46] outline-none text-sm dark:bg-[#2a2a2a] dark:text-[#e5e5e5]"
                  placeholder="Describe the image for screen readers"
                  value={mediaMetadata[selectedMediaForEdit]?.altText || ''}
                  onChange={(e) => setMediaMetadata(prev => ({
                    ...prev,
                    [selectedMediaForEdit]: {
                      ...prev[selectedMediaForEdit],
                      altText: e.target.value
                    }
                  }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-2 text-[#202020] dark:text-[#e5e5e5]">
                  PHOTO CREDIT
                  <span className="text-[#616161] dark:text-[#b5bcc4] ml-1">(Optional)</span>
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-3 border-2 border-[#b5bcc4] dark:border-[#3a3a3a] focus:border-[#ac6d46] outline-none text-sm dark:bg-[#2a2a2a] dark:text-[#e5e5e5]"
                  placeholder="Photographer name or source"
                  value={mediaMetadata[selectedMediaForEdit]?.credit || ''}
                  onChange={(e) => setMediaMetadata(prev => ({
                    ...prev,
                    [selectedMediaForEdit]: {
                      ...prev[selectedMediaForEdit],
                      credit: e.target.value
                    }
                  }))}
                />
              </div>
              <button
                type="button"
                onClick={() => setSelectedMediaForEdit(null)}
                className="w-full py-3 bg-[#ac6d46] text-white font-bold hover:bg-[#8a5738] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46]"
              >
                SAVE PHOTO INFO
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}