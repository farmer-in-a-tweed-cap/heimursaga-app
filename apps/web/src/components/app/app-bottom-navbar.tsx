'use client';

import { UserAvatar } from '../user';
import { UserRole } from '@repo/types';
import { BadgeDot } from '@repo/ui/components';
import {
  BookBookmark,
  Bookmarks,
  CompassRose,
  Feather,
  IconProps,
  UserIcon,
} from '@repo/ui/icons';
import { cn } from '@repo/ui/lib/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';

import { useSession } from '@/hooks';
import { ROUTER } from '@/router';
import { API_QUERY_KEYS, apiClient } from '@/lib/api';

type Props = {};

type NavLink = {
  href: string;
  icon: (props: IconProps) => JSX.Element;
  label?: string;
};

export const AppBottomNavbar: React.FC<Props> = () => {
  const { role, logged, username, creator, ...user } = useSession();
  const pathname = usePathname();

  // Get notification count for badge
  const { data: notificationData } = useQuery({
    queryKey: [API_QUERY_KEYS.USER.NOTIFICATIONS],
    queryFn: () => apiClient.getUserNotifications(),
    enabled: logged,
  });

  const unreadNotifications = Array.isArray(notificationData?.data) ? notificationData.data.filter((n: any) => !n.read).length : 0;

  const createAvatarIcon = () => (
    <div className="relative flex items-center justify-center w-[56px] h-[56px]">
      <UserAvatar 
        src={user?.picture} 
        className={cn(
          "w-[48px] h-[48px]",
          creator ? 'border-2 border-primary' : ''
        )} 
      />
      {(unreadNotifications || 0) > 0 && (
        <BadgeDot className="absolute -top-1 -right-1" />
      )}
    </div>
  );

  const createLogoIcon = () => (
    <div className="relative flex items-center justify-center w-[56px] h-[56px]">
      <div className="w-[48px] h-[48px] rounded-full border-2 border-primary flex items-center justify-center">
        <Image
          src="/logo-sm-dark.svg"
          width={36}
          height={36}
          alt=""
          priority={false}
          className="drop-shadow-none"
          style={{ filter: 'none', boxShadow: 'none' }}
        />
      </div>
    </div>
  );

  const LINKS: { [role: string]: NavLink[] } = {
    guest: [
      {
        href: ROUTER.HOME,
        icon: createLogoIcon,
        label: '',
      },
      {
        href: ROUTER.LOGIN,
        icon: (props) => <UserIcon {...props} />,
        label: 'Log in',
      },
    ],
    user: [
      {
        href: ROUTER.HOME,
        icon: createLogoIcon,
        label: '',
      },
      {
        href: username ? ROUTER.USERS.DETAIL(username) : '#',
        icon: (props) => <BookBookmark {...props} />,
        label: 'Journal',
      },
      {
        href: ROUTER.ENTRIES.CREATE,
        icon: (props) => <Feather {...props} />,
        label: 'Log Entry',
      },
      {
        href: ROUTER.BOOKMARKS.HOME,
        icon: (props) => <Bookmarks {...props} />,
        label: 'Bookmarks',
      },
      {
        href: username ? ROUTER.YOU : '#',
        icon: createAvatarIcon,
        label: '',
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
    // For root path, check exact match
    if (path === '/') {
      return pathname === path;
    }
    // For explore page, only match exact path (not subpages like /explore/post/123)
    if (path === '/explore') {
      return pathname === '/explore';
    }
    // For other paths, check if pathname starts with path followed by '/' or is exact match
    return pathname === path || pathname.startsWith(path + '/');
  };

  return (
    <div className="w-full h-[70px] bg-background border-t border-solid border-accent flex flex-row items-center">
      {/* Left item - Logo/Explore */}
      <div className="flex-shrink-0 px-3">
        <Link
          href={links[0].href}
          className={cn(
            'flex flex-col items-center justify-center gap-1 text-gray-500',
            isActiveLink(links[0].href) ? 'text-black' : 'text-gray-500',
          )}
        >
          <div className="w-[56px] h-[56px] flex items-center justify-center">
            {typeof links[0].icon === 'function' && links[0].icon.length === 0 ? links[0].icon({} as any) : links[0].icon({ size: 20, weight: "regular" as any })}
          </div>
          {links[0].label && <span className="text-xs font-medium whitespace-nowrap">{links[0].label}</span>}
        </Link>
      </div>

      {/* Center items - Middle menu items */}
      <div className="flex-1 flex flex-row items-center justify-center px-4">
        <div className="flex flex-row items-center justify-between w-full max-w-[180px]">
          {links.slice(1, -1).map(({ label, href, icon: Icon }, index) => (
              <Link
                key={index + 1}
                href={href}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 text-gray-500',
                  isActiveLink(href) ? 'text-black' : 'text-gray-500',
                )}
              >
                <div className="w-[28px] h-[28px] flex items-center justify-center">
                  <Icon size={24} weight="regular" />
                </div>
                {label && <span className="text-xs font-normal whitespace-nowrap">{label}</span>}
              </Link>
          ))}
        </div>
      </div>

      {/* Right item - Avatar */}
      <div className="flex-shrink-0 px-3">
        <Link
          href={links[links.length - 1].href}
          className={cn(
            'flex flex-col items-center justify-center gap-1 text-gray-500',
            isActiveLink(links[links.length - 1].href) ? 'text-black' : 'text-gray-500',
          )}
        >
          <div className="w-[56px] h-[56px] flex items-center justify-center">
            {typeof links[links.length - 1].icon === 'function' && links[links.length - 1].icon.length === 0 ? links[links.length - 1].icon({} as any) : links[links.length - 1].icon({ size: 20, weight: "regular" as any })}
          </div>
          {links[links.length - 1].label && <span className="text-xs font-medium whitespace-nowrap">{links[links.length - 1].label}</span>}
        </Link>
      </div>
    </div>
  );
};
