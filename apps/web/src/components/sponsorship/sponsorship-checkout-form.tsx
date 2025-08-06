'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ISponsorshipTier, SponsorshipType, SponsorshipBillingPeriod } from '@repo/types';
import {
  Button,
  ChipGroup,
  Checkbox,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  NumberInput,
  SelectInput,
  Textarea,
} from '@repo/ui/components';
import { useToast } from '@repo/ui/hooks';
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
import { StripeSecurityBadge } from '../stripe-security-badge';
import { useModal } from '@/hooks';
import { redirect, zodMessage } from '@/lib';
import { LOCALES } from '@/locales';
import { ROUTER } from '@/router';

type Props = {
  username?: string;
  sponsorships?: ISponsorshipTier[];
  paymentMethods?: { id: string; label: string }[];
  onSuccess?: () => void;
  onCancel?: () => void;
  existingSponsorship?: any;
};

const MESSAGE_LENGTH = 200;

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
  BILLING_PERIOD_OPTIONS: [
    { label: 'Monthly', value: SponsorshipBillingPeriod.MONTHLY },
    { label: 'Yearly', value: SponsorshipBillingPeriod.YEARLY, discount: '10% off' },
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
  message: z
    .string()
    .max(MESSAGE_LENGTH, zodMessage.string.max('message', MESSAGE_LENGTH))
    .optional(),
  emailDelivery: z.boolean().default(true).optional(),
  selectedTierId: z.string().optional(),
  billingPeriod: z.nativeEnum(SponsorshipBillingPeriod).default(SponsorshipBillingPeriod.MONTHLY),
});

export const FormComponent: React.FC<Props> = ({
  username,
  sponsorships = [],
  paymentMethods = [],
  onSuccess,
  onCancel,
  existingSponsorship,
}) => {
  const stripe = useStripe();
  const modal = useModal();
  const toast = useToast();

  const [loading, setLoading] = useState<{
    form: boolean;
    paymentMethods: boolean;
  }>({ form: false, paymentMethods: true });

  const [state, setState] = useState<{
    sponsorshipType: string;
    paymentMethodType: string;
    paymentMethodId?: string;
    paymentMethods: { id: string; label: string }[];
    selectedTierId?: string;
    billingPeriod: SponsorshipBillingPeriod;
  }>({
    sponsorshipType: SponsorshipType.ONE_TIME_PAYMENT,
    paymentMethodType: PAYMENT_METHOD_TYPES.CARD,
    paymentMethods,
    selectedTierId: sponsorships.length > 0 ? sponsorships[0].id : undefined,
    billingPeriod: SponsorshipBillingPeriod.MONTHLY,
  });

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      oneTimePaymentAmount: 5,
      paymentMethodId:
        paymentMethods.length >= 1 ? paymentMethods[0].id : undefined,
      message: '',
      emailDelivery: true,
      selectedTierId: sponsorships.length > 0 ? sponsorships[0].id : undefined,
      billingPeriod: SponsorshipBillingPeriod.MONTHLY,
    },
  });

  const { sponsorshipType, paymentMethodType, selectedTierId, billingPeriod } = state;

  const oneTimePaymentAmount = form.watch('oneTimePaymentAmount') || 0;
  const paymentMethodId = form.watch('paymentMethodId');
  const message = form.watch('message');
  const selectedTier = sponsorships.find(tier => tier.id === selectedTierId);
  const sponsorshipEnabled = sponsorships.length > 0;
  const sponsorshipMonthlyAmount = selectedTier?.price || 0;
  const sponsorshipYearlyAmount = selectedTier ? Math.round(selectedTier.price * 12 * 0.9) : 0;
  const currentSponsorshipAmount = billingPeriod === SponsorshipBillingPeriod.YEARLY 
    ? sponsorshipYearlyAmount 
    : sponsorshipMonthlyAmount;
  const currency = { symbol: '$' };
  const payButtonEnabled = !!stripe && !!paymentMethodId;

  const handleSponsorshipTypeSelect = (sponsorshipType: string) => {
    setState((state) => ({ ...state, sponsorshipType }));
  };

  const handleTierSelect = (tierId: string) => {
    setState((state) => ({ ...state, selectedTierId: tierId }));
    form.setValue('selectedTierId', tierId);
  };

  const handleBillingPeriodSelect = (period: SponsorshipBillingPeriod) => {
    setState((state) => ({ ...state, billingPeriod: period }));
    form.setValue('billingPeriod', period);
  };

  const handleSubmit = form.handleSubmit(
    async (values: z.infer<typeof schema>) => {
      try {
        console.log('submit:', { stripe, username });

        if (!stripe || !username) return;

        setLoading((loading) => ({ ...loading, form: true }));

        const { sponsorshipType, billingPeriod } = state;
        const sponsorshipTierId = selectedTier?.id;
        const { oneTimePaymentAmount, paymentMethodId, message, emailDelivery } = values;
        const creatorId = username;

        // console.log('submit:', {
        //   creatorId,
        //   oneTimePaymentAmount,
        //   sponsorshipTierId,
        //   sponsorshipType,
        //   paymentMethodId,
        // });

        const payload = {
          creatorId,
          sponsorshipType,
          paymentMethodId,
          message,
          emailDelivery: sponsorshipType === SponsorshipType.SUBSCRIPTION ? emailDelivery : false,
          billingPeriod: sponsorshipType === SponsorshipType.SUBSCRIPTION ? billingPeriod : undefined,
        };

        // initiate a checkout
        const checkout = await apiClient.sponsorCheckout({
          query: {},
          payload:
            sponsorshipType === SponsorshipType.SUBSCRIPTION
              ? {
                  ...payload,
                  sponsorshipTierId,
                }
              : {
                  ...payload,
                  oneTimePaymentAmount,
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

        // handle success - show toast message based on sponsorship type
        const successMessage = sponsorshipType === SponsorshipType.SUBSCRIPTION 
          ? LOCALES.APP.SPONSORSHIP.TOAST.MONTHLY_PAYMENT_SENT
          : LOCALES.APP.SPONSORSHIP.TOAST.ONE_TIME_PAYMENT_SENT;
        
        toast({ type: 'success', message: successMessage });
        
        // either call callback or redirect
        if (onSuccess) {
          onSuccess();
        } else if (username) {
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
    
    // Force one-time payment if user already sponsors this creator
    if (existingSponsorship) {
      setState((state) => ({ ...state, sponsorshipType: SponsorshipType.ONE_TIME_PAYMENT }));
    }
  }, [existingSponsorship]);

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
                    sponsorshipEnabled && !existingSponsorship
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
                  sponsorshipEnabled && !existingSponsorship ? (
                    <div className="flex flex-col space-y-6">
                      {/* Tier Selection */}
                      {sponsorships.length > 1 && (
                        <div className="flex flex-col">
                          <h3 className="font-medium text-base mb-3">Choose your tier</h3>
                          <div className="grid gap-3">
                            {sponsorships.sort((a, b) => a.price - b.price).map((tier) => (
                              <div
                                key={tier.id}
                                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                                  selectedTierId === tier.id
                                    ? 'border-blue-500 bg-blue-50'
                                    : 'border-gray-200 hover:border-gray-300'
                                }`}
                                onClick={() => handleTierSelect(tier.id)}
                              >
                                <div className="flex flex-col">
                                  <div className="flex items-center justify-between">
                                    <span className="text-base font-medium">
                                      ${tier.price}/month
                                    </span>
                                    {tier.priority && (
                                      <span className="text-xs text-gray-500">
                                        Tier {tier.priority}
                                      </span>
                                    )}
                                  </div>
                                  {tier.description && (
                                    <p className="mt-2 text-sm text-gray-600">
                                      {tier.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Billing Period Selection */}
                      <div className="flex flex-col">
                        <h3 className="font-medium text-base mb-3">Billing period</h3>
                        <ChipGroup
                          classNames={{ group: 'w-full grid grid-cols-2 gap-2' }}
                          value={billingPeriod}
                          items={DATA.BILLING_PERIOD_OPTIONS.map(option => ({
                            ...option,
                            label: option.discount ? `${option.label} (${option.discount})` : option.label,
                          }))}
                          onSelect={(period) => handleBillingPeriodSelect(period as SponsorshipBillingPeriod)}
                        />
                      </div>

                      {/* Selected Tier Summary */}
                      {selectedTier && (
                        <div className="flex flex-col">
                          <div className="p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center justify-between">
                              <span className="text-base font-medium">
                                ${currentSponsorshipAmount}/{billingPeriod === SponsorshipBillingPeriod.YEARLY ? 'year' : 'month'}
                              </span>
                              {billingPeriod === SponsorshipBillingPeriod.YEARLY && (
                                <span className="text-sm text-green-600 font-medium">
                                  Save ${(sponsorshipMonthlyAmount * 12) - sponsorshipYearlyAmount}
                                </span>
                              )}
                            </div>
                            {selectedTier.description && (
                              <p className="mt-2 text-sm text-gray-600">
                                {selectedTier.description}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
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
                        <Button 
                          variant="secondary" 
                          onClick={() => {
                            if (onCancel) onCancel(); // Close modal first
                            redirect(ROUTER.USER.SETTINGS.PAYMENT_METHODS);
                          }}
                        >
                          Add payment method
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col">
              <h2 className="font-medium text-lg">Message</h2>
              <p className="py-3">
                You can send a private message to @{username}.
              </p>
              <div className="mt-4 w-full flex flex-col">
                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Message ({message?.length || 0}/{MESSAGE_LENGTH})
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          className="min-h-[120px]"
                          disabled={loading.form}
                          maxLength={MESSAGE_LENGTH}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            {sponsorshipType === SponsorshipType.SUBSCRIPTION && (
              <div className="flex flex-col">
                <h2 className="font-medium text-lg">Email Delivery</h2>
                <div className="mt-4 flex flex-col">
                  <FormField
                    control={form.control}
                    name="emailDelivery"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="flex items-center space-x-3">
                            <Checkbox
                              id="emailDelivery"
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                            <label 
                              htmlFor="emailDelivery" 
                              className="text-sm font-medium leading-relaxed cursor-pointer"
                            >
                              Deliver new entries directly to my inbox (monthly sponsor perk)
                            </label>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}
            
            <div className="flex flex-col">
              <div>
                <span className="font-medium text-base">
                  {sponsorshipType === SponsorshipType.SUBSCRIPTION
                    ? `You'll pay ${currency.symbol}${currentSponsorshipAmount} ${billingPeriod === SponsorshipBillingPeriod.YEARLY ? 'yearly' : `monthly on the ${dateformat().format('D')}th`}.`
                    : `You'll pay ${currency.symbol}${oneTimePaymentAmount}`}
                </span>
              </div>
              <div className="mt-4">
                <p className="text-xs text-gray-600 font-normal">
                  By clicking Subscribe now, you agree to{' '}
                  <a href="/legal/terms" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    Terms of Use
                  </a>{' '}
                  and{' '}
                  <a href="/legal/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    Privacy Policy
                  </a>
                  . This subscription automatically renews{' '}
                  {billingPeriod === SponsorshipBillingPeriod.YEARLY ? 'yearly' : 'monthly'}, and you'll be notified in advance if the{' '}
                  {billingPeriod === SponsorshipBillingPeriod.YEARLY ? 'yearly' : 'monthly'} amount increases. Cancel anytime in your account settings.
                </p>
              </div>
              <div className="mt-8 flex flex-col gap-3">
                <Button
                  type="submit"
                  loading={loading.form}
                  disabled={!payButtonEnabled}
                >
                  <div className="flex flex-row items-center justify-center gap-2">
                    <LockSimpleIcon />
                    {sponsorshipType === SponsorshipType.SUBSCRIPTION
                      ? 'Subscribe'
                      : 'Pay'}
                  </div>
                </Button>
                {onCancel && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    disabled={loading.form}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          </div>
          <div className="mt-6">
            <StripeSecurityBadge variant="badge" />
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
