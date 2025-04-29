'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ISponsorshipTier } from '@repo/types';
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
import { CreditCardIcon, LockIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { dateformat } from '@/lib/date-format';

import { sleep, zodMessage } from '@/lib';

import { SponsorshipTierCard } from './sponsorship-tier-card';

type Props = {
  sponsorship?: ISponsorshipTier;
  paymentMethods?: { id: string; label: string }[];
};

const PAYMENT_METHOD_TYPES = {
  CARD: 'card',
  PAYPAL: 'paypal',
};

const SPONSORSHIP_TYPES = {
  ONE_TIME: 'one_time',
  MONTHLY: 'monthly',
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
    { label: 'One-time', value: SPONSORSHIP_TYPES.ONE_TIME },
    { label: 'Monthly', value: SPONSORSHIP_TYPES.MONTHLY },
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

export const SponsorshipCheckoutForm: React.FC<Props> = ({
  sponsorship,
  paymentMethods = [],
}) => {
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
    sponsorshipType: SPONSORSHIP_TYPES.ONE_TIME,
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

  const { sponsorshipType, paymentMethodId, paymentMethodType } = state;

  const oneTimePaymentAmount = form.watch('oneTimePaymentAmount') || 0;
  const sponsorshipMonthlyAmount = sponsorship?.price || 0;
  const currencySymbol = '$';

  const handleSponsorshipTypeSelect = (sponsorshipType: string) => {
    setState((state) => ({ ...state, sponsorshipType }));
  };

  const handleSubmit = form.handleSubmit(
    async (values: z.infer<typeof schema>) => {
      try {
        setLoading((loading) => ({ ...loading, form: true }));

        const { sponsorshipType, paymentMethodType } = state;
        const { oneTimePaymentAmount, paymentMethodId } = values;

        // @todo complete the checkout

        console.log('submit:', {
          sponsorshipType,
          paymentMethodType,
          oneTimePaymentAmount,
          paymentMethodId,
        });

        await sleep(2000);

        setLoading((loading) => ({ ...loading, form: false }));
      } catch (e) {
        setLoading((loading) => ({ ...loading, form: false }));
      }
    },
  );

  useEffect(() => {
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
                  className="w-full grid grid-cols-2"
                  value={sponsorshipType}
                  items={DATA.SPONSORSHIP_OPTIONS}
                  onSelect={handleSponsorshipTypeSelect}
                />
                <div className="mt-6">
                  {sponsorshipType === SPONSORSHIP_TYPES.ONE_TIME && (
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
                  {sponsorshipType === SPONSORSHIP_TYPES.MONTHLY &&
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
                  className="w-full grid grid-cols-2"
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
                    <span>no payment methods available</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-col">
              <div>
                <span className="font-medium text-base">
                  {sponsorshipType === SPONSORSHIP_TYPES.MONTHLY
                    ? `You’ll pay ${currencySymbol}${sponsorshipMonthlyAmount} monthly on the ${dateformat().format('DD')}th.`
                    : `You'll pay ${currencySymbol}${oneTimePaymentAmount}`}
                </span>
              </div>
              <div className="mt-4">
                <p className="text-xs text-gray-600 font-normal">
                  By clicking Subscribe now, you agree to Patreon’s Terms of Use
                  and Privacy Policy. This Patreon subscription automatically
                  renews monthly, and you’ll be notified in advance if the
                  monthly amount increases. Cancel anytime in your membership
                  settings.
                </p>
              </div>
              <div className="mt-8 flex flex-col">
                <Button loading={loading.form}>
                  <div className="flex flex-row items-center justify-center gap-2">
                    <LockIcon />
                    {sponsorshipType === SPONSORSHIP_TYPES.MONTHLY
                      ? 'Subscribe'
                      : 'Pay'}
                  </div>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </Form>
  );
};
