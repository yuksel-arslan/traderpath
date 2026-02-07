// ===========================================
// Smart Alerts Routes
// API endpoints for L1-L4 hierarchy alerts
// ===========================================

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../../core/auth/middleware';
import {
  getUserPreferences,
  upsertUserPreferences,
  getUserSmartAlerts,
  getSmartAlertStatus,
  triggerManualScan,
} from './smart-alerts.service';

interface JwtUser {
  id: string;
  email: string;
  name: string;
  level: number;
  isAdmin?: boolean;
}

function getUser(request: FastifyRequest): JwtUser {
  return request.user as JwtUser;
}

export default async function smartAlertRoutes(app: FastifyInstance) {
  // All routes require authentication
  app.addHook('preHandler', authenticate);

  /**
   * GET /api/smart-alerts
   * List smart alerts for the current user
   */
  app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = getUser(request).id;

    const querySchema = z.object({
      layer: z.enum(['L1', 'L2', 'L3', 'L4']).optional(),
      severity: z.enum(['INFO', 'WARNING', 'CRITICAL']).optional(),
      market: z.string().optional(),
      page: z.string().optional().default('1'),
      limit: z.string().optional().default('20'),
    });

    try {
      const query = querySchema.parse(request.query);

      const result = await getUserSmartAlerts(userId, {
        layer: query.layer as any,
        severity: query.severity as any,
        market: query.market,
        page: Math.max(1, parseInt(query.page)),
        limit: Math.min(50, Math.max(1, parseInt(query.limit))),
      });

      return reply.send({ success: true, data: result });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.status(400).send({
          success: false,
          error: { code: 'SA_001', message: 'Invalid query parameters' },
        });
      }
      return reply.status(500).send({
        success: false,
        error: { code: 'SA_002', message: 'Failed to fetch smart alerts' },
      });
    }
  });

  /**
   * GET /api/smart-alerts/preferences
   * Get the current user's alert preferences
   */
  app.get('/preferences', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = getUser(request).id;

    try {
      const prefs = await getUserPreferences(userId);
      return reply.send({ success: true, data: prefs });
    } catch {
      return reply.status(500).send({
        success: false,
        error: { code: 'SA_003', message: 'Failed to fetch preferences' },
      });
    }
  });

  /**
   * PATCH /api/smart-alerts/preferences
   * Update the current user's alert preferences
   */
  app.patch('/preferences', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = getUser(request).id;

    const bodySchema = z.object({
      enabled: z.boolean().optional(),
      markets: z.array(z.enum(['crypto', 'stocks', 'bonds', 'metals', 'bist'])).optional(),
      minSeverity: z.enum(['INFO', 'WARNING', 'CRITICAL']).optional(),
      emailEnabled: z.boolean().optional(),
      pushEnabled: z.boolean().optional(),
    });

    try {
      const body = bodySchema.parse(request.body);

      // Get current prefs, then merge
      const current = await getUserPreferences(userId);
      const updated = {
        ...current,
        ...body,
        userId,
      };

      await upsertUserPreferences(updated);
      return reply.send({ success: true, data: updated });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.status(400).send({
          success: false,
          error: { code: 'SA_004', message: 'Invalid request body' },
        });
      }
      return reply.status(500).send({
        success: false,
        error: { code: 'SA_005', message: 'Failed to update preferences' },
      });
    }
  });

  /**
   * GET /api/smart-alerts/status
   * Get the smart alert engine status (admin only for full info, basic for all)
   */
  app.get('/status', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const status = await getSmartAlertStatus();
      return reply.send({ success: true, data: status });
    } catch {
      return reply.status(500).send({
        success: false,
        error: { code: 'SA_006', message: 'Failed to fetch status' },
      });
    }
  });

  /**
   * POST /api/smart-alerts/scan
   * Trigger a manual scan (admin only)
   */
  app.post('/scan', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = getUser(request);
    if (!user.isAdmin) {
      return reply.status(403).send({
        success: false,
        error: { code: 'SA_007', message: 'Admin access required' },
      });
    }

    try {
      const result = await triggerManualScan();
      return reply.send({
        success: true,
        data: {
          alertsGenerated: result.alerts.length,
          notificationsDelivered: result.notified,
          alerts: result.alerts,
        },
      });
    } catch {
      return reply.status(500).send({
        success: false,
        error: { code: 'SA_008', message: 'Failed to run scan' },
      });
    }
  });
}
