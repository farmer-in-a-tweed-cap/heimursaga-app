import {
  ILoginQueryPayload,
  ISessionUserQueryResponse,
  ISignupQueryPayload,
} from '../../types/api-types';

import { API_ROUTER, Api } from './api';

const baseUrl = `${process.env.NEXT_PUBLIC_APP_BASE_URL}/api`;

const api = new Api({
  baseUrl,
  headers: {
    'Content-Type': 'application/json',
    credentials: 'include',
  },
});

export const apiClient = {
  test: async () =>
    api.request<{ data: any[]; results: number }>(API_ROUTER.TEST),
  login: async (body: ILoginQueryPayload) =>
    api.request<void>(API_ROUTER.LOGIN, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  signup: async (body: ISignupQueryPayload) =>
    api.request<void>(API_ROUTER.SIGNUP, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  logout: async ({ cookie }: { cookie: string }) =>
    api.request<void>(API_ROUTER.LOGOUT, {
      method: 'POST',
      body: JSON.stringify({}),
      cookie,
    }),
  getSession: async ({ cookie }: { cookie: string }) =>
    api.request<ISessionUserQueryResponse>(API_ROUTER.GET_SESSION_USER, {
      cookie,
    }),
};
