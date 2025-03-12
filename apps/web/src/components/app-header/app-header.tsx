import { Button, Logo } from '@repo/ui/components';
import { cn } from '@repo/ui/lib/utils';
import Link from 'next/link';

import { APP_HEADER_HEIGHT } from '@/constants';
import { ROUTER } from '@/router';

const data = {
  menu: [
    { href: ROUTER.EXPLORE, label: 'Explore' },
    { href: ROUTER.HOME, label: 'Upgrade' },
  ],
};

export const AppHeader = () => {
  return (
    <div
      className={cn(
        'w-full bg-white flex flex-row justify-center items-center',
        `h-[${APP_HEADER_HEIGHT}px]`,
      )}
    >
      <div className="app-container max-w-full px-6 flex flex-row items-center justify-between">
        <Link href={ROUTER.HOME}>
          <Logo />
        </Link>
        <div className="flex flex-row items-center gap-14">
          <nav>
            <div className="flex flex-row items-center justify-start gap-6">
              {data.menu.map(({ href, label }, key) => (
                <Link
                  key={key}
                  href={href}
                  className="capitalize text-sm font-medium"
                >
                  {label}
                </Link>
              ))}
            </div>
          </nav>
          <Link href={ROUTER.LOGIN}>
            <Button>Log in</Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
