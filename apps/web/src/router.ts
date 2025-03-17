export const ROUTER = {
  HOME: '/',
  LOGIN: '/login',
  SIGNUP: '/signup',
  RESET_PASSWORD: 'reset-password',
  EXPLORE: {
    HOME: '/explore',
    POST: (id: string) => `/explore/post/${id}`,
  },
  DASHBOARD: {
    HOME: '/dashboard',
  },
  USER: {
    PROFILE: '/user/profile',
    SETTINGS: '/user/settings',
  },
  POSTS: {
    DETAIL: (id: string) => `/posts/${id}`,
    CREATE: '/posts/create',
    EDIT: (id: string) => `/posts/${id}/edit`,
  },
  MEMBERS: {
    HOME: '/members',
    MEMBER: (id: string) => `/members/${id}`,
  },
};
