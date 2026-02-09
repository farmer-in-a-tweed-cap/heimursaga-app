'use client';

import { useState } from 'react';
import { Lock, Eye, Shield, Download, Trash2, Save } from 'lucide-react';
import { SettingsLayout } from '@/app/components/SettingsLayout';
import { useAuth } from '@/app/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';

export function PrivacySettingsPage() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [privacy, setPrivacy] = useState({
    profileVisibility: 'public',
    allowMessages: 'all',
  });

  const [security, setSecurity] = useState({
    twoFactorEnabled: false,
    loginAlerts: true,
    unusualActivityAlerts: true,
  });

  const [sessions] = useState([
    { id: 1, device: 'Chrome on MacOS', location: 'Samarkand, Uzbekistan', lastActive: '2 minutes ago', current: true },
    { id: 2, device: 'Safari on iPhone', location: 'Samarkand, Uzbekistan', lastActive: '3 hours ago', current: false },
    { id: 3, device: 'Firefox on Windows', location: 'Tashkent, Uzbekistan', lastActive: '2 days ago', current: false },
  ]);

  const [isDirty, setIsDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const handlePrivacyChange = (key: string, value: string | boolean) => {
    setPrivacy(prev => ({ ...prev, [key]: value }));
    setIsDirty(true);
    setSaveStatus('idle');
  };

  const handleSecurityChange = (key: string, value: boolean) => {
    setSecurity(prev => ({ ...prev, [key]: value }));
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
              You must be logged in to manage privacy settings. Please log in to continue.
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
          {/* Privacy Settings */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
            <div className="bg-[#616161] dark:bg-[#3a3a3a] text-white px-4 py-3 font-bold text-sm flex items-center gap-2">
              <Eye className="w-4 h-4" />
              PROFILE PRIVACY
            </div>
            <div className="p-4 lg:p-6 space-y-6">
              <div>
                <label className="block text-xs font-medium mb-3 text-[#202020] dark:text-[#e5e5e5]">
                  PROFILE VISIBILITY
                </label>
                <div className="space-y-2">
                  <label className="flex items-start gap-3 p-3 border-2 border-[#b5bcc4] dark:border-[#616161] cursor-pointer hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] transition-all">
                    <input
                      type="radio"
                      name="visibility"
                      value="public"
                      checked={privacy.profileVisibility === 'public'}
                      onChange={(e) => handlePrivacyChange('profileVisibility', e.target.value)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="font-bold text-sm mb-1 dark:text-[#e5e5e5]">Public</div>
                      <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">
                        Anyone can view your profile, journal entries, and expeditions. Appears in search results and explorer directory.
                      </div>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 p-3 border-2 border-[#b5bcc4] dark:border-[#616161] cursor-pointer hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] transition-all">
                    <input
                      type="radio"
                      name="visibility"
                      value="limited"
                      checked={privacy.profileVisibility === 'limited'}
                      onChange={(e) => handlePrivacyChange('profileVisibility', e.target.value)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="font-bold text-sm mb-1 dark:text-[#e5e5e5]">Limited</div>
                      <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">
                        Profile visible only to logged-in users. Not indexed by search engines. Journal entries remain public.
                      </div>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 p-3 border-2 border-[#b5bcc4] dark:border-[#616161] cursor-pointer hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] transition-all">
                    <input
                      type="radio"
                      name="visibility"
                      value="private"
                      checked={privacy.profileVisibility === 'private'}
                      onChange={(e) => handlePrivacyChange('profileVisibility', e.target.value)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="font-bold text-sm mb-1 dark:text-[#e5e5e5]">Private</div>
                      <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">
                        Only you can view your profile and journal. Disables sponsorship features. Cannot receive new followers.
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              <div className="border-t-2 border-[#b5bcc4] dark:border-[#3a3a3a] pt-6">
                <div className="text-xs font-bold mb-4 text-[#202020] dark:text-[#e5e5e5]">INTERACTION CONTROLS</div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium mb-2 text-[#202020] dark:text-[#e5e5e5]">
                      WHO CAN MESSAGE YOU?
                    </label>
                    <select
                      value={privacy.allowMessages}
                      onChange={(e) => handlePrivacyChange('allowMessages', e.target.value)}
                      className="w-full px-3 py-2 border-2 border-[#202020] dark:border-[#616161] dark:bg-[#2a2a2a] dark:text-[#e5e5e5] text-sm focus:outline-none focus:border-[#4676ac]"
                    >
                      <option value="all">Any Explorer Pro account</option>
                      <option value="followers">Only Explorer Pro accounts I follow</option>
                      <option value="none">No one (disable messages)</option>
                    </select>
                    <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-2 font-mono">
                      Direct messaging is currently available between Explorer Pro accounts only
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Security Settings */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
            <div className="bg-[#616161] dark:bg-[#3a3a3a] text-white px-4 py-3 font-bold text-sm flex items-center gap-2">
              <Lock className="w-4 h-4" />
              ACCOUNT SECURITY
            </div>
            <div className="p-4 lg:p-6 space-y-6">
              {/* Password */}
              <div>
                <label className="block text-xs font-medium mb-3 text-[#202020] dark:text-[#e5e5e5]">
                  <Shield className="w-3 h-3 inline mr-1" />
                  PASSWORD
                </label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value="••••••••••••"
                    disabled
                    className="flex-1 px-3 py-2 border-2 border-[#b5bcc4] dark:border-[#616161] text-sm bg-[#f5f5f5] dark:bg-[#2a2a2a] dark:text-[#b5bcc4]"
                  />
                  <button className="px-4 py-2 bg-[#202020] dark:bg-[#4676ac] text-white text-xs font-bold hover:bg-[#0a0a0a] dark:hover:bg-[#365a87] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#4676ac] whitespace-nowrap">
                    CHANGE PASSWORD
                  </button>
                </div>
                <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-2 font-mono">
                  Last changed: 45 days ago • Strength: STRONG
                </div>
              </div>

              {/* Two-Factor Authentication */}
              <div className="border-t-2 border-[#b5bcc4] dark:border-[#3a3a3a] pt-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <label className="block text-xs font-medium mb-1 text-[#202020] dark:text-[#e5e5e5]">
                      <Shield className="w-3 h-3 inline mr-1" />
                      TWO-FACTOR AUTHENTICATION (2FA)
                    </label>
                    <p className="text-xs text-[#616161] dark:text-[#b5bcc4]">
                      Add an extra layer of security by requiring a code from your phone
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={security.twoFactorEnabled}
                      onChange={(e) => handleSecurityChange('twoFactorEnabled', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-[#b5bcc4] peer-focus:outline-none peer-checked:bg-[#4676ac] relative peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:border-[#202020] after:h-5 after:w-5 after:transition-all"></div>
                  </label>
                </div>

                {!security.twoFactorEnabled && (
                  <div className="bg-[#fff5e6] dark:bg-[#3a2a1a] border-2 border-[#ac6d46] p-3 text-xs">
                    <div className="font-bold mb-1 text-[#ac6d46]">⚠ RECOMMENDED</div>
                    <div className="text-[#616161] dark:text-[#b5bcc4]">
                      Enable 2FA to significantly improve your account security and protect against unauthorized access.
                    </div>
                  </div>
                )}

                {security.twoFactorEnabled && (
                  <div className="bg-[#f5f5f5] dark:bg-[#2a2a2a] border-2 border-[#b5bcc4] dark:border-[#616161] p-3 space-y-2">
                    <div className="text-xs font-bold dark:text-[#e5e5e5]">2FA METHOD: AUTHENTICATOR APP</div>
                    <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">
                      Using: Google Authenticator
                    </div>
                    <button className="px-3 py-1.5 text-xs font-bold border-2 border-[#202020] dark:border-[#616161] dark:text-[#e5e5e5] hover:bg-[#95a2aa] dark:hover:bg-[#1a1a1a] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#616161]">
                      VIEW BACKUP CODES
                    </button>
                  </div>
                )}
              </div>

              {/* Security Alerts */}
              <div className="border-t-2 border-[#b5bcc4] dark:border-[#3a3a3a] pt-6">
                <div className="text-xs font-bold mb-4 text-[#202020] dark:text-[#e5e5e5]">SECURITY ALERTS</div>
                <div className="space-y-4">
                  <PrivacyToggle
                    label="Login Notifications"
                    description="Email alert when someone logs into your account"
                    checked={security.loginAlerts}
                    onChange={() => handleSecurityChange('loginAlerts', !security.loginAlerts)}
                  />
                  <PrivacyToggle
                    label="Unusual Activity Alerts"
                    description="Notifications for suspicious activity like login attempts from new locations"
                    checked={security.unusualActivityAlerts}
                    onChange={() => handleSecurityChange('unusualActivityAlerts', !security.unusualActivityAlerts)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Active Sessions */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
            <div className="bg-[#616161] dark:bg-[#3a3a3a] text-white px-4 py-3 font-bold text-sm flex items-center gap-2">
              <Shield className="w-4 h-4" />
              ACTIVE SESSIONS
            </div>
            <div className="p-4 lg:p-6">
              <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mb-4">
                These devices are currently logged into your account. Remove any sessions you don't recognize.
              </div>
              <div className="space-y-3">
                {sessions.map((session) => (
                  <div key={session.id} className="flex items-start justify-between gap-4 p-3 border-2 border-[#b5bcc4] dark:border-[#616161]">
                    <div className="flex-1">
                      <div className="font-bold text-sm mb-1 dark:text-[#e5e5e5]">
                        {session.device}
                        {session.current && (
                          <span className="ml-2 px-2 py-0.5 bg-[#4676ac] text-white text-xs font-bold">
                            CURRENT
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[#616161] dark:text-[#b5bcc4] space-y-1">
                        <div>Location: {session.location}</div>
                        <div>Last active: {session.lastActive}</div>
                      </div>
                    </div>
                    {!session.current && (
                      <button className="px-3 py-1.5 text-xs font-bold border-2 border-[#202020] dark:border-[#616161] dark:text-[#e5e5e5] hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-600 hover:text-red-600 transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-red-600 whitespace-nowrap">
                        REVOKE
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button className="w-full mt-4 px-4 py-2 text-xs font-bold border-2 border-[#202020] dark:border-[#616161] dark:text-[#e5e5e5] hover:bg-[#95a2aa] dark:hover:bg-[#2a2a2a] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#616161]">
                SIGN OUT ALL OTHER SESSIONS
              </button>
            </div>
          </div>

          {/* Data Management */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
            <div className="bg-[#616161] dark:bg-[#3a3a3a] text-white px-4 py-3 font-bold text-sm flex items-center gap-2">
              <Download className="w-4 h-4" />
              DATA MANAGEMENT
            </div>
            <div className="p-4 lg:p-6 space-y-4">
              <div className="flex items-start justify-between gap-4 pb-4 border-b-2 border-[#b5bcc4] dark:border-[#3a3a3a]">
                <div>
                  <div className="font-bold text-sm mb-1 dark:text-[#e5e5e5]">Export Your Data</div>
                  <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">
                    Download a complete copy of all your journal entries, expeditions, and account data in JSON format
                  </div>
                </div>
                <button className="px-4 py-2 bg-[#202020] dark:bg-[#4676ac] text-white text-xs font-bold hover:bg-[#365a87] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#4676ac] whitespace-nowrap flex items-center gap-2">
                  <Download className="w-3 h-3" />
                  EXPORT
                </button>
              </div>

              <div className="flex items-start justify-between gap-4 pt-4">
                <div>
                  <div className="font-bold text-sm mb-1 text-red-600 dark:text-red-500">Delete Account</div>
                  <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">
                    Permanently delete your account and all associated data. This action cannot be undone.
                  </div>
                </div>
                <button className="px-4 py-2 bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-red-600 whitespace-nowrap flex items-center gap-2">
                  <Trash2 className="w-3 h-3" />
                  DELETE
                </button>
              </div>
            </div>
          </div>

          {/* Save Actions */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-4 lg:p-6">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div className="flex items-start gap-2 text-xs text-[#616161] dark:text-[#b5bcc4]">
                <Shield className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  Privacy and security changes take effect immediately. Review your settings regularly.
                </div>
              </div>
              <button
                onClick={handleSave}
                disabled={!isDirty || saveStatus === 'saving'}
                className={`px-6 py-3 font-bold text-sm flex items-center gap-2 transition-all whitespace-nowrap ${
                  isDirty && saveStatus !== 'saving'
                    ? 'bg-[#ac6d46] text-white hover:bg-[#8a5738]'
                    : 'bg-[#b5bcc4] text-[#616161] cursor-not-allowed'
                }`}
              >
                <Save className="w-4 h-4" />
                {saveStatus === 'saving' ? 'SAVING...' : saveStatus === 'saved' ? '✓ SAVED' : 'SAVE CHANGES'}
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Security Score */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
            <div className="bg-[#ac6d46] text-white px-4 py-3 font-bold text-sm">
              SECURITY SCORE
            </div>
            <div className="p-4">
              <div className="text-center mb-4">
                <div className="text-5xl font-bold text-[#ac6d46] mb-2">
                  {security.twoFactorEnabled ? '95' : '65'}
                </div>
                <div className="text-xs text-[#616161] dark:text-[#b5bcc4] font-mono">OUT OF 100</div>
              </div>
              <div className="space-y-2 text-xs dark:text-[#e5e5e5]">
                <div className="flex items-center justify-between">
                  <span>Strong Password:</span>
                  <span className="text-[#4676ac]">✓</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>2FA Enabled:</span>
                  <span className={security.twoFactorEnabled ? 'text-[#4676ac]' : 'text-[#616161] dark:text-[#b5bcc4]'}>
                    {security.twoFactorEnabled ? '✓' : '✗'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Verified Email:</span>
                  <span className="text-[#4676ac]">✓</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Login Alerts:</span>
                  <span className={security.loginAlerts ? 'text-[#4676ac]' : 'text-[#616161] dark:text-[#b5bcc4]'}>
                    {security.loginAlerts ? '✓' : '✗'}
                  </span>
                </div>
              </div>
              {!security.twoFactorEnabled && (
                <div className="mt-4 pt-4 border-t border-[#b5bcc4] dark:border-[#616161] text-xs text-[#ac6d46]">
                  Enable 2FA to reach 95/100
                </div>
              )}
            </div>
          </div>

          {/* Privacy Level */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
            <div className="bg-[#4676ac] text-white px-4 py-3 font-bold text-sm">
              PRIVACY LEVEL
            </div>
            <div className="p-4">
              <div className="flex items-center justify-center gap-3 mb-3">
                {privacy.profileVisibility === 'public' && <Eye className="w-8 h-8 text-[#ac6d46]" />}
                {privacy.profileVisibility === 'limited' && <Lock className="w-8 h-8 text-[#4676ac]" />}
                {privacy.profileVisibility === 'private' && <Lock className="w-8 h-8 text-[#616161] dark:text-[#b5bcc4]" />}
                <div className="text-2xl font-bold dark:text-[#e5e5e5]">
                  {privacy.profileVisibility === 'public' ? 'PUBLIC' : 
                   privacy.profileVisibility === 'limited' ? 'LIMITED' : 'PRIVATE'}
                </div>
              </div>
              <div className="text-xs text-center text-[#616161] dark:text-[#b5bcc4]">
                {privacy.profileVisibility === 'public' 
                  ? 'Your profile is visible to everyone'
                  : privacy.profileVisibility === 'limited'
                  ? 'Visible to logged-in users only'
                  : 'Only you can see your profile'}
              </div>
            </div>
          </div>

          {/* Help */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#b5bcc4] dark:border-[#616161]">
            <div className="p-4">
              <div className="text-xs font-bold mb-2 dark:text-[#e5e5e5]">SECURITY TIPS</div>
              <div className="text-xs text-[#616161] dark:text-[#b5bcc4] space-y-2 leading-relaxed">
                <div>• Use a unique, strong password (12+ characters)</div>
                <div>• Enable 2FA for maximum security</div>
                <div>• Review active sessions regularly</div>
                <div>• Never share your password or 2FA codes</div>
                <div>• Be cautious of phishing attempts</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SettingsLayout>
  );
}

interface PrivacyToggleProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}

function PrivacyToggle({ label, description, checked, onChange }: PrivacyToggleProps) {
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