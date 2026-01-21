// ===========================================
// Scheduled Reports Routes
// API endpoints for managing scheduled analyses
// ===========================================

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticate } from '../../core/auth/middleware';
import { scheduledReportsService } from './scheduled-reports.service';
import { creditCostsService } from '../costs/credit-costs.service';

interface CreateScheduledReportBody {
  symbol: string;
  interval: string; // '15m', '1h', '4h', '1d'
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  scheduleHour: number; // 0-23 UTC
  scheduleDayOfWeek?: number; // 0-6 (Sunday-Saturday)
  deliverEmail?: boolean;
  deliverTelegram?: boolean;
  deliverDiscord?: boolean;
}

interface UpdateScheduledReportBody {
  interval?: string;
  frequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  scheduleHour?: number;
  scheduleDayOfWeek?: number | null;
  deliverEmail?: boolean;
  deliverTelegram?: boolean;
  deliverDiscord?: boolean;
  isActive?: boolean;
}

// Maximum scheduled reports per user (free tier)
const MAX_SCHEDULED_REPORTS_FREE = 3;
const MAX_SCHEDULED_REPORTS_PREMIUM = 10;

export async function scheduledReportsRoutes(fastify: FastifyInstance) {
  // ===========================================
  // GET /api/scheduled-reports - Get user's scheduled reports
  // ===========================================
  fastify.get(
    '/api/scheduled-reports',
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = request.user?.id;
        if (!userId) {
          return reply.code(401).send({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          });
        }

        const reports = await scheduledReportsService.getByUser(userId);

        return reply.send({
          success: true,
          data: reports,
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({
          success: false,
          error: { code: 'SERVER_ERROR', message: 'Failed to fetch scheduled reports' },
        });
      }
    }
  );

  // ===========================================
  // POST /api/scheduled-reports - Create a scheduled report
  // ===========================================
  fastify.post<{ Body: CreateScheduledReportBody }>(
    '/api/scheduled-reports',
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = request.user?.id;
        if (!userId) {
          return reply.code(401).send({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          });
        }

        const body = request.body as CreateScheduledReportBody;

        // Validate symbol
        if (!body.symbol || body.symbol.length < 2) {
          return reply.code(400).send({
            success: false,
            error: { code: 'INVALID_SYMBOL', message: 'Valid symbol is required' },
          });
        }

        // Validate interval
        const validIntervals = ['15m', '30m', '1h', '2h', '4h', '1d', '1W'];
        if (!body.interval || !validIntervals.includes(body.interval)) {
          return reply.code(400).send({
            success: false,
            error: { code: 'INVALID_INTERVAL', message: 'Interval must be one of: 15m, 30m, 1h, 2h, 4h, 1d, 1W' },
          });
        }

        // Validate frequency
        if (!['DAILY', 'WEEKLY', 'MONTHLY'].includes(body.frequency)) {
          return reply.code(400).send({
            success: false,
            error: { code: 'INVALID_FREQUENCY', message: 'Frequency must be DAILY, WEEKLY, or MONTHLY' },
          });
        }

        // Validate schedule hour
        if (body.scheduleHour < 0 || body.scheduleHour > 23) {
          return reply.code(400).send({
            success: false,
            error: { code: 'INVALID_HOUR', message: 'Schedule hour must be between 0 and 23 (UTC)' },
          });
        }

        // Validate day of week for weekly frequency
        if (body.frequency === 'WEEKLY' && (body.scheduleDayOfWeek === undefined || body.scheduleDayOfWeek < 0 || body.scheduleDayOfWeek > 6)) {
          return reply.code(400).send({
            success: false,
            error: { code: 'INVALID_DAY', message: 'Day of week must be between 0 (Sunday) and 6 (Saturday)' },
          });
        }

        // Check user's scheduled report limit
        const activeCount = await scheduledReportsService.getActiveCount(userId);
        const maxAllowed = MAX_SCHEDULED_REPORTS_FREE; // TODO: Check premium status

        if (activeCount >= maxAllowed) {
          return reply.code(403).send({
            success: false,
            error: {
              code: 'LIMIT_REACHED',
              message: `You can have maximum ${maxAllowed} active scheduled reports. Upgrade to premium for more.`,
            },
          });
        }

        const report = await scheduledReportsService.create(
          userId,
          body.symbol,
          body.interval,
          body.frequency,
          body.scheduleHour,
          {
            scheduleDayOfWeek: body.scheduleDayOfWeek,
            deliverEmail: body.deliverEmail,
            deliverTelegram: body.deliverTelegram,
            deliverDiscord: body.deliverDiscord,
          }
        );

        return reply.code(201).send({
          success: true,
          data: report,
        });
      } catch (error: any) {
        fastify.log.error(error);

        if (error.message?.includes('already have')) {
          return reply.code(409).send({
            success: false,
            error: { code: 'DUPLICATE', message: error.message },
          });
        }

        return reply.code(500).send({
          success: false,
          error: { code: 'SERVER_ERROR', message: 'Failed to create scheduled report' },
        });
      }
    }
  );

  // ===========================================
  // PUT /api/scheduled-reports/:id - Update a scheduled report
  // ===========================================
  fastify.put<{ Params: { id: string }; Body: UpdateScheduledReportBody }>(
    '/api/scheduled-reports/:id',
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = request.user?.id;
        if (!userId) {
          return reply.code(401).send({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          });
        }

        const { id } = request.params as { id: string };
        const body = request.body as UpdateScheduledReportBody;

        // Validate schedule hour if provided
        if (body.scheduleHour !== undefined && (body.scheduleHour < 0 || body.scheduleHour > 23)) {
          return reply.code(400).send({
            success: false,
            error: { code: 'INVALID_HOUR', message: 'Schedule hour must be between 0 and 23 (UTC)' },
          });
        }

        const report = await scheduledReportsService.update(id, userId, body);

        return reply.send({
          success: true,
          data: report,
        });
      } catch (error: any) {
        fastify.log.error(error);

        if (error.message === 'Scheduled report not found') {
          return reply.code(404).send({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Scheduled report not found' },
          });
        }

        return reply.code(500).send({
          success: false,
          error: { code: 'SERVER_ERROR', message: 'Failed to update scheduled report' },
        });
      }
    }
  );

  // ===========================================
  // DELETE /api/scheduled-reports/:id - Delete a scheduled report
  // ===========================================
  fastify.delete<{ Params: { id: string } }>(
    '/api/scheduled-reports/:id',
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = request.user?.id;
        if (!userId) {
          return reply.code(401).send({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          });
        }

        const { id } = request.params as { id: string };

        await scheduledReportsService.delete(id, userId);

        return reply.send({
          success: true,
          message: 'Scheduled report deleted successfully',
        });
      } catch (error: any) {
        fastify.log.error(error);

        if (error.message === 'Scheduled report not found') {
          return reply.code(404).send({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Scheduled report not found' },
          });
        }

        return reply.code(500).send({
          success: false,
          error: { code: 'SERVER_ERROR', message: 'Failed to delete scheduled report' },
        });
      }
    }
  );

  // ===========================================
  // POST /api/scheduled-reports/:id/toggle - Toggle active status
  // ===========================================
  fastify.post<{ Params: { id: string } }>(
    '/api/scheduled-reports/:id/toggle',
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = request.user?.id;
        if (!userId) {
          return reply.code(401).send({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          });
        }

        const { id } = request.params as { id: string };

        // Get current status
        const reports = await scheduledReportsService.getByUser(userId);
        const report = reports.find(r => r.id === id);

        if (!report) {
          return reply.code(404).send({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Scheduled report not found' },
          });
        }

        // Toggle
        const updated = await scheduledReportsService.update(id, userId, {
          isActive: !report.isActive,
        });

        return reply.send({
          success: true,
          data: updated,
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({
          success: false,
          error: { code: 'SERVER_ERROR', message: 'Failed to toggle scheduled report' },
        });
      }
    }
  );

  // ===========================================
  // GET /api/scheduled-reports/limits - Get user's limits
  // ===========================================
  fastify.get(
    '/api/scheduled-reports/limits',
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = request.user?.id;
        if (!userId) {
          return reply.code(401).send({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          });
        }

        const activeCount = await scheduledReportsService.getActiveCount(userId);
        const maxAllowed = MAX_SCHEDULED_REPORTS_FREE; // TODO: Check premium status
        const analysisCost = await creditCostsService.getCreditCost('BUNDLE_FULL_ANALYSIS');

        return reply.send({
          success: true,
          data: {
            current: activeCount,
            max: maxAllowed,
            remaining: Math.max(0, maxAllowed - activeCount),
            costPerAnalysis: analysisCost,
          },
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({
          success: false,
          error: { code: 'SERVER_ERROR', message: 'Failed to fetch limits' },
        });
      }
    }
  );
}

export default scheduledReportsRoutes;
