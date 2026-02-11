'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname, useParams } from 'next/navigation';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useProFeatures } from '@/app/hooks/useProFeatures';
import { LocationMap } from '@/app/components/LocationMap';
import { X, Image as ImageIcon, Lock, Camera, Loader2, Clock, AlertTriangle } from 'lucide-react';
import { entryApi, expeditionApi, uploadApi, type Expedition, type Entry } from '@/app/services/api';
import { formatDate, formatDateTime } from '@/app/utils/dateFormat';
import { useContentValidation } from '@/app/hooks/useContentValidation';
import { checkImageExif, type ExifResult } from '@/app/utils/exifCheck';

export function CreateEntryPage() {
  const { isAuthenticated } = useAuth();
  const { isPro } = useProFeatures();
  const { expeditionId } = useParams<{ expeditionId: string }>();
  const router = useRouter();
  const pathname = usePathname();

  // Check if this is a standalone entry
  const isStandalone = expeditionId === 'standalone';

  // ALL HOOKS MUST BE DECLARED BEFORE ANY CONDITIONAL RETURNS
  const [entryType, setEntryType] = useState<'standard' | 'photo-essay' | 'data-log' | 'waypoint'>('standard');
  const [showMap, setShowMap] = useState(false);
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedWaypointId, setSelectedWaypointId] = useState<string | null>(null);
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [entryLocation, setEntryLocation] = useState('');

  // Media upload state
  const [uploadedMedia, setUploadedMedia] = useState<Array<{ id: string; name: string; type: string; size: number; url: string; thumbnail: string; exifResult?: ExifResult }>>([]);
  const [isUploading, setIsUploading] = useState(false);
  const mediaLimit = isPro ? 5 : 2;
  const [selectedMediaForEdit, setSelectedMediaForEdit] = useState<string | null>(null);
  const [mediaMetadata, setMediaMetadata] = useState<Record<string, { caption: string; altText: string; credit: string }>>({});
  const [coverPhotoId, setCoverPhotoId] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<'public' | 'sponsors-only' | 'off-grid' | 'private'>('public');
  const [isMilestone, setIsMilestone] = useState(false);
  const [commentsEnabled, setCommentsEnabled] = useState(true);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [draftCheckComplete, setDraftCheckComplete] = useState(false);

  // Notification state for entry type restrictions
  const [entryTypeNotification, setEntryTypeNotification] = useState<{ type: 'pro' | 'waypoint-standalone'; message: string } | null>(null);

  // Content state for word count validation
  const [standardContent, setStandardContent] = useState('');
  const [photoEssayContent, setPhotoEssayContent] = useState('');
  const [dataLogContent, setDataLogContent] = useState('');
  const [entryTitle, setEntryTitle] = useState('');

  // API state
  const [expedition, setExpedition] = useState<Expedition | null>(null);
  const [expeditionLoading, setExpeditionLoading] = useState(!isStandalone);
  const [expeditionError, setExpeditionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    setEntryType(draft.entryType || 'standard');
    setStandardContent(draft.content || '');
    setEntryLocation(draft.place || '');

    if (draft.lat && draft.lon) {
      setCoordinates({ lat: draft.lat, lng: draft.lon });
    }

    if (draft.date) {
      const dateObj = new Date(draft.date);
      setEntryDate(dateObj.toISOString().split('T')[0]);
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
    const contentSignature = `${draft.title || ''}|${draft.content || ''}|${draft.place || ''}|${draft.lat}|${draft.lon}`;
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
      case 'photo-essay': return photoEssayContent;
      case 'data-log': return dataLogContent;
      default: return '';
    }
  }, [entryType, standardContent, photoEssayContent, dataLogContent]);

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
      date: entryDate,
      place: entryLocation,
      public: visibility === 'public',
      sponsored: visibility === 'sponsors-only',
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
    };
  }, [entryTitle, getCurrentContent, isStandalone, expedition?.publicId, expeditionId, coordinates, entryDate, entryLocation, visibility, selectedWaypointId, uploadedMedia, mediaMetadata, entryType, coverPhotoId, isMilestone, commentsEnabled]);

  // Auto-save function
  const performAutoSave = useCallback(async () => {
    const content = getCurrentContent();
    const contentSignature = `${entryTitle}|${content}|${entryLocation}|${coordinates?.lat}|${coordinates?.lng}`;

    // Skip if no meaningful content or no changes
    if (!entryTitle && !content) return;
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
  }, [entryTitle, getCurrentContent, entryLocation, coordinates, buildSavePayload, draftId]);

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
  const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

  // Validate file type and size
  const validateFile = (file: File): { valid: boolean; error?: string } => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return { valid: false, error: `${file.name}: Invalid file type. Allowed: JPG, PNG, WEBP, GIF` };
    }
    if (file.size > MAX_FILE_SIZE) {
      return { valid: false, error: `${file.name}: File too large. Maximum size is 15MB` };
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
      case 'photo-essay':
        return countWords(photoEssayContent);
      case 'data-log':
        return countWords(dataLogContent);
      default:
        return 0;
    }
  };

  const wordCount = getWordCount();
  const isWordCountValid = entryType === 'waypoint' || (wordCount >= 100 && wordCount <= 1000);

  // Calculate days active
  const calculateDaysActive = (startDate?: string): number => {
    if (!startDate) return 0;
    const start = new Date(startDate);
    const now = new Date();
    return Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
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

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent, isDraft = false) => {
    e.preventDefault();
    setIsSubmitting(true);
    isSubmittingRef.current = true;
    setSubmitError(null);

    try {
      const payload = buildSavePayload(isDraft);
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
      setSubmitError(err.message || 'Failed to create entry');
    } finally {
      setIsSubmitting(false);
      isSubmittingRef.current = false;
    }
  };

  // Handle waypoint selection for conversion
  const handleWaypointSelection = (waypointId: string) => {
    setSelectedWaypointId(waypointId);
    const waypoint = expedition?.waypoints?.find(wp => String(wp.id) === waypointId);
    if (waypoint) {
      setEntryTitle(waypoint.title || '');
      if (waypoint.date) setEntryDate(typeof waypoint.date === 'string' ? waypoint.date : new Date(waypoint.date).toISOString().split('T')[0]);
      if (waypoint.lat && waypoint.lon) {
        setCoordinates({ lat: waypoint.lat, lng: waypoint.lon });
      }
    }
  };

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

  return (
    <div className="max-w-[1600px] mx-auto px-6 py-12">
      {/* Page Header */}
      <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-6 mb-6">
        <div className="flex items-center justify-between mb-4 border-b-2 border-[#202020] dark:border-[#616161] pb-2">
          <div>
            <h1 className="text-2xl font-bold dark:text-[#e5e5e5]">
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
                  Expedition: <span className="text-[#ac6d46] font-bold">{expedition.title}</span> • Day {calculateDaysActive(expedition.startDate)}
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
          <span className="text-[#4676ac]">Auto-save on</span>
        </div>
      </div>

      {/* Draft Recovery Prompt */}
      {showDraftPrompt && existingDraft && (
        <div className="bg-[#fff7f0] dark:bg-[#2a2420] border-2 border-[#ac6d46] p-4 mb-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="text-sm font-bold text-[#202020] dark:text-[#e5e5e5] mb-1">
                DRAFT FOUND
              </div>
              <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">
                You have an unsaved draft{existingDraft.title ? `: "${existingDraft.title}"` : ''} from {formatDateTime(existingDraft.createdAt)}.
                Would you like to continue editing it?
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
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
                        message: 'Photo Essay entries are an Explorer Pro feature. Upgrade to Explorer Pro to create photo essays with visual storytelling and image galleries.'
                      });
                      return;
                    }
                    setEntryType('photo-essay');
                  }}
                  className={`py-2 text-xs font-bold transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] flex items-center justify-center gap-1 ${
                    entryType === 'photo-essay'
                      ? 'bg-[#ac6d46] text-white border-2 border-[#ac6d46]'
                      : !isPro
                      ? 'border-2 border-[#b5bcc4] dark:border-[#3a3a3a] dark:text-[#b5bcc4] opacity-60 cursor-not-allowed'
                      : 'border-2 border-[#b5bcc4] dark:border-[#3a3a3a] dark:text-[#e5e5e5] hover:border-[#ac6d46]'
                  }`}
                >
                  PHOTO ESSAY
                  {!isPro && <span className="text-xs text-[#ac6d46]">PRO</span>}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!isPro) {
                      setEntryTypeNotification({
                        type: 'pro',
                        message: 'Data Log entries are an Explorer Pro feature. Upgrade to Explorer Pro to create technical data logs with environmental and activity metrics.'
                      });
                      return;
                    }
                    setEntryType('data-log');
                  }}
                  className={`py-2 text-xs font-bold transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] flex items-center justify-center gap-1 ${
                    entryType === 'data-log'
                      ? 'bg-[#ac6d46] text-white border-2 border-[#ac6d46]'
                      : !isPro
                      ? 'border-2 border-[#b5bcc4] dark:border-[#3a3a3a] dark:text-[#b5bcc4] opacity-60 cursor-not-allowed'
                      : 'border-2 border-[#b5bcc4] dark:border-[#3a3a3a] dark:text-[#e5e5e5] hover:border-[#ac6d46]'
                  }`}
                >
                  DATA LOG
                  {!isPro && <span className="text-xs text-[#ac6d46]">PRO</span>}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (isStandalone) {
                      setEntryTypeNotification({
                        type: 'waypoint-standalone',
                        message: 'Waypoint entries require an expedition. Waypoints are location markers tied to a specific expedition route and cannot be created as standalone entries.'
                      });
                      return;
                    }
                    if (!isPro) {
                      setEntryTypeNotification({
                        type: 'pro',
                        message: 'Waypoint entries are an Explorer Pro feature. Upgrade to Explorer Pro to create quick waypoint markers with location notes.'
                      });
                      return;
                    }
                    setEntryType('waypoint');
                  }}
                  className={`py-2 text-xs font-bold transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] flex items-center justify-center gap-1 ${
                    entryType === 'waypoint'
                      ? 'bg-[#ac6d46] text-white border-2 border-[#ac6d46]'
                      : (isStandalone || !isPro)
                      ? 'border-2 border-[#b5bcc4] dark:border-[#3a3a3a] dark:text-[#b5bcc4] opacity-60 cursor-not-allowed'
                      : 'border-2 border-[#b5bcc4] dark:border-[#3a3a3a] dark:text-[#e5e5e5] hover:border-[#ac6d46]'
                  }`}
                >
                  WAYPOINT
                  {!isPro && <span className="text-xs text-[#ac6d46]">PRO</span>}
                </button>
              </div>
              
              {/* Entry Type Descriptions */}
              <div className="mt-3 p-3 bg-[#f5f5f5] dark:bg-[#2a2a2a] border-l-2 border-[#4676ac] text-xs text-[#616161] dark:text-[#b5bcc4]">
                {entryType === 'standard' && (
                  <div><strong className="text-[#202020] dark:text-[#e5e5e5]">Standard Entry:</strong> Traditional journal format with text, photos, and rich media. Best for daily updates and storytelling.</div>
                )}
                {entryType === 'photo-essay' && (
                  <div><strong className="text-[#202020] dark:text-[#e5e5e5]">Photo Essay:</strong> Image-focused format with captions. Ideal for visual storytelling and location documentation.</div>
                )}
                {entryType === 'data-log' && (
                  <div><strong className="text-[#202020] dark:text-[#e5e5e5]">Data Log:</strong> Structured format emphasizing metrics, coordinates, and quantifiable information. For technical documentation and research.</div>
                )}
                {entryType === 'waypoint' && (
                  <div><strong className="text-[#202020] dark:text-[#e5e5e5]">Waypoint:</strong> Location marker with brief notes. Quick updates for route tracking, notable locations, and expedition milestones without full narrative.</div>
                )}
              </div>
            </div>

            {/* Entry Type Restriction Notification */}
            {entryTypeNotification && (
              <div className={`mb-6 p-4 border-2 ${
                entryTypeNotification.type === 'pro' 
                  ? 'bg-[#fff8e1] dark:bg-[#3a3320] border-[#ac6d46]' 
                  : 'bg-[#e8f4f8] dark:bg-[#1a2a32] border-[#4676ac]'
              }`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="text-xs font-bold mb-2 dark:text-[#e5e5e5]">
                      {entryTypeNotification.type === 'pro' ? 'EXPLORER PRO FEATURE' : 'EXPEDITION REQUIRED'}
                    </div>
                    <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">
                      {entryTypeNotification.message}
                    </div>
                    {entryTypeNotification.type === 'pro' && (
                      <Link
                        href="/settings/billing"
                        className="inline-block mt-3 px-4 py-2 bg-[#ac6d46] text-white text-xs font-bold hover:bg-[#8a5738] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46]"
                      >
                        UPGRADE TO EXPLORER PRO
                      </Link>
                    )}
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
                  <div>• Cannot receive sponsorships or contributions</div>
                  <div>• Will not contribute to expedition statistics or milestones</div>
                  <div>• Appears in your journal feed but not in expedition timelines</div>
                  <div>• Useful for one-off observations, reflections, or test entries</div>
                </div>
              </div>
            )}

            {/* Convert Waypoint Option - Only show for expedition entries */}
            {!isStandalone && (
              <div className="mb-6">
                <label className="block text-xs font-medium mb-3 text-[#202020] dark:text-[#e5e5e5]">
                  CONVERT WAYPOINT
                  <span className="text-[#616161] dark:text-[#b5bcc4] ml-1 font-normal">(Optional)</span>
                </label>
                <select
                  className="w-full px-4 py-3 border-2 border-[#b5bcc4] dark:border-[#3a3a3a] focus:border-[#ac6d46] outline-none text-sm dark:bg-[#2a2a2a] dark:text-[#e5e5e5]"
                  value={selectedWaypointId || ''}
                  onChange={(e) => {
                    if (e.target.value) {
                      handleWaypointSelection(e.target.value);
                    } else {
                      setSelectedWaypointId(null);
                    }
                  }}
                >
                  <option value="">-- Create New Entry --</option>
                  {expedition?.waypoints?.map((waypoint) => (
                    <option key={String(waypoint.id)} value={String(waypoint.id)}>
                      {waypoint.title} {waypoint.date ? `(${formatDate(waypoint.date)})` : ''}
                    </option>
                  ))}
                </select>
                <div className="mt-2 p-3 bg-[#f5f5f5] dark:bg-[#2a2a2a] border-l-2 border-[#4676ac] text-xs text-[#616161] dark:text-[#b5bcc4]">
                  <strong className="text-[#202020] dark:text-[#e5e5e5]">Convert a waypoint into a journal entry:</strong> Select an existing waypoint from this expedition to pre-populate the title, date, and location fields. This is useful for expanding waypoint markers into full narrative entries.
                </div>
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
                    entryType === 'waypoint'
                      ? 'e.g., Rest Stop - Highway 87'
                      : isStandalone
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium mb-2 text-[#202020] dark:text-[#e5e5e5]">
                      ENTRY DATE
                      <span className="text-[#ac6d46] ml-1">*REQUIRED</span>
                    </label>
                    <input
                      type="date"
                      className="w-full px-4 py-3 border-2 border-[#b5bcc4] dark:border-[#3a3a3a] focus:border-[#ac6d46] outline-none text-sm font-mono dark:bg-[#2a2a2a] dark:text-[#e5e5e5]"
                      value={entryDate}
                      onChange={(e) => setEntryDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-2 text-[#202020] dark:text-[#e5e5e5]">
                      TIME
                      <span className="text-[#616161] dark:text-[#b5bcc4] ml-1 font-normal">(optional)</span>
                    </label>
                    <input
                      type="time"
                      className="w-full px-4 py-3 border-2 border-[#b5bcc4] dark:border-[#3a3a3a] focus:border-[#ac6d46] outline-none text-sm font-mono dark:bg-[#2a2a2a] dark:text-[#e5e5e5]"
                      placeholder="--:--"
                    />
                  </div>
                </div>
                {entryDate && new Date(entryDate) < new Date(new Date().toISOString().split('T')[0]) && (
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
                    value={entryLocation}
                    onChange={(e) => setEntryLocation(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-2 text-[#202020] dark:text-[#e5e5e5]">
                    GPS COORDINATES
                    <span className="text-[#ac6d46] ml-1">*REQUIRED</span>
                  </label>
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
              </div>
              
              {/* Location Details - Only for data-log and standard */}
              {(entryType === 'data-log' || entryType === 'standard') && (
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium mb-2 text-[#202020] dark:text-[#e5e5e5]">
                      ELEVATION (meters)
                      <span className="text-[#616161] dark:text-[#b5bcc4] ml-1">(Optional)</span>
                    </label>
                    <input
                      type="number"
                      className="w-full px-4 py-3 border-2 border-[#b5bcc4] dark:border-[#3a3a3a] focus:border-[#ac6d46] outline-none text-sm font-mono dark:bg-[#2a2a2a] dark:text-[#e5e5e5]"
                      placeholder="e.g., 702"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-2 text-[#202020] dark:text-[#e5e5e5]">
                      ACCURACY (meters)
                      <span className="text-[#616161] dark:text-[#b5bcc4] ml-1">(Optional)</span>
                    </label>
                    <input
                      type="number"
                      className="w-full px-4 py-3 border-2 border-[#b5bcc4] dark:border-[#3a3a3a] focus:border-[#ac6d46] outline-none text-sm font-mono dark:bg-[#2a2a2a] dark:text-[#e5e5e5]"
                      placeholder="e.g., 10"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-2 text-[#202020] dark:text-[#e5e5e5]">
                      TIMEZONE
                      <span className="text-[#616161] dark:text-[#b5bcc4] ml-1">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 border-2 border-[#b5bcc4] dark:border-[#3a3a3a] focus:border-[#ac6d46] outline-none text-sm font-mono dark:bg-[#2a2a2a] dark:text-[#e5e5e5]"
                      placeholder="e.g., UTC+5"
                    />
                  </div>
                </div>
              )}
              


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

Note: Standalone entries cannot receive sponsorships and won't appear in expedition timelines.` : `Write your journal entry here...

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
                      <span className={wordCount < 100 || wordCount > 1000 ? 'text-red-600 dark:text-red-400 font-bold' : ''}>
                        Word count: {wordCount} / 10,000 {wordCount > 0 && wordCount < 100 && `(Minimum: 100)`} {wordCount > 1000 && `(Maximum: 1,000)`}
                      </span>
                      <span>Character count: {standardContent.length} / 50,000</span>
                    </div>
                    {wordCount > 0 && (wordCount < 100 || wordCount > 1000) && (
                      <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 border-l-2 border-red-600 text-xs text-red-700 dark:text-red-400">
                        <div className="font-bold mb-1">WORD COUNT REQUIREMENT:</div>
                        {wordCount < 100 && <div>• Your entry must be at least 100 words. Current: {wordCount} words ({100 - wordCount} more needed)</div>}
                        {wordCount > 1000 && <div>• Your entry must not exceed 1,000 words. Current: {wordCount} words ({wordCount - 1000} over limit)</div>}
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
                          {isPro ? 'Pro: up to 5 photos' : 'Basic: up to 2 photos'}
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
                                  className="w-16 h-16 object-cover border border-[#b5bcc4] dark:border-[#3a3a3a] flex-shrink-0"
                                  width={64}
                                  height={64}
                                />
                              ) : (
                                <div className="w-16 h-16 bg-[#e5e5e5] dark:bg-[#3a3a3a] flex items-center justify-center flex-shrink-0">
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

                            {/* Actions */}
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
                                EDIT
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
                          JPG, PNG, WEBP • Max 15MB
                        </span>
                      </div>
                    </label>
                  </div>
                </>
              )}

              {/* PHOTO ESSAY FIELDS */}
              {entryType === 'photo-essay' && (
                <>
                  <div>
                    <label className="block text-xs font-medium mb-2 text-[#202020] dark:text-[#e5e5e5]">
                      PHOTO UPLOADS
                      <span className="text-[#ac6d46] ml-1">*REQUIRED - Minimum 3 photos</span>
                    </label>
                    <div className="border-2 border-dashed border-[#ac6d46] dark:border-[#8a5738] p-8 text-center hover:border-[#8a5738] transition-all bg-[#fef9f5] dark:bg-[#2a2420]">
                      <div className="text-sm text-[#616161] dark:text-[#b5bcc4] mb-3">
                        Drag and drop photos here or click to browse
                      </div>
                      <button
                        type="button"
                        className="px-6 py-2 bg-[#ac6d46] text-white hover:bg-[#8a5738] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] text-sm"
                      >
                        BROWSE PHOTOS
                      </button>
                      <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-3 font-mono">
                        Accepted: JPG, PNG • Recommended: High resolution
                      </div>
                    </div>
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
                      value={photoEssayContent}
                      onChange={(e) => setPhotoEssayContent(e.target.value)}
                    />
                    <div className="flex justify-between text-xs text-[#616161] dark:text-[#b5bcc4] mt-1 font-mono">
                      <span className={wordCount < 100 || wordCount > 1000 ? 'text-red-600 dark:text-red-400 font-bold' : ''}>
                        Word count: {wordCount} / 3,000 {wordCount > 0 && wordCount < 100 && `(Minimum: 100)`} {wordCount > 1000 && `(Maximum: 1,000)`}
                      </span>
                      <span>Character count: {photoEssayContent.length} / 15,000</span>
                    </div>
                    {wordCount > 0 && (wordCount < 100 || wordCount > 1000) && (
                      <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 border-l-2 border-red-600 text-xs text-red-700 dark:text-red-400">
                        <div className="font-bold mb-1">WORD COUNT REQUIREMENT:</div>
                        {wordCount < 100 && <div>• Your entry must be at least 100 words. Current: {wordCount} words ({100 - wordCount} more needed)</div>}
                        {wordCount > 1000 && <div>• Your entry must not exceed 1,000 words. Current: {wordCount} words ({wordCount - 1000} over limit)</div>}
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* DATA LOG FIELDS */}
              {entryType === 'data-log' && (
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
                        />
                      </div>
                      <div>
                        <label className="block text-xs mb-2 text-[#616161] dark:text-[#b5bcc4]">Humidity (%)</label>
                        <input
                          type="number"
                          className="w-full px-3 py-2 border border-[#b5bcc4] dark:border-[#3a3a3a] focus:border-[#ac6d46] outline-none text-xs font-mono dark:bg-[#202020] dark:text-[#e5e5e5]"
                          placeholder="e.g., 65"
                        />
                      </div>
                      <div>
                        <label className="block text-xs mb-2 text-[#616161] dark:text-[#b5bcc4]">Wind Speed (km/h)</label>
                        <input
                          type="number"
                          step="0.1"
                          className="w-full px-3 py-2 border border-[#b5bcc4] dark:border-[#3a3a3a] focus:border-[#ac6d46] outline-none text-xs font-mono dark:bg-[#202020] dark:text-[#e5e5e5]"
                          placeholder="e.g., 12.5"
                        />
                      </div>
                      <div>
                        <label className="block text-xs mb-2 text-[#616161] dark:text-[#b5bcc4]">Pressure (hPa)</label>
                        <input
                          type="number"
                          className="w-full px-3 py-2 border border-[#b5bcc4] dark:border-[#3a3a3a] focus:border-[#ac6d46] outline-none text-xs font-mono dark:bg-[#202020] dark:text-[#e5e5e5]"
                          placeholder="e.g., 1013"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border-2 border-[#4676ac] p-4 dark:bg-[#2a2a2a]">
                    <div className="text-xs font-bold mb-3 dark:text-[#e5e5e5]">ACTIVITY METRICS:</div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs mb-2 text-[#616161] dark:text-[#b5bcc4]">Distance Covered (km)</label>
                        <input
                          type="number"
                          step="0.1"
                          className="w-full px-3 py-2 border border-[#b5bcc4] dark:border-[#3a3a3a] focus:border-[#ac6d46] outline-none text-xs font-mono dark:bg-[#202020] dark:text-[#e5e5e5]"
                          placeholder="e.g., 87.3"
                        />
                      </div>
                      <div>
                        <label className="block text-xs mb-2 text-[#616161] dark:text-[#b5bcc4]">Elevation Gain (m)</label>
                        <input
                          type="number"
                          className="w-full px-3 py-2 border border-[#b5bcc4] dark:border-[#3a3a3a] focus:border-[#ac6d46] outline-none text-xs font-mono dark:bg-[#202020] dark:text-[#e5e5e5]"
                          placeholder="e.g., 450"
                        />
                      </div>
                      <div>
                        <label className="block text-xs mb-2 text-[#616161] dark:text-[#b5bcc4]">Duration (hours)</label>
                        <input
                          type="number"
                          step="0.1"
                          className="w-full px-3 py-2 border border-[#b5bcc4] dark:border-[#3a3a3a] focus:border-[#ac6d46] outline-none text-xs font-mono dark:bg-[#202020] dark:text-[#e5e5e5]"
                          placeholder="e.g., 6.5"
                        />
                      </div>
                      <div>
                        <label className="block text-xs mb-2 text-[#616161] dark:text-[#b5bcc4]">Average Speed (km/h)</label>
                        <input
                          type="number"
                          step="0.1"
                          className="w-full px-3 py-2 border border-[#b5bcc4] dark:border-[#3a3a3a] focus:border-[#ac6d46] outline-none text-xs font-mono dark:bg-[#202020] dark:text-[#e5e5e5]"
                          placeholder="e.g., 13.4"
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
                      value={dataLogContent}
                      onChange={(e) => setDataLogContent(e.target.value)}
                    />
                    <div className="flex justify-between text-xs text-[#616161] dark:text-[#b5bcc4] mt-1 font-mono">
                      <span className={wordCount < 100 || wordCount > 1000 ? 'text-red-600 dark:text-red-400 font-bold' : ''}>
                        Word count: {wordCount} / 5,000 {wordCount > 0 && wordCount < 100 && `(Minimum: 100)`} {wordCount > 1000 && `(Maximum: 1,000)`}
                      </span>
                      <span>Character count: {dataLogContent.length} / 25,000</span>
                    </div>
                    {wordCount > 0 && (wordCount < 100 || wordCount > 1000) && (
                      <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 border-l-2 border-red-600 text-xs text-red-700 dark:text-red-400">
                        <div className="font-bold mb-1">WORD COUNT REQUIREMENT:</div>
                        {wordCount < 100 && <div>• Your entry must be at least 100 words. Current: {wordCount} words ({100 - wordCount} more needed)</div>}
                        {wordCount > 1000 && <div>• Your entry must not exceed 1,000 words. Current: {wordCount} words ({wordCount - 1000} over limit)</div>}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-2 text-[#202020] dark:text-[#e5e5e5]">
                      DATA FILES / CHARTS
                      <span className="text-[#616161] dark:text-[#b5bcc4] ml-1">(Optional)</span>
                    </label>
                    <div className="border-2 border-dashed border-[#b5bcc4] dark:border-[#3a3a3a] p-8 text-center hover:border-[#ac6d46] transition-all">
                      <div className="text-sm text-[#616161] dark:text-[#b5bcc4] mb-3">
                        Upload CSV, Excel, or image files with charts/graphs
                      </div>
                      <button
                        type="button"
                        className="px-6 py-2 bg-[#4676ac] text-white hover:bg-[#365a87] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#4676ac] text-sm"
                      >
                        BROWSE FILES
                      </button>
                      <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-3 font-mono">
                        Accepted: CSV, XLSX, PNG, JPG • Max 25MB per file
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* WAYPOINT FIELDS */}
              {entryType === 'waypoint' && (
                <>
                  <div>
                    <label className="block text-xs font-medium mb-2 text-[#202020] dark:text-[#e5e5e5]">
                      WAYPOINT NOTES
                      <span className="text-[#ac6d46] ml-1">*REQUIRED</span>
                    </label>
                    <textarea
                      className="w-full px-4 py-3 border-2 border-[#b5bcc4] dark:border-[#3a3a3a] focus:border-[#ac6d46] outline-none text-sm font-mono leading-relaxed dark:bg-[#2a2a2a] dark:text-[#e5e5e5]"
                      rows={4}
                      placeholder={`Brief note about this location...

Examples:
• 'Rest stop - good water source'
• 'Border crossing checkpoint'  
• 'Scenic viewpoint overlooking valley'
• 'Met local artisan - pottery workshop'`}
                    />
                    <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1 font-mono">
                      Character count: 0 / 500
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-2 text-[#202020] dark:text-[#e5e5e5]">
                      QUICK PHOTO
                      <span className="text-[#616161] dark:text-[#b5bcc4] ml-1">(Optional - single photo only)</span>
                    </label>
                    <div className="border-2 border-dashed border-[#b5bcc4] dark:border-[#3a3a3a] p-6 text-center hover:border-[#ac6d46] transition-all">
                      <div className="text-sm text-[#616161] dark:text-[#b5bcc4] mb-2">
                        Add one photo to mark this location
                      </div>
                      <button
                        type="button"
                        className="px-4 py-2 bg-[#4676ac] text-white hover:bg-[#365a87] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#4676ac] text-xs"
                      >
                        UPLOAD PHOTO
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Tags - ALL TYPES */}
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

              {/* Metadata - Only for standard */}
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
                      />
                    </div>
                    <div>
                      <label className="block text-xs mb-2 text-[#616161] dark:text-[#b5bcc4]">Distance Traveled (km)</label>
                      <input
                        type="number"
                        className="w-full px-3 py-2 border border-[#b5bcc4] dark:border-[#3a3a3a] focus:border-[#ac6d46] outline-none text-xs font-mono dark:bg-[#202020] dark:text-[#e5e5e5]"
                        placeholder="e.g., 87"
                      />
                    </div>
                    <div>
                      <label className="block text-xs mb-2 text-[#616161] dark:text-[#b5bcc4]">Mood/Energy Level</label>
                      <select className="w-full px-3 py-2 border border-[#b5bcc4] dark:border-[#3a3a3a] focus:border-[#ac6d46] outline-none text-xs dark:bg-[#202020] dark:text-[#e5e5e5]">
                        <option>Not specified</option>
                        <option>High Energy</option>
                        <option>Good</option>
                        <option>Moderate</option>
                        <option>Low</option>
                        <option>Exhausted</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs mb-2 text-[#616161] dark:text-[#b5bcc4]">Expenses (USD)</label>
                      <input
                        type="number"
                        className="w-full px-3 py-2 border border-[#b5bcc4] dark:border-[#3a3a3a] focus:border-[#ac6d46] outline-none text-xs font-mono dark:bg-[#202020] dark:text-[#e5e5e5]"
                        placeholder="e.g., 45.50"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Sponsor Update - Not for waypoints */}
              {entryType !== 'waypoint' && (
                <div className="border-2 border-[#ac6d46] p-4 bg-[#f5f5f5] dark:bg-[#2a2a2a]">
                  <div className="flex items-start gap-2 mb-3">
                    <input type="checkbox" id="sponsor-update" className="mt-1" />
                    <label htmlFor="sponsor-update" className="text-xs">
                      <strong className="text-[#202020] dark:text-[#e5e5e5]">Send sponsor notification:</strong>{' '}
                      <span className="text-[#616161] dark:text-[#b5bcc4]">
                        Email your {expedition?.sponsorsCount || 0} sponsors about this new entry
                      </span>
                    </label>
                  </div>
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
              )}

              {/* Privacy Settings - ALL TYPES */}
              <div className="border-2 border-[#202020] dark:border-[#616161] p-4 dark:bg-[#2a2a2a]">
                <div className="text-xs font-bold mb-3 dark:text-[#e5e5e5]">ENTRY VISIBILITY:</div>
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
                      id="vis-sponsors"
                      className="mt-1"
                      checked={visibility === 'sponsors-only'}
                      onChange={() => setVisibility('sponsors-only')}
                    />
                    <label htmlFor="vis-sponsors" className="text-xs">
                      <strong className="text-[#202020] dark:text-[#e5e5e5]">Sponsors Only:</strong>{' '}
                      <span className="text-[#616161] dark:text-[#b5bcc4]">Only visible to expedition sponsors</span>
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

              {/* Action Buttons - ALL TYPES */}
              <div className="flex gap-3 pt-6 border-t-2 border-[#202020] dark:border-[#616161]">
                <button
                  type="button"
                  onClick={() => performAutoSave()}
                  disabled={isSubmitting || isAutoSaving}
                  className="px-6 py-3 border-2 border-[#202020] dark:border-[#616161] dark:text-[#e5e5e5] hover:bg-[#95a2aa] dark:hover:bg-[#4a4a4a] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#616161] disabled:opacity-50 flex items-center gap-2"
                >
                  {isAutoSaving ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      SAVING...
                    </>
                  ) : lastSaved ? (
                    <>SAVED {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</>
                  ) : (
                    'SAVE DRAFT'
                  )}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-[#ac6d46] text-white font-bold hover:bg-[#8a5738] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
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
                  <div className="font-bold dark:text-[#e5e5e5]">{calculateDaysActive(expedition.startDate)}</div>
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
                  Photo Essay
                  <span className="text-xs text-[#ac6d46]">PRO</span>
                </div>
                <div className="text-[#616161] dark:text-[#b5bcc4]">Visual storytelling with image galleries and captions</div>
              </div>
              <div>
                <div className="font-bold text-[#202020] dark:text-[#e5e5e5] mb-1 flex items-center gap-1">
                  Data Log
                  <span className="text-xs text-[#ac6d46]">PRO</span>
                </div>
                <div className="text-[#616161] dark:text-[#b5bcc4]">Technical documentation with environmental and activity metrics</div>
              </div>
              <div>
                <div className="font-bold text-[#202020] dark:text-[#e5e5e5] mb-1 flex items-center gap-1">
                  Waypoint
                  <span className="text-xs text-[#ac6d46]">PRO</span>
                </div>
                <div className="text-[#616161] dark:text-[#b5bcc4]">Quick location marker with brief notes</div>
              </div>
            </div>
            {!isPro && (
              <div className="mt-3 pt-3 border-t border-[#202020] dark:border-[#616161] text-xs text-[#616161] dark:text-[#b5bcc4]">
                <span className="font-bold text-[#ac6d46]">NOTE:</span> Photo Essay, Data Log, and Waypoint entries require Explorer Pro. 
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
            // Don't close modal here - user must click CONFIRM LOCATION
          }}
          onClose={() => setShowMap(false)}
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
              {/* Photo Name Display */}
              <div className="p-3 bg-[#f5f5f5] dark:bg-[#2a2a2a] border-l-2 border-[#4676ac]">
                <div className="text-xs font-bold text-[#202020] dark:text-[#e5e5e5] mb-1">PHOTO:</div>
                <div className="text-xs text-[#616161] dark:text-[#b5bcc4] font-mono">
                  {uploadedMedia.find(m => m.id === selectedMediaForEdit)?.name}
                </div>
              </div>

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
    </div>
  );
}