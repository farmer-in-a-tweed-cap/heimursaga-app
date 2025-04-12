import { Button } from '@repo/ui/components';
import { CheckIcon } from 'lucide-react';

import { CloseButton } from '@/components';
import { DEMO_DATA } from '@/constants';
import { ROUTER } from '@/router';

const plans = [DEMO_DATA.PREMIUM_PLAN];

export default function Page() {
  return (
    <div className="bg-background relative w-full min-h-screen flex flex-col justify-start items-center p-8">
      <div className="absolute top-4 left-4">
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
          {plans.map(
            (
              {
                name,
                monthlyPrice,
                yearlyPrice,
                yearlyDiscount,
                features,
                currencySymbol,
              },
              key,
            ) => (
              <div key={key} className="bg-gray-200 p-8 box-border rounded-xl">
                <span className="text-xl font-medium">{name}</span>
                <div className="mt-4 flex flex-row items-center gap-2">
                  <span className="text-3xl font-semibold leading-none">
                    {currencySymbol}
                    {monthlyPrice}
                  </span>
                  <span className="pt-2 text-sm font-normal text-gray-600">
                    / month
                  </span>
                </div>
                <div className="mt-1 flex flex-row gap-2">
                  <span className="text-gray-600 text-base">
                    {currencySymbol}
                    {yearlyPrice} billed annually
                  </span>
                  <span className="py-1 px-2 bg-green-100 text-green-800 text-xs font-bold rounded-lg uppercase">
                    Save {yearlyDiscount}%
                  </span>
                </div>

                <div className="mt-6">
                  <ul className="flex flex-col gap-1">
                    {features.map((feature, key) => (
                      <li
                        key={key}
                        className="flex flex-row items-center justify-start gap-2 text-gray-600"
                      >
                        <CheckIcon size={18} />
                        <span className="text-base  font-normal">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ),
          )}
        </div>
        <div className="mt-6 w-full max-w-xl flex flex-col justify-center items-center">
          <div>
            <Button size="lg">Upgrade & Pay</Button>
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
