'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { PlanExpiryPeriod } from '@repo/types';
import {
  Button,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  OverlayDisabled,
} from '@repo/ui/components';
import { useElements, useStripe } from '@stripe/react-stripe-js';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { apiClient } from '@/lib/api';

import {
  InfoModalProps,
  MODALS,
  StripeCardCvcInput,
  StripeCardExpiryInput,
  StripeCardNumberInput,
  StripeProvider,
} from '@/components';
import { useModal } from '@/hooks';
import { redirect, sleep, zodMessage } from '@/lib';
import { ROUTER } from '@/router';

type Props = {
  children?: React.ReactNode;
  onLoad?: () => void;
  onLoading?: (state: boolean) => void;
  onComplete?: (state: boolean) => void;
  onSubmit?: () => void;
};

enum StripeFieldKey {
  CARD = 'card',
  EXPIRY = 'expiry',
  CVC = 'cvc',
  ADDRESS = 'address',
}

type StripeField = {
  loaded: boolean;
  complete: boolean;
};

type StripeFieldState = {
  card: StripeField;
  expiry: StripeField;
  cvc: StripeField;
  address: StripeField;
};

const schema = z.object({
  name: z
    .string()
    .nonempty(zodMessage.required('name on card'))
    .max(20, zodMessage.string.max('name on card', 20)),
  postcode: z
    .string()
    .nonempty(zodMessage.required('postcode'))
    .max(10, zodMessage.string.max('postcode', 10)),
});

const FormComponent: React.FC<Props> = ({
  children,
  onLoad,
  onComplete,
  onLoading,
  onSubmit,
}) => {
  const router = useRouter();
  const modal = useModal();
  const stripe = useStripe();
  const stripeElements = useElements();

  const [state, setState] = useState<{
    validated: boolean;
    loading: boolean;
    stripe: StripeFieldState;
  }>({
    validated: false,
    loading: false,
    stripe: {
      card: { loaded: false, complete: false },
      expiry: { loaded: false, complete: false },
      cvc: { loaded: false, complete: false },
      address: { loaded: false, complete: false },
    },
  });

  const [loading, setLoading] = useState<boolean>(false);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      postcode: '',
    },
  });

  const stripeLoaded =
    state.stripe.card.loaded &&
    state.stripe.expiry.loaded &&
    state.stripe.cvc.loaded;

  const stripeComplete =
    form.formState.isValid &&
    state.stripe.card.complete &&
    state.stripe.expiry.complete &&
    state.stripe.cvc.complete;

  const handleSubmit = form.handleSubmit(
    async (values: z.infer<typeof schema>) => {
      try {
        const { name, postcode } = values;

        setLoading(true);

        if (!stripe || !stripeElements) {
          console.log('stripe not loaded');
          return;
        }

        // get payment details from stripe elements
        const stripeCardElement = stripeElements.getElement('cardNumber');

        if (!stripeCardElement) {
          console.log('stripe elements not complete');
          return;
        }

        // initiate a subscription plan upgrade checkout
        const { data: checkout, success } =
          await apiClient.checkoutSubscriptionPlanUpgrade({
            query: {},
            payload: {
              planId: 'premium',
              period: PlanExpiryPeriod.MONTH,
            },
          });

        if (success && checkout) {
          const { clientSecret } = checkout;

          if (!clientSecret) {
            modal.open<InfoModalProps>(MODALS.INFO, {
              props: {
                title: 'error',
                message: 'checkout failed',
              },
            });
            setLoading(false);
            return;
          }

          // confirm a stripe payment
          const stripePaymentResponse = await stripe.confirmCardPayment(
            clientSecret,
            {
              payment_method: {
                card: stripeCardElement,
                billing_details: {
                  name,
                  address: {
                    postal_code: postcode,
                    // country: billing.address.country || '',
                    // city: billing.address.city || '',
                    // postal_code: billing.address.postal_code || '',
                    // line1: billing.address.line1 || '',
                    // line2: billing.address.line2 || '',
                  },
                },
              },
            },
          );

          const stripePaymentCompleted =
            stripePaymentResponse.paymentIntent?.status === 'succeeded' ||
            false;

          // handle a stripe response
          if (stripePaymentResponse.paymentIntent) {
            switch (stripePaymentResponse.paymentIntent.status) {
              case 'succeeded':
                break;
              case 'requires_action':
                break;
            }
          }

          // handle a stripe error
          if (stripePaymentResponse.error) {
            modal.open<InfoModalProps>(MODALS.INFO, {
              props: {
                title: 'error',
                message: stripePaymentResponse.error.message,
              },
            });
            setLoading(false);
            return;
          }

          // complete the subscription plan upgrade
          if (stripePaymentCompleted) {
            await sleep(5000);
            redirect(ROUTER.PREMIUM);
            return;
          }
        } else {
          modal.open<InfoModalProps>(MODALS.INFO, {
            props: {
              title: 'error',
              message: 'checkout failed',
            },
          });
          setLoading(false);
        }
      } catch (e) {
        modal.open<InfoModalProps>(MODALS.INFO, {
          props: {
            title: 'error',
            message: 'something went wrong',
          },
        });
        setLoading(false);
      }
    },
  );

  const handleStripeFieldLoad = (field: StripeFieldKey) => {
    switch (field) {
      case StripeFieldKey.CARD:
        setState((prev) => ({
          ...prev,
          stripe: {
            ...prev.stripe,
            card: { ...prev.stripe.card, loaded: true },
          },
        }));
        break;
      case StripeFieldKey.EXPIRY:
        setState((prev) => ({
          ...prev,
          stripe: {
            ...prev.stripe,
            expiry: { ...prev.stripe.expiry, loaded: true },
          },
        }));
        break;
      case StripeFieldKey.CVC:
        setState((prev) => ({
          ...prev,
          stripe: {
            ...prev.stripe,
            cvc: { ...prev.stripe.cvc, loaded: true },
          },
        }));
        break;
      case StripeFieldKey.ADDRESS:
        setState((prev) => ({
          ...prev,
          stripe: {
            ...prev.stripe,
            address: { ...prev.stripe.address, loaded: true },
          },
        }));
        break;
      default:
        break;
    }
  };

  const handleStripeFieldChange = (
    field: StripeFieldKey,
    complete: boolean,
  ) => {
    switch (field) {
      case StripeFieldKey.CARD:
        setState((prev) => ({
          ...prev,
          stripe: {
            ...prev.stripe,
            card: { ...prev.stripe.card, complete },
          },
        }));
        break;
      case StripeFieldKey.EXPIRY:
        setState((prev) => ({
          ...prev,
          stripe: {
            ...prev.stripe,
            expiry: { ...prev.stripe.expiry, complete },
          },
        }));
        break;
      case StripeFieldKey.CVC:
        setState((prev) => ({
          ...prev,
          stripe: {
            ...prev.stripe,
            cvc: { ...prev.stripe.cvc, complete },
          },
        }));
        break;
      case StripeFieldKey.ADDRESS:
        setState((prev) => ({
          ...prev,
          stripe: {
            ...prev.stripe,
            address: { ...prev.stripe.address, complete },
          },
        }));
        break;
      default:
        break;
    }
  };

  useEffect(() => {
    if (onLoading) {
      onLoading(loading);
    }
  }, [loading]);

  useEffect(() => {
    if (stripeLoaded && onLoad) {
      onLoad();
    }
  }, [stripeLoaded]);

  useEffect(() => {
    if (onComplete) {
      if (stripeComplete) {
        onComplete(true);
      } else {
        onComplete(false);
      }
    }
  }, [stripeComplete]);

  useEffect(() => {
    setState((prev) => ({ ...prev, loading: true }));

    modal.preload([MODALS.INFO]);
  }, []);

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="w-full">
        <div className="relative py-4 w-full h-full flex items-center">
          {loading && <OverlayDisabled />}
          <div className="w-full flex flex-col gap-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name on card</FormLabel>
                  <FormControl>
                    <Input required maxLength={20} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div>
              <FormLabel>Card details</FormLabel>
              <div className="mt-2 flex flex-col gap-2">
                <StripeCardNumberInput
                  onReady={() => handleStripeFieldLoad(StripeFieldKey.CARD)}
                  onChange={({ complete }) =>
                    handleStripeFieldChange(StripeFieldKey.CARD, complete)
                  }
                />
                <div className="w-full flex flex-col sm:flex-row gap-2">
                  <StripeCardExpiryInput
                    onReady={() => handleStripeFieldLoad(StripeFieldKey.EXPIRY)}
                    onChange={({ complete }) =>
                      handleStripeFieldChange(StripeFieldKey.EXPIRY, complete)
                    }
                  />
                  <StripeCardCvcInput
                    onReady={() => handleStripeFieldLoad(StripeFieldKey.CVC)}
                    onChange={({ complete }) =>
                      handleStripeFieldChange(StripeFieldKey.CVC, complete)
                    }
                  />
                </div>
              </div>
            </div>
            <FormField
              control={form.control}
              name="postcode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Billing postcode</FormLabel>
                  <FormControl>
                    {/* <AddressElement
                        options={{
                          mode: 'shipping',
                          autocomplete: { mode: 'automatic' },
                        }}
                        onReady={() =>
                          handleStripeFieldLoad(StripeFieldKey.ADDRESS)
                        }
                        onChange={({ complete }) =>
                          handleStripeFieldChange(
                            StripeFieldKey.ADDRESS,
                            complete,
                          )
                        }
                      /> */}
                    <Input required maxLength={10} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
        <div className="flex mt-4">
          <Button type="submit" className="w-full" loading={loading}>
            Upgrade
          </Button>
        </div>
        {children && <div className="mt-4 flex flex-col">{children}</div>}
      </form>
    </Form>
  );
};

export const SubscriptionPlanUpgradeCheckoutForm: React.FC<Props> = (props) => (
  <StripeProvider>
    <FormComponent {...props} />
  </StripeProvider>
);
