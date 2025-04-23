import {
  CustomDecorator,
  ExecutionContext,
  createParamDecorator,
} from '@nestjs/common';
import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@repo/types';
import { Transform } from 'class-transformer';

import { SESSION_KEYS } from '@/common/constants';
import { IRequest, ISession } from '@/common/interfaces';

export const PUBLIC_ROUTE_KEY = 'PUBLIC_ROUTE_KEY';
export const ROLES_KEY = 'ROLES_KEY';

export const Public = () => SetMetadata(PUBLIC_ROUTE_KEY, true);

export const Session = createParamDecorator(
  (data: null, ctx: ExecutionContext): ISession => {
    const req: IRequest = ctx.switchToHttp().getRequest();

    const sid = req.session.get(SESSION_KEYS.SID);
    const userId = req.session.get(SESSION_KEYS.USER_ID);
    const userRole = req.session.get(SESSION_KEYS.USER_ROLE);

    const forwardedFor = req.headers['x-forwarded-for'] as string;
    const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : req.ip;
    const userAgent = req.headers['user-agent'] as string;

    return {
      sid,
      userId,
      userRole,
      ip,
      userAgent,
    };
  },
);

export const Roles = (...roles: UserRole[]): CustomDecorator<string> =>
  SetMetadata(ROLES_KEY, roles);

export const ToNumber = () =>
  Transform(({ value }) => (!value ? 0 : Number(`${value}`)));

export const ToBoolean = () =>
  Transform(
    ({ value }) =>
      value === 'true' || value === true || value === 1 || value === '1',
  );
