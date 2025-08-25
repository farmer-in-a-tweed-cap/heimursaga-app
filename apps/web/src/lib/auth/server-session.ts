import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { UserRole } from '@repo/types';

import { apiClient } from '@/lib/api';
import { ROUTER } from '@/router';

export async function getServerSession() {
  const cookie = cookies().toString();
  
  try {
    const response = await apiClient.getSession({ cookie });
    return response.data;
  } catch (error) {
    console.warn('Server-side session fetch failed:', error);
    return null;
  }
}

export async function requireServerSession(options?: {
  roles?: UserRole[];
  redirectTo?: string;
}) {
  const session = await getServerSession();
  const redirectTo = options?.redirectTo || ROUTER.LOGIN;
  
  if (!session) {
    redirect(redirectTo);
  }
  
  // Check roles if specified
  if (options?.roles && options.roles.length > 0) {
    const hasAccess = options.roles.includes(session.role as UserRole);
    if (!hasAccess) {
      redirect(ROUTER.HOME);
    }
  }
  
  return session;
}