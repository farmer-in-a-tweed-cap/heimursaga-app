export const API_ROUTER = {
  TEST: 'test',
  LOGIN: 'auth/login',
  SIGNUP: 'auth/signup',
  LOGOUT: 'auth/logout',
  GET_SESSION_USER: 'auth/user',
};

const baseUrl = `${process.env.NEXT_PUBLIC_APP_BASE_URL}/api`;

const request = async <R = any>(
  path: string,
  config?: RequestInit & { url?: string; parseJson?: boolean; cookie?: string },
) => {
  const { parseJson = true, cookie, ...options } = config || {};

  const url = `${baseUrl}/${path}`;

  let headers: HeadersInit = {} as HeadersInit;

  // set cookies
  if (cookie) {
    headers = {
      ...headers,
      cookie,
    };
  }

  // fetch
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('failed to fetch');
  }

  if (parseJson) {
    return response.json() as R;
  }

  return response as R;
};

export const api = {
  request,
};
