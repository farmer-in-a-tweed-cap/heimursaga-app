import { Loader2 } from 'lucide-react';

import { cn } from './../lib/utils';

type SpinnerProps = {
  className?: string;
  size?: number;
};

export const Spinner: React.FC<SpinnerProps> = ({ size = 20, className }) => {
  return <Loader2 size={size} className={cn('animate-spin', className)} />;
};

export const LoadingSpinner: React.FC<SpinnerProps> = () => (
  <div className="w-full h-full flex flex-row justify-center items-center p-6">
    <Spinner />
  </div>
);

type LoadingOverlayProps = {};

export const LoadingOverlay: React.FC<LoadingOverlayProps> = () => (
  <div className="z-50 absolute inset-0 flex items-center justify-center">
    <div className="z-30 absolute inset-0 bg-white dark:bg-black opacity-60"></div>
    <Spinner className="z-40" />
  </div>
);

export const OverlayDisabled: React.FC = () => (
  <div className="z-50 absolute inset-0 flex items-center justify-center">
    <div className="z-30 absolute inset-0 bg-white dark:bg-black opacity-60"></div>
  </div>
);
