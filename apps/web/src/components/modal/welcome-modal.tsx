'use client';

import {
  Button,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/components';

import { ModalBaseProps } from './modal-provider';

// @todo
const WelcomeModal: React.FC<ModalBaseProps> = ({
  close,
  onSubmit,
  onCancel,
}) => {
  return (
    <>
      <DialogHeader>
        <DialogTitle>welcome</DialogTitle>
      </DialogHeader>
      <div className="w-full h-full flex items-center space-x-2"></div>
      <DialogFooter>
        <Button
          variant="outline"
          onClick={() => {
            close();
          }}
        >
          cancel
        </Button>
        <Button variant="default" onClick={onSubmit}>
          submit
        </Button>
      </DialogFooter>
    </>
  );
};

export default WelcomeModal;
