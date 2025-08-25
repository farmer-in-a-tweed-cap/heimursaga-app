'use client';

import { Badge, Card, CardContent, NormalizedText } from '@repo/ui/components';
import { LockSimpleIcon, MapPinIcon, CalendarIcon, PathIcon } from '@repo/ui/icons';
import { cn } from '@repo/ui/lib/utils';
import Image from 'next/image';
import Link from 'next/link';

import { dateformat, normalizeText } from '@/lib';

import { MapStaticPreview, PostButtons, UserBar, UserAvatar, NavigationLink } from '@/components';
import { APP_CONFIG } from '@/config';
import { useSession } from '@/hooks';
import { ROUTER } from '@/router';

import { PostBookmarkButton } from './post-bookmark-button';
import { PostEditButton } from './post-edit-button';

export type PostCardProps = {
  href?: string;
  classNames?: {
    card?: string;
  };
  media?: { thumbnail: string; caption?: string }[];
  id?: string;
  title?: string;
  content?: string;
  place?: string;
  date?: Date;
  createdAt?: Date;
  thumbnail?: string;
  author?: {
    picture?: string;
    username?: string;
    name?: string;
    creator?: boolean;
  };
  waypoint?: {
    lat: number;
    lon: number;
  };
  actions?: {
    like?: boolean;
    bookmark?: boolean;
    edit?: boolean;
    share?: boolean;
  };
  bookmarked?: boolean;
  bookmarksCount?: number;
  liked?: boolean;
  likesCount?: number;
  public?: boolean;
  sponsored?: boolean;
  extended?: boolean;
  userbar?: {
    href?: string;
    click?: () => void;
  };
  selected?: boolean;
  onClick?: () => void;
  onHover?: () => void;
  onUnhover?: () => void;
  isWaypoint?: boolean;
  isEntry?: boolean;
  trip?: {
    title: string;
  };
};

export const PostCard: React.FC<PostCardProps> = ({
  id,
  href,
  title = '',
  content = '',
  author = {
    name: '',
    picture: '',
    username: '',
  },
  date,
  createdAt,
  place,
  waypoint,
  liked = false,
  likesCount = 0,
  bookmarked = false,
  bookmarksCount = 0,
  public: isPublic = true,
  sponsored = false,
  actions = {
    like: true,
    bookmark: true,
    edit: false,
    share: false,
  },
  userbar,
  extended = false,
  selected = false,
  media = [],
  onClick,
  onHover,
  onUnhover,
  isWaypoint = false,
  isEntry = false,
  trip,
}) => {
  const session = useSession();
  const me =
    session.username && author.username
      ? author.username === session.username
      : false;

  return (
    <Card
      className={cn(
        'border-2 border-solid',
        selected ? 'border-black' : 'border-transparent',
        isWaypoint ? 'bg-gray-100' : '', // Darker gray background for waypoints
      )}
      onMouseEnter={onHover}
      onMouseLeave={onUnhover}
    >
      <CardContent>
        {href ? (
          <NavigationLink href={href} className="z-10 absolute inset-0">
            <span className="sr-only">View post</span>
          </NavigationLink>
        ) : onClick ? (
          <div
            className="z-10 absolute inset-0 cursor-pointer"
            onClick={onClick}
          ></div>
        ) : (
          <></>
        )}
        {isWaypoint || isEntry ? (
          // Journey context: original layout with type indicator
          <div className="relative flex flex-row justify-between items-center">
            <div className="w-auto flex flex-row justify-start items-center gap-3 z-20">
              <div className="flex flex-row items-center gap-2">
                <span className="text-xs text-gray-500 uppercase tracking-wide font-medium">
                  {isWaypoint ? 'WAYPOINT' : 'ENTRY'}
                </span>
              </div>
            </div>
          </div>
        ) : (
          // Global/Following/User context: new restructured layout
          <div className="relative flex flex-row justify-between items-start gap-4">
            {/* Left side: Title and date */}
            <div className="flex flex-col flex-1 min-w-0">
              {/* Title */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <h2 className={cn('font-medium', extended ? 'text-2xl' : 'text-base')}>
                  {title}
                </h2>
                <div className="flex items-center gap-2">
                  {sponsored && (
                    <Badge variant="default" className="text-xs h-4 px-1.5 py-0 text-[10px]">
                      Sponsored
                    </Badge>
                  )}
                  {!isPublic && (
                    <LockSimpleIcon 
                      size={extended ? 20 : 16} 
                      className="text-[#4676AC]" 
                      weight="bold"
                    />
                  )}
                </div>
              </div>
              
              {/* Location | Date */}
              <div className="flex items-center gap-1 mt-3">
                <MapPinIcon size={14} className="text-primary" />
                <div className="text-sm text-gray-600 font-normal">
                  {place ? (
                    <div className="flex flex-wrap items-center gap-1">
                      <span>{place}</span>
                      <span className="hidden sm:inline">|</span>
                      <span>{dateformat(date).format('MMM DD, YYYY')}</span>
                    </div>
                  ) : (
                    <span>{dateformat(date).format('MMM DD, YYYY')}</span>
                  )}
                </div>
              </div>
              
              {/* Journey */}
              {trip && (
                <div className="flex items-center gap-1 mt-3">
                  <PathIcon size={14} className="text-gray-500" />
                  <p className="text-sm text-primary font-medium">
                    {trip.title}
                  </p>
                </div>
              )}
            </div>

            {/* Right side: Edit button for owned entries, User info for others */}
            <div className="flex flex-col items-end z-20 flex-shrink-0">
              {actions.edit ? (
                // Show edit button for entries owned by current user
                <PostEditButton postId={id} />
              ) : userbar?.href ? (
                <Link
                  href={
                    userbar?.href
                      ? userbar?.href
                      : author?.username
                        ? ROUTER.USERS.DETAIL(author.username)
                        : '#'
                  }
                  className="flex flex-col items-end"
                >
                  <UserAvatar
                    src={author?.picture}
                    fallback={author?.username}
                    className={`w-8 h-8 border-2 border-solid ${author?.creator ? 'border-primary' : 'border-transparent'}`}
                  />
                  <span className="text-xs text-gray-600 mt-1 max-w-20 truncate">{author?.username}</span>
                </Link>
              ) : userbar?.click ? (
                <div className="cursor-pointer flex flex-col items-end" onClick={userbar?.click}>
                  <UserAvatar
                    src={author?.picture}
                    fallback={author?.username}
                    className={`w-8 h-8 border-2 border-solid ${author?.creator ? 'border-primary' : 'border-transparent'}`}
                  />
                  <span className="text-xs text-gray-600 mt-1 max-w-20 truncate">{author?.username}</span>
                </div>
              ) : author?.username ? (
                <Link
                  href={ROUTER.USERS.DETAIL(author.username)}
                  className="flex flex-col items-end"
                >
                  <UserAvatar
                    src={author?.picture}
                    fallback={author?.username}
                    className={`w-8 h-8 border-2 border-solid ${author?.creator ? 'border-primary' : 'border-transparent'}`}
                  />
                  <span className="text-xs text-gray-600 mt-1 max-w-20 truncate">{author?.username}</span>
                </Link>
              ) : null}
            </div>
          </div>
        )}
        <div className="relative flex flex-col overflow-hidden">
          {(isWaypoint || isEntry) && (
            // Journey context: show title/date in content area (original layout)
            <div className="mt-6">
              {/* Title */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <h2
                  className={cn('font-medium', extended ? 'text-2xl' : 'text-base')}
                >
                  {title}
                </h2>
                <div className="flex items-center gap-2">
                  {sponsored && (
                    <Badge variant="default" className="text-xs h-4 px-1.5 py-0 text-[10px]">
                      Sponsored
                    </Badge>
                  )}
                  {!isPublic && (
                    <LockSimpleIcon 
                      size={extended ? 20 : 16} 
                      className="text-[#4676AC]" 
                      weight="bold"
                    />
                  )}
                </div>
              </div>
              
              {/* Location | Date */}
              <div className="flex items-center gap-1 mt-3">
                <MapPinIcon size={14} className="text-primary" />
                <div className="text-sm text-gray-600 font-normal">
                  {place ? (
                    <div className="flex flex-wrap items-center gap-1">
                      <span>{place}</span>
                      <span className="hidden sm:inline">|</span>
                      <span>{dateformat(date).format('MMM DD, YYYY')}</span>
                    </div>
                  ) : (
                    <span>{dateformat(date).format('MMM DD, YYYY')}</span>
                  )}
                </div>
              </div>
              
              {/* Journey */}
              {trip && (
                <div className="flex items-center gap-1 mt-3">
                  <PathIcon size={14} className="text-gray-500" />
                  <p className="text-sm text-primary font-medium">
                    {trip.title}
                  </p>
                </div>
              )}
            </div>
          )}
          {waypoint && extended && (
            <div className="py-8">
              <MapStaticPreview
                href={
                  id
                    ? `${ROUTER.HOME}?lat=${waypoint.lat}&lon=${waypoint.lon}&zoom=${APP_CONFIG.MAP.DEFAULT.PREVIEW.ZOOM}`
                    : '#'
                }
                marker={waypoint}
                center={waypoint}
                zoom={8}
              />
            </div>
          )}
          <div className={extended ? 'mt-6' : 'mt-4'}>
            {extended ? (
              <NormalizedText text={content} />
            ) : (
              <p className="break-all text-sm text-gray-700">
                {content.length <= 80
                  ? content.split('\\n').join('')
                  : `${content.split('\\n').join('').slice(0, 80)}..`}
              </p>
            )}
          </div>
          {extended && media.length >= 1 && (
            <div className={`mt-6 flex flex-col gap-4`}>
              {media.map(({ thumbnail, caption }, key) => (
                <div
                  key={key}
                  className="w-full flex flex-col gap-2"
                >
                  <div className="w-full h-auto overflow-hidden rounded-xl">
                    <Image
                      src={thumbnail}
                      width={800}
                      height={600}
                      className="w-full h-auto"
                      alt={caption || ""}
                    />
                  </div>
                  {caption && (
                    <p className="text-sm text-gray-600 italic px-2">
                      {caption}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* "Logged on" note for extended view */}
        {extended && (
          <div className="mt-12 mb-12">
            <p className="text-sm text-gray-500">
              entry logged on {createdAt ? `${dateformat(createdAt).format('MMMM DD, YYYY [at] h:mm A')} ${new Date(createdAt).toLocaleDateString('en-US', { timeZoneName: 'short' }).split(', ')[1]}` : (date ? `${dateformat(date).format('MMMM DD, YYYY [at] h:mm A')} ${new Date(date).toLocaleDateString('en-US', { timeZoneName: 'short' }).split(', ')[1]}` : 'unknown date')} by{' '}
              {author?.username ? (
                <Link 
                  href={ROUTER.USERS.DETAIL(author.username)}
                  className="text-primary hover:underline"
                >
                  {author.username}
                </Link>
              ) : (
                'unknown'
              )}
            </p>
          </div>
        )}


        {(actions.like || actions.bookmark || actions.share) && (
          <PostButtons
            className="relative mt-6 z-20"
            postId={id}
            actions={actions}
            liked={liked}
            likesCount={likesCount}
            bookmarked={bookmarked}
            bookmarksCount={bookmarksCount}
          />
        )}
      </CardContent>
    </Card>
  );
};
