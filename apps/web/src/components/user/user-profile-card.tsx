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
      <CardContent className="pt-2 pb-4">
        <div className="absolute left-2 top-2">
          <BackButton href={backButton?.href} onClick={backButton?.click} />
        </div>
        <div className="flex flex-col items-center justify-center gap-0">
          <UserAvatar
            className="w-[40px] h-[40px]"
            src={picture}
            loading={loading}
            fallback={name}
          />

          <div className="mt-1 flex flex-col items-center gap-0">
            {loading ? (
              <div className="h-6 flex items-center justify-center">
                <Skeleton className="w-[100px] h-4" />
              </div>
            ) : (
              <span className="h-6 font-medium text-base">{name}</span>
            )}
            {loading ? (
              <Skeleton className="w-[80px] h-2" />
            ) : (
              <span className="text-xs font-medium text-gray-600">
                @{username}
              </span>
            )}
          </div>
          <div className="mt-4">
            <Button variant="secondary" size="sm" asChild>
              <Link
                href={username ? ROUTER.USERS.DETAIL(username) : '#'}
                className="flex flex-row items-center justify-center gap-1"
              >
                Profile
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
