'use client';

import { TabNavbar } from '../nav';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { useSession } from '@/hooks';
import { ROUTER } from '@/router';

import { CreatorSponsorships } from './creator-sponsorships';
import { SponsorshipTierView } from './sponsorship-tier-view';
import { PayoutWithdrawView } from '../payout/payout-withdraw-view';
import { PayoutBillingView } from '../payout/payout-billing-view';

const TABS = {
  TIERS: 'tiers',
  SPONSORS: 'sponsors',
  PAYOUTS: 'payouts',
  ACCOUNT: 'account',
};

type Props = {
  section: string;
};

export const SponsorshipView: React.FC<Props> = ({ section }) => {
  const router = useRouter();
  const session = useSession();

  const [tab, setTab] = useState<string>(section || TABS.TIERS);

  const tabs: { key: string; label: string }[] = [
    { key: TABS.TIERS, label: 'Tiers' },
    { key: TABS.SPONSORS, label: 'Sponsors' },
    { key: TABS.PAYOUTS, label: 'Payouts' },
    { key: TABS.ACCOUNT, label: 'Account' },
  ];

  const handleTabChange = (tab: string) => {
    setTab(tab);
    router.push([ROUTER.SPONSORSHIP.ROOT, tab].join('/'), {
      scroll: false,
    });
  };

  useEffect(() => {
    if (!section) {
      router.push([ROUTER.SPONSORSHIP.ROOT, TABS.TIERS].join('/'), {
        scroll: false,
      });
    }
  }, []);

  return (
    <div className="flex flex-col w-full">
      <div className="w-full flex flex-row">
        <TabNavbar
          tabs={tabs}
          activeTab={tab}
          classNames={{
            container: 'w-full justify-start',
            tabs: 'max-w-4xl',
          }}
          onChange={handleTabChange}
        />
      </div>
      <div className="mt-2 flex flex-col w-full py-4">
        {tab === TABS.TIERS && <SponsorshipTierView />}
        {tab === TABS.SPONSORS && <CreatorSponsorships />}
        {tab === TABS.PAYOUTS && <PayoutWithdrawView />}
        {tab === TABS.ACCOUNT && <PayoutBillingView />}
      </div>
    </div>
  );
};
