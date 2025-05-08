import { Avatar, AvatarFallback, AvatarImage, Card } from '@repo/ui/components';
import Image from 'next/image';
import Link from 'next/link';

import { dateformat } from '@/lib/date-format';

import { MapStaticPreview, UserBar } from '@/components';
import { ROUTER } from '@/router';

import { PostBookmarkButton } from './post-bookmark-button';
import { PostEditButton } from './post-edit-button';
import { PostLikeButton } from './post-like-button';

export type PostCardProps = {
  href?: string;
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
  date = new Date(),
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
  onClick,
}) => {
  return (
    <Card className="relative w-full h-auto box-border p-5 flex flex-col shadow-none border border-solid border-accent">
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
          {actions?.bookmark && (
            <PostBookmarkButton
              postId={id}
              bookmarked={bookmarked}
              bookmarksCount={bookmarksCount}
              disableCount={true}
            />
          )}
          {actions?.edit && <PostEditButton postId={id} />}
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
      <div className="mt-6 flex flex-col gap-2">
        <span className="text-base font-medium">{title}</span>
        <p className="text-sm font-normal text-neutral-700">
          {content.length <= 140 ? content : `${content.slice(0, 140)}..`}
        </p>
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
