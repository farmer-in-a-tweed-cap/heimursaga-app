export const API_ROUTER = {
  TEST: 'test',
  LOGIN: 'auth/login',
  SIGNUP: 'auth/signup',
  LOGOUT: 'auth/logout',
  GET_SESSION_USER: 'auth/user',
  POSTS: {
    GET_BY_ID: (id: string) => `posts/${id}`,
    CREATE: 'posts',
  },
};

type ApiConfig = {
  baseUrl: string;
  headers?: HeadersInit;
};

type ApiResponse<T = any> = {
  success: boolean;
  status?: number;
  data?: T;
  message?: string;
};

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
  ): Promise<ApiResponse<R>> {
    const { baseUrl, headers: globalHeaders } = this;
    const { cookie, ...options } = config || {};

    const url = `${baseUrl}/${path}`;

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
      const { message, status } = (json as ApiResponse) || {};

      return {
        success: false,
        status,
        message,
      } satisfies ApiResponse<R>;
    }

    const body: ApiResponse<R> = {
      success: true,
      data: json,
    };

    return body;
  }
}
