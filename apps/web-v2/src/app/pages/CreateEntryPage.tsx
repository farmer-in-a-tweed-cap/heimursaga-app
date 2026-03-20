'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname, useParams } from 'next/navigation';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useDistanceUnit } from '@/app/context/DistanceUnitContext';
import { useProFeatures } from '@/app/hooks/useProFeatures';
import { LocationMap } from '@/app/components/LocationMap';
import { WaypointSelectorMap } from '@/app/components/WaypointSelectorMap';
import { DatePicker } from '@/app/components/DatePicker';
import { X, Image as ImageIcon, Lock, Camera, Loader2, Clock, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { entryApi, expeditionApi, uploadApi, type Expedition, type Entry } from '@/app/services/api';
import { formatDateTime } from '@/app/utils/dateFormat';
import { useContentValidation } from '@/app/hooks/useContentValidation';
import { checkImageExif, type ExifResult } from '@/app/utils/exifCheck';
import { projectToSegment } from '@/app/utils/routeSnapping';

export function CreateEntryPage() {
  const { isAuthenticated } = useAuth();
  const { distanceLabel, speedLabel } = useDistanceUnit();
  const { isPro } = useProFeatures();
  const { expeditionId } = useParams<{ expeditionId: string }>();
  const router = useRouter();
  const pathname = usePathname();

  // Check if this is a standalone entry
  const isStandalone = expeditionId === 'standalone';

  // ALL HOOKS MUST BE DECLARED BEFORE ANY CONDITIONAL RETURNS
  const [entryType, setEntryType] = useState<'standard' | 'photo' | 'video' | 'data'>('standard');
  const [showMap, setShowMap] = useState(false);
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedWaypointId, setSelectedWaypointId] = useState<string | null>(null);
  const [waypointMode, setWaypointMode] = useState<'existing' | 'new' | null>(null);
  const [newWaypointCoords, setNewWaypointCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [newWaypointSequence, setNewWaypointSequence] = useState<number>(0);
  const [showWaypointSelector, setShowWaypointSelector] = useState(false);
  const shouldAutoCreateWaypoint = !isStandalone && !isPro;
  const [entryDate, setEntryDate] = useState('');
  const [entryTime, setEntryTime] = useState('');
  const [entryLocation, setEntryLocation] = useState('');
  const [markerOnCompletedSegment, setMarkerOnCompletedSegment] = useState(false);

  // Media upload state
  const [uploadedMedia, setUploadedMedia] = useState<Array<{ id: string; name: string; type: string; size: number; url: string; thumbnail: string; exifResult?: ExifResult }>>([]);
  const [isUploading, setIsUploading] = useState(false);
  const mediaLimit = entryType === 'video' ? 0 : isPro ? (entryType === 'photo' ? 10 : 5) : 2;
  const [selectedMediaForEdit, setSelectedMediaForEdit] = useState<string | null>(null);
  const [mediaMetadata, setMediaMetadata] = useState<Record<string, { caption: string; altText: string; credit: string }>>({});
  const [coverPhotoId, setCoverPhotoId] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<'public' | 'off-grid' | 'private'>('public');
  const [isMilestone, setIsMilestone] = useState(false);
  const [commentsEnabled, setCommentsEnabled] = useState(true);
  const [, setSubmitError] = useState<string | null>(null);
  const [, setDraftCheckComplete] = useState(false);

  // Notification state for entry type restrictions
  const [entryTypeNotification, setEntryTypeNotification] = useState<{ type: 'pro'; message: string } | null>(null);

  // Content state for word count validation
  const [standardContent, setStandardContent] = useState('');
  const [photoContent, setPhotoContent] = useState('');
  const [videoContent, setVideoContent] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [dataContent, setDataContent] = useState('');
  const [entryTitle, setEntryTitle] = useState('');

  // Standard metadata state — commented out until display is implemented
  // const [stdWeather, setStdWeather] = useState('');
  // const [stdDistanceTraveled, setStdDistanceTraveled] = useState('');
  // const [stdMood, setStdMood] = useState('');
  // const [stdExpenses, setStdExpenses] = useState('');

  // Data-log metadata state
  const [dlTemperature, setDlTemperature] = useState('');
  const [dlHumidity, setDlHumidity] = useState('');
  const [dlWindSpeed, setDlWindSpeed] = useState('');
  const [dlPressure, setDlPressure] = useState('');
  const [dlDistanceCovered, setDlDistanceCovered] = useState('');
  const [dlElevationGain, setDlElevationGain] = useState('');
  const [dlDuration, setDlDuration] = useState('');
  const [dlAvgSpeed, setDlAvgSpeed] = useState('');

  // API state
  const [expedition, setExpedition] = useState<Expedition | null>(null);
  const [expeditionLoading, setExpeditionLoading] = useState(!isStandalone);
  const [expeditionError, setExpeditionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPlanningModal, setShowPlanningModal] = useState(false);
  const pendingSubmitRef = useRef<React.FormEvent | null>(null);

  // Date range for the date picker: expedition start/creation date → end date or today
  const { dateMin, dateMax } = useMemo(() => {
    const d = new Date();
    const todayLocal = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    // For historical expeditions (end date in the past), use expedition start date as min
    const endDate = expedition?.endDate ? expedition.endDate.slice(0, 10) : null;
    const isHistorical = endDate && endDate < todayLocal;
    const startDate = expedition?.startDate ? expedition.startDate.slice(0, 10) : null;
    const created = expedition?.createdAt ? expedition.createdAt.slice(0, 10) : todayLocal;
    const min = isHistorical && startDate ? startDate : (created <= todayLocal ? created : todayLocal);
    // Cap max date at endDate for completed expeditions
    let max = todayLocal;
    if (expedition?.status === 'completed' && endDate && endDate < todayLocal) {
      max = endDate;
    }
    return { dateMin: min, dateMax: max };
  }, [expedition?.createdAt, expedition?.startDate, expedition?.status, expedition?.endDate]);

  // Auto-save state
  const [draftId, setDraftId] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const lastSavedContentRef = useRef<string>('');
  const isAutoSavingRef = useRef(false);
  const isSubmittingRef = useRef(false);

  // AI content detection
  const [contentValidation, contentValidationActions] = useContentValidation();
  const [imageWarnings, setImageWarnings] = useState<Record<string, boolean>>({}); // mediaId -> acknowledged
  const hasUnacknowledgedImageWarnings = uploadedMedia.some(
    m => m.exifResult?.isSuspicious && !imageWarnings[m.id]
  );

  // Draft recovery state
  const [existingDraft, setExistingDraft] = useState<Entry | null>(null);
  const [showDraftPrompt, setShowDraftPrompt] = useState(false);

  // Fetch expedition data from API
  useEffect(() => {
    const fetchData = async () => {
      if (!expeditionId || isStandalone) {
        setExpeditionLoading(false);
        return;
      }

      setExpeditionLoading(true);
      setExpeditionError(null);

      try {
        const data = await expeditionApi.getById(expeditionId);
        setExpedition(data);
      } catch {
        setExpeditionError('Failed to load expedition details');
      } finally {
        setExpeditionLoading(false);
      }
    };
    fetchData();
  }, [expeditionId, isStandalone]);

  // Check for existing drafts on mount
  useEffect(() => {
    const checkForDrafts = async () => {
      try {
        const response = await entryApi.getDrafts();
        const drafts = response.data || [];

        // Find a draft matching this expedition (or standalone)
        const matchingDraft = drafts.find(draft => {
          if (isStandalone) {
            // For standalone, find drafts with no expedition
            return !draft.expedition && !draft.trip;
          } else {
            // For expedition entries, match by expedition ID
            const draftExpId = draft.expedition?.id || draft.expedition?.publicId || draft.trip?.id;
            return draftExpId === expeditionId || draftExpId === expedition?.publicId;
          }
        });

        if (matchingDraft) {
          setExistingDraft(matchingDraft);
          setShowDraftPrompt(true);
        }
      } catch (err) {
        console.error('Error checking for drafts:', err);
        // Silent fail - just proceed without draft recovery
      } finally {
        setDraftCheckComplete(true);
      }
    };

    // Only check after expedition is loaded (or immediately for standalone)
    if (isStandalone || expedition) {
      checkForDrafts();
    }
  }, [expeditionId, isStandalone, expedition]);

  // Load draft data into form
  const loadDraft = (draft: Entry) => {
    setDraftId(draft.id);
    setEntryTitle(draft.title || '');
    const draftType = draft.entryType === 'waypoint' ? 'standard' : (draft.entryType || 'standard');
    setEntryType(draftType as 'standard' | 'photo' | 'video' | 'data');
    // Load content into the correct field based on entry type
    if (draftType === 'photo') {
      setPhotoContent(draft.content || '');
    } else if (draftType === 'video') {
      setVideoContent(draft.content || '');
      if (draft.metadata && typeof draft.metadata === 'object') {
        const meta = draft.metadata as Record<string, any>;
        if (meta.videoUrl) setVideoUrl(meta.videoUrl);
      }
    } else if (draftType === 'data') {
      setDataContent(draft.content || '');
    } else {
      setStandardContent(draft.content || '');
    }
    setEntryLocation(draft.place || '');

    if (draft.lat && draft.lon) {
      setCoordinates({ lat: draft.lat, lng: draft.lon });
    }

    if (draft.date) {
      const dateObj = new Date(draft.date);
      setEntryDate(dateObj.toISOString().split('T')[0]);
    }

    // Load metadata if present
    if (draft.metadata) {
      const meta = draft.metadata as Record<string, unknown>;
      // Standard metadata draft loading — commented out until display is implemented
      // if (draftType === 'standard') {
      //   setStdWeather(String(meta.weather || ''));
      //   setStdDistanceTraveled(meta.distanceTraveled != null ? String(meta.distanceTraveled) : '');
      //   setStdMood(String(meta.mood || ''));
      //   setStdExpenses(meta.expenses != null ? String(meta.expenses) : '');
      // } else
      if (draftType === 'data') {
        setDlTemperature(meta.temperature != null ? String(meta.temperature) : '');
        setDlHumidity(meta.humidity != null ? String(meta.humidity) : '');
        setDlWindSpeed(meta.windSpeed != null ? String(meta.windSpeed) : '');
        setDlPressure(meta.pressure != null ? String(meta.pressure) : '');
        setDlDistanceCovered(meta.distanceCovered != null ? String(meta.distanceCovered) : '');
        setDlElevationGain(meta.elevationGain != null ? String(meta.elevationGain) : '');
        setDlDuration(meta.duration != null ? String(meta.duration) : '');
        setDlAvgSpeed(meta.avgSpeed != null ? String(meta.avgSpeed) : '');
      }
    }

    // Load media if present
    if (draft.media && draft.media.length > 0) {
      const mappedMedia = draft.media.map((m, idx) => ({
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
      draft.media.forEach((m, idx) => {
        const mediaId = m.id || `media-${idx}`;
        metadata[mediaId] = {
          caption: m.caption || '',
          altText: m.altText || '',
          credit: m.credit || '',
        };
      });
      setMediaMetadata(metadata);
    }

    // Update the content signature so auto-save doesn't immediately trigger
    // Must match the format used in performAutoSave
    const draftMetadataStr = JSON.stringify(draft.metadata || '');
    const draftMediaIds = draft.media ? draft.media.map(m => m.id || '').join(',') : '';
    const draftCaptionsStr = draft.media ? JSON.stringify(
      Object.fromEntries(draft.media.map((m, idx) => [m.id || `media-${idx}`, { caption: m.caption || '', altText: m.altText || '', credit: m.credit || '' }]))
    ) : JSON.stringify({});
    const draftCoverPhotoId = '';
    const contentSignature = `${draft.title || ''}|${draft.content || ''}|${draft.place || ''}|${draft.lat}|${draft.lon}|${draftMetadataStr}|${draftType}|${draftMediaIds}|${draftCaptionsStr}|${draftCoverPhotoId}|${draft.visibility || 'public'}`;
    lastSavedContentRef.current = contentSignature;
    setLastSaved(new Date(draft.createdAt || Date.now()));

    setShowDraftPrompt(false);
  };

  // Dismiss draft and start fresh
  const dismissDraft = () => {
    setShowDraftPrompt(false);
    setExistingDraft(null);
  };

  // Get current content based on entry type
  const getCurrentContent = useCallback(() => {
    switch (entryType) {
      case 'standard': return standardContent;
      case 'photo': return photoContent;
      case 'video': return videoContent;
      case 'data': return dataContent;
      default: return '';
    }
  }, [entryType, standardContent, photoContent, videoContent, dataContent]);

  // Build metadata for current entry type
  const buildMetadata = useCallback(() => {
    // Standard metadata — commented out until display is implemented
    // if (entryType === 'standard') {
    //   const meta: Record<string, unknown> = {};
    //   if (stdWeather) meta.weather = stdWeather;
    //   if (stdDistanceTraveled) meta.distanceTraveled = parseFloat(stdDistanceTraveled);
    //   if (stdMood && stdMood !== 'Not specified') meta.mood = stdMood;
    //   if (stdExpenses) meta.expenses = parseFloat(stdExpenses);
    //   return Object.keys(meta).length > 0 ? meta : undefined;
    // }
    if (entryType === 'video') {
      if (videoUrl) return { videoUrl };
      return undefined;
    }
    if (entryType === 'data') {
      const meta: Record<string, unknown> = {};
      if (dlTemperature) meta.temperature = parseFloat(dlTemperature);
      if (dlHumidity) meta.humidity = parseFloat(dlHumidity);
      if (dlWindSpeed) meta.windSpeed = parseFloat(dlWindSpeed);
      if (dlPressure) meta.pressure = parseFloat(dlPressure);
      if (dlDistanceCovered) meta.distanceCovered = parseFloat(dlDistanceCovered);
      if (dlElevationGain) meta.elevationGain = parseFloat(dlElevationGain);
      if (dlDuration) meta.duration = parseFloat(dlDuration);
      if (dlAvgSpeed) meta.avgSpeed = parseFloat(dlAvgSpeed);
      return Object.keys(meta).length > 0 ? meta : undefined;
    }
    return undefined;
  }, [entryType, videoUrl, dlTemperature, dlHumidity, dlWindSpeed, dlPressure, dlDistanceCovered, dlElevationGain, dlDuration, dlAvgSpeed]);

  // Build payload for saving
  const buildSavePayload = useCallback((isDraft: boolean) => {
    const uploadCaptions: Record<string, string> = {};
    const uploadAltTexts: Record<string, string> = {};
    const uploadCredits: Record<string, string> = {};

    uploadedMedia.forEach(media => {
      const meta = mediaMetadata[media.id];
      if (meta?.caption) uploadCaptions[media.id] = meta.caption;
      if (meta?.altText) uploadAltTexts[media.id] = meta.altText;
      if (meta?.credit) uploadCredits[media.id] = meta.credit;
    });

    return {
      title: entryTitle,
      content: getCurrentContent(),
      expeditionId: isStandalone ? undefined : (expedition?.publicId || expeditionId),
      lat: coordinates?.lat,
      lon: coordinates?.lng,
      date: entryDate ? `${entryDate}T${entryTime || '00:00'}:00.000Z` : undefined,
      place: entryLocation,
      public: visibility === 'public',
      isDraft,
      commentsEnabled,
      waypointId: selectedWaypointId ? parseInt(selectedWaypointId) : undefined,
      uploads: uploadedMedia.length > 0 ? uploadedMedia.map(m => m.id) : undefined,
      uploadCaptions: Object.keys(uploadCaptions).length > 0 ? uploadCaptions : undefined,
      uploadAltTexts: Object.keys(uploadAltTexts).length > 0 ? uploadAltTexts : undefined,
      uploadCredits: Object.keys(uploadCredits).length > 0 ? uploadCredits : undefined,
      entryType,
      coverUploadId: coverPhotoId || undefined,
      isMilestone,
      visibility,
      metadata: buildMetadata(),
    };
  }, [entryTitle, getCurrentContent, isStandalone, expedition?.publicId, expeditionId, coordinates, entryDate, entryLocation, visibility, selectedWaypointId, uploadedMedia, mediaMetadata, entryType, coverPhotoId, isMilestone, commentsEnabled, buildMetadata]);

  // Auto-save function
  const performAutoSave = useCallback(async () => {
    const content = getCurrentContent();
    const metadataStr = JSON.stringify(buildMetadata() || '');
    const mediaIds = uploadedMedia.map(m => m.id).join(',');
    const captionsStr = JSON.stringify(mediaMetadata);
    const contentSignature = `${entryTitle}|${content}|${entryLocation}|${coordinates?.lat}|${coordinates?.lng}|${metadataStr}|${entryType}|${mediaIds}|${captionsStr}|${coverPhotoId}|${visibility}`;

    // Skip if no meaningful content or no changes
    if (!entryTitle && !content && uploadedMedia.length === 0) return;
    if (contentSignature === lastSavedContentRef.current) return;

    setIsAutoSaving(true);
    isAutoSavingRef.current = true;
    try {
      const payload = buildSavePayload(true);

      if (draftId) {
        // Update existing draft
        await entryApi.update(draftId, payload);
      } else {
        // Create new draft
        const result = await entryApi.create(payload);
        if (result?.id) {
          setDraftId(result.id);
        }
      }

      lastSavedContentRef.current = contentSignature;
      setLastSaved(new Date());
    } catch (err) {
      console.error('Auto-save failed:', err);
      // Silent fail for auto-save - don't disrupt user
    } finally {
      setIsAutoSaving(false);
      isAutoSavingRef.current = false;
    }
  }, [entryTitle, getCurrentContent, entryLocation, coordinates, buildSavePayload, draftId, buildMetadata, uploadedMedia, mediaMetadata, coverPhotoId, entryType, visibility]);

  // Auto-save interval (every 30 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isSubmittingRef.current && !isAutoSavingRef.current) {
        performAutoSave();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [performAutoSave]);

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
        // Check EXIF data for AI detection
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
      } catch (err) {
        console.error('Error uploading file:', err);
        // Continue with other files even if one fails
      }
    }

    setIsUploading(false);
    // Reset the input
    e.target.value = '';
  };

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
  const minWords = entryType === 'standard' ? 200 : 50;
  const isWordCountValid = wordCount >= minWords && wordCount <= 2000;

  // Calculate days active (use end date for completed expeditions)
  const calculateDaysActive = (startDate?: string, endDate?: string, status?: string): number => {
    if (!startDate) return 0;
    const start = new Date(startDate);
    const end = status === 'completed' && endDate ? new Date(endDate) : new Date();
    return Math.max(1, Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  };

  // Authentication gate - MUST be after all hooks
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
              You must be logged in to create journal entries. Please log in or register to document your expeditions.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => router.push('/auth?redirect=' + pathname)}
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

  // Handle confirming publish to a planned expedition
  const handlePlanningActivate = async () => {
    setShowPlanningModal(false);
    try {
      const expId = expedition?.publicId || expeditionId;
      if (!expedition?.title) {
        toast.error('Expedition data not loaded');
        return;
      }
      await expeditionApi.activate(expId, expedition.title);
      // Refresh expedition state
      const refreshed = await expeditionApi.getById(expId);
      setExpedition(refreshed);
      toast.success('Expedition activated');
    } catch {
      toast.error('Failed to activate expedition');
      return;
    }
    // Continue with the original publish
    if (pendingSubmitRef.current) {
      await doSubmit(pendingSubmitRef.current, false);
      pendingSubmitRef.current = null;
    }
  };

  const handlePlanningKeep = async () => {
    setShowPlanningModal(false);
    // Continue with publish — backend will flag with loggedDuringPlanning
    if (pendingSubmitRef.current) {
      await doSubmit(pendingSubmitRef.current, false);
      pendingSubmitRef.current = null;
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent, isDraft = false) => {
    e.preventDefault();

    // If publishing to a planned expedition, show confirmation modal first
    if (!isDraft && expedition?.status === 'planned') {
      pendingSubmitRef.current = e;
      setShowPlanningModal(true);
      return;
    }

    await doSubmit(e, isDraft);
  };

  const doSubmit = async (e: React.FormEvent, isDraft = false) => {
    setSubmitError(null);

    // --- Form validation (toast notifications) ---
    if (!isDraft) {
      const errors: string[] = [];

      if (!entryTitle.trim()) {
        errors.push('Entry title is required');
      }
      if (!entryDate) {
        errors.push('Entry date is required');
      }
      if (!entryLocation.trim()) {
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
      if (isPro && !isStandalone && !selectedWaypointId && waypointMode !== 'new') {
        errors.push('Please select a waypoint or create a new one');
      }

      if (errors.length > 0) {
        errors.forEach(msg => toast.error(msg));
        return;
      }
    }

    setIsSubmitting(true);
    isSubmittingRef.current = true;

    try {

      // Deferred waypoint creation — only on publish, not drafts
      let resolvedWaypointId: number | undefined = selectedWaypointId ? parseInt(selectedWaypointId) : undefined;

      if (!isDraft && !isStandalone && expedition) {
        if (waypointMode === 'new' && newWaypointCoords) {
          // Pro user chose "New Waypoint" on map — create it now
          const expId = expedition.publicId || expeditionId;
          const wpResult = await expeditionApi.createWaypoint(expId, {
            title: entryTitle || 'Waypoint',
            lat: newWaypointCoords.lat,
            lon: newWaypointCoords.lng,
            date: entryDate || undefined,
            sequence: newWaypointSequence,
          });
          resolvedWaypointId = wpResult.waypointId;
        } else if (shouldAutoCreateWaypoint && coordinates && !resolvedWaypointId) {
          // Regular user — auto-create waypoint behind the scenes
          const sequence = computeInsertionSequence(coordinates);
          const expId = expedition.publicId || expeditionId;
          const wpResult = await expeditionApi.createWaypoint(expId, {
            title: entryTitle || 'Waypoint',
            lat: coordinates.lat,
            lon: coordinates.lng,
            date: entryDate || undefined,
            sequence,
          });
          resolvedWaypointId = wpResult.waypointId;
        }
      }

      const payload = {
        ...buildSavePayload(isDraft),
        waypointId: resolvedWaypointId,
      };
      let resultId: string | undefined;

      if (draftId) {
        // Update existing draft
        await entryApi.update(draftId, payload);
        resultId = draftId;
      } else {
        // Create new entry
        const result = await entryApi.create(payload);
        resultId = result?.id;
      }

      // Navigate to the entry detail page
      if (resultId) {
        router.push(`/entry/${resultId}`);
      } else {
        router.push(isStandalone ? '/entries' : `/expedition/${expeditionId}`);
      }
    } catch (err: any) {
      const msg = err.message || 'Failed to create entry';
      toast.error(msg);
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
      isSubmittingRef.current = false;
    }
  };

  // Handle selecting an existing waypoint from the visual selector
  const handleSelectExistingWaypoint = (waypointId: string, coords: { lat: number; lng: number }) => {
    setSelectedWaypointId(waypointId);
    setWaypointMode('existing');
    setNewWaypointCoords(null);
    setCoordinates(coords);
    const waypoint = expedition?.waypoints?.find(wp => String(wp.id) === waypointId);
    if (waypoint) {
      if (!entryTitle && waypoint.title) setEntryTitle(waypoint.title);
      if (waypoint.date) setEntryDate(typeof waypoint.date === 'string' ? waypoint.date : new Date(waypoint.date).toISOString().split('T')[0]);
    }
    setShowWaypointSelector(false);
  };

  // Handle placing a new waypoint on the visual selector map
  const handleSelectNewWaypoint = (coords: { lat: number; lng: number }, sequence: number) => {
    setSelectedWaypointId(null);
    setWaypointMode('new');
    setNewWaypointCoords(coords);
    setNewWaypointSequence(sequence);
    setCoordinates(coords);
    setShowWaypointSelector(false);
  };

  // Compute insertion sequence for auto-created waypoints (regular users)
  const computeInsertionSequence = (coords: { lat: number; lng: number }): number => {
    const waypoints = expedition?.waypoints?.filter(wp => wp.lat && wp.lon) || [];
    if (waypoints.length < 2) return waypoints.length;
    let bestSeg = 0;
    let bestDist = Infinity;
    for (let i = 0; i < waypoints.length - 1; i++) {
      const { distSq } = projectToSegment(
        coords,
        { lat: waypoints[i].lat!, lng: waypoints[i].lon! },
        { lat: waypoints[i + 1].lat!, lng: waypoints[i + 1].lon! },
      );
      if (distSq < bestDist) { bestDist = distSq; bestSeg = i; }
    }
    return (waypoints[bestSeg].sequence ?? bestSeg) + 1;
  };

  // Get the selected waypoint's title for display
  const selectedWaypointTitle = selectedWaypointId
    ? expedition?.waypoints?.find(wp => String(wp.id) === selectedWaypointId)?.title || 'Waypoint'
    : waypointMode === 'new' ? 'New Waypoint' : null;

  // Show loading state when fetching expedition
  if (!isStandalone && expeditionLoading) {
    return (
      <div className="max-w-[1600px] mx-auto px-6 py-12">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-[#ac6d46]" />
          <span className="ml-3 text-[#616161]">Loading expedition...</span>
        </div>
      </div>
    );
  }

  // Show error state when expedition not found
  if (!isStandalone && expeditionError) {
    return (
      <div className="max-w-[1600px] mx-auto px-6 py-12">
        <div className="bg-white dark:bg-[#202020] border-2 border-[#ac6d46] p-8 text-center">
          <X className="w-12 h-12 text-[#ac6d46] mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2 dark:text-white">Expedition Not Found</h2>
          <p className="text-[#616161] mb-4">{expeditionError}</p>
          <Link
            href="/select-expedition"
            className="inline-block px-6 py-2 bg-[#ac6d46] text-white font-bold hover:bg-[#8a5738] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46]"
          >
            Back to Expeditions
          </Link>
        </div>
      </div>
    );
  }

  // Block new entries on cancelled expeditions
  if (!isStandalone && expedition?.status === 'cancelled') {
    return (
      <div className="max-w-[1600px] mx-auto px-6 py-12">
        <div className="bg-white dark:bg-[#202020] border-2 border-[#994040] p-8 text-center">
          <X className="w-12 h-12 text-[#994040] mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2 dark:text-white">Expedition Cancelled</h2>
          <p className="text-[#616161] dark:text-[#b5bcc4] mb-4">This expedition has been cancelled. No new entries can be logged and existing entries cannot be edited.</p>
          <Link
            href={`/expedition/${expeditionId}`}
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
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4 border-b-2 border-[#202020] dark:border-[#616161] pb-2">
          <div>
            <h1 className="text-xl md:text-2xl font-bold dark:text-[#e5e5e5]">
              {isStandalone ? 'CREATE STANDALONE ENTRY' : 'CREATE JOURNAL ENTRY'}
            </h1>
            <div className="text-sm text-[#616161] dark:text-[#b5bcc4] mt-1">
              {isStandalone ? (
                <>
                  <span className="text-[#616161] font-bold">STANDALONE ENTRY</span> • Not associated with any expedition
                </>
              ) : expeditionLoading ? (
                <>Loading expedition...</>
              ) : expedition ? (
                <>
                  Expedition: <span className="text-[#ac6d46] font-bold">{expedition.title}</span> • Day {calculateDaysActive(expedition.startDate, expedition.endDate, expedition.status)}
                </>
              ) : (
                <>Expedition not found</>
              )}
            </div>
          </div>
          <Link
            href="/select-expedition"
            className="px-4 py-2 border-2 border-[#202020] dark:border-[#616161] dark:text-[#e5e5e5] hover:bg-[#95a2aa] dark:hover:bg-[#4a4a4a] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#616161] text-sm"
          >
            ← BACK TO EXPEDITIONS
          </Link>
        </div>
        
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-[#616161] dark:text-[#b5bcc4] font-mono">
          <span>{formatDateTime(new Date())}</span>
          {isStandalone ? (
            <span>Standalone entry</span>
          ) : expedition ? (
            <span>ID: {expedition.publicId || expeditionId}</span>
          ) : null}
          <span className="text-[#4676ac]">
            {isAutoSaving ? 'Saving...' : lastSaved ? `Auto-saved ${lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Auto-save on'}
          </span>
        </div>
      </div>

      {/* Draft Recovery Prompt */}
      {showDraftPrompt && existingDraft && (
        <div className="bg-[#fff7f0] dark:bg-[#2a2420] border-2 border-[#ac6d46] p-4 mb-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
            <div className="flex-1">
              <div className="text-sm font-bold text-[#202020] dark:text-[#e5e5e5] mb-1">
                DRAFT FOUND
              </div>
              <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">
                You have an unsaved draft{existingDraft.title ? `: "${existingDraft.title}"` : ''} from {formatDateTime(existingDraft.createdAt)}.
                Would you like to continue editing it?
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0 w-full md:w-auto">
              <button
                type="button"
                onClick={() => loadDraft(existingDraft)}
                className="px-4 py-2 bg-[#ac6d46] text-white text-xs font-bold hover:bg-[#8a5738] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46]"
              >
                CONTINUE DRAFT
              </button>
              <button
                type="button"
                onClick={dismissDraft}
                className="px-4 py-2 border-2 border-[#616161] text-[#616161] dark:text-[#b5bcc4] text-xs font-bold hover:bg-[#616161] hover:text-white transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#616161]"
              >
                START FRESH
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - Entry Form */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-6">
            {/* Entry Type Selector */}
            <div className="mb-6">
              <label className="block text-xs font-medium mb-3 text-[#202020] dark:text-[#e5e5e5]">
                ENTRY TYPE
                <span className="text-[#ac6d46] ml-1">*REQUIRED</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                <button
                  type="button"
                  onClick={() => setEntryType('standard')}
                  className={`py-2 text-xs font-bold transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] ${
                    entryType === 'standard'
                      ? 'bg-[#ac6d46] text-white border-2 border-[#ac6d46]'
                      : 'border-2 border-[#b5bcc4] dark:border-[#3a3a3a] dark:text-[#e5e5e5] hover:border-[#ac6d46]'
                  }`}
                >
                  STANDARD
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!isPro) {
                      setEntryTypeNotification({
                        type: 'pro',
                        message: 'Photo entries are an Explorer Pro feature. Upgrade to Explorer Pro to create photo entries with visual storytelling and image galleries.'
                      });
                      return;
                    }
                    setEntryType('photo');
                  }}
                  className={`py-2 text-xs font-bold transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] flex items-center justify-center gap-1 ${
                    entryType === 'photo'
                      ? 'bg-[#ac6d46] text-white border-2 border-[#ac6d46]'
                      : !isPro
                      ? 'border-2 border-[#b5bcc4] dark:border-[#3a3a3a] dark:text-[#b5bcc4] opacity-60 cursor-not-allowed'
                      : 'border-2 border-[#b5bcc4] dark:border-[#3a3a3a] dark:text-[#e5e5e5] hover:border-[#ac6d46]'
                  }`}
                >
                  PHOTO
                  {!isPro && <span className="text-xs text-[#ac6d46]">PRO</span>}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!isPro) {
                      setEntryTypeNotification({
                        type: 'pro',
                        message: 'Video entries are an Explorer Pro feature. Upgrade to Explorer Pro to create video entries with embedded footage.'
                      });
                      return;
                    }
                    setEntryType('video');
                  }}
                  className={`py-2 text-xs font-bold transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] flex items-center justify-center gap-1 ${
                    entryType === 'video'
                      ? 'bg-[#ac6d46] text-white border-2 border-[#ac6d46]'
                      : !isPro
                      ? 'border-2 border-[#b5bcc4] dark:border-[#3a3a3a] dark:text-[#b5bcc4] opacity-60 cursor-not-allowed'
                      : 'border-2 border-[#b5bcc4] dark:border-[#3a3a3a] dark:text-[#e5e5e5] hover:border-[#ac6d46]'
                  }`}
                >
                  VIDEO
                  {!isPro && <span className="text-xs text-[#ac6d46]">PRO</span>}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!isPro) {
                      setEntryTypeNotification({
                        type: 'pro',
                        message: 'Data entries are an Explorer Pro feature. Upgrade to Explorer Pro to create technical data entries with environmental and activity metrics.'
                      });
                      return;
                    }
                    setEntryType('data');
                  }}
                  className={`py-2 text-xs font-bold transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] flex items-center justify-center gap-1 ${
                    entryType === 'data'
                      ? 'bg-[#ac6d46] text-white border-2 border-[#ac6d46]'
                      : !isPro
                      ? 'border-2 border-[#b5bcc4] dark:border-[#3a3a3a] dark:text-[#b5bcc4] opacity-60 cursor-not-allowed'
                      : 'border-2 border-[#b5bcc4] dark:border-[#3a3a3a] dark:text-[#e5e5e5] hover:border-[#ac6d46]'
                  }`}
                >
                  DATA
                  {!isPro && <span className="text-xs text-[#ac6d46]">PRO</span>}
                </button>
              </div>
              
              {/* Entry Type Descriptions */}
              <div className="mt-3 p-3 bg-[#f5f5f5] dark:bg-[#2a2a2a] border-l-2 border-[#4676ac] text-xs text-[#616161] dark:text-[#b5bcc4]">
                {entryType === 'standard' && (
                  <div><strong className="text-[#202020] dark:text-[#e5e5e5]">Standard Entry:</strong> Traditional journal format with text, photos, and rich media. Best for daily updates and storytelling.</div>
                )}
                {entryType === 'photo' && (
                  <div><strong className="text-[#202020] dark:text-[#e5e5e5]">Photo:</strong> Image-focused format with captions. Ideal for visual storytelling and location documentation.</div>
                )}
                {entryType === 'video' && (
                  <div><strong className="text-[#202020] dark:text-[#e5e5e5]">Video:</strong> Single video embed format. Share footage from your expedition with narrative context.</div>
                )}
                {entryType === 'data' && (
                  <div><strong className="text-[#202020] dark:text-[#e5e5e5]">Data:</strong> Structured format emphasizing metrics, coordinates, and quantifiable information. For technical documentation and research.</div>
                )}
              </div>
            </div>

            {/* Entry Type Restriction Notification */}
            {entryTypeNotification && (
              <div className="mb-6 p-4 border-2 bg-[#fff8e1] dark:bg-[#3a3320] border-[#ac6d46]">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="text-xs font-bold mb-2 dark:text-[#e5e5e5]">
                      EXPLORER PRO FEATURE
                    </div>
                    <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">
                      {entryTypeNotification.message}
                    </div>
                    <Link
                      href="/settings/billing"
                      className="inline-block mt-3 px-4 py-2 bg-[#ac6d46] text-white text-xs font-bold hover:bg-[#8a5738] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46]"
                    >
                      UPGRADE TO EXPLORER PRO
                    </Link>
                  </div>
                  <button
                    onClick={() => setEntryTypeNotification(null)}
                    className="text-[#616161] dark:text-[#b5bcc4] hover:text-[#202020] dark:hover:text-[#e5e5e5] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#616161]"
                  >
                    <X size={16} strokeWidth={2} />
                  </button>
                </div>
              </div>
            )}

            {/* Standalone Entry Notice */}
            {isStandalone && (
              <div className="mb-6 p-4 bg-[#fff8e1] dark:bg-[#3a3320] border-2 border-[#616161]">
                <div className="text-xs font-bold mb-2 dark:text-[#e5e5e5]">STANDALONE ENTRY LIMITATIONS:</div>
                <div className="text-xs text-[#616161] dark:text-[#b5bcc4] space-y-1">
                  <div>• This entry will NOT be associated with any expedition</div>
                  <div>• Will not contribute to expedition statistics or milestones</div>
                  <div>• Appears in your journal feed but not in expedition timelines</div>
                  <div>• Useful for one-off observations, reflections, or test entries</div>
                </div>
              </div>
            )}

            {/* Waypoint Selector — Pro users with expedition */}
            {isPro && !isStandalone && (
              <div className="mb-6">
                <label className="block text-xs font-medium mb-3 text-[#202020] dark:text-[#e5e5e5]">
                  SELECT WAYPOINT <span className="text-[#ac6d46] ml-1">*REQUIRED</span>
                </label>
                {selectedWaypointId || waypointMode === 'new' ? (
                  <div className="flex items-center gap-3 p-3 border-2 border-[#ac6d46] bg-[#ac6d46]/5 dark:bg-[#ac6d46]/10">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold dark:text-[#e5e5e5]">{selectedWaypointTitle}</div>
                      {coordinates && (
                        <div className="text-xs text-[#616161] dark:text-[#b5bcc4] font-mono">
                          {coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)}
                        </div>
                      )}
                      {waypointMode === 'new' && <span className="text-[10px] text-[#4676ac] font-bold">NEW WAYPOINT</span>}
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowWaypointSelector(true)}
                      className="px-3 py-1.5 border-2 border-[#616161] dark:border-[#b5bcc4] text-xs font-bold text-[#616161] dark:text-[#b5bcc4] hover:border-[#ac6d46] hover:text-[#ac6d46] transition-all active:scale-[0.98]"
                    >
                      CHANGE
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowWaypointSelector(true)}
                    className="w-full py-4 border-2 border-dashed border-[#b5bcc4] dark:border-[#3a3a3a] text-sm text-[#616161] dark:text-[#b5bcc4] hover:border-[#ac6d46] hover:text-[#ac6d46] transition-all active:scale-[0.98]"
                  >
                    TAP TO SELECT WAYPOINT ON MAP
                  </button>
                )}
              </div>
            )}

            <form className="space-y-6" onSubmit={(e) => handleSubmit(e, false)}>
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
                    isStandalone
                      ? 'e.g., Reflections on Solo Travel'
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-2 text-[#202020] dark:text-[#e5e5e5]">
                    LOCATION NAME
                    <span className="text-[#ac6d46] ml-1">*REQUIRED</span>
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 border-2 border-[#b5bcc4] dark:border-[#3a3a3a] focus:border-[#ac6d46] outline-none text-sm dark:bg-[#2a2a2a] dark:text-[#e5e5e5]"
                    placeholder="e.g., Samarkand Region"
                    value={entryLocation}
                    onChange={(e) => setEntryLocation(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-2 text-[#202020] dark:text-[#e5e5e5]">
                    GPS COORDINATES
                    <span className="text-[#ac6d46] ml-1">*REQUIRED</span>
                  </label>
                  {isPro && !isStandalone ? (
                    /* Pro users: coordinates are derived from waypoint selection */
                    <div>
                      <input
                        type="text"
                        className="w-full px-4 py-3 border-2 border-[#b5bcc4] dark:border-[#3a3a3a] outline-none text-sm font-mono dark:bg-[#2a2a2a] dark:text-[#e5e5e5] opacity-60 cursor-not-allowed bg-[#f5f5f5] dark:bg-[#1a1a1a]"
                        placeholder="Select a waypoint above"
                        value={coordinates ? `${coordinates.lat.toFixed(6)}, ${coordinates.lng.toFixed(6)}` : ''}
                        readOnly
                      />
                      <div className="mt-2 px-3 py-2 bg-[#f5f5f5] dark:bg-[#2a2a2a] border-l-2 border-[#ac6d46] text-xs text-[#616161] dark:text-[#b5bcc4]">
                        Coordinates derived from waypoint selection
                      </div>
                    </div>
                  ) : (
                    /* Regular users + standalone: manual coordinate entry / map */
                    <div>
                      <input
                        type="text"
                        className="w-full px-4 py-3 border-2 border-[#b5bcc4] dark:border-[#3a3a3a] focus:border-[#ac6d46] outline-none text-sm font-mono dark:bg-[#2a2a2a] dark:text-[#e5e5e5]"
                        placeholder="e.g., 39.6270, 66.9750"
                        value={coordinates ? `${coordinates.lat}, ${coordinates.lng}` : ''}
                        onChange={(e) => {
                          const [lat, lng] = e.target.value.split(',').map(Number);
                          if (!isNaN(lat) && !isNaN(lng)) {
                            setCoordinates({ lat, lng });
                          }
                        }}
                      />
                      <button
                        type="button"
                        className="mt-2 w-full px-3 py-2 bg-[#4676ac] text-white text-xs hover:bg-[#365a87] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#4676ac]"
                        onClick={() => setShowMap(true)}
                      >
                        SET LOCATION MARKER
                      </button>
                    </div>
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
                      placeholder={isStandalone ? `Write your standalone journal entry here...

Share your thoughts, observations, and reflections. This entry is not tied to any expedition, so feel free to:
• Document spontaneous experiences or insights
• Reflect on personal growth and learnings
• Share one-off observations or encounters
• Test the journal entry format
• Write about topics unrelated to a specific expedition

Note: Standalone entries won't appear in expedition timelines.` : `Write your journal entry here...

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
                      <span className={wordCount < minWords || wordCount > 2000 ? 'text-[#994040] dark:text-red-400 font-bold' : ''}>
                        Word count: {wordCount} / 2,000 {wordCount > 0 && wordCount < minWords && `(Minimum: ${minWords})`} {wordCount > 2000 && `(Maximum: 2,000)`}
                      </span>
                      <span>Character count: {standardContent.length} / 50,000</span>
                    </div>
                    {wordCount > 0 && (wordCount < minWords || wordCount > 2000) && (
                      <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 border-l-2 border-[#994040] text-xs text-red-700 dark:text-red-400">
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
                      <div className="mt-3 p-4 bg-red-50 dark:bg-red-900/20 border-2 border-[#994040] text-sm">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="w-5 h-5 text-[#994040] dark:text-red-400 flex-shrink-0 mt-0.5" />
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
                                className="w-4 h-4 border-2 border-[#994040] accent-[#994040]"
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
                          {isPro ? `Pro: up to ${mediaLimit} photos` : 'Basic: up to 2 photos'}
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
                                className="px-3 py-1.5 text-xs font-bold border-2 border-[#994040] text-[#994040] hover:bg-[#994040] hover:text-white flex items-center gap-1.5 transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#994040]"
                              >
                                <X size={14} />
                                REMOVE
                              </button>
                            </div>

                            {/* EXIF Warning for potentially AI-generated image */}
                            {media.exifResult?.isSuspicious && (
                              <div className="col-span-full mt-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-400 text-xs">
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

              {/* PHOTO FIELDS */}
              {entryType === 'photo' && (
                <>
                  <div>
                    <label className="block text-xs font-medium mb-2 text-[#202020] dark:text-[#e5e5e5]">
                      PHOTO UPLOADS
                      <span className="text-[#ac6d46] ml-1">*REQUIRED - Minimum 3 photos</span>
                      <span className="text-[#616161] dark:text-[#b5bcc4] ml-1">({uploadedMedia.length}/{mediaLimit} photos)</span>
                    </label>

                    {/* Media Info */}
                    <div className="mb-3 p-3 bg-[#f5f5f5] dark:bg-[#2a2a2a] border-l-2 border-[#4676ac] text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[#616161] dark:text-[#b5bcc4]">
                          {isPro ? `Pro: up to ${mediaLimit} photos` : 'Basic: up to 2 photos'}
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
                              {media.thumbnail ? (
                                <Image
                                  src={media.thumbnail}
                                  alt={media.name}
                                  className="w-16 h-16 object-cover border border-[#b5bcc4] dark:border-[#3a3a3a] flex-shrink-0"
                                  width={64}
                                  height={64}
                                />
                              ) : (
                                <div className="w-16 h-16 bg-[#e5e5e5] dark:bg-[#3a3a3a] flex items-center justify-center flex-shrink-0">
                                  <ImageIcon size={24} className="text-[#616161]" />
                                </div>
                              )}

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

                              <div className="flex items-center gap-2 flex-shrink-0">
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
                                    setImageWarnings(prev => {
                                      const next = { ...prev };
                                      delete next[media.id];
                                      return next;
                                    });
                                  }}
                                  className="px-3 py-1.5 text-xs font-bold border-2 border-[#994040] text-[#994040] hover:bg-[#994040] hover:text-white flex items-center gap-1.5 transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#994040]"
                                >
                                  <X size={14} />
                                  REMOVE
                                </button>
                              </div>
                            </div>

                            {media.exifResult?.isSuspicious && (
                              <div className="col-span-full mt-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-400 text-xs">
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
                        : 'border-[#ac6d46] dark:border-[#8a5738] hover:border-[#8a5738] bg-[#fef9f5] dark:bg-[#2a2420]'
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
                            : 'bg-[#ac6d46] hover:bg-[#8a5738]'
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
                    {uploadedMedia.length > 0 && uploadedMedia.length < 3 && (
                      <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-900/20 border-l-2 border-amber-500 text-xs text-amber-700 dark:text-amber-400">
                        Photo essays require at least 3 photos. {3 - uploadedMedia.length} more needed.
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-2 text-[#202020] dark:text-[#e5e5e5]">
                      ESSAY NARRATIVE
                      <span className="text-[#ac6d46] ml-1">*REQUIRED</span>
                    </label>
                    <textarea
                      className="w-full px-4 py-3 border-2 border-[#b5bcc4] dark:border-[#3a3a3a] focus:border-[#ac6d46] outline-none text-sm font-mono leading-relaxed dark:bg-[#2a2a2a] dark:text-[#e5e5e5]"
                      rows={8}
                      placeholder={`Provide context and narrative for your photo essay...

This narrative should tie your photos together and provide:
• The story behind the photos
• Context about the location and moment
• What you were trying to capture
• Technical or artistic considerations

Individual photo captions can be added after upload.`}
                      value={photoContent}
                      onChange={(e) => setPhotoContent(e.target.value)}
                    />
                    <div className="flex justify-between text-xs text-[#616161] dark:text-[#b5bcc4] mt-1 font-mono">
                      <span className={wordCount < minWords || wordCount > 2000 ? 'text-[#994040] dark:text-red-400 font-bold' : ''}>
                        Word count: {wordCount} / 2,000 {wordCount > 0 && wordCount < minWords && `(Minimum: ${minWords})`} {wordCount > 2000 && `(Maximum: 2,000)`}
                      </span>
                      <span>Character count: {photoContent.length} / 15,000</span>
                    </div>
                    {wordCount > 0 && (wordCount < minWords || wordCount > 2000) && (
                      <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 border-l-2 border-[#994040] text-xs text-red-700 dark:text-red-400">
                        <div className="font-bold mb-1">WORD COUNT REQUIREMENT:</div>
                        {wordCount < minWords && <div>• Your entry must be at least {minWords} words. Current: {wordCount} words ({minWords - wordCount} more needed)</div>}
                        {wordCount > 2000 && <div>• Your entry must not exceed 2,000 words. Current: {wordCount} words ({wordCount - 2000} over limit)</div>}
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* VIDEO FIELDS */}
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
                      value={videoContent}
                      onChange={(e) => setVideoContent(e.target.value)}
                    />
                    <div className="flex justify-between text-xs text-[#616161] dark:text-[#b5bcc4] mt-1">
                      <span>
                        Word count: {wordCount} / 2,000 {wordCount > 0 && wordCount < minWords && `(Minimum: ${minWords})`} {wordCount > 2000 && `(Maximum: 2,000)`}
                      </span>
                      <span>Character count: {videoContent.length} / 15,000</span>
                    </div>
                    {wordCount > 0 && (wordCount < minWords || wordCount > 2000) && (
                      <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 border-l-2 border-[#994040] text-xs text-red-700 dark:text-red-400">
                        <div className="font-bold mb-1">WORD COUNT REQUIREMENT:</div>
                        {wordCount < minWords && <div>• Your entry must be at least {minWords} words. Current: {wordCount} words ({minWords - wordCount} more needed)</div>}
                        {wordCount > 2000 && <div>• Your entry must not exceed 2,000 words. Current: {wordCount} words ({wordCount - 2000} over limit)</div>}
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* DATA FIELDS */}
              {entryType === 'data' && (
                <>
                  <div className="border-2 border-[#4676ac] p-4 dark:bg-[#2a2a2a]">
                    <div className="text-xs font-bold mb-3 dark:text-[#e5e5e5]">ENVIRONMENTAL DATA:</div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs mb-2 text-[#616161] dark:text-[#b5bcc4]">Temperature (°C)</label>
                        <input
                          type="number"
                          step="0.1"
                          className="w-full px-3 py-2 border border-[#b5bcc4] dark:border-[#3a3a3a] focus:border-[#ac6d46] outline-none text-xs font-mono dark:bg-[#202020] dark:text-[#e5e5e5]"
                          placeholder="e.g., 28.5"
                          value={dlTemperature}
                          onChange={(e) => setDlTemperature(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-xs mb-2 text-[#616161] dark:text-[#b5bcc4]">Humidity (%)</label>
                        <input
                          type="number"
                          className="w-full px-3 py-2 border border-[#b5bcc4] dark:border-[#3a3a3a] focus:border-[#ac6d46] outline-none text-xs font-mono dark:bg-[#202020] dark:text-[#e5e5e5]"
                          placeholder="e.g., 65"
                          value={dlHumidity}
                          onChange={(e) => setDlHumidity(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-xs mb-2 text-[#616161] dark:text-[#b5bcc4]">Wind Speed ({speedLabel})</label>
                        <input
                          type="number"
                          step="0.1"
                          className="w-full px-3 py-2 border border-[#b5bcc4] dark:border-[#3a3a3a] focus:border-[#ac6d46] outline-none text-xs font-mono dark:bg-[#202020] dark:text-[#e5e5e5]"
                          placeholder="e.g., 12.5"
                          value={dlWindSpeed}
                          onChange={(e) => setDlWindSpeed(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-xs mb-2 text-[#616161] dark:text-[#b5bcc4]">Pressure (hPa)</label>
                        <input
                          type="number"
                          className="w-full px-3 py-2 border border-[#b5bcc4] dark:border-[#3a3a3a] focus:border-[#ac6d46] outline-none text-xs font-mono dark:bg-[#202020] dark:text-[#e5e5e5]"
                          placeholder="e.g., 1013"
                          value={dlPressure}
                          onChange={(e) => setDlPressure(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border-2 border-[#4676ac] p-4 dark:bg-[#2a2a2a]">
                    <div className="text-xs font-bold mb-3 dark:text-[#e5e5e5]">ACTIVITY METRICS:</div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs mb-2 text-[#616161] dark:text-[#b5bcc4]">Distance Covered ({distanceLabel})</label>
                        <input
                          type="number"
                          step="0.1"
                          className="w-full px-3 py-2 border border-[#b5bcc4] dark:border-[#3a3a3a] focus:border-[#ac6d46] outline-none text-xs font-mono dark:bg-[#202020] dark:text-[#e5e5e5]"
                          placeholder="e.g., 87.3"
                          value={dlDistanceCovered}
                          onChange={(e) => setDlDistanceCovered(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-xs mb-2 text-[#616161] dark:text-[#b5bcc4]">Elevation Gain (m)</label>
                        <input
                          type="number"
                          className="w-full px-3 py-2 border border-[#b5bcc4] dark:border-[#3a3a3a] focus:border-[#ac6d46] outline-none text-xs font-mono dark:bg-[#202020] dark:text-[#e5e5e5]"
                          placeholder="e.g., 450"
                          value={dlElevationGain}
                          onChange={(e) => setDlElevationGain(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-xs mb-2 text-[#616161] dark:text-[#b5bcc4]">Duration (hours)</label>
                        <input
                          type="number"
                          step="0.1"
                          className="w-full px-3 py-2 border border-[#b5bcc4] dark:border-[#3a3a3a] focus:border-[#ac6d46] outline-none text-xs font-mono dark:bg-[#202020] dark:text-[#e5e5e5]"
                          placeholder="e.g., 6.5"
                          value={dlDuration}
                          onChange={(e) => setDlDuration(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-xs mb-2 text-[#616161] dark:text-[#b5bcc4]">Average Speed ({speedLabel})</label>
                        <input
                          type="number"
                          step="0.1"
                          className="w-full px-3 py-2 border border-[#b5bcc4] dark:border-[#3a3a3a] focus:border-[#ac6d46] outline-none text-xs font-mono dark:bg-[#202020] dark:text-[#e5e5e5]"
                          placeholder="e.g., 13.4"
                          value={dlAvgSpeed}
                          onChange={(e) => setDlAvgSpeed(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-2 text-[#202020] dark:text-[#e5e5e5]">
                      TECHNICAL NOTES
                      <span className="text-[#ac6d46] ml-1">*REQUIRED</span>
                    </label>
                    <textarea
                      className="w-full px-4 py-3 border-2 border-[#b5bcc4] dark:border-[#3a3a3a] focus:border-[#ac6d46] outline-none text-sm font-mono leading-relaxed dark:bg-[#2a2a2a] dark:text-[#e5e5e5]"
                      rows={8}
                      placeholder={`Document technical observations and data analysis...

Include:
• Methodology and data collection process
• Notable readings or anomalies
• Equipment used
• Conditions affecting measurements
• Analysis and conclusions`}
                      value={dataContent}
                      onChange={(e) => setDataContent(e.target.value)}
                    />
                    <div className="flex justify-between text-xs text-[#616161] dark:text-[#b5bcc4] mt-1 font-mono">
                      <span className={wordCount < minWords || wordCount > 2000 ? 'text-[#994040] dark:text-red-400 font-bold' : ''}>
                        Word count: {wordCount} / 2,000 {wordCount > 0 && wordCount < minWords && `(Minimum: ${minWords})`} {wordCount > 2000 && `(Maximum: 2,000)`}
                      </span>
                      <span>Character count: {dataContent.length} / 25,000</span>
                    </div>
                    {wordCount > 0 && (wordCount < minWords || wordCount > 2000) && (
                      <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 border-l-2 border-[#994040] text-xs text-red-700 dark:text-red-400">
                        <div className="font-bold mb-1">WORD COUNT REQUIREMENT:</div>
                        {wordCount < minWords && <div>• Your entry must be at least {minWords} words. Current: {wordCount} words ({minWords - wordCount} more needed)</div>}
                        {wordCount > 2000 && <div>• Your entry must not exceed 2,000 words. Current: {wordCount} words ({wordCount - 2000} over limit)</div>}
                      </div>
                    )}
                  </div>

                </>
              )}

              {/* Tags — commented out (no backend support for entry tags)
              <div>
                <label className="block text-xs font-medium mb-2 text-[#202020] dark:text-[#e5e5e5]">
                  TAGS
                  <span className="text-[#616161] dark:text-[#b5bcc4] ml-1">(Optional)</span>
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-3 border-2 border-[#b5bcc4] dark:border-[#3a3a3a] focus:border-[#ac6d46] outline-none text-sm font-mono dark:bg-[#2a2a2a] dark:text-[#e5e5e5]"
                  placeholder="e.g., architecture, ceramics, culture, samarkand"
                />
                <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1">
                  Comma-separated • Helps readers find your content
                </div>
              </div>
              */}

              {/* Standard metadata (weather/distance/mood/expenses) — commented out until display is implemented on entry detail page
              {entryType === 'standard' && (
                <div className="border-2 border-[#4676ac] p-4 dark:bg-[#2a2a2a]">
                  <div className="text-xs font-bold mb-3 dark:text-[#e5e5e5]">ADDITIONAL METADATA (OPTIONAL):</div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs mb-2 text-[#616161] dark:text-[#b5bcc4]">Weather</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-[#b5bcc4] dark:border-[#3a3a3a] focus:border-[#ac6d46] outline-none text-xs dark:bg-[#202020] dark:text-[#e5e5e5]"
                        placeholder="e.g., Sunny, 28°C"
                        value={stdWeather}
                        onChange={(e) => setStdWeather(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs mb-2 text-[#616161] dark:text-[#b5bcc4]">Distance Traveled ({distanceLabel})</label>
                      <input
                        type="number"
                        className="w-full px-3 py-2 border border-[#b5bcc4] dark:border-[#3a3a3a] focus:border-[#ac6d46] outline-none text-xs font-mono dark:bg-[#202020] dark:text-[#e5e5e5]"
                        placeholder="e.g., 87"
                        value={stdDistanceTraveled}
                        onChange={(e) => setStdDistanceTraveled(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs mb-2 text-[#616161] dark:text-[#b5bcc4]">Mood/Energy Level</label>
                      <select
                        className="w-full px-3 py-2 border border-[#b5bcc4] dark:border-[#3a3a3a] focus:border-[#ac6d46] outline-none text-xs dark:bg-[#202020] dark:text-[#e5e5e5]"
                        value={stdMood}
                        onChange={(e) => setStdMood(e.target.value)}
                      >
                        <option value="">Not specified</option>
                        <option value="High Energy">High Energy</option>
                        <option value="Good">Good</option>
                        <option value="Moderate">Moderate</option>
                        <option value="Low">Low</option>
                        <option value="Exhausted">Exhausted</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs mb-2 text-[#616161] dark:text-[#b5bcc4]">Expenses (USD)</label>
                      <input
                        type="number"
                        className="w-full px-3 py-2 border border-[#b5bcc4] dark:border-[#3a3a3a] focus:border-[#ac6d46] outline-none text-xs font-mono dark:bg-[#202020] dark:text-[#e5e5e5]"
                        placeholder="e.g., 45.50"
                        value={stdExpenses}
                        onChange={(e) => setStdExpenses(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}
              */}

              {/* Entry Options */}
              <div className="border-2 border-[#ac6d46] p-4 bg-[#f5f5f5] dark:bg-[#2a2a2a]">
                {/* Sponsor notification — commented out (no state wired up)
                <div className="flex items-start gap-2 mb-3">
                  <input type="checkbox" id="sponsor-update" className="mt-1" />
                  <label htmlFor="sponsor-update" className="text-xs">
                    <strong className="text-[#202020] dark:text-[#e5e5e5]">Send sponsor notification:</strong>{' '}
                    <span className="text-[#616161] dark:text-[#b5bcc4]">
                      Email your {expedition?.sponsorsCount || 0} sponsors about this new entry
                    </span>
                  </label>
                </div>
                */}
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    id="milestone"
                    className="mt-1"
                    checked={isMilestone}
                    onChange={(e) => setIsMilestone(e.target.checked)}
                  />
                  <label htmlFor="milestone" className="text-xs text-[#616161] dark:text-[#b5bcc4]">
                    Mark this as a milestone entry (highlighted in timeline)
                  </label>
                </div>
              </div>

              {/* Privacy Settings - ALL TYPES */}
              <div className="border-2 border-[#202020] dark:border-[#616161] p-4 dark:bg-[#2a2a2a]">
                <div className="text-xs font-bold mb-3 dark:text-[#e5e5e5]">ENTRY VISIBILITY:</div>
                {!isStandalone && expedition ? (
                  <div className="p-3 bg-[#f5f5f5] dark:bg-[#1a1a1a] border-l-4 border-[#4676ac] text-xs">
                    <strong className="text-[#202020] dark:text-[#e5e5e5]">
                      {(expedition.visibility || 'public').toUpperCase()}
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
                        checked={visibility === 'public'}
                        onChange={() => setVisibility('public')}
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
                        checked={visibility === 'off-grid'}
                        onChange={() => setVisibility('off-grid')}
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
                        checked={visibility === 'private'}
                        onChange={() => setVisibility('private')}
                      />
                      <label htmlFor="vis-private" className="text-xs">
                        <strong className="text-[#202020] dark:text-[#e5e5e5]">Private:</strong>{' '}
                        <span className="text-[#616161] dark:text-[#b5bcc4]">Only visible to you (draft mode)</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Entry Notes Settings - ALL TYPES */}
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

              {/* Action Button */}
              <div className="pt-6 border-t-2 border-[#202020] dark:border-[#616161]">
                <button
                  type="submit"
                  className="w-full py-3 bg-[#ac6d46] text-white font-bold hover:bg-[#8a5738] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
                  disabled={!isWordCountValid || isSubmitting || (contentValidation.hasWarnings && !contentValidation.allAcknowledged) || hasUnacknowledgedImageWarnings}
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isSubmitting ? 'PUBLISHING...' : (contentValidation.hasWarnings && !contentValidation.allAcknowledged) || hasUnacknowledgedImageWarnings ? 'ACKNOWLEDGE WARNINGS TO PUBLISH' : 'PUBLISH ENTRY'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Expedition Info - Only show for expedition entries */}
          {!isStandalone && expedition && (
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
                  <div className="font-mono dark:text-[#e5e5e5]">{expedition.publicId}</div>
                </div>
                <div>
                  <span className="text-[#616161] dark:text-[#b5bcc4]">Day:</span>
                  <div className="font-bold dark:text-[#e5e5e5]">{calculateDaysActive(expedition.startDate, expedition.endDate, expedition.status)}</div>
                </div>
                <div>
                  <span className="text-[#616161] dark:text-[#b5bcc4]">Status:</span>
                  <div className="font-bold dark:text-[#e5e5e5]">{(expedition.status || 'active').charAt(0).toUpperCase() + (expedition.status || 'active').slice(1)}</div>
                </div>
              </div>
            </div>
          )}

          {/* Entry Type Guide */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-4">
            <h3 className="text-xs font-bold mb-3 border-b border-[#202020] dark:border-[#616161] pb-2 dark:text-[#e5e5e5]">
              ENTRY TYPE GUIDE
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <div className="font-bold text-[#202020] dark:text-[#e5e5e5] mb-1">Standard</div>
                <div className="text-[#616161] dark:text-[#b5bcc4]">Daily journal with rich text, photos, and metadata</div>
              </div>
              <div>
                <div className="font-bold text-[#202020] dark:text-[#e5e5e5] mb-1 flex items-center gap-1">
                  Photo
                  <span className="text-xs text-[#ac6d46]">PRO</span>
                </div>
                <div className="text-[#616161] dark:text-[#b5bcc4]">Visual storytelling with image galleries and captions</div>
              </div>
              <div>
                <div className="font-bold text-[#202020] dark:text-[#e5e5e5] mb-1 flex items-center gap-1">
                  Video
                  <span className="text-xs text-[#ac6d46]">PRO</span>
                </div>
                <div className="text-[#616161] dark:text-[#b5bcc4]">Single video embed with narrative context</div>
              </div>
              <div>
                <div className="font-bold text-[#202020] dark:text-[#e5e5e5] mb-1 flex items-center gap-1">
                  Data
                  <span className="text-xs text-[#ac6d46]">PRO</span>
                </div>
                <div className="text-[#616161] dark:text-[#b5bcc4]">Technical documentation with environmental and activity metrics</div>
              </div>
            </div>
            {!isPro && (
              <div className="mt-3 pt-3 border-t border-[#202020] dark:border-[#616161] text-xs text-[#616161] dark:text-[#b5bcc4]">
                <span className="font-bold text-[#ac6d46]">NOTE:</span> Photo, Video, and Data entries require Explorer Pro.
                <Link href="/settings/billing" className="text-[#4676ac] hover:underline ml-1">Upgrade to Pro</Link>
              </div>
            )}
          </div>

          {/* Tips */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-4">
            <h3 className="text-xs font-bold mb-3 border-b border-[#202020] dark:border-[#616161] pb-2 dark:text-[#e5e5e5]">
              WRITING TIPS
            </h3>
            <div className="space-y-2 text-xs text-[#616161] dark:text-[#b5bcc4]">
              {isStandalone ? (
                <>
                  <div>• Be authentic and share your genuine experiences</div>
                  <div>• Include specific details and observations</div>
                  <div>• Use standalone entries for quick thoughts</div>
                  <div>• Add photos to bring your story to life</div>
                  <div>• Proofread before publishing</div>
                  <div>• Consider if this should be part of an expedition</div>
                </>
              ) : (
                <>
                  <div>• Be authentic and share your genuine experiences</div>
                  <div>• Include specific details and observations</div>
                  <div>• Think about what your sponsors want to know</div>
                  <div>• Add photos to bring your story to life</div>
                  <div>• Proofread before publishing</div>
                  <div>• Update regularly to keep followers engaged</div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Location Map Modal - LocationMap renders its own modal wrapper */}
      {showMap && (
        <LocationMap
          initialLat={coordinates?.lat}
          initialLng={coordinates?.lng}
          onLocationSelect={(lat, lng) => {
            setCoordinates({ lat, lng });
          }}
          onClose={() => setShowMap(false)}
          expeditionWaypoints={expedition?.waypoints?.map((wp, idx) => ({
            id: String(wp.id),
            lat: wp.lat || 0,
            lng: wp.lon || 0,
            title: wp.title || `Waypoint ${idx + 1}`,
            type: idx === 0 ? 'start' as const : (idx === (expedition?.waypoints?.length || 0) - 1 ? 'end' as const : 'standard' as const),
          }))}
          expeditionEntries={expedition?.entries?.filter(e => e.lat && e.lon).map(e => ({
            id: e.id,
            lat: e.lat!,
            lng: e.lon!,
            title: e.title,
          }))}
          expeditionRouteGeometry={expedition?.routeGeometry}
          isRoundTrip={expedition?.isRoundTrip}
          currentLocationSource={expedition?.currentLocationSource}
          currentLocationId={expedition?.currentLocationId}
          onCompletedSegmentDrop={setMarkerOnCompletedSegment}
        />
      )}

      {/* Waypoint Selector Map Modal - Pro users */}
      {showWaypointSelector && expedition?.waypoints && (
        <WaypointSelectorMap
          expeditionWaypoints={expedition.waypoints.map((wp, idx) => ({
            id: String(wp.id),
            lat: wp.lat || 0,
            lng: wp.lon || 0,
            title: wp.title || `Waypoint ${idx + 1}`,
            sequence: wp.sequence ?? idx,
            entryIds: wp.entryIds || (wp.entryId ? [wp.entryId] : []),
          }))}
          expeditionRouteGeometry={expedition.routeGeometry}
          isRoundTrip={expedition.isRoundTrip}
          onSelectExisting={handleSelectExistingWaypoint}
          onSelectNew={handleSelectNewWaypoint}
          onClose={() => setShowWaypointSelector(false)}
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
                <X size={20} className="text-[#616161] dark:text-[#b5bcc4]" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Photo Preview */}
              {(() => {
                const media = uploadedMedia.find(m => m.id === selectedMediaForEdit);
                return media ? (
                  <div>
                    {(media.url || media.thumbnail) ? (
                      <Image
                        src={media.url || media.thumbnail}
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

              {/* Caption */}
              <div>
                <label className="block text-xs font-medium mb-2 text-[#202020] dark:text-[#e5e5e5]">
                  CAPTION
                  <span className="text-[#616161] dark:text-[#b5bcc4] ml-1 font-normal">(Recommended)</span>
                </label>
                <textarea
                  className="w-full px-4 py-3 border-2 border-[#b5bcc4] dark:border-[#3a3a3a] focus:border-[#ac6d46] outline-none text-sm dark:bg-[#2a2a2a] dark:text-[#e5e5e5]"
                  rows={3}
                  placeholder="Describe what this photo shows..."
                  maxLength={200}
                  value={mediaMetadata[selectedMediaForEdit]?.caption || ''}
                  onChange={(e) => setMediaMetadata(prev => ({
                    ...prev,
                    [selectedMediaForEdit]: {
                      ...prev[selectedMediaForEdit],
                      caption: e.target.value,
                      altText: prev[selectedMediaForEdit]?.altText || '',
                      credit: prev[selectedMediaForEdit]?.credit || '',
                    }
                  }))}
                />
                <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1 font-mono text-right">
                  {mediaMetadata[selectedMediaForEdit]?.caption?.length || 0} / 200 characters
                </div>
                <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1">
                  This caption will be displayed with your photo. Be descriptive and engaging.
                </div>
              </div>

              {/* Alt Text */}
              <div>
                <label className="block text-xs font-medium mb-2 text-[#202020] dark:text-[#e5e5e5]">
                  ALT TEXT (ACCESSIBILITY)
                  <span className="text-[#616161] dark:text-[#b5bcc4] ml-1 font-normal">(Recommended)</span>
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-3 border-2 border-[#b5bcc4] dark:border-[#3a3a3a] focus:border-[#ac6d46] outline-none text-sm dark:bg-[#2a2a2a] dark:text-[#e5e5e5]"
                  placeholder="Describe the image for screen readers..."
                  maxLength={100}
                  value={mediaMetadata[selectedMediaForEdit]?.altText || ''}
                  onChange={(e) => setMediaMetadata(prev => ({
                    ...prev,
                    [selectedMediaForEdit]: {
                      ...prev[selectedMediaForEdit],
                      altText: e.target.value,
                      caption: prev[selectedMediaForEdit]?.caption || '',
                      credit: prev[selectedMediaForEdit]?.credit || '',
                    }
                  }))}
                />
                <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1 font-mono text-right">
                  {mediaMetadata[selectedMediaForEdit]?.altText?.length || 0} / 100 characters
                </div>
                <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1">
                  Brief description for visually impaired readers. Example: "Mountain valley at sunset with snow-capped peaks"
                </div>
              </div>

              {/* Photo Credit */}
              <div>
                <label className="block text-xs font-medium mb-2 text-[#202020] dark:text-[#e5e5e5]">
                  PHOTO CREDIT
                  <span className="text-[#616161] dark:text-[#b5bcc4] ml-1 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-3 border-2 border-[#b5bcc4] dark:border-[#3a3a3a] focus:border-[#ac6d46] outline-none text-sm dark:bg-[#2a2a2a] dark:text-[#e5e5e5]"
                  placeholder="Leave blank if you took the photo..."
                  maxLength={100}
                  value={mediaMetadata[selectedMediaForEdit]?.credit || ''}
                  onChange={(e) => setMediaMetadata(prev => ({
                    ...prev,
                    [selectedMediaForEdit]: {
                      ...prev[selectedMediaForEdit],
                      credit: e.target.value,
                      caption: prev[selectedMediaForEdit]?.caption || '',
                      altText: prev[selectedMediaForEdit]?.altText || '',
                    }
                  }))}
                />
                <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1">
                  If someone else took this photo, credit them here. Example: "Photo by John Smith"
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t-2 border-[#202020] dark:border-[#616161]">
                <button
                  type="button"
                  onClick={() => {
                    // Clear metadata for this photo
                    setMediaMetadata(prev => {
                      const newMetadata = { ...prev };
                      delete newMetadata[selectedMediaForEdit];
                      return newMetadata;
                    });
                    setSelectedMediaForEdit(null);
                  }}
                  className="px-6 py-3 border-2 border-[#616161] text-[#616161] dark:text-[#b5bcc4] hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#616161] text-sm"
                >
                  CLEAR ALL
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedMediaForEdit(null)}
                  className="px-6 py-3 border-2 border-[#202020] dark:border-[#616161] dark:text-[#e5e5e5] hover:bg-[#95a2aa] dark:hover:bg-[#4a4a4a] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#616161] text-sm"
                >
                  CANCEL
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedMediaForEdit(null)}
                  className="flex-1 py-3 bg-[#ac6d46] text-white font-bold hover:bg-[#8a5738] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] text-sm"
                >
                  SAVE PHOTO INFO
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Planning Phase Confirmation Modal */}
      {showPlanningModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] max-w-md w-full">
            <div className="bg-[#4676ac] px-4 py-3 border-b-2 border-[#202020] dark:border-[#616161]">
              <h3 className="text-white font-bold text-sm tracking-wider" style={{ fontFamily: 'Jost, system-ui, sans-serif' }}>
                EXPEDITION IN PLANNING
              </h3>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-[#202020] dark:text-[#e5e5e5]" style={{ fontFamily: 'Jost, system-ui, sans-serif', lineHeight: 1.6 }}>
                This expedition is still in the planning phase. Would you like to activate the expedition, or keep it in planning? Entries logged during planning will be marked accordingly.
              </p>
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={handlePlanningActivate}
                  className="w-full py-2.5 bg-[#ac6d46] text-white font-bold text-sm hover:bg-[#8a5738] transition-all active:scale-[0.98]"
                  style={{ fontFamily: 'Jost, system-ui, sans-serif', letterSpacing: '0.14em' }}
                >
                  ACTIVATE EXPEDITION
                </button>
                <button
                  type="button"
                  onClick={handlePlanningKeep}
                  className="w-full py-2.5 bg-[#4676ac] text-white font-bold text-sm hover:bg-[#3a6290] transition-all active:scale-[0.98]"
                  style={{ fontFamily: 'Jost, system-ui, sans-serif', letterSpacing: '0.14em' }}
                >
                  KEEP IN PLANNING
                </button>
                <button
                  type="button"
                  onClick={() => { setShowPlanningModal(false); pendingSubmitRef.current = null; }}
                  className="w-full py-2.5 text-[#616161] dark:text-[#b5bcc4] font-bold text-sm hover:text-[#202020] dark:hover:text-[#e5e5e5] transition-all"
                  style={{ fontFamily: 'Jost, system-ui, sans-serif', letterSpacing: '0.14em' }}
                >
                  CANCEL
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}