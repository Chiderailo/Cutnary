/*
|--------------------------------------------------------------------------
| Environment variables service
|--------------------------------------------------------------------------
|
| The `Env.create` method creates an instance of the Env service. The
| service validates the environment variables and also cast values
| to JavaScript data types.
|
*/

import { Env } from '@adonisjs/core/env'

export default await Env.create(new URL('../', import.meta.url), {
  // Node
  NODE_ENV: Env.schema.enum(['development', 'production', 'test'] as const),
  PORT: Env.schema.number(),
  HOST: Env.schema.string({ format: 'host' }),
  LOG_LEVEL: Env.schema.string(),

  // App
  APP_KEY: Env.schema.secret(),
  APP_URL: Env.schema.string({ format: 'url', tld: false }),
  FRONTEND_URL: Env.schema.string.optional(),

  // Session
  SESSION_DRIVER: Env.schema.enum(['cookie', 'memory', 'database'] as const),

  // Redis (for BullMQ queue - AI worker communication)
  REDIS_HOST: Env.schema.string(),
  REDIS_PORT: Env.schema.number(),

  // Cloudflare R2 (S3-compatible object storage)
  R2_ACCOUNT_ID: Env.schema.string.optional(),
  R2_ACCESS_KEY: Env.schema.string.optional(),
  R2_SECRET_KEY: Env.schema.string.optional(),
  R2_BUCKET_NAME: Env.schema.string.optional(),
  R2_PUBLIC_URL: Env.schema.string.optional(),

  // Storage – local path for clips/videos (default: ../storage)
  STORAGE_PATH: Env.schema.string.optional(),

  // Social OAuth
  YOUTUBE_CLIENT_ID: Env.schema.string.optional(),
  YOUTUBE_CLIENT_SECRET: Env.schema.string.optional(),
  TIKTOK_CLIENT_KEY: Env.schema.string.optional(),
  TIKTOK_CLIENT_SECRET: Env.schema.string.optional(),
  FACEBOOK_APP_ID: Env.schema.string.optional(),
  FACEBOOK_APP_SECRET: Env.schema.string.optional(),

  // AI (Gemini for hashtags, etc.)
  GOOGLE_API_KEY: Env.schema.string.optional(),

  // Transactional email (SMTP) — set for production email verification
  SMTP_HOST: Env.schema.string.optional(),
  SMTP_PORT: Env.schema.number.optional(),
  SMTP_SECURE: Env.schema.boolean.optional(),
  SMTP_USER: Env.schema.string.optional(),
  SMTP_PASSWORD: Env.schema.string.optional(),
  MAIL_FROM_ADDRESS: Env.schema.string.optional(),
  MAIL_FROM_NAME: Env.schema.string.optional(),
  /** When false, skip mandatory verification even if SMTP is configured (not recommended for production). */
  REQUIRE_EMAIL_VERIFICATION: Env.schema.boolean.optional(),

  // Google Sign-In (OAuth 2.0) — separate from GOOGLE_API_KEY (Gemini)
  GOOGLE_CLIENT_ID: Env.schema.string.optional(),
  GOOGLE_CLIENT_SECRET: Env.schema.string.optional(),
  /** Optional; default is ${APP_URL}/api/auth/google/callback */
  GOOGLE_REDIRECT_URI: Env.schema.string.optional(),
})
