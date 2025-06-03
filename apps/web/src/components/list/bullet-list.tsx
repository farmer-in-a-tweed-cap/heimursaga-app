import { CheckIcon } from '@repo/ui/icons';
import { cn } from '@repo/ui/lib/utils';

type Props = {
  classNames?: {
    list?: string;
    icon?: string;
    item?: string;
  };
  items?: string[];
};

export const BulletList: React.FC<Props> = ({ items = [], classNames }) => (
  <ul className={cn('flex flex-col gap-2', classNames?.list)}>
    {items.map((item, key) => (
      <li
        key={key}
        className={cn(
          'flex flex-row items-center justify-start gap-3 text-gray-600 text-base font-normal',
          classNames?.item,
        )}
      >
        <div
          className={cn(
            'w-5 h-5 flex items-center justify-center rounded-full p-1',
            classNames?.icon,
          )}
        >
          <CheckIcon size={20} weight="bold" />
        </div>

        <span>{item}</span>
      </li>
    ))}
  </ul>
);
