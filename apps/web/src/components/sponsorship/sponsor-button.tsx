'use client';

import { Button } from '@repo/ui/components';
import { HandCoinsIcon } from '@repo/ui/icons';

import { ROUTER } from '@/router';

type Props = {
  username?: string;
};

export const SponsorButton: React.FC<Props> = ({ username }) => {
  return (
    <Button variant="outline" asChild>
      <a href={username ? ROUTER.SPONSOR({ username }) : '#'}>
        <HandCoinsIcon size={20} weight="bold" />
        <span>Sponsor</span>
      </a>
    </Button>
  );
};
