import { Button } from '@repo/ui/components';
import Link from 'next/link';

import { CloseButton, SubscriptionPlanCard } from '@/components';
import { DEMO_DATA } from '@/constants';
import { ROUTER } from '@/router';

const plans = DEMO_DATA.PLANS;

export default function Page() {
  return (
    <div className="bg-background relative w-full min-h-screen flex flex-col justify-start items-center p-8">
      <div className="absolute top-3 right-3 lg:top-4 lg:left-4">
        <CloseButton redirect={ROUTER.HOME} />
      </div>
      <div className="flex flex-col py-8 items-center">
        <div className="w-full max-w-xl flex flex-col items-center text-base gap-6">
          <h2 className="font-medium text-5xl">Upgrade to Premium</h2>
          <p>
            Enjoy an enhanced experience, exclusive creator tools, top-tier
            verification and security.
          </p>
        </div>
        <div className="mt-10 w-full max-w-lg grid gap-4">
          {plans.map(({ currencySymbol: currency, ...plan }, key) => (
            <SubscriptionPlanCard key={key} {...plan} currency={currency} />
          ))}
        </div>
        <div className="mt-6 w-full max-w-xl flex flex-col justify-center items-center">
          <div>
            <Button size="lg" asChild>
              <Link href={ROUTER.PREMIUM_CHECKOUT}>Upgrade & Pay</Link>
            </Button>
          </div>
          <div className="mt-10">
            <p className="text-xs text-gray-500 text-center">
              By subscribing, you agree to our Purchaser Terms of Service.
              Subscriptions auto-renew until canceled. Cancel anytime, at least
              24 hours prior to renewal to avoid additional charges. Manage your
              subscription through the platform you subscribed on.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
