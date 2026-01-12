import {
  IBadgeCountGetResponse,
  ILoginPayload,
  IMapQueryPayload,
  IMapQueryResponse,
  IMediaUploadResponse,
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
  IPayoutMethodGetResponse,
  IPayoutMethodPlatformLinkGetResponse,
  IPostCreatePayload,
  IPostCreateResponse,
  IPostGetByIdResponse,
  IPostInsightsGetResponse,
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
  ISponsorshipTierCreatePayload,
  IStripeCreateSetupIntentResponse,
  IStripePlatformAccountLinkGeneratePayload,
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
  IMessageSendPayload,
  IMessagesGetResponse,
  IConversationsGetResponse,
  IMessageUnreadCountResponse,
  IWaypointCreateResponse,
  IWaypointGetByIdResponse,
  IWaypointUpdatePayload,
  ICommentListResponse,
  ICommentDetail,
  ICommentCreatePayload,
  ICommentUpdatePayload,
  ICommentDeleteResponse,
  ICommentToggleResponse,
  IFlagCreatePayload,
  IFlagCreateResponse,
  IFlagListResponse,
  IFlagDetail,
  IFlagUpdatePayload,
  FlagStatus,
} from '@repo/types';
import { config } from 'process';

import {
  API_CONTENT_TYPES,
  API_HEADERS,
  API_METHODS,
  API_ROUTER,
  Api,
} from './api';

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
  search: async ({ payload }: IApiClientQueryWithPayload<{}, { search: string }>) =>
    api.request<{ users: any[]; entries: any[] }>(API_ROUTER.SEARCH, {
      method: API_METHODS.POST,
      body: JSON.stringify(payload),
    }),
  resetPassword: async (payload: IPasswordResetPayload) =>
    api.request<void>(API_ROUTER.RESET_PASSWORD, {
      method: API_METHODS.POST,
      body: JSON.stringify(payload),
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
  sendEmailVerification: async (payload: { email: string }) =>
    api.request<void>(API_ROUTER.SEND_EMAIL_VERIFICATION, {
      method: API_METHODS.POST,
      body: JSON.stringify(payload),
    }),
  verifyEmail: async (payload: { token: string }) =>
    api.request<void>(API_ROUTER.VERIFY_EMAIL, {
      method: API_METHODS.POST,
      body: JSON.stringify(payload),
    }),
  resendEmailVerification: async (config?: RequestConfig) =>
    api.request<{ success: boolean; message: string }>(API_ROUTER.RESEND_EMAIL_VERIFICATION, {
      method: API_METHODS.POST,
      body: JSON.stringify({}),
      ...config,
    }),
  // posts
  getPosts: async (config?: RequestConfig) =>
    api.request<IPostQueryResponse>(API_ROUTER.POSTS.GET, {
      method: API_METHODS.GET,
      ...config,
    }),
  getDrafts: async (config?: RequestConfig) =>
    api.request<IPostQueryResponse>(API_ROUTER.USER.DRAFTS, {
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
  getComments: async (
    { postId, limit, cursor }: { postId: string; limit?: number; cursor?: string },
    config?: RequestConfig,
  ) => {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (cursor) params.append('cursor', cursor);
    const query = params.toString();
    return api.request<ICommentListResponse>(
      `${API_ROUTER.POSTS.COMMENTS.GET(postId)}${query ? `?${query}` : ''}`,
      {
        method: API_METHODS.GET,
        cookie: config ? config.cookie : undefined,
      },
    );
  },
  createComment: async (
    { postId, content, parentId }: { postId: string; content: string; parentId?: string },
    config?: RequestConfig,
  ) =>
    api.request<ICommentDetail>(API_ROUTER.POSTS.COMMENTS.CREATE(postId), {
      method: API_METHODS.POST,
      body: JSON.stringify({ content, parentId }),
      cookie: config ? config.cookie : undefined,
    }),
  updateComment: async (
    { commentId, content }: { commentId: string; content: string },
    config?: RequestConfig,
  ) =>
    api.request<ICommentDetail>(API_ROUTER.POSTS.COMMENTS.UPDATE(commentId), {
      method: API_METHODS.PUT,
      body: JSON.stringify({ content }),
      cookie: config ? config.cookie : undefined,
    }),
  deleteComment: async (
    { commentId }: { commentId: string },
    config?: RequestConfig,
  ) =>
    api.request<ICommentDeleteResponse>(
      API_ROUTER.POSTS.COMMENTS.DELETE(commentId),
      {
        method: API_METHODS.DELETE,
        body: JSON.stringify({}),
        cookie: config ? config.cookie : undefined,
      },
    ),
  togglePostComments: async (
    { postId }: { postId: string },
    config?: RequestConfig,
  ) =>
    api.request<ICommentToggleResponse>(API_ROUTER.POSTS.COMMENTS.TOGGLE(postId), {
      method: API_METHODS.PATCH,
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
  // upload
  uploadImage: async ({ file }: { file: File }) => {
    const form = new FormData();
    form.append('file', file);

    return api.request<IMediaUploadResponse>(API_ROUTER.UPLOAD, {
      method: API_METHODS.POST,
      contentType: API_CONTENT_TYPES.FORM_DATA,
      body: form,
      ...config,
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
  markNotificationsAsRead: async (config?: RequestConfig) =>
    api.request<void>(API_ROUTER.USER.NOTIFICATIONS_MARK_READ, {
      method: API_METHODS.POST,
      body: JSON.stringify({}),
      cookie: config ? config.cookie : undefined,
    }),
  getBadgeCount: async (config?: RequestConfig) =>
    api.request<IBadgeCountGetResponse>(API_ROUTER.USER.BADGE_COUNT, {
      method: API_METHODS.GET,
      ...config,
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
  createSponsorshipTier: async (
    {
      query,
      payload,
    }: IApiClientQueryWithPayload<
      {},
      ISponsorshipTierCreatePayload
    >,
    config?: RequestConfig,
  ) =>
    api.request<{ id: string }>(API_ROUTER.SPONSORSHIP_TIERS.CREATE, {
      method: API_METHODS.POST,
      body: JSON.stringify(payload),
      cookie: config ? config.cookie : undefined,
    }),
  deleteSponsorshipTierById: async (
    { query }: IApiClientQuery<{ id: string }>,
    config?: RequestConfig,
  ) =>
    api.request<void>(API_ROUTER.SPONSORSHIP_TIERS.DELETE(query.id), {
      method: API_METHODS.DELETE,
      contentType: API_CONTENT_TYPES.FORM_DATA, // This removes content-type header
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

  validatePromoCode: async (
    payload: { promoCode: string; planId: string; period: string },
    config?: RequestConfig,
  ) =>
    api.request<{
      success: boolean;
      data?: {
        valid: boolean;
        coupon: {
          id: string;
          name: string;
          percentOff: number | null;
          amountOff: number | null;
          currency: string | null;
        };
        pricing: {
          originalAmount: number;
          discountAmount: number;
          finalAmount: number;
          currency: string;
        };
      };
      error?: string;
    }>(API_ROUTER.PLAN.VALIDATE_PROMO_CODE, {
      method: API_METHODS.POST,
      body: JSON.stringify(payload),
      cookie: config ? config.cookie : undefined,
    }),
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
    api.request<IPayoutMethodGetResponse>(API_ROUTER.PAYOUT_METHODS.GET_ALL, {
      method: API_METHODS.GET,
      ...config,
    }),
  createPayoutMethod: async (
    payload: IPayoutMethodCreatePayload,
    config?: RequestConfig,
  ) =>
    api.request<IPayoutMethodCreateResponse>(API_ROUTER.PAYOUT_METHODS.CREATE, {
      method: API_METHODS.POST,
      body: JSON.stringify(payload),
      ...config,
    }),

  // stripe-account-links
  generateStripePlatformAccountLink: async (
    {
      payload,
    }: IApiClientQueryWithPayload<
      {},
      IStripePlatformAccountLinkGeneratePayload
    >,
    config?: RequestConfig,
  ) =>
    api.request<IPayoutMethodPlatformLinkGetResponse>(
      API_ROUTER.STRIPE_ACCOUNT_LINKS.GENERATE,
      {
        method: API_METHODS.POST,
        body: JSON.stringify(payload),
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
  toggleSponsorshipEmailDelivery: async (
    { query, payload }: IApiClientQueryWithPayload<{ sponsorshipId: string }, { enabled: boolean }>,
    config?: RequestConfig,
  ) =>
    api.request<void>(API_ROUTER.SPONSORSHIPS.EMAIL_DELIVERY(query.sponsorshipId), {
      method: API_METHODS.PATCH,
      body: JSON.stringify(payload),
      ...config,
    }),
  // insights
  getPostInsights: async (config?: RequestConfig) =>
    api.request<IPostInsightsGetResponse>(API_ROUTER.USER.INSIGHTS.POST, {
      method: API_METHODS.GET,
      ...config,
    }),

  // trips
  getTrips: async (config?: RequestConfig) =>
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
      body: JSON.stringify({}),
      ...config,
    }),

  // map
  createWaypoint: async (
    { payload }: IApiClientQueryWithPayload<{}, IWaypointCreatePayload>,
    config?: RequestConfig,
  ) =>
    api.request<IWaypointCreateResponse>(API_ROUTER.MAP.WAYPOINTS.CREATE, {
      method: API_METHODS.POST,
      body: JSON.stringify(payload),
      ...config,
    }),
  updateWaypoint: async (
    {
      query,
      payload,
    }: IApiClientQueryWithPayload<{ id: number }, IWaypointUpdatePayload>,
    config?: RequestConfig,
  ) =>
    api.request<void>(API_ROUTER.MAP.WAYPOINTS.UPDATE(query.id), {
      method: API_METHODS.PUT,
      body: JSON.stringify(payload),
      ...config,
    }),
  deleteWaypoint: async (
    { query }: IApiClientQuery<{ id: number }>,
    config?: RequestConfig,
  ) =>
    api.request<void>(API_ROUTER.MAP.WAYPOINTS.DELETE(query.id), {
      method: API_METHODS.DELETE,
      body: JSON.stringify({}),
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
  updateTripWaypoint: async (
    {
      query,
      payload,
    }: IApiClientQueryWithPayload<
      { tripId: string; waypointId: number },
      IWaypointUpdatePayload
    >,
    config?: RequestConfig,
  ) =>
    api.request<void>(
      API_ROUTER.TRIPS.WAYPOINTS.UPDATE({
        trip_id: query.tripId,
        waypoint_id: query.waypointId,
      }),
      {
        method: API_METHODS.PUT,
        body: JSON.stringify(payload),
        ...config,
      },
    ),
  deleteTripWaypoint: async (
    { query }: IApiClientQuery<{ tripId: string; waypointId: number }>,
    config?: RequestConfig,
  ) =>
    api.request<void>(
      API_ROUTER.TRIPS.WAYPOINTS.DELETE({
        trip_id: query.tripId,
        waypoint_id: query.waypointId,
      }),
      {
        method: API_METHODS.DELETE,
        body: JSON.stringify({}),
        ...config,
      },
    ),
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

        // Check if search looks like coordinates (supports both lat,lon and lon,lat)
        const coordinatePattern = /^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/;
        const coordMatch = search.trim().match(coordinatePattern);

        if (coordMatch) {
          // Parse coordinates
          const [_, first, second] = coordMatch;
          const num1 = parseFloat(first);
          const num2 = parseFloat(second);

          // Determine if it's lat,lon or lon,lat based on valid ranges
          // Latitude: -90 to 90, Longitude: -180 to 180
          let lon: number, lat: number;

          if (Math.abs(num1) <= 90 && Math.abs(num2) <= 180) {
            // Likely lat,lon format - swap to lon,lat for Mapbox
            lat = num1;
            lon = num2;
          } else if (Math.abs(num2) <= 90 && Math.abs(num1) <= 180) {
            // Already in lon,lat format
            lon = num1;
            lat = num2;
          } else {
            // Invalid coordinates, treat as regular search
            lon = num1;
            lat = num2;
          }

          // Return coordinates directly as a searchable result
          // Create a small bounding box around the point for zoom context
          const padding = 0.01; // approximately 1km at equator
          const items = [{
            id: 'coordinate-search',
            name: `${lat.toFixed(6)}, ${lon.toFixed(6)}`,
            context: 'Coordinates',
            bounds: [lon - padding, lat - padding, lon + padding, lat + padding] as [number, number, number, number],
            center: [lon, lat] as [number, number],
          }];

          return { items };
        } else {
          // Regular text search with type filters
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

          return { items };
        }
      } catch (e) {
        throw new Error('mapbox request failed');
      }
    },
  },

  // messaging
  messages: {
    getConversations: async (config?: RequestConfig) =>
      api.request<IConversationsGetResponse>(API_ROUTER.MESSAGES.CONVERSATIONS, {
        method: API_METHODS.GET,
        ...config,
      }),

    getConversation: async ({ query }: IApiClientQuery<{ username: string }>, config?: RequestConfig) =>
      api.request<IMessagesGetResponse>(API_ROUTER.MESSAGES.CONVERSATION(query.username), {
        method: API_METHODS.GET,
        ...config,
      }),

    sendMessage: async ({ payload }: IApiClientQueryWithPayload<{}, IMessageSendPayload>, config?: RequestConfig) =>
      api.request<void>(API_ROUTER.MESSAGES.SEND, {
        method: API_METHODS.POST,
        body: JSON.stringify(payload),
        contentType: API_CONTENT_TYPES.JSON,
        ...config,
      }),

    markMessageRead: async ({ query }: IApiClientQuery<{ messageId: string }>, config?: RequestConfig) =>
      api.request<void>(API_ROUTER.MESSAGES.MARK_READ(query.messageId), {
        method: API_METHODS.PATCH,
        body: JSON.stringify({}),
        ...config,
      }),

    getUnreadCount: async (config?: RequestConfig) =>
      api.request<IMessageUnreadCountResponse>(API_ROUTER.MESSAGES.UNREAD_COUNT, {
        method: API_METHODS.GET,
        ...config,
      }),
  },

  // Flags
  createFlag: async (
    { payload }: IApiClientQueryWithPayload<{}, IFlagCreatePayload>,
    config?: RequestConfig,
  ) =>
    api.request<IFlagCreateResponse>(API_ROUTER.FLAGS.CREATE, {
      method: API_METHODS.POST,
      body: JSON.stringify(payload),
      contentType: API_CONTENT_TYPES.JSON,
      ...config,
    }),

  getFlags: async (
    { query }: IApiClientQuery<{ status?: FlagStatus; limit?: number; offset?: number }>,
    config?: RequestConfig,
  ) => {
    const params = new URLSearchParams();
    if (query.status) params.append('status', query.status);
    if (query.limit !== undefined) params.append('limit', query.limit.toString());
    if (query.offset !== undefined) params.append('offset', query.offset.toString());

    return api.request<IFlagListResponse>(
      `${API_ROUTER.FLAGS.GET}?${params.toString()}`,
      {
        method: API_METHODS.GET,
        ...config,
      },
    );
  },

  getFlagById: async (
    { query }: IApiClientQuery<{ flagId: string }>,
    config?: RequestConfig,
  ) =>
    api.request<IFlagDetail>(API_ROUTER.FLAGS.GET_BY_ID(query.flagId), {
      method: API_METHODS.GET,
      ...config,
    }),

  updateFlag: async (
    { query, payload }: IApiClientQueryWithPayload<
      { flagId: string },
      IFlagUpdatePayload
    >,
    config?: RequestConfig,
  ) =>
    api.request<void>(API_ROUTER.FLAGS.UPDATE(query.flagId), {
      method: API_METHODS.PUT,
      body: JSON.stringify(payload),
      contentType: API_CONTENT_TYPES.JSON,
      ...config,
    }),
};

export const API_QUERY_KEYS = {
  LOGIN: 'login',
  SIGNUP: 'signup',
  POSTS: 'posts',
  GET_POSTS: 'get_posts',
  GET_USER_POSTS: 'get_user_posts',
  QUERY_POST_MAP: 'query_post_map',
  GET_SESSION_USER: 'get_session_user',
  GET_SESSION: 'get_session',
  MAP: {
    QUERY: 'map_query',
  },
  USERS: 'users',
  USER_FOLLOWERS: 'user_followers',
  USER_FOLLOWING: 'user_following',
  USER_FEED: 'user_feed',
  USER_BOOKMARKS: 'user_bookmarks',
  USER_DRAFTS: 'user_drafts',
  USER_SETTINGS_PROFILE: 'user_settings_profile',
  USER_PAYMENT_METHODS: 'user_payment_methods,',
  USER: {
    POSTS: 'user_posts',
    NOTIFICATIONS: 'user_notifications',
    MAP: 'user_map',
    SPONSORSHIPS: 'user_sponsorships',
    BOOKMARKS: 'user_bookmarks',
    BADGE_COUNT: 'user_badge_count',
  },
  MEMBERSHIPS: 'memberships',
  PAYOUT_METHODS: 'payout_methods',
  PAYOUTS: 'payouts',
  BALANCE: 'balance',
  SPONSORSHIPS: 'sponsorships',
  USER_SPONSORSHIPS: 'user_sponsorships',
  CREATOR_SPONSORSHIPS: 'creator_sponsorships',
  SPONSORSHIP_TIERS: 'sponsorship_tiers',
  INSIGHTS: {
    POST: 'post_insights',
  },
  TRIPS: 'trips',
  MESSAGES: {
    CONVERSATIONS: 'messages_conversations',
    CONVERSATION: 'messages_conversation',
    UNREAD_COUNT: 'messages_unread_count',
  },
  FLAGS: 'flags',
  FLAG_DETAIL: 'flag_detail',
};
