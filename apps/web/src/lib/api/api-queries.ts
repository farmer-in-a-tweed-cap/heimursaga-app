import {
  ILoginPayload,
  IMapQueryPayload,
  IMapQueryResponse,
  IPasswordResetPayload,
  IPasswordUpdatePayload,
  IPaymentMethodGetAllResponse,
  IPostCreatePayload,
  IPostCreateResponse,
  IPostQueryMapResponse,
  IPostQueryResponse,
  IPostUpdatePayload,
  ISignupPayload,
  ISponsorshipTierUpdatePayload,
  IUserFollowersQueryResponse,
  IUserFollowingQueryResponse,
  IUserMapGetResponse,
  IUserNotificationGetResponse,
  IUserPictureUploadClientPayload,
  IUserPostsQueryResponse,
  IUserSettingsProfileGetResponse,
  IUserSettingsProfileUpdatePayload,
} from '@repo/types';

import { IApiClientQueryWithPayload, apiClient } from './api-client';

export const QUERY_KEYS = {
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
  },
  MEMBERSHIPS: 'memberships',
  PAYOUT_METHODS: 'payout_methods',
  PAYOUTS: 'payouts',
  BALANCE: 'balance',
  SPONSORSHIPS: 'sponsorships',
  SPONSORSHIP_TIERS: 'sponsorship_tiers',
  INSIGHTS: {
    POST: 'post_insights',
  },
  TRIPS: 'trips',
};

const createQuery = <T = undefined, R = any>(
  queryKey: string[],
  queryFn: (query: T) => Promise<R>,
) => {
  return { queryKey: [queryKey], queryFn };
};

const createMutation = <T = any, R = any>(
  mutationFn: (payload: T) => Promise<R>,
) => {
  return { mutationFn };
};

export const loginMutation = createMutation<ILoginPayload, void>((payload) =>
  apiClient.login({ query: {}, payload }).then(({ success, message, data }) => {
    if (!success) {
      throw new Error(message);
    }
    return data;
  }),
);

export const signupMutation = createMutation<ISignupPayload, void>((payload) =>
  apiClient
    .signup({ query: {}, payload })
    .then(({ success, message, data }) => {
      if (!success) {
        throw new Error(message);
      }
      return data;
    }),
);

export const resetPasswordMutation = createMutation<
  IPasswordResetPayload,
  void
>((payload) =>
  apiClient.resetPassword(payload).then(({ success, message, data }) => {
    if (!success) {
      throw new Error(message);
    }
    return data;
  }),
);

export const updatePasswordMutation = createMutation<
  IPasswordUpdatePayload,
  void
>((payload) =>
  apiClient
    .updatePassword({ query: {}, payload })
    .then(({ success, message, data }) => {
      if (!success) {
        throw new Error(message);
      }
      return data;
    }),
);

export const getPostsQuery = createQuery<{}, IPostQueryResponse>(
  [QUERY_KEYS.GET_POSTS],
  (query) =>
    apiClient.getPosts(query).then(({ success, message, data }) => {
      if (!success) {
        throw new Error(message);
      }
      return data as IPostQueryResponse;
    }),
);

export const queryPostMapQuery = createQuery<void, IPostQueryMapResponse>(
  [QUERY_KEYS.GET_POSTS],
  () =>
    apiClient.getPosts().then(({ success, message, data }) => {
      if (!success) {
        throw new Error(message);
      }
      return data as IPostQueryMapResponse;
    }),
);

export const postCreateMutation = createMutation<
  IPostCreatePayload,
  IPostCreateResponse
>((payload) =>
  apiClient.createPost(payload).then(({ success, message, data }) => {
    if (!success) {
      throw new Error(message);
    }
    return data as IPostCreateResponse;
  }),
);

export const postUpdateMutation = createMutation<
  IApiClientQueryWithPayload<{ id: string }, IPostUpdatePayload>,
  void
>((query) =>
  apiClient.updatePost(query).then(({ success, message }) => {
    if (!success) {
      throw new Error(message);
    }
  }),
);

export const getUserPostsQuery = createQuery<void, IUserPostsQueryResponse>(
  [QUERY_KEYS.GET_POSTS],
  () =>
    apiClient.getUserPosts().then(({ success, message, data }) => {
      if (!success) {
        throw new Error(message);
      }
      return data as IUserPostsQueryResponse;
    }),
);

export const getUserPostsByUsernameQuery = createQuery<
  { username: string },
  IUserPostsQueryResponse
>([QUERY_KEYS.GET_POSTS], ({ username }) =>
  apiClient
    .getUserPostsByUsername({ username })
    .then(({ success, message, data }) => {
      if (!success) {
        throw new Error(message);
      }
      return data as IUserPostsQueryResponse;
    }),
);

export const postLikeMutation = createMutation<
  { postId: string },
  { likesCount: number }
>(({ postId }) =>
  apiClient.likePost({ postId }).then(({ success, message, data }) => {
    if (!success) {
      throw new Error(message);
    }

    return data as { likesCount: number };
  }),
);

export const postBookmarkMutation = createMutation<
  { postId: string },
  { bookmarksCount: number }
>(({ postId }) =>
  apiClient.bookmarkPost({ postId }).then(({ success, message, data }) => {
    if (!success) {
      throw new Error(message);
    }

    return data as { bookmarksCount: number };
  }),
);

export const getUserFollowersQuery = createQuery<
  { username: string },
  IUserFollowersQueryResponse
>([QUERY_KEYS.USER_FOLLOWERS], ({ username }) =>
  apiClient
    .getUserFollowers({ username })
    .then(({ success, message, data }) => {
      if (!success) {
        throw new Error(message);
      }
      return data as IUserFollowersQueryResponse;
    }),
);

export const getUserFollowingQuery = createQuery<
  { username: string },
  IUserFollowingQueryResponse
>([QUERY_KEYS.USER_FOLLOWING], ({ username }) =>
  apiClient
    .getUserFollowing({ username })
    .then(({ success, message, data }) => {
      if (!success) {
        throw new Error(message);
      }
      return data as IUserFollowingQueryResponse;
    }),
);

export const followUserMutation = createMutation<{ username: string }, void>(
  ({ username }) =>
    apiClient.followUser({ username }).then(({ success, message, data }) => {
      if (!success) {
        throw new Error(message);
      }
    }),
);

export const unfollowUserMutation = createMutation<{ username: string }, void>(
  ({ username }) =>
    apiClient.unfollowUser({ username }).then(({ success, message, data }) => {
      if (!success) {
        throw new Error(message);
      }
    }),
);

export const getUserBookmarks = createQuery<void, IPostQueryResponse>(
  [QUERY_KEYS.USER_BOOKMARKS],
  () =>
    apiClient.getUserBookmarks().then(({ success, message, data }) => {
      if (!success) {
        throw new Error(message);
      }
      return data as IPostQueryResponse;
    }),
);

export const getUserProfileSettingsQuery = createQuery<
  void,
  IUserSettingsProfileGetResponse
>([QUERY_KEYS.USER_SETTINGS_PROFILE], () =>
  apiClient.getUserProfileSettings().then(({ success, message, data }) => {
    if (!success) {
      throw new Error(message);
    }
    return data as IUserSettingsProfileGetResponse;
  }),
);

export const updateUserPictureMutation = createMutation<
  IApiClientQueryWithPayload<{}, IUserPictureUploadClientPayload>,
  void
>(({ payload }) =>
  apiClient.updateUserPicture(payload).then(({ success, message }) => {
    if (!success) {
      throw new Error(message);
    }
  }),
);

export const getUserPaymentMethods = createQuery<
  void,
  IPaymentMethodGetAllResponse
>([QUERY_KEYS.USER_PAYMENT_METHODS], () =>
  apiClient.getUserPaymentMethods().then(({ success, message, data }) => {
    if (!success) {
      throw new Error(message);
    }
    return data as IPaymentMethodGetAllResponse;
  }),
);

export const getUserNotifications = createQuery<
  void,
  IUserNotificationGetResponse
>([QUERY_KEYS.USER.NOTIFICATIONS], () =>
  apiClient.getUserNotifications().then(({ success, message, data }) => {
    if (!success) {
      throw new Error(message);
    }
    return data as IUserNotificationGetResponse;
  }),
);

export const getUserMapByUsername = createQuery<
  { username: string },
  IUserMapGetResponse
>([QUERY_KEYS.USER.MAP], ({ username }) =>
  apiClient
    .getUserMapByUsername({ username })
    .then(({ success, message, data }) => {
      if (!success) {
        throw new Error(message);
      }
      return data as IUserMapGetResponse;
    }),
);

export const membershipTierUpdateMutation = createMutation<
  IApiClientQueryWithPayload<{ id: string }, ISponsorshipTierUpdatePayload>,
  void
>((query) =>
  apiClient.updateSponsorshipTierById(query).then(({ success, message }) => {
    if (!success) {
      throw new Error(message);
    }
  }),
);
