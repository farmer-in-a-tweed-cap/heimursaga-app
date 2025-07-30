'use client';

import { useState } from 'react';

import {
  BulletList,
  SubscriptionPlanUpgradeCheckoutForm,
} from '@/components';
import { LOCALES } from '@/locales';

type PromoValidation = {
  loading: boolean;
  valid: boolean | null;
  error?: string;
  discount?: {
    originalAmount: number;
    discountAmount: number;
    finalAmount: number;
    percentOff?: number;
    amountOff?: number;
    currency: string;
  };
};

type Plan = {
  slug: string;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  discountYearly: number;
  currency: string;
  currencySymbol: string;
  active: boolean;
  expiry?: Date;
};

type Props = {
  plan: Plan;
};

export const CheckoutPageClient: React.FC<Props> = ({ plan }) => {
  const [promoValidation, setPromoValidation] = useState<PromoValidation>({
    loading: false,
    valid: null,
  });

  const displayPrice = promoValidation.valid && promoValidation.discount 
    ? (promoValidation.discount.finalAmount / 100).toFixed(2)
    : plan.priceMonthly.toString();

  const originalPrice = promoValidation.valid && promoValidation.discount
    ? (promoValidation.discount.originalAmount / 100).toFixed(2)
    : null;

  return (
    <div className="w-full h-auto flex flex-col lg:flex-row lg:justify-between gap-10 py-10">
      <div className="basis-6/12">
        <div className="flex flex-col gap-4 py-6">
          <span className="text-3xl font-medium">
            {LOCALES.APP.UPGRADE_CHECKOUT.PAGE.CTA.TITLE}
          </span>
          <p className="text-sm">
            {LOCALES.APP.UPGRADE_CHECKOUT.PAGE.CTA.DESCRIPTION}
          </p>
        </div>
        <div className="mt-6">
          <BulletList
            classNames={{
              list: 'gap-3',
              icon: 'bg-gray-500 text-white',
              item: 'text-gray-600 text-sm',
            }}
            items={LOCALES.APP.UPGRADE.PAGE.FEATURES}
          />
        </div>
        <div className="mt-14">
          <div className="flex flex-row w-full items-center justify-between">
            <div className="mt-4 flex flex-row items-center gap-2">
              <span className="text-3xl font-semibold leading-none">
                {plan.currencySymbol}
                {displayPrice}
              </span>
              <span className="pt-2 text-sm font-normal text-gray-600">
                / month
              </span>
              {originalPrice && (
                <span className="pt-2 text-sm text-gray-500 line-through ml-2">
                  {plan.currencySymbol}{originalPrice}
                </span>
              )}
            </div>
          </div>
          {promoValidation.valid && promoValidation.discount && (
            <div className="mt-2 text-sm text-green-600">
              {promoValidation.discount.percentOff
                ? `${promoValidation.discount.percentOff}% discount applied`
                : `${plan.currencySymbol}${(promoValidation.discount.amountOff! / 100).toFixed(2)} discount applied`
              }
            </div>
          )}
          <div className="mt-10 w-full h-[1px] bg-accent"></div>
        </div>
      </div>
      <div className="basis-5/12">
        <SubscriptionPlanUpgradeCheckoutForm
          promoValidation={promoValidation}
          onPromoValidationChange={setPromoValidation}
        >
          <div className="mt-6">
            <p className="text-xs font-normal text-gray-500">
              {LOCALES.APP.CHECKOUT.PAGE.TERMS}
            </p>
          </div>
        </SubscriptionPlanUpgradeCheckoutForm>
      </div>
    </div>
  );
};