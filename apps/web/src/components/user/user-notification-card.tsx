import { UserNotificationContext, SponsorshipType } from '@repo/types';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  BadgeDot,
  Card,
  CardContent,
} from '@repo/ui/components';
import Link from 'next/link';

import { dateformat } from '@/lib/date-format';

import { ROUTER } from '@/router';

type Props = {
  context: string;
  mentionUser: { username: string; picture: string };
  postId?: string;
  date: Date;
  read?: boolean;
  body?: string;
  sponsorshipType?: string;
  sponsorshipAmount?: number;
  sponsorshipCurrency?: string;
};

export const UserNotificationCard: React.FC<Props> = ({
  context,
  mentionUser,
  date,
  postId,
  read = false,
  body,
  sponsorshipType,
  sponsorshipAmount,
  sponsorshipCurrency,
}) => {
  const notification: { mention: string; text: string; url?: string } = {
    mention: '',
    text: '',
  };

  switch (context) {
    case UserNotificationContext.LIKE:
      notification.mention = mentionUser.username;
      notification.text = 'highlighted your entry';
      if (postId) {
        notification.url = ROUTER.ENTRIES.DETAIL(postId);
      }
      break;
    case UserNotificationContext.FOLLOW:
      notification.mention = mentionUser.username;
      notification.text = 'followed you';
      if (mentionUser?.username) {
        notification.url = ROUTER.USERS.DETAIL(mentionUser?.username);
      }
      break;
    case UserNotificationContext.COMMENT: {
      notification.mention = mentionUser.username;
      let commentText = 'commented on your entry';
      if (body) {
        commentText += `: "${body}"`;
      }
      notification.text = commentText;
      if (postId) {
        notification.url = ROUTER.ENTRIES.DETAIL(postId);
      }
      break;
    }
    case UserNotificationContext.COMMENT_REPLY: {
      notification.mention = mentionUser.username;
      let replyText = 'replied to your comment';
      if (body) {
        replyText += ` on "${body}"`;
      }
      notification.text = replyText;
      if (postId) {
        notification.url = ROUTER.ENTRIES.DETAIL(postId);
      }
      break;
    }
    case UserNotificationContext.SPONSORSHIP: {
      notification.mention = mentionUser.username;

      // Build the sponsorship text with message and type/amount info
      let sponsorshipText = 'has sponsored you';
      if (body) {
        sponsorshipText += `: "${body}"`;
      }

      // Add sponsorship type and amount information
      if (sponsorshipType && sponsorshipAmount) {
        const amount = (sponsorshipAmount / 100).toFixed(2); // Convert from cents to dollars
        const currency = sponsorshipCurrency || 'USD';

        if (sponsorshipType === SponsorshipType.SUBSCRIPTION) {
          sponsorshipText += ` (monthly subscription: $${amount} ${currency})`;
        } else if (sponsorshipType === SponsorshipType.ONE_TIME_PAYMENT) {
          sponsorshipText += ` (one-time payment: $${amount} ${currency})`;
        }
      }

      notification.text = sponsorshipText;
      if (mentionUser?.username) {
        notification.url = ROUTER.USERS.DETAIL(mentionUser?.username);
      }
      break;
    }
  }

  return (
    <Card>
      <CardContent className={`p-4 box-border cursor-pointer hover:bg-gray-50 ${read ? 'opacity-60' : ''}`}>
        {notification.url && (
          <Link
            href={notification.url}
            className="z-10 absolute inset-0"
          ></Link>
        )}
        <div className="flex flex-row gap-4 items-center">
          <Link
            href={ROUTER.USERS.DETAIL(mentionUser?.username)}
            className="z-20"
          >
            <Avatar className="w-[40px] h-[40px]">
              <AvatarImage src={mentionUser?.picture} className="object-cover w-full h-full" />
              <AvatarFallback>
                {mentionUser?.username?.slice(0, 1)}
              </AvatarFallback>
            </Avatar>
          </Link>
          <div className="flex flex-col">
            <div className="flex flex-row gap-1">
              <span className="font-normal text-base">
                {notification.mention} {notification.text}
              </span>
            </div>

            <span className="text-xs font-normal text-gray-700">
              {dateformat(date).isToday()
                ? dateformat(date).format('HH:mm')
                : dateformat(date).format('MMM DD')}
            </span>
          </div>
        </div>
        <div className="absolute top-4 right-4">{!read && <BadgeDot />}</div>
      </CardContent>
    </Card>
  );
};
