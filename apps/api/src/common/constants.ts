import { CurrencyCode } from './enums';

export const SESSION_KEYS: {
  SID: 'sid';
  USER_ID: 'user_id';
  USER_ROLE: 'user_role';
} = {
  SID: 'sid',
  USER_ID: 'user_id',
  USER_ROLE: 'user_role',
};

export const COOKIE_KEYS = {
  SID: 'sid',
  LOCALE: 'locale',
  TZO: 'tzo',
};

export const CURRENCIES: {
  [key: string]: {
    code: string;
    symbol: string;
  };
} = {
  [CurrencyCode.USD]: {
    code: CurrencyCode.USD,
    symbol: '$',
  },
  [CurrencyCode.EUR]: {
    code: CurrencyCode.EUR,
    symbol: '€',
  },
  [CurrencyCode.SGD]: {
    code: CurrencyCode.USD,
    symbol: 'S$',
  },
};
