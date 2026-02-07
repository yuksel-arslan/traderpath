// ===========================================
// Notification Center Routes
// API endpoints for centralized notifications
// ===========================================

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../../core/auth/middleware';
import { notificationCenterService } from './notification-center.service';

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

export default async function notificationCenterRoutes(app: FastifyInstance) {
  // All routes require authentication
  app.addHook('preHandler', authenticate);

  /**
   * GET /api/notifications
   * List notifications with filtering and pagination
   */
  app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = getUser(request).id;

    const querySchema = z.object({
      type: z.enum(['BRIEFING', 'ALERT', 'SIGNAL', 'REWARD', 'SYSTEM']).optional(),
      read: z.enum(['true', 'false']).optional(),
      page: z.string().optional().default('1'),
      limit: z.string().optional().default('20'),
    });

    try {
      const query = querySchema.parse(request.query);

      const result = await notificationCenterService.list({
        userId,
        type: query.type,
        read: query.read !== undefined ? query.read === 'true' : undefined,
        page: Math.max(1, parseInt(query.page)),
        limit: Math.min(50, Math.max(1, parseInt(query.limit))),
      });

      return reply.send({
        success: true,
        data: result,
      });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.status(400).send({
          success: false,
          error: { code: 'NOTIF_001', message: 'Invalid query parameters' },
        });
      }
      return reply.status(500).send({
        success: false,
        error: { code: 'NOTIF_002', message: 'Failed to fetch notifications' },
      });
    }
  });

  /**
   * GET /api/notifications/unread-count
   * Get unread counts grouped by type
   */
  app.get('/unread-count', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = getUser(request).id;

    try {
      const counts = await notificationCenterService.getUnreadCounts(userId);
      return reply.send({ success: true, data: counts });
    } catch {
      return reply.status(500).send({
        success: false,
        error: { code: 'NOTIF_003', message: 'Failed to fetch unread counts' },
      });
    }
  });

  /**
   * PATCH /api/notifications/:id/read
   * Mark a single notification as read
   */
  app.patch('/:id/read', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = getUser(request).id;
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);

    try {
      const updated = await notificationCenterService.markAsRead(id, userId);
      if (!updated) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOTIF_004', message: 'Notification not found' },
        });
      }
      return reply.send({ success: true });
    } catch {
      return reply.status(500).send({
        success: false,
        error: { code: 'NOTIF_005', message: 'Failed to mark notification as read' },
      });
    }
  });

  /**
   * POST /api/notifications/mark-all-read
   * Mark all notifications as read (optionally filtered by type)
   */
  app.post('/mark-all-read', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = getUser(request).id;

    const bodySchema = z.object({
      type: z.enum(['BRIEFING', 'ALERT', 'SIGNAL', 'REWARD', 'SYSTEM']).optional(),
    });

    try {
      const body = bodySchema.parse(request.body);
      const count = await notificationCenterService.markAllAsRead(userId, body.type);
      return reply.send({ success: true, data: { marked: count } });
    } catch {
      return reply.status(500).send({
        success: false,
        error: { code: 'NOTIF_006', message: 'Failed to mark all as read' },
      });
    }
  });

  /**
   * DELETE /api/notifications/clear-read
   * Delete all read notifications
   */
  app.delete('/clear-read', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = getUser(request).id;

    try {
      const count = await notificationCenterService.clearRead(userId);
      return reply.send({ success: true, data: { deleted: count } });
    } catch {
      return reply.status(500).send({
        success: false,
        error: { code: 'NOTIF_007', message: 'Failed to clear read notifications' },
      });
    }
  });

  /**
   * DELETE /api/notifications/:id
   * Delete a single notification
   */
  app.delete('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = getUser(request).id;
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);

    try {
      const deleted = await notificationCenterService.delete(id, userId);
      if (!deleted) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOTIF_008', message: 'Notification not found' },
        });
      }
      return reply.send({ success: true });
    } catch {
      return reply.status(500).send({
        success: false,
        error: { code: 'NOTIF_009', message: 'Failed to delete notification' },
      });
    }
  });
}
