import { MapPreview } from '../map';
import { Avatar, AvatarFallback, AvatarImage, Card } from '@repo/ui/components';
import Image from 'next/image';
import Link from 'next/link';

import { dateformat } from '@/lib/date-format';

import { ROUTER } from '@/router';

import { PostBookmarkButton } from './post-bookmark-button';
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
  };
  liked?: boolean;
  likesCount?: number;
};

export const PostCard: React.FC<PostCardProps> = ({
  id,
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
  actions = {
    like: true,
    bookmark: true,
  },
}) => {
  const postActions = [actions?.like, actions?.bookmark].some((key) => !!key);

  return (
    <Card className="relative w-full h-auto box-border p-6 flex flex-col">
      <div className="flex flex-row justify-between items-center">
        <div className="flex flex-row justify-start items-center gap-3">
          <Link
            href={
              author?.username ? ROUTER.MEMBERS.MEMBER(author?.username) : '#'
            }
          >
            <Avatar className="w-[40px] h-[40px]">
              <AvatarImage src={author?.picture} />
              <AvatarFallback>{author?.name?.slice(0, 1)}</AvatarFallback>
            </Avatar>
          </Link>
          <div className="flex flex-col items-start justify-center">
            <Link
              href={
                author?.username ? ROUTER.MEMBERS.MEMBER(author?.username) : '#'
              }
            >
              <span className="text-sm font-semibold">{author?.name}</span>
            </Link>
            <span className="text-xs text-gray-500">
              {dateformat(date).format('MMM DD')}
            </span>
          </div>
        </div>
        <PostBookmarkButton postId={id} bookmarked={false} />
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

      {/* <Link href={id ? ROUTER.POSTS.DETAIL(id) : '#'} > */}
      <div className="mt-6 flex flex-col gap-2">
        <span className="text-base font-medium">{title}</span>
        <p className="text-base font-normal text-neutral-700">
          {content ? (content.length < 140 ? content : `${content}..`) : ''}
        </p>
      </div>
      {/* </Link> */}
      {coordinates && (
        <div className="mt-6">
          <MapPreview
            href={id ? ROUTER.EXPLORE.POST(id) : '#'}
            coordinates={{ lat: coordinates.lat, lon: coordinates.lon }}
          />
        </div>
      )}
      {postActions && (
        <div className="mt-6 flex flex-row gap-1">
          {actions?.like && (
            <PostLikeButton postId={id} likesCount={likesCount} liked={liked} />
          )}
        </div>
      )}
    </Card>
  );
};
