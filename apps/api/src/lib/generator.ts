import * as crypto from 'node:crypto';

export const generator = {
  publicId: (options?: { prefix?: string }): string => {
    let prefix = options?.prefix;
    let length = 14;

    if (prefix) {
      prefix = prefix.length > 2 ? prefix.slice(0, 2) : prefix;
      length = 11;
    } else {
      length = 14;
    }

    const hash = crypto.randomBytes(Math.ceil(length * 3 / 4)).toString('base64url').slice(0, length);

    if (prefix) {
      return [prefix, hash].join('_');
    }

    return hash;
  },
  secureId: () => {
    return crypto.randomBytes(20).toString('hex');
  },
  sessionId: (): string => {
    return crypto.randomBytes(16).toString('hex');
  },
  verificationToken: (): string => {
    return crypto.randomBytes(20).toString('hex');
  },
};
