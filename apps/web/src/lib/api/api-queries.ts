import {
  ILoginQueryPayload,
  IPasswordChangePayload,
  IPasswordResetPayload,
  IPostCreatePayload,
  IPostCreateResponse,
  IPostQueryMapResponse,
  IPostQueryResponse,
  IPostUpdatePayload,
  ISearchQueryPayload,
  ISearchQueryResponse,
  ISignupQueryPayload,
  IUserFollowersQueryResponse,
  IUserFollowingQueryResponse,
  IUserPostsQueryResponse,
  IUserSettingsProfileResponse,
  IUserSettingsProfileUpdateQuery,
} from '@/types/api-types';

import { apiClient } from './api-client';

export const QUERY_KEYS = {
  LOGIN: 'login',
  SIGNUP: 'signup',
  POSTS: 'posts',
  GET_POSTS: 'get_posts',
  GET_USER_POSTS: 'get_user_posts',
  QUERY_POST_MAP: 'query_post_map',
  GET_SESSION_USER: 'get_session_user',
  GET_SESSION: 'get_session',
  SEARCH: 'search',
  USER_FOLLOWERS: 'user_followers',
  USER_FOLLOWING: 'user_following',
  USER_FEED: 'user_feed',
  USER_BOOKMARKS: 'user_bookmarks',
  USER_DRAFTS: 'user_drafts',
  USER_SETTINGS_PROFILE: 'user_settings_profile',
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

export const loginMutation = createMutation<ILoginQueryPayload, void>(
  (payload) =>
    apiClient.login(payload).then(({ success, message, data }) => {
      if (!success) {
        throw new Error(message);
      }
      return data;
    }),
);

export const signupMutation = createMutation<ISignupQueryPayload, void>(
  (payload) =>
    apiClient.signup(payload).then(({ success, message, data }) => {
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

export const changePasswordMutation = createMutation<
  IPasswordChangePayload,
  void
>((payload) =>
  apiClient.changePassword(payload).then(({ success, message, data }) => {
    if (!success) {
      throw new Error(message);
    }
    return data;
  }),
);

export const getPostsQuery = createQuery<any, IPostQueryResponse>(
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
  (query) =>
    apiClient.getPosts(query).then(({ success, message, data }) => {
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

export const postUpdateMutation = createMutation<IPostUpdatePayload, void>(
  (payload) =>
    apiClient.updatePost(payload).then(({ success, message }) => {
      if (!success) {
        throw new Error(message);
      }
    }),
);

export const getUserPostsQuery = createQuery<
  { username: string },
  IUserPostsQueryResponse
>([QUERY_KEYS.GET_POSTS], ({ username }) =>
  apiClient.getUserPosts({ username }).then(({ success, message, data }) => {
    if (!success) {
      throw new Error(message);
    }
    return data as IUserPostsQueryResponse;
  }),
);

export const searchQuery = createQuery<
  ISearchQueryPayload,
  ISearchQueryResponse
>([QUERY_KEYS.SEARCH], (query) =>
  apiClient.search(query).then(({ success, message, data }) => {
    if (!success) {
      throw new Error(message);
    }
    return data as ISearchQueryResponse;
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

export const getUserFeed = createQuery<void, IPostQueryResponse>(
  [QUERY_KEYS.USER_FEED],
  () =>
    apiClient.getUserFeed().then(({ success, message, data }) => {
      if (!success) {
        throw new Error(message);
      }
      return data as IPostQueryResponse;
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

export const getUserDrafts = createQuery<void, IPostQueryResponse>(
  [QUERY_KEYS.USER_DRAFTS],
  () =>
    apiClient.getUserDrafts().then(({ success, message, data }) => {
      if (!success) {
        throw new Error(message);
      }
      return data as IPostQueryResponse;
    }),
);

export const getUserProfileSettingsQuery = createQuery<
  void,
  IUserSettingsProfileResponse
>([QUERY_KEYS.USER_SETTINGS_PROFILE], () =>
  apiClient.getUserProfileSettings().then(({ success, message, data }) => {
    if (!success) {
      throw new Error(message);
    }
    return data as IUserSettingsProfileResponse;
  }),
);

export const updateUserProfileSettingsMutation = createMutation<
  IUserSettingsProfileUpdateQuery,
  void
>((payload) =>
  apiClient
    .updateUserProfileSettings(payload)
    .then(({ success, message, data }) => {
      if (!success) {
        throw new Error(message);
      }
    }),
);
