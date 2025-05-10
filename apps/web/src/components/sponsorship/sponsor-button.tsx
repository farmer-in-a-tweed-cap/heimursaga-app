'use client';

import { Button } from '@repo/ui/components';
import { HandCoinsIcon } from 'lucide-react';

import { ROUTER } from '@/router';

type Props = {
  username?: string;
};

export const SponsorButton: React.FC<Props> = ({ username }) => {
  return (
    <Button variant="outline" asChild>
      <a href={username ? ROUTER.SPONSOR({ username }) : '#'}>
        <HandCoinsIcon />
        <span>Sponsor</span>
      </a>
    </Button>
  );
};
