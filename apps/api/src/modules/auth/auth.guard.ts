import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { generator } from '@/lib/generator';

import { SESSION_KEYS } from '@/common/constants';
import { PUBLIC_ROUTE_KEY, ROLES_KEY } from '@/common/decorators';
import { Role } from '@/common/enums';
import { ServiceUnauthorizedException } from '@/common/exceptions';
import { IRequest } from '@/common/interfaces';
import { Logger } from '@/modules/logger';

import { AuthService } from './auth.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private logger: Logger,
    private authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const req = context.switchToHttp().getRequest<IRequest>();
      const isRoutePublic = !!this.reflector.getAllAndOverride<boolean>(
        PUBLIC_ROUTE_KEY,
        [context.getHandler(), context.getClass()],
      );

      // validate session id
      const sid = req.session.get(SESSION_KEYS.SID);
      if (!sid) {
        req.session.set(SESSION_KEYS.SID, generator.sessionId());
      }

      // validate session
      const session = await this.authService.validateSession({ sid });

      if (session) {
        req.session.set(SESSION_KEYS.USER_ID, session.userId);
        req.session.set(SESSION_KEYS.USER_ROLE, session.role);
      }

      // check if route is public
      switch (isRoutePublic) {
        case true:
          return true;
        case false:
          if (!session) throw new ServiceUnauthorizedException();
          break;
      }

      return true;
    } catch (e) {
      // this.logger.error(e);
      throw new UnauthorizedException();
    }
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    try {
      const req: IRequest = context.switchToHttp().getRequest();
      const user = req.user;

      // Check if the route is public
      const isPublic = !!this.reflector.getAllAndOverride<boolean>(
        PUBLIC_ROUTE_KEY,
        [context.getHandler(), context.getClass()],
      );
      if (isPublic) return true;

      // Check if the user has required roles
      const requiredRoles = this.reflector.getAllAndOverride<Role[]>(
        ROLES_KEY,
        [context.getHandler(), context.getClass()],
      );
      if (!requiredRoles?.length) {
        return true;
      }

      const isAccess = requiredRoles.some((role) => user?.role === role);
      if (!isAccess) throw new UnauthorizedException();

      return true;
    } catch (e) {
      throw new UnauthorizedException();
    }
  }
}
