'use client';

import { Card, CardContent } from '@repo/ui/components';
import { createContext, useState } from 'react';

import { PageHeaderTitle } from '@/components';

import { UserSettingsNavbar } from './user-settings-navbar';
import { UserSettingsPaymentMethodView } from './user-settings-payment-method-view';
import { UserSettingsProfileView } from './user-settings-profile-view';

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
  PAYMENT_METHODS: 'payment_methods',
};

export const USER_SETTINGS_TABS: { key: string; label: string }[] = [
  { key: USER_SETTINGS_TAB_KEYS.PROFILE, label: 'Profile' },
  { key: USER_SETTINGS_TAB_KEYS.PAYMENT_METHODS, label: 'Payment methods' },
];

export const UserSettingsContext = createContext<IUserSettingsContext>({
  context: { tab: USER_SETTINGS_TAB_KEYS.PROFILE },
  setContext: () => {},
});

type Props = {
  section: string;
  data: {
    profile?: {
      username: string;
      email: string;
      firstName: string;
      lastName: string;
      bio: string;
      picture: string;
    };
  };
};

export const UserSettings: React.FC<Props> = ({ section, data }) => {
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
      <div className="w-full flex flex-col gap-4">
        <PageHeaderTitle>Settings</PageHeaderTitle>
        <div>
          <UserSettingsNavbar />
        </div>
        <Card>
          <CardContent>
            {activeTabKey === USER_SETTINGS_TAB_KEYS.PROFILE && (
              <UserSettingsProfileView data={data?.profile} />
            )}
            {activeTabKey === USER_SETTINGS_TAB_KEYS.PAYMENT_METHODS && (
              <UserSettingsPaymentMethodView />
            )}
          </CardContent>
        </Card>
      </div>
    </UserSettingsContext.Provider>
  );
};
