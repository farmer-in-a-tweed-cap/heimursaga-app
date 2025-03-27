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
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { fieldmsg } from '@/lib/utils';

import { StripeProvider } from '@/components';

import { IModalBaseProps } from './modal-provider';

const schema = z.object({
  name: z
    .string()
    .nonempty(fieldmsg.required('name on card'))
    .max(50, fieldmsg.max('name on card', 50)),
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

  const [state, setState] = useState<{
    validated: boolean;
    loading: boolean;
    stripe: {
      card: {
        loaded: boolean;
        complete: boolean;
      };
      expiry: {
        loaded: boolean;
        complete: boolean;
      };
      cvc: {
        loaded: boolean;
        complete: boolean;
      };
    };
  }>({
    validated: false,
    loading: false,
    stripe: {
      card: { loaded: false, complete: false },
      expiry: { loaded: false, complete: false },
      cvc: { loaded: false, complete: false },
    },
  });

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      postcode: '',
    },
  });

  const loading =
    !state.stripe.card.loaded ||
    !state.stripe.expiry.loaded ||
    !state.stripe.cvc.loaded;

  const completed =
    state.stripe.card.complete &&
    state.stripe.expiry.complete &&
    state.stripe.cvc.complete;

  const handleSubmit = form.handleSubmit(
    async (values: z.infer<typeof schema>) => {
      console.log(values);
    },
  );

  const handleStripeFieldLoad = (field: 'card' | 'expiry' | 'cvc') => {
    switch (field) {
      case 'card':
        setState((prev) => ({
          ...prev,
          stripe: {
            ...prev.stripe,
            card: { ...prev.stripe.card, loaded: true },
          },
        }));
        break;
      case 'expiry':
        setState((prev) => ({
          ...prev,
          stripe: {
            ...prev.stripe,
            expiry: { ...prev.stripe.expiry, loaded: true },
          },
        }));
        break;
      case 'cvc':
        setState((prev) => ({
          ...prev,
          stripe: {
            ...prev.stripe,
            cvc: { ...prev.stripe.cvc, loaded: true },
          },
        }));
        break;
      default:
        break;
    }
  };

  const handleStripeFieldChange = (
    field: 'card' | 'expiry' | 'cvc',
    complete: boolean,
  ) => {
    switch (field) {
      case 'card':
        setState((prev) => ({
          ...prev,
          stripe: {
            ...prev.stripe,
            card: { ...prev.stripe.card, complete },
          },
        }));
        break;
      case 'expiry':
        setState((prev) => ({
          ...prev,
          stripe: {
            ...prev.stripe,
            expiry: { ...prev.stripe.expiry, complete },
          },
        }));
        break;
      case 'cvc':
        setState((prev) => ({
          ...prev,
          stripe: {
            ...prev.stripe,
            cvc: { ...prev.stripe.cvc, complete },
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
      <div className="relative py-4 w-full h-full flex items-center">
        {loading && <LoadingOverlay />}
        <Form {...form}>
          <form onSubmit={handleSubmit} className="w-full">
            <div className="w-full flex flex-col gap-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name on card</FormLabel>
                    <FormControl>
                      <Input required maxLength={50} {...field} />
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
                    onReady={() => handleStripeFieldLoad('card')}
                    onChange={({ complete }) =>
                      handleStripeFieldChange('card', complete)
                    }
                  />
                  <div className="w-full flex flex-col sm:flex-row gap-2">
                    <CardExpiryElement
                      className="input"
                      onReady={() => handleStripeFieldLoad('expiry')}
                      onChange={({ complete }) =>
                        handleStripeFieldChange('expiry', complete)
                      }
                    />
                    <CardCvcElement
                      className="input"
                      onReady={() => handleStripeFieldLoad('cvc')}
                      onChange={({ complete }) =>
                        handleStripeFieldChange('cvc', complete)
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
                      <Input required maxLength={50} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </form>
        </Form>
      </div>
      <DialogFooter>
        <Button
          variant="secondary"
          disabled={loading}
          onClick={() => {
            close();
          }}
        >
          Cancel
        </Button>
        <Button
          variant="default"
          disabled={loading || !completed}
          onClick={onSubmit}
        >
          Add
        </Button>
      </DialogFooter>
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
