// ===========================================
// Application Configuration
// ===========================================

import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

// Production environment check
const isProduction = process.env.NODE_ENV === 'production';

const envSchema = z.object({
  // App
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  PORT: z.string().transform(Number).default('4000'),
  APP_URL: z.string().url().default('http://localhost:3000'),
  API_URL: z.string().url().default('http://localhost:4000'),

  // CORS - comma-separated list of allowed origins (optional)
  CORS_ORIGINS: z.string().optional(),

  // Database - required in production
  DATABASE_URL: isProduction
    ? z.string().min(1, 'DATABASE_URL is required in production')
    : z.string().optional(),

  // Redis - required in production
  REDIS_URL: isProduction
    ? z.string().min(1, 'REDIS_URL is required in production')
    : z.string().optional(),

  // JWT - required in production, defaults only for development
  JWT_SECRET: isProduction
    ? z.string().min(32, 'JWT_SECRET must be at least 32 characters in production')
    : z.string().min(32).default('dev-jwt-secret-key-minimum-32-characters-long'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  REFRESH_TOKEN_SECRET: isProduction
    ? z.string().min(32, 'REFRESH_TOKEN_SECRET must be at least 32 characters in production')
    : z.string().min(32).default('dev-refresh-token-secret-minimum-32-chars'),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default('30d'),

  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  // Stripe
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  // Binance
  BINANCE_API_KEY: z.string().optional(),
  BINANCE_API_SECRET: z.string().optional(),

  // AI
  OPENAI_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),

  // Note: Google Cloud keys are accessed dynamically at runtime
  // to avoid Railpack static detection (see google-tts.ts, google-translate.ts)

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('60000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default('100'),

  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:');
  console.error(parsed.error.format());
  process.exit(1);
}

const env = parsed.data;

export const config = {
  // Environment
  env: env.NODE_ENV,
  isDev: env.NODE_ENV === 'development',
  isProd: env.NODE_ENV === 'production',

  // Server
  port: env.PORT,
  appUrl: env.APP_URL,
  apiUrl: env.API_URL,

  // CORS - use CORS_ORIGINS env var or fall back to APP_URL in production
  corsOrigins: env.CORS_ORIGINS
    ? env.CORS_ORIGINS.split(',').map(origin => origin.trim())
    : env.NODE_ENV === 'production'
      ? [env.APP_URL]
      : ['http://localhost:3000', 'http://localhost:5173'],

  // Database
  databaseUrl: env.DATABASE_URL,

  // Redis
  redisUrl: env.REDIS_URL,

  // JWT
  jwtSecret: env.JWT_SECRET,
  jwtExpiresIn: env.JWT_EXPIRES_IN,
  refreshTokenSecret: env.REFRESH_TOKEN_SECRET,
  refreshTokenExpiresIn: env.REFRESH_TOKEN_EXPIRES_IN,

  // OAuth
  google: {
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
  },

  // Stripe
  stripe: {
    secretKey: env.STRIPE_SECRET_KEY,
    webhookSecret: env.STRIPE_WEBHOOK_SECRET,
  },

  // Binance
  binance: {
    apiKey: env.BINANCE_API_KEY,
    apiSecret: env.BINANCE_API_SECRET,
  },

  // AI
  openai: {
    apiKey: env.OPENAI_API_KEY,
  },
  gemini: {
    apiKey: env.GEMINI_API_KEY,
  },

  // Google Cloud keys are accessed dynamically via process.env['KEY_NAME']
  // to bypass Railpack static analysis (see google-tts.ts, google-translate.ts)

  // Rate Limiting
  rateLimitWindow: env.RATE_LIMIT_WINDOW_MS,
  rateLimitMax: env.RATE_LIMIT_MAX_REQUESTS,

  // Logging
  logLevel: env.LOG_LEVEL,
} as const;

export type Config = typeof config;
