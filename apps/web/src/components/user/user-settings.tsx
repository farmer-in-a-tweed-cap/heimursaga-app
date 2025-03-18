'use client';

import { Card, CardContent, CardTitle } from '@repo/ui/components';
import { createContext, useState } from 'react';

import { UserSettingsBillingView } from './user-settings-billing-view';
import { UserSettingsProfileView } from './user-settings-profile-view';
import { UserSettingsSidebar } from './user-settings-sidebar';

interface IUserSettingsContextValue {
  tab: string;
}

interface IUserSettingsContext {
  context: { tab: string };
  setContext: (value: Partial<IUserSettingsContextValue>) => void;
}

export const USER_SETTINGS_TAB_KEYS = {
  PROFILE: 'profile',
  NOTIFICATIONS: 'notifications',
  SECURITY: 'security',
  BILLING: 'billing',
};

export const USER_SETTINGS_TABS: { key: string; label: string }[] = [
  { key: USER_SETTINGS_TAB_KEYS.PROFILE, label: 'Profile' },
  { key: USER_SETTINGS_TAB_KEYS.BILLING, label: 'Billing' },
];

export const UserSettingsContext = createContext<IUserSettingsContext>({
  context: { tab: USER_SETTINGS_TAB_KEYS.PROFILE },
  setContext: () => {},
});

type Props = {
  section: string;
};

export const UserSettings: React.FC<Props> = ({ section }) => {
  const [state, setState] = useState<IUserSettingsContextValue>({
    tab: section || USER_SETTINGS_TAB_KEYS.PROFILE,
  });

  const setContext = (value: Partial<IUserSettingsContextValue>) => {
    setState((state) => ({ ...state, ...value }));
  };

  const activeTabKey = state.tab;
  const activeTab = USER_SETTINGS_TABS.find(({ key }) => key === activeTabKey);

  return (
    <UserSettingsContext.Provider value={{ context: state, setContext }}>
      <div className="app-container w-full max-w-5xl flex flex-col sm:flex-row justify-between gap-4">
        <div className="w-full max-w-[200px]">
          <UserSettingsSidebar />
        </div>
        <Card>
          <CardTitle className="text-lg">{activeTab?.label}</CardTitle>
          <CardContent>
            {activeTabKey === USER_SETTINGS_TAB_KEYS.PROFILE && (
              <UserSettingsProfileView />
            )}
            {activeTabKey === USER_SETTINGS_TAB_KEYS.BILLING && (
              <UserSettingsBillingView />
            )}
          </CardContent>
        </Card>
      </div>
    </UserSettingsContext.Provider>
  );
};
