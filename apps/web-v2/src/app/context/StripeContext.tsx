'use client';

/**
 * Stripe Context Provider
 * Provides Stripe Elements context for payment forms
 */

import { loadStripe, Stripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useTheme } from '@/app/context/ThemeContext';

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
  const { theme } = useTheme();
  const isDark = theme === 'dark';
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
              colorPrimary: '#4676ac',
              colorBackground: isDark ? '#2a2a2a' : '#ffffff',
              colorText: isDark ? '#e5e5e5' : '#202020',
              colorDanger: '#994040',
              fontFamily: 'Jost, system-ui, sans-serif',
              borderRadius: '0px',
            },
            rules: {
              '.Input': {
                backgroundColor: isDark ? '#3a3a3a' : '#ffffff',
                border: isDark ? '1px solid #616161' : '1px solid #b5bcc4',
              },
              '.Input:focus': {
                border: '1px solid #4676ac',
                boxShadow: '0 0 0 1px #4676ac',
              },
              '.Label': {
                color: isDark ? '#b5bcc4' : '#616161',
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
