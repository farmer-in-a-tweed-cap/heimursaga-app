import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { UserRole } from '@repo/types';

import { ServiceForbiddenException } from '@/common/exceptions';
import { SESSION_KEYS } from '@/common/constants';

@Injectable()
export class CreatorRoleGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const session = request.session;
    
    const userRole = session.get(SESSION_KEYS.USER_ROLE) as UserRole;

    if (!userRole || userRole !== UserRole.CREATOR) {
      throw new ServiceForbiddenException('Only Explorer Pro members can access messaging features');
    }

    return true;
  }
}