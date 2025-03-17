'use client';

type ToastProps = {
  message?: string;
};

// @todo
export const useToast = () => {
  return (props: ToastProps) => {
    const { message } = props;

    // @ts-ignore
    alert(message);
  };
};
