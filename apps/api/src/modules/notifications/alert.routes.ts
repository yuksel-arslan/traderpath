// ===========================================
// Alert Routes
// ===========================================

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../core/database';
import { authenticate } from '../../core/auth/middleware';
import { creditService } from '../credits/credit.service';
import { CREDIT_COSTS } from '@tradepath/types';

export default async function alertRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  /**
   * GET /api/alerts
   * Get user's price alerts
   */
  app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user!.id;

    const alerts = await prisma.priceAlert.findMany({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    return reply.send({
      success: true,
      data: { alerts },
    });
  });

  /**
   * POST /api/alerts
   * Create a new price alert
   */
  const createSchema = z.object({
    symbol: z.string().toUpperCase(),
    targetPrice: z.number().positive(),
    direction: z.enum(['ABOVE', 'BELOW']),
  });

  app.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user!.id;
    const body = createSchema.parse(request.body);

    // Charge credits
    const cost = CREDIT_COSTS.PRICE_ALERT;
    const chargeResult = await creditService.charge(userId, cost, 'price_alert', {
      symbol: body.symbol,
      targetPrice: body.targetPrice,
    });

    if (!chargeResult.success) {
      return reply.status(402).send({
        success: false,
        error: {
          code: 'CREDIT_001',
          message: 'Insufficient credits',
          required: cost,
        },
      });
    }

    const alert = await prisma.priceAlert.create({
      data: {
        userId,
        symbol: body.symbol,
        targetPrice: body.targetPrice,
        direction: body.direction,
        creditsSpent: cost,
      },
    });

    return reply.status(201).send({
      success: true,
      data: { alert },
      creditsSpent: cost,
      remainingCredits: chargeResult.newBalance,
    });
  });

  /**
   * DELETE /api/alerts/:id
   * Delete a price alert
   */
  app.delete('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const userId = request.user!.id;
    const { id } = request.params;

    const alert = await prisma.priceAlert.findFirst({
      where: { id, userId },
    });

    if (!alert) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'ALERT_NOT_FOUND',
          message: 'Alert not found',
        },
      });
    }

    await prisma.priceAlert.update({
      where: { id },
      data: { isActive: false },
    });

    return reply.send({
      success: true,
      message: 'Alert deleted',
    });
  });

  /**
   * GET /api/alerts/history
   * Get triggered alerts history
   */
  app.get('/history', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user!.id;

    const alerts = await prisma.priceAlert.findMany({
      where: { userId, isTriggered: true },
      orderBy: { triggeredAt: 'desc' },
      take: 50,
    });

    return reply.send({
      success: true,
      data: { alerts },
    });
  });
}
