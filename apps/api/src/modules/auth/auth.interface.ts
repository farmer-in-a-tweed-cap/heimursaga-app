export interface ISessionCreateOptions {
  userId: number;
  sid?: string;
  ip?: string;
  userAgent?: string;
  remember?: boolean;
}
