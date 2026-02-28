// ===========================================
// Report Routes
// API endpoints for saving and retrieving analysis reports
// ===========================================

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../../core/database';
import { authenticate } from '../../core/auth/middleware';
import { calculateExpiredOutcomes, getRealAccuracy, calculateReportOutcome } from './outcome.service';
import { notificationService } from '../notifications/notification.service';
import { creditService } from '../credits/credit.service';
import { logger } from '../../core/logger';
import { detectAssetClass } from '../analysis/providers/symbol-resolver';
import { snapshotService, type SnapshotType } from './snapshot.service';
import { reportDistributionService } from './report-distribution.service';

// Helper: format symbol pair (crypto gets /USDT, non-crypto doesn't)
function formatSymbolPair(symbol: string): string {
  const assetClass = detectAssetClass(symbol);
  if (assetClass !== 'crypto') {
    return symbol.toUpperCase().replace('.IS', '');
  }
  return `${symbol.toUpperCase()}/USDT`;
}

// Constants for free usage limits per analysis
const FREE_SNAPSHOT_DOWNLOADS_PER_ANALYSIS = 2;
const SNAPSHOT_DOWNLOAD_CREDIT_COST = 5;

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
        // Guard: verdict could be non-string from report data
        const verdictLower = typeof verdict === 'string' ? verdict.toLowerCase() : '';
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

        // Auto-distribute snapshot report to user's channels (async, non-blocking)
        reportDistributionService.distributeToUser(
          report.id,
          userId,
          reportData,
          'executive'
        ).catch(err => {
          fastify.log.error(err, 'Failed to auto-distribute report snapshots');
        });

        // Auto-distribute to Intelligence Reports subscribers if GO/CONDITIONAL_GO
        if (shouldCreateAlerts) {
          reportDistributionService.distributeToSubscribers(
            reportData,
            'executive'
          ).catch(err => {
            fastify.log.error(err, 'Failed to distribute to subscribers');
          });
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

        // Fetch current prices for all symbols (multi-asset: crypto from Binance, others from Yahoo)
        const symbols = [...new Set(reports.map(r => r.symbol))];
        const prices: Record<string, number> = {};

        if (symbols.length > 0) {
          // Separate crypto vs non-crypto symbols
          const cryptoSymbols = symbols.filter(s => detectAssetClass(s) === 'crypto');
          const nonCryptoSymbols = symbols.filter(s => detectAssetClass(s) !== 'crypto');

          // Fetch crypto prices from Binance
          if (cryptoSymbols.length > 0) {
            try {
              const pairs = cryptoSymbols.map(s => `"${s.toUpperCase()}USDT"`).join(',');
              const priceResponse = await fetch(
                `https://api.binance.com/api/v3/ticker/price?symbols=[${pairs}]`
              );
              if (priceResponse.ok) {
                const priceData = await priceResponse.json();
                for (const item of priceData) {
                  const sym = item.symbol.replace('USDT', '');
                  prices[sym] = parseFloat(item.price);
                }
              }
            } catch (err) {
              fastify.log.error({ error: err }, 'Failed to fetch crypto prices');
            }
          }

          // Fetch non-crypto prices from Yahoo Finance
          for (const sym of nonCryptoSymbols) {
            try {
              const { fetchTicker } = await import('../analysis/providers/multi-asset-data-provider');
              const ticker = await fetchTicker(sym);
              if (ticker?.price) {
                prices[sym.toUpperCase().replace('.IS', '')] = ticker.price;
              }
            } catch (err) {
              fastify.log.error({ error: err, symbol: sym }, 'Failed to fetch non-crypto price');
            }
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
              }).catch((err) => {
                logger.warn({ reportId: report.id, error: err }, 'Failed to update report entry price');
              }); // Fire and forget with logging
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
            method: (report as any).analysis?.method || 'classic', // Analysis method: 'classic' or 'mlis_pro'
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
  // POST /api/reports/:id/track-download - Track snapshot download with free usage limits
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
            freeDownloadsRemaining = FREE_SNAPSHOT_DOWNLOADS_PER_ANALYSIS - analysis.pdfDownloadsUsed;
            isFreeDownload = freeDownloadsRemaining > 0;
          }
        }

        // Charge credits if not free
        if (!isFreeDownload) {
          const chargeResult = await creditService.charge(
            userId,
            SNAPSHOT_DOWNLOAD_CREDIT_COST,
            'snapshot_download',
            { reportId: id, analysisId: report.analysisId }
          );

          if (!chargeResult.success) {
            return reply.code(402).send({
              error: {
                code: 'INSUFFICIENT_CREDITS',
                message: `Snapshot download requires ${SNAPSHOT_DOWNLOAD_CREDIT_COST} credits (free downloads exhausted for this analysis).`,
                required: SNAPSHOT_DOWNLOAD_CREDIT_COST,
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
              total: FREE_SNAPSHOT_DOWNLOADS_PER_ANALYSIS,
              remaining: Math.max(0, FREE_SNAPSHOT_DOWNLOADS_PER_ANALYSIS - analysis.pdfDownloadsUsed - 1),
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
  // Temporary Media Store (for WhatsApp image delivery via Twilio)
  // ===========================================
  const tempMediaStore = new Map<string, { data: Buffer; contentType: string; expiresAt: number }>();

  // Cleanup expired entries every 2 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of tempMediaStore) {
      if (now > value.expiresAt) {
        tempMediaStore.delete(key);
      }
    }
  }, 2 * 60 * 1000);

  // GET /api/reports/temp-media/:token - Serve temporary media (public, no auth)
  fastify.get<{ Params: { token: string } }>(
    '/api/reports/temp-media/:token',
    async (request: FastifyRequest<{ Params: { token: string } }>, reply: FastifyReply) => {
      const { token } = request.params;
      const media = tempMediaStore.get(token);

      if (!media || Date.now() > media.expiresAt) {
        tempMediaStore.delete(token);
        return reply.code(404).send({ error: 'Media not found or expired' });
      }

      reply.header('Content-Type', media.contentType);
      reply.header('Cache-Control', 'no-store');
      return reply.send(media.data);
    }
  );

  // ===========================================
  // POST /api/reports/whatsapp-screenshot - Send report screenshot via WhatsApp
  // ===========================================
  interface SendWhatsAppScreenshotBody {
    analysisId?: string;
    symbol: string;
    interval?: string;
    screenshot: string; // Base64 encoded image
    score: number;
    direction: string;
    phoneNumber: string; // Recipient WhatsApp number (e.g., +905xxxxxxxxx)
  }

  const WHATSAPP_SEND_CREDIT_COST = 5;

  fastify.post<{ Body: SendWhatsAppScreenshotBody }>(
    '/api/reports/whatsapp-screenshot',
    { preHandler: [authenticate], config: { rawBody: true }, bodyLimit: 20 * 1024 * 1024 },
    async (
      request: FastifyRequest<{ Body: SendWhatsAppScreenshotBody }>,
      reply: FastifyReply
    ) => {
      try {
        const userId = (request.user as JwtUser).id;
        const { analysisId, symbol, interval, screenshot, score, direction, phoneNumber } = request.body;

        if (!symbol || !screenshot || !phoneNumber) {
          return reply.code(400).send({
            error: { code: 'MISSING_FIELDS', message: 'Missing required fields (symbol, screenshot, phoneNumber)' },
          });
        }

        // Validate phone number format
        const cleanPhone = phoneNumber.replace(/\s/g, '');
        if (!/^\+\d{10,15}$/.test(cleanPhone)) {
          return reply.code(400).send({
            error: { code: 'INVALID_PHONE', message: 'Phone number must start with + followed by 10-15 digits (e.g., +905551234567)' },
          });
        }

        // Get user info
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { name: true, email: true, isAdmin: true },
        });

        if (!user) {
          return reply.code(400).send({
            error: { code: 'USER_NOT_FOUND', message: 'User not found' },
          });
        }

        // Charge credits for WhatsApp send (admin bypasses)
        if (!user.isAdmin) {
          const chargeResult = await creditService.charge(
            userId,
            WHATSAPP_SEND_CREDIT_COST,
            'whatsapp_send_report',
            { symbol, analysisId }
          );

          if (!chargeResult.success) {
            return reply.code(402).send({
              error: {
                code: 'INSUFFICIENT_CREDITS',
                message: `Requires ${WHATSAPP_SEND_CREDIT_COST} credits. You have ${chargeResult.newBalance} credits.`,
                required: WHATSAPP_SEND_CREDIT_COST,
                currentBalance: chargeResult.newBalance,
              },
            });
          }
        }

        // Check Twilio credentials
        const twilioSid = process.env['TWILIO_ACCOUNT_SID'];
        const twilioToken = process.env['TWILIO_AUTH_TOKEN'];
        const twilioPhone = process.env['TWILIO_PHONE_NUMBER'];

        if (!twilioSid || !twilioToken || !twilioPhone) {
          return reply.code(503).send({
            error: { code: 'WHATSAPP_NOT_CONFIGURED', message: 'WhatsApp sending is not configured. Please contact support.' },
          });
        }

        // Store screenshot in temp media store
        const crypto = await import('crypto');
        const token = crypto.randomBytes(32).toString('hex');

        // Strip data URL prefix if present
        const base64Data = screenshot.replace(/^data:image\/\w+;base64,/, '');
        const imageBuffer = Buffer.from(base64Data, 'base64');
        const contentType = screenshot.startsWith('data:image/png') ? 'image/png' : 'image/jpeg';

        tempMediaStore.set(token, {
          data: imageBuffer,
          contentType,
          expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
        });

        const apiUrl = process.env['API_URL'] || 'https://api.traderpath.io';
        const mediaUrl = `${apiUrl}/api/reports/temp-media/${token}`;

        // Format WhatsApp message
        const directionText = direction?.toLowerCase() === 'long' ? 'LONG' : direction?.toLowerCase() === 'short' ? 'SHORT' : 'NEUTRAL';
        const directionEmoji = direction?.toLowerCase() === 'long' ? '🟢' : direction?.toLowerCase() === 'short' ? '🔴' : '⚪';
        const scoreNum = typeof score === 'number' ? score : 0;
        const scoreDisplay = scoreNum > 10 ? scoreNum.toFixed(0) : (scoreNum * 10).toFixed(0);

        const appUrl = process.env['APP_URL'] || 'https://traderpath.io';
        const waText = [
          `${directionEmoji} *TraderPath Analysis Report*`,
          ``,
          `*${formatSymbolPair(symbol)}* | ${directionText}`,
          `Score: *${scoreDisplay}/100*`,
          interval ? `Timeframe: ${interval}` : '',
          ``,
          `✅ 7-Step Analysis`,
          `✅ Trade Plan (Entry, SL, TP)`,
          `✅ AI Expert Commentary`,
          ``,
          analysisId ? `📊 View Interactive: ${appUrl}/analyze/details/${analysisId}` : '',
          ``,
          `_TraderPath - Professional Trading Analysis_`,
          `_This is not financial advice._`,
        ].filter(Boolean).join('\n');

        // Send via Twilio WhatsApp API
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
        const auth = Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64');

        const response = await fetch(twilioUrl, {
          method: 'POST',
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            To: `whatsapp:${cleanPhone}`,
            From: `whatsapp:${twilioPhone}`,
            Body: waText,
            MediaUrl: mediaUrl,
          }),
        });

        if (!response.ok) {
          const errorBody = await response.text();
          fastify.log.error({ status: response.status, body: errorBody }, 'Twilio WhatsApp send failed');

          // Refund credits if charged
          if (!user.isAdmin) {
            try {
              await creditService.add(userId, WHATSAPP_SEND_CREDIT_COST, 'BONUS', 'whatsapp_send_error_refund', { isRefund: true, symbol, analysisId });
            } catch { /* best effort refund */ }
          }

          return reply.code(500).send({
            error: { code: 'WHATSAPP_FAILED', message: 'Failed to send WhatsApp message', details: errorBody },
          });
        }

        // Clean up media after a short delay (Twilio needs time to fetch)
        setTimeout(() => {
          tempMediaStore.delete(token);
        }, 3 * 60 * 1000); // 3 minutes

        fastify.log.info({ userId, phone: cleanPhone, symbol, analysisId }, 'WhatsApp report screenshot sent');

        return reply.send({
          success: true,
          message: `Report sent via WhatsApp to ${cleanPhone}`,
        });
      } catch (error) {
        fastify.log.error({ error, userId: (request.user as JwtUser)?.id }, 'WhatsApp screenshot endpoint error');
        const msg = error instanceof Error ? error.message : 'Failed to send WhatsApp message';
        return reply.code(500).send({
          error: { code: 'SERVER_ERROR', message: msg },
        });
      }
    }
  );

  // ===========================================
  // POST /api/reports/:id/snapshots - Generate snapshot PNGs for a report
  // ===========================================
  fastify.post<{ Params: { id: string }; Body: { type?: SnapshotType } }>(
    '/api/reports/:id/snapshots',
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
        const { type = 'executive' } = (request.body as { type?: SnapshotType }) || {};

        // Get report
        const report = await prisma.report.findFirst({
          where: { id, userId },
        });

        if (!report) {
          return reply.code(404).send({
            error: { code: 'NOT_FOUND', message: 'Report not found' },
          });
        }

        // Check if Puppeteer is available
        const available = await snapshotService.isAvailable();
        if (!available) {
          return reply.code(503).send({
            error: { code: 'SERVICE_UNAVAILABLE', message: 'Snapshot generation is not available on this server' },
          });
        }

        const reportData = report.reportData as Record<string, unknown>;
        const snapshots = await snapshotService.generateSnapshots(reportData, type);

        if (snapshots.length === 0) {
          return reply.code(500).send({
            error: { code: 'GENERATION_FAILED', message: 'Failed to generate snapshots' },
          });
        }

        // Return snapshots as base64 array
        const snapshotData = snapshots.map(s => ({
          id: s.id,
          title: s.title,
          base64: s.buffer.toString('base64'),
          mimeType: 'image/png',
        }));

        return reply.send({
          success: true,
          data: {
            type,
            symbol: report.symbol,
            count: snapshotData.length,
            snapshots: snapshotData,
          },
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({
          error: { code: 'SERVER_ERROR', message: 'Failed to generate snapshots' },
        });
      }
    }
  );

  // ===========================================
  // GET /api/reports/:id/snapshot/:pageId - Download a single snapshot PNG
  // ===========================================
  fastify.get<{ Params: { id: string; pageId: string }; Querystring: { type?: SnapshotType } }>(
    '/api/reports/:id/snapshot/:pageId',
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = getUser(request)?.id;
        if (!userId) {
          return reply.code(401).send({
            error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          });
        }

        const { id, pageId } = request.params as { id: string; pageId: string };
        const { type = 'executive' } = (request.query as { type?: SnapshotType }) || {};

        const report = await prisma.report.findFirst({
          where: { id, userId },
        });

        if (!report) {
          return reply.code(404).send({
            error: { code: 'NOT_FOUND', message: 'Report not found' },
          });
        }

        const reportData = report.reportData as Record<string, unknown>;
        const snapshots = await snapshotService.generateSnapshots(reportData, type);
        const target = snapshots.find(s => s.id === pageId);

        if (!target) {
          return reply.code(404).send({
            error: { code: 'NOT_FOUND', message: `Snapshot page '${pageId}' not found` },
          });
        }

        return reply
          .header('Content-Type', 'image/png')
          .header('Content-Disposition', `attachment; filename="TraderPath_${report.symbol}_${pageId}.png"`)
          .send(target.buffer);
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({
          error: { code: 'SERVER_ERROR', message: 'Failed to generate snapshot' },
        });
      }
    }
  );

  // ===========================================
  // POST /api/reports/:id/distribute - Send report snapshots via Telegram/Discord
  // ===========================================
  fastify.post<{ Params: { id: string }; Body: { type?: SnapshotType } }>(
    '/api/reports/:id/distribute',
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
        const { type = 'executive' } = (request.body as { type?: SnapshotType }) || {};

        const report = await prisma.report.findFirst({
          where: { id, userId },
        });

        if (!report) {
          return reply.code(404).send({
            error: { code: 'NOT_FOUND', message: 'Report not found' },
          });
        }

        const reportData = report.reportData as Record<string, unknown>;

        // Distribute to user's configured channels
        const distResult = await reportDistributionService.distributeToUser(
          id,
          userId,
          reportData,
          type
        );

        return reply.send({
          success: true,
          data: {
            snapshotsGenerated: distResult.snapshotsGenerated,
            telegramSent: distResult.telegramSent,
            discordSent: distResult.discordSent,
            errors: distResult.errors.length > 0 ? distResult.errors : undefined,
          },
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({
          error: { code: 'SERVER_ERROR', message: 'Failed to distribute report' },
        });
      }
    }
  );
}

// Generate coin icon as base64 SVG (reliable for all email clients)
function getCoinIconDataUrl(symbol: string): string {
  // Create a simple SVG icon with the first letter of the symbol
  const letter = symbol.charAt(0).toUpperCase();
  const colors: Record<string, string> = {
    'B': '#F7931A', // BTC orange
    'E': '#627EEA', // ETH blue
    'S': '#14F195', // SOL green
    'A': '#2775CA', // ADA blue
    'D': '#C2A633', // DOGE gold
    'X': '#23292F', // XRP dark
    'L': '#345D9D', // LINK blue
    'P': '#E6007A', // DOT pink
    'U': '#26A17B', // USDT green
    'M': '#F0B90B', // MATIC yellow
  };
  const bgColor = colors[letter] || '#6366f1'; // default indigo

  const svg = `<svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><circle cx="24" cy="24" r="24" fill="${bgColor}"/><text x="24" y="24" text-anchor="middle" dy="0.35em" fill="white" font-family="Arial, sans-serif" font-size="20" font-weight="bold">${letter}</text></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

