'use client';

import { Button } from '@repo/ui/components';
import { HandCoinsIcon } from '@repo/ui/icons';

import { MODALS } from '@/components';
import { useModal, useSession } from '@/hooks';
import { ROUTER } from '@/router';

type Props = {
  username?: string;
};

export const SponsorButton: React.FC<Props> = ({ username }) => {
  const modal = useModal();
  const session = useSession();

  const handleSponsorClick = () => {
    if (!username) return;
    
    // Check if user's email is verified
    if (!session?.isEmailVerified) {
      // Redirect to settings/security page for email verification
      window.location.href = ROUTER.USER.SETTINGS.PAGE_KEY('security');
      return;
    }
    
    // Only open modal if email is verified
    modal.open(MODALS.SPONSOR_CHECKOUT, {
      props: { 
        username,
        isEmailVerified: session?.isEmailVerified 
      },
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
