'use client';

import { User, Bell, Lock, CreditCard, Palette } from 'lucide-react';
import { SettingsLayout } from '@/app/components/SettingsLayout';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';

export function SettingsPage() {
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-6">
          <User className="w-10 h-10 text-[#4676ac] mb-4" />
          <div className="font-bold mb-2 text-lg dark:text-[#e5e5e5]">Profile Settings</div>
          <div className="text-xs text-[#616161] dark:text-[#b5bcc4] space-y-1 mb-4">
            <div>Username, bio, avatar, cover photo</div>
            <div>Locations and social links</div>
            <div>Equipment list</div>
          </div>
          <Link href="/edit-profile" className="text-xs font-bold text-[#4676ac] hover:underline">
            EDIT PROFILE →
          </Link>
        </div>

        <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-6">
          <Bell className="w-10 h-10 text-[#4676ac] mb-4" />
          <div className="font-bold mb-2 text-lg dark:text-[#e5e5e5]">Notifications</div>
          <div className="text-xs text-[#616161] dark:text-[#b5bcc4] space-y-1 mb-4">
            <div>Email notification preferences</div>
            <div>Sponsorships, digests, and updates</div>
          </div>
          <Link href="/settings/notifications" className="text-xs font-bold text-[#4676ac] hover:underline">
            MANAGE NOTIFICATIONS →
          </Link>
        </div>

        <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-6">
          <Lock className="w-10 h-10 text-[#4676ac] mb-4" />
          <div className="font-bold mb-2 text-lg dark:text-[#e5e5e5]">Privacy & Security</div>
          <div className="text-xs text-[#616161] dark:text-[#b5bcc4] space-y-1 mb-4">
            <div>Password management</div>
            <div>Active session control</div>
          </div>
          <Link href="/settings/privacy" className="text-xs font-bold text-[#4676ac] hover:underline">
            MANAGE SECURITY →
          </Link>
        </div>

        <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-6">
          <CreditCard className="w-10 h-10 text-[#4676ac] mb-4" />
          <div className="font-bold mb-2 text-lg dark:text-[#e5e5e5]">Billing & Subscription</div>
          <div className="text-xs text-[#616161] dark:text-[#b5bcc4] space-y-1 mb-4">
            <div>Account tier and payment methods</div>
            <div>Billing history and payouts</div>
          </div>
          <Link href="/settings/billing" className="text-xs font-bold text-[#4676ac] hover:underline">
            MANAGE BILLING →
          </Link>
        </div>

        <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-6">
          <Palette className="w-10 h-10 text-[#4676ac] mb-4" />
          <div className="font-bold mb-2 text-lg dark:text-[#e5e5e5]">Preferences</div>
          <div className="text-xs text-[#616161] dark:text-[#b5bcc4] space-y-1 mb-4">
            <div>Theme and distance units</div>
          </div>
          <Link href="/settings/preferences" className="text-xs font-bold text-[#4676ac] hover:underline">
            MANAGE PREFERENCES →
          </Link>
        </div>
      </div>
    </SettingsLayout>
  );
}
