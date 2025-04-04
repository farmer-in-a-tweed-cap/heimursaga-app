'use client';

import { toast } from 'sonner';

type ToastProps = {
  type?: 'success' | 'message' | 'error';
  message: string;
};

export const useToast = () => {
  return (props: ToastProps) => {
    const { message, type = 'message' } = props;

    switch (type) {
      case 'message':
        toast.message(message);
        break;
      case 'success':
        toast.success(message);
        break;
      default:
        toast.message(message);
        break;
    }
  };
};
