import { ISession } from '@/common/interfaces';
import { IEmailSendPayload } from '@/modules/email';

export interface IEventMessage<T = any> {
  event: string;
  session?: ISession;
  data?: T;
}

export interface IEventSendEmail<T = any> extends IEmailSendPayload<T> {}

export interface IEventSignupComplete {
  email: string;
}

export interface IEventAdminNewUserSignup {
  username: string;
  email: string;
  signupDate: string;
  userProfileUrl?: string;
}
