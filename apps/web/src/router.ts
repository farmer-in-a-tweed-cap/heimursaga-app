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
  JOURNAL: {
    HOME: '/journal',
  },
  BOOKMARKS: {
    HOME: '/bookmarks',
  },
  SPONSORSHIP: {
    ROOT: '/sponsorship',
    HOME: '/sponsorship/tiers',
    TIERS: '/sponsorship/tiers',
    SPONSORS: '/sponsorship/sponsors',
  },
  AUDIENCE: '/audience',
  PREMIUM: '/premium',
  PREMIUM_CHECKOUT: '/premium/checkout',
  NOTIFICATIONS: '/notifications',
  USER: {
    PROFILE: '/user/profile',
    SETTINGS: {
      ROOT: '/user/settings',
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
  SPONSOR: ({ username }: { username: string }) => `/sponsor/${username}`,
  MEMBERS: {
    MEMBER: (username: string) => `/${username}`,
  },
  TRIPS: {
    HOME: '/trips',
    CREATE: `/trips/create`,
    DETAIL: (id: string) => `/trips/${id}`,
    EDIT: (id: string) => `/trips/${id}/edit`,
  },
  PAYOUTS: {
    HOME: '/payouts',
  },
  INSIGHTS: {
    ROOT: '/insights',
    HOME: '/insights',
  },
  HELP: '/help',
  LEGAL: {
    PRIVACY: '/legal/privacy',
    TERMS: '/legal/terms',
  },
};
