// ===========================================
// Report Routes
// API endpoints for saving and retrieving analysis reports
// ===========================================

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../../core/database';
import { authenticate } from '../../core/auth/middleware';
import { calculateExpiredOutcomes, getRealAccuracy, calculateReportOutcome } from './outcome.service';
import { notificationService } from '../notifications/notification.service';
import { emailService } from '../email/email.service';
import { creditService } from '../credits/credit.service';

// Constants for free usage limits per analysis
const FREE_PDF_DOWNLOADS_PER_ANALYSIS = 2;
const FREE_EMAILS_PER_ANALYSIS = 2;
const PDF_DOWNLOAD_CREDIT_COST = 5;
const EMAIL_SEND_CREDIT_COST = 5;
const HTML_EMAIL_CREDIT_COST = 5;

// Admin emails - their reports are public and visible to all users
const ADMIN_EMAILS = ['contact@yukselarslan.com'];

interface SaveReportBody {
  symbol: string;
  analysisId?: string;
  reportData: Record<string, unknown>;
  verdict: string;
  score: number;
  direction?: string;
  interval?: string; // e.g., '4h', '1h', '1d'
  entryPrice?: number; // Price at time of analysis
  tradeType?: string; // 'scalping', 'dayTrade', 'swing'
  aiExpertComment?: string; // AI-generated analysis comment
}

interface SendEmailBody {
  symbol: string;
  verdict: string;
  score: number;
  direction: string;
  generatedAt: string;
  pdfBase64: string;
  fileName: string;
  analysisId?: string; // For tracking free email usage
}

interface SendHtmlEmailBody {
  reportId: string;
  chartImage?: string; // Base64 encoded chart image
  reportData: {
    symbol: string;
    generatedAt: string;
    analysisId?: string;
    marketPulse?: Record<string, unknown>;
    assetScan?: Record<string, unknown>;
    safetyCheck?: Record<string, unknown>;
    timing?: Record<string, unknown>;
    tradePlan?: Record<string, unknown>;
    trapCheck?: Record<string, unknown>;
    verdict?: Record<string, unknown>;
    aiExpertComment?: string;
  };
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

// User payload type for JWT
interface JwtUser {
  id: string;
  email: string;
  name: string;
  level: number;
  isAdmin?: boolean;
}

// Helper to get user from request
function getUser(request: FastifyRequest): JwtUser | null {
  return request.user as JwtUser | null;
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
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = getUser(request)?.id;
        if (!userId) {
          return reply.code(401).send({
            error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          });
        }

        const { symbol, analysisId, reportData, verdict, score, direction, interval = '4h', entryPrice, tradeType, aiExpertComment } = request.body as SaveReportBody;

        if (!symbol || !reportData || !verdict || score === undefined) {
          return reply.code(400).send({
            error: { code: 'INVALID_INPUT', message: 'Missing required fields' },
          });
        }

        // Get user info to check if admin
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { email: true, reportValidityPeriods: true },
        });

        // Check if user is admin - their reports are public
        const isAdmin = user ? ADMIN_EMAILS.includes(user.email) : false;

        // Fixed 48 hours validity for all reports
        const expiresAt = calculateExpiresAt();

        // Extract entry price from reportData if not provided
        const finalEntryPrice = entryPrice || extractEntryPrice(reportData);

        // Extract tradeType from reportData if not provided
        const finalTradeType = tradeType || (reportData?.tradeType as string) || null;

        const report = await prisma.report.create({
          data: {
            userId,
            symbol: symbol.toUpperCase(),
            analysisId,
            reportData: reportData as any, // Cast to bypass strict Json type
            verdict,
            score,
            direction,
            expiresAt,
            entryPrice: finalEntryPrice,
            tradeType: finalTradeType, // 'scalping', 'dayTrade', 'swing'
            isPublic: isAdmin, // Admin reports are visible to all users
            aiExpertComment, // AI-generated analysis comment
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
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = getUser(request)?.id;
        if (!userId) {
          return reply.code(401).send({
            error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          });
        }

        const { limit = '20', offset = '0', includeExpired = 'false' } = request.query as Record<string, string>;

        // Calculate outcomes for expired reports in the background (instead of deleting)
        calculateExpiredOutcomes().catch((err) =>
          fastify.log.error({ error: err }, 'Failed to calculate expired report outcomes')
        );

        // Base expiry filter
        const expiryFilter = includeExpired !== 'true' ? { expiresAt: { gt: new Date() } } : {};

        // Fetch user's own reports
        const userReports = await prisma.report.findMany({
          where: {
            userId,
            ...expiryFilter,
          },
          select: {
            id: true,
            userId: true,
            symbol: true,
            verdict: true,
            score: true,
            direction: true,
            tradeType: true,
            generatedAt: true,
            expiresAt: true,
            downloadCount: true,
            outcome: true,
            entryPrice: true,
            reportData: true,
            analysisId: true,
            aiExpertComment: true,
            isPublic: true,
          },
          orderBy: { generatedAt: 'desc' },
          take: Math.min(parseInt(limit), 50),
          skip: parseInt(offset),
        });

        // Fetch public (admin) reports that user doesn't own
        const publicReports = await prisma.report.findMany({
          where: {
            isPublic: true,
            userId: { not: userId }, // Don't duplicate if admin views their own
            ...expiryFilter,
          },
          select: {
            id: true,
            userId: true,
            symbol: true,
            verdict: true,
            score: true,
            direction: true,
            tradeType: true,
            generatedAt: true,
            expiresAt: true,
            downloadCount: true,
            outcome: true,
            entryPrice: true,
            reportData: true,
            analysisId: true,
            aiExpertComment: true,
            isPublic: true,
          },
          orderBy: { generatedAt: 'desc' },
          take: 10, // Limit sample reports
        });

        // Merge and sort: user's reports first, then public samples
        const allReports = [...userReports, ...publicReports];
        const reports = allReports.sort((a, b) => {
          // User's own reports come first
          if (a.userId === userId && b.userId !== userId) return -1;
          if (a.userId !== userId && b.userId === userId) return 1;
          // Then sort by date
          return new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime();
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
            fastify.log.error({ error: err }, 'Failed to fetch prices');
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

          // Extract tradeType from report or reportData
          const tradeType = report.tradeType || (reportData?.tradeType as string) || null;

          return {
            id: report.id,
            symbol: report.symbol,
            verdict: report.verdict,
            score: report.score,
            direction: report.direction,
            tradeType,
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
            // Sample report flag - public reports from admin that user doesn't own
            isSample: report.isPublic && report.userId !== userId,
          };
        }));

        // Build where clause for user's own reports (for stats)
        const userWhereClause = { userId, ...expiryFilter };

        // Get total count and statistics (only for user's own reports)
        const [total, activeCount, correctCount, incorrectCount] = await Promise.all([
          prisma.report.count({ where: userWhereClause }),
          prisma.report.count({ where: { ...userWhereClause, OR: [{ outcome: null }, { outcome: 'pending' }] } }),
          prisma.report.count({ where: { ...userWhereClause, outcome: 'correct' } }),
          prisma.report.count({ where: { ...userWhereClause, outcome: 'incorrect' } }),
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
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = getUser(request)?.id;
        if (!userId) {
          return reply.code(401).send({
            error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          });
        }

        const { analysisId } = request.params as { analysisId: string };

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
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = getUser(request)?.id;
        if (!userId) {
          return reply.code(401).send({
            error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          });
        }

        const { id } = request.params as { id: string };

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
  // POST /api/reports/:id/track-download - Track PDF download with free usage limits
  // ===========================================
  fastify.post<{ Params: { id: string } }>(
    '/api/reports/:id/track-download',
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = getUser(request)?.id;
        if (!userId) {
          return reply.code(401).send({
            error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          });
        }

        const { id } = request.params as { id: string };

        // Get report with analysis info
        const report = await prisma.report.findFirst({
          where: { id, userId },
          select: { id: true, analysisId: true },
        });

        if (!report) {
          return reply.code(404).send({
            error: { code: 'NOT_FOUND', message: 'Report not found' },
          });
        }

        // Check free download usage if analysisId exists
        let isFreeDownload = false;
        let analysis = null;
        let freeDownloadsRemaining = 0;

        if (report.analysisId) {
          analysis = await prisma.analysis.findFirst({
            where: { id: report.analysisId, userId },
            select: { id: true, pdfDownloadsUsed: true },
          });

          if (analysis) {
            freeDownloadsRemaining = FREE_PDF_DOWNLOADS_PER_ANALYSIS - analysis.pdfDownloadsUsed;
            isFreeDownload = freeDownloadsRemaining > 0;
          }
        }

        // Charge credits if not free
        if (!isFreeDownload) {
          const chargeResult = await creditService.charge(
            userId,
            PDF_DOWNLOAD_CREDIT_COST,
            'pdf_download',
            { reportId: id, analysisId: report.analysisId }
          );

          if (!chargeResult.success) {
            return reply.code(402).send({
              error: {
                code: 'INSUFFICIENT_CREDITS',
                message: `PDF download requires ${PDF_DOWNLOAD_CREDIT_COST} credits (free downloads exhausted for this analysis).`,
                required: PDF_DOWNLOAD_CREDIT_COST,
              },
            });
          }
        }

        // Update download counter if tied to analysis
        if (analysis && report.analysisId) {
          await prisma.analysis.update({
            where: { id: report.analysisId },
            data: { pdfDownloadsUsed: { increment: 1 } },
          });
        }

        // Also update report download count
        await prisma.report.update({
          where: { id },
          data: { downloadCount: { increment: 1 } },
        });

        return reply.send({
          success: true,
          data: {
            canDownload: true,
            wasFree: isFreeDownload,
            freeDownloads: analysis ? {
              used: analysis.pdfDownloadsUsed + 1,
              total: FREE_PDF_DOWNLOADS_PER_ANALYSIS,
              remaining: Math.max(0, FREE_PDF_DOWNLOADS_PER_ANALYSIS - analysis.pdfDownloadsUsed - 1),
            } : null,
          },
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({
          error: { code: 'SERVER_ERROR', message: 'Failed to track download' },
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
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = getUser(request)?.id;
        if (!userId) {
          return reply.code(401).send({
            error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          });
        }

        const { analysisId } = request.params as { analysisId: string };
        const { comment } = request.body as { comment: string };

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
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = getUser(request)?.id;
        if (!userId) {
          return reply.code(401).send({
            error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          });
        }

        const { id } = request.params as { id: string };
        const { comment } = request.body as { comment: string };

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
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = getUser(request)?.id;
        if (!userId) {
          return reply.code(401).send({
            error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          });
        }

        const { id } = request.params as { id: string };

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
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = getUser(request)?.id;
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
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = getUser(request)?.id;
        if (!userId) {
          return reply.code(401).send({
            error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          });
        }

        const { id } = request.params as { id: string };

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
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = getUser(request)?.id;
        if (!userId) {
          return reply.code(401).send({
            error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          });
        }

        const { id } = request.params as { id: string };

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
            outcomePrice = result.outcomePrice as any;
            outcomePriceChange = result.priceChange as any;
            stepOutcomes = result.stepOutcomes as any;
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
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = getUser(request)?.id;
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
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = getUser(request)?.id;
        if (!userId) {
          return reply.code(401).send({
            error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          });
        }

        const { id } = request.params as { id: string };

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

  // ===========================================
  // POST /api/reports/send-email - Send PDF report via email
  // ===========================================
  fastify.post<{ Body: SendEmailBody }>(
    '/api/reports/send-email',
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = getUser(request)?.id;
        if (!userId) {
          return reply.code(401).send({
            error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          });
        }

        const { symbol, verdict, score, direction, generatedAt, pdfBase64, fileName, analysisId } = request.body as SendEmailBody;

        // Validate required fields
        if (!symbol || !pdfBase64 || !fileName) {
          return reply.code(400).send({
            error: { code: 'INVALID_INPUT', message: 'Missing required fields: symbol, pdfBase64, fileName' },
          });
        }

        // Check free email usage if analysisId is provided
        let isFreeEmail = false;
        let analysis = null;
        let freeEmailsRemaining = 0;

        if (analysisId) {
          analysis = await prisma.analysis.findFirst({
            where: { id: analysisId, userId },
            select: { id: true, emailsSentUsed: true },
          });

          if (analysis) {
            freeEmailsRemaining = FREE_EMAILS_PER_ANALYSIS - analysis.emailsSentUsed;
            isFreeEmail = freeEmailsRemaining > 0;
          }
        }

        // Charge credits if not free
        if (!isFreeEmail) {
          const chargeResult = await creditService.charge(
            userId,
            EMAIL_SEND_CREDIT_COST,
            'email_send_report',
            { symbol, analysisId }
          );

          if (!chargeResult.success) {
            return reply.code(402).send({
              error: {
                code: 'INSUFFICIENT_CREDITS',
                message: `Sending email requires ${EMAIL_SEND_CREDIT_COST} credits (free emails exhausted for this analysis).`,
                required: EMAIL_SEND_CREDIT_COST,
              },
            });
          }
        }

        // Update email counter if tied to analysis
        if (analysis) {
          await prisma.analysis.update({
            where: { id: analysisId },
            data: { emailsSentUsed: { increment: 1 } },
          });
        }

        // Get user's email
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { email: true, name: true },
        });

        if (!user?.email) {
          return reply.code(400).send({
            error: { code: 'NO_EMAIL', message: 'User email not found' },
          });
        }

        // Send the PDF report via email
        const result = await emailService.sendPdfReport(user.email, {
          userName: user.name || 'Trader',
          symbol,
          verdict: verdict || 'N/A',
          score: score || 0,
          direction: direction || 'long',
          generatedAt: generatedAt || new Date().toLocaleString('tr-TR'),
          pdfBase64,
          fileName,
        });

        if (!result.success) {
          fastify.log.error({ error: result.error }, 'Failed to send PDF email');
          return reply.code(500).send({
            error: { code: 'EMAIL_FAILED', message: 'Failed to send email', details: result.error },
          });
        }

        return reply.send({
          success: true,
          message: 'Report sent successfully to ' + user.email,
          data: {
            email: user.email,
            wasFree: isFreeEmail,
            freeEmails: analysis ? {
              used: analysis.emailsSentUsed + 1,
              total: FREE_EMAILS_PER_ANALYSIS,
              remaining: Math.max(0, FREE_EMAILS_PER_ANALYSIS - analysis.emailsSentUsed - 1),
            } : null,
          },
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({
          error: { code: 'SERVER_ERROR', message: 'Failed to send report email' },
        });
      }
    }
  );

  // ===========================================
  // POST /api/reports/send-html-email - Send HTML report via email (5 credits)
  // ===========================================

  fastify.post<{ Body: SendHtmlEmailBody }>(
    '/api/reports/send-html-email',
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = getUser(request)?.id;
        if (!userId) {
          return reply.code(401).send({
            error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          });
        }

        const { reportId, reportData, chartImage } = request.body as SendHtmlEmailBody;

        if (!reportId || !reportData) {
          return reply.code(400).send({
            error: { code: 'INVALID_INPUT', message: 'Missing required fields: reportId, reportData' },
          });
        }

        // Get user's email and credits
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { email: true, name: true },
        });

        if (!user?.email) {
          return reply.code(400).send({
            error: { code: 'NO_EMAIL', message: 'User email not found' },
          });
        }

        // Check user credits
        const creditBalance = await prisma.creditBalance.findUnique({
          where: { userId },
          select: { balance: true },
        });

        const currentBalance = creditBalance?.balance || 0;
        if (currentBalance < HTML_EMAIL_CREDIT_COST) {
          return reply.code(402).send({
            error: {
              code: 'INSUFFICIENT_CREDITS',
              message: `Not enough credits. Required: ${HTML_EMAIL_CREDIT_COST}, Available: ${currentBalance}`,
            },
          });
        }

        // Generate HTML email content
        const htmlContent = generateReportHtmlEmail(reportData, user.name || 'Trader', chartImage);

        // Send the email
        const result = await emailService.sendEmail({
          to: user.email,
          subject: `${reportData.symbol}/USDT Analysis Report - TraderPath`,
          html: htmlContent,
          text: `Your ${reportData.symbol}/USDT analysis report from TraderPath. View this email in HTML format for best experience.`,
        });

        if (!result.success) {
          fastify.log.error({ error: result.error }, 'Failed to send HTML email');
          return reply.code(500).send({
            error: { code: 'EMAIL_FAILED', message: 'Failed to send email', details: result.error },
          });
        }

        // Deduct credits after successful send
        await prisma.creditBalance.update({
          where: { userId },
          data: {
            balance: { decrement: HTML_EMAIL_CREDIT_COST },
            lifetimeSpent: { increment: HTML_EMAIL_CREDIT_COST },
          },
        });

        fastify.log.info({ userId, email: user.email, credits: HTML_EMAIL_CREDIT_COST }, 'HTML report email sent');

        return reply.send({
          success: true,
          message: 'Report sent successfully to ' + user.email,
          data: {
            email: user.email,
            creditsUsed: HTML_EMAIL_CREDIT_COST,
          },
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({
          error: { code: 'SERVER_ERROR', message: 'Failed to send report email' },
        });
      }
    }
  );
}

// Get coin icon URL for email
function getCoinIconUrl(symbol: string): string {
  const coinId = symbol.toLowerCase();
  // Use CoinGecko API for coin icons (more reliable for email)
  return `https://cryptoicons.org/api/icon/${coinId}/64`;
}

// Generate SVG trade plan chart for email
function generateTradePlanChartSvg(
  direction: string,
  entryPrice: number | undefined,
  stopLoss: number | undefined,
  takeProfits: Array<{ price: number }> | undefined,
  currentPrice: number | undefined
): string {
  if (!entryPrice || !stopLoss) return '';

  const isLong = direction === 'long';
  const tp1 = takeProfits?.[0]?.price;
  const tp2 = takeProfits?.[1]?.price;
  const tp3 = takeProfits?.[2]?.price;

  // Calculate price range
  const prices = [entryPrice, stopLoss, tp1, tp2, tp3, currentPrice].filter(Boolean) as number[];
  const minPrice = Math.min(...prices) * 0.995;
  const maxPrice = Math.max(...prices) * 1.005;
  const priceRange = maxPrice - minPrice;

  const width = 540;
  const height = 200;
  const padding = 40;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  // Convert price to Y coordinate
  const priceToY = (price: number) => {
    const ratio = (price - minPrice) / priceRange;
    return height - padding - ratio * chartHeight;
  };

  // Format price for display
  const formatPrice = (price: number) => {
    if (price >= 1000) return price.toFixed(0);
    if (price >= 1) return price.toFixed(2);
    if (price >= 0.01) return price.toFixed(4);
    return price.toFixed(6);
  };

  const entryY = priceToY(entryPrice);
  const slY = priceToY(stopLoss);
  const tp1Y = tp1 ? priceToY(tp1) : null;
  const tp2Y = tp2 ? priceToY(tp2) : null;
  const tp3Y = tp3 ? priceToY(tp3) : null;
  const currentY = currentPrice ? priceToY(currentPrice) : null;

  let svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bgGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#1a1a2e"/>
          <stop offset="100%" style="stop-color:#0f172a"/>
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#bgGradient)" rx="8"/>

      <!-- Price range area -->
      <rect x="${padding}" y="${padding}" width="${chartWidth}" height="${chartHeight}" fill="#334155" rx="4" opacity="0.5"/>

      <!-- Entry line (cyan) -->
      <line x1="${padding}" y1="${entryY}" x2="${width - padding}" y2="${entryY}" stroke="#22d3ee" stroke-width="2" stroke-dasharray="5,5"/>
      <text x="${padding + 5}" y="${entryY - 5}" fill="#22d3ee" font-size="11" font-family="Arial">Entry: $${formatPrice(entryPrice)}</text>

      <!-- Stop Loss line (red) -->
      <line x1="${padding}" y1="${slY}" x2="${width - padding}" y2="${slY}" stroke="#ef4444" stroke-width="2"/>
      <text x="${padding + 5}" y="${slY + 15}" fill="#ef4444" font-size="11" font-family="Arial">SL: $${formatPrice(stopLoss)}</text>`;

  // Take Profit lines (green)
  if (tp1Y !== null && tp1) {
    svg += `
      <line x1="${padding}" y1="${tp1Y}" x2="${width - padding}" y2="${tp1Y}" stroke="#10b981" stroke-width="2"/>
      <text x="${width - padding - 80}" y="${tp1Y - 5}" fill="#10b981" font-size="11" font-family="Arial">TP1: $${formatPrice(tp1)}</text>`;
  }
  if (tp2Y !== null && tp2) {
    svg += `
      <line x1="${padding}" y1="${tp2Y}" x2="${width - padding}" y2="${tp2Y}" stroke="#10b981" stroke-width="2" stroke-dasharray="3,3"/>
      <text x="${width - padding - 80}" y="${tp2Y - 5}" fill="#10b981" font-size="10" font-family="Arial">TP2: $${formatPrice(tp2)}</text>`;
  }
  if (tp3Y !== null && tp3) {
    svg += `
      <line x1="${padding}" y1="${tp3Y}" x2="${width - padding}" y2="${tp3Y}" stroke="#10b981" stroke-width="2" stroke-dasharray="2,4"/>
      <text x="${width - padding - 80}" y="${tp3Y - 5}" fill="#10b981" font-size="10" font-family="Arial">TP3: $${formatPrice(tp3)}</text>`;
  }

  // Current price marker
  if (currentY !== null && currentPrice) {
    svg += `
      <circle cx="${width / 2}" cy="${currentY}" r="6" fill="#f59e0b"/>
      <text x="${width / 2 + 10}" y="${currentY + 4}" fill="#f59e0b" font-size="11" font-family="Arial">Current: $${formatPrice(currentPrice)}</text>`;
  }

  // Direction arrow
  const arrowY = padding + 15;
  if (isLong) {
    svg += `
      <polygon points="${width - padding - 30},${arrowY + 10} ${width - padding - 20},${arrowY} ${width - padding - 10},${arrowY + 10}" fill="#10b981"/>
      <text x="${width - padding - 55}" y="${arrowY + 12}" fill="#10b981" font-size="12" font-family="Arial" font-weight="bold">LONG</text>`;
  } else {
    svg += `
      <polygon points="${width - padding - 30},${arrowY} ${width - padding - 20},${arrowY + 10} ${width - padding - 10},${arrowY}" fill="#ef4444"/>
      <text x="${width - padding - 55}" y="${arrowY + 12}" fill="#ef4444" font-size="12" font-family="Arial" font-weight="bold">SHORT</text>`;
  }

  svg += '</svg>';
  return svg;
}

// Generate HTML email content for report
function generateReportHtmlEmail(
  data: SendHtmlEmailBody['reportData'],
  userName: string,
  chartImage?: string
): string {
  const symbol = data.symbol || 'N/A';
  const generatedAt = data.generatedAt || new Date().toLocaleString('tr-TR');
  const verdict = data.verdict as Record<string, unknown> | undefined;
  const tradePlan = data.tradePlan as Record<string, unknown> | undefined;
  const assetScan = data.assetScan as Record<string, unknown> | undefined;
  const marketPulse = data.marketPulse as Record<string, unknown> | undefined;
  const safetyCheck = data.safetyCheck as Record<string, unknown> | undefined;
  const timing = data.timing as Record<string, unknown> | undefined;

  const direction = (tradePlan?.direction as string) || 'long';
  const isLong = direction === 'long';
  const score = ((verdict?.overallScore as number) || 0) * 10;
  const action = (verdict?.action as string) || 'N/A';

  const formatPrice = (price: number | undefined): string => {
    if (!price) return '$0';
    if (price >= 1000) return `$${price.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
    if (price >= 1) return `$${price.toFixed(2)}`;
    if (price >= 0.01) return `$${price.toFixed(4)}`;
    return `$${price.toFixed(6)}`;
  };

  const entryPrice = tradePlan?.averageEntry as number | undefined;
  const stopLoss = (tradePlan?.stopLoss as Record<string, unknown>)?.price as number | undefined;
  const takeProfits = tradePlan?.takeProfits as Array<{ price: number }> | undefined;
  const currentPrice = assetScan?.currentPrice as number | undefined;
  const priceChange24h = assetScan?.priceChange24h as number | undefined;
  const rsi = (assetScan?.indicators as Record<string, unknown>)?.rsi as number | undefined;
  const fearGreedIndex = marketPulse?.fearGreedIndex as number | undefined;
  const fearGreedLabel = marketPulse?.fearGreedLabel as string | undefined;
  const btcDominance = marketPulse?.btcDominance as number | undefined;
  const riskLevel = safetyCheck?.riskLevel as string | undefined;
  const tradeNow = timing?.tradeNow as boolean | undefined;
  const coinIconUrl = getCoinIconUrl(symbol);

  // Generate SVG chart if no chartImage provided
  // Convert to base64 data URL because email clients don't support inline SVG
  let svgChartDataUrl = '';
  if (!chartImage) {
    const svgString = generateTradePlanChartSvg(
      direction,
      entryPrice,
      stopLoss,
      takeProfits,
      currentPrice
    );
    if (svgString) {
      // Encode SVG as base64 data URL for email compatibility
      const svgBase64 = Buffer.from(svgString).toString('base64');
      svgChartDataUrl = `data:image/svg+xml;base64,${svgBase64}`;
    }
  }

  // TraderPath logo as inline SVG (works better in email than external images)
  const traderPathLogo = `
    <div style="text-align: center; margin-bottom: 10px;">
      <svg width="48" height="48" viewBox="0 0 512 512" style="display: inline-block;">
        <rect width="512" height="512" rx="96" fill="#0D1421"/>
        <g transform="translate(96, 96) scale(0.625)">
          <rect x="32" y="256" width="80" height="200" rx="8" fill="#22C55E"/>
          <rect x="144" y="180" width="80" height="276" rx="8" fill="#EF4444"/>
          <rect x="256" y="100" width="80" height="356" rx="8" fill="#22C55E"/>
          <rect x="368" y="56" width="80" height="400" rx="8" fill="#EF4444"/>
        </g>
      </svg>
    </div>
  `;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${symbol}/USDT Analysis Report</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0f172a; padding: 20px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #1e293b; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">

          <!-- Header with Logo -->
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 30px; text-align: center;">
              ${traderPathLogo}
              <h1 style="margin: 0; font-size: 24px; font-weight: bold;">
                <span style="color: #10b981;">Trader</span><span style="color: #ef4444;">Path</span>
              </h1>
              <p style="margin: 5px 0 0; color: #64748b; font-size: 12px;">
                AI-Powered Trading Analysis
              </p>
            </td>
          </tr>

          <!-- Symbol Header with Coin Icon -->
          <tr>
            <td style="background: linear-gradient(135deg, ${isLong ? '#10b981' : '#ef4444'} 0%, ${isLong ? '#059669' : '#dc2626'} 100%); padding: 25px; text-align: center;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <img src="${coinIconUrl}" alt="${symbol}" width="48" height="48" style="border-radius: 50%; background: #ffffff; padding: 4px; display: inline-block; vertical-align: middle;" onerror="this.style.display='none'"/>
                    <h2 style="margin: 10px 0 0; color: #ffffff; font-size: 24px; font-weight: bold;">
                      ${symbol}/USDT Analysis
                    </h2>
                    <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 13px;">
                      ${generatedAt}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Score & Direction -->
          <tr>
            <td style="padding: 25px;">
              <table width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <div style="display: inline-block; background-color: ${isLong ? '#10b981' : '#ef4444'}20; border-radius: 50px; padding: 15px 30px;">
                      <span style="font-size: 36px; font-weight: bold; color: ${isLong ? '#10b981' : '#ef4444'};">
                        ${score}/100
                      </span>
                      <span style="display: block; color: ${isLong ? '#10b981' : '#ef4444'}; font-size: 16px; font-weight: 600; margin-top: 5px;">
                        ${isLong ? 'LONG' : 'SHORT'} - ${action}
                      </span>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Trade Plan Chart -->
          ${chartImage || svgChartDataUrl ? `
          <tr>
            <td style="padding: 0 30px 20px;">
              <h2 style="color: #ffffff; font-size: 18px; margin: 0 0 15px; border-bottom: 1px solid #334155; padding-bottom: 10px;">
                Trade Plan Chart
              </h2>
              <div style="background-color: #1a1a2e; border-radius: 8px; padding: 10px; text-align: center;">
                <img src="${chartImage || svgChartDataUrl}" alt="Trade Plan Chart" style="max-width: 100%; width: 540px; height: auto; border-radius: 8px;"/>
              </div>
            </td>
          </tr>
          ` : ''}

          <!-- Trade Plan -->
          <tr>
            <td style="padding: 0 30px 20px;">
              <h2 style="color: #ffffff; font-size: 18px; margin: 0 0 15px; border-bottom: 1px solid #334155; padding-bottom: 10px;">
                Trade Plan
              </h2>
              <table width="100%" cellspacing="0" cellpadding="10" style="background-color: #334155; border-radius: 8px;">
                <tr>
                  <td style="color: #94a3b8; font-size: 12px; text-transform: uppercase;">Entry</td>
                  <td style="color: #94a3b8; font-size: 12px; text-transform: uppercase;">Stop Loss</td>
                  <td style="color: #94a3b8; font-size: 12px; text-transform: uppercase;">TP1</td>
                  <td style="color: #94a3b8; font-size: 12px; text-transform: uppercase;">TP2</td>
                  <td style="color: #94a3b8; font-size: 12px; text-transform: uppercase;">TP3</td>
                </tr>
                <tr>
                  <td style="color: #22d3ee; font-size: 14px; font-weight: 600;">${formatPrice(entryPrice)}</td>
                  <td style="color: #ef4444; font-size: 14px; font-weight: 600;">${formatPrice(stopLoss)}</td>
                  <td style="color: #10b981; font-size: 14px; font-weight: 600;">${formatPrice(takeProfits?.[0]?.price)}</td>
                  <td style="color: #10b981; font-size: 14px; font-weight: 600;">${formatPrice(takeProfits?.[1]?.price)}</td>
                  <td style="color: #10b981; font-size: 14px; font-weight: 600;">${formatPrice(takeProfits?.[2]?.price)}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Analysis Summary -->
          <tr>
            <td style="padding: 0 30px 20px;">
              <h2 style="color: #ffffff; font-size: 18px; margin: 0 0 15px; border-bottom: 1px solid #334155; padding-bottom: 10px;">
                Analysis Summary
              </h2>
              <table width="100%" cellspacing="10" cellpadding="0">
                <tr>
                  <td width="50%" style="background-color: #334155; border-radius: 8px; padding: 12px;">
                    <span style="color: #94a3b8; font-size: 11px; text-transform: uppercase;">Current Price</span>
                    <div style="color: #ffffff; font-size: 16px; font-weight: 600; margin-top: 4px;">
                      ${formatPrice(currentPrice)}
                      <span style="color: ${(priceChange24h || 0) >= 0 ? '#10b981' : '#ef4444'}; font-size: 12px;">
                        ${(priceChange24h || 0) >= 0 ? '+' : ''}${priceChange24h?.toFixed(2) || '0'}%
                      </span>
                    </div>
                  </td>
                  <td width="50%" style="background-color: #334155; border-radius: 8px; padding: 12px;">
                    <span style="color: #94a3b8; font-size: 11px; text-transform: uppercase;">RSI</span>
                    <div style="color: #ffffff; font-size: 16px; font-weight: 600; margin-top: 4px;">
                      ${rsi?.toFixed(0) || 'N/A'}
                      <span style="color: #94a3b8; font-size: 12px;">
                        ${rsi ? (rsi > 70 ? 'Overbought' : rsi < 30 ? 'Oversold' : 'Neutral') : ''}
                      </span>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td width="50%" style="background-color: #334155; border-radius: 8px; padding: 12px;">
                    <span style="color: #94a3b8; font-size: 11px; text-transform: uppercase;">Fear & Greed</span>
                    <div style="color: #ffffff; font-size: 16px; font-weight: 600; margin-top: 4px;">
                      ${fearGreedIndex || 'N/A'}
                      <span style="color: #94a3b8; font-size: 12px;">${fearGreedLabel || ''}</span>
                    </div>
                  </td>
                  <td width="50%" style="background-color: #334155; border-radius: 8px; padding: 12px;">
                    <span style="color: #94a3b8; font-size: 11px; text-transform: uppercase;">BTC Dominance</span>
                    <div style="color: #ffffff; font-size: 16px; font-weight: 600; margin-top: 4px;">
                      ${btcDominance?.toFixed(1) || 'N/A'}%
                    </div>
                  </td>
                </tr>
                <tr>
                  <td width="50%" style="background-color: #334155; border-radius: 8px; padding: 12px;">
                    <span style="color: #94a3b8; font-size: 11px; text-transform: uppercase;">Risk Level</span>
                    <div style="color: ${riskLevel === 'low' ? '#10b981' : riskLevel === 'high' ? '#ef4444' : '#f59e0b'}; font-size: 16px; font-weight: 600; margin-top: 4px; text-transform: uppercase;">
                      ${riskLevel || 'N/A'}
                    </div>
                  </td>
                  <td width="50%" style="background-color: #334155; border-radius: 8px; padding: 12px;">
                    <span style="color: #94a3b8; font-size: 11px; text-transform: uppercase;">Timing</span>
                    <div style="color: ${tradeNow ? '#10b981' : '#f59e0b'}; font-size: 16px; font-weight: 600; margin-top: 4px;">
                      ${tradeNow ? 'Good Entry' : 'Wait'}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${data.aiExpertComment ? `
          <!-- AI Expert Comment -->
          <tr>
            <td style="padding: 0 30px 20px;">
              <h2 style="color: #ffffff; font-size: 18px; margin: 0 0 15px; border-bottom: 1px solid #334155; padding-bottom: 10px;">
                AI Expert Review
              </h2>
              <div style="background-color: #334155; border-radius: 8px; padding: 15px; border-left: 4px solid #f59e0b;">
                <p style="color: #e2e8f0; font-size: 14px; line-height: 1.6; margin: 0; white-space: pre-wrap;">
                  ${data.aiExpertComment}
                </p>
              </div>
            </td>
          </tr>
          ` : ''}

          <!-- Footer -->
          <tr>
            <td style="background-color: #0f172a; padding: 20px 30px; text-align: center; border-top: 1px solid #334155;">
              <p style="color: #64748b; font-size: 12px; margin: 0;">
                This report was sent from <span style="color: #10b981;">Trader</span><span style="color: #ef4444;">Path</span>
              </p>
              <p style="color: #475569; font-size: 11px; margin: 10px 0 0;">
                This is not financial advice. Always do your own research before trading.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
