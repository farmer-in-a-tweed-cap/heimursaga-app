import React from 'react';
import { UserRole } from '@repo/types';
import { AdminLayout } from '@/layouts';
import { requireServerSession } from '@/lib/auth/server-session';

export default async function Layout({ children }: { children: React.ReactNode }) {
  const session = await requireServerSession({
    roles: [UserRole.ADMIN]
  });
  
  return <AdminLayout initialSession={session}>{children}</AdminLayout>;
}
