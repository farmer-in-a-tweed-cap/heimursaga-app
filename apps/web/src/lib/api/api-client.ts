import {
  ILoginPayload,
  IMapQueryPayload,
  IMapQueryResponse,
  IPasswordResetPayload,
  IPasswordUpdatePayload,
  IPaymentMethodCreatePayload,
  IPaymentMethodGetAllResponse,
  IPaymentMethodGetByIdResponse,
  IPayoutBalanceGetResponse,
  IPayoutCreatePayload,
  IPayoutCreateResponse,
  IPayoutGetResponse,
  IPayoutMethodCreatePayload,
  IPayoutMethodCreateResponse,
  IPayoutMethodGetAllByUsernameResponse,
  IPayoutMethodPlatformLinkGetResponse,
  IPostCreatePayload,
  IPostCreateResponse,
  IPostDetail,
  IPostGetByIdResponse,
  IPostInsightsGetResponse,
  IPostQueryMapResponse,
  IPostQueryResponse,
  IPostUpdatePayload,
  ISessionUserGetResponse,
  ISignupPayload,
  ISitemapGetResponse,
  ISponsorCheckoutPayload,
  ISponsorCheckoutResponse,
  ISponsorshipGetAllResponse,
  ISponsorshipTierGetAllResponse,
  ISponsorshipTierUpdatePayload,
  IStripeCreateSetupIntentResponse,
  ISubscriptionPlanGetAllResponse,
  ISubscriptionPlanGetBySlugResponse,
  ISubscriptionPlanUpgradeCheckoutPayload,
  ISubscriptionPlanUpgradeCheckoutResponse,
  ISubscriptionPlanUpgradeCompletePayload,
  ITripCreatePayload,
  ITripCreateResponse,
  ITripGetAllResponse,
  ITripGetByIdResponse,
  ITripUpdatePayload,
  IUserDetail,
  IUserFollowersQueryResponse,
  IUserFollowingQueryResponse,
  IUserGetAllResponse,
  IUserMapGetResponse,
  IUserNotificationGetResponse,
  IUserPictureUploadClientPayload,
  IUserPostsQueryResponse,
  IUserSettingsProfileGetResponse,
  IUserSettingsProfileUpdatePayload,
  IWaypointCreatePayload,
  IWaypointGetByIdResponse,
  IWaypointUpdatePayload,
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
  generateSitemap: async (config?: RequestConfig) =>
    api.request<ISitemapGetResponse>(API_ROUTER.SITEMAP, {
      method: API_METHODS.GET,
      ...config,
    }),
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
  logout: async (config?: RequestConfig) =>
    api.request<void>(API_ROUTER.LOGOUT, {
      method: API_METHODS.POST,
      body: JSON.stringify({}),
      ...config,
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
  // posts
  getPosts: async (config?: RequestConfig) =>
    api.request<IPostQueryResponse>(API_ROUTER.POSTS.GET, {
      method: API_METHODS.GET,
      ...config,
    }),
  getPostById: async (
    { query }: IApiClientQuery<{ id: string }>,
    config?: RequestConfig,
  ) =>
    api.request<IPostGetByIdResponse>(API_ROUTER.POSTS.GET_BY_ID(query.id), {
      method: API_METHODS.GET,
      ...config,
    }),
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
  deletePost: async ({ query }: IApiClientQuery<{ postId: string }>) =>
    api.request<void>(API_ROUTER.POSTS.DELETE(query.postId), {
      method: API_METHODS.DELETE,
      body: JSON.stringify({}),
    }),
  // users
  getUsers: async (config?: RequestConfig) =>
    api.request<IUserGetAllResponse>(API_ROUTER.USERS.GET, {
      method: API_METHODS.GET,
      ...config,
    }),
  getUserByUsername: async (
    { username }: { username: string },
    config?: RequestConfig,
  ) =>
    api.request<IUserDetail>(
      API_ROUTER.USERS.GET_BY_USERNAME(username),
      config,
    ),
  blockUser: async (
    { query }: IApiClientQuery<{ username: string }>,
    config?: RequestConfig,
  ) =>
    api.request<void>(API_ROUTER.USERS.BLOCK(query.username), {
      method: API_METHODS.POST,
      body: JSON.stringify({}),
      ...config,
    }),
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
  mapQuery: async (query: IMapQueryPayload, config?: RequestConfig) =>
    api.request<IMapQueryResponse>(API_ROUTER.MAP.QUERY, {
      method: API_METHODS.POST,
      body: JSON.stringify(query),
      ...config,
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
  getUserBookmarks: async (config?: RequestConfig) =>
    api.request<IUserPostsQueryResponse>(API_ROUTER.USER.BOOKMARKS, {
      method: API_METHODS.GET,
      cookie: config ? config.cookie : undefined,
    }),
  getUserProfileSettings: async (config?: RequestConfig) =>
    api.request<IUserSettingsProfileGetResponse>(
      API_ROUTER.USER.SETTINGS.PROFILE,
      {
        method: API_METHODS.GET,
        cookie: config ? config.cookie : undefined,
      },
    ),
  updateUserProfileSettings: async (
    {
      payload,
    }: IApiClientQueryWithPayload<{}, IUserSettingsProfileUpdatePayload>,
    config?: RequestConfig,
  ) =>
    api.request<void>(API_ROUTER.USER.SETTINGS.PROFILE, {
      method: API_METHODS.PUT,
      body: JSON.stringify(payload),
      ...config,
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
  getSponsorshipTiers: async (config?: RequestConfig) =>
    api.request<ISponsorshipTierGetAllResponse>(
      API_ROUTER.SPONSORSHIP_TIERS.GET,
      {
        method: API_METHODS.GET,
        ...config,
      },
    ),
  updateSponsorshipTierById: async (
    {
      query,
      payload,
    }: IApiClientQueryWithPayload<
      { id: string },
      ISponsorshipTierUpdatePayload
    >,
    config?: RequestConfig,
  ) =>
    api.request<void>(API_ROUTER.SPONSORSHIP_TIERS.UPDATE(query.id), {
      method: API_METHODS.PUT,
      body: JSON.stringify(payload),
      cookie: config ? config.cookie : undefined,
    }),
  getSponsorshipTiersByUsername: async (
    { username }: { username: string },
    config?: RequestConfig,
  ) =>
    api.request<ISponsorshipTierGetAllResponse>(
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
  // payout methods
  getUserPayoutMethods: async (config?: RequestConfig) =>
    api.request<IPayoutMethodGetAllByUsernameResponse>(
      API_ROUTER.PAYOUT_METHODS.GET_ALL,
      {
        method: API_METHODS.GET,
        ...config,
      },
    ),
  createPayoutMethod: async (
    payload: IPayoutMethodCreatePayload,
    config?: RequestConfig,
  ) =>
    api.request<IPayoutMethodCreateResponse>(API_ROUTER.PAYOUT_METHODS.CREATE, {
      method: API_METHODS.POST,
      body: JSON.stringify(payload),
      ...config,
    }),
  getPayoutMethodPlatformLink: async (
    { query }: IApiClientQuery<{ id: string }>,
    config?: RequestConfig,
  ) =>
    api.request<IPayoutMethodPlatformLinkGetResponse>(
      API_ROUTER.PAYOUT_METHODS.PLATFORM_LINK(query.id),
      {
        method: API_METHODS.GET,
        ...config,
      },
    ),
  // balance
  getBalance: async (config?: RequestConfig) =>
    api.request<IPayoutBalanceGetResponse>(API_ROUTER.BALANCE.GET, {
      method: API_METHODS.GET,
      ...config,
    }),
  // payouts
  getPayouts: async (config?: RequestConfig) =>
    api.request<IPayoutGetResponse>(API_ROUTER.PAYOUTS.GET, {
      method: API_METHODS.GET,
      ...config,
    }),
  createPayout: async (
    { payload }: IApiClientQueryWithPayload<{}, IPayoutCreatePayload>,
    config?: RequestConfig,
  ) =>
    api.request<IPayoutCreateResponse>(API_ROUTER.PAYOUTS.CREATE, {
      method: API_METHODS.POST,
      body: JSON.stringify(payload),
      ...config,
    }),
  // sponsor
  sponsorCheckout: async (
    { payload }: IApiClientQueryWithPayload<{}, ISponsorCheckoutPayload>,
    config?: RequestConfig,
  ) =>
    api.request<ISponsorCheckoutResponse>(API_ROUTER.SPONSOR.CHECKOUT, {
      method: API_METHODS.POST,
      body: JSON.stringify(payload),
      ...config,
    }),
  getUserSponsorships: async (config?: RequestConfig) =>
    api.request<ISponsorshipGetAllResponse>(API_ROUTER.USER.SPONSORSHIPS, {
      method: API_METHODS.GET,
      ...config,
    }),
  getCreatorSponsorships: async (config?: RequestConfig) =>
    api.request<ISponsorshipGetAllResponse>(API_ROUTER.SPONSORSHIPS.GET, {
      method: API_METHODS.GET,
      ...config,
    }),
  cancelSponsorship: async (
    { query }: IApiClientQuery<{ sponsorshipId: string }>,
    config?: RequestConfig,
  ) =>
    api.request<void>(API_ROUTER.SPONSORSHIPS.CANCEL(query.sponsorshipId), {
      method: API_METHODS.POST,
      body: JSON.stringify({}),
      ...config,
    }),
  // insights
  getPostInsights: async (config?: RequestConfig) =>
    api.request<IPostInsightsGetResponse>(API_ROUTER.USER.INSIGHTS.POST, {
      method: API_METHODS.GET,
      ...config,
    }),

  // trips
  getTrips: async (
    // { payload }: IApiClientQueryWithPayload<{}>,
    config?: RequestConfig,
  ) =>
    api.request<ITripGetAllResponse>(API_ROUTER.TRIPS.GET, {
      method: API_METHODS.GET,
      ...config,
    }),
  getTripsByUsername: async (
    { username }: { username: string },
    config?: RequestConfig,
  ) =>
    api.request<ITripGetAllResponse>(API_ROUTER.USERS.TRIPS(username), {
      method: API_METHODS.GET,
      ...config,
    }),
  getTripById: async (
    { query }: IApiClientQuery<{ tripId: string }>,
    config?: RequestConfig,
  ) =>
    api.request<ITripGetByIdResponse>(
      API_ROUTER.TRIPS.GET_BY_ID(query.tripId),
      {
        method: API_METHODS.GET,
        ...config,
      },
    ),
  createTrip: async (
    { payload }: IApiClientQueryWithPayload<{}, ITripCreatePayload>,
    config?: RequestConfig,
  ) =>
    api.request<ITripCreateResponse>(API_ROUTER.TRIPS.CREATE, {
      method: API_METHODS.POST,
      body: JSON.stringify(payload),
      ...config,
    }),
  updateTrip: async (
    {
      query,
      payload,
    }: IApiClientQueryWithPayload<{ tripId: string }, ITripUpdatePayload>,
    config?: RequestConfig,
  ) =>
    api.request<void>(API_ROUTER.TRIPS.UPDATE(query.tripId), {
      method: API_METHODS.PUT,
      body: JSON.stringify(payload),
      ...config,
    }),
  deleteTrip: async (
    { query }: IApiClientQuery<{ tripId: string }>,
    config?: RequestConfig,
  ) =>
    api.request<void>(API_ROUTER.TRIPS.DELETE(query.tripId), {
      method: API_METHODS.DELETE,
      ...config,
    }),
  createWaypoint: async (
    { payload }: IApiClientQueryWithPayload<{}, IWaypointCreatePayload>,
    config?: RequestConfig,
  ) =>
    api.request<void>(API_ROUTER.MAP.WAYPOINTS.CREATE, {
      method: API_METHODS.POST,
      body: JSON.stringify(payload),
      ...config,
    }),

  // @todo remove trip waypoint methods
  // createTripWaypoint: async (
  //   {
  //     query,
  //     payload,
  //   }: IApiClientQueryWithPayload<{ tripId: string }, IWaypointCreatePayload>,
  //   config?: RequestConfig,
  // ) =>
  //   api.request<void>(
  //     API_ROUTER.JOURNEYS.WAYPOINTS.CREATE({ trip_id: query.tripId }),
  //     {
  //       method: API_METHODS.POST,
  //       body: JSON.stringify(payload),
  //       ...config,
  //     },
  //   ),
  // updateTripWaypoint: async (
  //   {
  //     query,
  //     payload,
  //   }: IApiClientQueryWithPayload<
  //     { tripId: string; waypointId: number },
  //     IWaypointUpdatePayload
  //   >,
  //   config?: RequestConfig,
  // ) =>
  //   api.request<void>(
  //     API_ROUTER.JOURNEYS.WAYPOINTS.UPDATE({
  //       trip_id: query.tripId,
  //       waypoint_id: query.waypointId,
  //     }),
  //     {
  //       method: API_METHODS.PUT,
  //       body: JSON.stringify(payload),
  //       ...config,
  //     },
  //   ),
  // deleteTripWaypoint: async (
  //   { query }: IApiClientQuery<{ tripId: string; waypointId: number }>,
  //   config?: RequestConfig,
  // ) =>
  //   api.request<void>(
  //     API_ROUTER.JOURNEYS.WAYPOINTS.DELETE({
  //       trip_id: query.tripId,
  //       waypoint_id: query.waypointId,
  //     }),
  //     {
  //       method: API_METHODS.DELETE,
  //       body: JSON.stringify({}),
  //       ...config,
  //     },
  //   ),
  // waypoints
  getWaypointById: async (
    { query }: IApiClientQuery<{ id: number }>,
    config?: RequestConfig,
  ) =>
    api.request<IWaypointGetByIdResponse>(
      API_ROUTER.MAP.WAYPOINTS.GET_BY_ID(query.id),
      {
        method: API_METHODS.GET,
        ...config,
      },
    ),
  // mapbox
  mapbox: {
    search: async (query: { token: string; search: string }) => {
      try {
        const { search, token } = query;

        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(search)}.json?access_token=${token}&limit=10&types=country,place&autocomplete=true&language=en`;
        const response = await fetch(url, { method: 'GET' });

        if (!response.ok) {
          throw new Error('mapbox request failed');
        }

        const json = await response.json();
        const features = (json?.features as any[]) || [];

        const items: {
          id: string;
          name: string;
          context: string;
          bounds: [number, number, number, number];
          center: [number, number];
        }[] = features.map(({ id, bbox, text, center, context = [] }) => ({
          id,
          name: text,
          context: context.map(({ text }: any) => text).join(', '),
          bounds: bbox,
          center,
        }));

        const result = {
          items,
        };

        return result;
      } catch (e) {
        throw new Error('mapbox request failed');
      }
    },
  },
};
