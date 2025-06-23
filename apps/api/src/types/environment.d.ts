declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production' | 'staging';
      HOST: string;
      PORT: string;
      TZ: string;

      APP_BASE_URL: string;
      CORS_ORIGIN: string;
      DATABASE_URL: string;

      SESSION_SECRET: string;
      SESSION_MAX_AGE: number;
      COOKIE_SECRET: string;

      STRIPE_SECRET_KEY: string;
      STRIPE_WEBHOOK_SECRET: string;

      SMTP_HOST: string;
      SMTP_PORT: string;
      SMTP_USER: string;
      SMTP_PASSWORD: string;
      SMTP_EMAIL_FROM: string;

      S3_ENDPOINT: string;
      S3_REGION: string;
      S3_ACCESS_KEY: string;
      S3_SECRET_KEY: string;
      S3_BUCKET: string;

      APPLICATION_FEE: string;
    }
  }
}

declare module '@fastify/secure-session' {
  interface SessionData {
    sid: string;
    user_id: number;
    user_role: string;
  }
}

export {};
