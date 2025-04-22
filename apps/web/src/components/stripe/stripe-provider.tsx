'use client';

import { LoadingSpinner } from '@repo/ui/components';
import { Elements } from '@stripe/react-stripe-js';
import { Stripe, loadStripe } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';

import { ERROR_CODES } from '@/constants';

interface IStripeProviderProps {
  children: React.ReactNode;
}

const STRIPE_PK = process?.env?.NEXT_PUBLIC_STRIPE_PUBLIC_KEY as string;

export const StripeProvider: React.FC<IStripeProviderProps> = ({
  children,
}) => {
  const [stripe, setStripe] = useState<Stripe | null>(null);

  const [state, setState] = useState<{ success: boolean; loading: boolean }>({
    success: false,
    loading: true,
  });

  const { success, loading } = state;

  const handleStripeLoad = async () => {
    setState((state) => ({ ...state, loading: true }));

    await loadStripe(STRIPE_PK)
      .then((stripe) => {
        console.log('stripe is loaded');
        setStripe(stripe);
        setState((state) => ({ ...state, success: true, loading: false }));
      })
      .catch((e) => {
        console.log(`stripe is not loaded\n`, e);
        setState((state) => ({ ...state, success: false, loading: false }));
      });
  };

  useEffect(() => {
    handleStripeLoad();
  }, []);

  return loading ? (
    <LoadingSpinner />
  ) : success ? (
    <Elements
      stripe={stripe}
      options={{
        locale: 'en',
        appearance: {
          labels: 'above',
        },
        mode: 'setup',
        paymentMethodTypes: ['card'],
      }}
    >
      {children}
    </Elements>
  ) : (
    <>{ERROR_CODES.PAYMENT_FORM_NOT_LOADED}</>
  );
};
