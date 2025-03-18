'use client';

import { Card } from '@repo/ui/components';
import { cn } from '@repo/ui/lib/utils';
import { useRouter } from 'next/navigation';
import { useContext } from 'react';

import { ROUTER } from '@/router';

import { USER_SETTINGS_TABS, UserSettingsContext } from './user-settings';

export const UserSettingsSidebar = () => {
  const router = useRouter();
  const { context, setContext } = useContext(UserSettingsContext);

  const activeTab = context.tab;

  const handleClick = (tab: string) => {
    router.push(ROUTER.USER.SETTINGS.PAGE_KEY(tab));
  };

  return (
    <Card className="sticky top-6 bg-white overflow-hidden">
      <div className="flex flex-row sm:flex-col">
        {USER_SETTINGS_TABS.map(({ label, key: tab }, key) => (
          <button
            key={key}
            className={cn(
              'w-full flex flex-row justify-start px-4 py-2 text-sm text-left font-normal hover:bg-gray-100 rounded-none',
              activeTab === tab ? 'bg-gray-100 text-black' : 'text-black/70',
            )}
            onClick={() => handleClick(tab)}
          >
            {label}
          </button>
        ))}
      </div>
    </Card>
  );
};
