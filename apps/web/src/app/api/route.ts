import { NextRequest, NextResponse } from 'next/server';

import { API_ROUTER, api } from '@/lib/api/api';

export async function POST(request: NextRequest) {
  const body = await request.json();

  console.log('api route', body);

  const response = await api.request(API_ROUTER.LOGIN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    parseJson: false,
  });

  if (!response.ok) {
    return NextResponse.json(
      { error: 'login failed' },
      { status: response.status },
    );
  }

  const setCookie = response.headers.get('set-cookie');

  console.log({ cookie: setCookie });

  // forward the cookie to the browser and redirect
  const nextResponse = NextResponse.redirect(new URL('/', request.url));
  if (setCookie) {
    nextResponse.headers.set('Set-Cookie', setCookie);
  }

  return nextResponse;
}
