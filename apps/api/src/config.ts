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
};

const _parsedFee =
  process.env.APPLICATION_FEE !== undefined
    ? parseInt(process.env.APPLICATION_FEE, 10)
    : 10;

export const APPLICATION_FEE =
  Number.isFinite(_parsedFee) && _parsedFee >= 1 && _parsedFee <= 100
    ? _parsedFee
    : 10;
