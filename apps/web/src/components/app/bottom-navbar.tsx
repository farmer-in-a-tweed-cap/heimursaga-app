'use client';

import { UserAvatar } from '../user';
import { UserRole } from '@repo/types';
import {
  BookmarkSimpleIcon,
  HouseIcon,
  IconProps,
  PencilIcon,
  PlusIcon,
  UserIcon,
} from '@repo/ui/icons';
import { cn } from '@repo/ui/lib/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useSession } from '@/hooks';
import { ROUTER } from '@/router';

type Props = {};

type NavLink = {
  href: string;
  icon: (props: IconProps) => JSX.Element;
  label?: string;
};

export const BottomNavbar: React.FC<Props> = () => {
  const { role, logged, username, ...user } = useSession();
  const pathname = usePathname();

  const LINKS: { [role: string]: NavLink[] } = {
    guest: [
      {
        href: ROUTER.HOME,
        icon: (props) => <HouseIcon {...props} />,
        label: 'Home',
      },
      {
        href: username ? ROUTER.USERS.DETAIL(username) : '#',
        icon: () => (
          <UserAvatar src={user?.picture} className="w-[24px] h-[24px]" />
        ),
        label: 'Log in',
      },
    ],
    user: [
      {
        href: ROUTER.HOME,
        icon: (props) => <HouseIcon {...props} />,
        label: 'Home',
      },
      {
        href: username ? ROUTER.USERS.DETAIL(username) : '#',
        icon: (props) => <PencilIcon {...props} />,
        label: 'Journal',
      },
      {
        href: ROUTER.POSTS.CREATE,
        icon: (props) => <PlusIcon {...props} />,
        label: 'Create',
      },
      {
        href: ROUTER.BOOKMARKS.HOME,
        icon: (props) => <BookmarkSimpleIcon {...props} />,
        label: 'Saved',
      },
      {
        href: username ? ROUTER.USERS.DETAIL(username) : '#',
        icon: () => (
          <UserAvatar src={user?.picture} className="w-[24px] h-[24px]" />
        ),
        label: 'You',
      },
    ],
  };

  let links: NavLink[] = [];

  switch (role) {
    case UserRole.CREATOR:
      links = LINKS['user'];
      break;
    case UserRole.USER:
      links = LINKS['user'];
      break;
    default:
      links = LINKS['guest'];
      break;
  }

  const isActiveLink = (path: string): boolean => {
    path = path.startsWith('/') ? path : `/${path}`;
    const active = path === '/' ? pathname === path : pathname.startsWith(path);
    return active;
  };

  return (
    <div className="w-full h-[70px] bg-background border-t border-solid border-accent flex flex-row justify-center gap-10 sm:justify-center sm:gap-14 box-border px-6 items-center">
      {links.map(({ label, href, icon: Icon }, key) => (
        <Link
          key={key}
          href={href}
          className={cn(
            'flex flex-col items-center justify-center gap-1 text-gray-500',
            isActiveLink(href) ? 'text-black' : 'text-gray-500',
          )}
        >
          <div className="w-[24px] h-[24px] flex items-center justify-center">
            <Icon size={20} weight="bold" />
          </div>

          {label && <span className="text-xs font-medium ">{label}</span>}
        </Link>
      ))}
    </div>
  );
};
