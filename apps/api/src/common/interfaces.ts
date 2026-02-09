import { ExplorerRole, UserRole } from '@repo/types';
import { FastifyReply, FastifyRequest } from 'fastify';

export interface IRequest extends FastifyRequest {
  user?: ISessionUser;
}

export interface IResponse extends FastifyReply {}

export interface ISession {
  sid: string;
  userId?: number;
  userRole?: UserRole;
  // Aliases for new naming convention
  explorerId?: number;
  explorerRole?: ExplorerRole;
  ip?: string;
  userAgent?: string;
}

export interface ISessionUser {
  userId: number;
  role: UserRole;
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
