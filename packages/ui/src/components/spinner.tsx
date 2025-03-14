import { Loader2 } from 'lucide-react';

type SpinnerProps = {};

export const Spinner: React.FC<SpinnerProps> = () => {
  return <Loader2 className="animate-spin" />;
};
