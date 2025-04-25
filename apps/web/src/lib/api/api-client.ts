import {
  ILoginPayload,
  IPasswordResetPayload,
  IPasswordUpdatePayload,
  IPaymentMethodCreatePayload,
  IPaymentMethodGetAllResponse,
  IPaymentMethodGetByIdResponse,
  IPostCreatePayload,
  IPostCreateResponse,
  IPostDetail,
  IPostQueryMapResponse,
  IPostQueryResponse,
  IPostUpdatePayload,
  ISearchQueryPayload,
  ISearchQueryResponse,
  ISessionUserGetResponse,
  ISignupPayload,
  IStripeCreateSetupIntentResponse,
  ISubscriptionPlanGetAllResponse,
  ISubscriptionPlanGetBySlugResponse,
  ISubscriptionPlanUpgradeCheckoutPayload,
  ISubscriptionPlanUpgradeCheckoutResponse,
  ISubscriptionPlanUpgradeCompletePayload,
  IUserFollowersQueryResponse,
  IUserFollowingQueryResponse,
  IUserMapGetResponse,
  IUserMembershipGetAllResponse,
  IUserMembershipTierGetAllResponse,
  IUserMembershipTierUpdatePayload,
  IUserNotificationGetResponse,
  IUserPictureUploadClientPayload,
  IUserPostsQueryResponse,
  IUserProfileDetail,
  IUserSettingsProfileResponse,
  IUserSettingsProfileUpdateQuery,
} from '@repo/types';

import {
  API_CONTENT_TYPES,
  API_HEADERS,
  API_METHODS,
  API_ROUTER,
  Api,
} from './api-router';

const baseUrl = `${process.env.NEXT_PUBLIC_APP_BASE_URL}/api`;

const api = new Api({
  baseUrl,
  headers: {
    'Content-Type': API_HEADERS.CONTENT_TYPE.JSON,
    credentials: 'include',
  },
});

type RequestConfig = {
  cookie?: string;
  cache?: 'no-store';
};

export interface IApiClientQuery<Q = any> {
  query: Q;
}

export interface IApiClientQueryWithPayload<Q = any, T = any> {
  query: Q;
  payload: T;
}

export const apiClient = {
  test: async () =>
    api.request<{ data: any[]; results: number }>(API_ROUTER.TEST),
  login: async ({ payload }: IApiClientQueryWithPayload<{}, ILoginPayload>) =>
    api.request<void>(API_ROUTER.LOGIN, {
      method: API_METHODS.POST,
      body: JSON.stringify(payload),
    }),
  signup: async ({ payload }: IApiClientQueryWithPayload<{}, ISignupPayload>) =>
    api.request<void>(API_ROUTER.SIGNUP, {
      method: API_METHODS.POST,
      body: JSON.stringify(payload),
    }),
  logout: async ({ cookie }: RequestConfig) =>
    api.request<void>(API_ROUTER.LOGOUT, {
      method: API_METHODS.POST,
      body: JSON.stringify({}),
      cookie,
    }),
  resetPassword: async (body: IPasswordResetPayload) =>
    api.request<void>(API_ROUTER.RESET_PASSWORD, {
      method: API_METHODS.POST,
      body: JSON.stringify(body),
    }),
  updatePassword: async ({
    payload,
  }: IApiClientQueryWithPayload<{}, IPasswordUpdatePayload>) =>
    api.request<void>(API_ROUTER.CHANGE_PASSWORD, {
      method: API_METHODS.POST,
      body: JSON.stringify(payload),
    }),
  getSession: async ({ cookie }: RequestConfig) =>
    api.request<ISessionUserGetResponse>(API_ROUTER.GET_SESSION_USER, {
      cookie,
    }),
  validateToken: async (token: string, config?: RequestConfig) =>
    api.request<void>(API_ROUTER.VALIDATE_TOKEN(token), {
      cookie: config ? config.cookie : undefined,
    }),
  getPosts: async (query: any, config?: RequestConfig) =>
    api.request<IPostQueryResponse>(API_ROUTER.POSTS.QUERY, config),
  getPostById: async (
    { query }: IApiClientQuery<{ id: string }>,
    config?: RequestConfig,
  ) => api.request<IPostDetail>(API_ROUTER.POSTS.GET_BY_ID(query.id), config),
  createPost: async (body: IPostCreatePayload) =>
    api.request<IPostCreateResponse>(API_ROUTER.POSTS.CREATE, {
      method: API_METHODS.POST,
      body: JSON.stringify(body),
    }),
  updatePost: async (
    {
      query,
      payload,
    }: IApiClientQueryWithPayload<{ id: string }, IPostUpdatePayload>,
    config?: RequestConfig,
  ) =>
    api.request<IPostUpdatePayload>(API_ROUTER.POSTS.UPDATE(query.id), {
      method: API_METHODS.PUT,
      body: JSON.stringify(payload),
      cookie: config ? config.cookie : undefined,
    }),
  getUserByUsername: async (
    { username }: { username: string },
    config?: RequestConfig,
  ) =>
    api.request<IUserProfileDetail>(
      API_ROUTER.USERS.GET_BY_USERNAME(username),
      config,
    ),
  getUserPosts: async (config?: RequestConfig) =>
    api.request<IUserPostsQueryResponse>(API_ROUTER.USER.POSTS, config),
  getUserPostsByUsername: async (
    { username }: { username: string },
    config?: RequestConfig,
  ) =>
    api.request<IUserPostsQueryResponse>(
      API_ROUTER.USERS.GET_POSTS(username),
      config,
    ),
  getUserMapByUsername: async (
    { username }: { username: string },
    config?: RequestConfig,
  ) => api.request<IUserMapGetResponse>(API_ROUTER.USERS.MAP(username), config),
  search: async (query: ISearchQueryPayload, config?: RequestConfig) =>
    api.request<ISearchQueryResponse>(API_ROUTER.SEARCH, {
      method: API_METHODS.POST,
      body: JSON.stringify(query),
      cookie: config ? config.cookie : undefined,
    }),
  likePost: async ({ postId }: { postId: string }, config?: RequestConfig) =>
    api.request<{ likesCount: number }>(API_ROUTER.POSTS.LIKE(postId), {
      method: API_METHODS.POST,
      body: JSON.stringify({}),
      cookie: config ? config.cookie : undefined,
    }),
  bookmarkPost: async (
    { postId }: { postId: string },
    config?: RequestConfig,
  ) =>
    api.request<{ bookmarksCount: number }>(API_ROUTER.POSTS.BOOKMARK(postId), {
      method: API_METHODS.POST,
      body: JSON.stringify({}),
      cookie: config ? config.cookie : undefined,
    }),
  getUserFollowers: async (
    { username }: { username: string },
    config?: RequestConfig,
  ) =>
    api.request<IUserFollowersQueryResponse>(
      API_ROUTER.USERS.FOLLOWERS(username),
      {
        method: API_METHODS.GET,
        cookie: config ? config.cookie : undefined,
      },
    ),
  getUserFollowing: async (
    { username }: { username: string },
    config?: RequestConfig,
  ) =>
    api.request<IUserFollowingQueryResponse>(
      API_ROUTER.USERS.FOLLOWING(username),
      {
        method: API_METHODS.GET,
        cookie: config ? config.cookie : undefined,
      },
    ),
  followUser: async (
    { username }: { username: string },
    config?: RequestConfig,
  ) =>
    api.request<void>(API_ROUTER.USERS.FOLLOW(username), {
      method: API_METHODS.POST,
      body: JSON.stringify({}),
      cookie: config ? config.cookie : undefined,
    }),
  unfollowUser: async (
    { username }: { username: string },
    config?: RequestConfig,
  ) =>
    api.request<void>(API_ROUTER.USERS.UNFOLLOW(username), {
      method: API_METHODS.POST,
      body: JSON.stringify({}),
      cookie: config ? config.cookie : undefined,
    }),
  getUserFeed: async (config?: RequestConfig) =>
    api.request<IPostQueryMapResponse>(API_ROUTER.USER.FEED, {
      method: API_METHODS.GET,
      cookie: config ? config.cookie : undefined,
    }),
  getUserBookmarks: async (config?: RequestConfig) =>
    api.request<IPostQueryMapResponse>(API_ROUTER.USER.BOOKMARKS, {
      method: API_METHODS.GET,
      cookie: config ? config.cookie : undefined,
    }),
  getUserDrafts: async (config?: RequestConfig) =>
    api.request<IPostQueryMapResponse>(API_ROUTER.USER.DRAFTS, {
      method: API_METHODS.GET,
      cookie: config ? config.cookie : undefined,
    }),
  getUserProfileSettings: async (config?: RequestConfig) =>
    api.request<IUserSettingsProfileResponse>(
      API_ROUTER.USER.SETTINGS.PROFILE,
      {
        method: API_METHODS.GET,
        cookie: config ? config.cookie : undefined,
      },
    ),
  updateUserProfileSettings: async (
    payload: IUserSettingsProfileUpdateQuery,
    config?: RequestConfig,
  ) =>
    api.request<void>(API_ROUTER.USER.SETTINGS.PROFILE, {
      method: API_METHODS.PUT,
      body: JSON.stringify(payload),
      cookie: config ? config.cookie : undefined,
    }),
  updateUserPicture: async (
    payload: IUserPictureUploadClientPayload,
    config?: RequestConfig,
  ) => {
    const { file } = payload;

    const form = new FormData();
    form.append('file', file);

    return api.request<void>(API_ROUTER.USER.UPDATE_PICTURE, {
      method: API_METHODS.POST,
      contentType: API_CONTENT_TYPES.FORM_DATA,
      body: form,
      cookie: config ? config.cookie : undefined,
    });
  },
  // stripe
  createStripeSetupIntent: async (config?: RequestConfig) =>
    api.request<IStripeCreateSetupIntentResponse>(
      API_ROUTER.STRIPE.CREATE_SETUP_INTENT,
      {
        method: API_METHODS.POST,
        body: JSON.stringify({}),
        cookie: config ? config.cookie : undefined,
      },
    ),
  createStripePaymentIntent: async (config?: RequestConfig) =>
    api.request<void>(API_ROUTER.STRIPE.CREATE_PAYMENT_INTENT, {
      method: API_METHODS.POST,
      body: JSON.stringify({
        // ..
      }),
      cookie: config ? config.cookie : undefined,
    }),
  // payment method
  getUserPaymentMethods: async (config?: RequestConfig) =>
    api.request<IPaymentMethodGetAllResponse>(
      API_ROUTER.PAYMENT_METHODS.GET_ALL,
      {
        method: API_METHODS.GET,
        cookie: config ? config.cookie : undefined,
      },
    ),
  getPaymentMethodById: async (
    { query }: IApiClientQuery<{ id: string }>,
    config?: RequestConfig,
  ) =>
    api.request<IPaymentMethodGetByIdResponse>(
      API_ROUTER.PAYMENT_METHODS.GET_BY_ID(query.id),
      {
        method: API_METHODS.GET,
        cookie: config ? config.cookie : undefined,
      },
    ),
  createPaymentMethod: async (
    payload: IPaymentMethodCreatePayload,
    config?: RequestConfig,
  ) =>
    api.request<void>(API_ROUTER.PAYMENT_METHODS.CREATE, {
      method: API_METHODS.POST,
      body: JSON.stringify(payload),
      cookie: config ? config.cookie : undefined,
    }),
  deletePaymentMethod: async (
    { query }: IApiClientQuery<{ id: string }>,
    config?: RequestConfig,
  ) =>
    api.request<void>(API_ROUTER.PAYMENT_METHODS.DELETE(query.id), {
      method: API_METHODS.DELETE,
      body: JSON.stringify({}),
      cookie: config ? config.cookie : undefined,
    }),
  // notifications
  getUserNotifications: async (config?: RequestConfig) =>
    api.request<IUserNotificationGetResponse>(API_ROUTER.USER.NOTIFICATIONS, {
      method: API_METHODS.GET,
      cookie: config ? config.cookie : undefined,
    }),
  // sponsorships
  getUserSponsorshipTiers: async (config?: RequestConfig) =>
    api.request<IUserMembershipTierGetAllResponse>(
      API_ROUTER.USER.SPONSORSHIP_TIERS.GET,
      {
        method: API_METHODS.GET,
        cookie: config ? config.cookie : undefined,
      },
    ),
  updateUserSponsorshipTierById: async (
    {
      query,
      payload,
    }: IApiClientQueryWithPayload<
      { id: string },
      IUserMembershipTierUpdatePayload
    >,
    config?: RequestConfig,
  ) =>
    api.request<void>(API_ROUTER.USER.SPONSORSHIP_TIERS.UPDATE(query.id), {
      method: API_METHODS.PUT,
      body: JSON.stringify(payload),
      cookie: config ? config.cookie : undefined,
    }),
  getSponsorshipTiersByUsername: async (
    { username }: { username: string },
    config?: RequestConfig,
  ) =>
    api.request<IUserMembershipGetAllResponse>(
      API_ROUTER.USERS.SPONSORSHIP_TIERS(username),
      {
        method: API_METHODS.GET,
        ...config,
      },
    ),
  // subscription plan
  getSubscriptionPlans: async (config?: RequestConfig) =>
    api.request<ISubscriptionPlanGetAllResponse>(
      API_ROUTER.SUBSCRIPTION_PLANS.GET,
      {
        method: API_METHODS.GET,
        ...config,
      },
    ),
  getSubscriptionBySlug: async (
    { query }: IApiClientQuery<{ slug: string }>,
    config?: RequestConfig,
  ) =>
    api.request<ISubscriptionPlanGetBySlugResponse>(
      API_ROUTER.SUBSCRIPTION_PLANS.GET_BY_SLUG(query.slug),
      {
        method: API_METHODS.GET,
        ...config,
      },
    ),
  checkoutSubscriptionPlanUpgrade: async (
    {
      payload,
    }: IApiClientQueryWithPayload<{}, ISubscriptionPlanUpgradeCheckoutPayload>,
    config?: RequestConfig,
  ) =>
    api.request<ISubscriptionPlanUpgradeCheckoutResponse>(
      API_ROUTER.PLAN.UPGRADE.CHECKOUT,
      {
        method: API_METHODS.POST,
        body: JSON.stringify(payload),
        cookie: config ? config.cookie : undefined,
      },
    ),
  completeSubscriptionPlanUpgrade: async (
    {
      payload,
    }: IApiClientQueryWithPayload<
      ISubscriptionPlanUpgradeCompletePayload,
      void
    >,
    config?: RequestConfig,
  ) =>
    api.request<void>(API_ROUTER.PLAN.UPGRADE.COMPLETE, {
      method: API_METHODS.POST,
      body: JSON.stringify(payload),
      cookie: config ? config.cookie : undefined,
    }),
  downgradeSubscriptionPlan: async (config?: RequestConfig) =>
    api.request<void>(API_ROUTER.PLAN.DOWNGRADE, {
      method: API_METHODS.POST,
      body: JSON.stringify({}),
      ...config,
    }),
};
