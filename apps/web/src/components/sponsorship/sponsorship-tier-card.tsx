import { Button, Card, CardContent } from '@repo/ui/components';

import { ROUTER } from '@/router';

type Props = {
  id?: string;
  price?: number;
  description?: string;
  username?: string;
};

export const SponsorshipTierCard: React.FC<Props> = ({
  id,
  price,
  description,
  username,
}) => {
  return (
    <Card>
      <CardContent>
        <div className="flex flex-col">
          <span className="text-lg font-medium">${price}/month</span>
          <p className="py-2 text-base font-normal">{description}</p>
          <div className="mt-4">
            <Button asChild>
              <a
                href={
                  id && username
                    ? ROUTER.CHECKOUT.MEMBERSHIP({ username, membershipId: id })
                    : '#'
                }
              >
                Join
              </a>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
