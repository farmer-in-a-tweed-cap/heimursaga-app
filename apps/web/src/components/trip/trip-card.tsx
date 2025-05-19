import { ITripDetail } from '@repo/types';
import { Card } from '@repo/ui/components';
import Link from 'next/link';

import { dateformat } from '@/lib';

type Props = {
  href?: string;
} & ITripDetail;

export const TripCard: React.FC<Props> = ({
  href,
  title,
  startDate,
  endDate,
}) => {
  return (
    <Card className="p-4 box-border cursor-pointer hover:bg-gray-50">
      {href && <Link href={href} className="z-10 absolute inset-0"></Link>}
      <div className="flex flex-row gap-4 items-center">
        <div className="flex flex-col">
          <div className="flex flex-row gap-1">
            <span className="font-medium text-base">{title}</span>
          </div>
          <div className="text-sm text-gray-600 font-normal">
            {startDate && endDate ? (
              <span>
                {dateformat(startDate).format('MMM DD')} -{' '}
                {dateformat(endDate).format('MMM DD')}
              </span>
            ) : (
              <span>No date</span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};
