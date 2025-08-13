'use client';

import { Button, Tooltip, TooltipContent, TooltipTrigger } from '@repo/ui/components';
import { HandCoinsIcon } from '@repo/ui/icons';

import { MODALS } from '@/components';
import { useModal, useSession } from '@/hooks';
import { ROUTER } from '@/router';

type Props = {
  username?: string;
  disabled?: boolean;
};

export const SponsorButton: React.FC<Props> = ({ username, disabled = false }) => {
  const modal = useModal();
  const session = useSession();

  const handleSponsorClick = () => {
    if (!username || disabled) return;
    
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
    });
  };

  return (
    <Tooltip>
      <TooltipTrigger>
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleSponsorClick} 
          disabled={!username || disabled}
          className="!rounded-full !w-10 !h-10 !min-w-10 !min-h-10 !p-0"
        >
          <HandCoinsIcon size={20} weight="bold" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        Sponsor
      </TooltipContent>
    </Tooltip>
  );
};
