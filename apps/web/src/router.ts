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
  PAYOUTS: {
    HOME: '/payouts',
    WITHDRAW: '/payouts/withdraw',
    BILLING: '/payouts/billing',
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
