import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const randomIntegerId = (): number => {
  return parseInt(Date.now() + Math.random().toFixed(0));
};
