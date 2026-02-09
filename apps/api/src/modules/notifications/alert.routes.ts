// ===========================================
// Alert Routes
// ===========================================

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../core/database';
import { authenticate } from '../../core/auth/middleware';
import { creditService } from '../credits/credit.service';
import { creditCostsService } from '../costs/credit-costs.service';
import { notificationService } from './notification.service';

export default async function alertRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  /**
   * GET /api/alerts/vapid-public-key
   * Get VAPID public key for push subscription
   */
  app.get('/vapid-public-key', async (_request: FastifyRequest, reply: FastifyReply) => {
    const publicKey = process.env.VAPID_PUBLIC_KEY;

    if (!publicKey) {
      return reply.status(503).send({
        success: false,
        error: {
          code: 'PUSH_NOT_CONFIGURED',
          message: 'Push notifications are not configured on this server',
        },
      });
    }

    return reply.send({
      success: true,
      data: { publicKey },
    });
  });

  /**
   * GET /api/alerts
   * Get user's price alerts
   */
  app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = request.user!.id;

      const alerts = await prisma.priceAlert.findMany({
        where: { userId, isActive: true },
        orderBy: { createdAt: 'desc' },
      });

      return reply.send({
        success: true,
        data: { alerts },
      });
    } catch (error) {
      console.error('GET /api/alerts error:', error);
      return reply.status(500).send({ success: false, error: 'Failed to fetch alerts' });
    }
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
    try {
      const userId = request.user!.id;
      const body = createSchema.parse(request.body);

      // Charge credits
      const cost = await creditCostsService.getCreditCost('PRICE_ALERT');
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
    } catch (error: any) {
      if (error?.name === 'ZodError') {
        return reply.status(400).send({ success: false, error: 'Invalid input parameters' });
      }
      console.error('POST /api/alerts error:', error);
      return reply.status(500).send({ success: false, error: 'Failed to create alert' });
    }
  });

  /**
   * DELETE /api/alerts/:id
   * Delete a price alert
   */
  app.delete('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
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
    } catch (error) {
      console.error('DELETE /api/alerts/:id error:', error);
      return reply.status(500).send({ success: false, error: 'Failed to delete alert' });
    }
  });

  /**
   * GET /api/alerts/history
   * Get triggered alerts history
   */
  app.get('/history', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
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
    } catch (error) {
      console.error('GET /api/alerts/history error:', error);
      return reply.status(500).send({ success: false, error: 'Failed to fetch alert history' });
    }
  });

  /**
   * POST /api/alerts/trade-plan
   * Create alerts for a complete trade plan (entry, TPs, SL)
   */
  const tradePlanAlertSchema = z.object({
    symbol: z.string().toUpperCase(),
    direction: z.enum(['long', 'short']),
    entryPrice: z.number().positive(),
    stopLoss: z.number().positive(),
    takeProfits: z.array(z.number().positive()).min(1).max(3),
    channels: z.array(z.enum(['browser', 'telegram', 'discord', 'tradingview'])).default(['browser']),
    reportId: z.string().uuid().optional(),
  });

  app.post('/trade-plan', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = request.user!.id;
      const body = tradePlanAlertSchema.parse(request.body);

      // Calculate total cost (1 credit per alert: entry + SL + TPs)
      const alertCount = 2 + body.takeProfits.length; // entry + SL + TPs
      const cost = alertCount;

      // Charge credits
      const chargeResult = await creditService.charge(userId, cost, 'trade_plan_alerts', {
        symbol: body.symbol,
        alertCount,
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

      // Create all alerts
      const result = await notificationService.createTradePlanAlerts(
        userId,
        body.symbol,
        {
          direction: body.direction,
          entryPrice: body.entryPrice,
          stopLoss: body.stopLoss,
          takeProfits: body.takeProfits,
        },
        body.channels,
        body.reportId
      );

      return reply.status(201).send({
        success: true,
        data: {
          alertsCreated: result.alerts.length,
          alerts: result.alerts.map(a => ({
            symbol: a.symbol,
            alertType: a.alertType,
            targetPrice: a.targetPrice,
            direction: a.direction,
          })),
        },
        creditsSpent: cost,
        remainingCredits: chargeResult.newBalance,
      });
    } catch (error: any) {
      if (error?.name === 'ZodError') {
        return reply.status(400).send({ success: false, error: 'Invalid trade plan parameters' });
      }
      console.error('POST /api/alerts/trade-plan error:', error);
      return reply.status(500).send({ success: false, error: 'Failed to create trade plan alerts' });
    }
  });

  /**
   * GET /api/alerts/settings
   * Get user's notification settings
   */
  app.get('/settings', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = request.user!.id;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { notificationSettings: true },
      });

      return reply.send({
        success: true,
        data: { settings: user?.notificationSettings || {} },
      });
    } catch (error) {
      console.error('GET /api/alerts/settings error:', error);
      return reply.status(500).send({ success: false, error: 'Failed to fetch settings' });
    }
  });

  /**
   * PATCH /api/alerts/settings
   * Update user's notification settings
   */
  const settingsSchema = z.object({
    browserPush: z.object({
      enabled: z.boolean(),
      subscription: z.any().optional(),
    }).optional(),
    telegram: z.object({
      enabled: z.boolean(),
      chatId: z.string().optional(),
      botToken: z.string().optional(),
    }).optional(),
    discord: z.object({
      enabled: z.boolean(),
      webhookUrl: z.string().url().optional(),
    }).optional(),
    tradingView: z.object({
      enabled: z.boolean(),
      webhookUrl: z.string().url().optional(),
    }).optional(),
  });

  app.patch('/settings', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = request.user!.id;
      const body = settingsSchema.parse(request.body);

      // Get current settings and merge
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { notificationSettings: true },
      });

      const currentSettings = (user?.notificationSettings as Record<string, unknown>) || {};
      const newSettings = { ...currentSettings, ...body };

      await prisma.user.update({
        where: { id: userId },
        data: { notificationSettings: newSettings },
      });

      return reply.send({
        success: true,
        data: { settings: newSettings },
        message: 'Notification settings updated',
      });
    } catch (error: any) {
      if (error?.name === 'ZodError') {
        return reply.status(400).send({ success: false, error: 'Invalid settings parameters' });
      }
      console.error('PATCH /api/alerts/settings error:', error);
      return reply.status(500).send({ success: false, error: 'Failed to update settings' });
    }
  });

  /**
   * POST /api/alerts/test
   * Send a test notification to verify settings
   */
  const testSchema = z.object({
    channel: z.enum(['browser', 'telegram', 'discord', 'tradingview']),
  });

  app.post('/test', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user!.id;
    const body = testSchema.parse(request.body);

    try {
      await notificationService.sendAlert({
        userId,
        symbol: 'BTC',
        alertType: 'CUSTOM',
        targetPrice: 100000,
        currentPrice: 100000,
        direction: 'ABOVE',
        note: 'This is a test notification from TradePath',
      }, [body.channel]);

      return reply.send({
        success: true,
        message: `Test notification sent to ${body.channel}`,
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: {
          code: 'NOTIFICATION_ERROR',
          message: 'Failed to send test notification',
        },
      });
    }
  });
}
