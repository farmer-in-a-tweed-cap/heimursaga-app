import {
  ILoginQueryPayload,
  ISessionUserQueryResponse,
  ISignupQueryPayload,
} from '../../types/api-types';

import { apiClient } from './api-client';

export const QUERY_KEYS = {
  LOGIN: 'login',
  SIGNUP: 'signup',
  POSTS: 'posts',
  GET_SESSION_USER: 'get_session_user',
  GET_SESSION: 'get_session',
};

const createQuery = <T = any>(
  queryKey: string[],
  queryFn: () => Promise<T>,
) => {
  return { queryKey: [queryKey], queryFn };
};

const createMutation = <T = any, R = any>(
  mutationFn: (payload: T) => Promise<R>,
) => {
  return { mutationFn };
};

export const loginMutation = createMutation<ILoginQueryPayload, void>(
  (payload: ILoginQueryPayload) =>
    apiClient.login(payload).then(({ data }) => data),
);

export const signupMutation = createMutation<ISignupQueryPayload, void>(
  (payload: ISignupQueryPayload) =>
    apiClient.signup(payload).then(({ data }) => data),
);

export const getPostById = createQuery([QUERY_KEYS.POSTS], apiClient.test);
