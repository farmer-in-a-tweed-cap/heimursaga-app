'use client';

import { Card, NormalizedText } from '@repo/ui/components';
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
  author?: { picture?: string; username?: string; name?: string };
  coordinates?: {
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
  onClick?: () => void;
};

export const PostCard: React.FC<PostCardProps> = ({
  id,
  href,
  classNames,
  title = '',
  content = '',
  thumbnail = '',
  author = {
    name: '',
    picture: '',
    username: '',
  },
  date,
  coordinates,
  liked = false,
  likesCount = 0,
  bookmarked = false,
  bookmarksCount = 0,
  actions = {
    like: true,
    bookmark: true,
    edit: false,
  },
  extended = false,
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
        'relative w-full h-auto box-border p-5 flex flex-col shadow-none border border-solid border-accent',
        classNames?.card,
      )}
    >
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
      <div className="flex flex-row justify-between items-center">
        <Link
          href={
            author?.username ? ROUTER.MEMBERS.MEMBER(author?.username) : '#'
          }
          className="z-20"
        >
          <div className="flex flex-row justify-start items-center gap-3">
            <Link
              href={
                author?.username ? ROUTER.MEMBERS.MEMBER(author.username) : '#'
              }
            >
              <UserBar
                name={author?.name}
                picture={author?.picture}
                text={dateformat(date).format('MMM DD')}
              />
            </Link>
          </div>
        </Link>
        <div className="z-20 absolute top-3 right-3 flex flex-row items-center gap-2">
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
          <NormalizedText
            text={
              extended
                ? content
                : content.length <= 120
                  ? content
                  : `${content.slice(0, 120)}..`
            }
          />
        </div>
      </div>
      {coordinates && (
        <div className="mt-6">
          <MapStaticPreview
            href={
              id
                ? `${ROUTER.EXPLORE.HOME}?lat=${coordinates.lat}&lon=${coordinates.lon}&alt=12`
                : '#'
            }
            lat={coordinates.lat}
            lon={coordinates.lon}
            markers={[
              {
                lat: coordinates.lat,
                lon: coordinates.lon,
              },
            ]}
          />
        </div>
      )}
      {actions?.like && (
        <div className="z-50 mt-6 w-auto flex flex-row gap-1">
          <PostLikeButton postId={id} likesCount={likesCount} liked={liked} />
        </div>
      )}
    </Card>
  );
};
