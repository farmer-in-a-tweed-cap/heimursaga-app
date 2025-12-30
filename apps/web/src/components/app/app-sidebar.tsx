'use client';

import React, { useState, useEffect, createContext, useContext } from 'react';
import { UserRole } from '@repo/types';
import {
  Button,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@repo/ui/components';
import {
  BookBookmark,
  Bookmarks,
  CaretLeft,
  CaretRight,
  ChartPieSliceIcon,
  ChatCircleTextIcon,
  GlobeX,
  HandCoinsIcon,
  HouseIcon,
  IconProps,
  PathIcon,
} from '@repo/ui/icons';
import { cn } from '@repo/ui/lib/utils';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { ForwardRefExoticComponent, RefAttributes } from 'react';

import { CreatePostButton, Logo, UserNavbar } from '@/components';
import { useSession, useNavigation } from '@/hooks';
import { ROUTER } from '@/router';
import { useQuery } from '@tanstack/react-query';
import { apiClient, API_QUERY_KEYS } from '@/lib/api';

type SidebarLink = {
  href: string;
  base: string;
  label: string;
  icon: ForwardRefExoticComponent<
    Omit<IconProps, 'ref'> & RefAttributes<SVGSVGElement>
  >;
};

// Create context for sidebar state
type SidebarContextType = {
  collapsed: boolean;
  toggle: () => void;
};

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within SidebarProvider');
  }
  return context;
};

type Props = {
  defaultCollapsed?: boolean;
  children?: React.ReactNode;
};

export const SidebarProvider: React.FC<Props> = ({ defaultCollapsed = true, children }) => {
  // Initialize state directly from localStorage to avoid layout shift on mount
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return defaultCollapsed;
    const saved = localStorage.getItem('sidebar-collapsed');
    return saved !== null ? saved === 'true' : defaultCollapsed;
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Save state to localStorage when it changes
  const toggle = () => {
    const newState = !collapsed;
    setCollapsed(newState);
    localStorage.setItem('sidebar-collapsed', String(newState));
  };

  return (
    <SidebarContext.Provider value={{ collapsed, toggle }}>
      {children}
    </SidebarContext.Provider>
  );
};

// Floating toggle button component
export const SidebarToggle: React.FC = () => {
  const { collapsed, toggle } = useSidebar();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggle();
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "hidden lg:flex fixed top-[18px] z-[85] items-center justify-center w-7 h-7 rounded opacity-30 hover:opacity-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-300",
        collapsed ? "left-[65px]" : "left-[240px]"
      )}
      aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
    >
      {collapsed ? (
        <CaretRight size={14} weight="regular" className="text-gray-500 dark:text-gray-400" />
      ) : (
        <CaretLeft size={14} weight="regular" className="text-gray-500 dark:text-gray-400" />
      )}
    </button>
  );
};

export const AppSidebar: React.FC = () => {
  const { collapsed } = useSidebar();
  const router = useRouter();
  const pathname = usePathname();
  const { navigateTo, isNavigating } = useNavigation();
  const session = useSession();

  const username = session?.username;
  const userRole = session?.role as UserRole;

  const handleLogoClick = () => {
    if (pathname === ROUTER.HOME) {
      // Already on home page - navigate to clean home URL
      window.location.href = ROUTER.HOME;
    } else {
      // Navigate to home page
      navigateTo(ROUTER.HOME);
    }
  };

  // Get unread message count for creators
  const { data: unreadCount } = useQuery({
    queryKey: [API_QUERY_KEYS.MESSAGES.UNREAD_COUNT],
    queryFn: () => apiClient.messages.getUnreadCount().then(({ data }) => data),
    refetchInterval: 15000, // Check every 15 seconds - same as messages view
    enabled: session.logged && userRole === UserRole.CREATOR, // Only for creators
  });

  const showCreateButton =
    session.logged &&
    (userRole === UserRole.USER || userRole === UserRole.CREATOR);


  const LINKS: {
    guest: SidebarLink[];
    user: SidebarLink[];
    creator: SidebarLink[];
    admin: SidebarLink[];
  } = {
    guest: [
      {
        href: ROUTER.EXPLORE.RESET,
        base: ROUTER.HOME,
        label: 'Explore',
        icon: GlobeX,
      },
    ],
    user: [
      {
        href: ROUTER.EXPLORE.RESET,
        base: ROUTER.HOME,
        label: 'Explore',
        icon: GlobeX,
      },
      {
        href: username ? ROUTER.USERS.DETAIL(username) : '#',
        base: username ? ROUTER.USERS.DETAIL(username) : '#',
        label: 'Journal',
        icon: BookBookmark,
      },
      {
        href: ROUTER.BOOKMARKS.HOME,
        base: ROUTER.BOOKMARKS.HOME,
        label: 'Bookmarks',
        icon: Bookmarks,
      },
    ],
    creator: [
      {
        href: ROUTER.EXPLORE.RESET,
        base: ROUTER.HOME,
        label: 'Explore',
        icon: GlobeX,
      },
      {
        href: username ? ROUTER.USERS.DETAIL(username) : '#',
        base: username ? ROUTER.USERS.DETAIL(username) : '#',
        label: 'Journal',
        icon: BookBookmark,
      },
      {
        href: ROUTER.BOOKMARKS.HOME,
        base: ROUTER.BOOKMARKS.HOME,
        label: 'Bookmarks',
        icon: Bookmarks,
      },
      {
        href: ROUTER.JOURNEYS.HOME,
        base: ROUTER.JOURNEYS.HOME,
        label: 'Journeys',
        icon: PathIcon,
      },
      {
        href: ROUTER.SPONSORSHIP.ROOT,
        base: ROUTER.SPONSORSHIP.ROOT,
        label: 'Sponsorship',
        icon: HandCoinsIcon,
      },
      {
        href: ROUTER.INSIGHTS.HOME,
        base: ROUTER.INSIGHTS.HOME,
        label: 'Insights',
        icon: ChartPieSliceIcon,
      },
      {
        href: ROUTER.MESSAGES.HOME,
        base: ROUTER.MESSAGES.HOME,
        label: 'Messages',
        icon: ChatCircleTextIcon,
      },
    ],
    admin: [
      {
        href: ROUTER.ADMIN.HOME,
        base: ROUTER.ADMIN.HOME,
        label: 'Admin',
        icon: HouseIcon,
      },
    ],
  };

  let links: SidebarLink[] = [];

  switch (userRole) {
    case UserRole.ADMIN:
      links = LINKS.admin;
      break;
    case UserRole.CREATOR:
      links = LINKS.creator;
      break;
    case UserRole.USER:
      links = LINKS.user;
      break;
    default:
      links = LINKS.guest;
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
    <div
      className={cn(
        'hidden lg:flex relative w-full transition-all duration-300 ease-in-out',
        collapsed ? 'desktop:max-w-[65px]' : 'desktop:max-w-[240px]',
      )}
    >
      <div
        className={cn(
          'md:flex w-full h-dvh fixed top-0 bottom-0 left-0 bg-white flex-col z-[80] force-light-mode transition-all duration-300 ease-in-out',
          collapsed ? 'desktop:max-w-[65px]' : 'desktop:max-w-[240px]',
        )}
      >
        <div className="bg-dark text-dark-foreground flex flex-col items-center w-full h-full py-4">
          <div
            className={cn(
              'w-full box-border flex flex-row items-center',
              collapsed ? 'justify-center items-center h-16 -mt-2' : 'pl-4 pr-8',
            )}
          >
            <button onClick={handleLogoClick} className="focus:outline-none">
              {collapsed ? (
                <Logo color="light" size="sm" />
              ) : (
                <Logo color="light" size="xlg" />
              )}
            </button>
          </div>
          <div className="mt-10 w-full h-full flex flex-col justify-between box-border">
            <div className={cn("lg:w-full flex flex-col gap-3", collapsed ? "items-center px-2" : "px-6")}>
              {links.map(
                ({ href, base, label, icon: Icon }, key) => (
                  <Tooltip key={key}>
                    <TooltipTrigger
                      onClick={() => navigateTo(href)}
                      disabled={isNavigating}
                      className={cn(
                        'w-full flex h-[40px] overflow-hidden transition-opacity border-0 bg-transparent outline-none focus:outline-none',
                        collapsed ? 'app-sidebar-link-collapsed justify-center' : 'app-sidebar-link justify-start',
                        isActiveLink(base) ? 'app-sidebar-link-active' : '',
                        isNavigating && 'opacity-60 transition-opacity'
                      )}
                    >
                        <div className={cn(
                          "relative flex flex-row items-center gap-3",
                          collapsed ? "justify-center" : "justify-start"
                        )}>
                          <div className="relative">
                            <Icon
                              size={22}
                              weight="regular"
                              className="app-sidebar-link-icon"
                            />
                            {label === 'Messages' && (unreadCount?.count || 0) > 0 && (
                              <div className="absolute -top-1 -right-1 bg-[rgb(170,108,70)] rounded-full w-3 h-3"></div>
                            )}
                          </div>
                          <span
                            className={cn(
                              'text-lg font-normal leading-none',
                              collapsed ? 'hidden' : 'hidden lg:flex',
                            )}
                          >
                            {label}
                          </span>
                        </div>
                    </TooltipTrigger>
                    {collapsed && (
                      <TooltipContent side="right">
                        {label}
                      </TooltipContent>
                    )}
                  </Tooltip>
                ),
              )}
            </div>

            {/* Bottom links - show as list when expanded, as dropdown when collapsed */}
            {!collapsed && (
              <div className="w-full flex flex-col gap-2 px-6 pb-4">
                <button
                  onClick={() => navigateTo(ROUTER.USER_GUIDE)}
                  disabled={isNavigating}
                  className={cn(
                    'w-full text-left text-sm text-gray-400 hover:text-white transition-colors py-2',
                    isNavigating && 'opacity-60'
                  )}
                >
                  User guide
                </button>
                {session.logged && (
                  <button
                    onClick={() => navigateTo(ROUTER.SUPPORT)}
                    disabled={isNavigating}
                    className={cn(
                      'w-full text-left text-sm text-gray-400 hover:text-white transition-colors py-2',
                      isNavigating && 'opacity-60'
                    )}
                  >
                    Support
                  </button>
                )}
                <button
                  onClick={() => window.open(ROUTER.LEGAL.PRIVACY, '_blank')}
                  disabled={isNavigating}
                  className={cn(
                    'w-full text-left text-sm text-gray-400 hover:text-white transition-colors py-2',
                    isNavigating && 'opacity-60'
                  )}
                >
                  Privacy policy
                </button>
                <button
                  onClick={() => window.open(ROUTER.LEGAL.TERMS, '_blank')}
                  disabled={isNavigating}
                  className={cn(
                    'w-full text-left text-sm text-gray-400 hover:text-white transition-colors py-2',
                    isNavigating && 'opacity-60'
                  )}
                >
                  Terms and conditions
                </button>
              </div>
            )}
          </div>

          {/* Show dropdown menu when collapsed */}
          {collapsed && (
            <div className="w-full flex flex-col items-center justify-center px-2 pb-4">
              <UserNavbar collapsed={collapsed} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
