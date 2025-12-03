'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { TabNavbar } from '@/components';
import { ROUTER } from '@/router';
import { useNavigation } from '@/hooks';

import { EmailVerificationBanner } from './email-verification-banner';
import { UserSettingsPaymentMethodView } from './user-settings-payment-method-view';
import { UserSettingsProfileView } from './user-settings-profile-view';
import { UserSettingsSecurityView } from './user-settings-security-view';
import { UserSettingsSponsorshipsView } from './user-settings-sponsorships-view';
import { UserSettingsDisplayView } from './user-settings-display-view';

const SECTION_KEYS = {
  PROFILE: 'profile',
  PAYMENT_METHODS: 'payment-methods',
  SPONSORSHIPS: 'sponsorships',
  NOTIFICATIONS: 'notifications',
  SECURITY: 'security',
  DISPLAY: 'display',
  // BILLING: 'billing',
};

const SECTION_TABS: { key: string; label: string }[] = [
  { key: SECTION_KEYS.PROFILE, label: 'Profile' },
  { key: SECTION_KEYS.PAYMENT_METHODS, label: 'Payment methods' },
  { key: SECTION_KEYS.SPONSORSHIPS, label: 'Sponsorships' },
  { key: SECTION_KEYS.SECURITY, label: 'Security' },
  { key: SECTION_KEYS.DISPLAY, label: 'Display' },
  // { key: SECTION_KEYS.BILLING, label: 'Billing & payouts' },
];

type Props = {
  section: string;
  data: {
    profile?: {
      username: string;
      email: string;
      isEmailVerified?: boolean;
      // name: string;
      bio: string;
      picture: string;
    };
  };
};

export const UserSettings: React.FC<Props> = ({ section, data }) => {
  const router = useRouter();
  const { navigateTo, isNavigating } = useNavigation();

  const [state, setState] = useState<{ section: string }>({
    section,
  });

  const sectionKey = state.section;

  const handleChange = (section: string) => {
    setState((state) => ({ ...state, section }));
    navigateTo([ROUTER.USER.SETTINGS.HOME, section].join('/'), false);
  };

  return (
    <div className="w-full flex flex-col gap-4">
      <TabNavbar
        tabs={SECTION_TABS}
        activeTab={sectionKey}
        classNames={{
          container: 'justify-start',
          tabs: 'justify-start',
        }}
        onChange={handleChange}
        isLoading={isNavigating}
      />
      
      {/* Show email verification banner across all settings pages if not verified */}
      {data?.profile?.email && !data?.profile?.isEmailVerified && (
        <div className="mb-6">
          <EmailVerificationBanner email={data.profile.email} />
        </div>
      )}
      
      <div className="flex flex-col">
        {sectionKey === SECTION_KEYS.PROFILE && (
          <UserSettingsProfileView data={data?.profile} />
        )}
        {sectionKey === SECTION_KEYS.PAYMENT_METHODS && (
          <UserSettingsPaymentMethodView />
        )}
        {sectionKey === SECTION_KEYS.SPONSORSHIPS && (
          <UserSettingsSponsorshipsView />
        )}
        {sectionKey === SECTION_KEYS.SECURITY && (
          <UserSettingsSecurityView
            email={data?.profile?.email || ''}
            isEmailVerified={data?.profile?.isEmailVerified}
          />
        )}
        {sectionKey === SECTION_KEYS.DISPLAY && (
          <UserSettingsDisplayView />
        )}
      </div>
    </div>
  );
};
