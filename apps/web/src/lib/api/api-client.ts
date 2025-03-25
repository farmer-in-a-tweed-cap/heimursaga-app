import {
  ILoginQueryPayload,
  IPasswordChangePayload,
  IPasswordResetPayload,
  IPostCreatePayload,
  IPostCreateResponse,
  IPostDetail,
  IPostFindByIdPayload,
  IPostQueryMapResponse,
  IPostQueryResponse,
  IPostUpdatePayload,
  ISearchQueryPayload,
  ISearchQueryResponse,
  ISessionUserQueryResponse,
  ISignupQueryPayload,
  IUserFollowersQueryResponse,
  IUserFollowingQueryResponse,
  IUserPostsQueryResponse,
  IUserProfileDetail,
  IUserSettingsProfileResponse,
  IUserSettingsProfileUpdateQuery,
  IUserUpdatePictureQuery,
} from '@/types/api-types';

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
};

export const apiClient = {
  test: async () =>
    api.request<{ data: any[]; results: number }>(API_ROUTER.TEST),
  login: async (body: ILoginQueryPayload) =>
    api.request<void>(API_ROUTER.LOGIN, {
      method: API_METHODS.POST,
      body: JSON.stringify(body),
    }),
  signup: async (body: ISignupQueryPayload) =>
    api.request<void>(API_ROUTER.SIGNUP, {
      method: API_METHODS.POST,
      body: JSON.stringify(body),
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
  changePassword: async (body: IPasswordChangePayload) =>
    api.request<void>(API_ROUTER.CHANGE_PASSWORD, {
      method: API_METHODS.POST,
      body: JSON.stringify(body),
    }),
  getSession: async ({ cookie }: RequestConfig) =>
    api.request<ISessionUserQueryResponse>(API_ROUTER.GET_SESSION_USER, {
      cookie,
    }),
  validateToken: async (token: string, config?: RequestConfig) =>
    api.request<void>(API_ROUTER.VALIDATE_TOKEN(token), {
      cookie: config ? config.cookie : undefined,
    }),
  getPosts: async (query: any, config?: RequestConfig) =>
    api.request<IPostQueryResponse>(API_ROUTER.POSTS.QUERY, config),
  getPostById: async (
    { postId }: IPostFindByIdPayload,
    { cookie }: RequestConfig,
  ) => api.request<IPostDetail>(API_ROUTER.POSTS.GET_BY_ID(postId), { cookie }),
  createPost: async (body: IPostCreatePayload) =>
    api.request<IPostCreateResponse>(API_ROUTER.POSTS.CREATE, {
      method: API_METHODS.POST,
      body: JSON.stringify(body),
    }),
  updatePost: async (
    { postId, data }: IPostUpdatePayload,
    config?: RequestConfig,
  ) =>
    api.request<IPostUpdatePayload>(API_ROUTER.POSTS.UPDATE(postId), {
      method: API_METHODS.PUT,
      body: JSON.stringify(data),
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
  getUserPosts: async (
    { username }: { username: string },
    config?: RequestConfig,
  ) =>
    api.request<IUserPostsQueryResponse>(
      API_ROUTER.USERS.GET_POSTS(username),
      config,
    ),
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
    payload: IUserUpdatePictureQuery,
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
};
