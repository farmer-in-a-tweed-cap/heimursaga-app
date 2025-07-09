import { UserBar } from '../user';
import { ITripDetail } from '@repo/types';
import { Card, CardContent } from '@repo/ui/components';
import { cn } from '@repo/ui/lib/utils';
import Link from 'next/link';

import { dateformat } from '@/lib';

type Props = {
  href?: string;
  userbar?: boolean;
  onClick?: () => void;
} & ITripDetail;

export const TripCard: React.FC<Props & { variant: 'public' | 'private' }> = ({
  variant = 'public',
  ...props
}) => {
  switch (variant) {
    case 'public':
      return <TripPublicCard {...props} />;
    case 'private':
      return <TripPrivateCard {...props} />;
  }
};

const TripPublicCard: React.FC<Props> = ({
  href,
  title,
  startDate = new Date(),
  endDate = new Date(),
  author,
  userbar,
  onClick,
}) => {
  return (
    <Card>
      <CardContent>
        {href ? (
          <Link href={href} className="z-10 absolute inset-0"></Link>
        ) : onClick ? (
          <div
            className="z-10 absolute inset-0 cursor-pointer"
            onClick={onClick}
          ></div>
        ) : (
          <></>
        )}
        <div className="relative flex flex-row justify-between items-center">
          <div className="w-auto flex flex-row justify-start items-center gap-3 z-20">
            {userbar && (
              <UserBar
                name={author?.username}
                picture={author?.picture}
                creator={author?.creator}
                text={`${dateformat(startDate).format('MMM DD')}-${dateformat(endDate).format('MMM DD')}`}
              />
            )}
          </div>
        </div>
        <div className="flex flex-col gap-1 justify-start items-start">
          <span className="font-medium text-lg text-black">{title}</span>
          <span className="text-xs text-gray-500">
            {startDate
              ? endDate
                ? `${[dateformat(startDate).format('MMM DD'), dateformat(endDate).format('MMM DD')].join(' - ')}`
                : `${dateformat(startDate).format('MMM DD')}`
              : 'No date'}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

const TripPrivateCard: React.FC<Props> = ({
  href,
  title = 'trip',
  startDate = new Date(),
  endDate = new Date(),
}) => {
  return (
    <Card>
      {href && <Link href={href} className="z-10 absolute inset-0"></Link>}
      <CardContent>
        <div className="flex flex-col gap-1 justify-start items-start">
          <span className="font-medium text-lg text-black">{title}</span>
          <span className="text-xs text-gray-500">
            {startDate
              ? endDate
                ? `${[dateformat(startDate).format('MMM DD'), dateformat(endDate).format('MMM DD')].join(' - ')}`
                : `${dateformat(startDate).format('MMM DD')}`
              : 'No date'}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};
