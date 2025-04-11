import { Badge, Button, Card, CardContent } from '@repo/ui/components';
import { Trash2Icon } from 'lucide-react';

type Props = {
  id: string;
  label: string;
  last4?: string;
  onDelete?: (id: string) => void;
};

export const PaymentMethodCard: React.FC<Props> = ({ id, label, onDelete }) => {
  const handleDelete = () => {
    if (id && onDelete) {
      onDelete(id);
    }
  };
  return (
    <Card>
      <CardContent>
        <div className="w-full flex flex-row justify-between items-center">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium">{label}</span>{' '}
            <Badge variant="secondary">Card</Badge>
          </div>
          <Button variant="icon" onClick={handleDelete}>
            <Trash2Icon size={14} />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
