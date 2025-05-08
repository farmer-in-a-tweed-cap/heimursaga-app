import { Avatar, AvatarFallback, AvatarImage, Card } from '@repo/ui/components';
import { cn } from '@repo/ui/lib/utils';
import Link from 'next/link';

type Props = {
  href?: string;
  username?: string;
  name?: string;
  picture?: string;
  followed?: boolean;
};

export const UserCard: React.FC<Props> = ({
  href,
  username = '',
  name = '',
  picture = '',
  followed = false,
}) => {
  return (
    <Card
      className={cn(
        'relative w-full h-auto box-border p-4 flex flex-col shadow-none border border-solid border-gray-200',
        href ? 'hover:bg-white/80' : '',
      )}
    >
      {href && <Link href={href} className="z-10 absolute inset-0"></Link>}
      <div className="flex flex-row justify-between items-center">
        <div className="flex flex-row justify-start items-center gap-3">
          <Avatar className="w-[40px] h-[40px]">
            <AvatarImage src={picture} />
            <AvatarFallback>{name?.slice(0, 1)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col items-start justify-center">
            <span className="text-sm font-semibold">{name}</span>
            <span className="text-xs text-gray-500">@{username}</span>
          </div>
        </div>
      </div>
    </Card>
  );
};
