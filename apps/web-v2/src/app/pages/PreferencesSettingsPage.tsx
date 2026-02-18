'use client';

import { Palette, Lock } from 'lucide-react';
import { SettingsLayout } from '@/app/components/SettingsLayout';
import { useTheme } from '@/app/context/ThemeContext';
import { useDistanceUnit } from '@/app/context/DistanceUnitContext';
import { useAuth } from '@/app/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';

export function PreferencesSettingsPage() {
  const { theme, themeSetting, setTheme } = useTheme();
  const { unit: distanceUnit, setUnit: setDistanceUnit } = useDistanceUnit();
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

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
          {/* Color Theme */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
            <div className="bg-[#616161] text-white px-4 py-3 font-bold text-sm flex items-center gap-2">
              <Palette className="w-4 h-4" />
              COLOR THEME
            </div>
            <div className="p-4 lg:p-6">
              <div className="space-y-2">
                <label className="flex items-start gap-3 p-3 border-2 border-[#b5bcc4] dark:border-[#3a3a3a] cursor-pointer hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] transition-all active:scale-[0.98]">
                  <input
                    type="radio"
                    name="theme"
                    value="light"
                    checked={themeSetting === 'light'}
                    onChange={(e) => setTheme(e.target.value as 'light' | 'dark' | 'system')}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-bold text-sm mb-1 dark:text-[#e5e5e5]">Light Mode</div>
                    <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">
                      Light background with dark text. Best for bright environments.
                    </div>
                  </div>
                </label>
                <label className="flex items-start gap-3 p-3 border-2 border-[#b5bcc4] dark:border-[#3a3a3a] cursor-pointer hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] transition-all active:scale-[0.98]">
                  <input
                    type="radio"
                    name="theme"
                    value="dark"
                    checked={themeSetting === 'dark'}
                    onChange={(e) => setTheme(e.target.value as 'light' | 'dark' | 'system')}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-bold text-sm mb-1 dark:text-[#e5e5e5]">Dark Mode</div>
                    <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">
                      Dark background with light text. Reduces eye strain in low light.
                    </div>
                  </div>
                </label>
                <label className="flex items-start gap-3 p-3 border-2 border-[#b5bcc4] dark:border-[#3a3a3a] cursor-pointer hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] transition-all active:scale-[0.98]">
                  <input
                    type="radio"
                    name="theme"
                    value="system"
                    checked={themeSetting === 'system'}
                    onChange={(e) => setTheme(e.target.value as 'light' | 'dark' | 'system')}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-bold text-sm mb-1 dark:text-[#e5e5e5]">System</div>
                    <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">
                      Automatically match your device's light or dark mode setting.
                    </div>
                  </div>
                </label>
              </div>
              <div className="mt-3 text-xs text-[#616161] dark:text-[#b5bcc4] font-mono">
                Current: {themeSetting === 'system' ? `SYSTEM (${theme.toUpperCase()})` : theme === 'light' ? 'LIGHT MODE' : 'DARK MODE'}
              </div>
            </div>
          </div>

          {/* Distance Units */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
            <div className="bg-[#616161] text-white px-4 py-3 font-bold text-sm">
              DISTANCE UNITS
            </div>
            <div className="p-4 lg:p-6">
              <div className="space-y-2">
                <label className="flex items-start gap-3 p-3 border-2 border-[#b5bcc4] dark:border-[#3a3a3a] cursor-pointer hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] transition-all active:scale-[0.98]">
                  <input
                    type="radio"
                    name="distanceUnit"
                    value="km"
                    checked={distanceUnit === 'km'}
                    onChange={() => setDistanceUnit('km')}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-bold text-sm mb-1 dark:text-[#e5e5e5]">Metric (km, km/h)</div>
                    <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">
                      Kilometers and kilometers per hour
                    </div>
                  </div>
                </label>
                <label className="flex items-start gap-3 p-3 border-2 border-[#b5bcc4] dark:border-[#3a3a3a] cursor-pointer hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] transition-all active:scale-[0.98]">
                  <input
                    type="radio"
                    name="distanceUnit"
                    value="mi"
                    checked={distanceUnit === 'mi'}
                    onChange={() => setDistanceUnit('mi')}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-bold text-sm mb-1 dark:text-[#e5e5e5]">Imperial (mi, mph)</div>
                    <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">
                      Miles and miles per hour
                    </div>
                  </div>
                </label>
              </div>
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
                <span className="text-[#616161] dark:text-[#b5bcc4]">Theme:</span>
                <span className="font-bold dark:text-[#e5e5e5]">
                  {themeSetting === 'system' ? 'SYSTEM' : themeSetting.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#616161] dark:text-[#b5bcc4]">Resolved:</span>
                <span className="font-bold dark:text-[#e5e5e5]">{theme.toUpperCase()} MODE</span>
              </div>
              <div className="flex justify-between items-center border-t border-[#b5bcc4] dark:border-[#616161] pt-3">
                <span className="text-[#616161] dark:text-[#b5bcc4]">Distance:</span>
                <span className="font-bold dark:text-[#e5e5e5]">
                  {distanceUnit === 'km' ? 'METRIC (KM)' : 'IMPERIAL (MI)'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#616161] dark:text-[#b5bcc4]">Storage:</span>
                <span className="font-bold dark:text-[#e5e5e5]">LOCAL</span>
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#b5bcc4] dark:border-[#616161]">
            <div className="p-4">
              <div className="text-xs font-bold mb-2 dark:text-[#e5e5e5]">HOW PREFERENCES WORK</div>
              <div className="text-xs text-[#616161] dark:text-[#b5bcc4] space-y-2 leading-relaxed">
                <div>Both settings save instantly to your browser's local storage</div>
                <div>Theme and distance preferences apply across all pages</div>
                <div>System theme follows your OS dark/light mode setting</div>
                <div>Distance units affect expedition stats, waypoints, and debriefs</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SettingsLayout>
  );
}
