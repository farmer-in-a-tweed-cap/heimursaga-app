'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  LoadingOverlay,
} from '@repo/ui/components';
import {
  CardCvcElement,
  CardExpiryElement,
  CardNumberElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';
import { StripeError } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { apiClient } from '@/lib/api';
import { fieldmsg } from '@/lib/utils';

import { StripeProvider } from '@/components';

import { IModalBaseProps } from './modal-provider';

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
    .nonempty(fieldmsg.required('name on card'))
    .max(20, fieldmsg.max('name on card', 20)),
  postcode: z
    .string()
    .nonempty(fieldmsg.required('postcode'))
    .max(10, fieldmsg.max('postcode', 10)),
});

const PaymentMethodAddModal: React.FC<IModalBaseProps> = ({
  close,
  onSubmit,
  onCancel,
}) => {
  const stripe = useStripe();
  const stripeElements = useElements();

  const [loading, setLoading] = useState(false);

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
    state.stripe.card.complete &&
    state.stripe.expiry.complete &&
    state.stripe.cvc.complete;

  const handleCancel = () => {
    close();
    form.reset();
    if (onCancel) {
      onCancel();
    }
  };

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
        const elements = {
          card: stripeElements.getElement('cardNumber'),
          // address: stripeElements.getElement('address'),
        };

        if (!elements.card) {
          console.log('stripe element not created', elements);
          return;
        }

        // create a stripe payment setup
        const stripePaymentSetup = await apiClient
          .createStripeSetupIntent()
          .then(({ data }) => data);
        if (!stripePaymentSetup) {
          console.log('stripe setup intent not created');
          return;
        }

        console.log('stripe setup', stripePaymentSetup.secret);

        // confirm the stripe payment setup
        const stripeCardSetup = await stripe.confirmCardSetup(
          stripePaymentSetup.secret,
          {
            payment_method: {
              card: elements.card,
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
        const stripeError = stripeCardSetup.error as StripeError;
        const stripePaymentMethodId = stripeCardSetup.setupIntent
          ?.payment_method as string;

        // create a payment method
        if (stripePaymentMethodId) {
          const paymentMethod = await apiClient.createPaymentMethod({
            stripePaymentMethodId,
          });

          console.log('payment method', paymentMethod);
        }

        setLoading(false);
        close();

        if (onSubmit) {
          onSubmit();
        }

        console.log({ stripeError, stripePaymentMethodId });
      } catch (e) {
        console.log('on submit error', e);
      } finally {
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
    setState((prev) => ({ ...prev, loading: true }));
  }, []);

  return (
    <>
      <DialogHeader>
        <DialogTitle>Add payment method</DialogTitle>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={handleSubmit} className="w-full">
          <div className="relative py-4 w-full h-full flex items-center">
            {loading && <LoadingOverlay />}
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
                  <CardNumberElement
                    className="input !w-full"
                    options={{
                      showIcon: true,
                      placeholder: '0000 0000 0000 0000',
                    }}
                    onReady={() => handleStripeFieldLoad(StripeFieldKey.CARD)}
                    onChange={({ complete }) =>
                      handleStripeFieldChange(StripeFieldKey.CARD, complete)
                    }
                  />
                  <div className="w-full flex flex-col sm:flex-row gap-2">
                    <CardExpiryElement
                      className="input"
                      onReady={() =>
                        handleStripeFieldLoad(StripeFieldKey.EXPIRY)
                      }
                      onChange={({ complete }) =>
                        handleStripeFieldChange(StripeFieldKey.EXPIRY, complete)
                      }
                    />
                    <CardCvcElement
                      className="input"
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
          <DialogFooter>
            <Button
              variant="secondary"
              disabled={loading || !stripeLoaded}
              onClick={handleCancel}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="default"
              disabled={loading || !stripeLoaded || !stripeComplete}
              loading={loading}
            >
              Add
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
};

const PaymentMethodAddModalWithStripeProvider: React.FC<IModalBaseProps> = (
  props,
) => (
  <StripeProvider>
    <PaymentMethodAddModal {...props} />
  </StripeProvider>
);

export default PaymentMethodAddModalWithStripeProvider;
