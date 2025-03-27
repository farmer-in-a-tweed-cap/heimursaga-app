'use client';

import { Elements } from '@stripe/react-stripe-js';
import { Stripe, loadStripe } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';

interface IStripeProviderProps {
  children: React.ReactNode;
}

const STRIPE_PK = process?.env?.NEXT_PUBLIC_STRIPE_PUBLIC_KEY as string;

export const StripeProvider: React.FC<IStripeProviderProps> = ({
  children,
}) => {
  const [stripe, setStripe] = useState<Stripe | null>(null);

  useEffect(() => {
    loadStripe(STRIPE_PK)
      .then((stripe) => {
        setStripe(stripe);
        console.log('stripe is loaded');
      })
      .catch((e) => {
        console.log(`stripe is not loaded\n`, e);
      });
  }, []);

  return stripe ? (
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
    <></>
  );
};
