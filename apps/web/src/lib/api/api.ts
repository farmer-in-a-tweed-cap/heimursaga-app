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
    UPDATE_PICTURE: '/user/picture',
    NOTIFICATIONS: '/user/notifications',
    SETTINGS: {
      PROFILE: '/user/settings/profile',
    },
    POSTS: '/user/posts',
    MEMBERSHIP_TIERS: {
      GET: `/user/membership-tiers`,
      GET_BY_ID: (id: string) => `/user/membership-tiers/${id}`,
      UPDATE: (id: string) => `/user/membership-tiers/${id}`,
      DELETE: (id: string) => `/user/membership-tiers/${id}`,
    },
  },
  USERS: {
    GET_BY_USERNAME: (username: string) => `/users/${username}`,
    GET_POSTS: (username: string) => `/users/${username}/posts`,
    MAP: (username: string) => `/users/${username}/map`,
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
  PAYMENT_METHODS: {
    GET_ALL: 'payment-methods',
    GET_BY_ID: (id: string) => `payment-methods/${id}`,
    CREATE: 'payment-methods',
    DELETE: (id: string) => `payment-methods/${id}`,
  },
  STRIPE: {
    CREATE_SETUP_INTENT: 'stripe/create-setup-intent',
    CREATE_PAYMENT_INTENT: 'stripe/create-payment-intent',
  },
};

export const API_HEADERS = {
  CONTENT_TYPE: {
    JSON: 'application/json',
    MULTIPART_FORM_DATA: 'multipart/form-data',
  },
};

export const API_CONTENT_TYPES = {
  JSON: 'json',
  FORM_DATA: 'form-data',
};

export const API_METHODS = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  PATCH: 'PATCH',
  DELETE: 'DELETE',
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
      contentType?: string;
      url?: string;
      parseJson?: boolean;
      cookie?: string;
    },
  ): Promise<IApiResponse<R>> {
    const { baseUrl, headers: globalHeaders } = this;
    const { cookie, body, contentType, ...options } = config || {};

    // parse url
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

    // set content type
    switch (contentType) {
      case API_CONTENT_TYPES.JSON:
        headers = {
          ...headers,
          'Content-Type': API_HEADERS.CONTENT_TYPE.JSON,
        };
        break;
      case API_CONTENT_TYPES.FORM_DATA:
        // @ts-ignore
        delete headers['Content-Type'];
        break;
      default:
        headers = {
          ...headers,
          'Content-Type': API_HEADERS.CONTENT_TYPE.JSON,
        };
        break;
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
      headers,
      credentials: 'include',
      body,
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

    const result: IApiResponse<R> = {
      success: true,
      data: json,
    };

    return result;
  }
}
