'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/app/components/ui/dialog';
import { explorerApi } from '@/app/services/api';
import { Camera, Loader2, User, Phone, Mail, MessageSquare } from 'lucide-react';
import {
  getPhoneValidationError,
  normalizePhoneInput,
} from '@/app/utils/phoneValidation';

interface WelcomeModalProps {
  open: boolean;
  onClose: () => void;
  onSaveComplete?: () => Promise<void>;
  username: string;
  isGuide?: boolean;
}

export function WelcomeModal({ open, onClose, onSaveComplete, username, isGuide }: WelcomeModalProps) {
  const [journalName, setJournalName] = useState('');
  const [bio, setBio] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [preferredContactMethod, setPreferredContactMethod] = useState<'email' | 'phone' | 'message'>('message');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB');
      return;
    }

    setError(null);
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const phoneValidationError = isGuide ? getPhoneValidationError(phoneNumber) : null;
  const phoneRequiredButMissing =
    isGuide && preferredContactMethod === 'phone' && !phoneNumber.trim();
  const hasBlockingGuideContactError = !!phoneValidationError || phoneRequiredButMissing;

  const handleSave = async () => {
    if (isGuide) {
      if (phoneValidationError) {
        setError(phoneValidationError);
        return;
      }
      if (phoneRequiredButMissing) {
        setError('Add a phone number — Phone is your preferred contact method.');
        return;
      }
    }

    setIsSaving(true);
    setError(null);

    try {
      // Upload avatar if selected
      if (avatarFile) {
        await explorerApi.uploadPicture(avatarFile);
      }

      // Only update profile if any fields are filled
      const hasName = journalName.trim().length > 0;
      const hasBio = bio.trim().length > 0;
      const hasPhone = isGuide && phoneNumber.trim().length > 0;
      const hasContactMethod = isGuide;

      if (hasName || hasBio || hasPhone || hasContactMethod) {
        const payload: {
          name?: string;
          bio?: string;
          phoneNumber?: string;
          preferredContactMethod?: 'email' | 'phone' | 'message';
        } = {};
        if (hasName) payload.name = journalName.trim();
        if (hasBio) payload.bio = bio.trim();
        if (isGuide) {
          payload.phoneNumber = phoneNumber.trim();
          payload.preferredContactMethod = preferredContactMethod;
        }

        await explorerApi.updateProfile(payload);
      }

      // Refresh user data to update navbar and other components
      if (onSaveComplete) {
        await onSaveComplete();
      }

      onClose();
    } catch {
      setError('Failed to save profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[500px] bg-[#f5f5f5] dark:bg-[#2a2a2a] border-2 border-[#202020] dark:border-[#616161] p-0 gap-0">
        {/* Header */}
        <div className="bg-[#202020] px-6 py-4 border-b-[3px] border-[#ac6d46]">
          <DialogHeader>
            <DialogTitle className="text-white text-lg font-bold tracking-wide">
              WELCOME TO HEIMURSAGA
            </DialogTitle>
            <DialogDescription className="text-[#b5bcc4] text-sm">
              Complete your profile to get started, {username}
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Avatar Upload */}
          <div className="flex items-start gap-4">
            <div
              className="relative w-20 h-20 bg-[#e5e5e5] dark:bg-[#3a3a3a] border-2 border-[#202020] dark:border-[#616161] rounded-sm flex items-center justify-center cursor-pointer hover:border-[#ac6d46] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] overflow-hidden"
              onClick={() => fileInputRef.current?.click()}
            >
              {avatarPreview ? (
                <Image
                  src={avatarPreview}
                  alt="Avatar preview"
                  className="w-full h-full object-cover"
                  width={80}
                  height={80}
                />
              ) : (
                <User className="w-8 h-8 text-[#616161]" />
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-[#202020] dark:text-[#e5e5e5] mb-1 tracking-wide">
                PROFILE PHOTO
              </label>
              <p className="text-xs text-[#616161] dark:text-[#b5bcc4]">
                Click to upload (optional)
              </p>
              <p className="text-xs text-[#616161] dark:text-[#b5bcc4]">
                Max 5MB, square recommended
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>

          {/* Journal / Business Name */}
          <div>
            <label className="block text-xs font-medium text-[#202020] dark:text-[#e5e5e5] mb-2 tracking-wide">
              {isGuide ? 'BUSINESS NAME' : 'JOURNAL NAME'} <span className="text-[#616161] font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={journalName}
              onChange={(e) => setJournalName(e.target.value)}
              placeholder={isGuide ? 'Your guide business name...' : 'A title for your journal...'}
              className="w-full px-3 py-2 bg-white dark:bg-[#3a3a3a] border-2 border-[#202020] dark:border-[#616161] text-[#202020] dark:text-[#e5e5e5] placeholder:text-[#616161] text-sm focus:outline-none focus:border-[#ac6d46]"
              maxLength={100}
            />
          </div>

          {/* Bio */}
          <div>
            <label className="block text-xs font-medium text-[#202020] dark:text-[#e5e5e5] mb-2 tracking-wide">
              BIO
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell others about yourself and your explorations..."
              rows={4}
              className="w-full px-3 py-2 bg-white dark:bg-[#3a3a3a] border-2 border-[#202020] dark:border-[#616161] text-[#202020] dark:text-[#e5e5e5] placeholder:text-[#616161] text-sm resize-none focus:outline-none focus:border-[#ac6d46]"
              maxLength={500}
            />
            <div className="text-right text-xs text-[#616161] mt-1">
              {bio.length}/500 chars
            </div>
          </div>

          {/* Guide Contact — only for guide accounts */}
          {isGuide && (
            <div className="border-t-2 border-[#598636] pt-6 space-y-4">
              <div className="flex items-start gap-2">
                <Phone className="w-4 h-4 text-[#598636] mt-0.5 flex-shrink-0" strokeWidth={2} />
                <div>
                  <div className="text-xs font-bold text-[#598636] tracking-wide mb-1">
                    GUIDE CONTACT
                  </div>
                  <p className="text-xs text-[#616161] dark:text-[#b5bcc4]">
                    How should explorers reach you when they have questions or want to book an in-person guided expedition? This appears as a Contact button on your public profile.
                  </p>
                </div>
              </div>

              {/* Preferred method picker */}
              <div>
                <label className="block text-xs font-medium text-[#202020] dark:text-[#e5e5e5] mb-2 tracking-wide">
                  PREFERRED METHOD
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: 'message', label: 'MESSAGE', Icon: MessageSquare },
                    { value: 'email', label: 'EMAIL', Icon: Mail },
                    { value: 'phone', label: 'PHONE', Icon: Phone },
                  ] as const).map(({ value, label, Icon }) => {
                    const selected = preferredContactMethod === value;
                    return (
                      <button
                        type="button"
                        key={value}
                        onClick={() => setPreferredContactMethod(value)}
                        className={`p-2 flex flex-col items-center gap-1 border-2 transition-all ${
                          selected
                            ? 'border-[#598636] bg-[#598636]/10 dark:bg-[#598636]/20'
                            : 'border-[#b5bcc4] dark:border-[#3a3a3a] hover:border-[#616161]'
                        }`}
                      >
                        <Icon size={14} strokeWidth={2} className={selected ? 'text-[#598636]' : 'text-[#616161]'} />
                        <span className={`text-[10px] font-bold ${selected ? 'text-[#598636]' : 'text-[#202020] dark:text-[#e5e5e5]'}`}>
                          {label}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {preferredContactMethod === 'message' && (
                  <p className="text-[10px] text-[#616161] dark:text-[#b5bcc4] mt-2 leading-snug">
                    Note: In-app messaging is an Explorer Pro feature, so only Explorer Pro members will be able to reach you this way.
                  </p>
                )}
              </div>

              {/* Phone number */}
              <div>
                <label className="block text-xs font-medium text-[#202020] dark:text-[#e5e5e5] mb-2 tracking-wide">
                  PHONE NUMBER {preferredContactMethod !== 'phone' && (
                    <span className="text-[#616161] font-normal">(optional)</span>
                  )}
                </label>
                <input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(normalizePhoneInput(e.target.value))}
                  placeholder="+1 555 123 4567"
                  maxLength={30}
                  aria-invalid={phoneValidationError ? true : undefined}
                  className={`w-full px-3 py-2 bg-white dark:bg-[#3a3a3a] border-2 text-[#202020] dark:text-[#e5e5e5] placeholder:text-[#616161] text-sm focus:outline-none font-mono ${
                    phoneValidationError
                      ? 'border-[#994040] focus:border-[#994040]'
                      : 'border-[#202020] dark:border-[#616161] focus:border-[#598636]'
                  }`}
                />
                <p className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1">
                  Include country code. Only shown publicly when Phone is selected.
                </p>
                {phoneValidationError && (
                  <p className="text-xs text-[#994040] mt-1">{phoneValidationError}</p>
                )}
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-[#994040] dark:border-[#994040] text-[#994040] dark:text-red-400 px-3 py-2 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 pt-0">
          <button
            onClick={handleSkip}
            disabled={isSaving}
            className="flex-1 px-4 py-3 bg-[#616161] text-white text-sm font-bold tracking-wide hover:bg-[#505050] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#616161] disabled:opacity-50 disabled:active:scale-100"
          >
            SKIP FOR NOW
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || hasBlockingGuideContactError}
            className="flex-1 px-4 py-3 bg-[#ac6d46] text-white text-sm font-bold tracking-wide hover:bg-[#9a6240] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                SAVING...
              </>
            ) : (
              'COMPLETE PROFILE'
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
