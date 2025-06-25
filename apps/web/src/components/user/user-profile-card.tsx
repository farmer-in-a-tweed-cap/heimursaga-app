import { Button, Card, CardContent, Skeleton } from '@repo/ui/components';
import { UserIcon } from '@repo/ui/icons';
import Link from 'next/link';

import { BackButton, UserAvatar } from '@/components';
import { ROUTER } from '@/router';

type Props = {
  username?: string;
  name?: string;
  picture?: string;
  loading?: boolean;
  backButton?: {
    href?: string;
    click?: () => void;
  };
};

export const UserProfileCard: React.FC<Props> = ({
  username = '',
  name = '',
  picture = '',
  loading = false,
  backButton,
}) => {
  return (
    <Card>
      <CardContent className="p-4 flex flex-row items-center justify-between">
        <div className="flex flex-row gap-2">
          <div className="">
            <BackButton href={backButton?.href} onClick={backButton?.click} />
          </div>
          <div className="flex flex-row items-center justify-start gap-2">
            <UserAvatar
              className="w-[40px] h-[40px]"
              src={picture}
              loading={loading}
              fallback={name}
            />
            <div className="flex flex-col items-start justify-start gap-0">
              {loading ? (
                <div className="h-6 flex items-center justify-center">
                  <Skeleton className="w-[100px] h-4" />
                </div>
              ) : (
                <span className="h-6 font-medium text-base">{username}</span>
              )}
              {loading ? (
                <Skeleton className="w-[80px] h-2" />
              ) : (
                <span className="text-xs font-medium text-gray-600">
                  @{username}
                </span>
              )}
            </div>
          </div>
        </div>
        <Button variant="secondary" size="sm" asChild>
          <Link
            href={username ? ROUTER.USERS.DETAIL(username) : '#'}
            className="flex flex-row items-center justify-center gap-1"
          >
            Profile
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
};
