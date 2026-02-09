'use client';

import { Settings } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

interface SettingsLayoutProps {
  children: ReactNode;
}

export function SettingsLayout({ children }: SettingsLayoutProps) {
  const pathname = usePathname();

  const tabs = [
    { path: '/settings', label: 'OVERVIEW' },
    { path: '/edit-profile', label: 'PROFILE' },
    { path: '/settings/notifications', label: 'NOTIFICATIONS' },
    { path: '/settings/privacy', label: 'PRIVACY' },
    { path: '/settings/billing', label: 'BILLING' },
    { path: '/settings/preferences', label: 'PREFERENCES' },
    { path: '/insights', label: 'INSIGHTS' },
  ];

  const isActiveTab = (path: string) => {
    if (path === '/settings') {
      return pathname === '/settings';
    }
    return pathname === path;
  };

  return (
    <div className="max-w-[1600px] mx-auto px-4 lg:px-6 py-6 lg:py-8">
      {/* Page Header */}
      <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] mb-6">
        <div className="p-4 lg:p-6 border-b-2 border-[#202020] dark:border-[#616161]">
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6 text-[#ac6d46]" />
            <h1 className="text-xl lg:text-2xl font-bold dark:text-[#e5e5e5]">ACCOUNT SETTINGS</h1>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto">
          {tabs.map((tab) => (
            <Link
              key={tab.path}
              href={tab.path}
              className={`px-4 py-3 text-xs font-bold whitespace-nowrap transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-inset focus-visible:outline-none border-r border-[#b5bcc4] dark:border-[#3a3a3a] ${
                isActiveTab(tab.path)
                  ? 'bg-[#4676ac] text-white focus-visible:ring-white'
                  : 'bg-white dark:bg-[#202020] text-[#202020] dark:text-[#e5e5e5] hover:bg-[#95a2aa] dark:hover:bg-[#3a3a3a] focus-visible:ring-[#4676ac]'
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Content */}
      {children}
    </div>
  );
}