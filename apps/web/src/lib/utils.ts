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

export const randomInteger = (min: number, max: number) => {
  return Math.random() * (max - min) + min;
};

export function sortByDate<T = any>(
  elements: { date: Date }[],
  order: 'asc' | 'desc',
): T[] {
  return elements.sort((a, b) => {
    if (a.date instanceof Date && b.date instanceof Date) {
      return order === 'desc'
        ? b.date.getTime() - a.date.getTime()
        : a.date.getTime() - b.date.getTime();
    } else {
      return -1;
    }
  }) as T[];
}
