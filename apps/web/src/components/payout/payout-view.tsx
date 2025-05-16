'use client';

import { TabNavbar } from '../nav';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { LOCALES } from '@/locales';
import { ROUTER } from '@/router';

import { PayoutBillingView } from './payout-billing-view';
import { PayoutWithdrawView } from './payout-withdraw-view';

const TABS = {
  WITHDRAW: 'withdraw',
  BILLING: 'billing',
};

type Props = {
  section: string;
};

export const PayoutView: React.FC<Props> = ({ section }) => {
  const router = useRouter();

  const [tab, setTab] = useState<string>(section || TABS.WITHDRAW);

  const tabs: { key: string; label: string }[] = [
    { key: TABS.WITHDRAW, label: LOCALES.APP.PAYOUT.TABS.WITHDRAW },
    { key: TABS.BILLING, label: LOCALES.APP.PAYOUT.TABS.BILLING },
  ];

  const handleTabChange = (tab: string) => {
    setTab(tab);
    router.push([ROUTER.PAYOUTS.HOME, tab].join('/'), {
      scroll: false,
    });
  };

  useEffect(() => {
    if (!section) {
      router.push([ROUTER.PAYOUTS.HOME, TABS.WITHDRAW].join('/'), {
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
      <div className="mt-2 flex flex-col w-full py-4">
        {tab === TABS.WITHDRAW && <PayoutWithdrawView />}
        {tab === TABS.BILLING && <PayoutBillingView />}
      </div>
    </div>
  );
};
