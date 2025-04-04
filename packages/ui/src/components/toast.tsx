import { Toaster as Sonner } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

export const ToastProvider = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      expand={false}
      position="bottom-right"
      visibleToasts={1}
      closeButton={false}
      offset={{
        bottom: 20,
        right: 20,
      }}
      toastOptions={{
        classNames: {
          title: 'text-sm',
        },
      }}
      {...props}
    />
  );
};
