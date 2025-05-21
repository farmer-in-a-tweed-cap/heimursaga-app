'use client';

import { CurrencyCode, SponsorshipType } from '@repo/types';
import { Badge, Card, CardContent, CardHeader } from '@repo/ui/components';
import Link from 'next/link';

import { UserBar } from '@/components';
import { CURRENCY_SYMBOLS } from '@/constants';
import { getCurrencySymbol } from '@/lib';
import { ROUTER } from '@/router';

type Props = {
  id?: string;
  type?: string;
  amount?: number;
  currency?: string;
  user?: {
    username: string;
    name: string;
    picture: string;
  };
};

export const CreatorSponsorshipCard: React.FC<Props> = ({
  id,
  type,
  amount,
  currency,
  user,
}) => {
  const currencySymbol = currency
    ? getCurrencySymbol(currency)
    : getCurrencySymbol(CurrencyCode.USD);

  const sponsorshipTypeLabel =
    type === SponsorshipType.SUBSCRIPTION ? 'subscription' : 'one-time';

  return (
    <Card className="cursor-pointer hover:bg-gray-50">
      <Link href={user?.username ? ROUTER.USERS.DETAIL(user?.username) : '#'}>
        <CardContent className="flex flex-row justify-between items-start">
          <div className="flex flex-col justify-start items-start gap-1">
            {user && <span>{user.name}</span>}
            <div className="flex flex-row text-base font-medium">
              <span>{currencySymbol}</span>
              <span>{amount}</span>
            </div>
          </div>
          <Badge variant="outline">{sponsorshipTypeLabel}</Badge>
        </CardContent>
      </Link>
    </Card>
  );
};
