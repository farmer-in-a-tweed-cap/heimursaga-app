'use client';

import Link from 'next/link';
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
import { BellIcon, FeatherIcon } from '@repo/ui/icons';
import { cn } from '@repo/ui/lib/utils';
import { useQuery } from '@tanstack/react-query';

import { API_QUERY_KEYS, apiClient } from '@/lib/api';
import { redirect } from '@/lib';
import { ROUTER } from '@/router';
import { useSession } from '@/hooks';

import { Logo } from './logo';
import { UserAvatar } from '../user/user-avatar';

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
  const session = useSession();
  const { picture, username, role } = session || {};
  const roleLabel = getRoleLabel(role || '');
  const isCreator = session?.creator;
  const userRole = session?.role as UserRole;

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
      redirect(ROUTER.HOME);
    } catch (e) {
      //
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
    <div className="hidden lg:flex fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200 h-16 shadow-sm">
      <div className="w-full px-6 flex items-center justify-between">
        {/* Left spacer */}
        <div className="flex-1"></div>
        
        {/* Centered Logo */}
        <div className="flex items-center justify-center">
          <Link href={ROUTER.HOME}>
            <Logo size="lg" color="dark" />
          </Link>
        </div>
        
        {/* Right side elements */}
        <div className="flex-1 flex items-center justify-end space-x-4">
          {/* Create Entry Button */}
          <Link href={ROUTER.ENTRIES.CREATE}>
            <Button 
              variant="default" 
              size="sm" 
              className="bg-[#AC6D46] hover:bg-[#AC6D46]/90 text-white"
            >
              <FeatherIcon size={16} className="mr-1" />
              Log Entry
            </Button>
          </Link>
          
          {/* Notifications */}
          {session?.logged && (
            <Link href={ROUTER.NOTIFICATIONS}>
              <Button variant="ghost" size="sm" className="p-2 relative">
                <BellIcon size={24} weight="bold" className="text-gray-600" />
                {badges.notifications >= 1 && (
                  <div className="absolute -top-1 -right-1">
                    <BadgeCount count={badges.notifications} />
                  </div>
                )}
              </Button>
            </Link>
          )}
          
          {/* User Avatar with Username and Role */}
          {session?.logged && (
            <DropdownMenu>
              <DropdownMenuTrigger>
                <div className="flex flex-row gap-3 items-center hover:bg-gray-50 rounded-lg p-2 transition-colors">
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
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-background min-w-[240px] mr-4 mt-2 p-0 py-2">
                {links.map(({ href, label }, key) => (
                  <DropdownMenuItem key={key} asChild>
                    <Link
                      href={href}
                      onClick={(e) => {
                        e.preventDefault();
                        window.location.href = href;
                      }}
                      className="text-sm bg-background font-normal !text-gray-700 !px-4 !rounded-none hover:!bg-accent py-2 hover:cursor-pointer"
                    >
                      {label}
                    </Link>
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
          )}
        </div>
      </div>
    </div>
  );
};
