'use client';

/**
 * Stripe Context Provider
 * Provides Stripe Elements context for payment forms
 */

import { loadStripe, Stripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Initialize Stripe with publishable key from environment
const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
if (!stripePublishableKey) {
  console.error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set. Payment features will not work.');
}
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : Promise.resolve(null);

interface StripeContextValue {
  stripe: Stripe | null;
  isLoading: boolean;
  error: string | null;
}

const StripeContext = createContext<StripeContextValue>({
  stripe: null,
  isLoading: true,
  error: null,
});

export function useStripeContext() {
  return useContext(StripeContext);
}

interface StripeProviderProps {
  children: ReactNode;
}

export function StripeProvider({ children }: StripeProviderProps) {
  const [stripe, setStripe] = useState<Stripe | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    stripePromise
      .then((stripeInstance) => {
        if (stripeInstance) {
          setStripe(stripeInstance);
        } else {
          setError('Failed to initialize Stripe');
        }
      })
      .catch((_err) => {
        setError('Failed to load Stripe');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const value: StripeContextValue = {
    stripe,
    isLoading,
    error,
  };

  return (
    <StripeContext.Provider value={value}>
      <Elements
        stripe={stripePromise}
        options={{
          appearance: {
            theme: 'stripe',
            variables: {
              colorPrimary: '#10b981', // emerald-500
              colorBackground: '#1f2937', // gray-800
              colorText: '#f9fafb', // gray-50
              colorDanger: '#ef4444', // red-500
              fontFamily: 'Inter, system-ui, sans-serif',
              borderRadius: '8px',
            },
            rules: {
              '.Input': {
                backgroundColor: '#374151', // gray-700
                border: '1px solid #4b5563', // gray-600
              },
              '.Input:focus': {
                border: '1px solid #10b981', // emerald-500
                boxShadow: '0 0 0 1px #10b981',
              },
              '.Label': {
                color: '#d1d5db', // gray-300
              },
            },
          },
        }}
      >
        {children}
      </Elements>
    </StripeContext.Provider>
  );
}

// Re-export Stripe hooks for convenience
export { useStripe, useElements, CardElement, PaymentElement } from '@stripe/react-stripe-js';
