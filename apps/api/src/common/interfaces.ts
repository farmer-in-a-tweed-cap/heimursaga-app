import { FastifyReply, FastifyRequest } from 'fastify';

import { Role } from './enums';

export interface IRequest extends FastifyRequest {
  user?: ISessionUser;
}

export interface IResponse extends FastifyReply {}

export interface IUserSession {
  sid: string;
  userId?: number;
  ip: string;
  userAgent: string;
}

export interface ISessionUser {
  userId: number;
  role: Role;
}
