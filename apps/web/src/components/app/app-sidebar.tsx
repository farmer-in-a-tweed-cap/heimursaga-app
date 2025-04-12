'use client';

import { Button } from '@repo/ui/components';
import { cn } from '@repo/ui/lib/utils';
import {
  BellIcon,
  BookmarkIcon,
  CogIcon,
  CompassIcon,
  HomeIcon,
  LucideProps,
  PenIcon,
  PlusCircleIcon,
  StarIcon,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ForwardRefExoticComponent, RefAttributes } from 'react';

import { CreatePostButton, UserNavbar } from '@/components';
import { useSession } from '@/hooks';
import { ROUTER } from '@/router';

type SidebarLink = {
  href: string;
  label: string;
  icon: ForwardRefExoticComponent<
    Omit<LucideProps, 'ref'> & RefAttributes<SVGSVGElement>
  >;
};

const SIDEBAR_LINKS: {
  guest: SidebarLink[];
  user: SidebarLink[];
} = {
  guest: [
    { href: ROUTER.HOME, label: 'Home', icon: HomeIcon },
    { href: ROUTER.EXPLORE.HOME, label: 'Explore', icon: CompassIcon },
  ],
  user: [
    { href: ROUTER.HOME, label: 'Home', icon: HomeIcon },
    { href: ROUTER.EXPLORE.HOME, label: 'Explore', icon: CompassIcon },
    { href: ROUTER.JOURNAL, label: 'Journal', icon: PenIcon },
    { href: ROUTER.BOOKMARKS.HOME, label: 'Bookmarks', icon: BookmarkIcon },
    { href: ROUTER.NOTIFICATIONS, label: 'Notifications', icon: BellIcon },
    { href: ROUTER.PREMIUM, label: 'Premium', icon: StarIcon },
    { href: ROUTER.USER.SETTINGS.HOME, label: 'Settings', icon: CogIcon },
  ],
};

export const AppSidebar = () => {
  const pathname = usePathname();
  const session = useSession();

  const links = session ? SIDEBAR_LINKS.user : SIDEBAR_LINKS.guest;

  const isActiveLink = (path: string): boolean => {
    path = path.startsWith('/') ? path : `/${path}`;
    const active = path === '/' ? pathname === path : pathname.startsWith(path);
    return active;
  };

  return (
    <div className="hidden sm:max-w-[65px] md:flex lg:max-w-[240px] relative w-full">
      <div className="sm:max-w-[65px] md:flex lg:max-w-[240px] w-full h-screen fixed top-0 bottom-0 left-0 bg-white flex-col">
        <div className="bg-dark text-dark-foreground flex flex-col items-center w-full h-full py-4">
          <div className="w-full box-border lg:px-4 flex flex-row items-center  justify-center lg:justify-start">
            <Link href={ROUTER.HOME}>
              <div className="w-[45px] h-auto">
                <Image src="/logo-sm-light.svg" width={80} height={80} alt="" />
              </div>
            </Link>
          </div>
          <div className="mt-10 w-full h-full flex flex-col justify-between items-center box-border lg:px-3">
            <div className="lg:w-full flex flex-col gap-2">
              {links.map(({ href, label, icon: Icon }, key) => (
                <Link
                  key={key}
                  href={href}
                  className={cn(
                    'w-full app-sidebar-link',
                    isActiveLink(href) ? 'app-sidebar-link-active' : '',
                  )}
                >
                  <Icon size={18} className="app-sidebar-link-icon" />
                  <span className="hidden lg:flex text-sm leading-none">
                    {label}
                  </span>
                </Link>
              ))}
            </div>

            {session ? (
              <div className="w-full flex flex-col gap-8 px-3">
                <CreatePostButton
                  variant="secondary"
                  classNames={{ label: 'hidden lg:flex', button: 'min-w-auto' }}
                >
                  Create
                </CreatePostButton>
                <UserNavbar />
              </div>
            ) : (
              <div className="w-full flex flex-col gap-8">
                <Button variant="secondary" asChild>
                  <Link href={ROUTER.LOGIN}>Log in</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
