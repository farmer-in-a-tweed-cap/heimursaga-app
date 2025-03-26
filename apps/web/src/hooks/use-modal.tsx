'use client';

import { useContext } from 'react';

import { ModalContext } from '@/components';

export const useModal = () => {
  const ctx = useContext(ModalContext);

  const open = (
    id: string,
    options?: {
      onSubmit?: () => void;
      onCancel?: () => void;
    },
  ) => {
    ctx.setContext({
      id,
      onSubmit: options?.onSubmit,
      onCancel: options?.onCancel,
    });
  };

  const close = () => {
    ctx.setContext({ id: null });
  };

  const preload = (modalIds: string[]) => {
    ctx.preload(modalIds);
  };

  return {
    id: ctx.context?.id,
    open,
    close,
    preload,
  };
};
