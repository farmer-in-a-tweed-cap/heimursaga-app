import { Loader2 } from 'lucide-react';

type SpinnerProps = {
  size?: number;
};

export const Spinner: React.FC<SpinnerProps> = () => {
  return <Loader2 className="animate-spin" />;
};

Spinner.defaultProps = { size: 24 };
