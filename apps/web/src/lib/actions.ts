import { API_ROUTER, api } from './api';

export const QUERY_KEYS = {
  LOGIN: 'login',
  SIGNUP: 'signup',
  POSTS: 'posts',
  GET_SESSION_USER: 'get_session_user',
};

const createQuery = <T = any>(queryKey: string, queryFn: () => Promise<T>) => {
  return { queryKey: [queryKey], queryFn };
};

const createSSRQuery = <T = any>(
  queryKey: string,
  queryFn: (props: { cookie?: string }) => Promise<T>,
) => {
  return { queryKey: [queryKey], queryFn };
};

const createMutation = <T = any, R = any>(
  mutationFn: (payload: T) => Promise<R>,
) => {
  return { mutationFn };
};

interface ILoginQueryPayload {
  email: string;
  password: string;
}

export const loginMutation = createMutation(async (body: ILoginQueryPayload) =>
  api.request<void>(API_ROUTER.LOGIN, {
    method: 'POST',
    body: JSON.stringify(body),
  }),
);

interface ISignupQueryPayload {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export const signupMutation = createMutation(
  async (body: ISignupQueryPayload) =>
    api.request<void>(API_ROUTER.SIGNUP, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
);

export const logoutMutation = createMutation(async () =>
  api.request<void>(API_ROUTER.LOGOUT, {
    method: 'POST',
  }),
);

export const fetchPostsQuery = createQuery(QUERY_KEYS.POSTS, async () => {
  return api.request(API_ROUTER.TEST);
});

export interface ISessionUserQueryResponse {
  role: string;
  username: string;
  email: string;
  picture?: string;
  firstName: string;
  lastName: string;
  isEmailVerified: boolean;
  isPremium: boolean;
}

export const getSessionUserSSRQuery = createSSRQuery<ISessionUserQueryResponse>(
  QUERY_KEYS.GET_SESSION_USER,
  async ({ cookie }) => {
    return api.request<ISessionUserQueryResponse>(API_ROUTER.GET_SESSION_USER, {
      cookie,
    });
  },
);

export const fetchSessionUser = ({ cookie }: { cookie?: string }) => {
  return api.request(API_ROUTER.GET_SESSION_USER, { cookie });
};
