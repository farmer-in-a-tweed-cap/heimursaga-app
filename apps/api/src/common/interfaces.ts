import { FastifyReply, FastifyRequest } from 'fastify';

import { Role } from './enums';

export interface IRequest extends FastifyRequest {
  user?: ISessionUser;
}

export interface IResponse extends FastifyReply {}

export interface ISession {
  sid: string;
  userId?: number;
  userRole?: string;
  ip?: string;
  userAgent?: string;
}

export interface ISessionUser {
  userId: number;
  role: Role;
}

export interface IQueryWithSession<T = any> {
  query: T;
  session?: ISession;
}

export interface IPayloadWithSession<T = any> {
  payload: T;
  session?: ISession;
}

export interface ISessionQuery<Q = any> {
  query: Q;
  session?: ISession;
}

export interface ISessionQueryWithPayload<Q = any, T = any> {
  query: Q;
  payload: T;
  session?: ISession;
}
