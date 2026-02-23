// ===========================================
// Credit Routes
// ===========================================

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { creditService } from './credit.service';
import { authenticate } from '../../core/auth/middleware';
import { logger } from '../../core/logger';

// User type from JWT
interface JwtUser {
  id: string;
  email: string;
  name: string;
  level: number;
  isAdmin?: boolean;
}

// Helper to get typed user from request
function getUser(request: FastifyRequest): JwtUser {
  return request.user as JwtUser;
}

export default async function creditRoutes(app: FastifyInstance) {
  // All routes require authentication
  app.addHook('preHandler', authenticate);

  /**
   * GET /api/credits/balance
   * Get current credit balance
   */
  app.get('/balance', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = getUser(request).id;
      const balance = await creditService.getBalance(userId);

      return reply.send({
        success: true,
        data: balance,
      });
    } catch (error) {
      logger.error('GET /api/credits/balance error:', error);
      return reply.status(500).send({ success: false, error: 'Failed to fetch balance' });
    }
  });

  /**
   * GET /api/credits/packages
   * Get available credit packages
   */
  app.get('/packages', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const packages = await creditService.getPackages();

      return reply.send({
        success: true,
        data: { packages },
      });
    } catch (error) {
      logger.error('GET /api/credits/packages error:', error);
      return reply.status(500).send({ success: false, error: 'Failed to fetch packages' });
    }
  });

  /**
   * POST /api/credits/purchase
   * Deprecated: credit purchases are processed via Lemon Squeezy webhooks.
   * Clients should use the /api/payments/checkout endpoint to initiate payment.
   */
  app.post('/purchase', async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.status(410).send({
      success: false,
      error: {
        code: 'DEPRECATED_ENDPOINT',
        message:
          'Direct credit purchases are not supported. Use POST /api/payments/checkout to start a Lemon Squeezy checkout session.',
      },
    });
  });

  /**
   * GET /api/credits/history
   * Get credit transaction history
   */
  const historyQuerySchema = z.object({
    page: z.string().optional().transform((v) => (v ? parseInt(v) : 1)),
    limit: z.string().optional().transform((v) => (v ? parseInt(v) : 20)),
    type: z.string().optional(),
  });

  app.get('/history', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = getUser(request).id;
      const query = historyQuerySchema.parse(request.query);

      const history = await creditService.getHistory(
        userId,
        query.page,
        query.limit,
        query.type
      );

      return reply.send({
        success: true,
        data: history,
      });
    } catch (error) {
      logger.error('GET /api/credits/history error:', error);
      return reply.status(500).send({ success: false, error: 'Failed to fetch credit history' });
    }
  });

  /**
   * GET /api/credits/costs
   * Get credit costs for all services
   */
  app.get('/costs', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { CREDIT_COSTS } = await import('@traderpath/types');

      return reply.send({
        success: true,
        data: { costs: CREDIT_COSTS },
      });
    } catch (error) {
      logger.error('GET /api/credits/costs error:', error);
      return reply.status(500).send({ success: false, error: 'Failed to fetch credit costs' });
    }
  });

  /**
   * POST /api/credits/deduct
   * Deduct credits for a service (e.g., full report download)
   */
  const deductSchema = z.object({
    amount: z.number().min(1).max(1000),
    reason: z.string().min(1).max(200),
    analysisId: z.string().optional(),
  });

  app.post('/deduct', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = getUser(request).id;
      const body = deductSchema.parse(request.body);

      const result = await creditService.charge(
        userId,
        body.amount,
        body.reason,
        body.analysisId ? { analysisId: body.analysisId } : undefined
      );

      if (!result.success) {
        return reply.status(402).send({
          success: false,
          error: {
            code: 'INSUFFICIENT_CREDITS',
            message: `You need ${body.amount} credits. Current balance: ${result.newBalance}`,
          },
        });
      }

      return reply.send({
        success: true,
        data: {
          creditsDeducted: body.amount,
          newBalance: result.newBalance,
        },
      });
    } catch (error: any) {
      if (error?.name === 'ZodError') {
        return reply.status(400).send({ success: false, error: 'Invalid deduction parameters' });
      }
      logger.error('POST /api/credits/deduct error:', error);
      return reply.status(500).send({ success: false, error: 'Failed to deduct credits' });
    }
  });
}
