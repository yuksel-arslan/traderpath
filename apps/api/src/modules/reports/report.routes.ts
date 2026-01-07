// ===========================================
// Report Routes
// API endpoints for saving and retrieving analysis reports
// ===========================================

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../../core/database';
import { authenticate } from '../../core/auth/middleware';
import { calculateExpiredOutcomes, getRealAccuracy, calculateReportOutcome } from './outcome.service';
import { notificationService } from '../notifications/notification.service';

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

// Extract entry price from report data - comprehensive search
function extractEntryPrice(reportData: Record<string, unknown>): number | null {
  // Try tradePlan first (most accurate)
  const tradePlan = reportData?.tradePlan as Record<string, unknown> | undefined;
  if (tradePlan?.averageEntry) return Number(tradePlan.averageEntry);
  if (tradePlan?.entryPrice) return Number(tradePlan.entryPrice);

  // Try assetScan (current price at analysis time)
  const assetScan = reportData?.assetScan as Record<string, unknown> | undefined;
  if (assetScan?.currentPrice) return Number(assetScan.currentPrice);
  if (assetScan?.price) return Number(assetScan.price);

  // Try timing
  const timing = reportData?.timing as Record<string, unknown> | undefined;
  if (timing?.currentPrice) return Number(timing.currentPrice);
  if (timing?.entryPrice) return Number(timing.entryPrice);

  // Try verdict
  const verdict = reportData?.verdict as Record<string, unknown> | undefined;
  if (verdict?.currentPrice) return Number(verdict.currentPrice);

  // Try marketPulse
  const marketPulse = reportData?.marketPulse as Record<string, unknown> | undefined;
  if (marketPulse?.btcPrice) return null; // This is BTC price, not the coin price

  return null;
}

interface AuthenticatedRequest extends FastifyRequest {
  user?: { id: string };
}

// Reports stay active until TP/SL hit - no time-based expiration
// Set far future date (30 days) as technical field only
// Actual closure is determined by TP/SL hit detection
function calculateExpiresAt(): Date {
  const now = new Date();
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
  return new Date(now.getTime() + THIRTY_DAYS_MS);
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

        // Fixed 48 hours validity for all reports
        const expiresAt = calculateExpiresAt();

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

        // Auto-create price alerts for trade plan (if GO or CONDITIONAL_GO verdict)
        const tradePlan = reportData?.tradePlan as Record<string, unknown> | undefined;
        const verdictLower = verdict.toLowerCase();
        const shouldCreateAlerts = verdictLower === 'go' || verdictLower === 'go!' || verdictLower === 'conditional_go' || verdictLower === 'conditional go';

        let alertsCreated = 0;
        if (shouldCreateAlerts && tradePlan) {
          try {
            const planDirection = (tradePlan.direction as string || direction || 'long').toLowerCase() as 'long' | 'short';
            const entryPriceValue = Number(tradePlan.averageEntry || tradePlan.entryPrice || finalEntryPrice);
            const stopLossObj = tradePlan.stopLoss as { price: number } | undefined;
            const stopLossValue = stopLossObj?.price || 0;
            const takeProfitsArray = tradePlan.takeProfits as Array<{ price: number }> | undefined;
            const takeProfitValues = takeProfitsArray?.map(tp => tp.price).filter(p => p > 0) || [];

            if (entryPriceValue > 0 && stopLossValue > 0 && takeProfitValues.length > 0) {
              // Get user's notification settings to determine channels
              const userSettings = await prisma.user.findUnique({
                where: { id: userId },
                select: { notificationSettings: true },
              });
              const settings = (userSettings?.notificationSettings as Record<string, { enabled?: boolean }>) || {};

              // Determine active channels
              const channels: string[] = ['browser']; // Browser is always enabled
              if (settings.telegram?.enabled) channels.push('telegram');
              if (settings.discord?.enabled) channels.push('discord');
              if (settings.tradingView?.enabled) channels.push('tradingview');

              const result = await notificationService.createTradePlanAlerts(
                userId,
                symbol.toUpperCase(),
                {
                  direction: planDirection,
                  entryPrice: entryPriceValue,
                  stopLoss: stopLossValue,
                  takeProfits: takeProfitValues,
                },
                channels,
                report.id
              );
              alertsCreated = result.alerts.length;
              fastify.log.info({ symbol, alertsCreated }, 'Auto-created price alerts for trade plan');
            }
          } catch (alertError) {
            fastify.log.error(alertError, 'Failed to auto-create price alerts');
            // Don't fail the report creation if alerts fail
          }
        }

        return reply.code(201).send({
          success: true,
          data: {
            id: report.id,
            symbol: report.symbol,
            verdict: report.verdict,
            score: report.score,
            generatedAt: report.generatedAt,
            expiresAt: report.expiresAt,
            alertsCreated, // Number of auto-created alerts
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
  // GET /api/reports - List user's reports with live tracking data
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
            outcome: true,
            entryPrice: true,
            reportData: true,
            analysisId: true,
            aiExpertComment: true,
          },
          orderBy: { generatedAt: 'desc' },
          take: Math.min(parseInt(limit), 50),
          skip: parseInt(offset),
        });

        // Fetch current prices for all symbols
        const symbols = [...new Set(reports.map(r => r.symbol))];
        const prices: Record<string, number> = {};

        if (symbols.length > 0) {
          try {
            const pairs = symbols.map(s => `"${s.toUpperCase()}USDT"`).join(',');
            const priceResponse = await fetch(
              `https://api.binance.com/api/v3/ticker/price?symbols=[${pairs}]`
            );
            if (priceResponse.ok) {
              const priceData = await priceResponse.json();
              for (const item of priceData) {
                const symbol = item.symbol.replace('USDT', '');
                prices[symbol] = parseFloat(item.price);
              }
            }
          } catch (err) {
            fastify.log.error('Failed to fetch prices:', err);
          }
        }

        // Enrich reports with live tracking data
        const enrichedReports = await Promise.all(reports.map(async (report) => {
          const reportData = report.reportData as Record<string, unknown> | null;
          const tradePlan = reportData?.tradePlan as Record<string, unknown> | undefined;

          // Try multiple sources for entry price
          let entryPrice = report.entryPrice
            ? Number(report.entryPrice)
            : Number(tradePlan?.averageEntry) || undefined;

          // If still no entry price, try to extract from reportData
          if (!entryPrice && reportData) {
            const extractedPrice = extractEntryPrice(reportData);
            if (extractedPrice) {
              entryPrice = extractedPrice;
              // Update the report in database for future queries
              prisma.report.update({
                where: { id: report.id },
                data: { entryPrice: extractedPrice },
              }).catch(() => {}); // Fire and forget
            }
          }

          const currentPrice = prices[report.symbol] || undefined;
          const stopLoss = (tradePlan?.stopLoss as { price: number } | undefined)?.price;
          const takeProfits = tradePlan?.takeProfits as Array<{ price: number }> | undefined;

          // Calculate unrealized P/L
          let unrealizedPnL: number | undefined;
          if (entryPrice && currentPrice) {
            const pnlPercent = ((currentPrice - entryPrice) / entryPrice) * 100;
            const direction = (tradePlan?.direction as string || report.direction || 'long').toLowerCase();
            unrealizedPnL = direction === 'short' ? -pnlPercent : pnlPercent;
          }

          return {
            id: report.id,
            symbol: report.symbol,
            verdict: report.verdict,
            score: report.score,
            direction: report.direction,
            generatedAt: report.generatedAt,
            expiresAt: report.expiresAt,
            downloadCount: report.downloadCount,
            outcome: report.outcome,
            entryPrice,
            currentPrice,
            unrealizedPnL,
            stopLoss,
            takeProfit1: takeProfits?.[0]?.price,
            takeProfit2: takeProfits?.[1]?.price,
            takeProfit3: takeProfits?.[2]?.price,
            // AI Expert fields
            analysisId: report.analysisId,
            aiExpertComment: report.aiExpertComment,
          };
        }));

        // Get total count and statistics
        const [total, activeCount, correctCount, incorrectCount] = await Promise.all([
          prisma.report.count({ where: whereClause }),
          prisma.report.count({ where: { ...whereClause, OR: [{ outcome: null }, { outcome: 'pending' }] } }),
          prisma.report.count({ where: { ...whereClause, outcome: 'correct' } }),
          prisma.report.count({ where: { ...whereClause, outcome: 'incorrect' } }),
        ]);

        return reply.send({
          success: true,
          data: {
            reports: enrichedReports,
            pagination: {
              total,
              limit: parseInt(limit),
              offset: parseInt(offset),
            },
            stats: {
              total,
              active: activeCount,
              closed: correctCount + incorrectCount,
              tpHits: correctCount,
              slHits: incorrectCount,
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
  // GET /api/reports/by-analysis/:analysisId - Get report by analysis ID
  // ===========================================
  fastify.get<{ Params: { analysisId: string } }>(
    '/api/reports/by-analysis/:analysisId',
    { preHandler: authenticate },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      try {
        const userId = request.user?.id;
        if (!userId) {
          return reply.code(401).send({
            error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          });
        }

        const { analysisId } = request.params;

        const report = await prisma.report.findFirst({
          where: { analysisId, userId },
          select: {
            id: true,
            aiExpertComment: true,
            reportData: true,
          },
        });

        if (!report) {
          return reply.code(404).send({
            error: { code: 'NOT_FOUND', message: 'Report not found' },
          });
        }

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
  // PATCH /api/reports/by-analysis/:analysisId/ai-expert-comment - Save AI Expert comment by analysisId
  // ===========================================
  fastify.patch<{ Params: { analysisId: string }; Body: { comment: string } }>(
    '/api/reports/by-analysis/:analysisId/ai-expert-comment',
    { preHandler: authenticate },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      try {
        const userId = request.user?.id;
        if (!userId) {
          return reply.code(401).send({
            error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          });
        }

        const { analysisId } = request.params;
        const { comment } = request.body;

        if (!comment || typeof comment !== 'string') {
          return reply.code(400).send({
            error: { code: 'INVALID_INPUT', message: 'Comment is required' },
          });
        }

        // Find report by analysisId
        const report = await prisma.report.findFirst({
          where: { analysisId, userId },
          select: { id: true },
        });

        if (!report) {
          return reply.code(404).send({
            error: { code: 'NOT_FOUND', message: 'Report not found for this analysis' },
          });
        }

        // Update the AI Expert comment
        await prisma.report.update({
          where: { id: report.id },
          data: { aiExpertComment: comment },
        });

        return reply.send({
          success: true,
          message: 'AI Expert comment saved successfully',
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({
          error: { code: 'SERVER_ERROR', message: 'Failed to save AI Expert comment' },
        });
      }
    }
  );

  // ===========================================
  // PATCH /api/reports/:id/ai-expert-comment - Save AI Expert comment
  // ===========================================
  fastify.patch<{ Params: { id: string }; Body: { comment: string } }>(
    '/api/reports/:id/ai-expert-comment',
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
        const { comment } = request.body;

        if (!comment || typeof comment !== 'string') {
          return reply.code(400).send({
            error: { code: 'INVALID_INPUT', message: 'Comment is required' },
          });
        }

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

        // Update the AI Expert comment
        await prisma.report.update({
          where: { id },
          data: { aiExpertComment: comment },
        });

        return reply.send({
          success: true,
          message: 'AI Expert comment saved successfully',
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({
          error: { code: 'SERVER_ERROR', message: 'Failed to save AI Expert comment' },
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
