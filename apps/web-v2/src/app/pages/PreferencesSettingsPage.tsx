'use client';

import { useState } from 'react';
import { Palette, Globe, Lock, AlertCircle, Filter } from 'lucide-react';
import { SettingsLayout } from '@/app/components/SettingsLayout';
import { useTheme } from '@/app/context/ThemeContext';
import { useAuth } from '@/app/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';

export function PreferencesSettingsPage() {
  const { theme, setTheme } = useTheme();
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [regional, setRegional] = useState({
    language: 'en',
    timezone: 'Asia/Samarkand',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h',
    currency: 'USD',
  });

  const [interface_, setInterface] = useState({
    displayDensity: 'comfortable',
    defaultView: 'feed',
    entriesPerPage: 20,
    autoPlayMedia: true,
    showThumbnails: true,
    expandImages: false,
  });

  const [content, setContent] = useState({
    contentFilter: 'all',
    hideSponsored: false,
    showDrafts: true,
    highlightUnread: true,
  });

  const [accessibility, setAccessibility] = useState({
    reducedMotion: false,
    highContrast: false,
    largerText: false,
    keyboardNav: true,
  });

  const [isDirty, setIsDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const handleRegionalChange = (key: string, value: string) => {
    setRegional(prev => ({ ...prev, [key]: value }));
    setIsDirty(true);
    setSaveStatus('idle');
  };

  const handleInterfaceChange = (key: string, value: string | number | boolean) => {
    setInterface(prev => ({ ...prev, [key]: value }));
    setIsDirty(true);
    setSaveStatus('idle');
  };

  const handleContentChange = (key: string, value: string | boolean) => {
    setContent(prev => ({ ...prev, [key]: value }));
    setIsDirty(true);
    setSaveStatus('idle');
  };

  const handleAccessibilityChange = (key: string, value: boolean) => {
    setAccessibility(prev => ({ ...prev, [key]: value }));
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
              You must be logged in to manage preferences. Please log in to continue.
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
          {/* Regional Settings */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
            <div className="bg-[#616161] dark:bg-[#3a3a3a] text-white px-4 py-3 font-bold text-sm flex items-center gap-2">
              <Globe className="w-4 h-4" />
              REGIONAL & LANGUAGE
            </div>
            <div className="p-4 lg:p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-2 text-[#202020] dark:text-[#e5e5e5]">
                    LANGUAGE
                  </label>
                  <select
                    value={regional.language}
                    onChange={(e) => handleRegionalChange('language', e.target.value)}
                    className="w-full px-3 py-2 border-2 border-[#202020] dark:border-[#616161] dark:bg-[#2a2a2a] dark:text-[#e5e5e5] text-sm focus:outline-none focus:border-[#4676ac]"
                  >
                    <option value="en">English</option>
                    <option value="es">Español</option>
                    <option value="fr">Français</option>
                    <option value="de">Deutsch</option>
                    <option value="ru">Русский</option>
                    <option value="zh">中文</option>
                    <option value="ja">日本語</option>
                    <option value="ar">العربية</option>
                  </select>
                  <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1 font-mono">
                    Interface language for menus and system text
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-2 text-[#202020] dark:text-[#e5e5e5]">
                    TIMEZONE
                  </label>
                  <select
                    value={regional.timezone}
                    onChange={(e) => handleRegionalChange('timezone', e.target.value)}
                    className="w-full px-3 py-2 border-2 border-[#202020] dark:border-[#616161] dark:bg-[#2a2a2a] dark:text-[#e5e5e5] text-sm focus:outline-none focus:border-[#4676ac]"
                  >
                    <option value="Asia/Samarkand">Asia/Samarkand (UTC+5)</option>
                    <option value="America/New_York">America/New York (UTC-5)</option>
                    <option value="America/Los_Angeles">America/Los Angeles (UTC-8)</option>
                    <option value="Europe/London">Europe/London (UTC+0)</option>
                    <option value="Europe/Paris">Europe/Paris (UTC+1)</option>
                    <option value="Asia/Tokyo">Asia/Tokyo (UTC+9)</option>
                    <option value="Australia/Sydney">Australia/Sydney (UTC+11)</option>
                  </select>
                  <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1 font-mono">
                    Used for timestamps and scheduling
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-2 text-[#202020] dark:text-[#e5e5e5]">
                    DATE FORMAT
                  </label>
                  <select
                    value={regional.dateFormat}
                    onChange={(e) => handleRegionalChange('dateFormat', e.target.value)}
                    className="w-full px-3 py-2 border-2 border-[#202020] dark:border-[#616161] dark:bg-[#2a2a2a] dark:text-[#e5e5e5] text-sm focus:outline-none focus:border-[#4676ac]"
                  >
                    <option value="MM/DD/YYYY">MM/DD/YYYY (01/15/2024)</option>
                    <option value="DD/MM/YYYY">DD/MM/YYYY (15/01/2024)</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD (2024-01-15)</option>
                    <option value="DD.MM.YYYY">DD.MM.YYYY (15.01.2024)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-2 text-[#202020] dark:text-[#e5e5e5]">
                    TIME FORMAT
                  </label>
                  <select
                    value={regional.timeFormat}
                    onChange={(e) => handleRegionalChange('timeFormat', e.target.value)}
                    className="w-full px-3 py-2 border-2 border-[#202020] dark:border-[#616161] dark:bg-[#2a2a2a] dark:text-[#e5e5e5] text-sm focus:outline-none focus:border-[#4676ac]"
                  >
                    <option value="12h">12-hour (3:45 PM)</option>
                    <option value="24h">24-hour (15:45)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-2 text-[#202020] dark:text-[#e5e5e5]">
                    CURRENCY
                  </label>
                  <select
                    value={regional.currency}
                    onChange={(e) => handleRegionalChange('currency', e.target.value)}
                    className="w-full px-3 py-2 border-2 border-[#202020] dark:border-[#616161] dark:bg-[#2a2a2a] dark:text-[#e5e5e5] text-sm focus:outline-none focus:border-[#4676ac]"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="JPY">JPY (¥)</option>
                    <option value="UZS">UZS (so'm)</option>
                  </select>
                  <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1 font-mono">
                    Display currency for sponsorship amounts
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Interface Preferences */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
            <div className="bg-[#616161] dark:bg-[#3a3a3a] text-white px-4 py-3 font-bold text-sm flex items-center gap-2">
              <Palette className="w-4 h-4" />
              INTERFACE PREFERENCES
            </div>
            <div className="p-4 lg:p-6 space-y-6">
              {/* Theme Selection */}
              <div>
                <label className="block text-xs font-medium mb-3 text-[#202020] dark:text-[#e5e5e5]">
                  COLOR THEME
                </label>
                <div className="space-y-2">
                  <label className="flex items-start gap-3 p-3 border-2 border-[#b5bcc4] dark:border-[#3a3a3a] cursor-pointer hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] transition-all active:scale-[0.98]">
                    <input
                      type="radio"
                      name="theme"
                      value="light"
                      checked={theme === 'light'}
                      onChange={(e) => setTheme(e.target.value as 'light' | 'dark')}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="font-bold text-sm mb-1 dark:text-[#e5e5e5]">Light Mode</div>
                      <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">
                        Traditional light background with dark text. Best for bright environments and daytime use.
                      </div>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 p-3 border-2 border-[#b5bcc4] dark:border-[#3a3a3a] cursor-pointer hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] transition-all active:scale-[0.98]">
                    <input
                      type="radio"
                      name="theme"
                      value="dark"
                      checked={theme === 'dark'}
                      onChange={(e) => setTheme(e.target.value as 'light' | 'dark')}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="font-bold text-sm mb-1 dark:text-[#e5e5e5]">Dark Mode</div>
                      <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">
                        Dark background with light text. Reduces eye strain in low-light conditions and saves battery on OLED screens.
                      </div>
                    </div>
                  </label>
                </div>
                <div className="mt-2 text-xs text-[#616161] dark:text-[#b5bcc4] font-mono">
                  Current: {theme === 'light' ? 'LIGHT MODE' : 'DARK MODE'} • System uses same colors (copper #ac6d46, blue #4676ac) in both themes
                </div>
              </div>

              {/* Pagination */}
              <div className="border-t-2 border-[#b5bcc4] dark:border-[#3a3a3a] pt-6">
                <label className="block text-xs font-medium mb-2 text-[#202020] dark:text-[#e5e5e5]">
                  ENTRIES PER PAGE
                </label>
                <select
                  value={interface_.entriesPerPage}
                  onChange={(e) => handleInterfaceChange('entriesPerPage', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border-2 border-[#202020] text-sm focus:outline-none focus:border-[#4676ac]"
                >
                  <option value={10}>10 entries</option>
                  <option value={20}>20 entries (Default)</option>
                  <option value={50}>50 entries</option>
                  <option value={100}>100 entries</option>
                </select>
                <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1 font-mono">
                  Number of journal entries to show before pagination
                </div>
              </div>

              {/* Media Settings */}
              <div className="border-t-2 border-[#b5bcc4] dark:border-[#3a3a3a] pt-6">
                <div className="text-xs font-bold mb-4 text-[#202020] dark:text-[#e5e5e5]">MEDIA DISPLAY</div>
                <div className="space-y-4">
                  <PreferenceToggle
                    label="Auto-play Videos"
                    description="Automatically start video playback when scrolling (muted)"
                    checked={interface_.autoPlayMedia}
                    onChange={() => handleInterfaceChange('autoPlayMedia', !interface_.autoPlayMedia)}
                  />
                  <PreferenceToggle
                    label="Show Image Thumbnails"
                    description="Display image previews in journal feed and lists"
                    checked={interface_.showThumbnails}
                    onChange={() => handleInterfaceChange('showThumbnails', !interface_.showThumbnails)}
                  />
                  <PreferenceToggle
                    label="Expand Images by Default"
                    description="Show full-size images instead of thumbnails in journal entries"
                    checked={interface_.expandImages}
                    onChange={() => handleInterfaceChange('expandImages', !interface_.expandImages)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Content Filters */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
            <div className="bg-[#616161] dark:bg-[#3a3a3a] text-white px-4 py-3 font-bold text-sm flex items-center gap-2">
              <Filter className="w-4 h-4" />
              CONTENT FILTERS
            </div>
            <div className="p-4 lg:p-6 space-y-6">
              <div>
                <label className="block text-xs font-medium mb-2 text-[#202020] dark:text-[#e5e5e5]">
                  CONTENT FILTER
                </label>
                <select
                  value={content.contentFilter}
                  onChange={(e) => handleContentChange('contentFilter', e.target.value)}
                  className="w-full px-3 py-2 border-2 border-[#202020] dark:border-[#616161] dark:bg-[#2a2a2a] dark:text-[#e5e5e5] text-sm focus:outline-none focus:border-[#4676ac]"
                >
                  <option value="all">All Content</option>
                  <option value="following">Only From Followed Explorers</option>
                  <option value="sponsored">Only Sponsored Expeditions</option>
                </select>
                <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1 font-mono">
                  Filter what appears in your explore feed
                </div>
              </div>

              <div className="border-t-2 border-[#b5bcc4] dark:border-[#3a3a3a] pt-6">
                <div className="text-xs font-bold mb-4 text-[#202020] dark:text-[#e5e5e5]">DISPLAY PREFERENCES</div>
                <div className="space-y-4">
                  <PreferenceToggle
                    label="Hide Sponsored Content"
                    description="Don't show expeditions that have received sponsorships"
                    checked={content.hideSponsored}
                    onChange={() => handleContentChange('hideSponsored', !content.hideSponsored)}
                  />
                  <PreferenceToggle
                    label="Show Draft Entries"
                    description="Display your unpublished drafts in your journal view"
                    checked={content.showDrafts}
                    onChange={() => handleContentChange('showDrafts', !content.showDrafts)}
                  />
                  <PreferenceToggle
                    label="Highlight Unread Messages"
                    description="Emphasize new messages and notifications"
                    checked={content.highlightUnread}
                    onChange={() => handleContentChange('highlightUnread', !content.highlightUnread)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Accessibility */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
            <div className="bg-[#616161] dark:bg-[#3a3a3a] text-white px-4 py-3 font-bold text-sm">
              ACCESSIBILITY OPTIONS
            </div>
            <div className="p-4 lg:p-6">
              <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mb-4">
                Customize Heimursaga for better accessibility and usability
              </div>
              <div className="space-y-4">
                <PreferenceToggle
                  label="Reduce Motion"
                  description="Minimize animations and transitions throughout the interface"
                  checked={accessibility.reducedMotion}
                  onChange={() => handleAccessibilityChange('reducedMotion', !accessibility.reducedMotion)}
                />
                <PreferenceToggle
                  label="High Contrast Mode"
                  description="Increase contrast between text and backgrounds for better readability"
                  checked={accessibility.highContrast}
                  onChange={() => handleAccessibilityChange('highContrast', !accessibility.highContrast)}
                />
                <PreferenceToggle
                  label="Larger Text"
                  description="Increase base font size across the interface"
                  checked={accessibility.largerText}
                  onChange={() => handleAccessibilityChange('largerText', !accessibility.largerText)}
                />
                <PreferenceToggle
                  label="Keyboard Navigation Hints"
                  description="Show keyboard shortcuts and focus indicators"
                  checked={accessibility.keyboardNav}
                  onChange={() => handleAccessibilityChange('keyboardNav', !accessibility.keyboardNav)}
                />
              </div>
            </div>
          </div>

          {/* Save Actions */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-4 lg:p-6">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div className="flex items-start gap-2 text-xs text-[#616161] dark:text-[#b5bcc4]">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  Preference changes apply immediately after saving. Some settings may require a page refresh.
                </div>
              </div>
              <button
                onClick={handleSave}
                disabled={!isDirty || saveStatus === 'saving'}
                className={`px-6 py-3 font-bold transition-all ${
                  isDirty && saveStatus !== 'saving'
                    ? 'bg-[#ac6d46] text-white hover:bg-[#8a5738]'
                    : 'bg-[#b5bcc4] text-[#616161] cursor-not-allowed'
                }`}
              >
                {saveStatus === 'saving' ? 'SAVING...' : isDirty ? 'SAVE CHANGES' : 'NO CHANGES'}
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Current Settings */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
            <div className="bg-[#4676ac] text-white px-4 py-3 font-bold text-sm">
              CURRENT SETTINGS
            </div>
            <div className="p-4 space-y-3 text-xs font-mono">
              <div className="flex justify-between items-center">
                <span className="text-[#616161] dark:text-[#b5bcc4]">Language:</span>
                <span className="font-bold dark:text-[#e5e5e5]">{regional.language.toUpperCase()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#616161] dark:text-[#b5bcc4]">Timezone:</span>
                <span className="font-bold dark:text-[#e5e5e5]">UTC+5</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#616161] dark:text-[#b5bcc4]">Display:</span>
                <span className="font-bold dark:text-[#e5e5e5]">{interface_.displayDensity.toUpperCase()}</span>
              </div>
              <div className="flex justify-between items-center border-t border-[#b5bcc4] dark:border-[#616161] pt-3">
                <span className="text-[#616161] dark:text-[#b5bcc4]">Default View:</span>
                <span className="font-bold dark:text-[#e5e5e5]">{interface_.defaultView.toUpperCase()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#616161] dark:text-[#b5bcc4]">Per Page:</span>
                <span className="font-bold dark:text-[#e5e5e5]">{interface_.entriesPerPage}</span>
              </div>
              {isDirty && (
                <div className="text-[#ac6d46] border-t border-[#b5bcc4] dark:border-[#616161] pt-3">
                  ● UNSAVED CHANGES
                </div>
              )}
            </div>
          </div>

          {/* Quick Presets */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#b5bcc4] dark:border-[#616161]">
            <div className="p-4">
              <div className="text-xs font-bold mb-3 dark:text-[#e5e5e5]">QUICK PRESETS</div>
              <div className="space-y-2">
                <button className="w-full px-3 py-2 text-xs font-bold bg-[#202020] dark:bg-[#4676ac] text-white hover:bg-[#0a0a0a] dark:hover:bg-[#365a87] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#4676ac] text-left">
                  RESET TO DEFAULT
                </button>
                <button className="w-full px-3 py-2 text-xs font-bold border-2 border-[#202020] dark:border-[#616161] dark:text-[#e5e5e5] hover:bg-[#95a2aa] dark:hover:bg-[#2a2a2a] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#616161] text-left">
                  MAXIMUM DENSITY
                </button>
                <button className="w-full px-3 py-2 text-xs font-bold border-2 border-[#202020] dark:border-[#616161] dark:text-[#e5e5e5] hover:bg-[#95a2aa] dark:hover:bg-[#2a2a2a] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#616161] text-left">
                  ACCESSIBILITY MODE
                </button>
              </div>
            </div>
          </div>

          {/* Help */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#b5bcc4] dark:border-[#616161]">
            <div className="p-4">
              <div className="text-xs font-bold mb-2 dark:text-[#e5e5e5]">PREFERENCE TIPS</div>
              <div className="text-xs text-[#616161] dark:text-[#b5bcc4] space-y-2 leading-relaxed">
                <div>• Compact display shows more content</div>
                <div>• Timezone affects scheduling and timestamps</div>
                <div>• Reduced motion helps with motion sensitivity</div>
                <div>• Keyboard navigation improves efficiency</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SettingsLayout>
  );
}

interface PreferenceToggleProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}

function PreferenceToggle({ label, description, checked, onChange }: PreferenceToggleProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1">
        <div className="text-sm font-bold mb-1 dark:text-[#e5e5e5]">{label}</div>
        <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">{description}</div>
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