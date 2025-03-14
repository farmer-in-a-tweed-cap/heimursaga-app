import {
  ILoginQueryPayload,
  IPostCreatePayload,
  IPostCreateResponse,
  IPostQueryMapResponse,
  IPostQueryResponse,
  IPostUpdatePayload,
  ISessionUserQueryResponse,
  ISignupQueryPayload,
} from '@/types/api-types';

import { apiClient } from './api-client';

export const QUERY_KEYS = {
  LOGIN: 'login',
  SIGNUP: 'signup',
  POSTS: 'posts',
  GET_POSTS: 'get_posts',
  QUERY_POST_MAP: 'query_post_map',
  GET_SESSION_USER: 'get_session_user',
  GET_SESSION: 'get_session',
};

const createQuery = <T = any, R = any>(
  queryKey: string[],
  queryFn: (query?: T) => Promise<R>,
) => {
  return { queryKey: [queryKey], queryFn };
};

const createMutation = <T = any, R = any>(
  mutationFn: (payload: T) => Promise<R>,
) => {
  return { mutationFn };
};

export const loginMutation = createMutation<ILoginQueryPayload, void>(
  (payload) =>
    apiClient.login(payload).then(({ success, message, data }) => {
      if (!success) {
        throw new Error(message);
      }
      return data;
    }),
);

export const signupMutation = createMutation<ISignupQueryPayload, void>(
  (payload) =>
    apiClient.signup(payload).then(({ success, message, data }) => {
      if (!success) {
        throw new Error(message);
      }
      return data;
    }),
);

export const getPostsQuery = createQuery<any, IPostQueryResponse>(
  [QUERY_KEYS.GET_POSTS],
  (query) =>
    apiClient.getPosts(query).then(({ success, message, data }) => {
      if (!success) {
        throw new Error(message);
      }
      return data as IPostQueryResponse;
    }),
);

export const queryPostMapQuery = createQuery<any, IPostQueryMapResponse>(
  [QUERY_KEYS.GET_POSTS],
  (query) =>
    apiClient.queryPostsMap(query).then(({ success, message, data }) => {
      if (!success) {
        throw new Error(message);
      }
      return data as IPostQueryMapResponse;
    }),
);

export const postCreateMutation = createMutation<
  IPostCreatePayload,
  IPostCreateResponse
>((payload) =>
  apiClient.createPost(payload).then(({ success, message, data }) => {
    if (!success) {
      throw new Error(message);
    }
    return data as IPostCreateResponse;
  }),
);

export const postUpdateMutation = createMutation<IPostUpdatePayload, void>(
  (payload) =>
    apiClient.updatePost(payload).then(({ success, message }) => {
      if (!success) {
        throw new Error(message);
      }
    }),
);
