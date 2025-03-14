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

type Props = {
  date?: string;
  content?: string;
  thumbnail?: string;
  author?: { picture?: string; username?: string; firstName?: string };
};

export const UserPostCard: React.FC<Props> = ({
  author = {
    firstName: '',
    picture: '',
    username: '',
  },
  date,
  content,
  thumbnail,
}) => (
  <Card className="w-full min-h-[140px] box-border p-6 flex flex-col">
    <div className="flex flex-row justify-between items-center">
      <div className="flex flex-row justify-start items-center gap-3">
        <Link href="#">
          <Avatar className="w-[40px] h-[40px]">
            <AvatarImage src={author?.picture} />
            <AvatarFallback>{author?.firstName?.slice(0, 1)}</AvatarFallback>
          </Avatar>
        </Link>
        <div className="flex flex-col items-start justify-center">
          <Link href="#">
            <span className="text-sm font-semibold">{author?.firstName}</span>
          </Link>
          <span className="text-xs text-gray-500">{date}</span>
        </div>
      </div>
    </div>
    <div className="mt-6 w-full aspect-5/2 overflow-hidden rounded-xl">
      <Image
        src={thumbnail || ''}
        width={400}
        height={300}
        className="w-full h-auto"
        alt=""
      />
    </div>
    <div className="mt-4">
      <p className="text-base font-normal text-neutral-700">{content}</p>
    </div>
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
