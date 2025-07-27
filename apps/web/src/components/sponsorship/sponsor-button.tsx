'use client';

import { Button } from '@repo/ui/components';
import { HandCoinsIcon } from '@repo/ui/icons';

import { MODALS } from '@/components';
import { useModal } from '@/hooks';

type Props = {
  username?: string;
};

export const SponsorButton: React.FC<Props> = ({ username }) => {
  const modal = useModal();

  const handleSponsorClick = () => {
    if (!username) return;
    
    modal.open(MODALS.SPONSOR_CHECKOUT, {
      props: { username },
      full: true,
    });
  };

  return (
    <Button variant="outline" onClick={handleSponsorClick} disabled={!username}>
      <HandCoinsIcon size={20} weight="bold" />
      <span>Sponsor</span>
    </Button>
  );
};
