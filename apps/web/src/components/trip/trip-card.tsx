import { UserBar } from '../user';
import { ITripDetail } from '@repo/types';
import { Card, CardContent } from '@repo/ui/components';
import { cn } from '@repo/ui/lib/utils';
import Link from 'next/link';

import { dateformat } from '@/lib';

type Props = {
  href?: string;
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
            <UserBar
              name={author?.name}
              picture={author?.picture}
              creator={author?.creator}
              text={dateformat(startDate).format('MMM DD')}
            />

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
          {/* <div className="z-20 flex flex-row items-center gap-2">
             {me ? (
               <>
                 {actions?.edit && <PostEditButton postId={id} />}
                 {actions?.bookmark && (
                   <PostBookmarkButton
                     postId={id}
                     bookmarked={bookmarked}
                     bookmarksCount={bookmarksCount}
                     disableCount={true}
                   />
                 )}
               </>
             ) : (
               <>
                 {actions?.bookmark && (
                   <PostBookmarkButton
                     postId={id}
                     bookmarked={bookmarked}
                     bookmarksCount={bookmarksCount}
                     disableCount={true}
                   />
                 )}
               </>
             )}
           </div> */}
        </div>
        <div className="relative flex flex-col overflow-hidden">
          {/* {thumbnail && (
             <div className="mt-6 w-full aspect-5/2 overflow-hidden rounded-xl">
               <Image
                 src={thumbnail || ''}
                 width={400}
                 height={300}
                 className="w-full h-auto"
                 alt=""
               />
             </div>
           )} */}
          <div className="mt-6 flex flex-col">
            <span
            //  className={cn('font-medium', extended ? 'text-2xl' : 'text-base')}
            >
              {title}
            </span>
            {/* <div className={extended ? 'mt-6' : 'mt-2'}>
               {extended ? (
                 <NormalizedText text={content} />
               ) : (
                 <p className="break-all">
                   {content.length <= 80
                     ? content.split('\\n').join('')
                     : `${content.split('\\n').join('').slice(0, 80)}..`}
                 </p>
               )}
             </div> */}
          </div>
          {/* {waypoint && (
             <div className="mt-6">
               <MapStaticPreview
                 href={
                   id
                     ? `${ROUTER.EXPLORE.HOME}?lat=${waypoint.lat}&lon=${waypoint.lon}&alt=12`
                     : '#'
                 }
                 lat={waypoint.lat}
                 lon={waypoint.lon}
                 zoom={8}
                 markers={[
                   {
                     lat: waypoint.lat,
                     lon: waypoint.lon,
                   },
                 ]}
               />
             </div>
           )} */}
        </div>

        {/* {actions?.like && (
           <div className="z-20 mt-6 w-auto flex flex-row gap-1">
             <PostLikeButton postId={id} likesCount={likesCount} liked={liked} />
           </div>
         )} */}
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
