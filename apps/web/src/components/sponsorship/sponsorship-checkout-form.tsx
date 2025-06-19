'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ISponsorshipTier, SponsorshipType } from '@repo/types';
import {
  Button,
  ChipGroup,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  NumberInput,
  SelectInput,
} from '@repo/ui/components';
import { CreditCardIcon, LockSimpleIcon } from '@repo/ui/icons';
import { useStripe } from '@stripe/react-stripe-js';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { apiClient } from '@/lib/api';
import { dateformat } from '@/lib/date-format';

import {
  InfoModalProps,
  MODALS,
  SponsorshipTierCard,
  StripeProvider,
} from '@/components';
import { useModal } from '@/hooks';
import { redirect, zodMessage } from '@/lib';
import { LOCALES } from '@/locales';
import { ROUTER } from '@/router';

type Props = {
  username?: string;
  sponsorship?: ISponsorshipTier;
  paymentMethods?: { id: string; label: string }[];
};

const PAYMENT_METHOD_TYPES = {
  CARD: 'card',
  PAYPAL: 'paypal',
};

const DATA = {
  PAYMENT_METHOD_TYPES: [
    {
      label: 'Card',
      icon: () => <CreditCardIcon />,
      value: PAYMENT_METHOD_TYPES.CARD,
    },
  ],
  SPONSORSHIP_OPTIONS: [
    { label: 'One-time', value: SponsorshipType.ONE_TIME_PAYMENT },
    { label: 'Monthly', value: SponsorshipType.SUBSCRIPTION },
  ],
};

const schema = z.object({
  oneTimePaymentAmount: z
    .number({
      invalid_type_error: zodMessage.number.invalid('one time payment'),
    })
    .min(5, zodMessage.number.min('one time payment', 5))
    .max(500, zodMessage.number.max('one time payment', 500))
    .positive(zodMessage.number.positive('one time payment')),
  paymentMethodId: z
    .string()
    .nonempty(zodMessage.required('payment method'))
    .min(2, zodMessage.string.min('payment method', 2))
    .max(20, zodMessage.string.max('payment method', 20)),
});

export const FormComponent: React.FC<Props> = ({
  username,
  sponsorship,
  paymentMethods = [],
}) => {
  const stripe = useStripe();
  const modal = useModal();

  const [loading, setLoading] = useState<{
    form: boolean;
    paymentMethods: boolean;
  }>({ form: false, paymentMethods: true });

  const [state, setState] = useState<{
    sponsorshipType: string;
    paymentMethodType: string;
    paymentMethodId?: string;
    paymentMethods: { id: string; label: string }[];
  }>({
    sponsorshipType: SponsorshipType.ONE_TIME_PAYMENT,
    paymentMethodType: PAYMENT_METHOD_TYPES.CARD,
    paymentMethods,
  });

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      oneTimePaymentAmount: 5,
      paymentMethodId:
        paymentMethods.length >= 1 ? paymentMethods[0].id : undefined,
    },
  });

  const { sponsorshipType, paymentMethodType } = state;

  const oneTimePaymentAmount = form.watch('oneTimePaymentAmount') || 0;
  const paymentMethodId = form.watch('paymentMethodId');
  const sponsorshipEnabled = !!sponsorship;
  const sponsorshipMonthlyAmount = sponsorship?.price || 0;
  const currency = { symbol: '$' };
  const payButtonEnabled = !!stripe && !!paymentMethodId;

  const handleSponsorshipTypeSelect = (sponsorshipType: string) => {
    setState((state) => ({ ...state, sponsorshipType }));
  };

  const handleSubmit = form.handleSubmit(
    async (values: z.infer<typeof schema>) => {
      try {
        if (!stripe || !username) return;

        setLoading((loading) => ({ ...loading, form: true }));

        const { sponsorshipType } = state;
        const sponsorshipTierId = sponsorship?.id;
        const { oneTimePaymentAmount, paymentMethodId } = values;
        const creatorId = username;

        console.log('submit:', {
          creatorId,
          oneTimePaymentAmount,
          sponsorshipTierId,
          sponsorshipType,
          paymentMethodId,
        });

        // initiate a checkout
        const checkout = await apiClient.sponsorCheckout({
          query: {},
          payload:
            sponsorshipType === SponsorshipType.SUBSCRIPTION
              ? {
                  creatorId,
                  sponsorshipType,
                  sponsorshipTierId,
                  paymentMethodId,
                }
              : {
                  creatorId,
                  sponsorshipType,
                  oneTimePaymentAmount,
                  paymentMethodId,
                },
        });
        const stripePaymentMethodId = checkout.data?.paymentMethodId;
        const clientSecret = checkout.data?.clientSecret;

        if (!checkout.success || !stripePaymentMethodId || !clientSecret) {
          modal.open<InfoModalProps>(MODALS.INFO, {
            props: {
              title: 'error',
              message: checkout.message,
            },
          });
          setLoading((loading) => ({ ...loading, form: false }));
          return;
        }

        // confirm a stripe payment
        const stripePayment = await stripe.confirmCardPayment(clientSecret, {
          payment_method: stripePaymentMethodId,
        });

        // handle a stripe response
        if (stripePayment.paymentIntent) {
          switch (stripePayment.paymentIntent.status) {
            case 'succeeded':
              break;
            case 'requires_action':
              break;
          }
        }

        if (stripePayment.error) {
          modal.open<InfoModalProps>(MODALS.INFO, {
            props: {
              title: 'error',
              message: stripePayment.error.message,
            },
          });
          setLoading((loading) => ({ ...loading, form: false }));
          return;
        }

        // redirect to the home page
        if (username) {
          redirect(ROUTER.USERS.DETAIL(username));
        }

        // setLoading((loading) => ({ ...loading, form: false }));
      } catch (e) {
        setLoading((loading) => ({ ...loading, form: false }));
      }
    },
  );

  useEffect(() => {
    // cache modals
    modal.preload([MODALS.INFO]);

    setLoading((loading) => ({ ...loading, paymentMethods: false }));
  }, []);

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit}>
        {/* <div className="py-4">
          {JSON.stringify({
            s: {
              onetimepayment: form.watch('oneTimePaymentAmount'),
              paymentmethod: form.watch('paymentMethodId'),
            },
          })}
        </div> */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-10">
            <div className="flex flex-col">
              <h2 className="font-medium text-lg">Choose sponsorship</h2>
              <div className="mt-4 flex flex-col">
                <ChipGroup
                  classNames={{ group: 'w-full grid grid-cols-2' }}
                  value={sponsorshipType}
                  items={
                    sponsorshipEnabled
                      ? DATA.SPONSORSHIP_OPTIONS
                      : [
                          DATA.SPONSORSHIP_OPTIONS[0],
                          { ...DATA.SPONSORSHIP_OPTIONS[1], disabled: true },
                        ]
                  }
                  onSelect={handleSponsorshipTypeSelect}
                />
                <div className="mt-6">
                  {sponsorshipType === SponsorshipType.ONE_TIME_PAYMENT && (
                    <div className="flex flex-col">
                      <FormField
                        disabled={loading.form}
                        {...form.register('oneTimePaymentAmount', {
                          setValueAs: (value: string) =>
                            value === '' ? undefined : Number(value),
                        })}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>One-time payment</FormLabel>
                            <FormControl>
                              <NumberInput
                                leftElement="$"
                                maxLength={3}
                                {...field}
                                onChange={(e) => {
                                  form.setValue(
                                    'oneTimePaymentAmount',
                                    e.target.value === ''
                                      ? 0
                                      : parseFloat(e.target.value),
                                  );
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                  {sponsorshipType === SponsorshipType.SUBSCRIPTION &&
                  sponsorship ? (
                    <div className="flex flex-col">
                      <SponsorshipTierCard
                        id={sponsorship.id}
                        price={sponsorship.price}
                        description={sponsorship.description}
                      />
                    </div>
                  ) : (
                    <></>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-col">
              <h2 className="font-medium text-lg">Payment method</h2>
              <div className="mt-4 flex flex-col">
                <ChipGroup
                  classNames={{ group: 'w-full grid grid-cols-2' }}
                  value={paymentMethodType}
                  items={DATA.PAYMENT_METHOD_TYPES}
                  disabled
                />
                <div className="mt-6 flex flex-col">
                  {paymentMethods.length >= 1 ? (
                    <FormField
                      control={form.control}
                      name="paymentMethodId"
                      disabled={loading.form}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <SelectInput
                              items={paymentMethods.map(({ id, label }) => ({
                                value: id,
                                label,
                              }))}
                              loading={loading.paymentMethods}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : (
                    <div className="flex flex-col justify-start items-start">
                      <span>
                        {LOCALES.APP.PAYMENT_METHOD.NO_PAYMENT_METHODS_FOUND}
                      </span>
                      <div className="mt-4">
                        <Button variant="secondary" asChild>
                          <Link href={ROUTER.USER.SETTINGS.PAYMENT_METHODS}>
                            Add payment method
                          </Link>
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-col">
              <div>
                <span className="font-medium text-base">
                  {sponsorshipType === SponsorshipType.SUBSCRIPTION
                    ? `You’ll pay ${currency.symbol}${sponsorshipMonthlyAmount} monthly on the ${dateformat().format('D')}th.`
                    : `You'll pay ${currency.symbol}${oneTimePaymentAmount}`}
                </span>
              </div>
              <div className="mt-4">
                <p className="text-xs text-gray-600 font-normal">
                  {LOCALES.APP.CHECKOUT.PAGE.TERMS}
                </p>
              </div>
              <div className="mt-8 flex flex-col">
                <Button loading={loading.form} disabled={!payButtonEnabled}>
                  <div className="flex flex-row items-center justify-center gap-2">
                    <LockSimpleIcon />
                    {sponsorshipType === SponsorshipType.SUBSCRIPTION
                      ? 'Subscribe'
                      : 'Pay'}
                  </div>
                </Button>
              </div>
            </div>
          </div>
          <div className="mt-6 flex flex-col">
            <span className="text-sm font-medium text-gray-600">
              legal_menu
            </span>
          </div>
        </div>
      </form>
    </Form>
  );
};

export const SponsorshipCheckoutForm: React.FC<Props> = (props) => (
  <StripeProvider>
    <FormComponent {...props} />
  </StripeProvider>
);
