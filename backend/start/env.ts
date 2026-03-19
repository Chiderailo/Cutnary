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
})
