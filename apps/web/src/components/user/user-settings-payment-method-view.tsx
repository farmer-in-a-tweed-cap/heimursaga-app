'use client';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  LoadingSpinner,
} from '@repo/ui/components';
import { useToast } from '@repo/ui/hooks';
import { TrashIcon } from '@repo/ui/icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { QUERY_KEYS, apiClient } from '@/lib/api';

import { MODALS, PaymentMethodModalProps } from '@/components';
import { useModal, useSession } from '@/hooks';
import { LOCALES } from '@/locales';

export const UserSettingsPaymentMethodView = () => {
  const session = useSession();
  const modal = useModal();
  const toast = useToast();

  const paymentMethodQuery = useQuery({
    queryKey: [QUERY_KEYS.USER_PAYMENT_METHODS],
    queryFn: () => apiClient.getUserPaymentMethods().then(({ data }) => data),
    enabled: !!session?.username,
    retry: 0,
  });

  const paymentMethods = paymentMethodQuery.data?.data || [];
  const paymentMethodResults = paymentMethodQuery.data?.results || 0;
  const paymentMethodLoading = paymentMethodQuery.isLoading;

  const handlePaymentMethodCreate = () => {
    modal.open(MODALS.PAYMENT_METHOD_ADD, {
      onSubmit: () => {
        toast({
          type: 'success',
          message: LOCALES.APP.PAYMENT_METHOD.PAYMENT_METHOD_ADDED,
        });

        paymentMethodQuery.refetch();
      },
      onCancel: () => {},
    });
  };

  const handlePaymentMethodDelete = (id: string) => {
    modal.open<PaymentMethodModalProps>(MODALS.PAYMENT_METHOD_DELETE, {
      props: {
        paymentMethodId: id,
      },
      onSubmit: () => {
        toast({
          type: 'success',
          message: LOCALES.APP.PAYMENT_METHOD.PAYMENT_METHOD_REMOVED,
        });

        paymentMethodQuery.refetch();
      },
    });
  };

  // cache modals
  useEffect(() => {
    modal.preload([MODALS.PAYMENT_METHOD_ADD, MODALS.PAYMENT_METHOD_DELETE]);
  }, [modal.preload]);

  return paymentMethodLoading ? (
    <LoadingSpinner />
  ) : paymentMethodResults ? (
    <Card>
      <CardHeader>
        <CardTitle>Payment methods</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col">
          {paymentMethods.map(({ label, id }, key) => (
            <div
              key={key}
              className="w-full flex flex-row justify-between items-center py-4 border-b border-solid border-accent"
            >
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium">{label}</span>{' '}
                <Badge variant="secondary">Card</Badge>
              </div>
              <Button
                variant="icon"
                onClick={() => handlePaymentMethodDelete(id)}
              >
                <TrashIcon size={14} />
              </Button>
            </div>
          ))}
          <div className="mt-6">
            <Button variant="secondary" onClick={handlePaymentMethodCreate}>
              Add payment method
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  ) : (
    <Card>
      <CardContent>
        <span className="text-sm">
          {LOCALES.APP.PAYMENT_METHOD.NO_PAYMENT_METHODS_FOUND}
        </span>
        <div className="mt-6">
          <Button variant="secondary" onClick={handlePaymentMethodCreate}>
            Add payment method
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
