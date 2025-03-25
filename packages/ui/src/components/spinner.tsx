import { Loader2 } from 'lucide-react';

import { cn } from './../lib/utils';

type SpinnerProps = {
  className?: string;
};

export const Spinner: React.FC<SpinnerProps> = ({ className }) => {
  return <Loader2 className={cn('animate-spin', className)} />;
};
