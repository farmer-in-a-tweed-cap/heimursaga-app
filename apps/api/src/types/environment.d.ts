declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production' | 'staging';
      HOST: string;
      PORT: string;
      TZ: string;

      APP_DOMAIN: string;
      CORS_ORIGIN: string;
      DATABASE_URL: string;

      SESSION_SECRET: string;
      COOKIE_SECRET: string;

      STRIPE_SECRET_KEY: string;
      STRIPE_WEBHOOK_SECRET: string;

      SMTP_HOST: string;
      SMTP_PORT: string;
      SMTP_USER: string;
      SMTP_PASSWORD: string;
    }
  }
}

declare module '@fastify/secure-session' {
  interface SessionData {
    sid: string;
    user_id: number;
  }
}

export {};
