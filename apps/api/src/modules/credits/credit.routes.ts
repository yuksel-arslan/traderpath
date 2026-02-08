// ===========================================
// Credit Routes
// ===========================================

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { creditService } from './credit.service';
import { authenticate } from '../../core/auth/middleware';

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
      console.error('GET /api/credits/balance error:', error);
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
      console.error('GET /api/credits/packages error:', error);
      return reply.status(500).send({ success: false, error: 'Failed to fetch packages' });
    }
  });

  /**
   * POST /api/credits/purchase
   * Purchase a credit package
   */
  const purchaseSchema = z.object({
    packageId: z.string().uuid(),
    paymentMethod: z.enum(['stripe', 'crypto']),
  });

  app.post('/purchase', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = getUser(request).id;
      const body = purchaseSchema.parse(request.body);

      // TODO: Process payment with Stripe/Crypto
      // For now, simulate successful payment
      const paymentId = `pay_${Date.now()}`;

      const result = await creditService.purchasePackage(
        userId,
        body.packageId,
        paymentId
      );

      return reply.send({
        success: true,
        data: result,
      });
    } catch (error: any) {
      if (error?.name === 'ZodError') {
        return reply.status(400).send({ success: false, error: 'Invalid purchase parameters' });
      }
      console.error('POST /api/credits/purchase error:', error);
      return reply.status(500).send({ success: false, error: 'Failed to process purchase' });
    }
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
      console.error('GET /api/credits/history error:', error);
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
      console.error('GET /api/credits/costs error:', error);
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
      console.error('POST /api/credits/deduct error:', error);
      return reply.status(500).send({ success: false, error: 'Failed to deduct credits' });
    }
  });
}
