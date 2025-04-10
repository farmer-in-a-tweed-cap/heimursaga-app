import { IEmailSendPayload } from '@/modules/email';

export interface IEmailSendEvent<T = any> extends IEmailSendPayload<T> {}
