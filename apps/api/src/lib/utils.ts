import * as crypto from 'node:crypto';
import * as path from 'node:path';

const ENV = {
  PRODUCTION: 'production',
  STAGING: 'staging',
  DEVELOPMENT: 'development',
};

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
  // @todo: security
  const salt = '';

  const hash = crypto
    .pbkdf2Sync(password, salt, 1000, 64, 'sha512')
    .toString('hex');

  return hash;
};
