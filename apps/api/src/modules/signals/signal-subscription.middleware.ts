/**
 * Signal Subscription Middleware
 * Access control for signal-related endpoints
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { signalSubscriptionService } from './signal-subscription.service';

/**
 * Require active signal subscription
 * Use this middleware to protect signal endpoints that require a paid subscription
 */
export async function requireSignalSubscription(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const userId = request.user?.id;

  if (!userId) {
    return reply.code(401).send({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
    });
  }

  try {
    const hasAccess = await signalSubscriptionService.hasActiveSignalSubscription(userId);

    if (!hasAccess) {
      return reply.code(403).send({
        success: false,
        error: {
          code: 'SIGNAL_SUBSCRIPTION_REQUIRED',
          message: 'Active signal subscription required to access this feature',
          upgradeUrl: '/pricing?mode=signals',
        },
      });
    }

    // User has access, continue to route handler
  } catch (error) {
    request.log.error({ error, userId }, 'Error checking signal subscription');
    return reply.code(500).send({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to verify subscription status',
      },
    });
  }
}

/**
 * Check if user can receive signals for a specific market
 * Use this for market-specific signal endpoints
 */
export async function requireMarketAccess(market: string) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const userId = request.user?.id;

    if (!userId) {
      return reply.code(401).send({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
    }

    try {
      const hasAccess = await signalSubscriptionService.canReceiveSignals(userId, market);

      if (!hasAccess) {
        return reply.code(403).send({
          success: false,
          error: {
            code: 'MARKET_ACCESS_REQUIRED',
            message: `Your subscription plan does not include ${market} market signals. Upgrade to access.`,
            market,
            upgradeUrl: '/pricing?mode=signals',
          },
        });
      }

      // User has market access, continue to route handler
    } catch (error) {
      request.log.error({ error, userId, market }, 'Error checking market access');
      return reply.code(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to verify market access',
        },
      });
    }
  };
}

/**
 * Attach subscription info to request
 * Use this to provide subscription context without blocking access
 */
export async function attachSignalSubscription(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const userId = request.user?.id;

  if (!userId) {
    return; // Skip if not authenticated
  }

  try {
    const subscription = await signalSubscriptionService.getUserSignalSubscription(userId);
    // Attach to request context
    (request as any).signalSubscription = subscription;
  } catch (error) {
    request.log.error({ error, userId }, 'Error attaching signal subscription');
    // Don't block request, just log error
  }
}
