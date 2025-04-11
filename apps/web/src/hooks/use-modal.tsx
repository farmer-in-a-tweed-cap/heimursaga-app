'use client';

import { useContext } from 'react';

import { ModalContext } from '@/components';

export function useModal() {
  const ctx = useContext(ModalContext);

  function open<T = any>(
    id: string,
    options?: {
      props?: T;
      onSubmit?: () => void;
      onCancel?: () => void;
    },
  ) {
    const { props, onSubmit, onCancel } = options || {};

    ctx.setContext({
      id,
      props,
      onSubmit,
      onCancel,
    });
  }

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
}
