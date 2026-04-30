import * as dotenv from 'dotenv';

import { getEnvFilePath } from '@/lib/utils';

// import env variables
dotenv.config({ path: getEnvFilePath() });

export const config = {
  email: {
    from: process.env.SMTP_EMAIL_FROM,
  },
  verification_request_limit: 5,
  stripe: {
    default: {
      currency: 'usd',
    },
  },
  sponsorship: {
    default_amount: 500,
  },
  premium: {
    currency: 'usd',
    monthlyPrice: 5,
    yearlyPrice: 50,
  },
  apple: {
    iapSharedSecret: process.env.APPLE_IAP_SHARED_SECRET,
  },
};

const _rawFee = process.env.APPLICATION_FEE;
const _parsedFee = _rawFee !== undefined ? parseInt(_rawFee, 10) : 10;
const _isFeeValid =
  Number.isFinite(_parsedFee) && _parsedFee >= 1 && _parsedFee <= 100;

if (_rawFee !== undefined && !_isFeeValid) {
  // eslint-disable-next-line no-console
  console.warn(
    `[config] APPLICATION_FEE env value "${_rawFee}" is invalid (expected an integer 1-100). Falling back to 10.`,
  );
}

export const APPLICATION_FEE = _isFeeValid ? _parsedFee : 10;
