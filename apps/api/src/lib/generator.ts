import { nanoid } from 'nanoid';
import * as crypto from 'node:crypto';

export const generator = {
  publicId: (): string => nanoid(14),
  sessionId: (): string => {
    return crypto.randomBytes(16).toString('hex');
  },
};
