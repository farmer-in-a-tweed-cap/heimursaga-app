export interface IEmailSendPayload<T = any> {
  to: string;
  subject?: string;
  text?: string;
  html?: string;
  template?: string;
  vars?: T;
}

export interface IPasswordResetEmailTemplateData {
  reset_link: string;
}
