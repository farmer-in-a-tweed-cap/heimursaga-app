'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { apiClient } from '@/lib/api';

import { ROUTER } from '@/router';

export const logout = async (): Promise<void> => {
  const cookie = cookies().toString();

  console.log('remove cookie', { cookie });

  const response = await fetch('http://localhost:5000/v1/auth/logout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie,
    },
    body: JSON.stringify({}),
  });

  //   const response = await apiClient.logout({ cookie }).catch((e) => {
  //     console.log(e);
  //   });

  console.log(response);

  //   if (response) {
  //     redirect(ROUTER.HOME);
  //   }
};
