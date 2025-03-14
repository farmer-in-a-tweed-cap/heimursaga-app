import { MapPreview } from '../map';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Card,
} from '@repo/ui/components';
import { Bookmark, HeartIcon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { dateformat } from '@/lib/date-format';

import { ROUTER } from '@/router';

type Props = {
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
};

export const PostCard: React.FC<Props> = ({
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
}) => (
  <Card className="w-full h-auto box-border p-6 flex flex-col">
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

    <Link href={id ? ROUTER.POSTS.DETAIL(id) : '#'}>
      <div className="mt-6 flex flex-col gap-2">
        <span className="text-base font-medium">{title}</span>
        <p className="text-base font-normal text-neutral-700">
          {content ? (content.length < 140 ? content : `${content}..`) : ''}
        </p>
      </div>
    </Link>

    {coordinates && (
      <div className="mt-6">
        <MapPreview
          href={id ? ROUTER.EXPLORE.POST(id) : '#'}
          coordinates={{ lat: coordinates.lat, lon: coordinates.lon }}
        />
      </div>
    )}
    <div className="mt-6 flex flex-row gap-1">
      <Button variant="ghost" size="sm">
        <HeartIcon
          size={20}
          //  className="text-black fill-black"
        />
        <span className="hover:underline underline-offset-4">Like</span>
      </Button>
      <Button variant="ghost" size="sm">
        <Bookmark size={20} />
        <span className="hover:underline underline-offset-4">Bookmark</span>
      </Button>
    </div>
  </Card>
);
