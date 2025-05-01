'use client';

import { IPaymentMethodGetAllResponse } from '@repo/types';
import { Button, Card, CardContent, LoadingSpinner } from '@repo/ui/components';
import { useToast } from '@repo/ui/hooks';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { QUERY_KEYS, getUserPaymentMethods } from '@/lib/api';

import { MODALS, PaymentMethodModalProps } from '@/components';
import { PaymentMethodCard } from '@/components';
import { useModal, useSession } from '@/hooks';

export const UserSettingsPaymentMethodView = () => {
  const router = useRouter();
  const session = useSession();
  const modal = useModal();
  const toast = useToast();

  const paymentMethodQuery = useQuery<IPaymentMethodGetAllResponse, any>({
    queryKey: [QUERY_KEYS.USER_PAYMENT_METHODS, session?.username],
    queryFn: () => getUserPaymentMethods.queryFn(),
    enabled: !!session?.username,
    retry: 0,
  });

  const [paymentMethods, setPaymentMethods] =
    useState<IPaymentMethodGetAllResponse>({ data: [], results: 0 });

  const handlePaymentMethodCreate = () => {
    modal.open(MODALS.PAYMENT_METHOD_ADD, {
      onSubmit: () => {
        router.refresh();
        toast({ type: 'success', message: 'Payment method added' });
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
        setPaymentMethods(({ data, results }) => ({
          results: results >= 1 ? results - 1 : 0,
          data: data.filter((method) => method.id !== id),
        }));

        toast({ type: 'success', message: 'Payment method deleted' });
        router.refresh();
      },
    });
  };

  useEffect(() => {
    if (!paymentMethodQuery.isSuccess) return;
    setPaymentMethods({
      data:
        paymentMethodQuery.data?.data?.map((i) => ({ ...i, d: Date.now() })) ||
        [],
      results: paymentMethodQuery.data?.results || 0,
    });
  }, [paymentMethodQuery.data]);

  // cache modals
  useEffect(() => {
    modal.preload([MODALS.PAYMENT_METHOD_ADD, MODALS.PAYMENT_METHOD_DELETE]);
  }, [modal.preload]);

  return (
    <div className="flex flex-col">
      {paymentMethodQuery.isLoading ? (
        <LoadingSpinner />
      ) : paymentMethods.results ? (
        <div className="flex flex-col gap-2">
          {paymentMethods.data.map(({ label, id, last4 }, key) => (
            <PaymentMethodCard
              key={key}
              {...{ label, id, last4 }}
              onDelete={() => handlePaymentMethodDelete(id)}
            />
          ))}
          <div className="mt-2">
            <Button variant="secondary" onClick={handlePaymentMethodCreate}>
              Add payment method
            </Button>
          </div>
        </div>
      ) : (
        <Card>
          <CardContent>
            <span className="text-sm">
              You do not currently have any payment methods.
            </span>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
