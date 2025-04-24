'use client';

import {
  Button,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/components';

import { ModalBaseProps } from './modal-provider';

export type InfoModalProps = {
  title?: string;
  message?: string;
  buttonText?: string;
};

const InfoModal: React.FC<ModalBaseProps<InfoModalProps>> = ({
  props,
  close,
}) => {
  const { title = '', message = '', buttonText = 'OK' } = props || {};
  return (
    <>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>
      <div className="w-full h-full flex items-center space-x-2">
        <span>{message}</span>
      </div>
      <DialogFooter>
        <Button
          variant="outline"
          onClick={() => {
            close();
          }}
        >
          {buttonText}
        </Button>
      </DialogFooter>
    </>
  );
};

export default InfoModal;
