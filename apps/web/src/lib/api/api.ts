export const API_ROUTER = {
  SITEMAP: 'sitemap',
  TEST: 'test',
  LOGIN: 'auth/login',
  SIGNUP: 'auth/signup',
  LOGOUT: 'auth/logout',
  RESET_PASSWORD: 'auth/reset-password',
  CHANGE_PASSWORD: 'auth/change-password',
  VALIDATE_TOKEN: (token: string) => `/auth/tokens/${token}`,
  GET_SESSION_USER: 'auth/user',
  MAP: {
    QUERY: '/map',
    WAYPOINTS: {
      GET_BY_ID: (id: number) => `/map/waypoints/${id}`,
      CREATE: `/map/waypoints`,
      UPDATE: (id: number) => `/map/waypoints/${id}`,
      DELETE: (id: number) => `/map/waypoints/${id}`,
    },
  },
  UPLOAD: `/upload`,
  USER: {
    FEED: `/user/feed`,
    BOOKMARKS: `/user/bookmarks`,
    DRAFTS: `/user/drafts`,
    UPDATE_PICTURE: '/user/picture',
    NOTIFICATIONS: '/user/notifications',
    NOTIFICATIONS_MARK_READ: '/user/notifications/mark-read',
    BADGE_COUNT: '/user/badge-count',
    SPONSORSHIPS: '/user/sponsorships',
    SETTINGS: {
      PROFILE: '/user/settings/profile',
    },
    INSIGHTS: {
      POST: '/user/insights/post',
    },
    POSTS: '/user/posts',
  },
  SPONSORSHIP_TIERS: {
    GET: `/sponsorship-tiers`,
    GET_BY_ID: (id: string) => `/sponsorship-tiers/${id}`,
    UPDATE: (id: string) => `/sponsorship-tiers/${id}`,
    DELETE: (id: string) => `/sponsorship-tiers/${id}`,
  },
  PLAN: {
    UPGRADE: {
      CHECKOUT: '/plan/upgrade/checkout',
      COMPLETE: '/plan/upgrade/complete',
    },
    DOWNGRADE: '/plan/downgrade',
    VALIDATE_PROMO_CODE: '/plan/validate-promo-code',
  },
  USERS: {
    GET: '/users',
    GET_BY_USERNAME: (username: string) => `/users/${username}`,
    GET_POSTS: (username: string) => `/users/${username}/posts`,
    MAP: (username: string) => `/users/${username}/map`,
    FOLLOWERS: (username: string) => `/users/${username}/followers`,
    FOLLOWING: (username: string) => `/users/${username}/following`,
    FOLLOW: (username: string) => `/users/${username}/follow`,
    UNFOLLOW: (username: string) => `/users/${username}/unfollow`,
    SPONSORSHIP_TIERS: (username: string) =>
      `/users/${username}/sponsorship-tiers`,
    BLOCK: (username: string) => `/users/${username}/block`,
    TRIPS: (username: string) => `/users/${username}/trips`,
  },
  SUBSCRIPTION_PLANS: {
    GET: '/plans',
    GET_BY_SLUG: (slug: string) => `/plans/${slug}`,
  },
  POSTS: {
    GET: '/posts',
    GET_BY_ID: (id: string) => `posts/${id}`,
    CREATE: 'posts',
    UPDATE: (id: string) => `posts/${id}`,
    DELETE: (id: string) => `posts/${id}`,
    LIKE: (id: string) => `posts/${id}/like`,
    BOOKMARK: (id: string) => `posts/${id}/bookmark`,
  },
  PAYMENT_METHODS: {
    GET_ALL: 'payment-methods',
    GET_BY_ID: (id: string) => `payment-methods/${id}`,
    CREATE: 'payment-methods',
    DELETE: (id: string) => `payment-methods/${id}`,
  },
  STRIPE_ACCOUNT_LINKS: { GENERATE: `/stripe-account-links` },
  PAYOUT_METHODS: {
    GET_ALL: 'payout-methods',
    GET_BY_ID: (id: string) => `payout-methods/${id}`,
    CREATE: 'payout-methods',
    DELETE: (id: string) => `payout-methods/${id}`,
    PLATFORM_LINK: (id: string) => `payout-methods/${id}/platform-link`,
  },
  BALANCE: {
    GET: 'balance',
  },
  SPONSOR: {
    CHECKOUT: 'sponsor/checkout',
  },
  SPONSORSHIPS: {
    GET: 'sponsorships',
    CANCEL: (id: string) => `sponsorships/${id}/cancel`,
  },
  STRIPE: {
    CREATE_SETUP_INTENT: 'stripe/create-setup-intent',
    CREATE_PAYMENT_INTENT: 'stripe/create-payment-intent',
  },
  PAYOUTS: {
    GET: '/payouts',
    CREATE: '/payouts',
  },
  TRIPS: {
    GET: '/trips',
    GET_BY_ID: (id: string) => `/trips/${id}`,
    CREATE: '/trips',
    UPDATE: (id: string) => `/trips/${id}`,
    DELETE: (id: string) => `/trips/${id}`,
    WAYPOINTS: {
      CREATE: ({ trip_id }: { trip_id: string }) =>
        `/trips/${trip_id}/waypoints`,
      UPDATE: ({
        trip_id,
        waypoint_id,
      }: {
        trip_id: string;
        waypoint_id: number;
      }) => `/trips/${trip_id}/waypoints/${waypoint_id}`,
      DELETE: ({
        trip_id,
        waypoint_id,
      }: {
        trip_id: string;
        waypoint_id: number;
      }) => `/trips/${trip_id}/waypoints/${waypoint_id}`,
    },
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
      cache?: 'no-store';
    },
  ): Promise<IApiResponse<R>> {
    try {
      const { baseUrl, headers: globalHeaders } = this;
      const { cookie, cache, body, contentType, ...options } = config || {};

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
        cache,
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
    } catch (e) {
      const response: IApiResponse = {
        success: false,
        message: 'failed to fetch',
      };

      return response;
    }
  }
}
