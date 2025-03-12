import {
  CustomDecorator,
  ExecutionContext,
  createParamDecorator,
} from '@nestjs/common';
import { SetMetadata } from '@nestjs/common';
import { Transform } from 'class-transformer';

import { SESSION_KEYS } from '@/common/constants';
import { IRequest, IUserSession } from '@/common/interfaces';

import { Role } from './enums';

export const PUBLIC_ROUTE_KEY = 'PUBLIC_ROUTE_KEY';
export const ROLES_KEY = 'ROLES_KEY';

export const Public = () => SetMetadata(PUBLIC_ROUTE_KEY, true);

export const Session = createParamDecorator(
  (data: null, ctx: ExecutionContext): IUserSession => {
    const req: IRequest = ctx.switchToHttp().getRequest();

    const cookies = {
      sid: req.session.get(SESSION_KEYS.SID) as string,
    };

    const { sid } = cookies;

    const userId = req.user?.userId;
    const forwardedFor = req.headers['x-forwarded-for'] as string;
    const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : req.ip;
    const userAgent = req.headers['user-agent'] as string;

    const session: IUserSession = {
      sid,
      userId,
      ip,
      userAgent,
    };

    return session;
  },
);

export const Roles = (...roles: Role[]): CustomDecorator<string> =>
  SetMetadata(ROLES_KEY, roles);

export const ToNumber = () =>
  Transform(({ value }) => (!value ? 0 : Number(`${value}`)));

export const ToBoolean = () =>
  Transform(
    ({ value }) =>
      value === 'true' || value === true || value === 1 || value === '1',
  );
