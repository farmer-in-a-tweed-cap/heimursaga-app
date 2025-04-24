'use client';

import {
  Button,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/components';

import { ModalBaseProps } from './modal-provider';

export type ActionModalProps = {
  title?: string;
  message?: string;
  submit?: {
    buttonText?: string;
    onClick?: () => void;
  };
  cancel?: {
    buttonText?: string;
    onClick?: () => void;
  };
};

const ActionModal: React.FC<ModalBaseProps<ActionModalProps>> = ({
  props,
  close,
}) => {
  const {
    title = '',
    message = '',
    submit = { buttonText: 'Submit', onClick: () => {} },
    cancel = { buttonText: 'Discard', onClick: () => {} },
  } = props || {};

  const handleSubmit = () => {
    if (submit.onClick) {
      submit.onClick();
    }

    close();
  };

  const handleCancel = () => {
    if (cancel.onClick) {
      cancel.onClick();
    }

    close();
  };
  return (
    <>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>
      <div className="w-full h-full flex items-center space-x-2">
        <span>{message}</span>
      </div>
      <DialogFooter>
        {cancel && (
          <Button variant="outline" onClick={handleCancel}>
            {cancel.buttonText}
          </Button>
        )}
        {submit && <Button onClick={handleSubmit}>{submit.buttonText}</Button>}
      </DialogFooter>
    </>
  );
};

export default ActionModal;
