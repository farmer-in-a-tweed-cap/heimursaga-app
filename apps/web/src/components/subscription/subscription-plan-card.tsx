import { Badge } from '@repo/ui/components';

import { dateformat } from '@/lib/date-format';

import { BulletList } from '@/components';

type Props = {
  name?: string;
  currencySymbol?: string;
  priceMonthly?: number;
  priceYearly?: number;
  discountYearly?: number;
  features?: string[];
  active?: boolean;
  expiry?: Date;
};

export const SubscriptionPlanCard: React.FC<Props> = ({
  name = '',
  priceMonthly = 0,
  priceYearly = 0,
  discountYearly = 0,
  currencySymbol = '$',
  features = [],
  active = false,
  expiry,
}) => {
  return (
    <div className="bg-gray-200 p-8 box-border rounded-xl">
      <div className="flex flex-row justify-between">
        <span className="text-xl font-medium capitalize">{name}</span>
        {active && <Badge variant="success">active</Badge>}
      </div>

      <div className="mt-4 flex flex-row items-center gap-2">
        <span className="text-3xl font-semibold leading-none">
          {currencySymbol}
          {priceMonthly}
        </span>
        <span className="pt-2 text-sm font-normal text-gray-600">/ month</span>
      </div>
      {!active && (
        <div className="mt-1 flex flex-row gap-2">
          <span className="text-gray-600 text-base">
            {currencySymbol}
            {priceYearly} billed annually
          </span>
          {discountYearly > 0 && (
            <span className="py-1 px-2 bg-green-100 text-green-800 text-xs font-bold rounded-lg uppercase">
              Save {discountYearly}%
            </span>
          )}
        </div>
      )}
      {!active && (
        <div className="mt-6">
          <BulletList items={features} />
        </div>
      )}
      {active && (
        <div className="mt-8">
          <span className="text-base">
            Next payment: {dateformat(expiry).format('DD/MM/YYYY')}
          </span>
        </div>
      )}
    </div>
  );
};
