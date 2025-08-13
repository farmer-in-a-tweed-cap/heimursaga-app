export const LOCALES = {
  APP: {
    ERROR: {
      UNKNOWN: 'unknown error',
      BAD_REQUEST: 'bad request',
    },
    SEARCH: {
      POSTS_FOUND: 'entries found',
    },
    MAP: {
      FILTER: {
        GLOBAL: 'Global',
        FOLLOWING: 'Following',
        POSTS: 'Entries',
        JOURNEYS: 'Journeys',
      },
    },
    PAYMENT_METHOD: {
      NO_PAYMENT_METHODS_FOUND:
        'You do not currently have any payment methods.',
      PAYMENT_METHOD_ADDED: 'payment method added',
      PAYMENT_METHOD_REMOVED: 'payment method deleted',
    },
    PAYOUT: {
      TABS: {
        WITHDRAW: 'Withdraw',
        BILLING: 'Billing',
      },
    },
    POSTS: {
      TOAST: {
        DELETED: 'entry deleted',
        NOT_UPDATED: 'entry not updated',
        NOT_SAVED: 'entry not saved',
        NOT_LOGGED: 'entry not logged',
      },
      VALIDATION: {
        TITLE_REQUIRED: 'Title is required',
        CONTENT_REQUIRED: 'Content is required',
        LOCATION_REQUIRED: 'Location is required',
        DATE_REQUIRED: 'Date is required',
        FIELDS_REQUIRED: 'Please fill in all required fields',
      },
    },
    SPONSORSHIP: {
      TOAST: {
        CANCELED: 'sponsorship canceled',
        STRIPE_NOT_VERIFIED: 'Please complete your Stripe account verification to update sponsorship tiers',
        ONE_TIME_PAYMENT_SENT: 'One-time sponsorship payment sent!',
        MONTHLY_PAYMENT_SENT: 'Monthly sponsorship payment sent!',
      },
    },
    USERS: {
      TOAST: {
        BLOCKED: 'user blocked',
      },
    },
    UPGRADE: {
      WELCOME: {
        CTA: {
          TITLE: 'Welcome to Explorer Pro',
          DESCRIPTION:
            'Enjoy an enhanced experience, exclusive pro tools, and secure sponsorship payment handling.',
        },
      },
      PLAN: {
        TITLE: 'Explorer Pro',
      },
      PAGE: {
        CTA: {
          TITLE: 'Upgrade to Explorer Pro',
          DESCRIPTION:
            'Enjoy an enhanced experience, exclusive pro tools, and secure sponsorship payment handling.',
        },
        FEATURES: [
          `Receive sponsorships`,
          `Create custom subscription tiers`,
          `Post sponsor-only entries`,
          `Build journeys`,
          `View entry analytics`,
          `Send private messages`
        ],
        TERMS: `By subscribing, you agree to our Purchaser Terms of Service. Subscriptions auto-renew until canceled. Cancel anytime, at least 24 hours prior to renewal to avoid additional charges. Manage your subscription through the platform you subscribed on.`,
      },
    },
    PAYOUTS: {
      BILLING: {
        STRIPE: {
          TITLE: 'Stripe',
          PAYOUT_FEE_WARNING:
            'Heimursaga charges a 10% platform fee on all payments and Stripe charges 2.9% + $0.30 per transaction. Example: your sponsor pays you $5.00, fees total $0.50, your payout amount would be $4.50',
        },
      },
    },
    UPGRADE_CHECKOUT: {
      PAGE: {
        CTA: {
          TITLE: 'Upgrade to Explorer Pro',
          DESCRIPTION:
            'Enjoy an enhanced experience, exclusive pro tools, and secure sponsorship payment handling.',
        },
      },
    },
    CHECKOUT: {
      PAGE: {
        TERMS: `By clicking Subscribe now, you agree to Terms of Use and Privacy Policy. This subscription automatically renews monthly, and you’ll be notified in advance if the monthly amount increases. Cancel anytime in your account settings.`,
      },
    },
  },
};
