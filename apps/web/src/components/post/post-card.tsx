'use client';

import { Card, CardContent, NormalizedText } from '@repo/ui/components';
import { cn } from '@repo/ui/lib/utils';
import Image from 'next/image';
import Link from 'next/link';

import { dateformat } from '@/lib/date-format';

import { MapStaticPreview, UserBar } from '@/components';
import { useSession } from '@/hooks';
import { ROUTER } from '@/router';

import { PostBookmarkButton } from './post-bookmark-button';
import { PostEditButton } from './post-edit-button';
import { PostLikeButton } from './post-like-button';

export type PostCardProps = {
  href?: string;
  classNames?: {
    card?: string;
  };
  id?: string;
  title?: string;
  content?: string;
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
  thumbnail = '',
  author = {
    name: '',
    picture: '',
    username: '',
  },
  date,
  waypoint,
  liked = false,
  likesCount = 0,
  bookmarked = false,
  bookmarksCount = 0,
  actions = {
    like: true,
    bookmark: true,
    edit: false,
  },
  userbar,
  extended = false,
  selected = false,
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
        <div className="relative flex flex-row justify-between items-center">
          <div className="w-full flex flex-row justify-start items-center gap-3 z-20">
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
        </div>
        <div className="relative flex flex-col overflow-hidden">
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

          {thumbnail && (
            <div className="mt-6 w-full aspect-5/2 overflow-hidden rounded-xl">
              <Image
                src={thumbnail || ''}
                width={400}
                height={300}
                className="w-full h-auto"
                alt=""
              />
            </div>
          )}
          <div className="mt-6 flex flex-col">
            <span
              className={cn('font-medium', extended ? 'text-2xl' : 'text-base')}
            >
              {title}
            </span>
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
          </div>
          {waypoint && (
            <div className="mt-6">
              <MapStaticPreview
                href={
                  id
                    ? `${ROUTER.EXPLORE.HOME}?lat=${waypoint.lat}&lon=${waypoint.lon}&alt=12`
                    : '#'
                }
                lat={waypoint.lat}
                lon={waypoint.lon}
                // className="aspect-auto w-full"
                zoom={8}
                markers={[
                  {
                    lat: waypoint.lat,
                    lon: waypoint.lon,
                  },
                ]}
              />
            </div>
          )}
        </div>

        {actions?.like && (
          <div className="z-20 mt-6 w-auto flex flex-row gap-1">
            <PostLikeButton postId={id} likesCount={likesCount} liked={liked} />
          </div>
        )}
      </CardContent>
    </Card>
  );
};
