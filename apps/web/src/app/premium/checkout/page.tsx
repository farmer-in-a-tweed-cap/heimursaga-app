import { Button } from '@repo/ui/components';

import { CheckoutLayout } from '@/app/layout';

import { BulletList, PaymentCheckoutForm } from '@/components';
import { DEMO_DATA } from '@/constants';

export const dynamic = 'force-dynamic';

export default function Page() {
  const plan = {
    price: DEMO_DATA.PREMIUM_PLAN.monthlyPrice,
    currency: {
      symbol: DEMO_DATA.PREMIUM_PLAN.currencySymbol,
    },
  };
  return (
    <CheckoutLayout>
      <div className="w-full h-auto flex flex-col lg:flex-row lg:justify-between gap-10 py-10">
        <div className="basis-6/12">
          <div className="flex flex-col gap-4 py-6">
            <span className="text-3xl font-medium">Upgrade to Premium</span>
            <p className="text-sm">
              Then just $50 a year after your trial. No commitment, cancel
              anytime.
            </p>
          </div>
          <div className="mt-6">
            <BulletList
              classNames={{
                list: 'gap-3',
                icon: 'bg-gray-500 text-white',
                item: 'text-gray-600 text-sm',
              }}
              items={DEMO_DATA.PREMIUM_PLAN.features}
            />
          </div>
          <div className="mt-14">
            <div className="flex flex-row w-full items-center justify-between">
              <div className="mt-4 flex flex-row items-center gap-2">
                <span className="text-3xl font-semibold leading-none">
                  {plan.currency.symbol}
                  {plan.price}
                </span>
                <span className="pt-2 text-sm font-normal text-gray-600">
                  / month
                </span>
              </div>
            </div>
            <div className="mt-10 w-full h-[1px] bg-gray-200"></div>
          </div>
        </div>
        <div className="basis-5/12">
          <PaymentCheckoutForm>
            <div className="mt-4 flex flex-col">
              <Button className="w-full">Upgrade</Button>
              <div className="mt-6">
                <p className="text-xs font-normal text-gray-500">
                  By clicking Subscribe now, you agree to Patreon’s Terms of Use
                  and Privacy Policy. This Patreon subscription automatically
                  renews monthly, and you’ll be notified in advance if the
                  monthly amount increases. Cancel anytime in your membership
                  settings.
                </p>
              </div>
            </div>
          </PaymentCheckoutForm>
        </div>
      </div>
    </CheckoutLayout>
  );
}
