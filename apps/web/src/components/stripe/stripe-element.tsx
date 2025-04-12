'use client';

import { cn } from '@repo/ui/lib/utils';
import {
  CardCvcElement,
  CardCvcElementProps,
  CardExpiryElement,
  CardExpiryElementProps,
  CardNumberElement,
  CardNumberElementProps,
} from '@stripe/react-stripe-js';

export const StripeCardNumberInput: React.FC<CardNumberElementProps> = ({
  className,
  options = {
    showIcon: true,
    placeholder: '0000 0000 0000 0000',
  },
  ...props
}) => (
  <CardNumberElement
    className={cn('input', className)}
    options={options}
    {...props}
  />
);

export const StripeCardExpiryInput: React.FC<CardExpiryElementProps> = ({
  className,
  ...props
}) => <CardExpiryElement className={cn('input', className)} {...props} />;

export const StripeCardCvcInput: React.FC<CardCvcElementProps> = ({
  className,
  ...props
}) => <CardCvcElement className={cn('input', className)} {...props} />;
