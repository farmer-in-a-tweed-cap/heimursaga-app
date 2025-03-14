import {
  ILoginQueryPayload,
  IPostCreatePayload,
  IPostCreateResponse,
  IPostDetail,
  IPostFindByIdPayload,
  IPostQueryResponse,
  IPostUpdatePayload,
  ISessionUserQueryResponse,
  ISignupQueryPayload,
} from '@/types/api-types';

import { API_ROUTER, Api } from './api';

const baseUrl = `${process.env.NEXT_PUBLIC_APP_BASE_URL}/api`;

const api = new Api({
  baseUrl,
  headers: {
    'Content-Type': 'application/json',
    credentials: 'include',
  },
});

type RequestConfig = {
  cookie?: string;
};

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
  logout: async ({ cookie }: RequestConfig) =>
    api.request<void>(API_ROUTER.LOGOUT, {
      method: 'POST',
      body: JSON.stringify({}),
      cookie,
    }),
  getSession: async ({ cookie }: RequestConfig) =>
    api.request<ISessionUserQueryResponse>(API_ROUTER.GET_SESSION_USER, {
      cookie,
    }),
  getPosts: async (query: any, config?: RequestConfig) =>
    api.request<IPostQueryResponse>(API_ROUTER.POSTS.QUERY, config),
  getPostById: async (
    { postId }: IPostFindByIdPayload,
    { cookie }: RequestConfig,
  ) => api.request<IPostDetail>(API_ROUTER.POSTS.GET_BY_ID(postId), { cookie }),
  createPost: async (body: IPostCreatePayload) =>
    api.request<IPostCreateResponse>(API_ROUTER.POSTS.CREATE, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updatePost: async (
    { postId, data }: IPostUpdatePayload,
    config?: RequestConfig,
  ) =>
    api.request<IPostUpdatePayload>(API_ROUTER.POSTS.UPDATE(postId), {
      method: 'PUT',
      body: JSON.stringify(data),
      cookie: config ? config.cookie : undefined,
    }),
};
