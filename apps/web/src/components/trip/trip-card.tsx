import { UserBar } from '../user';
import { ITripDetail } from '@repo/types';
import { Card, CardContent } from '@repo/ui/components';
import { cn } from '@repo/ui/lib/utils';
import Link from 'next/link';

import { dateformat } from '@/lib';

type Props = {
  href?: string;
  userbar?: boolean;
  onClick?: () => void;
} & ITripDetail;

export const TripCard: React.FC<Props & { variant: 'public' | 'private' }> = ({
  variant = 'public',
  ...props
}) => {
  switch (variant) {
    case 'public':
      return <TripPublicCard {...props} />;
    case 'private':
      return <TripPrivateCard {...props} />;
  }
};

const TripPublicCard: React.FC<Props> = ({
  href,
  title,
  startDate,
  endDate,
  author,
  userbar,
  onClick,
  waypoints,
}) => {
  const formatDate = (date: Date | undefined) => {
    if (!date) return '';
    return dateformat(date).format('MMM DD, YYYY');
  };

  const calculateDateRangeFromWaypoints = () => {
    if (!waypoints || waypoints.length === 0) return { start: null, end: null };
    
    const dates = waypoints
      .map(wp => wp.date)
      .filter((date): date is Date => date !== undefined && date !== null)
      .map(date => new Date(date))
      .sort((a, b) => a.getTime() - b.getTime());
    
    if (dates.length === 0) return { start: null, end: null };
    
    return {
      start: dates[0],
      end: dates[dates.length - 1]
    };
  };

  const getDateRange = () => {
    // First try to calculate from waypoints if available
    const waypointDates = calculateDateRangeFromWaypoints();
    
    if (waypointDates.start && waypointDates.end) {
      const start = formatDate(waypointDates.start);
      const end = formatDate(waypointDates.end);
      if (start === end) {
        return start; // Same date, show only once
      }
      return `${start} - ${end}`;
    }
    
    // Fallback to trip's stored dates
    if (startDate || endDate) {
      const start = formatDate(startDate);
      const end = formatDate(endDate);
      if (start && end) {
        if (start === end) {
          return start; // Same date, show only once
        }
        return `${start} - ${end}`;
      } else if (start) {
        return start;
      } else if (end) {
        return end;
      }
    }
    return '';
  };
  return (
    <Card>
      <CardContent>
        {href ? (
          <Link href={href} className="z-10 absolute inset-0"></Link>
        ) : onClick ? (
          <div
            className="z-10 absolute inset-0 cursor-pointer"
            onClick={onClick}
          ></div>
        ) : (
          <></>
        )}
        <div className="relative flex flex-row justify-between items-center">
          <div className="w-auto flex flex-row justify-start items-center gap-3 z-20">
            {userbar && (
              <UserBar
                name={author?.username}
                picture={author?.picture}
                creator={author?.creator}
                text={getDateRange() || 'Journey'}
              />
            )}
          </div>
        </div>
        <div className="flex flex-col gap-1 justify-start items-start">
          <span className="font-medium text-lg text-black">{title}</span>
          <span className="text-xs text-gray-500">
            {getDateRange() || 'No date range'}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

const TripPrivateCard: React.FC<Props> = ({
  href,
  title = 'trip',
  startDate,
  endDate,
}) => {
  const formatDate = (date: Date | undefined) => {
    if (!date) return '';
    return dateformat(date).format('MMM DD, YYYY');
  };

  const getDateRange = () => {
    if (startDate || endDate) {
      const start = formatDate(startDate);
      const end = formatDate(endDate);
      if (start && end) {
        return `${start} - ${end}`;
      } else if (start) {
        return start;
      } else if (end) {
        return end;
      }
    }
    return '';
  };
  return (
    <Card>
      {href && <Link href={href} className="z-10 absolute inset-0"></Link>}
      <CardContent>
        <div className="flex flex-col gap-1 justify-start items-start">
          <span className="font-medium text-lg text-black">{title}</span>
          <span className="text-xs text-gray-500">
            {getDateRange() || 'No date range'}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};
