'use client';

import { useState, useContext } from 'react';
import { UserRole } from '@repo/types';
import { ChatCircleTextIcon } from '@repo/ui/icons';
import { Button, Tooltip, TooltipContent, TooltipTrigger } from '@repo/ui/components';

import { SessionContext } from '@/contexts';
import { MessageComposer } from '@/components/message';

interface UserMessageButtonProps {
  username?: string;
}

export function UserMessageButton({ username }: UserMessageButtonProps) {
  const [showComposer, setShowComposer] = useState(false);
  const sessionContext = useContext(SessionContext);

  // If no session context, don't render the button
  if (!sessionContext) {
    return null;
  }

  const { session } = sessionContext;
  const logged = !!session;

  // Only show message button if:
  // 1. Current user is logged in and is Explorer Pro (CREATOR)
  // 2. Target user has a username
  // 3. Target user is not the current user
  if (
    !logged ||
    session?.role !== UserRole.CREATOR ||
    !username ||
    session?.username === username
  ) {
    return null;
  }

  return (
    <>
      <Tooltip>
        <TooltipTrigger>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowComposer(true)}
            className="!rounded-full !w-10 !h-10 !min-w-10 !min-h-10 !p-0"
          >
            <ChatCircleTextIcon size={20} weight="regular" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          Message
        </TooltipContent>
      </Tooltip>

      {/* Message Composer Modal */}
      {showComposer && (
        <MessageComposer
          recipientUsername={username}
          onClose={() => setShowComposer(false)}
        />
      )}
    </>
  );
}