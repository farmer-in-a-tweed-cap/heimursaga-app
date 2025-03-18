import { redirect } from 'next/navigation';

import { ROUTER } from '@/router';

export default async function Page() {
  return redirect(ROUTER.USER.SETTINGS.PROFILE);
}
