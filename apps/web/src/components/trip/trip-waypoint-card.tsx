import { ActionMenu, ActionMenuItem } from '@/components';

type Props = {
  id: string;
  orderIndex: number;
  title: string;
  lat: number;
  lon: number;
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
    <div className="w-full h-auto py-4 box-border border-b border-solid border-gray-100">
      <div className="flex flex-row gap-2 justify-between items-center">
        <div className="flex flex-row gap-2 justify-start items-center">
          <span className="w-6 h-6 bg-accent text-black flex items-center justify-center rounded-full">
            {orderIndex}
          </span>
          <span className="text-base font-medium text-black">{title}</span>
        </div>
        <div>
          <ActionMenu actions={actions} />
        </div>
      </div>
    </div>
  );
};
