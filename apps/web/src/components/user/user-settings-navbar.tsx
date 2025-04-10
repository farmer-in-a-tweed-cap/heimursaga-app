'use client';

import { cn } from '@repo/ui/lib/utils';
import { useRouter } from 'next/navigation';
import { useContext } from 'react';

import { ROUTER } from '@/router';

import { USER_SETTINGS_TABS, UserSettingsContext } from './user-settings';

export const UserSettingsNavbar = () => {
  const router = useRouter();
  const { context } = useContext(UserSettingsContext);

  const activeTab = context.tab;

  const handleClick = (tab: string) => {
    router.push(ROUTER.USER.SETTINGS.PAGE_KEY(tab));
  };

  return (
    <div className="flex flex-row justify-start items-center gap-6">
      {USER_SETTINGS_TABS.map(({ label, key: tab }, key) => (
        <button
          key={key}
          className={cn(
            'w-auto flex flex-col items-center gap-2 font-medium justify-start py-2 text-sm text-left hover:text-black rounded-none',
            activeTab === tab ? 'text-black' : 'text-black/70',
          )}
          onClick={() => handleClick(tab)}
        >
          <span>{label}</span>
          <span
            className={cn(
              'w-full  h-[2px]',
              activeTab === tab ? 'bg-black' : 'bg-transparent',
            )}
          ></span>
        </button>
      ))}
    </div>
  );
};
