'use client';

import { ArrowLeftIcon } from '@repo/ui/icons';
import Link from 'next/link';

type Props = {
  href?: string;
  onClick?: () => void;
};

export const BackButton: React.FC<Props> = ({ href, onClick }) => {
  const ParentComponent: (props: { children: React.ReactNode }) => JSX.Element =
    href
      ? ({ children }) => (
          <Link
            href={href}
            className="flex items-center justify-center w-8 h-8 bg-transparent rounded-full hover:bg-accent transition-all"
          >
            {children}
          </Link>
        )
      : ({ children }) => (
          <button
            className="flex items-center justify-center w-8 h-8 bg-transparent rounded-full hover:bg-accent transition-all"
            aria-label="Close"
            onClick={onClick}
          >
            {children}
          </button>
        );

  return (
    <ParentComponent>
      <ArrowLeftIcon size={18} />
    </ParentComponent>
  );
};
