'use client';

import { useState, useEffect } from 'react';
import { Mail, Lock, Info } from 'lucide-react';
import { SettingsLayout } from '@/app/components/SettingsLayout';
import { useAuth } from '@/app/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { explorerApi } from '@/app/services/api';
import { toast } from 'sonner';

const DEFAULT_PREFERENCES: Record<string, boolean> = {
  email_sponsorship_received: true,
  email_new_entry_from_following: true,
  email_expedition_milestones: true,
};

const PREFERENCE_CONFIG = [
  {
    key: 'email_sponsorship_received',
    label: 'Sponsorship Received',
    description: 'Get notified when someone sponsors your expedition or sends a quick sponsor',
  },
  {
    key: 'email_new_entry_from_following',
    label: 'New Entries from Sponsoring',
    description: 'Get full journal entry delivery emails from explorers you sponsor',
  },
  {
    key: 'email_expedition_milestones',
    label: 'Expedition Milestones',
    description: 'Get notified when your expeditions reach milestones (coming soon)',
  },
];

export function NotificationsSettingsPage() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [preferences, setPreferences] = useState<Record<string, boolean>>(DEFAULT_PREFERENCES);
  const [savedPreferences, setSavedPreferences] = useState<Record<string, boolean>>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  useEffect(() => {
    if (!isAuthenticated) return;
    explorerApi.getProfileSettings().then((settings) => {
      const prefs = { ...DEFAULT_PREFERENCES, ...settings.notificationPreferences };
      setPreferences(prefs);
      setSavedPreferences(prefs);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, [isAuthenticated]);

  const isDirty = JSON.stringify(preferences) !== JSON.stringify(savedPreferences);

  const handleToggle = (key: string) => {
    setPreferences((prev) => ({ ...prev, [key]: !prev[key] }));
    setSaveStatus('idle');
  };

  const handleSave = async () => {
    setSaveStatus('saving');
    try {
      await explorerApi.updateProfile({ notificationPreferences: preferences });
      setSavedPreferences(preferences);
      setSaveStatus('saved');
      toast.success('Notification preferences saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch {
      setSaveStatus('error');
      toast.error('Failed to save preferences');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

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
              You must be logged in to manage notification settings. Please log in to continue.
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

  const enabledCount = Object.values(preferences).filter(Boolean).length;
  const totalCount = PREFERENCE_CONFIG.length;

  return (
    <SettingsLayout>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Email Notifications */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
            <div className="bg-[#616161] text-white px-4 py-3 font-bold text-sm flex items-center gap-2">
              <Mail className="w-4 h-4" />
              EMAIL NOTIFICATIONS
            </div>
            <div className="p-4 lg:p-6">
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center justify-between gap-4 py-3 border-b border-[#b5bcc4] dark:border-[#3a3a3a] last:border-0">
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-40 bg-[#b5bcc4] dark:bg-[#3a3a3a] animate-pulse" />
                        <div className="h-3 w-64 bg-[#b5bcc4] dark:bg-[#3a3a3a] animate-pulse" />
                      </div>
                      <div className="w-11 h-6 bg-[#b5bcc4] dark:bg-[#3a3a3a] animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-0">
                  {PREFERENCE_CONFIG.map(({ key, label, description }) => (
                    <div key={key} className="flex items-start justify-between gap-4 py-3 border-b border-[#b5bcc4] dark:border-[#3a3a3a] last:border-0">
                      <div className="flex-1">
                        <div className="text-sm font-bold mb-1 dark:text-[#e5e5e5]">{label}</div>
                        <div className="text-xs text-[#616161] dark:text-[#b5bcc4] leading-relaxed">{description}</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                        <input
                          type="checkbox"
                          checked={preferences[key] !== false}
                          onChange={() => handleToggle(key)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-[#b5bcc4] peer-focus:outline-none peer-checked:bg-[#4676ac] relative peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:border-[#202020] after:h-5 after:w-5 after:transition-all"></div>
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Always-sent notice */}
          <div className="bg-[#f5f5f5] dark:bg-[#2a2a2a] border-2 border-[#b5bcc4] dark:border-[#616161] p-4 flex items-start gap-3">
            <Info className="w-4 h-4 text-[#4676ac] flex-shrink-0 mt-0.5" />
            <div className="text-xs text-[#616161] dark:text-[#b5bcc4] leading-relaxed">
              Transactional emails (password reset, payment receipts, email verification, sponsorship cancellations) are always sent and cannot be disabled.
            </div>
          </div>

          {/* Save */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-4 lg:p-6">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">
                Changes take effect immediately after saving.
              </div>
              <button
                onClick={handleSave}
                disabled={!isDirty || saveStatus === 'saving'}
                className={`w-full sm:w-auto px-6 py-3 font-bold text-sm transition-all ${
                  isDirty && saveStatus !== 'saving'
                    ? 'bg-[#ac6d46] text-white hover:bg-[#8a5738]'
                    : 'bg-[#b5bcc4] text-[#616161] cursor-not-allowed'
                }`}
              >
                {saveStatus === 'saving'
                  ? 'SAVING...'
                  : saveStatus === 'saved'
                    ? 'SAVED'
                    : saveStatus === 'error'
                      ? 'ERROR — TRY AGAIN'
                      : isDirty
                        ? 'SAVE CHANGES'
                        : 'NO CHANGES'}
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
            <div className="bg-[#4676ac] text-white px-4 py-3 font-bold text-sm">
              NOTIFICATION STATUS
            </div>
            <div className="p-4 space-y-3 text-xs font-mono">
              <div className="flex justify-between items-center">
                <span className="text-[#616161] dark:text-[#b5bcc4]">Email Enabled:</span>
                <span className="font-bold text-[#4676ac]">{enabledCount} / {totalCount}</span>
              </div>
              <div className="flex justify-between items-center border-t border-[#b5bcc4] dark:border-[#616161] pt-3">
                <span className="text-[#616161] dark:text-[#b5bcc4]">Always-On:</span>
                <span className="font-bold dark:text-[#e5e5e5]">6 TRANSACTIONAL</span>
              </div>
              {isDirty && (
                <div className="text-[#ac6d46] border-t border-[#b5bcc4] dark:border-[#616161] pt-3">
                  UNSAVED CHANGES
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#b5bcc4] dark:border-[#616161]">
            <div className="p-4">
              <div className="text-xs font-bold mb-3 dark:text-[#e5e5e5]">QUICK ACTIONS</div>
              <div className="space-y-2">
                <button
                  onClick={() => {
                    const allOn = Object.fromEntries(
                      PREFERENCE_CONFIG.map(({ key }) => [key, true])
                    );
                    setPreferences(allOn);
                    setSaveStatus('idle');
                  }}
                  className="w-full px-3 py-2 text-xs font-bold bg-[#202020] dark:bg-[#4676ac] text-white hover:bg-[#0a0a0a] dark:hover:bg-[#365a87] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#4676ac] text-left"
                >
                  ENABLE ALL EMAIL
                </button>
                <button
                  onClick={() => {
                    const allOff = Object.fromEntries(
                      PREFERENCE_CONFIG.map(({ key }) => [key, false])
                    );
                    setPreferences(allOff);
                    setSaveStatus('idle');
                  }}
                  className="w-full px-3 py-2 text-xs font-bold border-2 border-[#202020] dark:border-[#616161] dark:text-[#e5e5e5] hover:bg-[#95a2aa] dark:hover:bg-[#2a2a2a] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#616161] text-left"
                >
                  DISABLE ALL EMAIL
                </button>
              </div>
            </div>
          </div>

          {/* Tips */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#b5bcc4] dark:border-[#616161]">
            <div className="p-4">
              <div className="text-xs font-bold mb-2 dark:text-[#e5e5e5]">HOW IT WORKS</div>
              <div className="text-xs text-[#616161] dark:text-[#b5bcc4] space-y-2 leading-relaxed">
                <div>Sponsorship alerts notify you when someone sponsors your expedition or sends a quick sponsor</div>
                <div>Entry delivery emails send full journal entries from explorers you sponsor</div>
                <div>Password resets, payment receipts, and verification emails always send</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SettingsLayout>
  );
}
