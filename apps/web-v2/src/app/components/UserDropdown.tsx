'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';

export function UserDropdown() {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  if (!user) return null;

  const handleLogout = () => {
    logout();
    setIsOpen(false);
    router.push('/auth');
  };

  return (
    <div className="relative">
      <button
        className="px-4 py-2 bg-[#202020] text-white hover:bg-[#4676ac] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#4676ac] cursor-pointer flex items-center gap-2 text-sm"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="text-sm font-bold">{user.username}</span>
        <span className="text-xs">▼</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 bg-white border-2 border-[#202020] min-w-[300px] z-50">
          {/* User Info */}
          <div className="bg-[#616161] text-white p-4 border-b-2 border-[#202020]">
            <div className="font-bold text-sm mb-1">{user.username}</div>
            <div className="text-xs text-[#b5bcc4] mb-2">{user.email}</div>
            <div className="text-xs font-mono text-[#b5bcc4]">
              {user.role === 'creator' ? 'EXPLORER PRO' : 'EXPLORER'}
            </div>
          </div>

          {/* Quick Stats - TODO: Fetch from API */}
          <div className="p-3 border-b-2 border-[#b5bcc4] bg-[#f5f5f5]">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <div className="text-[#616161]">Expeditions</div>
                <div className="font-bold">–</div>
              </div>
              <div>
                <div className="text-[#616161]">Entries</div>
                <div className="font-bold">–</div>
              </div>
              <div>
                <div className="text-[#616161]">Followers</div>
                <div className="font-bold">–</div>
              </div>
              <div>
                <div className="text-[#616161]">Sponsored</div>
                <div className="font-bold text-[#ac6d46]">–</div>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="p-2">
            <Link
              href={`/journal/${user.username}`}
              className="block px-3 py-2 text-sm hover:bg-[#95a2aa] dark:hover:bg-[#3a3a3a] transition-all focus-visible:ring-2 focus-visible:ring-inset focus-visible:outline-none focus-visible:ring-[#616161]"
              onClick={() => setIsOpen(false)}
            >
              View My Journal
            </Link>
            <Link
              href="/select-expedition"
              className="block px-3 py-2 text-sm hover:bg-[#95a2aa] dark:hover:bg-[#3a3a3a] transition-all focus-visible:ring-2 focus-visible:ring-inset focus-visible:outline-none focus-visible:ring-[#616161]"
              onClick={() => setIsOpen(false)}
            >
              Log New Entry
            </Link>
            <button className="w-full text-left px-3 py-2 text-sm hover:bg-[#95a2aa] dark:hover:bg-[#3a3a3a] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-inset focus-visible:outline-none focus-visible:ring-[#616161]">
              Edit Profile
            </button>
            <button className="w-full text-left px-3 py-2 text-sm hover:bg-[#95a2aa] dark:hover:bg-[#3a3a3a] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-inset focus-visible:outline-none focus-visible:ring-[#616161]">
              Account Settings
            </button>
            <button className="w-full text-left px-3 py-2 text-sm hover:bg-[#95a2aa] dark:hover:bg-[#3a3a3a] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-inset focus-visible:outline-none focus-visible:ring-[#616161]">
              Privacy Settings
            </button>
            <div className="border-t border-[#b5bcc4] my-2"></div>
            <button
              onClick={handleLogout}
              className="w-full text-left px-3 py-2 text-sm text-[#ac6d46] hover:bg-[#95a2aa] dark:hover:bg-[#3a3a3a] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-inset focus-visible:outline-none focus-visible:ring-[#ac6d46] font-bold"
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}