'use client';

import { TabNavbar } from '../nav';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { CreatorSponsorships } from './creator-sponsorships';
import { SponsorshipTierView } from './sponsorship-tier-view';

const TABS = {
  TIERS: 'tiers',
  SPONSORS: 'sponsors',
};

export const SponsorshipView = () => {
  const [tab, setTab] = useState<string>(TABS.TIERS);

  const tabs: { key: string; label: string }[] = [
    { key: TABS.TIERS, label: 'Tiers' },
    { key: TABS.SPONSORS, label: 'Sponsors' },
  ];

  const handleTabChange = (tab: string) => {
    setTab(tab);

    // @todo
    // router.push([ROUTER.SPONSORSHIP.HOME, tab].join('/'), {
    //   scroll: false,
    // });
  };

  return (
    <div className="flex flex-col">
      <div className="w-full flex flex-row">
        <TabNavbar
          tabs={tabs}
          activeTab={tab}
          classNames={{
            container: 'w-full justify-start',
            tabs: 'max-w-2xl',
          }}
          onChange={handleTabChange}
        />
      </div>
      <div className="mt-2 flex flex-col w-full max-w-2xl">
        {tab === TABS.TIERS && <SponsorshipTierView />}
        {tab === TABS.SPONSORS && <CreatorSponsorships />}
      </div>
    </div>
  );
};
