import { Button, Logo } from '@repo/ui/components';
import { cn } from '@repo/ui/lib/utils';
import Link from 'next/link';

import { APP_HEADER_HEIGHT } from '@/constants';
import { ROUTER } from '@/router';

export const AppHeader = () => {
  return (
    <div
      className={cn(
        'w-full bg-white flex flex-row justify-center items-center',
        `h-[${APP_HEADER_HEIGHT}px]`,
      )}
    >
      <div className="app-container max-w-full px-6 flex flex-row items-center justify-between">
        <Link href={ROUTER.EXPLORE}>
          <Logo />
        </Link>
        <Link href={ROUTER.LOGIN}>
          <Button>Log in</Button>
        </Link>
      </div>
    </div>
  );
};
