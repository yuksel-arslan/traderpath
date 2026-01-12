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
    const userId = getUser(request).id;
    const balance = await creditService.getBalance(userId);

    return reply.send({
      success: true,
      data: balance,
    });
  });

  /**
   * GET /api/credits/packages
   * Get available credit packages
   */
  app.get('/packages', async (_request: FastifyRequest, reply: FastifyReply) => {
    const packages = await creditService.getPackages();

    return reply.send({
      success: true,
      data: { packages },
    });
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
  });

  /**
   * GET /api/credits/costs
   * Get credit costs for all services
   */
  app.get('/costs', async (_request: FastifyRequest, reply: FastifyReply) => {
    const { CREDIT_COSTS } = await import('@tradepath/types');

    return reply.send({
      success: true,
      data: { costs: CREDIT_COSTS },
    });
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
  });
}
