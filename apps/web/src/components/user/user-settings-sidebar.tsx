'use client';

import { Card } from '@repo/ui/components';
import { useRouter } from 'next/navigation';
import { useContext } from 'react';

import { ROUTER } from '@/router';

import { USER_SETTINGS_TABS, UserSettingsContext } from './user-settings';

export const UserSettingsSidebar = () => {
  const router = useRouter();
  const { context, setContext } = useContext(UserSettingsContext);

  const handleClick = (tab: string) => {
    router.push(ROUTER.USER.SETTINGS.PAGE_KEY(tab));
  };

  return (
    <Card className="sticky top-6 bg-white overflow-hidde py-2">
      <div className="flex flex-col">
        {USER_SETTINGS_TABS.map(({ label, key: tab }, key) => (
          <button
            key={key}
            className="w-full flex flex-row justify-start px-4 py-2 text-sm text-left font-normal text-black hover:bg-gray-100 rounded-none"
            onClick={() => handleClick(tab)}
          >
            {label}
          </button>
        ))}
      </div>
    </Card>
  );
};
