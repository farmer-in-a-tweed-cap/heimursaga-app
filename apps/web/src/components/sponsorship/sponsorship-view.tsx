'use client';

import { TabNavbar } from '../nav';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { ROUTER } from '@/router';

import { CreatorSponsorships } from './creator-sponsorships';
import { SponsorshipTierView } from './sponsorship-tier-view';

const TABS = {
  TIERS: 'tiers',
  SPONSORS: 'sponsors',
};

type Props = {
  section: string;
};

export const SponsorshipView: React.FC<Props> = ({ section }) => {
  const router = useRouter();

  const [tab, setTab] = useState<string>(section || TABS.TIERS);

  const tabs: { key: string; label: string }[] = [
    { key: TABS.TIERS, label: 'Tiers' },
    { key: TABS.SPONSORS, label: 'Sponsors' },
  ];

  const handleTabChange = (tab: string) => {
    setTab(tab);
    router.push([ROUTER.SPONSORSHIP.ROOT, tab].join('/'), {
      scroll: false,
    });
  };

  useEffect(() => {
    if (!section) {
      router.push([ROUTER.SPONSORSHIP.HOME, TABS.TIERS].join('/'), {
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
            tabs: 'max-w-2xl',
          }}
          onChange={handleTabChange}
        />
      </div>
      <div className="mt-2 flex flex-col w-full">
        {tab === TABS.TIERS && <SponsorshipTierView />}
        {tab === TABS.SPONSORS && <CreatorSponsorships />}
      </div>
    </div>
  );
};
