import { Card } from '@repo/ui/components';
import Link from 'next/link';

type Props = {
  href?: string;
  id: string;
  title: string;
  waypointsCount: number;
};

export const TripCard: React.FC<Props> = ({
  href,
  id,
  title,
  waypointsCount = 0,
}) => {
  return (
    <Card className="p-4 box-border cursor-pointer hover:bg-gray-50">
      {href && <Link href={href} className="z-10 absolute inset-0"></Link>}
      <div className="flex flex-row gap-4 items-center">
        <div className="flex flex-col">
          <div className="flex flex-row gap-1">
            <span className="font-medium text-base">{title}</span>
          </div>
          <div>
            <span className="text-sm text-gray-600 font-normal">
              {waypointsCount} waypoints
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
};
