'use client';

import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/app/components/ui/dialog';
import { explorerApi } from '@/app/services/api';
import { Camera, Loader2, User } from 'lucide-react';

interface WelcomeModalProps {
  open: boolean;
  onClose: () => void;
  onSaveComplete?: () => Promise<void>;
  username: string;
}

export function WelcomeModal({ open, onClose, onSaveComplete, username }: WelcomeModalProps) {
  const [journalName, setJournalName] = useState('');
  const [bio, setBio] = useState('');
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

  const handleSave = async () => {
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

      if (hasName || hasBio) {
        const payload: { name?: string; bio?: string } = {};
        if (hasName) payload.name = journalName.trim();
        if (hasBio) payload.bio = bio.trim();

        await explorerApi.updateProfile(payload);
      }

      // Refresh user data to update navbar and other components
      if (onSaveComplete) {
        await onSaveComplete();
      }

      onClose();
    } catch (_err) {
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
              className="relative w-20 h-20 bg-[#e5e5e5] dark:bg-[#404040] border-2 border-[#202020] dark:border-[#616161] rounded-sm flex items-center justify-center cursor-pointer hover:border-[#ac6d46] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] overflow-hidden"
              onClick={() => fileInputRef.current?.click()}
            >
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Avatar preview"
                  className="w-full h-full object-cover"
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

          {/* Journal Name */}
          <div>
            <label className="block text-xs font-medium text-[#202020] dark:text-[#e5e5e5] mb-2 tracking-wide">
              JOURNAL NAME <span className="text-[#616161] font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={journalName}
              onChange={(e) => setJournalName(e.target.value)}
              placeholder="A title for your journal..."
              className="w-full px-3 py-2 bg-white dark:bg-[#404040] border-2 border-[#202020] dark:border-[#616161] text-[#202020] dark:text-[#e5e5e5] placeholder:text-[#616161] text-sm focus:outline-none focus:border-[#ac6d46]"
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
              className="w-full px-3 py-2 bg-white dark:bg-[#404040] border-2 border-[#202020] dark:border-[#616161] text-[#202020] dark:text-[#e5e5e5] placeholder:text-[#616161] text-sm resize-none focus:outline-none focus:border-[#ac6d46]"
              maxLength={500}
            />
            <div className="text-right text-xs text-[#616161] mt-1">
              {bio.length}/500 chars
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-3 py-2 text-sm">
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
            disabled={isSaving}
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
