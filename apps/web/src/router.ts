export const ROUTER = {
  INDEX: '/',
  HOME: '/explore',
  LOGIN: '/login',
  SIGNUP: '/signup',
  RESET_PASSWORD: 'reset-password',
  EXPLORE: {
    HOME: '/explore',
    RESET: '/explore?context=global&filter=post',
    POST: (id: string) => `/explore/post/${id}`,
  },
  YOU: '/submenu',
  GUEST_MENU: '/guest-menu',
  DASHBOARD: {
    HOME: '/dashboard',
  },
  ADMIN: {
    HOME: '/admin',
  },
  JOURNAL: {
    HOME: '/journal',
  },
  BOOKMARKS: {
    HOME: '/bookmarks',
  },
  MAP: {
    TRIPS: {
      DETAIL: (id: string) => `/map/trip/${id}`,
    },
  },
  SPONSORSHIP: {
    ROOT: '/sponsorship',
    HOME: '/sponsorship/tiers',
    TIERS: '/sponsorship/tiers',
    SPONSORS: '/sponsorship/sponsors',
    PAYOUTS: '/sponsorship/payouts',
    ACCOUNT: '/sponsorship/account',
  },
  AUDIENCE: '/audience',
  UPGRADE: '/upgrade',
  UPGRADE_SUCCESS: '/upgrade/success',
  UPGRADE_CHECKOUT: '/upgrade/checkout',
  NOTIFICATIONS: '/notifications',
  USER: {
    PROFILE: '/user/profile',
    SETTINGS: {
      ROOT: '/user/settings',
      HOME: '/user/settings',
      PAGE_KEY: (key: string) => `/user/settings/${key}`,
      PROFILE: '/user/settings/profile',
      PAYMENT_METHODS: '/user/settings/payment-methods',
      BILLING: '/user/settings/billing',
    },
  },
  ENTRIES: {
    DETAIL: (id: string) => `/entries/${id}`,
    CREATE: '/entries/create',
    EDIT: (id: string) => `/entries/${id}/edit`,
  },
  POSTS: {
    DETAIL: (id: string) => `/posts/${id}`,
    CREATE: '/posts/create',
    EDIT: (id: string) => `/posts/${id}/edit`,
  },
  SPONSOR: ({ username }: { username: string }) => `/sponsor/${username}`,
  USERS: {
    DETAIL: (username: string) => `/${username}`,
  },
  JOURNEYS: {
    HOME: '/journeys',
    CREATE: `/journeys/create`,
    DETAIL: (id: string) => `/journeys/${id}`,
    EDIT: (id: string) => `/journeys/${id}/edit`,
  },
  TRIPS: {
    HOME: '/trips',
    CREATE: `/trips/create`,
    DETAIL: (id: string) => `/trips/${id}`,
    EDIT: (id: string) => `/trips/${id}/edit`,
  },
  INSIGHTS: {
    ROOT: '/insights',
    HOME: '/insights',
  },
  USER_GUIDE: '/user-guide',
  LEGAL: {
    PRIVACY: '/legal/privacy',
    TERMS: '/legal/terms',
  },
};
