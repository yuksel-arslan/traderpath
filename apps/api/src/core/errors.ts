// ===========================================
// TradePath - Centralized Error Handling
// Production-grade error management
// ===========================================

import { ZodError } from 'zod';

// Prisma error type for better type safety
interface PrismaKnownError extends Error {
  code: string;
  meta?: { target?: string[] };
}

/**
 * Base error class for all TradePath errors
 */
export class TradepathError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'TradepathError';
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }
}

// ===========================================
// Authentication Errors (AUTH_XXX)
// ===========================================

export class AuthenticationError extends TradepathError {
  constructor(message: string = 'Authentication required', details?: Record<string, unknown>) {
    super('AUTH_001', message, 401, details);
    this.name = 'AuthenticationError';
  }
}

export class TokenExpiredError extends TradepathError {
  constructor(message: string = 'Token has expired', details?: Record<string, unknown>) {
    super('AUTH_002', message, 401, details);
    this.name = 'TokenExpiredError';
  }
}

export class InvalidTokenError extends TradepathError {
  constructor(message: string = 'Invalid token', details?: Record<string, unknown>) {
    super('AUTH_003', message, 401, details);
    this.name = 'InvalidTokenError';
  }
}

export class UnauthorizedError extends TradepathError {
  constructor(message: string = 'Unauthorized access', details?: Record<string, unknown>) {
    super('AUTH_004', message, 403, details);
    this.name = 'UnauthorizedError';
  }
}

export class AccountNotVerifiedError extends TradepathError {
  constructor(message: string = 'Account not verified', details?: Record<string, unknown>) {
    super('AUTH_005', message, 403, details);
    this.name = 'AccountNotVerifiedError';
  }
}

// ===========================================
// Credit Errors (CREDIT_XXX)
// ===========================================

export class InsufficientCreditsError extends TradepathError {
  constructor(required: number, available: number, details?: Record<string, unknown>) {
    super('CREDIT_001', `Insufficient credits. Required: ${required}, Available: ${available}`, 402, {
      required,
      available,
      ...details,
    });
    this.name = 'InsufficientCreditsError';
  }
}

export class CreditPackageNotFoundError extends TradepathError {
  constructor(packageId: string, details?: Record<string, unknown>) {
    super('CREDIT_002', `Credit package not found: ${packageId}`, 404, { packageId, ...details });
    this.name = 'CreditPackageNotFoundError';
  }
}

export class PaymentFailedError extends TradepathError {
  constructor(message: string = 'Payment processing failed', details?: Record<string, unknown>) {
    super('CREDIT_003', message, 402, details);
    this.name = 'PaymentFailedError';
  }
}

export class CreditTransactionError extends TradepathError {
  constructor(message: string = 'Credit transaction failed', details?: Record<string, unknown>) {
    super('CREDIT_004', message, 500, details);
    this.name = 'CreditTransactionError';
  }
}

// ===========================================
// Analysis Errors (ANALYSIS_XXX)
// ===========================================

export class SymbolNotSupportedError extends TradepathError {
  constructor(symbol: string, details?: Record<string, unknown>) {
    super('ANALYSIS_001', `Symbol not supported: ${symbol}`, 400, { symbol, ...details });
    this.name = 'SymbolNotSupportedError';
  }
}

export class AnalysisExpiredError extends TradepathError {
  constructor(analysisId: string, details?: Record<string, unknown>) {
    super('ANALYSIS_002', `Analysis has expired: ${analysisId}`, 410, { analysisId, ...details });
    this.name = 'AnalysisExpiredError';
  }
}

export class StepNotUnlockedError extends TradepathError {
  constructor(step: number, requiredStep: number, details?: Record<string, unknown>) {
    super('ANALYSIS_003', `Step ${step} is locked. Complete step ${requiredStep} first.`, 403, {
      step,
      requiredStep,
      ...details,
    });
    this.name = 'StepNotUnlockedError';
  }
}

export class AnalysisInProgressError extends TradepathError {
  constructor(message: string = 'Analysis already in progress', details?: Record<string, unknown>) {
    super('ANALYSIS_004', message, 409, details);
    this.name = 'AnalysisInProgressError';
  }
}

export class MarketDataError extends TradepathError {
  constructor(message: string = 'Failed to fetch market data', details?: Record<string, unknown>) {
    super('ANALYSIS_005', message, 503, details);
    this.name = 'MarketDataError';
  }
}

export class AIServiceError extends TradepathError {
  constructor(message: string = 'AI service unavailable', details?: Record<string, unknown>) {
    super('ANALYSIS_006', message, 503, details);
    this.name = 'AIServiceError';
  }
}

// ===========================================
// Reward Errors (REWARD_XXX)
// ===========================================

export class AlreadyClaimedError extends TradepathError {
  constructor(rewardType: string, details?: Record<string, unknown>) {
    super('REWARD_001', `${rewardType} already claimed today`, 409, { rewardType, ...details });
    this.name = 'AlreadyClaimedError';
  }
}

export class QuizAlreadyAnsweredError extends TradepathError {
  constructor(details?: Record<string, unknown>) {
    super('REWARD_002', 'Quiz already answered today', 409, details);
    this.name = 'QuizAlreadyAnsweredError';
  }
}

export class SpinLimitReachedError extends TradepathError {
  constructor(details?: Record<string, unknown>) {
    super('REWARD_003', 'Daily spin limit reached', 409, details);
    this.name = 'SpinLimitReachedError';
  }
}

export class AchievementNotFoundError extends TradepathError {
  constructor(achievementId: string, details?: Record<string, unknown>) {
    super('REWARD_004', `Achievement not found: ${achievementId}`, 404, { achievementId, ...details });
    this.name = 'AchievementNotFoundError';
  }
}

// ===========================================
// Rate Limit Errors (RATE_XXX)
// ===========================================

export class RateLimitExceededError extends TradepathError {
  constructor(retryAfter: number, details?: Record<string, unknown>) {
    super('RATE_001', `Rate limit exceeded. Retry after ${retryAfter} seconds.`, 429, {
      retryAfter,
      ...details,
    });
    this.name = 'RateLimitExceededError';
  }
}

// ===========================================
// Validation Errors (VALIDATION_XXX)
// ===========================================

export class ValidationError extends TradepathError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('VALIDATION_001', message, 400, details);
    this.name = 'ValidationError';
  }
}

export class InvalidInputError extends TradepathError {
  constructor(field: string, message: string, details?: Record<string, unknown>) {
    super('VALIDATION_002', `Invalid ${field}: ${message}`, 400, { field, ...details });
    this.name = 'InvalidInputError';
  }
}

// ===========================================
// Resource Errors (RESOURCE_XXX)
// ===========================================

export class NotFoundError extends TradepathError {
  constructor(resource: string, id?: string, details?: Record<string, unknown>) {
    const message = id ? `${resource} not found: ${id}` : `${resource} not found`;
    super('RESOURCE_001', message, 404, { resource, id, ...details });
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends TradepathError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('RESOURCE_002', message, 409, details);
    this.name = 'ConflictError';
  }
}

// ===========================================
// External Service Errors (EXTERNAL_XXX)
// ===========================================

export class ExternalServiceError extends TradepathError {
  constructor(service: string, message: string = 'External service error', details?: Record<string, unknown>) {
    super('EXTERNAL_001', `${service}: ${message}`, 503, { service, ...details });
    this.name = 'ExternalServiceError';
  }
}

export class BinanceAPIError extends TradepathError {
  constructor(message: string = 'Binance API error', details?: Record<string, unknown>) {
    super('EXTERNAL_002', message, 503, { service: 'binance', ...details });
    this.name = 'BinanceAPIError';
  }
}

export class GeminiAPIError extends TradepathError {
  constructor(message: string = 'Gemini AI API error', details?: Record<string, unknown>) {
    super('EXTERNAL_003', message, 503, { service: 'gemini', ...details });
    this.name = 'GeminiAPIError';
  }
}

// ===========================================
// Internal Errors (INTERNAL_XXX)
// ===========================================

export class InternalError extends TradepathError {
  constructor(message: string = 'Internal server error', details?: Record<string, unknown>) {
    super('INTERNAL_001', message, 500, details);
    this.name = 'InternalError';
  }
}

export class DatabaseError extends TradepathError {
  constructor(message: string = 'Database error', details?: Record<string, unknown>) {
    super('INTERNAL_002', message, 500, details);
    this.name = 'DatabaseError';
  }
}

export class CacheError extends TradepathError {
  constructor(message: string = 'Cache error', details?: Record<string, unknown>) {
    super('INTERNAL_003', message, 500, details);
    this.name = 'CacheError';
  }
}

// ===========================================
// Error Handler for Fastify
// ===========================================

import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { logger } from './logger';

export function errorHandler(
  error: FastifyError | TradepathError | Error,
  request: FastifyRequest,
  reply: FastifyReply
) {
  // Log the error
  const logData = {
    error: error.message,
    code: (error as TradepathError).code || 'UNKNOWN',
    stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
    url: request.url,
    method: request.method,
    userId: (request as any).user?.id,
    ip: request.ip,
    userAgent: request.headers['user-agent'],
  };

  // Determine if this is a client error or server error
  const statusCode = (error as TradepathError).statusCode || (error as FastifyError).statusCode || 500;

  if (statusCode >= 500) {
    logger.error(logData, 'Server error');
  } else if (statusCode >= 400) {
    logger.warn(logData, 'Client error');
  }

  // Handle TradePath errors
  if (error instanceof TradepathError) {
    return reply.status(statusCode).send({
      success: false,
      error: error.toJSON(),
    });
  }

  // Handle Zod validation errors - sanitize to prevent schema exposure
  if (error instanceof ZodError) {
    // Only expose field names and messages, not internal validation details
    const sanitizedErrors = error.errors.map((e) => ({
      field: e.path[0] || 'unknown',
      message: e.message,
    }));
    return reply.status(400).send({
      success: false,
      error: {
        code: 'VALIDATION_001',
        message: 'Validation failed',
        details: sanitizedErrors,
      },
    });
  }

  // Handle Prisma errors with proper typing
  if (error.name === 'PrismaClientKnownRequestError') {
    const prismaError = error as PrismaKnownError;

    // Unique constraint violation - don't expose field names
    if (prismaError.code === 'P2002') {
      return reply.status(409).send({
        success: false,
        error: {
          code: 'RESOURCE_002',
          message: 'A resource with this value already exists',
        },
      });
    }

    // Record not found
    if (prismaError.code === 'P2025') {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'RESOURCE_001',
          message: 'Resource not found',
        },
      });
    }

    return reply.status(500).send({
      success: false,
      error: {
        code: 'INTERNAL_002',
        message: 'Database error',
      },
    });
  }

  // Handle unknown errors
  return reply.status(statusCode).send({
    success: false,
    error: {
      code: 'INTERNAL_001',
      message: process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : error.message,
    },
  });
}

// ===========================================
// Async Handler Wrapper
// ===========================================

type AsyncHandler = (request: FastifyRequest, reply: FastifyReply) => Promise<void>;

export function asyncHandler(handler: AsyncHandler): AsyncHandler {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await handler(request, reply);
    } catch (error) {
      throw error; // Let Fastify's error handler deal with it
    }
  };
}

// ===========================================
// Error Code Reference
// ===========================================

export const ERROR_CODES = {
  // Auth (401, 403)
  AUTH_001: 'Authentication required',
  AUTH_002: 'Token expired',
  AUTH_003: 'Invalid token',
  AUTH_004: 'Unauthorized access',
  AUTH_005: 'Account not verified',

  // Credits (402, 404)
  CREDIT_001: 'Insufficient credits',
  CREDIT_002: 'Package not found',
  CREDIT_003: 'Payment failed',
  CREDIT_004: 'Transaction failed',

  // Analysis (400, 403, 410, 503)
  ANALYSIS_001: 'Symbol not supported',
  ANALYSIS_002: 'Analysis expired',
  ANALYSIS_003: 'Step not unlocked',
  ANALYSIS_004: 'Analysis in progress',
  ANALYSIS_005: 'Market data unavailable',
  ANALYSIS_006: 'AI service unavailable',

  // Rewards (409)
  REWARD_001: 'Already claimed',
  REWARD_002: 'Quiz already answered',
  REWARD_003: 'Spin limit reached',
  REWARD_004: 'Achievement not found',

  // Rate Limit (429)
  RATE_001: 'Rate limit exceeded',

  // Validation (400)
  VALIDATION_001: 'Validation failed',
  VALIDATION_002: 'Invalid input',

  // Resources (404, 409)
  RESOURCE_001: 'Not found',
  RESOURCE_002: 'Conflict',

  // External (503)
  EXTERNAL_001: 'External service error',
  EXTERNAL_002: 'Binance API error',
  EXTERNAL_003: 'Gemini API error',

  // Internal (500)
  INTERNAL_001: 'Internal error',
  INTERNAL_002: 'Database error',
  INTERNAL_003: 'Cache error',
} as const;
