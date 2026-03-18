'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname, useParams } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { useProFeatures } from '@/app/hooks/useProFeatures';
import { Upload, ArrowLeft, Lock, Loader2 } from 'lucide-react';
import { DatePicker } from '@/app/components/DatePicker';
import { expeditionApi, uploadApi } from '@/app/services/api';
import { formatDateTime } from '@/app/utils/dateFormat';
import { GEO_REGION_GROUPS } from '@/app/utils/geoRegions';

export function ExpeditionQuickEntryPage() {
  const { isAuthenticated, user } = useAuth();
  const { isPro } = useProFeatures();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams<{ expeditionId?: string }>();
  const expeditionId = params?.expeditionId;
  const isEditMode = !!expeditionId;
  const [isLoading, setIsLoading] = useState(isEditMode);
  // Form state
  const [title, setTitle] = useState('');
  const [regions, setRegions] = useState<string[]>([]);
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [sponsorshipGoal, setSponsorshipGoal] = useState('');
  const [sponsorshipsEnabled, setSponsorshipsEnabled] = useState(false);
  const [notesVisibility, setNotesVisibility] = useState<'public' | 'sponsor'>('public');
  const [notesAccessThreshold, setNotesAccessThreshold] = useState('');
  const [expeditionVisibility, setExpeditionVisibility] = useState<'public' | 'off-grid' | 'private'>('public');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [expectedDuration, setExpectedDuration] = useState('');
  const [currentLocation, setCurrentLocation] = useState('');
  const [coverPhotoPreview, setCoverPhotoPreview] = useState<string | null>(null);
  const [coverPhotoUrl, setCoverPhotoUrl] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Auto-compute status based on dates
  const computeStatus = () => {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    
    if (!startDate) return 'planned';
    
    if (endDate && endDate <= today) {
      return 'completed';
    }
    
    if (startDate > today) {
      return 'planned';
    }
    
    return 'active';
  };

  const status = computeStatus();

  // Disable sponsorships when status changes to completed
  useEffect(() => {
    if (status === 'completed') {
      setSponsorshipsEnabled(false);
    }
  }, [status]);

  // Load existing expedition data in edit mode
  useEffect(() => {
    if (!isEditMode || !expeditionId) return;
    (async () => {
      try {
        const exp = await expeditionApi.getById(expeditionId);
        // Ownership check: redirect if this expedition doesn't belong to the logged-in user
        if (user && exp.explorerUsername && exp.explorerUsername !== user.username) {
          router.replace(`/expedition/${expeditionId}`);
          return;
        }
        setTitle(exp.title || '');
        setDescription(exp.description || '');
        setCategory(exp.category || '');
        setRegions(exp.region ? exp.region.split(', ').filter(Boolean) : []);
        setTags(exp.tags ? (Array.isArray(exp.tags) ? exp.tags.join(', ') : exp.tags) : '');
        setStartDate(exp.startDate ? exp.startDate.slice(0, 10) : '');
        setEndDate(exp.endDate ? exp.endDate.slice(0, 10) : '');
        if (exp.startDate && exp.endDate) {
          const s = new Date(exp.startDate);
          const e = new Date(exp.endDate);
          const diff = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
          if (diff >= 0) setExpectedDuration(diff.toString());
        }
        setExpeditionVisibility((exp.visibility as 'public' | 'off-grid' | 'private') || 'public');
        if (exp.coverImage) {
          setCoverPhotoUrl(exp.coverImage);
          setCoverPhotoPreview(exp.coverImage);
        }
        if (exp.goal && Number(exp.goal) > 0) {
          setSponsorshipsEnabled(true);
          setSponsorshipGoal(String(exp.goal));
        }
        setNotesVisibility((exp.notesVisibility as 'public' | 'sponsor') || 'public');
        if (exp.notesAccessThreshold && Number(exp.notesAccessThreshold) > 0) {
          setNotesAccessThreshold(String(exp.notesAccessThreshold));
        }
      } catch {
        setSubmitError('Failed to load expedition data');
      } finally {
        setIsLoading(false);
      }
    })();
  }, [isEditMode, expeditionId]);

  // Calculate end date from start date + duration
  const handleDurationChange = (days: string) => {
    setExpectedDuration(days);
    
    if (days && startDate) {
      const start = new Date(startDate);
      const durationNum = parseInt(days);
      if (!isNaN(durationNum) && durationNum > 0) {
        const end = new Date(start);
        end.setDate(end.getDate() + durationNum);
        setEndDate(end.toISOString().split('T')[0]);
      }
    }
  };

  // Calculate duration from start and end dates
  const handleEndDateChange = (date: string) => {
    // Don't allow end date before start date
    if (date && startDate && date < startDate) return;

    setEndDate(date);

    if (date && startDate) {
      const start = new Date(startDate);
      const end = new Date(date);
      const diffTime = end.getTime() - start.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays >= 0) {
        setExpectedDuration(diffDays.toString());
      }
    }
  };

  // Update duration when start date changes
  const handleStartDateChange = (date: string) => {
    // Recalculate end date if duration is set
    if (expectedDuration && date) {
      const start = new Date(date);
      const durationNum = parseInt(expectedDuration);
      if (!isNaN(durationNum) && durationNum > 0) {
        const end = new Date(start);
        end.setDate(end.getDate() + durationNum);
        setStartDate(date);
        setEndDate(end.toISOString().split('T')[0]);
        return;
      }
    }

    // If new start date is after current end date, clear end date and duration
    if (endDate && date && date > endDate) {
      setStartDate(date);
      setEndDate('');
      setExpectedDuration('');
      return;
    }

    setStartDate(date);

    if (endDate && date) {
      // Recalculate duration if end date is set
      const start = new Date(date);
      const end = new Date(endDate);
      const diffTime = end.getTime() - start.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays >= 0) {
        setExpectedDuration(diffDays.toString());
      }
    }
  };

  const handleCreate = async (createFirstEntry: boolean) => {
    if (!title.trim()) {
      setSubmitError('Title is required');
      return;
    }
    if (!category) {
      setSubmitError('Category is required');
      return;
    }
    if (!startDate) {
      setSubmitError('Start date is required');
      return;
    }
    if (!endDate) {
      setSubmitError('End date or duration is required');
      return;
    }
    if (regions.length === 0) {
      setSubmitError('At least one region is required');
      return;
    }
    if (!description.trim() || description.trim().length < 100) {
      setSubmitError('Description is required (minimum 100 characters)');
      return;
    }
    if (!coverPhotoUrl && !isEditMode) {
      setSubmitError('Cover photo is required');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const parsedTags = tags.split(',').map(t => t.trim()).filter(Boolean);
      const payload = {
        title: title.trim(),
        description: description.trim(),
        visibility: expeditionVisibility,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        region: regions.join(', '),
        category: category || undefined,
        tags: parsedTags.length > 0 ? parsedTags : undefined,
        goal: sponsorshipsEnabled && sponsorshipGoal ? parseInt(sponsorshipGoal) : undefined,
        notesAccessThreshold: notesVisibility === 'sponsor' && notesAccessThreshold ? Number(notesAccessThreshold) : 0,
        notesVisibility,
        coverImage: coverPhotoUrl || undefined,
        ...(isEditMode ? {} : { status }),
      };

      if (isEditMode && expeditionId) {
        await expeditionApi.update(expeditionId, payload);
        router.push(`/expedition/${expeditionId}`);
      } else {
        const result = await expeditionApi.create(payload);
        const expeditionPublicId = (result as any).expeditionId || (result as any).id || (result as any).publicId;

        if (createFirstEntry) {
          router.push(`/log-entry/${expeditionPublicId}`);
        } else {
          router.push(`/expedition/${expeditionPublicId}`);
        }
      }
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to ' + (isEditMode ? 'update' : 'create') + ' expedition');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle cover photo selection and upload
  const handleCoverPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
    const MAX_COVER_SIZE = 25 * 1024 * 1024;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setSubmitError('Invalid file type. Please use JPG, PNG, or WEBP');
      e.target.value = '';
      return;
    }
    if (file.size > MAX_COVER_SIZE) {
      setSubmitError('Cover photo must be less than 25MB');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setCoverPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    setUploadingCover(true);
    setSubmitError(null);
    try {
      const response = await uploadApi.upload(file);
      setCoverPhotoUrl(response.original);
    } catch {
      setSubmitError('Failed to upload cover photo');
      setCoverPhotoPreview(null);
      setCoverPhotoUrl(null);
    } finally {
      setUploadingCover(false);
    }
  };

  // Loading state for edit mode
  if (isLoading) {
    return (
      <div className="max-w-[1400px] mx-auto px-6 py-12">
        <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-[#ac6d46]" />
          <div className="text-sm text-[#616161] dark:text-[#b5bcc4] font-mono">Loading expedition data...</div>
        </div>
      </div>
    );
  }

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
              You must be logged in to create expeditions. Please log in or register to start your journey.
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

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-12">
      {/* Page Header */}
      <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-6 mb-6">
        <div className="flex items-center gap-4 mb-4 border-b-2 border-[#202020] dark:border-[#616161] pb-2">
          <Link
            href={isEditMode && expeditionId ? `/expedition/${expeditionId}` : '/select-expedition'}
            className="p-2 hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#616161]"
          >
            <ArrowLeft className="w-5 h-5 dark:text-[#e5e5e5]" />
          </Link>
          <h1 className="text-2xl font-bold flex-1 dark:text-[#e5e5e5]">{isEditMode ? 'EDIT EXPEDITION' : 'EXPEDITION QUICK ENTRY'}</h1>
          <span className="text-xs text-[#616161] dark:text-[#b5bcc4] font-mono">
            Session: {formatDateTime(new Date())}
          </span>
        </div>
        
        <div className="bg-[#f5f5f5] dark:bg-[#2a2a2a] p-4 border-l-2 border-[#ac6d46]">
          <div className="text-xs font-bold mb-2 dark:text-[#e5e5e5]">{isEditMode ? 'UPDATE EXPEDITION DETAILS:' : 'STREAMLINED EXPEDITION CREATION:'}</div>
          <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">
            {isEditMode
              ? 'Update your expedition details below. Changes will be reflected immediately across all journal views.'
              : 'Create a new expedition quickly with all essential fields in one form. Perfect for expeditions without complex route planning. Fill out the form below and launch your expedition to begin documenting your journey.'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-6">
            <form onSubmit={(e) => { e.preventDefault(); handleCreate(false); }} className="space-y-6">
              {/* Error Display */}
              {submitError && (
                <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-500 p-4 text-sm text-red-700 dark:text-red-400">
                  {submitError}
                </div>
              )}

              {/* Expedition Title */}
              <div>
                <label className="block text-xs font-medium mb-2 text-[#202020] dark:text-[#e5e5e5]">
                  EXPEDITION TITLE
                  <span className="text-[#ac6d46] ml-1">*REQUIRED</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-[#b5bcc4] dark:border-[#3a3a3a] focus:border-[#ac6d46] outline-none text-sm dark:bg-[#2a2a2a] dark:text-[#e5e5e5]"
                  placeholder="e.g., Cycling the Silk Road"
                />
                <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1">
                  This will be the public title of your expedition
                </div>
              </div>

              {/* Region and Category */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-2 text-[#202020] dark:text-[#e5e5e5]">
                    EXPEDITION REGION <span className="text-[#ac6d46]">*</span>
                  </label>
                  <select
                    value=""
                    onChange={(e) => {
                      if (e.target.value && !regions.includes(e.target.value)) {
                        setRegions(prev => [...prev, e.target.value]);
                      }
                    }}
                    className="w-full px-4 py-3 border-2 border-[#b5bcc4] dark:border-[#3a3a3a] focus:border-[#ac6d46] outline-none text-sm dark:bg-[#2a2a2a] dark:text-[#e5e5e5]"
                  >
                    <option value="">{regions.length > 0 ? '+ Add another region' : '-- Select region --'}</option>
                    {GEO_REGION_GROUPS.map(group => (
                      <optgroup key={group.label} label={group.label}>
                        {group.regions.filter(r => !regions.includes(r)).map(r => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  {regions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {regions.map(r => (
                        <span key={r} className="inline-flex items-center gap-1 px-2 py-1 bg-[#ac6d46] text-white text-xs font-bold">
                          {r}
                          <button type="button" onClick={() => setRegions(prev => prev.filter(v => v !== r))} className="hover:text-white/70">×</button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1">
                    UN geographic sub-region • Select multiple for cross-region expeditions
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-2 text-[#202020] dark:text-[#e5e5e5]">
                    CATEGORY <span className="text-[#ac6d46]">*</span>
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-[#b5bcc4] dark:border-[#3a3a3a] focus:border-[#ac6d46] outline-none text-sm dark:bg-[#2a2a2a] dark:text-[#e5e5e5]"
                  >
                    <option value="">Select category...</option>
                    <option>Culture & Photography</option>
                    <option>Scientific Research</option>
                    <option>Documentary</option>
                    <option>Adventure & Exploration</option>
                    <option>Environmental</option>
                    <option>Historical Documentation</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>

              {/* Start Date and Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-2 text-[#202020] dark:text-[#e5e5e5]">
                    START DATE
                    <span className="text-[#ac6d46] ml-1">*REQUIRED</span>
                  </label>
                  <DatePicker
                    className="w-full px-4 py-3 border-2 border-[#b5bcc4] dark:border-[#3a3a3a] focus:border-[#ac6d46] outline-none text-sm dark:bg-[#2a2a2a] dark:text-[#e5e5e5]"
                    value={startDate}
                    onChange={handleStartDateChange}
                    max={endDate || undefined}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-2 text-[#202020] dark:text-[#e5e5e5]">
                    STATUS (AUTO-COMPUTED)
                  </label>
                  <div className="px-4 py-3 border-2 border-[#b5bcc4] dark:border-[#3a3a3a] bg-[#f5f5f5] dark:bg-[#2a2a2a] text-sm font-bold dark:text-[#e5e5e5] uppercase">
                    {status}
                  </div>
                </div>
              </div>

              {/* End Date and Duration */}
              <div>
                <label className="block text-xs font-medium mb-2 text-[#202020] dark:text-[#e5e5e5]">
                  END DATE OR EXPECTED DURATION
                  <span className="text-[#ac6d46] ml-1">*REQUIRED</span>
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-[#616161] dark:text-[#b5bcc4] mb-2">
                      End Date
                    </label>
                    <DatePicker
                      className="w-full px-4 py-3 border-2 border-[#b5bcc4] dark:border-[#3a3a3a] focus:border-[#ac6d46] outline-none text-sm dark:bg-[#2a2a2a] dark:text-[#e5e5e5]"
                      value={endDate}
                      onChange={handleEndDateChange}
                      min={startDate || undefined}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#616161] dark:text-[#b5bcc4] mb-2">
                      OR Duration (Days)
                    </label>
                    <input
                      type="number"
                      className="w-full px-4 py-3 border-2 border-[#b5bcc4] dark:border-[#3a3a3a] focus:border-[#ac6d46] outline-none text-sm font-mono dark:bg-[#2a2a2a] dark:text-[#e5e5e5]"
                      placeholder="e.g., 180"
                      value={expectedDuration}
                      onChange={(e) => handleDurationChange(e.target.value)}
                    />
                  </div>
                </div>
                <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-2">
                  Provide either an exact end date or expected duration • End date will be calculated if duration is provided
                </div>
              </div>

              {/* Current Location - Only for ACTIVE expeditions */}
              {status === 'active' && (
                <div>
                  <label className="block text-xs font-medium mb-2 text-[#202020] dark:text-[#e5e5e5]">
                    CURRENT LOCATION
                    <span className="text-[#616161] dark:text-[#b5bcc4] ml-1">(Optional)</span>
                    <span className="ml-2 px-2 py-0.5 bg-[#4676ac] text-white text-xs font-bold">ACTIVE EXPEDITION</span>
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 border-2 border-[#b5bcc4] dark:border-[#3a3a3a] focus:border-[#ac6d46] outline-none text-sm dark:bg-[#2a2a2a] dark:text-[#e5e5e5]"
                    placeholder="e.g., Samarkand, Uzbekistan or coordinates: 39.6270°N, 66.9750°E"
                    value={currentLocation}
                    onChange={(e) => setCurrentLocation(e.target.value)}
                  />
                  <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1">
                    Track your current position during an active expedition • Accepts city names, regions, or GPS coordinates
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <label className="block text-xs font-medium mb-2 text-[#202020] dark:text-[#e5e5e5]">
                  EXPEDITION DESCRIPTION <span className="text-[#ac6d46]">*</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-[#b5bcc4] dark:border-[#3a3a3a] focus:border-[#ac6d46] outline-none text-sm dark:bg-[#2a2a2a] dark:text-[#e5e5e5]"
                  rows={6}
                  placeholder="Describe your expedition, goals, and what you plan to document..."
                />
                <div className={`text-xs mt-1 font-mono ${description.trim().length < 100 ? 'text-[#ac6d46]' : 'text-[#616161] dark:text-[#b5bcc4]'}`}>
                  {description.length} / 1000 characters {description.trim().length < 100 && `(${100 - description.trim().length} more needed)`}
                </div>
              </div>

              {/* Cover Photo */}
              <div>
                <label className="block text-xs font-medium mb-2 text-[#202020] dark:text-[#e5e5e5]">
                  COVER PHOTO
                  <span className="text-[#ac6d46] ml-1">*REQUIRED</span>
                </label>
                <label className="block border-2 border-dashed border-[#ac6d46] p-8 text-center hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] cursor-pointer transition-all">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCoverPhotoChange}
                    className="hidden"
                  />
                  {coverPhotoPreview ? (
                    <div className="relative">
                      <Image src={coverPhotoPreview} alt="Cover preview" className="max-h-32 mx-auto object-cover" width={0} height={0} sizes="100vw" style={{ width: 'auto', height: 'auto', maxHeight: '8rem' }} />
                      {uploadingCover && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <Loader2 className="w-8 h-8 text-white animate-spin" />
                        </div>
                      )}
                      <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-2">
                        {uploadingCover ? 'Uploading...' : coverPhotoUrl ? 'Uploaded successfully • Click to change' : 'Click to change'}
                      </div>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 mx-auto mb-2 text-[#ac6d46]" />
                      <div className="text-sm font-bold text-[#202020] dark:text-[#e5e5e5] mb-1">
                        UPLOAD COVER PHOTO
                      </div>
                      <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">
                        Click or drag file here • JPG, PNG, WEBP • Max 25MB • Recommended: 1200x600px
                      </div>
                    </>
                  )}
                </label>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-xs font-medium mb-2 text-[#202020] dark:text-[#e5e5e5]">
                  TAGS
                  <span className="text-[#616161] dark:text-[#b5bcc4] ml-1">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-[#b5bcc4] dark:border-[#3a3a3a] focus:border-[#ac6d46] outline-none text-sm font-mono dark:bg-[#2a2a2a] dark:text-[#e5e5e5]"
                  placeholder="e.g., cycling, photography, culture, silk-road"
                />
                <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1">
                  Comma-separated • Max 10 tags
                </div>
              </div>

              {/* Sponsorships */}
              <div className="border-2 border-[#ac6d46] p-4 bg-[#f5f5f5] dark:bg-[#2a2a2a]">
                <label className="block text-xs font-medium mb-3 text-[#202020] dark:text-[#e5e5e5] flex items-center gap-2">
                  ENABLE SPONSORSHIPS
                  <span className="text-xs text-[#ac6d46]">PRO</span>
                  <span className="text-[#616161] dark:text-[#b5bcc4] ml-1">(Optional)</span>
                </label>
                <div className="flex items-start gap-2 mb-3">
                  <input 
                    type="checkbox" 
                    id="enable-sponsorships" 
                    className="mt-1" 
                    checked={sponsorshipsEnabled}
                    onChange={(e) => {
                      setSponsorshipsEnabled(e.target.checked);
                      if (e.target.checked) {
                        setNotesVisibility('sponsor');
                        if (expeditionVisibility === 'private') {
                          setExpeditionVisibility('public');
                        }
                      } else {
                        setNotesVisibility('public');
                      }
                    }}
                    disabled={!isPro || !user?.stripeAccountConnected || status === 'completed'}
                  />
                  <label htmlFor="enable-sponsorships" className={`text-xs ${!isPro || !user?.stripeAccountConnected || status === 'completed' ? 'text-[#b5bcc4] dark:text-[#616161]' : 'text-[#616161] dark:text-[#b5bcc4]'}`}>
                    Allow others to financially support this expedition through the platform
                  </label>
                </div>
                {!isPro && (
                  <div className="mb-3 p-3 bg-white dark:bg-[#202020] border-l-2 border-[#ac6d46] text-xs text-[#616161] dark:text-[#b5bcc4]">
                    <strong className="text-[#ac6d46]">PRO FEATURE:</strong> Receiving sponsorships requires Explorer Pro.
                    <Link href="/settings/billing" className="text-[#4676ac] hover:underline ml-1">Upgrade to Pro</Link>
                  </div>
                )}
                {isPro && !user?.stripeAccountConnected && status !== 'completed' && (
                  <div className="mb-3 p-3 bg-white dark:bg-[#202020] border-l-2 border-[#ac6d46] text-xs text-[#616161] dark:text-[#b5bcc4]">
                    <strong className="text-[#ac6d46]">STRIPE CONNECT REQUIRED:</strong> Complete your Stripe onboarding before enabling sponsorships.
                    <Link href="/sponsorship" className="text-[#4676ac] hover:underline ml-1">Complete setup</Link>
                  </div>
                )}
                {status === 'completed' && (
                  <div className="mb-3 p-3 bg-white dark:bg-[#202020] border-l-2 border-[#616161] text-xs text-[#616161] dark:text-[#b5bcc4]">
                    <strong>COMPLETED EXPEDITION:</strong> Sponsorships are not available for completed expeditions.
                  </div>
                )}
                {sponsorshipsEnabled && isPro && (
                  <div>
                    <label className="block text-xs font-medium mb-2 text-[#202020] dark:text-[#e5e5e5]">
                      SPONSORSHIP GOAL (USD)
                      <span className="text-[#ac6d46] ml-1">*REQUIRED</span>
                    </label>
                    <input
                      type="number"
                      value={sponsorshipGoal}
                      onChange={(e) => setSponsorshipGoal(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-[#b5bcc4] dark:border-[#3a3a3a] focus:border-[#ac6d46] outline-none text-sm font-mono dark:bg-[#2a2a2a] dark:text-[#e5e5e5]"
                      placeholder="e.g., 15000"
                      required={sponsorshipsEnabled}
                    />
                    <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1">
                      Set a funding goal for your expedition • Platform fee: 10% • Processing: 2.9% + $0.30
                    </div>
                  </div>
                )}
              </div>

              {/* Expedition Notes Visibility - Pro only, not for private expeditions */}
              {isPro && expeditionVisibility !== 'private' && <div className="border-2 border-[#616161] p-4 bg-[#f5f5f5] dark:bg-[#2a2a2a]">
                <div className="text-xs font-bold mb-3 dark:text-[#e5e5e5]">EXPEDITION NOTES VISIBILITY</div>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <input
                      type="radio"
                      id="notes-public"
                      name="notesVisibility"
                      className="mt-1"
                      checked={notesVisibility === 'public'}
                      onChange={() => setNotesVisibility('public')}
                    />
                    <label htmlFor="notes-public" className="text-xs">
                      <div className="font-bold text-[#202020] dark:text-[#e5e5e5]">PUBLIC</div>
                      <div className="text-[#616161] dark:text-[#b5bcc4] mt-0.5">
                        Anyone can read expedition notes.
                      </div>
                    </label>
                  </div>
                  <div className="flex items-start gap-2">
                    <input
                      type="radio"
                      id="notes-sponsor"
                      name="notesVisibility"
                      className="mt-1"
                      checked={notesVisibility === 'sponsor'}
                      onChange={() => {
                        setNotesVisibility('sponsor');
                        if (isPro && user?.stripeAccountConnected && status !== 'completed') {
                          setSponsorshipsEnabled(true);
                        }
                      }}
                      disabled={!isPro || !user?.stripeAccountConnected || status === 'completed'}
                    />
                    <label htmlFor="notes-sponsor" className={`text-xs ${!isPro || !user?.stripeAccountConnected || status === 'completed' ? 'text-[#b5bcc4] dark:text-[#616161]' : ''}`}>
                      <div className="font-bold text-[#202020] dark:text-[#e5e5e5]">SPONSOR EXCLUSIVE</div>
                      <div className="text-[#616161] dark:text-[#b5bcc4] mt-0.5">
                        Only sponsors meeting the access threshold can read expedition notes.
                        {(!isPro || !user?.stripeAccountConnected) && (
                          <span className="text-[#ac6d46] ml-1">Requires Explorer Pro with Stripe Connect.</span>
                        )}
                      </div>
                    </label>
                  </div>
                </div>
                {notesVisibility === 'sponsor' && (
                  <div className="mt-3">
                    <label className="block text-xs font-medium mb-2 text-[#202020] dark:text-[#e5e5e5]">
                      NOTES ACCESS THRESHOLD (USD)
                    </label>
                    <input
                      type="number"
                      className="w-full px-4 py-3 border-2 border-[#b5bcc4] dark:border-[#3a3a3a] focus:border-[#ac6d46] outline-none text-sm font-mono dark:bg-[#2a2a2a] dark:text-[#e5e5e5]"
                      placeholder="e.g., 15"
                      min="0"
                      value={notesAccessThreshold}
                      onChange={(e) => setNotesAccessThreshold(e.target.value)}
                    />
                    <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1">
                      Minimum cumulative sponsorship to unlock notes • 0 = any sponsor has access
                    </div>
                  </div>
                )}
              </div>}

              {/* Privacy Settings */}
              <div className="border-2 border-[#4676ac] p-4 bg-[#f5f5f5] dark:bg-[#2a2a2a]">
                <div className="text-xs font-bold mb-3 dark:text-[#e5e5e5]">VISIBILITY:</div>

                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <input
                      type="radio"
                      id="visibility-public"
                      name="visibility"
                      className="mt-1"
                      checked={expeditionVisibility === 'public'}
                      onChange={() => setExpeditionVisibility('public')}
                    />
                    <label htmlFor="visibility-public" className="text-xs">
                      <div className="font-bold text-[#202020] dark:text-[#e5e5e5]">PUBLIC EXPEDITION</div>
                      <div className="text-[#616161] dark:text-[#b5bcc4] mt-1">
                        Listed in feeds, search, and your explorer profile. Anyone can discover your expedition.
                      </div>
                    </label>
                  </div>
                  <div className="flex items-start gap-2">
                    <input
                      type="radio"
                      id="visibility-offgrid"
                      name="visibility"
                      className="mt-1"
                      checked={expeditionVisibility === 'off-grid'}
                      onChange={() => setExpeditionVisibility('off-grid')}
                    />
                    <label htmlFor="visibility-offgrid" className="text-xs">
                      <div className="font-bold text-[#202020] dark:text-[#e5e5e5]">OFF-GRID</div>
                      <div className="text-[#616161] dark:text-[#b5bcc4] mt-1">
                        Hidden from all feeds and search. Only accessible via direct link. Sponsorships still work — share the link directly with potential sponsors.
                      </div>
                    </label>
                  </div>
                  <div className="flex items-start gap-2">
                    <input
                      type="radio"
                      id="visibility-private"
                      name="visibility"
                      className="mt-1"
                      checked={expeditionVisibility === 'private'}
                      onChange={() => {
                        setExpeditionVisibility('private');
                        setNotesVisibility('public');
                      }}
                      disabled={sponsorshipsEnabled}
                    />
                    <label htmlFor="visibility-private" className={`text-xs ${sponsorshipsEnabled ? 'opacity-50' : ''}`}>
                      <div className="font-bold text-[#202020] dark:text-[#e5e5e5]">PRIVATE EXPEDITION</div>
                      <div className="text-[#616161] dark:text-[#b5bcc4] mt-1">
                        Only you can access this expedition. <span className="font-bold text-[#ac6d46]">ALL journal entries automatically locked to private.</span>
                      </div>
                    </label>
                  </div>
                </div>

                {sponsorshipsEnabled && (
                  <div className="mt-3 p-3 bg-white dark:bg-[#202020] border-l-2 border-[#ac6d46] text-xs text-[#616161] dark:text-[#b5bcc4]">
                    <strong className="text-[#ac6d46]">SPONSORSHIPS ENABLED:</strong> Expeditions with sponsorships cannot be set to Private. Public and Off-Grid expeditions both support sponsorships.
                  </div>
                )}

                <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border-l-2 border-yellow-600 text-xs">
                  <strong className="text-yellow-700 dark:text-yellow-500">⚠️ PERMANENT SETTING:</strong>
                  <div className="text-[#616161] dark:text-[#b5bcc4] mt-1">
                    Private visibility <span className="font-bold">cannot be changed after creation.</span> Public and Off-Grid can be toggled freely. Category, region, and start date are also locked after creation.
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 pt-4 border-t-2 border-[#202020] dark:border-[#616161]">
                <div className="flex flex-col sm:flex-row gap-3">
                  {isEditMode ? (
                    <button
                      type="submit"
                      disabled={isSubmitting || uploadingCover}
                      className="flex-1 py-4 bg-[#4676ac] text-white font-bold hover:bg-[#365a8a] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#4676ac] disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
                    >
                      {(isSubmitting || uploadingCover) && <Loader2 className="w-4 h-4 animate-spin" />}
                      {isSubmitting ? 'SAVING...' : uploadingCover ? 'UPLOADING COVER...' : 'SAVE CHANGES'}
                    </button>
                  ) : (
                    <>
                      <button
                        type="submit"
                        disabled={isSubmitting || uploadingCover}
                        className="flex-1 py-4 bg-[#4676ac] text-white font-bold hover:bg-[#365a8a] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#4676ac] disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
                      >
                        {(isSubmitting || uploadingCover) && <Loader2 className="w-4 h-4 animate-spin" />}
                        {isSubmitting ? 'LAUNCHING...' : uploadingCover ? 'UPLOADING COVER...' : 'LAUNCH EXPEDITION'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCreate(true)}
                        disabled={isSubmitting || uploadingCover}
                        className="flex-1 py-4 bg-[#ac6d46] text-white font-bold hover:bg-[#8a5738] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
                      >
                        LAUNCH & LOG FIRST ENTRY
                      </button>
                    </>
                  )}
                </div>
                <div className="text-center">
                  <Link
                    href={isEditMode && expeditionId ? `/expedition/${expeditionId}` : '/select-expedition'}
                    className="text-xs text-[#4676ac] hover:underline font-bold"
                  >
                    {isEditMode ? 'cancel and return to expedition' : 'cancel and return to selection'}
                  </Link>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Tips */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-4">
            <h3 className="text-xs font-bold mb-3 border-b border-[#202020] dark:border-[#616161] pb-2 dark:text-[#e5e5e5]">
              QUICK ENTRY TIPS
            </h3>
            <div className="text-xs text-[#616161] dark:text-[#b5bcc4] space-y-2">
              <div className="flex items-start gap-2">
                <span className="text-[#ac6d46]">•</span>
                <span>Fill out all required fields marked with *</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#ac6d46]">•</span>
                <span>Cover photo represents your expedition in searches</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#ac6d46]">•</span>
                <span>Status is automatically computed from dates</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#ac6d46]">•</span>
                <span>Tags help others discover your expedition</span>
              </div>
            </div>
          </div>

          {/* Need More Control? (Pro Only) */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-4">
            <h3 className="text-xs font-bold mb-3 border-b border-[#202020] dark:border-[#616161] pb-2 dark:text-[#e5e5e5]">
              NEED MORE CONTROL?
            </h3>
            <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mb-3">
              For expeditions with multiple waypoints and detailed route planning, use the Expedition Builder with interactive mapping.
            </div>
            {isPro ? (
              <Link
                href="/expedition-builder"
                className="inline-block w-full py-2 bg-[#4676ac] text-white font-bold hover:bg-[#365a8a] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#4676ac] text-center"
              >
                OPEN EXPEDITION BUILDER
              </Link>
            ) : (
              <div>
                <div className="w-full py-2 bg-[#616161] text-white font-bold text-center cursor-not-allowed text-sm opacity-60">
                  <Lock className="inline w-4 h-4 mr-2" />
                  EXPLORER PRO REQUIRED
                </div>
                <div className="mt-2 text-xs text-[#616161] dark:text-[#b5bcc4]">
                  <Link href="/settings/billing" className="text-[#4676ac] hover:underline">Upgrade to Explorer Pro</Link> to access the Expedition Builder.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}