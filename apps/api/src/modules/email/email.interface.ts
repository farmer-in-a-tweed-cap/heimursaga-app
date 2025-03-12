export interface IEmailSendPayload {
  to: string;
  subject?: string;
  text?: string;
  html?: string;
  // template?: string;
  // data?: T;
}
