import { Avatar, AvatarFallback, AvatarImage, Card } from '@repo/ui/components';
import Image from 'next/image';
import Link from 'next/link';

import { dateformat } from '@/lib/date-format';

import { MapStaticPreview } from '@/components';
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
}) => {
  return (
    <Card className="relative w-full h-auto box-border p-6 flex flex-col shadow-none border border-solid border-gray-200">
      {href && <Link href={href} className="z-10 absolute inset-0"></Link>}
      <div className="flex flex-row justify-between items-center">
        <Link
          href={
            author?.username ? ROUTER.MEMBERS.MEMBER(author?.username) : '#'
          }
          className="z-20"
        >
          <div className="flex flex-row justify-start items-center gap-3">
            <Avatar className="w-[40px] h-[40px]">
              <AvatarImage src={author?.picture} />
              <AvatarFallback>{author?.name?.slice(0, 1)}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col items-start justify-center">
              <span className="text-sm font-semibold">{author?.name}</span>
              <span className="text-xs text-gray-500">
                {dateformat(date).format('MMM DD')}
              </span>
            </div>
          </div>
        </Link>
        <div className="z-20 flex flex-row items-center gap-2">
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
        <p className="text-base font-normal text-neutral-700">
          {content ? (content.length < 140 ? content : `${content}..`) : ''}
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
