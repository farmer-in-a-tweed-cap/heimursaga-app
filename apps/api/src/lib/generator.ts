import * as crypto from 'node:crypto';

export const generator = {
  sessionId: (): string => {
    return crypto.randomBytes(16).toString('hex');
  },
};
