import { ISession } from '@/common/interfaces';

export interface ISessionUserQueryResponse {
  role: string;
  username: string;
  email: string;
  picture?: string;
  firstName: string;
  lastName: string;
  isEmailVerified: boolean;
  isPremium: boolean;
}

export interface ISessionCreatePayload {
  userId: number;
  sid?: string;
  ip?: string;
  userAgent?: string;
}

export interface ILoginQueryPayload {
  email?: string;
  password: string;
  session?: ISession;
}

export interface ILoginQueryPayloadDto {
  email: string;
  password: string;
}

export interface ILoginQueryResponse {
  session: {
    sid: string;
    expiredAt: Date;
  };
}

export interface ISignupQueryPayload {
  email: string;
  username: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface ISignupQueryPayloadDto extends ISignupQueryPayload {}

export interface IPasswordResetPayload {
  email: string;
}

export interface IPasswordChangePayload {
  password: string;
  token: string;
}
