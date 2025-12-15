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
          variant="ghost"
          size="sm"
          onClick={handleSponsorClick}
          disabled={!username || disabled}
          className="transition-all !rounded-full !w-10 !h-10 !min-w-10 !min-h-10 !p-0 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600 dark:active:bg-gray-500 dark:text-gray-300"
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
