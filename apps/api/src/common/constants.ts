import { CurrencyCode } from './enums';

/**
 * Usernames that are not allowed for registration.
 * Checked as exact match against the lowercased username.
 * Also used as substring checks for profanity (partial matches).
 */
export const BANNED_USERNAMES = new Set([
  // Platform & brand
  'heimursaga',
  'admin',
  'administrator',
  'moderator',
  'support',
  'helpdesk',
  'official',
  'staff',
  'team',

  // System & generic
  'user',
  'username',
  'account',
  'root',
  'system',
  'null',
  'undefined',
  'anonymous',
  'unknown',
  'deleted',
  'guest',
  'default',
  'owner',
  'manager',

  // Web & infra reserved
  'api',
  'www',
  'mail',
  'ftp',
  'ssh',
  'blog',
  'dev',
  'staging',
  'production',
  'test',
  'demo',
  'login',
  'signup',
  'register',
  'auth',
  'oauth',
  'callback',
  'webhook',
  'postmaster',
  'webmaster',
  'hostmaster',
  'abuse',
  'security',
  'info',
  'noreply',
  'no_reply',

  // App routes & features (prevent username/route collisions)
  'settings',
  'profile',
  'dashboard',
  'explore',
  'explorer',
  'explorers',
  'expedition',
  'expeditions',
  'entry',
  'entries',
  'journal',
  'sponsor',
  'sponsorship',
  'sponsorships',
  'checkout',
  'upgrade',
  'billing',
  'notifications',
  'messages',
  'search',
  'about',
  'contact',
  'legal',
  'privacy',
  'terms',
  'help',
  'faq',
  'documentation',
  'docs',
  'sitemap',
  'robots',
  'feed',
  'rss',
  'insights',
  'bookmarks',
  'payout',
  'payouts',
]);

/**
 * Words that are banned as substrings within usernames.
 * Checked against the lowercased username.
 */
export const BANNED_USERNAME_SUBSTRINGS = [
  // Profanity & slurs
  'fuck',
  'shit',
  'asshole',
  'bitch',
  'bastard',
  'damn',
  'cunt',
  'dick',
  'cock',
  'pussy',
  'penis',
  'vagina',
  'whore',
  'slut',
  'nigger',
  'nigga',
  'faggot',
  'retard',
  'nazi',
  'hitler',

  // Explicit & sexual
  'porn',
  'xxx',
  'sex',
  'hentai',
  'milf',
  'dildo',
  'orgasm',
  'cum',
  'jizz',
  'blowjob',
  'handjob',
  'masturbat',
  'erotic',
  'nude',
  'naked',

  // Violence & hate
  'kill',
  'murder',
  'rape',
  'terrorist',
  'terrorism',
  'genocide',
  'supremacist',

  // Scam & impersonation
  'scam',
  'phishing',
  'paypal',
  'stripe',
  'bitcoin',
  'crypto',
];

export const ENVIRONMENTS = {
  PRODUCTION: 'production',
  STAGING: 'staging',
  DEVELOPMENT: 'development',
};

export const SESSION_KEYS: {
  SID: 'sid';
  USER_ID: 'user_id';
  USER_ROLE: 'user_role';
} = {
  SID: 'sid',
  USER_ID: 'user_id',
  USER_ROLE: 'user_role',
};

export const COOKIE_KEYS = {
  SID: 'sid',
  LOCALE: 'locale',
  TZO: 'tzo',
};

export const CURRENCIES: {
  [key: string]: {
    code: string;
    symbol: string;
  };
} = {
  [CurrencyCode.USD]: {
    code: CurrencyCode.USD,
    symbol: '$',
  },
  [CurrencyCode.EUR]: {
    code: CurrencyCode.EUR,
    symbol: '€',
  },
  [CurrencyCode.SGD]: {
    code: CurrencyCode.USD,
    symbol: 'S$',
  },
};
