import {
  ILoginQueryPayload,
  IPostCreatePayload,
  IPostCreateResponse,
  IPostQueryMapResponse,
  IPostQueryResponse,
  IPostUpdatePayload,
  ISearchQueryPayload,
  ISearchQueryResponse,
  ISignupQueryPayload,
  IUserPostsQueryResponse,
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
