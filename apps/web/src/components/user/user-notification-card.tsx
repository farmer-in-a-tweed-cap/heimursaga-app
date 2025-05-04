import { UserNotificationContext } from '@repo/types';
import { Avatar, AvatarFallback, AvatarImage, Card } from '@repo/ui/components';
import Link from 'next/link';

import { dateformat } from '@/lib/date-format';

import { ROUTER } from '@/router';

type Props = {
  context: string;
  mentionUser: { username: string; name: string; picture: string };
  postId?: string;
  date: Date;
};

export const UserNotificationCard: React.FC<Props> = ({
  context,
  mentionUser,
  date,
  postId,
}) => {
  let text: string = '';
  let link: string | undefined = undefined;

  switch (context) {
    case UserNotificationContext.LIKE:
      text = `${mentionUser.name} liked your post`;
      if (postId) {
        link = ROUTER.POSTS.DETAIL(postId);
      }
      break;
    case UserNotificationContext.FOLLOW:
      text = `${mentionUser.name} followed you`;
      if (mentionUser?.username) {
        link = ROUTER.MEMBERS.MEMBER(mentionUser?.username);
      }
      break;
  }

  return (
    <Card className="p-4 box-border cursor-pointer hover:bg-gray-50">
      {link && <Link href={link} className="z-10 absolute inset-0"></Link>}
      <div className="flex flex-row gap-4 items-center">
        <Link
          href={ROUTER.MEMBERS.MEMBER(mentionUser?.username)}
          className="z-20"
        >
          <Avatar className="w-[40px] h-[40px]">
            <AvatarImage src={mentionUser?.picture} />
            <AvatarFallback>{mentionUser?.name?.slice(0, 1)}</AvatarFallback>
          </Avatar>
        </Link>
        <div className="flex flex-col">
          <span className="font-normal text-base">{text}</span>
          <span className="text-xs font-normal text-gray-700">
            {dateformat(date).isToday()
              ? dateformat(date).format('HH:mm')
              : dateformat(date).format('MMM DD')}
          </span>
        </div>
      </div>
    </Card>
  );
};
