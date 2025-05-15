import { Avatar, AvatarFallback, AvatarImage } from '@repo/ui/components';
import { cn } from '@repo/ui/lib/utils';
import { UserIcon } from 'lucide-react';

type Props = {
  className?: string;
  src?: string;
  fallback?: string;
};

export const UserAvatar: React.FC<Props> = ({
  src,
  fallback = '*',
  className,
}) => (
  <Avatar
    className={cn(
      'w-[36px] h-[36px] border-2 border-solid border-transparent',
      className,
    )}
  >
    <AvatarImage src={src} alt={fallback} />
    <AvatarFallback>{fallback.slice(0, 1)}</AvatarFallback>
  </Avatar>
);

export const UserGuestAvatar = () => (
  <Avatar className="w-[36px] h-[36px] bg-white hover:bg-accent rounded-full text-black flex items-center justify-center">
    <UserIcon size={18} />
  </Avatar>
);
