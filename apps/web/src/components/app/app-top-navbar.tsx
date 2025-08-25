'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { UserRole } from '@repo/types';
import { 
  BadgeCount, 
  Button, 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from '@repo/ui/components';
import { BellIcon, FeatherIcon, CaretDownIcon } from '@repo/ui/icons';
import { cn } from '@repo/ui/lib/utils';
import { useQuery } from '@tanstack/react-query';

import { API_QUERY_KEYS, apiClient } from '@/lib/api';
import { redirect } from '@/lib';
import { ROUTER } from '@/router';
import { useSession, useNavigation } from '@/hooks';

import { Logo } from './logo';
import { UserAvatar } from '../user/user-avatar';
import { NotificationDropdownTray } from '../notification/notification-dropdown-tray';
import { NavigationButton, NavigationLink } from '@/components';

const getRoleLabel = (role: string) => {
  switch (role) {
    case UserRole.USER:
      return 'explorer';
    case UserRole.ADMIN:
      return 'admin';
    case UserRole.CREATOR:
      return 'explorer pro';
    default:
      return 'explorer';
  }
};

type Props = {};

export const AppTopNavbar: React.FC<Props> = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { navigateTo, isNavigating } = useNavigation();
  const session = useSession();
  const { picture, username, role } = session || {};
  const roleLabel = getRoleLabel(role || '');
  const isCreator = session?.creator;
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

  const badgeQuery = useQuery({
    queryKey: [API_QUERY_KEYS.USER.BADGE_COUNT],
    queryFn: () => apiClient.getBadgeCount().then(({ data }) => data),
    enabled: session.logged,
  });

  const badges = {
    notifications: badgeQuery.isFetched ? (badgeQuery.data?.notifications || 0) : 0,
  };

  const handleLogout = async () => {
    try {
      const response = await apiClient.logout();
      if (!response.success) {
        return;
      }
      
      // Clear the session context to prevent further session validation attempts
      if (session.clearSession) {
        session.clearSession();
      }
      
      window.location.href = ROUTER.HOME;
    } catch (e) {
      // Even if logout API fails, clear the local session
      if (session.clearSession) {
        session.clearSession();
      }
      window.location.href = ROUTER.HOME;
    }
  };

  const LINKS = {
    user: [
      {
        href: username ? ROUTER.USERS.DETAIL(username) : '#',
        label: 'Journal',
      },
      {
        href: ROUTER.USER.SETTINGS.HOME,
        label: 'Settings',
      },
      {
        href: ROUTER.UPGRADE,
        label: 'Upgrade',
      },
    ],
    creator: [
      {
        href: username ? ROUTER.USERS.DETAIL(username) : '#',
        label: 'Journal',
      },
      {
        href: ROUTER.MESSAGES.HOME,
        label: 'Messages',
      },
      {
        href: ROUTER.USER.SETTINGS.HOME,
        label: 'Settings',
      },
      {
        href: ROUTER.UPGRADE,
        label: 'Account',
      },
    ],
    admin: [
      {
        href: username ? ROUTER.USERS.DETAIL(username) : '#',
        label: 'Journal',
      },
      {
        href: ROUTER.USER.SETTINGS.HOME,
        label: 'Settings',
      },
    ],
  };

  let links: { href: string; label: string }[] = [];

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
      links = [];
      break;
  }

  return (
    <>
      {/* Desktop Top Navbar - Full version */}
      <div className="hidden lg:flex fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200 h-16 shadow-sm">
        <div className="w-full px-6 flex items-center justify-between">
          {/* Left spacer */}
          <div className="flex-1"></div>
          
          {/* Centered Logo */}
          <div className="flex items-center justify-center -ml-[15px] lg:ml-[50px]">
            <button onClick={handleLogoClick} className="focus:outline-none">
              <Logo size="lg" color="dark" />
            </button>
          </div>
          
          {/* Right side elements */}
          <div className="flex-1 flex items-center justify-end">
            {session?.logged ? (
              <div className="flex items-center">
                {/* Create Entry Button */}
                <NavigationButton 
                  href={ROUTER.ENTRIES.CREATE}
                  variant="default" 
                  size="sm" 
                  className="bg-[#AC6D46] hover:bg-[#AC6D46]/90 text-white mr-2"
                >
                  <FeatherIcon size={16} className="mr-1" />
                  Log Entry
                </NavigationButton>
                
                {/* Notifications with Dropdown Tray */}
                <NotificationDropdownTray 
                  badgeCount={badges.notifications}
                  className="mx-3"
                >
                  <NavigationButton 
                    href={ROUTER.NOTIFICATIONS}
                    variant="ghost" 
                    size="lg" 
                    className="relative !px-1"
                  >
                    <BellIcon size={20} weight="bold" className="text-gray-600 !size-5" />
                    {badges.notifications >= 1 && (
                      <div className="absolute -top-1 -right-1">
                        <BadgeCount count={badges.notifications} />
                      </div>
                    )}
                  </NavigationButton>
                </NotificationDropdownTray>
                
                {/* User Avatar with Username and Role */}
                <DropdownMenu>
                <DropdownMenuTrigger>
                  <div className="flex flex-row gap-3 items-center hover:bg-gray-50 rounded-lg p-2 transition-colors cursor-pointer">
                    <UserAvatar
                      src={picture}
                      className={cn(isCreator ? 'border-2 border-primary' : '')}
                    />
                    <div className="flex flex-col items-start text-sm">
                      <span className="font-medium text-sm text-gray-900">{username}</span>
                      <span className="font-normal text-xs capitalize text-gray-600">
                        {roleLabel}
                      </span>
                    </div>
                    <CaretDownIcon size={16} className="text-gray-400 ml-1" />
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-background min-w-[240px] mr-4 mt-2 p-0 py-2">
                  {links.map(({ href, label }, key) => (
                    <DropdownMenuItem 
                      key={key} 
                      className={cn(
                        "text-sm bg-background font-normal !text-gray-700 !px-4 !rounded-none hover:!bg-accent py-2 hover:cursor-pointer",
                        isNavigating && "opacity-60 transition-opacity"
                      )}
                      onClick={() => navigateTo(href)}
                      disabled={isNavigating}
                    >
                      {/* 
                        NOTE: Previously used e.preventDefault() + window.location.href 
                        to force full page reloads. Reverted to client-side navigation 
                        for better UX. If issues arise, revert to:
                        <Link href={href} onClick={(e) => { e.preventDefault(); window.location.href = href; }}>
                      */}
                      {label}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-sm bg-background font-normal !text-gray-700 !px-4 !rounded-none hover:!bg-accent py-2 hover:cursor-pointer"
                    onClick={handleLogout}
                  >
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              </div>
            ) : (
              /* Logged out state - Login button and create account link */
              <div className="flex items-center space-x-4">
                <NavigationLink 
                  href={ROUTER.SIGNUP}
                  className={cn(
                    "text-sm font-medium text-gray-600 hover:text-gray-900",
                    isNavigating && "opacity-60 transition-opacity"
                  )}
                >
                  Sign up
                </NavigationLink>
                <NavigationButton
                  href={ROUTER.LOGIN}
                  variant="default" 
                  size="sm" 
                  className="bg-[#AC6D46] hover:bg-[#AC6D46]/90 text-white"
                >
                  Log in
                </NavigationButton>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Top Navbar - Logo only (when bottom navbar is visible) */}
      <div className="flex lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200 h-16 shadow-sm">
        <div className="w-full px-6 flex items-center justify-center">
          <div className="-ml-[15px]">
            <button onClick={handleLogoClick} className="focus:outline-none">
              <Logo size="lg" color="dark" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
