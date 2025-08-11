'use client';

import { UserAvatar } from '../user';
import { UserRole } from '@repo/types';
import { BadgeDot } from '@repo/ui/components';
import {
  BookBookmark,
  Bookmarks,
  GlobeX,
  Feather,
  IconProps,
  UserIcon,
} from '@repo/ui/icons';
import { cn } from '@repo/ui/lib/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';

import { useSession, useApp } from '@/hooks';
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
  const { context, setContext } = useApp();
  const pathname = usePathname();
  
  const isDark = context.app.navbarTheme === 'dark';

  // Get notification count for badge
  const badgeQuery = useQuery({
    queryKey: [API_QUERY_KEYS.USER.BADGE_COUNT],
    queryFn: () => apiClient.getBadgeCount().then(({ data }) => data),
    enabled: logged,
  });

  const unreadNotifications = badgeQuery.isFetched ? (badgeQuery.data?.notifications || 0) : 0;

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
        <BadgeDot className="absolute top-1 right-1 bg-primary w-3.5 h-3.5" />
      )}
    </div>
  );

  const createLogoIcon = () => (
    <div className="relative flex items-center justify-center w-[56px] h-[56px]">
      <div 
        className="w-[48px] h-[48px] rounded-full flex items-center justify-center"
        style={{ 
          border: '2px solid rgb(170, 108, 70)',
          borderWidth: '2px !important',
          borderStyle: 'solid !important',
          borderColor: 'rgb(170, 108, 70) !important'
        }}
      >
        <Image
          src="/logo-sm-dark.svg"
          width={36}
          height={36}
          alt=""
          priority={false}
          style={{ 
            filter: 'drop-shadow(none) !important', 
            boxShadow: 'none !important',
            WebkitFilter: 'drop-shadow(none) !important'
          }}
        />
      </div>
    </div>
  );

  const createLogEntryButton = () => (
    <div className="relative flex items-center justify-center w-[56px] h-[56px]">
      <div 
        className="w-[48px] h-[48px] rounded-full flex items-center justify-center bg-primary"
        style={{ 
          backgroundColor: 'rgb(170, 108, 70)',
        }}
      >
        <Feather size={24} weight="regular" className="text-white" />
      </div>
    </div>
  );

  const LINKS: { [role: string]: NavLink[] } = {
    guest: [
      {
        href: ROUTER.GUEST_MENU,
        icon: (props) => <UserIcon {...props} />,
        label: 'Menu',
      },
      {
        href: ROUTER.EXPLORE.RESET,
        icon: (props) => <GlobeX {...props} />,
        label: 'Explore',
      },
    ],
    user: [
      {
        href: username ? ROUTER.YOU : '#',
        icon: createAvatarIcon,
        label: '',
      },
      {
        href: ROUTER.EXPLORE.RESET,
        icon: (props) => <GlobeX {...props} />,
        label: 'Explore',
      },
      {
        href: username ? ROUTER.USERS.DETAIL(username) : '#',
        icon: (props) => <BookBookmark {...props} />,
        label: 'Journal',
      },
      {
        href: ROUTER.BOOKMARKS.HOME,
        icon: (props) => <Bookmarks {...props} />,
        label: 'Bookmarks',
      },
      {
        href: ROUTER.ENTRIES.CREATE,
        icon: createLogEntryButton,
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
    
    // Special handling for explore routes with query params
    if (path.startsWith('/explore?')) {
      return pathname === '/explore';
    }
    
    // Special handling for explore base path
    if (path === '/explore') {
      return pathname === '/explore';
    }
    
    // For root path, exact match only
    if (path === '/') {
      return pathname === '/';
    }
    
    // For all other paths (including user profiles), exact match or subpaths
    return pathname === path || pathname.startsWith(path + '/');
  };

  const toggleTheme = () => {
    if (setContext) {
      setContext({
        app: {
          ...context.app,
          navbarTheme: isDark ? 'light' : 'dark'
        }
      });
    }
  };

  return (
    <div className={cn(
      "w-full h-[70px] border-t border-solid flex flex-row items-center",
      isDark ? "bg-dark border-gray-700" : "bg-background border-accent"
    )}>
      {/* Left item - Avatar/Explore/Login */}
      <div className={cn(
        "flex-shrink-0", 
        // Extra padding for login button to prevent text cutoff
        links[0].label === 'Log in' ? "px-4" : "px-3"
      )}>
        <Link
          href={links[0].href}
          className={cn(
            'flex flex-col items-center justify-center',
            isDark 
              ? (isActiveLink(links[0].href) ? 'text-white' : 'text-gray-400')
              : (isActiveLink(links[0].href) ? 'text-black' : 'text-gray-500'),
            // Adjust spacing for login button to fit in navbar
            links[0].label ? 'gap-0' : 'gap-1'
          )}
        >
          <div className={cn(
            "flex items-center justify-center",
            // Smaller icon container for login button to make room for label
            links[0].label ? "w-[32px] h-[32px]" : "w-[56px] h-[56px]"
          )}>
            {typeof links[0].icon === 'function' && links[0].icon.length === 0 ? links[0].icon({} as any) : links[0].icon({ size: links[0].label ? 18 : 20, weight: "regular" as any })}
          </div>
          {links[0].label && <span className="text-[10px] font-medium whitespace-nowrap mt-1">{links[0].label}</span>}
        </Link>
      </div>

      {/* Center items - Middle menu items */}
      <div className="flex-1 flex flex-row items-center justify-center">
        <div className="flex flex-row justify-evenly w-full max-w-[200px]">
          {links.slice(1, -1).map(({ label, href, icon: Icon }, index) => (
            <div key={index + 1} className="w-[64px] flex justify-center">
              <Link
                href={href}
                className={cn(
                  'flex flex-col items-center justify-center gap-1',
                  isDark 
                    ? (isActiveLink(href) ? 'text-white' : 'text-gray-400')
                    : (isActiveLink(href) ? 'text-black' : 'text-gray-500'),
                )}
              >
                <div className="w-[28px] h-[28px] flex items-center justify-center">
                  <Icon size={24} weight="regular" />
                </div>
                {label && <span className="text-xs font-normal whitespace-nowrap">{label}</span>}
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* Right item - Avatar/Login */}
      <div className="flex-shrink-0 px-3">
        <Link
          href={links[links.length - 1].href}
          className={cn(
            'flex flex-col items-center justify-center',
            isDark 
              ? (isActiveLink(links[links.length - 1].href) ? 'text-white' : 'text-gray-400')
              : (isActiveLink(links[links.length - 1].href) ? 'text-black' : 'text-gray-500'),
            // Adjust spacing for login button to fit in navbar
            links[links.length - 1].label ? 'gap-0' : 'gap-1'
          )}
        >
          <div className={cn(
            "flex items-center justify-center",
            // Smaller icon container for login button to make room for label
            links[links.length - 1].label ? "w-[32px] h-[32px]" : "w-[56px] h-[56px]"
          )}>
            {typeof links[links.length - 1].icon === 'function' && links[links.length - 1].icon.length === 0 ? links[links.length - 1].icon({} as any) : links[links.length - 1].icon({ size: links[links.length - 1].label ? 18 : 20, weight: "regular" as any })}
          </div>
          {links[links.length - 1].label && <span className="text-[10px] font-medium whitespace-nowrap mt-1">{links[links.length - 1].label}</span>}
        </Link>
      </div>
    </div>
  );
};
