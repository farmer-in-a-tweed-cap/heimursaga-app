'use client';

import { UserRole } from '@repo/types';
import { BadgeCount } from '@repo/ui/components';
import { 
  Bell,
  ChartPieSliceIcon,
  HandCoinsIcon,
  PathIcon,
} from '@repo/ui/icons';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';

import { useSession, useApp } from '@/hooks';
import { ROUTER } from '@/router';
import { API_QUERY_KEYS, apiClient } from '@/lib/api';
import { redirect } from '@/lib';

import { UserBar } from './user-bar';

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

export const UserYouMenu = () => {
  const session = useSession();
  const { context, setContext } = useApp();
  const userRole = session?.role as UserRole;
  const isCreator = session?.creator;
  
  const isDark = context.app.navbarTheme === 'dark';

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

  const handleLogout = async () => {
    try {
      // log out
      const response = await apiClient.logout();

      if (!response.success) {
        return;
      }

      // Clear the session context to prevent further session validation attempts
      if (session.clearSession) {
        session.clearSession();
      }

      redirect(ROUTER.HOME);
    } catch (e) {
      // Even if logout API fails, clear the local session
      if (session.clearSession) {
        session.clearSession();
      }
      redirect(ROUTER.HOME);
    }
  };

  const { username = '', email = '', picture = '' } = session || {};
  const roleLabel = getRoleLabel(session?.role || UserRole.USER);

  // Get notification count for badge
  const badgeQuery = useQuery({
    queryKey: [API_QUERY_KEYS.USER.BADGE_COUNT],
    queryFn: () => apiClient.getBadgeCount().then(({ data }) => data),
    enabled: session?.logged,
  });

  const unreadNotifications = badgeQuery.isFetched ? (badgeQuery.data?.notifications || 0) : 0;

  // Define navigation links based on user role (excluding items already in mobile bottom nav)
  // Items with icons are from desktop sidebar, items without are submenu items
  const LINKS = {
    user: [
      // Desktop sidebar items (with icons)
      {
        href: ROUTER.NOTIFICATIONS,
        label: 'Notifications',
        icon: Bell,
        badge: unreadNotifications,
        isMainItem: true,
      },
      // Submenu items (text-only, indented)
      {
        href: ROUTER.USER.SETTINGS.HOME,
        label: 'Settings',
        isMainItem: false,
      },
      {
        href: ROUTER.UPGRADE,
        label: 'Upgrade',
        isMainItem: false,
      },
    ],
    creator: [
      // Desktop sidebar items (with icons)
      {
        href: ROUTER.JOURNEYS.HOME,
        label: 'Journeys',
        icon: PathIcon,
        isMainItem: true,
      },
      {
        href: ROUTER.SPONSORSHIP.HOME,
        label: 'Sponsorship',
        icon: HandCoinsIcon,
        isMainItem: true,
      },
      {
        href: ROUTER.INSIGHTS.HOME,
        label: 'Insights',
        icon: ChartPieSliceIcon,
        isMainItem: true,
      },
      {
        href: ROUTER.NOTIFICATIONS,
        label: 'Notifications',
        icon: Bell,
        badge: unreadNotifications,
        isMainItem: true,
      },
      // Submenu items (text-only, indented)
      {
        href: ROUTER.USER.SETTINGS.HOME,
        label: 'Settings',
        isMainItem: false,
      },
      {
        href: ROUTER.UPGRADE,
        label: 'Account',
        isMainItem: false,
      },
    ],
    guest: [
      {
        href: ROUTER.LOGIN,
        label: 'Log in',
        isMainItem: false,
      },
    ],
    admin: [
      {
        href: username ? ROUTER.USERS.DETAIL(username) : '#',
        label: 'Journal',
        isMainItem: false,
      },
      {
        href: ROUTER.ADMIN.HOME,
        label: 'Admin',
        isMainItem: false,
      },
      {
        href: ROUTER.USER.SETTINGS.HOME,
        label: 'Settings',
        isMainItem: false,
      },
    ],
    info: [
      {
        href: ROUTER.USER_GUIDE,
        label: 'User guide',
        isMainItem: false,
      },
      {
        href: ROUTER.SUPPORT,
        label: 'Support',
        isMainItem: false,
      },
      {
        href: ROUTER.LEGAL.PRIVACY,
        label: 'Privacy policy',
        isMainItem: false,
      },
      {
        href: ROUTER.LEGAL.TERMS,
        label: 'Terms and conditions',
        isMainItem: false,
      },
    ],
  };

  let links: { href: string; label: string; icon?: any; badge?: number; isMainItem: boolean }[] = [];
  let legalLinks: { href: string; label: string; isMainItem: boolean }[] = [];

  switch (userRole) {
    case UserRole.ADMIN:
      links = LINKS.admin;
      legalLinks = [];
      break;
    case UserRole.CREATOR:
      links = LINKS.creator;
      legalLinks = LINKS.info;
      break;
    case UserRole.USER:
      links = LINKS.user;
      legalLinks = LINKS.info;
      break;
    default:
      links = LINKS.guest;
      legalLinks = LINKS.info;
      break;
  }

  return (
    <div className="flex flex-col gap-6">
      <UserBar name={username} picture={picture} text={roleLabel} creator={isCreator} />
      
      {/* Navigation Menu */}
      <div className="flex flex-col gap-2">
        {/* Primary Items (with icons) */}
        {links.filter(link => link.isMainItem).map(({ href, label, icon: Icon, badge }, key) => (
          <Link
            key={key}
            href={href}
            className="flex items-center justify-between py-3 px-4 text-base font-medium text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              {Icon && <Icon className="w-5 h-5 text-gray-600" />}
              <span>{label}</span>
            </div>
            {badge && badge > 0 && (
              <BadgeCount count={badge} />
            )}
          </Link>
        ))}
        
        {/* Divider between primary and submenu items */}
        {links.some(link => !link.isMainItem) && (
          <div className="border-t border-gray-300 my-2 w-full" style={{ minHeight: '1px' }}></div>
        )}
        
        {/* Submenu Items (text-only, indented) */}
        {links.filter(link => !link.isMainItem).map(({ href, label }, key) => (
          <Link
            key={key}
            href={href}
            className="flex items-center py-3 px-8 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {label}
          </Link>
        ))}
        
        {/* Legal Links */}
        {legalLinks.length > 0 && (
          <>
            <div className="border-t border-gray-300 my-2 w-full" style={{ minHeight: '1px' }}></div>
            {legalLinks.map(({ href, label, isMainItem }, key) => (
              <Link
                key={key}
                href={href}
                target="_blank"
                className={`flex items-center py-3 font-medium rounded-lg hover:bg-gray-100 transition-colors ${
                  isMainItem 
                    ? 'px-4 text-base text-gray-900' 
                    : 'px-8 text-sm text-gray-600'
                }`}
              >
                {label}
              </Link>
            ))}
          </>
        )}
        
        {/* Theme Toggle */}
        <div className="border-t border-gray-300 my-2 w-full" style={{ minHeight: '1px' }}></div>
        <button
          onClick={toggleTheme}
          className="flex items-center justify-between py-3 px-4 text-base font-medium text-gray-900 rounded-lg hover:bg-gray-100 transition-colors text-left"
        >
          <span>Navbar theme</span>
          <span className="text-sm text-gray-500 capitalize">{isDark ? 'Dark' : 'Light'}</span>
        </button>
        
        {/* Logout */}
        {session?.logged && (
          <>
            <div className="border-t border-gray-300 my-2 w-full" style={{ minHeight: '1px' }}></div>
            <button
              onClick={handleLogout}
              className="flex items-center py-3 px-4 text-base font-medium text-red-600 rounded-lg hover:bg-red-50 transition-colors text-left"
            >
              Log out
            </button>
          </>
        )}
      </div>
    </div>
  );
};
