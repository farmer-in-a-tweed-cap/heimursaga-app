export const APP_HEADER_HEIGHT = 64;

export const DEBOUNCE_TIMEOUT = 250;

export const TOAST_DURATION = 1500;

export const DEMO_DATA = {
  PLANS: [
    {
      name: 'Premium',
      slug: 'premium',
      features: [],
      currency: 'usd',
      currencySymbol: '$',
      monthlyPrice: 5,
      yearlyPrice: 50,
      yearlyDiscount: 20,
    },
  ],
};

export const ERROR_CODES = {
  PAYMENT_FORM_NOT_LOADED: 'PAYMENT_FORM_NOT_LOADED',
};

export const CURRENCY_SYMBOLS = {
  USD: '$',
};

export const SEARCH_PARAMS = {
  CONTEXT: 'context',
  LAT: 'lat',
  LON: 'lon',
  ZOOM: 'zoom',
  POST_ID: 'post_id',
  SEARCH: 'search',
  USER: 'user',
  FILTER: 'filter',
};

export const FILE_ACCEPT: {
  IMAGE: { [key: string]: string[] };
} = {
  IMAGE: {
    'image/jpeg': [],
    'image/png': [],
  },
};
