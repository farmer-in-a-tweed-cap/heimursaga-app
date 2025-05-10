import { ISession } from '@/common/interfaces';
import { IEmailSendPayload } from '@/modules/email';

export interface IEventMessage<T = any> {
  event: string;
  session?: ISession;
  data?: T;
}

export interface IEmailSendEvent<T = any> extends IEmailSendPayload<T> {}
