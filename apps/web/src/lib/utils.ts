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

export const getEnv = (): 'development' | 'production' => {
  return process.env.NODE_ENV as 'development' | 'production';
};

export const normalizeText = (text: string = '') => {
  return (
    text
      // .replace('\\n', /\n)
      .replace(/\\n/g, '\n')
  );
  // .filter((line) => line.trim() !== '')
  // .map((line, key) => <p key={key}>{line}</p>);
};

export const randomIntegerId = (): number => {
  return parseInt(Date.now() + Math.random().toFixed(0));
};

export function sortByDate<T = any>({
  elements = [],
  key,
  order,
}: {
  elements: any[];
  key: string;
  order: 'asc' | 'desc';
}): T[] {
  if (elements.length <= 0) return [];

  return elements.sort((a, b) => {
    if (a[key] instanceof Date && b[key] instanceof Date) {
      return order === 'desc'
        ? b[key].getTime() - a[key].getTime()
        : a[key].getTime() - b[key].getTime();
    } else {
      return -1;
    }
  }) as T[];
}

export const getBaseAppUrl = (): string => {
  return process?.env?.NEXT_PUBLIC_APP_BASE_URL || '';
};

export const between = (number: number, range: [number, number]): boolean => {
  const [min, max] = range || [0, 1];
  return number > min && number < max;
};
