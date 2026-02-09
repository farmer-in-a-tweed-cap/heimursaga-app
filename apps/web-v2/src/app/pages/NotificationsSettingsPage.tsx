'use client';

import { useState } from 'react';
import { Bell, Mail, MessageSquare, Lock } from 'lucide-react';
import type { ReactNode } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { SettingsLayout } from '@/app/components/SettingsLayout';

export function NotificationsSettingsPage() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [emailNotifications, setEmailNotifications] = useState({
    newSponsorship: true,
    sponsorshipMilestone: true,
    newMessage: true,
    newFollower: false,
    expeditionUpdate: true,
    weeklyDigest: true,
    monthlyReport: false,
    systemAnnouncements: true,
  });

  const [pushNotifications, setPushNotifications] = useState({
    newSponsorship: true,
    newMessage: true,
    expeditionReminder: false,
    dailySummary: false,
  });

  const [preferences, setPreferences] = useState({
    digestDay: 'monday',
    digestTime: '09:00',
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
    quietHoursEnabled: false,
  });

  const [isDirty, setIsDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const handleEmailToggle = (key: string) => {
    setEmailNotifications(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }));
    setIsDirty(true);
    setSaveStatus('idle');
  };

  const handlePushToggle = (key: string) => {
    setPushNotifications(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }));
    setIsDirty(true);
    setSaveStatus('idle');
  };

  const handlePreferenceChange = (key: string, value: string | boolean) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
    setIsDirty(true);
    setSaveStatus('idle');
  };

  const handleSave = () => {
    setSaveStatus('saving');
    setTimeout(() => {
      setSaveStatus('saved');
      setIsDirty(false);
      setTimeout(() => setSaveStatus('idle'), 3000);
    }, 1000);
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
            <div className="p-4 lg:p-6 space-y-4">
              <NotificationToggle
                icon={<Bell className="w-4 h-4" />}
                label="New Sponsorship Received"
                description="Instant notification when someone sponsors your expedition"
                checked={emailNotifications.newSponsorship}
                onChange={() => handleEmailToggle('newSponsorship')}
              />
              <NotificationToggle
                icon={<Bell className="w-4 h-4" />}
                label="Sponsorship Milestones"
                description="Alerts when your expedition reaches funding goals ($100, $500, $1000, etc.)"
                checked={emailNotifications.sponsorshipMilestone}
                onChange={() => handleEmailToggle('sponsorshipMilestone')}
              />
              <NotificationToggle
                icon={<MessageSquare className="w-4 h-4" />}
                label="New Messages"
                description="Email when you receive a direct message from another explorer"
                checked={emailNotifications.newMessage}
                onChange={() => handleEmailToggle('newMessage')}
              />
              <NotificationToggle
                icon={<Bell className="w-4 h-4" />}
                label="New Followers"
                description="Notification when someone follows your journal"
                checked={emailNotifications.newFollower}
                onChange={() => handleEmailToggle('newFollower')}
              />
              <NotificationToggle
                icon={<Bell className="w-4 h-4" />}
                label="Expedition Updates"
                description="Reminders to post updates for active expeditions"
                checked={emailNotifications.expeditionUpdate}
                onChange={() => handleEmailToggle('expeditionUpdate')}
              />

              <div className="border-t-2 border-[#b5bcc4] dark:border-[#3a3a3a] pt-4 mt-4">
                <div className="text-xs font-bold mb-3 text-[#202020] dark:text-[#e5e5e5]">DIGEST & SUMMARY EMAILS</div>
                <div className="space-y-4">
                  <NotificationToggle
                    icon={<Mail className="w-4 h-4" />}
                    label="Weekly Activity Digest"
                    description="Summary of your journal activity, sponsorships, and engagement"
                    checked={emailNotifications.weeklyDigest}
                    onChange={() => handleEmailToggle('weeklyDigest')}
                  />
                  <NotificationToggle
                    icon={<Mail className="w-4 h-4" />}
                    label="Monthly Performance Report"
                    description="Detailed analytics and insights about your expeditions and sponsorships"
                    checked={emailNotifications.monthlyReport}
                    onChange={() => handleEmailToggle('monthlyReport')}
                  />
                </div>
              </div>

              <div className="border-t-2 border-[#b5bcc4] dark:border-[#3a3a3a] pt-4 mt-4">
                <div className="text-xs font-bold mb-3 text-[#202020] dark:text-[#e5e5e5]">PLATFORM COMMUNICATIONS</div>
                <NotificationToggle
                  icon={<Bell className="w-4 h-4" />}
                  label="System Announcements"
                  description="Important updates about Heimursaga features and policies"
                  checked={emailNotifications.systemAnnouncements}
                  onChange={() => handleEmailToggle('systemAnnouncements')}
                />
              </div>
            </div>
          </div>

          {/* Push Notifications */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
            <div className="bg-[#616161] dark:bg-[#3a3a3a] text-white px-4 py-3 font-bold text-sm flex items-center gap-2">
              <Bell className="w-4 h-4" />
              BROWSER PUSH NOTIFICATIONS
            </div>
            <div className="p-4 lg:p-6">
              <div className="bg-[#f5f5f5] dark:bg-[#2a2a2a] border-2 border-[#b5bcc4] dark:border-[#616161] p-3 mb-4 text-xs">
                <div className="font-bold mb-1 dark:text-[#e5e5e5]">⚠ Browser Permission Required</div>
                <div className="text-[#616161] dark:text-[#b5bcc4]">
                  You must enable browser notifications in your system settings for these to work. 
                  Click "Allow" when your browser prompts you.
                </div>
              </div>

              <div className="space-y-4">
                <NotificationToggle
                  icon={<Bell className="w-4 h-4" />}
                  label="Instant Sponsorship Alerts"
                  description="Real-time browser notification when you receive sponsorship"
                  checked={pushNotifications.newSponsorship}
                  onChange={() => handlePushToggle('newSponsorship')}
                />
                <NotificationToggle
                  icon={<MessageSquare className="w-4 h-4" />}
                  label="Message Notifications"
                  description="Pop-up notification for new direct messages"
                  checked={pushNotifications.newMessage}
                  onChange={() => handlePushToggle('newMessage')}
                />
                <NotificationToggle
                  icon={<Bell className="w-4 h-4" />}
                  label="Expedition Reminders"
                  description="Daily reminder if you haven't posted to active expeditions"
                  checked={pushNotifications.expeditionReminder}
                  onChange={() => handlePushToggle('expeditionReminder')}
                />
                <NotificationToggle
                  icon={<Bell className="w-4 h-4" />}
                  label="Daily Activity Summary"
                  description="End-of-day summary of your journal's performance"
                  checked={pushNotifications.dailySummary}
                  onChange={() => handlePushToggle('dailySummary')}
                />
              </div>
            </div>
          </div>

          {/* Notification Preferences */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
            <div className="bg-[#616161] dark:bg-[#3a3a3a] text-white px-4 py-3 font-bold text-sm">
              NOTIFICATION SCHEDULE & PREFERENCES
            </div>
            <div className="p-4 lg:p-6 space-y-6">
              {/* Weekly Digest Settings */}
              <div>
                <label className="block text-xs font-medium mb-3 text-[#202020] dark:text-[#e5e5e5]">
                  WEEKLY DIGEST SCHEDULE
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-[#616161] dark:text-[#b5bcc4] mb-2 font-mono">Day of Week</label>
                    <select
                      value={preferences.digestDay}
                      onChange={(e) => handlePreferenceChange('digestDay', e.target.value)}
                      className="w-full px-3 py-2 border-2 border-[#202020] dark:border-[#616161] dark:bg-[#2a2a2a] dark:text-[#e5e5e5] text-sm focus:outline-none focus:border-[#4676ac]"
                    >
                      <option value="monday">Monday</option>
                      <option value="tuesday">Tuesday</option>
                      <option value="wednesday">Wednesday</option>
                      <option value="thursday">Thursday</option>
                      <option value="friday">Friday</option>
                      <option value="saturday">Saturday</option>
                      <option value="sunday">Sunday</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-[#616161] dark:text-[#b5bcc4] mb-2 font-mono">Time (24-hour)</label>
                    <input
                      type="time"
                      value={preferences.digestTime}
                      onChange={(e) => handlePreferenceChange('digestTime', e.target.value)}
                      className="w-full px-3 py-2 border-2 border-[#202020] dark:border-[#616161] dark:bg-[#2a2a2a] dark:text-[#e5e5e5] text-sm focus:outline-none focus:border-[#4676ac]"
                    />
                  </div>
                </div>
              </div>

              {/* Quiet Hours */}
              <div className="border-t-2 border-[#b5bcc4] pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <label className="block text-xs font-medium mb-1 text-[#202020] dark:text-[#e5e5e5]">
                      QUIET HOURS (DO NOT DISTURB)
                    </label>
                    <p className="text-xs text-[#616161] dark:text-[#b5bcc4]">
                      Suppress all non-critical notifications during specified hours
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.quietHoursEnabled}
                      onChange={(e) => handlePreferenceChange('quietHoursEnabled', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-[#b5bcc4] peer-focus:outline-none peer-checked:bg-[#4676ac] relative peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:border-[#202020] after:h-5 after:w-5 after:transition-all"></div>
                  </label>
                </div>

                {preferences.quietHoursEnabled && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-[#616161] dark:text-[#b5bcc4] mb-2 font-mono">Start Time</label>
                      <input
                        type="time"
                        value={preferences.quietHoursStart}
                        onChange={(e) => handlePreferenceChange('quietHoursStart', e.target.value)}
                        className="w-full px-3 py-2 border-2 border-[#202020] dark:border-[#616161] dark:bg-[#2a2a2a] dark:text-[#e5e5e5] text-sm focus:outline-none focus:border-[#4676ac]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#616161] dark:text-[#b5bcc4] mb-2 font-mono">End Time</label>
                      <input
                        type="time"
                        value={preferences.quietHoursEnd}
                        onChange={(e) => handlePreferenceChange('quietHoursEnd', e.target.value)}
                        className="w-full px-3 py-2 border-2 border-[#202020] dark:border-[#616161] dark:bg-[#2a2a2a] dark:text-[#e5e5e5] text-sm focus:outline-none focus:border-[#4676ac]"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Save Actions */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-4 lg:p-6">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div className="flex items-start gap-2 text-xs text-[#616161] dark:text-[#b5bcc4]">
                <Bell className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  Changes take effect immediately after saving. You can adjust these settings at any time.
                </div>
              </div>
              <button
                onClick={handleSave}
                disabled={!isDirty || saveStatus === 'saving'}
                className={`w-full px-6 py-3 font-bold transition-all ${
                  isDirty && saveStatus !== 'saving'
                    ? 'bg-[#ac6d46] text-white hover:bg-[#8a5738]'
                    : 'bg-[#b5bcc4] text-[#616161] cursor-not-allowed'
                }`}
              >
                {saveStatus === 'saving' ? 'SAVING CHANGES...' : isDirty ? 'SAVE CHANGES' : 'NO CHANGES'}
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
                <span className="font-bold text-[#4676ac]">✓ YES</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#616161] dark:text-[#b5bcc4]">Push Enabled:</span>
                <span className="font-bold text-[#616161] dark:text-[#b5bcc4]">✗ BLOCKED</span>
              </div>
              <div className="flex justify-between items-center border-t border-[#b5bcc4] dark:border-[#616161] pt-3">
                <span className="text-[#616161] dark:text-[#b5bcc4]">Active Rules:</span>
                <span className="font-bold dark:text-[#e5e5e5]">
                  {Object.values(emailNotifications).filter(Boolean).length + 
                   Object.values(pushNotifications).filter(Boolean).length}
                </span>
              </div>
              {isDirty && (
                <div className="text-[#ac6d46] border-t border-[#b5bcc4] dark:border-[#616161] pt-3">
                  ● UNSAVED CHANGES
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
                      Object.keys(emailNotifications).map(k => [k, true])
                    );
                    setEmailNotifications(allOn as typeof emailNotifications);
                    setIsDirty(true);
                  }}
                  className="w-full px-3 py-2 text-xs font-bold bg-[#202020] dark:bg-[#4676ac] text-white hover:bg-[#0a0a0a] dark:hover:bg-[#365a87] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#4676ac] text-left"
                >
                  ENABLE ALL EMAIL
                </button>
                <button 
                  onClick={() => {
                    const allOff = Object.fromEntries(
                      Object.keys(emailNotifications).map(k => [k, false])
                    );
                    setEmailNotifications(allOff as typeof emailNotifications);
                    setIsDirty(true);
                  }}
                  className="w-full px-3 py-2 text-xs font-bold border-2 border-[#202020] dark:border-[#616161] dark:text-[#e5e5e5] hover:bg-[#95a2aa] dark:hover:bg-[#2a2a2a] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#616161] text-left"
                >
                  DISABLE ALL EMAIL
                </button>
              </div>
            </div>
          </div>

          {/* Help */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#b5bcc4] dark:border-[#616161]">
            <div className="p-4">
              <div className="text-xs font-bold mb-2 dark:text-[#e5e5e5]">NOTIFICATION TIPS</div>
              <div className="text-xs text-[#616161] dark:text-[#b5bcc4] space-y-2 leading-relaxed">
                <div>• Enable sponsorship alerts to never miss funding</div>
                <div>• Quiet hours prevent late-night interruptions</div>
                <div>• Weekly digests provide summary without spam</div>
                <div>• Push notifications require browser permission</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SettingsLayout>
  );
}

interface NotificationToggleProps {
  icon: ReactNode;
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}

function NotificationToggle({ icon, label, description, checked, onChange }: NotificationToggleProps) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-[#b5bcc4] dark:border-[#3a3a3a] last:border-0">
      <div className="flex items-start gap-3 flex-1">
        <div className="text-[#4676ac] mt-1">{icon}</div>
        <div>
          <div className="text-sm font-bold mb-1 dark:text-[#e5e5e5]">{label}</div>
          <div className="text-xs text-[#616161] dark:text-[#b5bcc4] leading-relaxed">{description}</div>
        </div>
      </div>
      <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="sr-only peer"
        />
        <div className="w-11 h-6 bg-[#b5bcc4] peer-focus:outline-none peer-checked:bg-[#4676ac] relative peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:border-[#202020] after:h-5 after:w-5 after:transition-all"></div>
      </label>
    </div>
  );
}