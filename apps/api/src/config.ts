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
    application_fee: 100,
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

export const APPLICATION_FEE = process.env?.APPLICATION_FEE
  ? parseInt(process.env.APPLICATION_FEE)
  : 0;
