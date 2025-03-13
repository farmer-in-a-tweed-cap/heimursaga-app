import { apiClient } from './api-client';
import {
  ILoginQueryPayload,
  ISessionUserQueryResponse,
  ISignupQueryPayload,
} from './api-types';

export const QUERY_KEYS = {
  LOGIN: 'login',
  SIGNUP: 'signup',
  POSTS: 'posts',
  GET_SESSION_USER: 'get_session_user',
  GET_SESSION: 'get_session',
};

const createQuery = <T = any>(queryKey: string, queryFn: () => Promise<T>) => {
  return { queryKey: [queryKey], queryFn };
};

const createMutation = <T = any, R = any>(
  mutationFn: (payload: T) => Promise<R>,
) => {
  return { mutationFn };
};

export const loginMutation = createMutation<ILoginQueryPayload, void>(
  apiClient.login,
);

export const signupMutation = createMutation<ISignupQueryPayload, void>(
  apiClient.signup,
);

export const logoutMutation = createMutation<void, void>(apiClient.logout);

export const getSessionQuery = createQuery<ISessionUserQueryResponse>(
  QUERY_KEYS.GET_SESSION,
  () => apiClient.getSession({ cookie: '' }),
);

export const fetchPostsQuery = createQuery(QUERY_KEYS.POSTS, apiClient.test);
