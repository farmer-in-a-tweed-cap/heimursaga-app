'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User, Camera, Save, X, Upload, Lock, Shield, AlertTriangle, Home, Navigation, Info, Loader2, Image, Calendar } from 'lucide-react';
import { SettingsLayout } from '@/app/components/SettingsLayout';
import { ExplorerCard } from '@/app/components/ExplorerCard';
import { useProFeatures } from '@/app/hooks/useProFeatures';
import { LocationAutocompleteInput } from '@/app/components/LocationAutocompleteInput';
import {
  LOCATION_PRIVACY_OPTIONS,
  formatLocationByPrivacy,
  parseLocationString,
  type LocationPrivacyLevel,
  type LocationData
} from '@/app/utils/locationPrivacy';
import { explorerApi } from '@/app/services/api';

export function EditProfilePage() {
  const { user } = useAuth();
  const { isPro } = useProFeatures();
  const router = useRouter();

  // Form state - initialize with empty values, will be populated from API
  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    journalName: '',
    bio: '',

    // Home/From Location (static)
    fromLocation: '',
    fromCoordinates: { lat: 0, lng: 0 },
    fromCity: '',
    fromRegion: '',
    fromCountry: '',
    fromContinent: '',

    // Current Location (synced from active expedition OR manual)
    currentLocation: '',
    currentCoordinates: { lat: 0, lng: 0 },
    currentCity: '',
    currentRegion: '',
    currentCountry: '',
    currentContinent: '',
    currentLocationSource: 'manual' as 'expedition' | 'manual',

    // Location Privacy
    locationPrivacyLevel: 'REGIONAL_LEVEL' as LocationPrivacyLevel,
    autoSyncFromExpedition: false,

    website: '',
    twitter: '',
    instagram: '',
    youtube: '',
    equipment: '',
  });

  const [isDirty, setIsDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [showPrivacyWarning, setShowPrivacyWarning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Avatar and Cover Photo state
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [coverPhotoFile, setCoverPhotoFile] = useState<File | null>(null);
  const [coverPhotoPreview, setCoverPhotoPreview] = useState<string | null>(null);

  // Fetch profile settings on mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const settings = await explorerApi.getProfileSettings();

        // Parse location strings into structured data
        const fromLocationParsed = settings.from ? parseLocationString(settings.from) : {};
        const currentLocationParsed = settings.livesIn ? parseLocationString(settings.livesIn) : {};

        setFormData(prev => ({
          ...prev,
          username: settings.username || prev.username,
          email: settings.email || prev.email,
          journalName: settings.name || '',
          bio: settings.bio || '',
          fromLocation: settings.from || '',
          fromCity: fromLocationParsed.city || '',
          fromRegion: fromLocationParsed.region || '',
          fromCountry: fromLocationParsed.country || '',
          currentLocation: settings.livesIn || '',
          currentCity: currentLocationParsed.city || '',
          currentRegion: currentLocationParsed.region || '',
          currentCountry: currentLocationParsed.country || '',
          website: settings.website || '',
          twitter: settings.twitter || '',
          instagram: settings.instagram || '',
          youtube: settings.youtube || '',
          equipment: Array.isArray(settings.equipment) ? settings.equipment.join('\n') : (settings.equipment || ''),
        }));
        // Set existing images as previews
        if (settings.picture) {
          setAvatarPreview(settings.picture);
        }
        if (settings.coverPhoto) {
          setCoverPhotoPreview(settings.coverPhoto);
        }
      } catch (err) {
        console.error('Error fetching profile settings:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, []);

  // Check if user has active expedition
  const hasActiveExpedition = false;
  const activeExpeditionName = '';

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
    setSaveStatus('idle');

    // Show warning if switching to precise coordinates
    if (field === 'locationPrivacyLevel' && value === 'PRECISE_COORDINATES') {
      setShowPrivacyWarning(true);
    } else if (field === 'locationPrivacyLevel') {
      setShowPrivacyWarning(false);
    }
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Avatar image must be less than 5MB');
        return;
      }
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
      setIsDirty(true);
      setSaveStatus('idle');
    }
  };

  const handleCoverPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('Cover photo must be less than 10MB');
        return;
      }
      setCoverPhotoFile(file);
      setCoverPhotoPreview(URL.createObjectURL(file));
      setIsDirty(true);
      setSaveStatus('idle');
    }
  };

  const removeAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
    setIsDirty(true);
    setSaveStatus('idle');
  };

  const removeCoverPhoto = () => {
    setCoverPhotoFile(null);
    setCoverPhotoPreview(null);
    setIsDirty(true);
    setSaveStatus('idle');
  };

  const handleSave = async () => {
    setSaveStatus('saving');

    const payload = {
      name: formData.journalName,
      bio: formData.bio,
      from: formData.fromLocation,
      livesIn: formData.currentLocation,
      website: formData.website,
      twitter: formData.twitter,
      instagram: formData.instagram,
      youtube: formData.youtube,
      equipment: formData.equipment.split('\n').map(s => s.trim()).filter(Boolean),
    };

    try {
      // Upload avatar if a new file was selected
      if (avatarFile) {
        await explorerApi.uploadPicture(avatarFile);
        setAvatarFile(null); // Clear file after upload
      }

      // Upload cover photo if a new file was selected
      if (coverPhotoFile) {
        await explorerApi.uploadCoverPhoto(coverPhotoFile);
        setCoverPhotoFile(null); // Clear file after upload
      }

      // Update profile data
      await explorerApi.updateProfile(payload);

      setSaveStatus('saved');
      setIsDirty(false);
      // Status stays 'saved' until user makes a new change (which resets to 'idle')
    } catch (err) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const handleCancel = () => {
    if (isDirty) {
      const shouldDiscard = window.confirm('Discard unsaved changes?');
      if (shouldDiscard) {
        router.push(`/journal/${user?.username}`);
      }
    } else {
      router.push(`/journal/${user?.username}`);
    }
  };

  if (!user) return null;

  // Get privacy level info for display
  const privacyLevelInfo = LOCATION_PRIVACY_OPTIONS.find(
    opt => opt.value === formData.locationPrivacyLevel
  );

  // Format location preview with current privacy settings
  // Fall back to raw location string if structured data isn't available
  const rawPreviewFromLocation = formatLocationByPrivacy({
    city: formData.fromCity || undefined,
    region: formData.fromRegion || undefined,
    country: formData.fromCountry || undefined,
    continent: formData.fromContinent || undefined,
    coordinates: formData.fromCoordinates,
    privacyLevel: formData.locationPrivacyLevel,
  });
  const previewFromLocation = {
    displayText: rawPreviewFromLocation.displayText.includes('Unknown') && formData.fromLocation
      ? formData.fromLocation
      : rawPreviewFromLocation.displayText,
    displayCoordinates: rawPreviewFromLocation.displayCoordinates,
  };

  const rawPreviewCurrentLocation = formatLocationByPrivacy({
    city: formData.currentCity || undefined,
    region: formData.currentRegion || undefined,
    country: formData.currentCountry || undefined,
    continent: formData.currentContinent || undefined,
    coordinates: formData.currentCoordinates,
    privacyLevel: formData.locationPrivacyLevel,
  });
  const previewCurrentLocation = {
    displayText: rawPreviewCurrentLocation.displayText.includes('Unknown') && formData.currentLocation
      ? formData.currentLocation
      : rawPreviewCurrentLocation.displayText,
    displayCoordinates: rawPreviewCurrentLocation.displayCoordinates,
  };

  return (
    <SettingsLayout>
      {/* System Status Bar */}
      <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] mb-6">
        <div className="bg-[#202020] dark:bg-[#2a2a2a] text-white px-4 lg:px-6 py-2 text-xs font-mono">
          <div className="flex flex-wrap items-center gap-4 lg:gap-6">
            <div>USER ID: {user.id}</div>
            <div>ACCOUNT TYPE: {user.role === 'creator' ? 'EXPLORER PRO' : 'EXPLORER'}</div>
            <div>EMAIL VERIFIED: {user.isEmailVerified ? '✓ YES' : '✗ NO'}</div>
            <div>USERNAME: {user.username}</div>
            {isDirty && <div className="text-[#ac6d46]">● UNSAVED CHANGES</div>}
            {saveStatus === 'saving' && (
              <div className="text-[#b5bcc4]">SAVING...</div>
            )}
            {saveStatus === 'saved' && (
              <div className="text-[#4676ac]">✓ SAVED</div>
            )}
            {saveStatus === 'error' && (
              <div className="text-red-400">✗ ERROR</div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
            <div className="bg-[#616161] text-white px-4 py-2 font-bold text-sm">
              BASIC INFORMATION
            </div>
            <div className="p-4 lg:p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-2 text-[#202020] dark:text-[#e5e5e5]">
                    USERNAME <span className="text-[#616161] dark:text-[#b5bcc4]">(READ-ONLY)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.username}
                    disabled
                    className="w-full px-3 py-2 border-2 border-[#b5bcc4] dark:border-[#3a3a3a] bg-[#f5f5f5] dark:bg-[#1a1a1a] text-[#616161] dark:text-[#b5bcc4] text-sm cursor-not-allowed"
                  />
                  <p className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1">
                    Usernames cannot be changed for security reasons
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-2 text-[#202020] dark:text-[#e5e5e5]">
                    EMAIL <span className="text-[#616161] dark:text-[#b5bcc4]">(READ-ONLY)</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    disabled
                    className="w-full px-3 py-2 border-2 border-[#b5bcc4] dark:border-[#3a3a3a] bg-[#f5f5f5] dark:bg-[#1a1a1a] text-[#616161] dark:text-[#b5bcc4] text-sm cursor-not-allowed"
                  />
                  <p className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1">
                    Change email in Account Settings
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-2 text-[#202020] dark:text-[#e5e5e5]">
                  JOURNAL NAME
                </label>
                <input
                  type="text"
                  value={formData.journalName}
                  onChange={(e) => handleChange('journalName', e.target.value)}
                  className="w-full px-3 py-2 border-2 border-[#202020] dark:border-[#616161] dark:bg-[#2a2a2a] dark:text-[#e5e5e5] text-sm focus:outline-none focus:border-[#4676ac]"
                  placeholder="My Journal Name"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-2 text-[#202020] dark:text-[#e5e5e5]">
                  BIO / ABOUT
                </label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => handleChange('bio', e.target.value)}
                  rows={5}
                  className="w-full px-3 py-2 border-2 border-[#202020] dark:border-[#616161] dark:bg-[#2a2a2a] dark:text-[#e5e5e5] text-sm focus:outline-none focus:border-[#4676ac] resize-y"
                  placeholder="Tell your story..."
                />
                <p className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1">
                  Character count: {formData.bio.length} / 500 recommended
                </p>
              </div>
            </div>
          </div>

          {/* Avatar & Cover Photo */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
            <div className="bg-[#616161] text-white px-4 py-2 font-bold text-sm flex items-center gap-2">
              <Camera size={16} strokeWidth={2} />
              AVATAR & COVER PHOTO
            </div>
            <div className="p-4 lg:p-6 space-y-6">
              {/* Avatar Upload */}
              <div>
                <label className="block text-xs font-medium mb-3 text-[#202020] dark:text-[#e5e5e5]">
                  PROFILE AVATAR
                </label>

                {/* Current Avatar or Preview */}
                <div className="flex items-start gap-4 mb-3">
                  <div className="w-32 h-32 border-2 border-[#202020] dark:border-[#616161] bg-[#f5f5f5] dark:bg-[#2a2a2a] flex items-center justify-center overflow-hidden">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Avatar preview" className="w-full h-full object-cover" />
                    ) : (
                      <User size={48} className="text-[#b5bcc4]" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mb-3">
                      Upload a square image for your profile avatar. This will be displayed across the platform next to your username.
                    </div>
                    <div className="flex gap-2">
                      <label className="px-4 py-2 bg-[#4676ac] text-white hover:bg-[#365a87] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#4676ac] text-xs font-medium cursor-pointer inline-flex items-center gap-2">
                        <Upload size={14} strokeWidth={2} />
                        {avatarPreview ? 'CHANGE AVATAR' : 'UPLOAD AVATAR'}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarUpload}
                          className="hidden"
                        />
                      </label>
                      {avatarPreview && (
                        <button
                          type="button"
                          onClick={removeAvatar}
                          className="px-4 py-2 border-2 border-red-600 text-red-600 hover:bg-red-600 hover:text-white transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-red-600 text-xs font-bold"
                        >
                          REMOVE
                        </button>
                      )}
                    </div>
                    <div className="mt-2 text-xs text-[#616161] dark:text-[#b5bcc4] font-mono">
                      Requirements: JPG or PNG • Square aspect ratio recommended • Max 5MB
                    </div>
                  </div>
                </div>
              </div>

              {/* Cover Photo Upload */}
              <div>
                <label className="block text-xs font-medium mb-3 text-[#202020] dark:text-[#e5e5e5]">
                  PROFILE COVER PHOTO
                </label>

                {/* Current Cover Photo or Preview */}
                <div className="mb-3">
                  <div className="w-full h-48 border-2 border-[#202020] dark:border-[#616161] bg-[#f5f5f5] dark:bg-[#2a2a2a] flex items-center justify-center overflow-hidden">
                    {coverPhotoPreview ? (
                      <img src={coverPhotoPreview} alt="Cover photo preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center">
                        <Image size={48} className="text-[#b5bcc4] mx-auto mb-2" />
                        <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">NO COVER PHOTO</div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mb-3">
                  Upload a wide banner image for your profile header. This will be displayed at the top of your explorer profile page.
                </div>

                <div className="flex gap-2">
                  <label className="px-4 py-2 bg-[#ac6d46] text-white hover:bg-[#8a5738] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] text-xs font-medium cursor-pointer inline-flex items-center gap-2">
                    <Upload size={14} strokeWidth={2} />
                    {coverPhotoPreview ? 'CHANGE COVER PHOTO' : 'UPLOAD COVER PHOTO'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleCoverPhotoUpload}
                      className="hidden"
                    />
                  </label>
                  {coverPhotoPreview && (
                    <button
                      type="button"
                      onClick={removeCoverPhoto}
                      className="px-4 py-2 border-2 border-red-600 text-red-600 hover:bg-red-600 hover:text-white transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-red-600 text-xs font-bold"
                    >
                      REMOVE
                    </button>
                  )}
                </div>
                <div className="mt-2 text-xs text-[#616161] dark:text-[#b5bcc4] font-mono">
                  Requirements: JPG or PNG • 1200x300px recommended • Max 10MB
                </div>
              </div>

              {/* Image Guidelines */}
              <div className="p-3 bg-[#f5f5f5] dark:bg-[#2a2a2a] border-l-2 border-[#4676ac] text-xs">
                <div className="font-bold text-[#202020] dark:text-[#e5e5e5] mb-2">
                  IMAGE GUIDELINES:
                </div>
                <div className="text-[#616161] dark:text-[#b5bcc4] space-y-1">
                  <div>• <span className="font-bold text-[#202020] dark:text-[#e5e5e5]">Avatar:</span> Should be a clear photo that represents you or your brand</div>
                  <div>• <span className="font-bold text-[#202020] dark:text-[#e5e5e5]">Cover Photo:</span> Can showcase your expeditions, photography, or personal style</div>
                  <div>• <span className="font-bold text-[#202020] dark:text-[#e5e5e5]">Quality:</span> Use high-resolution images that look good on all devices</div>
                  <div>• <span className="font-bold text-[#202020] dark:text-[#e5e5e5]">Content:</span> Must comply with platform guidelines (no offensive or copyrighted content)</div>
                  <div>• <span className="font-bold text-[#202020] dark:text-[#e5e5e5]">Processing:</span> Images are automatically optimized for web performance</div>
                </div>
              </div>
            </div>
          </div>

          {/* Location Privacy Settings */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
            <div className="bg-[#ac6d46] text-white px-4 py-2 font-bold text-sm flex items-center gap-2">
              <Shield size={16} strokeWidth={2} />
              LOCATION & PRIVACY SETTINGS
            </div>
            <div className="p-4 lg:p-6 space-y-6">
              {/* Privacy Level Selector */}
              <div>
                <label className="block text-xs font-medium mb-2 text-[#202020] dark:text-[#e5e5e5]">
                  LOCATION PRIVACY LEVEL
                </label>
                <select
                  value={formData.locationPrivacyLevel}
                  onChange={(e) => handleChange('locationPrivacyLevel', e.target.value as LocationPrivacyLevel)}
                  className="w-full px-3 py-2 border-2 border-[#202020] dark:border-[#616161] dark:bg-[#2a2a2a] dark:text-[#e5e5e5] text-sm focus:outline-none focus:border-[#4676ac]"
                >
                  {LOCATION_PRIVACY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label} - {option.description}
                    </option>
                  ))}
                </select>
                {privacyLevelInfo && (
                  <div className={`mt-2 p-3 border-2 ${
                    privacyLevelInfo.detailLevel === 'precise' ? 'border-[#ac6d46] bg-[#fff7f0] dark:bg-[#2a2420]' :
                    privacyLevelInfo.detailLevel === 'moderate' ? 'border-[#4676ac] bg-blue-50 dark:bg-blue-950/20' :
                    'border-[#616161] bg-[#f5f5f5] dark:bg-[#2a2a2a]'
                  }`}>
                    <div className="flex items-start gap-2">
                      <Info className="w-4 h-4 text-[#4676ac] flex-shrink-0 mt-0.5" strokeWidth={2} />
                      <div className="flex-1">
                        <div className="text-xs font-bold mb-1 text-[#202020] dark:text-[#e5e5e5]">
                          {privacyLevelInfo.label.toUpperCase()} • {privacyLevelInfo.detailLevel.toUpperCase()} DETAIL
                        </div>
                        <div className="text-xs text-[#202020] dark:text-[#e5e5e5]">
                          {privacyLevelInfo.description}
                        </div>
                        <div className="text-xs font-mono mt-2 text-[#616161] dark:text-[#b5bcc4]">
                          Example: {privacyLevelInfo.example}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {showPrivacyWarning && (
                  <div className="mt-2 p-3 border-2 border-[#ac6d46] bg-[#fff7f0] dark:bg-[#2a2420]">
                    <div className="flex items-start gap-2">
                      <Info className="w-4 h-4 text-[#ac6d46] flex-shrink-0 mt-0.5" strokeWidth={2} />
                      <div className="flex-1">
                        <div className="text-xs font-bold mb-1 text-[#202020] dark:text-[#e5e5e5]">
                          ABOUT PRECISE COORDINATES
                        </div>
                        <div className="text-xs text-[#202020] dark:text-[#e5e5e5]">
                          This setting shares your exact GPS location with your audience. Many explorers prefer City Level or Regional Level 
                          during active expeditions to maintain some location privacy while still sharing their journey. You can change this 
                          setting anytime.
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Home/From Location */}
              <div>
                <label className="block text-xs font-medium mb-2 text-[#202020] dark:text-[#e5e5e5] flex items-center gap-2">
                  <Home className="w-4 h-4 text-[#4676ac]" strokeWidth={2} />
                  HOME / FROM LOCATION (ORIGIN)
                </label>
                <LocationAutocompleteInput
                  value={formData.fromLocation}
                  onChange={(locationData) => {
                    setFormData(prev => ({
                      ...prev,
                      fromLocation: locationData.formattedAddress || prev.fromLocation,
                      fromCoordinates: locationData.coordinates || prev.fromCoordinates,
                      fromCity: locationData.city || '',
                      fromRegion: locationData.region || '',
                      fromCountry: locationData.country || '',
                      fromContinent: locationData.continent || '',
                    }));
                    setIsDirty(true);
                    setSaveStatus('idle');
                  }}
                  placeholder="Search for your home location..."
                />
                <div className="mt-2 p-2 bg-[#f5f5f5] dark:bg-[#2a2a2a] border border-[#b5bcc4] dark:border-[#3a3a3a]">
                  <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mb-1">
                    WILL BE DISPLAYED AS:
                  </div>
                  <div className="text-sm font-bold text-[#202020] dark:text-[#e5e5e5]">
                    {previewFromLocation.displayText}
                  </div>
                  {previewFromLocation.displayCoordinates && (
                    <div className="text-xs font-mono text-[#616161] dark:text-[#b5bcc4] mt-1">
                      {previewFromLocation.displayCoordinates}
                    </div>
                  )}
                </div>
                <p className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1">
                  Your home base or starting point. This location is static and won't change during expeditions.
                </p>
              </div>

              {/* Current Location Sync */}
              {hasActiveExpedition && (
                <div>
                  <label className="block text-xs font-medium mb-2 text-[#202020] dark:text-[#e5e5e5] flex items-center gap-2">
                    <Navigation className="w-4 h-4 text-[#ac6d46]" strokeWidth={2} />
                    CURRENT LOCATION AUTO-SYNC
                  </label>
                  <div className="p-3 border-2 border-[#ac6d46] bg-[#fff7f0] dark:bg-[#2a2420]">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="autoSync"
                        checked={formData.autoSyncFromExpedition}
                        onChange={(e) => handleChange('autoSyncFromExpedition', e.target.checked)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <label htmlFor="autoSync" className="text-xs font-medium text-[#202020] dark:text-[#e5e5e5] cursor-pointer">
                          Automatically sync current location from active expedition
                        </label>
                        <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1">
                          Your current location will automatically update based on your latest journal entries in "<span className="font-bold">{activeExpeditionName}</span>". 
                          When this is enabled, you cannot manually edit your current location.
                        </div>
                        {formData.autoSyncFromExpedition && (
                          <div className="mt-2 text-xs font-mono text-[#ac6d46]">
                            ✓ Currently syncing from: {activeExpeditionName}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Current Location Manual Input (only if not auto-syncing) */}
              {(!hasActiveExpedition || !formData.autoSyncFromExpedition) && (
                <div>
                  <label className="block text-xs font-medium mb-2 text-[#202020] dark:text-[#e5e5e5] flex items-center gap-2">
                    <Navigation className="w-4 h-4 text-[#ac6d46]" strokeWidth={2} />
                    CURRENT LOCATION {!hasActiveExpedition && '(MANUAL)'}
                  </label>
                  <LocationAutocompleteInput
                    value={formData.currentLocation}
                    onChange={(locationData) => {
                      setFormData(prev => ({
                        ...prev,
                        currentLocation: locationData.formattedAddress || prev.currentLocation,
                        currentCoordinates: locationData.coordinates || prev.currentCoordinates,
                        currentCity: locationData.city || '',
                        currentRegion: locationData.region || '',
                        currentCountry: locationData.country || '',
                        currentContinent: locationData.continent || '',
                      }));
                      setIsDirty(true);
                      setSaveStatus('idle');
                    }}
                    placeholder="Search for your current location..."
                  />
                  <div className="mt-2 p-2 bg-[#f5f5f5] dark:bg-[#2a2a2a] border border-[#b5bcc4] dark:border-[#3a3a3a]">
                    <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mb-1">
                      WILL BE DISPLAYED AS:
                    </div>
                    <div className="text-sm font-bold text-[#202020] dark:text-[#e5e5e5]">
                      {previewCurrentLocation.displayText}
                    </div>
                    {previewCurrentLocation.displayCoordinates && (
                      <div className="text-xs font-mono text-[#616161] dark:text-[#b5bcc4] mt-1">
                        {previewCurrentLocation.displayCoordinates}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1">
                    {hasActiveExpedition 
                      ? 'Manual override enabled. This will not automatically update from your expedition entries.'
                      : 'Set your current location manually since you have no active expeditions.'
                    }
                  </p>
                </div>
              )}

              {/* Auto-synced Current Location Display (read-only) */}
              {hasActiveExpedition && formData.autoSyncFromExpedition && (
                <div>
                  <label className="block text-xs font-medium mb-2 text-[#202020] dark:text-[#e5e5e5] flex items-center gap-2">
                    <Navigation className="w-4 h-4 text-[#ac6d46]" strokeWidth={2} />
                    CURRENT LOCATION (AUTO-SYNCED)
                  </label>
                  <div className="p-3 border-2 border-[#b5bcc4] dark:border-[#3a3a3a] bg-[#f5f5f5] dark:bg-[#1a1a1a]">
                    <div className="text-sm font-bold text-[#202020] dark:text-[#e5e5e5] mb-1">
                      {previewCurrentLocation.displayText}
                    </div>
                    {previewCurrentLocation.displayCoordinates && (
                      <div className="text-xs font-mono text-[#616161] dark:text-[#b5bcc4]">
                        {previewCurrentLocation.displayCoordinates}
                      </div>
                    )}
                    <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-2">
                      This location is automatically synced from your latest journal entry in "{activeExpeditionName}". 
                      Disable auto-sync above to manually set your current location.
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Equipment & Gear */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
            <div className="bg-[#616161] text-white px-4 py-2 font-bold text-sm">
              EQUIPMENT & GEAR
            </div>
            <div className="p-4 lg:p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium mb-2 text-[#202020] dark:text-[#e5e5e5]">
                  YOUR GEAR
                </label>
                <textarea
                  value={formData.equipment}
                  onChange={(e) => handleChange('equipment', e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2 border-2 border-[#202020] dark:border-[#616161] dark:bg-[#2a2a2a] dark:text-[#e5e5e5] text-sm focus:outline-none focus:border-[#4676ac] font-mono"
                  placeholder="Canon EOS R5&#10;DJI Mavic 3 Pro&#10;Toyota Land Cruiser&#10;Starlink Mini&#10;Goal Zero Yeti 1000&#10;Jackery Solar Panels"
                />
                <div className="mt-2 text-xs text-[#616161] dark:text-[#b5bcc4]">
                  List your expedition gear, one item per line. This helps sponsors and followers understand your setup.
                </div>
                <div className="mt-2 p-3 bg-[#f5f5f5] dark:bg-[#2a2a2a] border-l-2 border-[#4676ac] text-xs">
                  <div className="font-bold text-[#202020] dark:text-[#e5e5e5] mb-2">SUGGESTED CATEGORIES:</div>
                  <div className="text-[#616161] dark:text-[#b5bcc4] space-y-1">
                    <div>• <span className="font-bold text-[#202020] dark:text-[#e5e5e5]">Camera:</span> Canon, Sony, GoPro, DJI drones, etc.</div>
                    <div>• <span className="font-bold text-[#202020] dark:text-[#e5e5e5]">Vehicle:</span> Land Cruiser, Sprinter van, motorcycle, sailboat, etc.</div>
                    <div>• <span className="font-bold text-[#202020] dark:text-[#e5e5e5]">Connectivity:</span> Starlink, Garmin inReach, satellite phone, etc.</div>
                    <div>• <span className="font-bold text-[#202020] dark:text-[#e5e5e5]">Power:</span> Solar panels, portable batteries, generators, etc.</div>
                    <div>• <span className="font-bold text-[#202020] dark:text-[#e5e5e5]">Shelter:</span> Tent, rooftop tent, camper, hammock, etc.</div>
                    <div>• <span className="font-bold text-[#202020] dark:text-[#e5e5e5]">Other:</span> Navigation, cooking gear, safety equipment, etc.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Social Links */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
            <div className="bg-[#616161] text-white px-4 py-2 font-bold text-sm">
              SOCIAL LINKS & PORTFOLIO
            </div>
            <div className="p-4 lg:p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium mb-2 text-[#202020] dark:text-[#e5e5e5]">
                  WEBSITE
                </label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => handleChange('website', e.target.value)}
                  className="w-full px-3 py-2 border-2 border-[#202020] dark:border-[#616161] dark:bg-[#2a2a2a] dark:text-[#e5e5e5] text-sm focus:outline-none focus:border-[#4676ac]"
                  placeholder="https://yourwebsite.com"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-2 text-[#202020] dark:text-[#e5e5e5]">
                    TWITTER / X
                  </label>
                  <input
                    type="text"
                    value={formData.twitter}
                    onChange={(e) => handleChange('twitter', e.target.value)}
                    className="w-full px-3 py-2 border-2 border-[#202020] dark:border-[#616161] dark:bg-[#2a2a2a] dark:text-[#e5e5e5] text-sm focus:outline-none focus:border-[#4676ac]"
                    placeholder="@username"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-2 text-[#202020] dark:text-[#e5e5e5]">
                    INSTAGRAM
                  </label>
                  <input
                    type="text"
                    value={formData.instagram}
                    onChange={(e) => handleChange('instagram', e.target.value)}
                    className="w-full px-3 py-2 border-2 border-[#202020] dark:border-[#616161] dark:bg-[#2a2a2a] dark:text-[#e5e5e5] text-sm focus:outline-none focus:border-[#4676ac]"
                    placeholder="@username"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-2 text-[#202020] dark:text-[#e5e5e5]">
                  YOUTUBE
                </label>
                <input
                  type="text"
                  value={formData.youtube}
                  onChange={(e) => handleChange('youtube', e.target.value)}
                  className="w-full px-3 py-2 border-2 border-[#202020] dark:border-[#616161] dark:bg-[#2a2a2a] dark:text-[#e5e5e5] text-sm focus:outline-none focus:border-[#4676ac]"
                  placeholder="Channel Name"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={!isDirty || saveStatus === 'saving'}
              className={`px-6 py-3 bg-[#ac6d46] text-white hover:bg-[#8a5738] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] font-bold text-sm flex items-center gap-2 disabled:active:scale-100 disabled:bg-[#b5bcc4] ${
                saveStatus === 'saving' ? 'disabled:cursor-wait' : 'disabled:cursor-default'
              }`}
            >
              {saveStatus === 'saving' ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Save size={16} strokeWidth={2} />
              )}
              {saveStatus === 'saving' ? 'SAVING...' : isDirty ? 'SAVE CHANGES' : 'SAVED'}
            </button>
            <button
              onClick={handleCancel}
              className="px-6 py-3 border-2 border-[#202020] dark:border-[#616161] text-[#202020] dark:text-[#e5e5e5] hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#616161] font-bold text-sm flex items-center gap-2"
            >
              <X size={16} strokeWidth={2} />
              CANCEL
            </button>
          </div>
        </div>

        {/* Sidebar - Profile Preview */}
        <div className="space-y-6">
          {/* Privacy Summary */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-4">
            <h3 className="text-xs font-bold mb-3 border-b border-[#202020] dark:border-[#616161] pb-2 dark:text-[#e5e5e5] flex items-center gap-2">
              <Shield className="w-4 h-4" strokeWidth={2} />
              PRIVACY SUMMARY
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <div className="text-[#616161] dark:text-[#b5bcc4] mb-1">Current Privacy Level:</div>
                <div className="font-bold text-[#202020] dark:text-[#e5e5e5]">
                  {privacyLevelInfo?.label}
                </div>
                <div className={`inline-block px-2 py-0.5 mt-1 text-white text-xs font-bold ${
                  privacyLevelInfo?.detailLevel === 'precise' ? 'bg-[#ac6d46]' :
                  privacyLevelInfo?.detailLevel === 'moderate' ? 'bg-[#4676ac]' :
                  'bg-[#616161]'
                }`}>
                  {privacyLevelInfo?.detailLevel.toUpperCase()} DETAIL
                </div>
              </div>
              
              <div className="border-t border-[#b5bcc4] dark:border-[#3a3a3a] pt-3">
                <div className="text-[#616161] dark:text-[#b5bcc4] mb-1">Location Sync:</div>
                <div className="font-bold text-[#202020] dark:text-[#e5e5e5]">
                  {formData.autoSyncFromExpedition && hasActiveExpedition 
                    ? 'Auto-sync from Expedition' 
                    : 'Manual Entry'}
                </div>
              </div>

              <div className="border-t border-[#b5bcc4] dark:border-[#3a3a3a] pt-3">
                <div className="text-[#616161] dark:text-[#b5bcc4] mb-1">Location Info Shared:</div>
                <ul className="list-disc list-inside space-y-1 text-[#202020] dark:text-[#e5e5e5]">
                  {formData.locationPrivacyLevel === 'HIDDEN' && <li>No location data</li>}
                  {formData.locationPrivacyLevel === 'CONTINENT_LEVEL' && <li>Continent only</li>}
                  {formData.locationPrivacyLevel === 'COUNTRY_LEVEL' && <li>Country only</li>}
                  {formData.locationPrivacyLevel === 'REGIONAL_LEVEL' && <li>Region/State and Country</li>}
                  {formData.locationPrivacyLevel === 'CITY_LEVEL' && <li>City name and Country</li>}
                  {formData.locationPrivacyLevel === 'PRECISE_COORDINATES' && <li>Exact GPS coordinates</li>}
                </ul>
              </div>
            </div>
          </div>

          {/* Location Privacy Guide */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-4">
            <h3 className="text-xs font-bold mb-3 border-b border-[#202020] dark:border-[#616161] pb-2 dark:text-[#e5e5e5]">
              LOCATION PRIVACY GUIDE
            </h3>
            <div className="space-y-2 text-xs text-[#616161] dark:text-[#b5bcc4]">
              <div className="flex items-start gap-2">
                <div className="text-[#4676ac] mt-0.5">•</div>
                <div>Choose a privacy level that matches your comfort with sharing location details</div>
              </div>
              <div className="flex items-start gap-2">
                <div className="text-[#4676ac] mt-0.5">•</div>
                <div>Most explorers use City or Regional level during active expeditions</div>
              </div>
              <div className="flex items-start gap-2">
                <div className="text-[#4676ac] mt-0.5">•</div>
                <div>You can change your privacy level at any time</div>
              </div>
              <div className="flex items-start gap-2">
                <div className="text-[#4676ac] mt-0.5">•</div>
                <div>Auto-sync keeps your location updated from your latest journal entries</div>
              </div>
              <div className="flex items-start gap-2">
                <div className="text-[#4676ac] mt-0.5">•</div>
                <div>Precise coordinates are useful for completed expeditions or specific waypoints</div>
              </div>
            </div>
          </div>

          {/* Help Link */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-4">
            <h3 className="text-xs font-bold mb-3 border-b border-[#202020] dark:border-[#616161] pb-2 dark:text-[#e5e5e5]">
              NEED HELP?
            </h3>
            <Link
              href="/documentation"
              className="text-xs text-[#4676ac] hover:underline block"
            >
              View Location Privacy Documentation →
            </Link>
          </div>
        </div>
      </div>
    </SettingsLayout>
  );
}