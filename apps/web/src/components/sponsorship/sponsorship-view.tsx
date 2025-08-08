'use client';

import { Alert, AlertDescription } from '@repo/ui/components';

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
  
  const isStripeConnected = session.stripeAccountConnected || false;
  const requiresStripe = [TABS.TIERS, TABS.SPONSORS, TABS.PAYOUTS];

  const tabs: { key: string; label: string; disabled?: boolean }[] = [
    { key: TABS.TIERS, label: 'Tiers', disabled: !isStripeConnected },
    { key: TABS.SPONSORS, label: 'Sponsors', disabled: !isStripeConnected },
    { key: TABS.PAYOUTS, label: 'Payouts', disabled: !isStripeConnected },
    { key: TABS.ACCOUNT, label: 'Account' },
  ];

  const handleTabChange = (tab: string) => {
    // Prevent navigation to disabled tabs
    if (!isStripeConnected && requiresStripe.includes(tab)) {
      return;
    }
    
    setTab(tab);
    router.push([ROUTER.SPONSORSHIP.ROOT, tab].join('/'), {
      scroll: false,
    });
  };

  useEffect(() => {
    if (!section) {
      // Redirect to account tab if Stripe not connected, otherwise tiers
      const defaultTab = !isStripeConnected ? TABS.ACCOUNT : TABS.TIERS;
      router.push([ROUTER.SPONSORSHIP.ROOT, defaultTab].join('/'), {
        scroll: false,
      });
    } else if (!isStripeConnected && requiresStripe.includes(section)) {
      // If accessing a Stripe-required tab without connection, redirect to account
      router.push([ROUTER.SPONSORSHIP.ROOT, TABS.ACCOUNT].join('/'), {
        scroll: false,
      });
    }
  }, [section, isStripeConnected]);

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
        {!isStripeConnected && requiresStripe.includes(tab) && (
          <Alert className="mb-6">
            <AlertDescription>
              ⚠️ Complete your Stripe Connect setup in the Account tab to enable sponsorship features.
            </AlertDescription>
          </Alert>
        )}
        
        {tab === TABS.TIERS && (
          isStripeConnected ? <SponsorshipTierView /> : null
        )}
        {tab === TABS.SPONSORS && (
          isStripeConnected ? <CreatorSponsorships /> : null
        )}
        {tab === TABS.PAYOUTS && (
          isStripeConnected ? <PayoutWithdrawView /> : null
        )}
        {tab === TABS.ACCOUNT && <PayoutBillingView />}
      </div>
    </div>
  );
};
