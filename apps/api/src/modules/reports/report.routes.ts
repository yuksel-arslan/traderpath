// ===========================================
// Report Routes
// API endpoints for saving and retrieving analysis reports
// ===========================================

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../../core/database';
import { authenticate } from '../../core/auth/middleware';

interface SaveReportBody {
  symbol: string;
  analysisId?: string;
  reportData: Record<string, unknown>;
  verdict: string;
  score: number;
  direction?: string;
  interval?: string; // e.g., '4h', '1h', '1d'
}

interface AuthenticatedRequest extends FastifyRequest {
  user?: { id: string };
}

// Calculate expiration based on periods and interval
function calculateExpiresAt(periods: number, interval: string = '4h'): Date {
  const now = new Date();
  let hoursPerPeriod = 4; // default 4h

  // Parse interval to hours
  const match = interval.match(/^(\d+)([mhd])$/);
  if (match) {
    const value = parseInt(match[1]);
    const unit = match[2];
    switch (unit) {
      case 'm': hoursPerPeriod = value / 60; break;
      case 'h': hoursPerPeriod = value; break;
      case 'd': hoursPerPeriod = value * 24; break;
    }
  }

  const totalHours = periods * hoursPerPeriod;
  return new Date(now.getTime() + totalHours * 60 * 60 * 1000);
}

export async function reportRoutes(fastify: FastifyInstance) {
  // ===========================================
  // POST /api/reports - Save a new report
  // ===========================================
  fastify.post<{ Body: SaveReportBody }>(
    '/api/reports',
    { preHandler: authenticate },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      try {
        const userId = request.user?.id;
        if (!userId) {
          return reply.code(401).send({
            error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          });
        }

        const { symbol, analysisId, reportData, verdict, score, direction, interval = '4h' } = request.body;

        if (!symbol || !reportData || !verdict || score === undefined) {
          return reply.code(400).send({
            error: { code: 'INVALID_INPUT', message: 'Missing required fields' },
          });
        }

        // Get user's report validity setting
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { reportValidityPeriods: true },
        });

        const validityPeriods = user?.reportValidityPeriods ?? 50;
        const expiresAt = calculateExpiresAt(validityPeriods, interval);

        const report = await prisma.report.create({
          data: {
            userId,
            symbol: symbol.toUpperCase(),
            analysisId,
            reportData,
            verdict,
            score,
            direction,
            expiresAt,
          },
        });

        return reply.code(201).send({
          success: true,
          data: {
            id: report.id,
            symbol: report.symbol,
            verdict: report.verdict,
            score: report.score,
            generatedAt: report.generatedAt,
            expiresAt: report.expiresAt,
          },
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({
          error: { code: 'SERVER_ERROR', message: 'Failed to save report' },
        });
      }
    }
  );

  // ===========================================
  // GET /api/reports - List user's reports
  // ===========================================
  fastify.get(
    '/api/reports',
    { preHandler: authenticate },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      try {
        const userId = request.user?.id;
        if (!userId) {
          return reply.code(401).send({
            error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          });
        }

        const { limit = '20', offset = '0', includeExpired = 'false' } = request.query as Record<string, string>;

        // Delete expired reports in the background
        prisma.report.deleteMany({
          where: {
            userId,
            expiresAt: { lt: new Date() },
          },
        }).catch((err) => fastify.log.error('Failed to clean expired reports:', err));

        // Build query - filter out expired unless explicitly requested
        const whereClause: Record<string, unknown> = { userId };
        if (includeExpired !== 'true') {
          whereClause.expiresAt = { gt: new Date() };
        }

        const reports = await prisma.report.findMany({
          where: whereClause,
          select: {
            id: true,
            symbol: true,
            verdict: true,
            score: true,
            direction: true,
            generatedAt: true,
            expiresAt: true,
            downloadCount: true,
          },
          orderBy: { generatedAt: 'desc' },
          take: Math.min(parseInt(limit), 50),
          skip: parseInt(offset),
        });

        const total = await prisma.report.count({ where: whereClause });

        return reply.send({
          success: true,
          data: {
            reports,
            pagination: {
              total,
              limit: parseInt(limit),
              offset: parseInt(offset),
            },
          },
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({
          error: { code: 'SERVER_ERROR', message: 'Failed to fetch reports' },
        });
      }
    }
  );

  // ===========================================
  // GET /api/reports/:id - Get a specific report
  // ===========================================
  fastify.get<{ Params: { id: string } }>(
    '/api/reports/:id',
    { preHandler: authenticate },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      try {
        const userId = request.user?.id;
        if (!userId) {
          return reply.code(401).send({
            error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          });
        }

        const { id } = request.params;

        const report = await prisma.report.findFirst({
          where: { id, userId },
        });

        if (!report) {
          return reply.code(404).send({
            error: { code: 'NOT_FOUND', message: 'Report not found' },
          });
        }

        // Check if expired
        if (report.expiresAt < new Date()) {
          // Delete expired report
          await prisma.report.delete({ where: { id } });
          return reply.code(410).send({
            error: { code: 'EXPIRED', message: 'Report has expired and been deleted' },
          });
        }

        // Increment download count
        await prisma.report.update({
          where: { id },
          data: { downloadCount: { increment: 1 } },
        });

        return reply.send({
          success: true,
          data: report,
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({
          error: { code: 'SERVER_ERROR', message: 'Failed to fetch report' },
        });
      }
    }
  );

  // ===========================================
  // DELETE /api/reports/:id - Delete a report
  // ===========================================
  fastify.delete<{ Params: { id: string } }>(
    '/api/reports/:id',
    { preHandler: authenticate },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      try {
        const userId = request.user?.id;
        if (!userId) {
          return reply.code(401).send({
            error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          });
        }

        const { id } = request.params;

        const report = await prisma.report.findFirst({
          where: { id, userId },
        });

        if (!report) {
          return reply.code(404).send({
            error: { code: 'NOT_FOUND', message: 'Report not found' },
          });
        }

        await prisma.report.delete({ where: { id } });

        return reply.send({
          success: true,
          message: 'Report deleted successfully',
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({
          error: { code: 'SERVER_ERROR', message: 'Failed to delete report' },
        });
      }
    }
  );

  // ===========================================
  // DELETE /api/reports/cleanup - Clean expired reports
  // ===========================================
  fastify.delete(
    '/api/reports/cleanup',
    { preHandler: authenticate },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      try {
        const userId = request.user?.id;
        if (!userId) {
          return reply.code(401).send({
            error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          });
        }

        const result = await prisma.report.deleteMany({
          where: {
            userId,
            expiresAt: { lt: new Date() },
          },
        });

        return reply.send({
          success: true,
          message: `Cleaned up ${result.count} expired reports`,
          deletedCount: result.count,
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({
          error: { code: 'SERVER_ERROR', message: 'Failed to clean up reports' },
        });
      }
    }
  );
}
