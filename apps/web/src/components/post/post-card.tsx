'use client';

import { Card, CardContent, NormalizedText } from '@repo/ui/components';
import { cn } from '@repo/ui/lib/utils';
import Image from 'next/image';
import Link from 'next/link';

import { dateformat } from '@/lib/date-format';

import { MapStaticPreview, PostButtons, UserBar } from '@/components';
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
  media?: { thumbnail: string }[];
  id?: string;
  title?: string;
  content?: string;
  place?: string;
  date?: Date;
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
  extended?: boolean;
  userbar?: {
    href?: string;
    click?: () => void;
  };
  selected?: boolean;
  onClick?: () => void;
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
  place,
  waypoint,
  liked = false,
  likesCount = 0,
  bookmarked = false,
  bookmarksCount = 0,
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
            {userbar?.href ? (
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
            )}
          </div>
          {session.logged && (
            <div className="z-20 flex flex-row items-center gap-2">
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
            </div>
          )}
        </div>
        <div className="relative flex flex-col overflow-hidden">
          <div className="mt-6">
            <h2
              className={cn('font-medium', extended ? 'text-2xl' : 'text-base')}
            >
              {title}
            </h2>
          </div>
          {waypoint && (
            <div className="mt-6">
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
          <div className={extended ? 'mt-6' : 'mt-2'}>
            {extended ? (
              <NormalizedText text={content} />
            ) : (
              <p className="break-all">
                {content.length <= 80
                  ? content.split('\\n').join('')
                  : `${content.split('\\n').join('').slice(0, 80)}..`}
              </p>
            )}
          </div>
          {media.length >= 1 && (
            <div className="mt-6 grid grid-cols-2 gap-2">
              {media.map(({ thumbnail }, key) => (
                <div
                  key={key}
                  className="w-full h-auto overflow-hidden rounded-xl"
                >
                  <Image
                    src={thumbnail}
                    width={400}
                    height={300}
                    className="w-full h-auto"
                    alt=""
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {(actions.like || actions.share) && (
          <div className="mt-6">
            <PostButtons
              postId={id}
              actions={{
                ...actions,
                bookmark: false,
              }}
              liked={liked}
              likesCount={likesCount}
              bookmarked={bookmarked}
              bookmarksCount={bookmarksCount}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};
