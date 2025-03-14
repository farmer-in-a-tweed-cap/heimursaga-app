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
