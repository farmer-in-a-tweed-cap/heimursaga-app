'use client';

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
} from '@repo/ui/components';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { apiClient } from '@/lib/api';
import { redirect } from '@/lib/utils';

import { useSession } from '@/hooks';
import { ROUTER } from '@/router';

export const UserNavbar = () => {
  const session = useSession();

  const logoutMutation = useMutation({
    mutationFn: () => apiClient.logout({ cookie: '' }),
    onSuccess: () => {
      redirect(ROUTER.HOME);
    },
  });

  const handleCreatePostClick = () => {
    redirect(ROUTER.POSTS.CREATE);
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const { username, picture = '', firstName = '' } = session || {};

  return session ? (
    <div className="flex flex-row items-center gap-10">
      <Button className="hidden lg:flex" onClick={handleCreatePostClick}>
        Create post
      </Button>
      <div className="flex flex-row items-center gap-2">
        <Dropdown
          trigger={
            <Avatar>
              <AvatarImage src={picture} />
              <AvatarFallback>{firstName.slice(0, 1)}</AvatarFallback>
            </Avatar>
          }
        >
          <div className="flex flex-col">
            {[
              {
                href: username ? ROUTER.MEMBERS.MEMBER(username) : '#',
                label: 'Profile',
              },
              { href: ROUTER.USER.SETTINGS, label: 'Settings' },
              {
                label: 'Logout',
                onClick: handleLogout,
              },
            ].map(({ href, label, onClick }, key) =>
              href ? (
                <Link
                  key={key}
                  href={href}
                  className="w-full px-3 py-2 text-sm text-left font-normal hover:bg-gray-100 rounded-lg"
                >
                  {label}
                </Link>
              ) : (
                <button
                  key={key}
                  className="w-full px-3 py-2 text-sm text-left font-normal hover:bg-gray-100 rounded-lg"
                  onClick={onClick}
                >
                  {label}
                </button>
              ),
            )}
          </div>
        </Dropdown>
      </div>
    </div>
  ) : (
    <Link href={ROUTER.LOGIN}>
      <Button>Log in</Button>
    </Link>
  );
};

interface DropdownProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
}

const Dropdown = ({ trigger, children }: DropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const updatePosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + window.scrollY, // absolute document position
        left: rect.left + window.scrollX,
      });
    }
  };

  // function to handle mouse enter on either trigger or dropdown
  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsOpen(true);
  };

  // function to handle mouse leave with delay
  const handleMouseLeave = () => {
    // use a timeout to delay closing in case the mouse moves to the other element
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 100); // small delay to allow mouse movement between elements
  };

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      window.addEventListener('scroll', updatePosition);
      window.addEventListener('resize', updatePosition);
      return () => {
        window.removeEventListener('scroll', updatePosition);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isOpen]);

  // set up event listener for the dropdown when it's created in the portal
  useEffect(() => {
    // need to run after each render to make sure we have the latest dropdown element
    if (isOpen) {
      // find the portal element in the DOM - have to look it up since it's created outside
      const portalElement = document.querySelector(
        '[data-dropdown-content="true"]',
      );
      if (portalElement && portalElement instanceof HTMLDivElement) {
        dropdownRef.current = portalElement;

        // Add event listeners to the portal element
        portalElement.addEventListener('mouseenter', handleMouseEnter);
        portalElement.addEventListener('mouseleave', handleMouseLeave);

        return () => {
          portalElement.removeEventListener('mouseenter', handleMouseEnter);
          portalElement.removeEventListener('mouseleave', handleMouseLeave);
        };
      }
    }
  }, [isOpen]);

  // clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div ref={triggerRef} className="cursor-pointer">
        {trigger}
      </div>
      {isOpen &&
        createPortal(
          <div
            data-dropdown-content="true"
            className="absolute shadow min-w-[220px] bg-white p-1 box-border min-h-[50px] z-50 rounded-lg"
            style={{
              top: `${position.top + 10}px`,
              left: `${position.left - 185}px`,
            }}
          >
            {children}
          </div>,
          document.body,
        )}
    </div>
  );
};
