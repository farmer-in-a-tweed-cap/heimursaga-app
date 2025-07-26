import { LinkIcon } from '@repo/ui/icons';
import { cn } from '@repo/ui/lib/utils';
import Link from 'next/link';

import { ActionMenu, ActionMenuItem } from '@/components';
import { dateformat, redirect } from '@/lib';
import { ROUTER } from '@/router';

type Props = {
  id: number;
  orderIndex: number;
  title: string;
  lat: number;
  lon: number;
  date: Date;
  post?: { id: string; title: string };
  onEdit?: TripWaypointCardClickHandler;
  onDelete?: TripWaypointCardClickHandler;
};

export type TripWaypointCardClickHandler = (id: number) => void;

export const TripWaypointCard: React.FC<Props> = ({
  id,
  orderIndex,
  title,
  date,
  post,
  onEdit,
  onDelete,
}) => {
  const waypointId = id;
  const actions: ActionMenuItem[] = [];

  // Check if waypoint date is today or in the past
  const isDatePastOrPresent = () => {
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    return date <= today;
  };

  if (!post && isDatePastOrPresent()) {
    actions.push({
      label: 'Log Entry',
      onClick: () => {
        // redirect to the post page
        if (waypointId) {
          redirect([ROUTER.ENTRIES.CREATE, `waypoint=${waypointId}`].join('?'));
        }
      },
    });
  }

  if (onEdit && !post) {
    actions.push({
      label: 'Edit',
      onClick: () => onEdit(id),
    });
  }

  if (onDelete) {
    actions.push({
      label: 'Remove',
      onClick: () => onDelete(id),
    });
  }

  return (
    <div className="w-full h-auto py-2 box-border border-b border-solid border-gray-100">
      <div className="flex flex-row gap-2 justify-between items-center">
        <div className="flex flex-row gap-2 justify-start items-start">
          <span
            className={cn(
              'w-6 h-6 text-sm font-medium flex items-center justify-center rounded-full',
              post ? 'bg-primary text-white' : 'bg-accent text-black',
            )}
          >
            {orderIndex}
          </span>
          <div className="flex flex-col gap-0 justify-start items-start">
            <div className="flex flex-row items-center justify-start gap-2 text-base font-medium text-black">
              {post ? (
                <Link href={ROUTER.ENTRIES.EDIT(post.id)} target="_blank">
                  {title}
                </Link>
              ) : (
                <span>{title}</span>
              )}
            </div>
            <span className="text-xs font-normal text-gray-500">
              {dateformat(date).format('MMM DD, YYYY')}
              {/* {lon.toFixed(4)}, {lat.toFixed(4)} */}
            </span>
          </div>
        </div>
        <div>
          <ActionMenu actions={actions} />
        </div>
      </div>
    </div>
  );
};
