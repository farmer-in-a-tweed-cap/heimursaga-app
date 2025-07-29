'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@repo/ui/components';
import { DotsThreeIcon } from '@repo/ui/icons';
import { cn } from '@repo/ui/lib/utils';
import Link from 'next/link';

import { ROUTER } from '@/router';

type Props = {
  collapsed?: boolean;
};

export const UserNavbar: React.FC<Props> = ({ collapsed = false }) => {
  const legalLinks = [
    {
      href: ROUTER.USER_GUIDE,
      label: 'User guide',
      openNewTab: false,
    },
    {
      href: ROUTER.LEGAL.PRIVACY,
      label: 'Privacy policy',
      openNewTab: true,
    },
    {
      href: ROUTER.LEGAL.TERMS,
      label: 'Terms and conditions',
      openNewTab: true,
    },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <div
          className={cn(
            'flex items-center justify-center rounded-full p-2 bg-dark hover:bg-dark-hover focus:bg-secondary-hover active:bg-dark-hover transition-colors',
          )}
        >
          <DotsThreeIcon size={20} weight="bold" className="text-white" />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="bg-background min-w-[200px] ml-4 mb-2 p-0 py-2">
        {legalLinks.map(({ href, label, openNewTab = false }, key) => (
          <DropdownMenuItem key={key} asChild>
            <Link
              href={href}
              target={openNewTab ? '_blank' : '_self'}
              className="text-sm bg-background font-normal !text-gray-700 !px-4 !rounded-none hover:!bg-accent py-2 hover:cursor-pointer"
            >
              {label}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
