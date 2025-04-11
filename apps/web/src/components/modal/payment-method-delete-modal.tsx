'use client';

import {
  Button,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/components';
import { useState } from 'react';

import { apiClient } from '@/lib/api';

import { ModalBaseProps } from './modal-provider';

export type PaymentMethodModalProps = {
  paymentMethodId: string;
};

const PaymentMethodDeleteModal: React.FC<
  ModalBaseProps<PaymentMethodModalProps>
> = ({ props, close, onSubmit, onCancel }) => {
  const [loading, setLoading] = useState(false);

  const { paymentMethodId } = props || {};

  const handleSubmit = async () => {
    if (paymentMethodId) {
      try {
        setLoading(true);

        const response = await apiClient.deletePaymentMethod({
          query: { id: paymentMethodId },
        });

        if (response.success) {
          close();
          if (onSubmit) {
            onSubmit();
          }
        }
      } catch (e) {
        setLoading(false);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleCancel = () => {
    close();
    if (onCancel) {
      onCancel();
    }
  };
  return (
    <>
      <DialogHeader>
        <DialogTitle>Delete payment method</DialogTitle>
      </DialogHeader>
      <div className="w-full h-full flex items-center space-x-2">
        <span>Are you sure you want to delete this payment method?</span>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={handleCancel}>
          Cancel
        </Button>
        <Button loading={loading} onClick={handleSubmit}>
          Delete
        </Button>
      </DialogFooter>
    </>
  );
};

export default PaymentMethodDeleteModal;
