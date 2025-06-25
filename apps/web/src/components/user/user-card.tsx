import { Avatar, AvatarFallback, AvatarImage, Card } from '@repo/ui/components';
import { cn } from '@repo/ui/lib/utils';
import Link from 'next/link';

import { UserBar } from './user-bar';

type Props = {
  href?: string;
  username?: string;
  name?: string;
  picture?: string;
  followed?: boolean;
  creator?: boolean;
};

export const UserCard: React.FC<Props> = ({
  href,
  username = '',
  name = '',
  picture = '',
  followed = false,
  creator = false,
}) => {
  return (
    <Card
      className={cn(
        'relative w-full h-auto box-border p-4 flex flex-col shadow-none border border-solid border-gray-200',
        href ? 'hover:bg-accent/30' : '',
      )}
    >
      {href && <Link href={href} className="z-10 absolute inset-0"></Link>}
      <div className="flex flex-row justify-between items-center">
        <div className="flex flex-row justify-start items-center gap-3">
          <UserBar
            name={username}
            picture={picture}
            creator={creator}
            // text={`@${username}`}
          />
        </div>
      </div>
    </Card>
  );
};
