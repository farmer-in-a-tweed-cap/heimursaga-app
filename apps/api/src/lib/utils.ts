import { UserRole } from '@repo/types';
import * as crypto from 'node:crypto';
import * as path from 'node:path';

const ENV = {
  PRODUCTION: 'production',
  STAGING: 'staging',
  DEVELOPMENT: 'development',
};

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const array = (length: number) => Array.from(Array(length));

export const getEnv = (): string => {
  return process.env.NODE_ENV || ENV.DEVELOPMENT;
};

export const getEnvFilePath = (): string => {
  const env = getEnv();

  let filePath: string;

  switch (env) {
    case ENV.PRODUCTION:
      filePath = '.env.production';
      break;
    case ENV.STAGING:
      filePath = '.env.staging';
      break;
    case ENV.DEVELOPMENT:
      filePath = '.env.development';
      break;
    default:
      filePath = '.env.development';
      break;
  }

  return path.resolve(filePath);
};

export const hashPassword = (password: string): string => {
  // Generate a unique salt for each password
  const salt = crypto.randomBytes(32).toString('hex');

  // Use 100,000 iterations for strong security
  const hash = crypto
    .pbkdf2Sync(password, salt, 100000, 64, 'sha512')
    .toString('hex');

  // Return salt and hash combined
  return `${salt}:${hash}`;
};

export const verifyPassword = (
  password: string,
  hashedPassword: string,
): boolean => {
  try {
    // Check if this is a new format password (contains salt)
    if (hashedPassword.includes(':')) {
      // New format: salt:hash
      const [salt, hash] = hashedPassword.split(':');

      if (!salt || !hash) {
        return false;
      }

      // Hash the provided password with the stored salt
      const hashedAttempt = crypto
        .pbkdf2Sync(password, salt, 100000, 64, 'sha512')
        .toString('hex');

      // Use constant-time comparison to prevent timing attacks
      return crypto.timingSafeEqual(
        Buffer.from(hash, 'hex'),
        Buffer.from(hashedAttempt, 'hex'),
      );
    } else {
      // Old format: just the hash (with empty salt and 1000 iterations)
      const oldHash = crypto
        .pbkdf2Sync(password, '', 1000, 64, 'sha512')
        .toString('hex');

      // Use constant-time comparison to prevent timing attacks
      return crypto.timingSafeEqual(
        Buffer.from(oldHash, 'hex'),
        Buffer.from(hashedPassword, 'hex'),
      );
    }
  } catch (error) {
    return false;
  }
};

export const matchRoles = (role: UserRole, roles: UserRole[]): boolean => {
  if (!role) return false;
  return roles.some((r) => r === role);
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
    const dateA = new Date(a[key]);
    const dateB = new Date(b[key]);

    if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) {
      if (isNaN(dateA.getTime()) && isNaN(dateB.getTime())) return 0;
      if (isNaN(dateA.getTime())) return order === 'asc' ? 1 : -1;
      if (isNaN(dateB.getTime())) return order === 'asc' ? -1 : 1;
    }

    return order === 'desc'
      ? dateB.getTime() - dateA.getTime()
      : dateA.getTime() - dateB.getTime();
  }) as T[];
}
