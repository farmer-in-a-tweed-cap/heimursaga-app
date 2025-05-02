export const config = {
  email: {
    from: process.env.SMTP_EMAIL_FROM,
  },
  verification_request_limit: 5,
  stripe: {
    default_currency: 'usd',
    application_fee: 100,
  },
  premium: {
    currency: 'usd',
    monthlyPrice: 5,
    yearlyPrice: 50,
  },
};
