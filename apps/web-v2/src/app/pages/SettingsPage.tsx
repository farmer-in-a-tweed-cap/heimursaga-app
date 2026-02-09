'use client';

import { Settings, User, Bell, Lock, CreditCard, Globe, Palette, Shield, Download } from 'lucide-react';
import { SettingsLayout } from '@/app/components/SettingsLayout';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';

export function SettingsPage() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  
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
              You must be logged in to access settings. Please log in to manage your account.
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
      {/* Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-6">
          <User className="w-10 h-10 text-[#4676ac] mb-4" />
          <div className="font-bold mb-2 text-lg dark:text-[#e5e5e5]">Profile Settings</div>
          <div className="text-xs text-[#616161] dark:text-[#b5bcc4] space-y-1 mb-4">
            <div>• Username & display name</div>
            <div>• Biography & description</div>
            <div>• Avatar & cover images</div>
            <div>• Social media links</div>
          </div>
          <Link href="/edit-profile" className="text-xs font-bold text-[#4676ac] hover:underline">
            EDIT PROFILE →
          </Link>
        </div>

        <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-6">
          <Bell className="w-10 h-10 text-[#4676ac] mb-4" />
          <div className="font-bold mb-2 text-lg dark:text-[#e5e5e5]">Notifications</div>
          <div className="text-xs text-[#616161] dark:text-[#b5bcc4] space-y-1 mb-4">
            <div>• Email notification preferences</div>
            <div>• Push notification settings</div>
            <div>• Digest & report scheduling</div>
            <div>• Quiet hours configuration</div>
          </div>
          <Link href="/settings/notifications" className="text-xs font-bold text-[#4676ac] hover:underline">
            MANAGE NOTIFICATIONS →
          </Link>
        </div>

        <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-6">
          <Lock className="w-10 h-10 text-[#4676ac] mb-4" />
          <div className="font-bold mb-2 text-lg dark:text-[#e5e5e5]">Privacy & Security</div>
          <div className="text-xs text-[#616161] dark:text-[#b5bcc4] space-y-1 mb-4">
            <div>• Profile visibility controls</div>
            <div>• Two-factor authentication</div>
            <div>• Active sessions management</div>
            <div>• Password & login settings</div>
          </div>
          <Link href="/settings/privacy" className="text-xs font-bold text-[#4676ac] hover:underline">
            MANAGE PRIVACY →
          </Link>
        </div>

        <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-6">
          <CreditCard className="w-10 h-10 text-[#4676ac] mb-4" />
          <div className="font-bold mb-2 text-lg dark:text-[#e5e5e5]">Billing & Subscription</div>
          <div className="text-xs text-[#616161] dark:text-[#b5bcc4] space-y-1 mb-4">
            <div>• Account tier & upgrades</div>
            <div>• Payment method management</div>
            <div>• Billing history & invoices</div>
            <div>• Subscription cancellation</div>
          </div>
          <Link href="/settings/billing" className="text-xs font-bold text-[#4676ac] hover:underline">
            MANAGE BILLING →
          </Link>
        </div>

        <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-6">
          <Globe className="w-10 h-10 text-[#4676ac] mb-4" />
          <div className="font-bold mb-2 text-lg dark:text-[#e5e5e5]">Preferences</div>
          <div className="text-xs text-[#616161] dark:text-[#b5bcc4] space-y-1 mb-4">
            <div>• Language & timezone settings</div>
            <div>• Theme & display density</div>
            <div>• Date & time formatting</div>
            <div>• Accessibility options</div>
          </div>
          <Link href="/settings/preferences" className="text-xs font-bold text-[#4676ac] hover:underline">
            MANAGE PREFERENCES →
          </Link>
        </div>

        <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-6">
          <Shield className="w-10 h-10 text-[#4676ac] mb-4" />
          <div className="font-bold mb-2 text-lg dark:text-[#e5e5e5]">Data & Export</div>
          <div className="text-xs text-[#616161] dark:text-[#b5bcc4] space-y-1 mb-4">
            <div>• Export all account data</div>
            <div>• Download journal entries</div>
            <div>• Request data deletion</div>
            <div>• Privacy policy details</div>
          </div>
          <Link href="/settings/privacy" className="text-xs font-bold text-[#4676ac] hover:underline">
            MANAGE DATA →
          </Link>
        </div>

        <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-6">
          <Download className="w-10 h-10 text-[#4676ac] mb-4" />
          <div className="font-bold mb-2 text-lg dark:text-[#e5e5e5]">Quick Export</div>
          <div className="text-xs text-[#616161] dark:text-[#b5bcc4] space-y-1 mb-4">
            <div>• Full account data (JSON)</div>
            <div>• Journal entries (Markdown)</div>
            <div>• Images & media files</div>
            <div>• Sponsorship records</div>
          </div>
          <Link href="/settings/privacy" className="block w-full px-3 py-2 bg-[#202020] dark:bg-[#3a3a3a] text-white font-bold hover:bg-[#4676ac] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#4676ac] text-xs text-center">
            EXPORT ALL DATA
          </Link>
        </div>

        <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-6">
          <Palette className="w-10 h-10 text-[#4676ac] mb-4" />
          <div className="font-bold mb-2 text-lg dark:text-[#e5e5e5]">Interface Options</div>
          <div className="text-xs text-[#616161] dark:text-[#b5bcc4] space-y-1 mb-4">
            <div>• Display density (compact/comfortable)</div>
            <div>• Content filtering preferences</div>
            <div>• Default view settings</div>
            <div>• Media auto-play controls</div>
          </div>
          <Link href="/settings/preferences" className="text-xs font-bold text-[#4676ac] hover:underline">
            CUSTOMIZE INTERFACE →
          </Link>
        </div>

        <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-6">
          <Settings className="w-10 h-10 text-[#4676ac] mb-4" />
          <div className="font-bold mb-2 text-lg dark:text-[#e5e5e5]">Quick Actions</div>
          <div className="space-y-2 text-xs mt-4">
            <Link href="/settings/privacy" className="block w-full px-3 py-2 bg-[#202020] dark:bg-[#2a2a2a] text-white font-bold hover:bg-[#365a87] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#4676ac] text-left">
              EXPORT ALL DATA
            </Link>
            <Link href="/settings/privacy" className="block w-full px-3 py-2 border-2 border-[#202020] dark:border-[#616161] dark:text-[#e5e5e5] font-bold hover:bg-[#95a2aa] dark:hover:bg-[#1a1a1a] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#616161] text-left">
              CHANGE PASSWORD
            </Link>
          </div>
        </div>
      </div>
    </SettingsLayout>
  );
}