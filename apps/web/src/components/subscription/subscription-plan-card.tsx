import { BulletList } from '@/components';

type Props = {
  name?: string;
  currency?: string;
  monthlyPrice?: number;
  yearlyPrice?: number;
  yearlyDiscount?: number;
  features?: string[];
};

export const SubscriptionPlanCard: React.FC<Props> = ({
  name = '',
  monthlyPrice = 0,
  yearlyPrice = 0,
  yearlyDiscount = 0,
  currency = '$',
  features = [],
}) => {
  return (
    <div className="bg-gray-200 p-8 box-border rounded-xl">
      <span className="text-xl font-medium">{name}</span>
      <div className="mt-4 flex flex-row items-center gap-2">
        <span className="text-3xl font-semibold leading-none">
          {currency}
          {monthlyPrice}
        </span>
        <span className="pt-2 text-sm font-normal text-gray-600">/ month</span>
      </div>
      <div className="mt-1 flex flex-row gap-2">
        <span className="text-gray-600 text-base">
          {currency}
          {yearlyPrice} billed annually
        </span>
        <span className="py-1 px-2 bg-green-100 text-green-800 text-xs font-bold rounded-lg uppercase">
          Save {yearlyDiscount}%
        </span>
      </div>

      <div className="mt-6">
        <BulletList items={features} />
      </div>
    </div>
  );
};
