'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { Bell, Settings, MapPin, CloudSun, User } from 'lucide-react';
import { NotificationsDropdown } from '@/app/components/NotificationsDropdown';
import { useProFeatures } from '@/app/hooks/useProFeatures';
import { notificationApi, messageApi } from '@/app/services/api';

export function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const { isPro } = useProFeatures();
  const pathname = usePathname();
  const router = useRouter();
  const [connectionStatus] = useState<'connected' | 'disconnected'>('connected');
  const [lastSync] = useState(new Date());
  const [overflowMenuOpen, setOverflowMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

  // Fetch notification badge count
  useEffect(() => {
    if (!isAuthenticated) {
      return () => {
        setUnreadCount(0);
      };
    }

    async function fetchBadgeCount() {
      try {
        const response = await notificationApi.getBadgeCount();
        setUnreadCount(response.notifications);
      } catch (_err) {
        console.error('Failed to fetch badge count:', _err);
      }
    }

    fetchBadgeCount();

    // Refresh badge count every 60 seconds
    const interval = setInterval(fetchBadgeCount, 60000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // Refresh badge count when notifications dropdown closes
  useEffect(() => {
    if (!notificationsOpen && isAuthenticated) {
      notificationApi.getBadgeCount()
        .then(response => setUnreadCount(response.notifications))
        .catch(err => console.error('Failed to refresh badge count:', err));
    }
  }, [notificationsOpen, isAuthenticated]);

  // Fetch unread messages count (Explorer Pro only)
  useEffect(() => {
    if (!isAuthenticated || !isPro) {
      return () => {
        setUnreadMessagesCount(0);
      };
    }

    async function fetchUnreadMessages() {
      try {
        const response = await messageApi.getUnreadCount();
        setUnreadMessagesCount(response.count);
      } catch {
        // Silently fail - user might not have access
        setUnreadMessagesCount(0);
      }
    }

    fetchUnreadMessages();

    // Refresh every 60 seconds
    const interval = setInterval(fetchUnreadMessages, 60000);

    // Listen for custom event when messages are read
    const handleMessagesRead = () => {
      fetchUnreadMessages();
    };
    window.addEventListener('messages-read', handleMessagesRead);

    return () => {
      clearInterval(interval);
      window.removeEventListener('messages-read', handleMessagesRead);
    };
  }, [isAuthenticated, isPro]);

  // Update current time every minute
  // useEffect(() => {
  //   const timer = setInterval(() => {
  //     setCurrentTime(new Date());
  //   }, 60000); // Update every minute
  //   return () => clearInterval(timer);
  // }, []);

  const handleLogout = () => {
    logout();
    setOverflowMenuOpen(false);
    router.push('/auth');
  };

  const isActive = (path: string) => {
    if (path === '/select-expedition') return pathname.includes('select-expedition') || pathname.includes('log-entry');
    if (path === '/sponsorship') return pathname === '/sponsorship';

    // DISCOVER covers explorers, expeditions, entries pages (but not user's own journal)
    if (path === '/discover') {
      // Exclude user's own profile from discover active state
      if (user && pathname === `/journal/${user.username}`) return false;
      return pathname.startsWith('/explorers') ||
             pathname.startsWith('/expeditions') ||
             pathname.startsWith('/entries') ||
             pathname.startsWith('/journal/') ||
             pathname.startsWith('/expedition/') ||
             pathname.startsWith('/entry/');
    }

    // JOURNAL is the user's own profile
    if (path === '/journal' && user) {
      return pathname === `/journal/${user.username}`;
    }

    if (path === '/admin') return pathname === '/admin';

    return pathname === path;
  };

  // Check if we're on a discover subpage to show sub-navigation
  // Exclude user's own profile from showing discover sub-nav
  // const isOnDiscoverPage = user && pathname === `/journal/${user.username}`
  //   ? false
  //   : (pathname.startsWith('/explorers') ||
  //      pathname.startsWith('/journal/') ||
  //      pathname.startsWith('/expedition') ||
  //      pathname.startsWith('/entries') ||
  //      pathname.startsWith('/entry') ||
  //      pathname.startsWith('/sponsorship'));

  // Close overflow menu when route changes
  useEffect(() => {
    return () => {
      setOverflowMenuOpen(false);
    };
  }, [pathname]);

  // Close notifications dropdown when clicking outside
  useEffect(() => {
    const currentRef = notificationsRef.current;
    const handleClickOutside = (event: MouseEvent) => {
      if (currentRef && !currentRef.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [notificationsRef]);

  return (
    <header className="bg-[#202020] text-white">
      <div className="max-w-[1600px] mx-auto px-4 lg:px-6 py-[21px]">
        <div className="flex items-center justify-between relative">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link href="/" className="flex-shrink-0">
              <Image
                src="/logo-lg-light.svg"
                alt="Heimursaga"
                className="h-16 lg:h-20 xl:h-24 w-auto"
                width={300}
                height={96}
              />
            </Link>
          </div>

          {/* Vertical divider after logo */}
          {isAuthenticated && user && (
            <div className="hidden xl:block flex-shrink-0 self-center h-[60px] w-[2px] bg-[#616161] mx-6"></div>
          )}

          {/* Navigation - Hidden on smaller screens, shown on XL only to prevent overlap */}
          {/* For logged-out state: absolutely centered. For logged-in state: evenly distributed */}
          <nav className={`hidden xl:flex items-center ${
            isAuthenticated && user
              ? 'justify-evenly flex-1'
              : 'absolute left-1/2 -translate-x-1/2 gap-8 2xl:gap-12'
          }`}>
            <Link 
              href="/" 
              className={`px-2 2xl:px-4 py-3 whitespace-nowrap transition-all text-sm font-bold relative ${isActive('/') 
                  ? 'text-[#4676ac] scale-105 after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:w-12 after:h-0.5 after:bg-[#4676ac]' 
                  : 'text-[#ac6d46] hover:text-[#8a5738] hover:scale-105'
              }`}
            >
              EXPLORE
            </Link>
            <Link 
              href="/explorers" 
              className={`px-2 2xl:px-4 py-3 whitespace-nowrap transition-all text-sm font-bold relative ${
                isActive('/discover') 
                  ? 'text-[#4676ac] scale-105 after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:w-16 after:h-0.5 after:bg-[#4676ac]' 
                  : 'text-[#ac6d46] hover:text-[#8a5738] hover:scale-105'
              }`}
            >
              DISCOVER
            </Link>

            {/* Show ABOUT for logged-out users */}
            {!isAuthenticated && (
              <Link 
                href="/about" 
                className={`px-2 2xl:px-4 py-3 whitespace-nowrap transition-all text-sm font-bold relative ${
                  isActive('/about') 
                    ? 'text-[#4676ac] scale-105 after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:w-12 after:h-0.5 after:bg-[#4676ac]' 
                    : 'text-[#ac6d46] hover:text-[#8a5738] hover:scale-105'
                }`}
              >
                ABOUT
              </Link>
            )}

            {/* Show sub-nav only if authenticated */}
            {isAuthenticated && user && (
              <>
                <Link 
                  href={`/journal/${user.username}`}
                  className={`px-2 2xl:px-4 py-3 whitespace-nowrap transition-all text-sm font-bold relative ${
                    isActive('/journal') 
                      ? 'text-[#4676ac] scale-105 after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:w-14 after:h-0.5 after:bg-[#4676ac]' 
                      : 'text-[#ac6d46] hover:text-[#8a5738] hover:scale-105'
                  }`}
                >
                  JOURNAL
                </Link>
                <Link 
                  href="/sponsorship" 
                  className={`px-2 2xl:px-4 py-3 whitespace-nowrap transition-all text-sm font-bold relative ${
                    isActive('/sponsorship') 
                      ? 'text-[#4676ac] scale-105 after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:w-20 after:h-0.5 after:bg-[#4676ac]' 
                      : 'text-[#ac6d46] hover:text-[#8a5738] hover:scale-105'
                  }`}
                >
                  SPONSORSHIP
                </Link>
                <Link
                  href="/messages"
                  className={`px-2 2xl:px-4 py-3 whitespace-nowrap transition-all text-sm font-bold relative ${
                    isActive('/messages')
                      ? 'text-[#4676ac] scale-105 after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:w-16 after:h-0.5 after:bg-[#4676ac]'
                      : 'text-[#ac6d46] hover:text-[#8a5738] hover:scale-105'
                  }`}
                >
                  MESSAGES
                  {unreadMessagesCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-[#ac6d46] text-white text-xs font-bold rounded-full h-5 min-w-5 px-1 flex items-center justify-center">
                      {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                    </span>
                  )}
                </Link>
                <Link 
                  href="/bookmarks" 
                  className={`px-2 2xl:px-4 py-3 whitespace-nowrap transition-all text-sm font-bold relative ${
                    isActive('/bookmarks') 
                      ? 'text-[#4676ac] scale-105 after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:w-18 after:h-0.5 after:bg-[#4676ac]' 
                      : 'text-[#ac6d46] hover:text-[#8a5738] hover:scale-105'
                  }`}
                >
                  BOOKMARKS
                </Link>
                <Link
                  href="/select-expedition"
                  className={`px-2 2xl:px-4 py-3 whitespace-nowrap transition-all text-sm font-bold ${
                    isActive('/select-expedition')
                      ? 'bg-[#4676ac] text-white'
                      : 'bg-[#ac6d46] text-white hover:bg-[#8a5738]'
                  }`}
                >
                  LOG ENTRY
                </Link>
                {user.username === 'explorer1' && (
                  <Link
                    href="/admin"
                    className={`px-2 2xl:px-4 py-3 whitespace-nowrap transition-all text-sm font-bold relative ${
                      isActive('/admin')
                        ? 'text-[#4676ac] scale-105 after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:w-12 after:h-0.5 after:bg-[#4676ac]'
                        : 'text-[#ac6d46] hover:text-[#8a5738] hover:scale-105'
                    }`}
                  >
                    ADMIN
                  </Link>
                )}
              </>
            )}
          </nav>

          {/* Vertical divider before user data */}
          {isAuthenticated && user && (
            <div className="hidden xl:block flex-shrink-0 self-center h-[60px]" style={{ width: '2px', backgroundColor: '#616161', marginLeft: '24px', marginRight: '24px' }}></div>
          )}

          {/* User Status & Context - Hidden on smaller screens */}
          <div className="hidden xl:flex items-stretch gap-4 flex-shrink-0 h-[66px]">
            {/* User Info */}
            {isAuthenticated && user ? (
              <div className="flex flex-col justify-between text-xs font-mono text-[#b5bcc4] whitespace-nowrap h-full">
                <div className="text-white">
                  <Link href={`/journal/${user.username}`} className="hover:text-[#ac6d46] transition-all focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none focus-visible:ring-[#ac6d46]">
                    {user.username}
                  </Link>
                </div>
                <div>
                  {user.role === 'creator' ? 'EXPLORER PRO' : 'EXPLORER'}
                </div>
                <div className="text-xs">
                  <button className="hover:text-[#ac6d46] transition-all focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none focus-visible:ring-[#ac6d46]" onClick={handleLogout}>
                    logout
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-white flex items-center">
                <Link href="/auth" className="hover:text-[#ac6d46] transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:underline focus-visible:text-[#ac6d46] font-bold">
                  LOGIN / REGISTER
                </Link>
              </div>
            )}
            
            {/* Stacked Notifications and Settings Icons (authenticated only) */}
            {isAuthenticated && user && (
              <div className="flex flex-col justify-between gap-1 h-full">
                {/* Notifications Icon */}
                <div ref={notificationsRef} className="relative">
                  <button
                    className={`relative w-[31px] h-[31px] flex items-center justify-center transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#4676ac] border border-[#202020] ${
                      notificationsOpen
                        ? 'bg-[#4676ac]'
                        : 'bg-[#616161] hover:bg-[#4676ac]'
                    }`}
                    title="Notifications"
                    onClick={() => setNotificationsOpen(!notificationsOpen)}
                  >
                    <Bell className="w-4 h-4 text-white" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#ac6d46] text-white text-xs font-bold flex items-center justify-center rounded-full border border-[#202020]">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </button>
                  {notificationsOpen && (
                    <NotificationsDropdown onClose={() => setNotificationsOpen(false)} />
                  )}
                </div>

                {/* Settings Icon */}
                <Link
                  href="/settings"
                  className={`w-[31px] h-[31px] flex items-center justify-center transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#4676ac] border border-[#202020] ${
                    isActive('/settings')
                      ? 'bg-[#4676ac] text-white'
                      : 'bg-[#616161] text-white hover:bg-[#4676ac]'
                  }`}
                  title="Settings"
                >
                  <Settings className="w-4 h-4" />
                </Link>
              </div>
            )}
            
            {/* User Avatar */}
            {isAuthenticated && user && (
              <Link href={`/journal/${user.username}`} className="flex-shrink-0 flex items-center">
                <div className={`w-[66px] h-[66px] border-2 ${user.role === 'creator' ? 'border-[#ac6d46]' : 'border-[#616161]'} overflow-hidden bg-[#616161] hover:border-[#4676ac] transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#4676ac] flex items-center justify-center`}>
                  {user.picture ? (
                    <Image
                      src={user.picture}
                      alt={user.username}
                      className="w-full h-full object-cover"
                      width={66}
                      height={66}
                    />
                  ) : (
                    <User className="w-8 h-8 text-[#b5bcc4]" />
                  )}
                </div>
              </Link>
            )}
          </div>

          {/* Overflow Menu Button - Shows on smaller screens */}
          <button
            onClick={() => setOverflowMenuOpen(!overflowMenuOpen)}
            className="xl:hidden px-3 py-2 bg-[#616161] hover:bg-[#4a4a4a] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#616161] flex-shrink-0 text-xs font-bold ml-auto"
          >
            MENU {overflowMenuOpen ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {/* Copper Line with Badge */}
      <div className="relative w-full h-0">
        {/* Badge with connected pointed lines */}
        <div className="flex absolute inset-x-0 -translate-y-10 items-center">
          <div className="flex-1 relative h-[2px]">
            <div 
              className="absolute top-0 left-0 w-full h-full bg-[#ac6d46]"
              style={{
                clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%)'
              }}
            />
          </div>
          <div className="relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[28px] h-[28px] bg-[#202020]"></div>
            <Image
              src="/logo-sm-light.svg"
              alt="Heimursaga Badge"
              className="h-20 w-auto px-6 relative z-10"
              width={80}
              height={80}
            />
          </div>
          <div className="flex-1 relative h-[2px]">
            <div 
              className="absolute top-0 left-0 w-full h-full bg-[#ac6d46]"
              style={{
                clipPath: 'polygon(12px 0, 100% 0, 100% 100%, 12px 100%, 0 50%)'
              }}
            />
          </div>
        </div>
      </div>

      {/* Overflow Section - Appears BELOW navbar on smaller screens */}
      {overflowMenuOpen && (
        <div className="xl:hidden bg-[#616161]">
          <div className="max-w-[1800px] mx-auto px-4 lg:px-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* System Status */}
              <div className="bg-[#202020] p-3 border-l-2 border-[#4676ac]">
                <div className="text-xs font-bold mb-2 text-[#b5bcc4]">SYSTEM STATUS:</div>
                <div className="text-xs font-mono text-[#b5bcc4] space-y-1">
                  <div>Version: v2.4.1</div>
                  <div className={connectionStatus === 'connected' ? 'text-[#ac6d46]' : 'text-[#4676ac]'}>
                    Connection: ● {connectionStatus.toUpperCase()}
                  </div>
                  <div>Session: Active</div>
                  <div>Last Sync: {lastSync.toLocaleTimeString()}</div>
                </div>
              </div>

              {/* User Session Info */}
              {isAuthenticated && user ? (
                <div className="bg-[#202020] p-3 border-l-2 border-[#ac6d46]">
                  <div className="text-xs font-bold mb-2 text-[#b5bcc4]">USER SESSION:</div>
                  <div className="text-sm font-bold text-white mb-1">
                    <Link 
                      href={`/journal/${user.username}`} 
                      className="hover:text-[#ac6d46] transition-all focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none focus-visible:ring-[#ac6d46]"
                    >
                      {user.username}
                    </Link>
                  </div>
                  <div className="text-xs font-mono text-[#b5bcc4] space-y-1">
                    <div>Account: {user.role === 'creator' ? 'EXPLORER PRO' : 'EXPLORER'}</div>
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      Samarkand, UZ
                    </div>
                    <div className="flex items-center gap-1">
                      <CloudSun className="w-3 h-3" />
                      18°C • Clear
                    </div>
                  </div>
                  <button className="mt-2 text-xs text-[#ac6d46] hover:text-white transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:underline" onClick={handleLogout}>
                    → LOGOUT
                  </button>
                </div>
              ) : (
                <div className="bg-[#202020] p-3 border-l-2 border-[#ac6d46]">
                  <div className="text-xs font-bold mb-2 text-[#b5bcc4]">ACCOUNT:</div>
                  <Link 
                    href="/auth" 
                    className="block px-4 py-2 bg-[#ac6d46] text-white text-center text-sm font-bold hover:bg-[#4676ac] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#4676ac]"
                  >
                    LOGIN / REGISTER
                  </Link>
                </div>
              )}

              {/* Quick Stats - TODO: Fetch from profile/explorer endpoint */}
              {isAuthenticated && user && (
                <div className="bg-[#202020] p-3 border-l-2 border-[#4676ac]">
                  <div className="text-xs font-bold mb-2 text-[#b5bcc4]">QUICK STATS:</div>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono text-[#b5bcc4]">
                    <div>
                      <div>Expeditions:</div>
                      <div className="text-white font-bold">-</div>
                    </div>
                    <div>
                      <div>Entries:</div>
                      <div className="text-white font-bold">-</div>
                    </div>
                    <div>
                      <div>Sponsored:</div>
                      <div className="text-[#ac6d46] font-bold">-</div>
                    </div>
                    <div>
                      <div>Views:</div>
                      <div className="text-white font-bold">-</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className="mt-4">
              <div className="text-xs font-bold mb-2 text-[#b5bcc4]">NAVIGATION:</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Link 
                  href="/" 
                  className={`px-4 py-3 text-center transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-inset focus-visible:outline-none focus-visible:ring-[#4676ac] text-sm font-bold ${
                    isActive('/') 
                      ? 'bg-[#4676ac] text-white' 
                      : 'bg-[#202020] text-white hover:bg-[#ac6d46]'
                  }`}
                >
                  EXPLORE
                </Link>
                <Link 
                  href="/explorers" 
                  className={`px-4 py-3 text-center transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-inset focus-visible:outline-none focus-visible:ring-[#4676ac] text-sm font-bold ${
                    isActive('/discover') 
                      ? 'bg-[#4676ac] text-white' 
                      : 'bg-[#202020] text-white hover:bg-[#ac6d46]'
                  }`}
                >
                  DISCOVER
                </Link>
                
                {/* Show ABOUT for logged-out users */}
                {!isAuthenticated && (
                  <Link 
                    href="/about" 
                    className={`px-4 py-3 text-center transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-inset focus-visible:outline-none focus-visible:ring-[#4676ac] text-sm font-bold ${
                      isActive('/about') 
                        ? 'bg-[#4676ac] text-white' 
                        : 'bg-[#202020] text-white hover:bg-[#ac6d46]'
                    }`}
                  >
                    ABOUT
                  </Link>
                )}
                
                {isAuthenticated && user && (
                  <>
                    <Link 
                      href={`/journal/${user.username}`}
                      className={`px-4 py-3 text-center transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-inset focus-visible:outline-none focus-visible:ring-[#4676ac] text-sm font-bold ${
                        isActive('/journal') 
                          ? 'bg-[#4676ac] text-white' 
                          : 'bg-[#202020] text-white hover:bg-[#ac6d46]'
                      }`}
                    >
                      JOURNAL
                    </Link>
                    <Link 
                      href="/sponsorship" 
                      className={`px-4 py-3 text-center transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-inset focus-visible:outline-none focus-visible:ring-[#4676ac] text-sm font-bold ${
                        isActive('/sponsorship') 
                          ? 'bg-[#4676ac] text-white' 
                          : 'bg-[#202020] text-white hover:bg-[#ac6d46]'
                      }`}
                    >
                      SPONSORSHIP
                    </Link>
                    <Link
                      href="/messages"
                      className={`px-4 py-3 text-center transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-inset focus-visible:outline-none focus-visible:ring-[#4676ac] text-sm font-bold relative ${
                        isActive('/messages')
                          ? 'bg-[#4676ac] text-white'
                          : 'bg-[#202020] text-white hover:bg-[#ac6d46]'
                      }`}
                    >
                      MESSAGES
                      {unreadMessagesCount > 0 && (
                        <span className="absolute top-1 right-1 bg-[#ac6d46] text-white text-xs font-bold rounded-full h-5 min-w-5 px-1 flex items-center justify-center">
                          {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                        </span>
                      )}
                    </Link>
                    <Link 
                      href="/bookmarks" 
                      className={`px-4 py-3 text-center transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-inset focus-visible:outline-none focus-visible:ring-[#4676ac] text-sm font-bold ${
                        isActive('/bookmarks') 
                          ? 'bg-[#4676ac] text-white' 
                          : 'bg-[#202020] text-white hover:bg-[#ac6d46]'
                      }`}
                    >
                      BOOKMARKS
                    </Link>
                    <Link 
                      href="/notifications" 
                      className={`px-4 py-3 text-center transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-inset focus-visible:outline-none focus-visible:ring-[#4676ac] text-sm font-bold ${
                        isActive('/notifications') 
                          ? 'bg-[#4676ac] text-white' 
                          : 'bg-[#202020] text-white hover:bg-[#ac6d46]'
                      }`}
                    >
                      NOTIFICATIONS
                    </Link>
                    <Link 
                      href="/settings" 
                      className={`px-4 py-3 text-center transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-inset focus-visible:outline-none focus-visible:ring-[#4676ac] text-sm font-bold ${
                        isActive('/settings') 
                          ? 'bg-[#4676ac] text-white' 
                          : 'bg-[#202020] text-white hover:bg-[#ac6d46]'
                      }`}
                    >
                      SETTINGS
                    </Link>
                    <Link
                      href="/select-expedition"
                      className={`px-4 py-3 text-center transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-inset focus-visible:outline-none focus-visible:ring-[#4676ac] text-sm font-bold ${
                        isActive('/select-expedition')
                          ? 'bg-[#4676ac] text-white'
                          : 'bg-[#ac6d46] text-white hover:bg-[#8a5738]'
                      }`}
                    >
                      LOG ENTRY
                    </Link>
                    {user.username === 'explorer1' && (
                      <Link
                        href="/admin"
                        className={`px-4 py-3 text-center transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-inset focus-visible:outline-none focus-visible:ring-[#4676ac] text-sm font-bold ${
                          isActive('/admin')
                            ? 'bg-[#4676ac] text-white'
                            : 'bg-[#202020] text-white hover:bg-[#ac6d46]'
                        }`}
                      >
                        ADMIN
                      </Link>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}