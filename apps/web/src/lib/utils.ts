import { CURRENCY_SYMBOLS } from '@/constants';

export const array = (length: number) => Array.from(Array(length));

export const redirect = (href: string) => {
  window.location.href = href;
};

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const debounce = <T = any, R = void>(fn: (args: T) => R, ms = 300) => {
  let timeoutId: ReturnType<typeof setTimeout>;
  return function (this: any, args: T) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.call(this, args), ms);
  };
};

export const getCurrencySymbol = (code: string) => {
  // @ts-ignore
  return CURRENCY_SYMBOLS[code] ? CURRENCY_SYMBOLS[code] : CURRENCY_SYMBOLS.USD;
};
