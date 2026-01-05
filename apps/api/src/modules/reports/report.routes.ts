// ===========================================
// Report Routes
// API endpoints for saving and retrieving analysis reports
// ===========================================

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../../core/database';
import { authenticate } from '../../core/auth/middleware';
import { calculateExpiredOutcomes, getRealAccuracy, calculateReportOutcome } from './outcome.service';

interface SaveReportBody {
  symbol: string;
  analysisId?: string;
  reportData: Record<string, unknown>;
  verdict: string;
  score: number;
  direction?: string;
  interval?: string; // e.g., '4h', '1h', '1d'
  entryPrice?: number; // Price at time of analysis
}

// Extract entry price from report data
function extractEntryPrice(reportData: Record<string, unknown>): number | null {
  const assetScan = reportData.assetScan as Record<string, unknown> | undefined;
  const timing = reportData.timing as Record<string, unknown> | undefined;
  const tradePlan = reportData.tradePlan as Record<string, unknown> | undefined;

  if (assetScan?.currentPrice) return Number(assetScan.currentPrice);
  if (timing?.currentPrice) return Number(timing.currentPrice);
  if (tradePlan?.averageEntry) return Number(tradePlan.averageEntry);

  return null;
}

interface AuthenticatedRequest extends FastifyRequest {
  user?: { id: string };
}

// Calculate expiration based on periods and interval
function calculateExpiresAt(periods: number, interval: string = '1h'): Date {
  const now = new Date();
  let hoursPerPeriod = 1; // default 1h

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

        const { symbol, analysisId, reportData, verdict, score, direction, interval = '4h', entryPrice } = request.body;

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

        // Extract entry price from reportData if not provided
        const finalEntryPrice = entryPrice || extractEntryPrice(reportData);

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
            entryPrice: finalEntryPrice,
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

        // Calculate outcomes for expired reports in the background (instead of deleting)
        calculateExpiredOutcomes().catch((err) =>
          fastify.log.error('Failed to calculate expired report outcomes:', err)
        );

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

        // First calculate outcomes, then delete very old reports (30+ days)
        await calculateExpiredOutcomes();

        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const result = await prisma.report.deleteMany({
          where: {
            userId,
            expiresAt: { lt: thirtyDaysAgo },
            outcome: { not: null } // Only delete if outcome was calculated
          },
        });

        return reply.send({
          success: true,
          message: `Cleaned up ${result.count} old reports (outcomes preserved)`,
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

  // ===========================================
  // POST /api/reports/calculate-outcomes - Calculate outcomes for expired reports
  // ===========================================
  fastify.post(
    '/api/reports/calculate-outcomes',
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        const result = await calculateExpiredOutcomes();

        return reply.send({
          success: true,
          data: result,
          message: `Processed ${result.processed} expired reports`,
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({
          error: { code: 'SERVER_ERROR', message: 'Failed to calculate outcomes' },
        });
      }
    }
  );

  // ===========================================
  // GET /api/reports/accuracy - Get platform accuracy from real outcomes
  // ===========================================
  fastify.get(
    '/api/reports/accuracy',
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        const accuracy = await getRealAccuracy();

        return reply.send({
          success: true,
          data: accuracy,
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({
          error: { code: 'SERVER_ERROR', message: 'Failed to get accuracy data' },
        });
      }
    }
  );

  // ===========================================
  // GET /api/reports/:id/outcome - Get outcome for a specific report
  // ===========================================
  fastify.get<{ Params: { id: string } }>(
    '/api/reports/:id/outcome',
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
          select: {
            id: true,
            symbol: true,
            verdict: true,
            score: true,
            direction: true,
            entryPrice: true,
            outcome: true,
            outcomePrice: true,
            outcomePriceChange: true,
            outcomeCalculatedAt: true,
            stepOutcomes: true,
            generatedAt: true,
            expiresAt: true,
          },
        });

        if (!report) {
          return reply.code(404).send({
            error: { code: 'NOT_FOUND', message: 'Report not found' },
          });
        }

        // If report is expired but no outcome yet, calculate it now
        if (report.expiresAt < new Date() && !report.outcome) {
          const result = await calculateReportOutcome(id);
          if (result) {
            return reply.send({
              success: true,
              data: {
                ...report,
                outcome: result.outcome,
                outcomePrice: result.outcomePrice,
                outcomePriceChange: result.priceChange,
                stepOutcomes: result.stepOutcomes,
                outcomeCalculatedAt: new Date(),
              },
            });
          }
        }

        return reply.send({
          success: true,
          data: report,
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({
          error: { code: 'SERVER_ERROR', message: 'Failed to get report outcome' },
        });
      }
    }
  );

  // ===========================================
  // GET /api/reports/:id/accuracy-report - Get detailed accuracy report
  // ===========================================
  fastify.get<{ Params: { id: string } }>(
    '/api/reports/:id/accuracy-report',
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
          select: {
            id: true,
            symbol: true,
            verdict: true,
            score: true,
            direction: true,
            entryPrice: true,
            outcome: true,
            outcomePrice: true,
            outcomePriceChange: true,
            outcomeCalculatedAt: true,
            stepOutcomes: true,
            generatedAt: true,
            expiresAt: true,
            reportData: true,
          },
        });

        if (!report) {
          return reply.code(404).send({
            error: { code: 'NOT_FOUND', message: 'Report not found' },
          });
        }

        const now = new Date();
        const isExpired = report.expiresAt < now;
        const timeRemaining = isExpired ? 0 : report.expiresAt.getTime() - now.getTime();
        const hoursRemaining = Math.max(0, Math.floor(timeRemaining / (1000 * 60 * 60)));
        const minutesRemaining = Math.max(0, Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60)));

        // Calculate outcome if expired and not yet calculated
        let outcome = report.outcome;
        let outcomePrice = report.outcomePrice;
        let outcomePriceChange = report.outcomePriceChange;
        let stepOutcomes = report.stepOutcomes;

        if (isExpired && !outcome) {
          const result = await calculateReportOutcome(id);
          if (result) {
            outcome = result.outcome;
            outcomePrice = result.outcomePrice;
            outcomePriceChange = result.priceChange;
            stepOutcomes = result.stepOutcomes;
          }
        }

        // Build accuracy report
        const accuracyReport = {
          reportId: report.id,
          symbol: report.symbol,
          analysisDate: report.generatedAt,
          expirationDate: report.expiresAt,

          // Validity status
          validity: {
            isExpired,
            hoursRemaining,
            minutesRemaining,
            validUntil: report.expiresAt.toISOString(),
          },

          // Original analysis
          analysis: {
            verdict: report.verdict,
            score: report.score,
            direction: report.direction,
            entryPrice: report.entryPrice,
          },

          // Outcome (if calculated)
          outcome: outcome ? {
            result: outcome,
            outcomePrice,
            priceChange: outcomePriceChange,
            calculatedAt: report.outcomeCalculatedAt,
            stepResults: stepOutcomes,
          } : null,

          // Overall accuracy assessment
          accuracy: outcome ? {
            overallCorrect: outcome === 'correct',
            directionCorrect: report.direction
              ? (report.direction === 'long' && Number(outcomePriceChange) > 0) ||
                (report.direction === 'short' && Number(outcomePriceChange) < 0)
              : null,
            priceMovement: Number(outcomePriceChange) > 0 ? 'up' : Number(outcomePriceChange) < 0 ? 'down' : 'flat',
          } : null,
        };

        return reply.send({
          success: true,
          data: accuracyReport,
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({
          error: { code: 'SERVER_ERROR', message: 'Failed to generate accuracy report' },
        });
      }
    }
  );

  // ===========================================
  // GET /api/reports/live-tracking - Get live tracking for all active trades
  // Real-time TP/SL monitoring without AI costs
  // ===========================================
  fastify.get(
    '/api/reports/live-tracking',
    { preHandler: authenticate },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      try {
        const userId = request.user?.id;
        if (!userId) {
          return reply.code(401).send({
            error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          });
        }

        const { getUserActiveTrades } = await import('./live-tracking.service');
        const trades = await getUserActiveTrades(userId);

        return reply.send({
          success: true,
          data: {
            trades,
            count: trades.length,
            lastUpdated: new Date().toISOString(),
          },
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({
          error: { code: 'SERVER_ERROR', message: 'Failed to get live tracking data' },
        });
      }
    }
  );

  // ===========================================
  // GET /api/reports/:id/live-status - Get live status for a single report
  // ===========================================
  fastify.get<{ Params: { id: string } }>(
    '/api/reports/:id/live-status',
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

        // Verify ownership
        const report = await prisma.report.findFirst({
          where: { id, userId },
          select: { id: true },
        });

        if (!report) {
          return reply.code(404).send({
            error: { code: 'NOT_FOUND', message: 'Report not found' },
          });
        }

        const { getReportLiveStatus } = await import('./live-tracking.service');
        const status = await getReportLiveStatus(id);

        if (!status) {
          return reply.code(404).send({
            error: { code: 'NO_TRADE_PLAN', message: 'No trade plan found for this report' },
          });
        }

        return reply.send({
          success: true,
          data: status,
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({
          error: { code: 'SERVER_ERROR', message: 'Failed to get live status' },
        });
      }
    }
  );

  // ===========================================
  // POST /api/reports/check-outcomes - Background job to check TP/SL hits
  // Called periodically to update outcomes without AI
  // ===========================================
  fastify.post(
    '/api/reports/check-outcomes',
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { checkAndUpdateOutcomes } = await import('./live-tracking.service');
        const result = await checkAndUpdateOutcomes();

        return reply.send({
          success: true,
          data: result,
          message: `Checked ${result.checked} reports: ${result.tpHits} TP hits, ${result.slHits} SL hits`,
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({
          error: { code: 'SERVER_ERROR', message: 'Failed to check outcomes' },
        });
      }
    }
  );
}
