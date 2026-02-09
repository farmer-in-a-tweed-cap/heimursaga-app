'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { useProFeatures } from '@/app/hooks/useProFeatures';
import { Upload, Calendar, ArrowLeft, Lock, Loader2 } from 'lucide-react';
import { expeditionApi } from '@/app/services/api';
import { formatDateTime } from '@/app/utils/dateFormat';

export function ExpeditionQuickEntryPage() {
  const { user, isAuthenticated } = useAuth();
  const { isPro } = useProFeatures();
  const router = useRouter();
  const pathname = usePathname();
  // Form state
  const [title, setTitle] = useState('');
  const [region, setRegion] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [sponsorshipGoal, setSponsorshipGoal] = useState('');
  const [sponsorshipsEnabled, setSponsorshipsEnabled] = useState(false);
  const [isExpeditionPublic, setIsExpeditionPublic] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [expectedDuration, setExpectedDuration] = useState('');
  const [currentLocation, setCurrentLocation] = useState('');
  const [coverPhotoFile, setCoverPhotoFile] = useState<File | null>(null);
  const [coverPhotoPreview, setCoverPhotoPreview] = useState<string | null>(null);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Auto-compute status based on dates
  const computeStatus = () => {
    const today = new Date().toISOString().split('T')[0];
    
    if (!startDate) return 'planned';
    
    if (endDate && endDate < today) {
      return 'completed';
    }
    
    if (startDate > today) {
      return 'planned';
    }
    
    return 'active';
  };

  const status = computeStatus();

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
    setStartDate(date);
    
    // Recalculate end date if duration is set
    if (expectedDuration && date) {
      const start = new Date(date);
      const durationNum = parseInt(expectedDuration);
      if (!isNaN(durationNum) && durationNum > 0) {
        const end = new Date(start);
        end.setDate(end.getDate() + durationNum);
        setEndDate(end.toISOString().split('T')[0]);
      }
    } else if (endDate && date) {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setSubmitError('Title is required');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        goal: sponsorshipsEnabled && sponsorshipGoal ? parseInt(sponsorshipGoal) : undefined,
        // Note: coverImage would need upload handling - for now we skip it
      };

      const result = await expeditionApi.create(payload);
      const expeditionPublicId = (result as any).expeditionId || (result as any).id || (result as any).publicId;

      // Navigate to create the first entry
      router.push(`/log-entry/${expeditionPublicId}`);
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to create expedition');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle cover photo selection
  const handleCoverPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
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
    <div className="max-w-[1400px] mx-auto px-6 py-8">
      {/* Page Header */}
      <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-6 mb-6">
        <div className="flex items-center gap-4 mb-4 border-b-2 border-[#202020] dark:border-[#616161] pb-2">
          <Link
            href="/select-expedition"
            className="p-2 hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#616161]"
          >
            <ArrowLeft className="w-5 h-5 dark:text-[#e5e5e5]" />
          </Link>
          <h1 className="text-2xl font-bold flex-1 dark:text-[#e5e5e5]">EXPEDITION QUICK ENTRY</h1>
          <span className="text-xs text-[#616161] dark:text-[#b5bcc4] font-mono">
            Session: {formatDateTime(new Date())}
          </span>
        </div>
        
        <div className="bg-[#f5f5f5] dark:bg-[#2a2a2a] p-4 border-l-2 border-[#ac6d46]">
          <div className="text-xs font-bold mb-2 dark:text-[#e5e5e5]">STREAMLINED EXPEDITION CREATION:</div>
          <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">
            Create a new expedition quickly with all essential fields in one form. Perfect for expeditions without complex route planning. Fill out the form below and click "CREATE EXPEDITION & LOG FIRST ENTRY" to begin documenting your journey.
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
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
                    EXPEDITION REGION/LOCATION
                    <span className="text-[#616161] dark:text-[#b5bcc4] ml-1">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-[#b5bcc4] dark:border-[#3a3a3a] focus:border-[#ac6d46] outline-none text-sm dark:bg-[#2a2a2a] dark:text-[#e5e5e5]"
                    placeholder="e.g., Central Asia, Uzbekistan Region"
                  />
                  <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1">
                    Approximate geographic region (for safety, avoid exact locations)
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-2 text-[#202020] dark:text-[#e5e5e5]">
                    CATEGORY
                    <span className="text-[#616161] dark:text-[#b5bcc4] ml-1">(Optional)</span>
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-[#b5bcc4] dark:border-[#3a3a3a] focus:border-[#ac6d46] outline-none text-sm dark:bg-[#2a2a2a] dark:text-[#e5e5e5]"
                  >
                    <option value="">Select category...</option>
                    <option value="culture-photography">Culture & Photography</option>
                    <option value="scientific-research">Scientific Research</option>
                    <option value="documentary">Documentary</option>
                    <option value="adventure-exploration">Adventure & Exploration</option>
                    <option value="environmental">Environmental</option>
                    <option value="historical">Historical Documentation</option>
                    <option value="other">Other</option>
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
                  <div className="relative">
                    <input
                      type="date"
                      required
                      className="w-full px-4 py-3 border-2 border-[#b5bcc4] dark:border-[#3a3a3a] focus:border-[#ac6d46] outline-none text-sm font-mono dark:bg-[#2a2a2a] dark:text-[#e5e5e5]"
                      value={startDate}
                      onChange={(e) => handleStartDateChange(e.target.value)}
                    />
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#616161] dark:text-[#b5bcc4] pointer-events-none" />
                  </div>
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
                    <div className="relative">
                      <input
                        type="date"
                        className="w-full px-4 py-3 border-2 border-[#b5bcc4] dark:border-[#3a3a3a] focus:border-[#ac6d46] outline-none text-sm font-mono dark:bg-[#2a2a2a] dark:text-[#e5e5e5]"
                        value={endDate}
                        onChange={(e) => handleEndDateChange(e.target.value)}
                      />
                      <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#616161] dark:text-[#b5bcc4] pointer-events-none" />
                    </div>
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
                  EXPEDITION DESCRIPTION
                  <span className="text-[#616161] dark:text-[#b5bcc4] ml-1">(Optional)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-[#b5bcc4] dark:border-[#3a3a3a] focus:border-[#ac6d46] outline-none text-sm dark:bg-[#2a2a2a] dark:text-[#e5e5e5]"
                  rows={6}
                  placeholder="Describe your expedition, goals, and what you plan to document..."
                />
                <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1 font-mono">
                  {description.length} / 1000 characters
                </div>
              </div>

              {/* Cover Photo */}
              <div>
                <label className="block text-xs font-medium mb-2 text-[#202020] dark:text-[#e5e5e5]">
                  COVER PHOTO
                  <span className="text-[#616161] dark:text-[#b5bcc4] ml-1">(Optional)</span>
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
                      <img src={coverPhotoPreview} alt="Cover preview" className="max-h-32 mx-auto object-cover" />
                      <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-2">Click to change</div>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 mx-auto mb-2 text-[#ac6d46]" />
                      <div className="text-sm font-bold text-[#202020] dark:text-[#e5e5e5] mb-1">
                        UPLOAD COVER PHOTO
                      </div>
                      <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">
                        Click or drag file here • JPG, PNG • Max 5MB • Recommended: 1200x600px
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
                        setIsExpeditionPublic(true);
                      }
                    }}
                    disabled={!isPro}
                  />
                  <label htmlFor="enable-sponsorships" className={`text-xs ${!isPro ? 'text-[#b5bcc4] dark:text-[#616161]' : 'text-[#616161] dark:text-[#b5bcc4]'}`}>
                    Allow others to financially support this expedition through the platform
                  </label>
                </div>
                {!isPro && (
                  <div className="mb-3 p-3 bg-white dark:bg-[#202020] border-l-2 border-[#ac6d46] text-xs text-[#616161] dark:text-[#b5bcc4]">
                    <strong className="text-[#ac6d46]">PRO FEATURE:</strong> Receiving sponsorships requires Explorer Pro. 
                    <Link href="/settings/billing" className="text-[#4676ac] hover:underline ml-1">Upgrade to Pro</Link>
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
                      Set a funding goal for your expedition • Platform fee: 5% • Processing: 2.9% + $0.30
                    </div>
                  </div>
                )}
              </div>

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
                      checked={isExpeditionPublic}
                      onChange={() => setIsExpeditionPublic(true)}
                    />
                    <label htmlFor="visibility-public" className="text-xs">
                      <div className="font-bold text-[#202020] dark:text-[#e5e5e5]">PUBLIC EXPEDITION</div>
                      <div className="text-[#616161] dark:text-[#b5bcc4] mt-1">
                        Expedition and all journal entries are visible to everyone. Individual entries can still be set to private.
                      </div>
                    </label>
                  </div>
                  <div className="flex items-start gap-2">
                    <input 
                      type="radio" 
                      id="visibility-private" 
                      name="visibility"
                      className="mt-1" 
                      checked={!isExpeditionPublic}
                      onChange={() => setIsExpeditionPublic(false)}
                      disabled={sponsorshipsEnabled}
                    />
                    <label htmlFor="visibility-private" className={`text-xs ${sponsorshipsEnabled ? 'opacity-50' : ''}`}>
                      <div className="font-bold text-[#202020] dark:text-[#e5e5e5]">PRIVATE EXPEDITION</div>
                      <div className="text-[#616161] dark:text-[#b5bcc4] mt-1">
                        Expedition is hidden. <span className="font-bold text-[#ac6d46]">ALL journal entries in this expedition will be automatically locked to private.</span>
                      </div>
                    </label>
                  </div>
                </div>

                {sponsorshipsEnabled && (
                  <div className="mt-3 p-3 bg-white dark:bg-[#202020] border-l-2 border-[#ac6d46] text-xs text-[#616161] dark:text-[#b5bcc4]">
                    <strong className="text-[#ac6d46]">SPONSORSHIPS ENABLED:</strong> Expeditions with sponsorships enabled must remain public so sponsors can view the expedition they're supporting.
                  </div>
                )}

                <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border-l-2 border-yellow-600 text-xs">
                  <strong className="text-yellow-700 dark:text-yellow-500">⚠️ PERMANENT SETTING:</strong>
                  <div className="text-[#616161] dark:text-[#b5bcc4] mt-1">
                    Visibility, category, region, and start date <span className="font-bold">cannot be edited after creation.</span> These fundamental expedition properties are locked to maintain expedition integrity and consistency for sponsors and readers.
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t-2 border-[#202020] dark:border-[#616161]">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-4 bg-[#ac6d46] text-white font-bold hover:bg-[#8a5738] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isSubmitting ? 'CREATING...' : 'CREATE EXPEDITION & LOG FIRST ENTRY'}
                </button>
                <Link
                  href="/select-expedition"
                  className="px-8 py-4 border-2 border-[#202020] dark:border-[#616161] dark:text-[#e5e5e5] hover:bg-[#f5f5f5] dark:hover:bg-[#3a3a3a] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#616161] font-bold flex items-center justify-center"
                >
                  CANCEL
                </Link>
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
                <span>Use approximate regions for safety</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#ac6d46]">•</span>
                <span>Tags help others discover your expedition</span>
              </div>
            </div>
          </div>

          {/* Need More Control? */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-4">
            <h3 className="text-xs font-bold mb-3 border-b border-[#202020] dark:border-[#616161] pb-2 dark:text-[#e5e5e5]">
              NEED MORE CONTROL?
            </h3>
            <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mb-3">
              For expeditions with multiple waypoints and detailed route planning, use the Expedition Builder with interactive mapping.
            </div>
            <Link
              href="/expedition-builder"
              className="inline-block w-full py-2 bg-[#4676ac] text-white font-bold hover:bg-[#365a8a] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#4676ac] text-center"
            >
              OPEN EXPEDITION BUILDER
            </Link>
          </div>

          {/* System Info */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-4">
            <h3 className="text-xs font-bold mb-3 border-b border-[#202020] dark:border-[#616161] pb-2 dark:text-[#e5e5e5]">
              SYSTEM INFORMATION
            </h3>
            <div className="text-xs font-mono space-y-2 text-[#616161] dark:text-[#b5bcc4]">
              <div><span className="text-[#202020] dark:text-[#e5e5e5] font-bold">User ID:</span> {user?.id || 'Not logged in'}</div>
              <div><span className="text-[#202020] dark:text-[#e5e5e5] font-bold">Username:</span> {user?.username || 'N/A'}</div>
              <div><span className="text-[#202020] dark:text-[#e5e5e5] font-bold">Account Type:</span> {user?.role === 'creator' ? 'EXPLORER PRO' : 'EXPLORER'}</div>
              <div><span className="text-[#202020] dark:text-[#e5e5e5] font-bold">Session:</span> Active</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}