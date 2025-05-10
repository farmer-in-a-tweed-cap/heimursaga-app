import { ActionMenu, ActionMenuItem } from '@/components';
import { dateformat } from '@/lib';

type Props = {
  id: string;
  orderIndex: number;
  title: string;
  lat: number;
  lon: number;
  date: Date;
  onEdit?: TripWaypointCardClickHandler;
  onDelete?: TripWaypointCardClickHandler;
};

export type TripWaypointCardClickHandler = (id: string) => void;

export const TripWaypointCard: React.FC<Props> = ({
  id,
  orderIndex,
  title,
  lat,
  lon,
  date,
  onEdit,
  onDelete,
}) => {
  const actions: ActionMenuItem[] = [];

  if (onEdit) {
    actions.push({
      label: 'Edit',
      onClick: () => onEdit(id),
    });
  }

  if (onDelete) {
    actions.push({
      label: 'Delete',
      onClick: () => onDelete(id),
    });
  }

  return (
    <div className="w-full h-auto py-2 box-border border-b border-solid border-gray-100">
      <div className="flex flex-row gap-2 justify-between items-center">
        <div className="flex flex-row gap-2 justify-start items-start">
          <span className="w-6 h-6 bg-accent text-black text-sm font-medium flex items-center justify-center rounded-full">
            {orderIndex}
          </span>
          <div className="flex flex-col gap-0 justify-start items-start">
            <span className="text-base font-medium text-black">{title}</span>
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
