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
  JOURNAL: '/journal',
  BOOKMARKS: {
    HOME: '/bookmarks',
  },
  MEMBERSHIP: '/membership',
  PREMIUM: '/premium',
  PREMIUM_CHECKOUT: '/premium/checkout',
  NOTIFICATIONS: '/notifications',
  USER: {
    PROFILE: '/user/profile',
    SETTINGS: {
      HOME: '/user/settings',
      PAGE_KEY: (key: string) => `/user/settings/${key}`,
      PROFILE: '/user/settings/profile',
      BILLING: '/user/settings/billing',
    },
  },
  POSTS: {
    DETAIL: (id: string) => `/posts/${id}`,
    CREATE: '/posts/create',
    EDIT: (id: string) => `/posts/${id}/edit`,
  },
  MEMBERS: {
    MEMBER: (username: string) => `/${username}`,
  },
};
