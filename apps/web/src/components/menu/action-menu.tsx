'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@repo/ui';
import { EllipsisIcon } from 'lucide-react';

type Props = {
  actions?: ActionMenuItem[];
};

export type ActionMenuItem = {
  label: string;
  onClick: () => void;
};

export const ActionMenu: React.FC<Props> = ({ actions = [] }) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="w-8 h-8 bg-transparent rounded-full flex flex-row items-center justify-center focus:bg-accent hover:bg-accent">
          <EllipsisIcon />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          {actions.map(({ label, onClick }, key) => (
            <DropdownMenuItem
              key={key}
              className="cursor-pointer"
              onClick={onClick}
            >
              {label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
