/**
 * BILGE Guardian System - Error Collector Middleware
 *
 * Express middleware for automatic error collection
 */

import { collectError } from './bilge.service';
import { nanoid } from 'nanoid';

// Express-compatible types for middleware that bridges Express/Fastify patterns
interface Request {
  headers: Record<string, string | string[] | undefined>;
  originalUrl?: string;
  url: string;
  method: string;
  user?: { id?: string };
  requestId?: string;
}

interface Response {
  headersSent: boolean;
  setHeader(name: string, value: string): void;
  status(code: number): Response;
  json(body: unknown): void;
  statusCode: number;
  on(event: string, callback: () => void): void;
}

type NextFunction = (err?: Error) => void;

type ErrorRequestHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) => void | Promise<void>;

/**
 * Request ID middleware
 * Adds unique ID to each request for tracking
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestId = (req.headers['x-request-id'] as string) || nanoid();
  req.requestId = requestId;
  res.setHeader('x-request-id', requestId);
  next();
}

/**
 * Error collector middleware
 * Captures unhandled errors and sends to BILGE
 */
export const errorCollectorMiddleware: ErrorRequestHandler = async (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Skip if response already sent
  if (res.headersSent) {
    return next(error);
  }

  try {
    // Collect error with BILGE
    await collectError({
      message: error.message,
      stack: error.stack,
      code: (error as unknown as { code?: string }).code,
      endpoint: req.originalUrl || req.url,
      method: req.method,
      userId: req.user?.id,
      requestId: req.requestId,
      project: 'traderpath',
    });
  } catch (collectErr) {
    // Don't let collection errors break the response
    console.error('[BILGE] Error collection failed:', collectErr);
  }

  // Determine status code
  const statusCode = (error as unknown as { statusCode?: number; status?: number }).statusCode
    || (error as unknown as { statusCode?: number; status?: number }).status
    || 500;

  // Send error response
  res.status(statusCode).json({
    success: false,
    error: error.message || 'Internal server error',
    requestId: req.requestId,
  });
};

/**
 * Async handler wrapper
 * Catches errors in async route handlers
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Manual error reporting utility
 * Use this to report errors from try-catch blocks
 */
export async function reportError(
  error: Error,
  context?: {
    endpoint?: string;
    method?: string;
    userId?: string;
    requestId?: string;
    project?: string;
  }
): Promise<void> {
  try {
    await collectError({
      message: error.message,
      stack: error.stack,
      code: (error as unknown as { code?: string }).code,
      endpoint: context?.endpoint,
      method: context?.method,
      userId: context?.userId,
      requestId: context?.requestId,
      project: context?.project || 'traderpath',
    });
  } catch (collectError) {
    console.error('[BILGE] Error reporting failed:', collectError);
  }
}

/**
 * Process-level error handlers
 * Install these in your main app file
 */
export function installGlobalErrorHandlers(): void {
  // Unhandled Promise Rejections
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  process.on('unhandledRejection', async (reason: unknown, _promise: Promise<unknown>) => {
    console.error('[BILGE] Unhandled Promise Rejection:', reason);

    await reportError(
      reason instanceof Error ? reason : new Error(String(reason)),
      {
        endpoint: 'UNHANDLED_REJECTION',
        method: 'SYSTEM',
        project: 'traderpath',
      }
    );
  });

  // Uncaught Exceptions
  process.on('uncaughtException', async (error: Error) => {
    console.error('[BILGE] Uncaught Exception:', error);

    await reportError(error, {
      endpoint: 'UNCAUGHT_EXCEPTION',
      method: 'SYSTEM',
      project: 'traderpath',
    });

    // Give time for error to be reported before exit
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  });

  console.log('[BILGE] Global error handlers installed');
}

/**
 * Request logging middleware (optional)
 * Logs all requests for debugging
 */
export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  // Log on response finish
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLine = `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`;

    // Log slow requests (>3s) as warnings
    if (duration > 3000) {
      console.warn(`[BILGE] Slow request: ${logLine}`);
    }
  });

  next();
}
