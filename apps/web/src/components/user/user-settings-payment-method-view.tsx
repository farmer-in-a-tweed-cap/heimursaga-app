'use client';

import { MODALS } from '../modal';
import { IPaymentMethodGetAllResponse } from '@repo/types';
import { Button, Card, CardContent, LoadingSpinner } from '@repo/ui/components';
import { useToast } from '@repo/ui/hooks';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { QUERY_KEYS, getUserPaymentMethods } from '@/lib/api';

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

  const paymentMethods = paymentMethodQuery.data?.data || [];
  const paymentMethodsCount = paymentMethodQuery.data?.results || 0;

  const handlePaymentMethodAddClick = () => {
    modal.open(MODALS.PAYMENT_METHOD_ADD, {
      onSubmit: () => {
        router.refresh();
        toast({ type: 'success', message: 'Payment method added' });
      },
      onCancel: () => {},
    });
  };

  useEffect(() => {
    modal.preload([MODALS.PAYMENT_METHOD_ADD]);
  }, [modal.preload]);

  return (
    <div className="flex flex-col">
      {paymentMethodQuery.isLoading ? (
        <LoadingSpinner />
      ) : paymentMethodsCount ? (
        <div className="flex flex-col gap-4">
          {paymentMethods.map(({ label, id, last4 }, key) => (
            <PaymentMethodCard
              key={key}
              {...{ label, id, last4 }}
              onDelete={() => {
                alert(`delete ${id}`);
              }}
            />
          ))}
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
      <div className="mt-4">
        <Button variant="secondary" onClick={handlePaymentMethodAddClick}>
          Add payment method
        </Button>
      </div>
    </div>
  );
};
