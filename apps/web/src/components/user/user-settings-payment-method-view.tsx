'use client';

import { MODALS } from '../modal';
import { Button } from '@repo/ui/components';
import { useEffect } from 'react';

import { useModal } from '@/hooks';

export const UserSettingsPaymentMethodView = () => {
  const modal = useModal();

  const handlePaymentMethodAddClick = () => {
    modal.open(MODALS.PAYMENT_METHOD_ADD, {
      onSubmit: () => {
        alert('submit');
      },
      onCancel: () => {},
    });
  };

  useEffect(() => {
    modal.preload([MODALS.PAYMENT_METHOD_ADD]);
  }, [modal.preload]);

  return (
    <div className="flex flex-col">
      <span className="text-sm">
        You do not currently have any payment methods.
      </span>
      <div className="mt-4">
        <Button variant="secondary" onClick={handlePaymentMethodAddClick}>
          Add payment method
        </Button>
      </div>
    </div>
  );
};
