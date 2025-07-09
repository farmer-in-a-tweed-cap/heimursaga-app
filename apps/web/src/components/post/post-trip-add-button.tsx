import { Button, LoadingSpinner, Spinner } from '@repo/ui/components';
import { PathIcon, XIcon } from '@repo/ui/icons';

type Props = {
  trip?: {
    id: string;
    title: string;
  };
  loading?: boolean;
  disabled?: boolean;
  onAdd?: () => void;
  onRemove?: () => void;
};

export const PostTripAddButton: React.FC<Props> = ({
  trip,
  loading = false,
  onAdd,
  onRemove,
}) => {
  return (
    <div className="mt-1">
      {trip ? (
        <div className="relative bg-accent text-black py-1.5 px-3 rounded-full overflow-hidden flex flex-row gap-4 items-center justify-start">
          {loading && (
            <div className="absolute inset-0 z-20 bg-accent opacity-50 cursor-wait"></div>
          )}
          <div className="z-10 flex flex-row items-center justify-start gap-2 text-sm font-normal">
            <PathIcon weight="bold" size={18} />
            <span>{trip.title}</span>
          </div>
          <button type="button" className="z-10" onClick={onRemove}>
            {loading ? (
              <Spinner size={16} />
            ) : (
              <XIcon weight="bold" size={16} />
            )}
          </button>
        </div>
      ) : (
        <Button variant="secondary" size="sm" onClick={onAdd}>
          Add journey
        </Button>
      )}
    </div>
  );
};
