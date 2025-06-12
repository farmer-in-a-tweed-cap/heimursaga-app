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
  startDate,
  endDate,
  author,
  userbar,
  onClick,
}) => {
  return (
    <Card
      className={cn(
        'border-2 border-solid',
        //  selected ? 'border-black' : 'border-transparent',
      )}
    >
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
                name={author?.name}
                picture={author?.picture}
                creator={author?.creator}
                text={`${dateformat(startDate).format('MMM DD')}-${dateformat(endDate).format('MMM DD')}`}
              />
            )}

            {/* {userbar?.href ? (
               <Link
                 href={
                   userbar?.href
                     ? userbar?.href
                     : author?.username
                       ? ROUTER.USERS.DETAIL(author.username)
                       : '#'
                 }
               >
                 <UserBar
                   name={author?.name}
                   picture={author?.picture}
                   creator={author?.creator}
                   text={dateformat(date).format('MMM DD')}
                 />
               </Link>
             ) : (
               <div className="cursor-pointer" onClick={userbar?.click}>
                 <UserBar
                   name={author?.name}
                   picture={author?.picture}
                   creator={author?.creator}
                   text={dateformat(date).format('MMM DD')}
                 />
               </div>
             )} */}
          </div>
        </div>
        <div className="flex flex-col gap-1 justify-start items-start">
          <span className="font-medium text-lg text-black">{title}</span>
          <span className="text-xs text-gray-500">
            {dateformat(startDate).format('MMM DD')} -{' '}
            {dateformat(endDate).format('MMM DD')}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

const TripPrivateCard: React.FC<Props> = ({
  href,
  title,
  startDate,
  endDate,
}) => {
  return (
    <Card className="box-border cursor-pointer hover:bg-gray-50">
      <CardContent>
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
      </CardContent>
    </Card>
  );
};
