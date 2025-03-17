export const API_ROUTER = {
  TEST: 'test',
  LOGIN: 'auth/login',
  SIGNUP: 'auth/signup',
  LOGOUT: 'auth/logout',
  RESET_PASSWORD: 'auth/reset-password',
  CHANGE_PASSWORD: 'auth/change-password',
  VALIDATE_TOKEN: (token: string) => `/auth/tokens/${token}`,
  GET_SESSION_USER: 'auth/user',
  SEARCH: '/search',
  USER: {
    FEED: `/user/feed`,
    BOOKMARKS: `/user/bookmarks`,
    DRAFTS: `/user/drafts`,
  },
  USERS: {
    GET_BY_USERNAME: (username: string) => `/users/${username}`,
    GET_POSTS: (username: string) => `/users/${username}/posts`,
    FOLLOWERS: (username: string) => `/users/${username}/followers`,
    FOLLOWING: (username: string) => `/users/${username}/following`,
    FOLLOW: (username: string) => `/users/${username}/follow`,
    UNFOLLOW: (username: string) => `/users/${username}/unfollow`,
  },
  POSTS: {
    QUERY: '/posts',
    GET_BY_ID: (id: string) => `posts/${id}`,
    CREATE: 'posts',
    UPDATE: (id: string) => `posts/${id}`,
    LIKE: (id: string) => `posts/${id}/like`,
    BOOKMARK: (id: string) => `posts/${id}/bookmark`,
  },
};

type ApiConfig = {
  baseUrl: string;
  headers?: HeadersInit;
};

export interface IApiResponse<T = any> {
  success: boolean;
  status?: number;
  data?: T;
  message?: string;
}

export class Api {
  public baseUrl: string;
  public headers?: HeadersInit;

  constructor(config: ApiConfig) {
    const { baseUrl, headers } = config;
    this.baseUrl = baseUrl;
    this.headers = headers;
  }

  async request<R = any>(
    path: string,
    config?: RequestInit & {
      url?: string;
      parseJson?: boolean;
      cookie?: string;
    },
  ): Promise<IApiResponse<R>> {
    const { baseUrl, headers: globalHeaders } = this;
    const { cookie, ...options } = config || {};

    const url = new URL(
      path.startsWith('/') ? path.slice(1, path.length) : path,
      baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`,
    ).toString();

    let headers: HeadersInit = {} as HeadersInit;

    // set global headers
    if (globalHeaders) {
      headers = {
        ...globalHeaders,
        ...headers,
      };
    }

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

    const json = await response.json().catch(() => ({}));

    if (!response.ok) {
      const { message, status } = (json as IApiResponse) || {};

      return {
        success: false,
        status,
        message,
      } satisfies IApiResponse<R>;
    }

    const body: IApiResponse<R> = {
      success: true,
      data: json,
    };

    return body;
  }
}
