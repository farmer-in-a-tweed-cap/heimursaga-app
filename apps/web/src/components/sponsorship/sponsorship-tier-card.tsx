import { Button, Card, CardContent } from '@repo/ui/components';

import { ROUTER } from '@/router';

type Props = {
  id?: string;
  price?: number;
  description?: string;
  username?: string;
};

// @todo
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
          <span className="text-base font-medium">${price}/month</span>
          <p className="py-2 text-sm font-normal">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
};
