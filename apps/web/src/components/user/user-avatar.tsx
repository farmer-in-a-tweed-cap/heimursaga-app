import { Avatar, AvatarFallback, AvatarImage } from '@repo/ui/components';

type Props = {
  src?: string;
  fallback?: string;
};

export const UserAvatar: React.FC<Props> = ({ src, fallback = '*' }) => (
  <Avatar className="w-[40px] h-[40px]">
    <AvatarImage src={src} alt={fallback} />{' '}
    <AvatarFallback>{fallback.slice(0, 1)}</AvatarFallback>
  </Avatar>
);
