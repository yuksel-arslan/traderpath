/**
 * Signal Service
 * Manages proactive trading signals generation and delivery
 */

import { prisma } from '../../core/database';
import { redis } from '../../core/cache';
import type {
  SignalData,
  SignalFilterCriteria,
  SignalPublishResult,
  SignalOutcome,
  SignalQualityEnrichment,
  SIGNAL_REQUIREMENTS,
  SIGNAL_EXPIRY_HOURS,
} from './types';

const CACHE_KEY_PREFIX = 'signal:';
const CACHE_TTL = 3600; // 1 hour

/**
 * Check if a Prisma error is due to missing table (P2021) or missing column (P2022)
 * Returns true if the error should be handled gracefully (table not migrated yet)
 */
function isTableMissing(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = (error as any).code;
  const message = (error as any).message || '';
  return code === 'P2021' || code === 'P2022' || message.includes('does not exist');
}

// Track whether we've already logged the missing table warning to avoid log spam
let tableMissingWarningLogged = false;

function logTableMissingOnce(method: string) {
  if (!tableMissingWarningLogged) {
    console.warn(`[SignalService] signals table not found in database (called from ${method}). Run the migration: apps/api/prisma/migrations/apply_signals_production.sql`);
    tableMissingWarningLogged = true;
  }
}

export class SignalService {
  /**
   * Create a new signal from analysis results
   */
  async createSignal(data: SignalData, qualityEnrichment?: SignalQualityEnrichment): Promise<string> {
    try {
      // Calculate expiry time based on typical trade type
      const expiryHours = this.getExpiryHours(data);
      const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

      const signal = await prisma.signal.create({
        data: {
          symbol: data.symbol,
          assetClass: data.assetClass,
          market: data.market,
          direction: data.direction,
          entryPrice: data.entryPrice,
          stopLoss: data.stopLoss,
          takeProfit1: data.takeProfit1,
          takeProfit2: data.takeProfit2,
          riskRewardRatio: data.riskRewardRatio,
          classicVerdict: data.classicVerdict,
          classicScore: data.classicScore,
          mlisConfirmation: data.mlisConfirmation,
          mlisRecommendation: data.mlisRecommendation,
          mlisConfidence: data.mlisConfidence,
          overallConfidence: data.overallConfidence,
          winRateEstimate: data.winRateEstimate ?? null,
          capitalFlowPhase: data.capitalFlowPhase,
          capitalFlowBias: data.capitalFlowBias,
          sectorFlow: data.sectorFlow,
          classicAnalysisId: data.classicAnalysisId,
          mlisAnalysisId: data.mlisAnalysisId,
          qualityScore: qualityEnrichment?.qualityScore.qualityScore ?? null,
          qualityData: qualityEnrichment ? {
            breakdown: qualityEnrichment.qualityScore.breakdown,
            qualityLabel: qualityEnrichment.qualityScore.qualityLabel,
            tooltip: qualityEnrichment.qualityScore.tooltip,
            forecastBands: qualityEnrichment.forecastBands,
          } : undefined,
          status: 'pending',
          expiresAt,
        },
      });

      // Cache the signal for quick access
      await this.cacheSignal(signal.id, signal);

      return signal.id;
    } catch (error) {
      if (isTableMissing(error)) {
        logTableMissingOnce('createSignal');
        return ''; // Return empty ID - signal not created
      }
      throw error;
    }
  }

  /**
   * Get signal by ID
   */
  async getSignal(signalId: string) {
    // Try cache first
    const cached = await redis?.get(`${CACHE_KEY_PREFIX}${signalId}`);
    if (cached) {
      return JSON.parse(cached);
    }

    try {
      const signal = await prisma.signal.findUnique({
        where: { id: signalId },
      });

      if (signal) {
        await this.cacheSignal(signalId, signal);
      }

      return signal;
    } catch (error) {
      if (isTableMissing(error)) {
        logTableMissingOnce('getSignal');
        return null;
      }
      throw error;
    }
  }

  /**
   * Get signals with filters
   */
  async getSignals(criteria: SignalFilterCriteria, limit = 50, offset = 0) {
    try {
      const where: any = {};

      if (criteria.market) {
        where.market = criteria.market;
      }
      if (criteria.status) {
        where.status = criteria.status;
      }
      if (criteria.minConfidence) {
        where.overallConfidence = { gte: criteria.minConfidence };
      }
      if (criteria.minScore) {
        where.classicScore = { gte: criteria.minScore };
      }
      if (criteria.direction) {
        where.direction = criteria.direction;
      }
      if (criteria.verdicts?.length) {
        where.classicVerdict = { in: criteria.verdicts };
      }
      if (criteria.minQualityScore !== undefined && criteria.minQualityScore > 0) {
        where.qualityScore = { gte: criteria.minQualityScore };
      }
      if (criteria.fromDate) {
        where.createdAt = { gte: criteria.fromDate };
      }
      if (criteria.toDate) {
        where.createdAt = { ...where.createdAt, lte: criteria.toDate };
      }

      const [signals, total] = await Promise.all([
        prisma.signal.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.signal.count({ where }),
      ]);

      return { signals, total };
    } catch (error) {
      if (isTableMissing(error)) {
        logTableMissingOnce('getSignals');
        return { signals: [], total: 0 };
      }
      throw error;
    }
  }

  /**
   * Get latest signals for a market
   */
  async getLatestSignals(market: string, limit = 10) {
    try {
      return await prisma.signal.findMany({
        where: {
          market,
          status: 'published',
          expiresAt: { gte: new Date() },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
    } catch (error) {
      if (isTableMissing(error)) {
        logTableMissingOnce('getLatestSignals');
        return [];
      }
      throw error;
    }
  }

  /**
   * Mark signal as published
   */
  async markAsPublished(
    signalId: string,
    telegramMessageId?: string,
    discordMessageId?: string
  ) {
    try {
      const signal = await prisma.signal.update({
        where: { id: signalId },
        data: {
          status: 'published',
          publishedAt: new Date(),
          telegramMessageId,
          discordMessageId,
        },
      });

      await this.invalidateCache(signalId);
      return signal;
    } catch (error) {
      if (isTableMissing(error)) {
        logTableMissingOnce('markAsPublished');
        return null;
      }
      throw error;
    }
  }

  /**
   * Record signal outcome
   */
  async recordOutcome(outcome: SignalOutcome) {
    try {
      const signal = await prisma.signal.update({
        where: { id: outcome.signalId },
        data: {
          outcome: outcome.outcome,
          outcomePrice: outcome.outcomePrice,
          pnlPercent: outcome.pnlPercent,
          outcomeAt: new Date(),
          status: 'expired',
        },
      });

      await this.invalidateCache(outcome.signalId);
      return signal;
    } catch (error) {
      if (isTableMissing(error)) {
        logTableMissingOnce('recordOutcome');
        return null;
      }
      throw error;
    }
  }

  /**
   * Cancel a pending signal
   */
  async cancelSignal(signalId: string, reason?: string) {
    try {
      const signal = await prisma.signal.update({
        where: { id: signalId },
        data: {
          status: 'cancelled',
        },
      });

      await this.invalidateCache(signalId);
      return signal;
    } catch (error) {
      if (isTableMissing(error)) {
        logTableMissingOnce('cancelSignal');
        return null;
      }
      throw error;
    }
  }

  /**
   * Expire old signals
   */
  async expireOldSignals() {
    try {
      const now = new Date();

      const result = await prisma.signal.updateMany({
        where: {
          status: { in: ['pending', 'published'] },
          expiresAt: { lt: now },
        },
        data: {
          status: 'expired',
        },
      });

      return result.count;
    } catch (error) {
      if (isTableMissing(error)) {
        logTableMissingOnce('expireOldSignals');
        return 0;
      }
      throw error;
    }
  }

  /**
   * Get signal statistics
   */
  async getSignalStats(fromDate?: Date, toDate?: Date) {
    try {
      const where: any = {};
      if (fromDate) where.createdAt = { gte: fromDate };
      if (toDate) where.createdAt = { ...where.createdAt, lte: toDate };

      const [
        total,
        published,
        tp1Hit,
        tp2Hit,
        slHit,
        expired,
        byMarket,
      ] = await Promise.all([
        prisma.signal.count({ where }),
        prisma.signal.count({ where: { ...where, status: 'published' } }),
        prisma.signal.count({ where: { ...where, outcome: 'tp1_hit' } }),
        prisma.signal.count({ where: { ...where, outcome: 'tp2_hit' } }),
        prisma.signal.count({ where: { ...where, outcome: 'sl_hit' } }),
        prisma.signal.count({ where: { ...where, outcome: 'expired' } }),
        prisma.signal.groupBy({
          by: ['market'],
          where,
          _count: { id: true },
        }),
      ]);

      const closedSignals = tp1Hit + tp2Hit + slHit;
      const winRate = closedSignals > 0 ? ((tp1Hit + tp2Hit) / closedSignals) * 100 : 0;

      return {
        total,
        published,
        outcomes: {
          tp1Hit,
          tp2Hit,
          slHit,
          expired,
        },
        winRate: Math.round(winRate * 10) / 10,
        byMarket: byMarket.map((m) => ({
          market: m.market,
          count: m._count.id,
        })),
      };
    } catch (error) {
      if (isTableMissing(error)) {
        logTableMissingOnce('getSignalStats');
        return {
          total: 0,
          published: 0,
          outcomes: { tp1Hit: 0, tp2Hit: 0, slHit: 0, expired: 0 },
          winRate: 0,
          byMarket: [],
        };
      }
      throw error;
    }
  }

  /**
   * Validate if signal meets quality requirements
   */
  validateSignalQuality(data: SignalData): { valid: boolean; reasons: string[] } {
    const reasons: string[] = [];

    // Check classic score
    if (data.classicScore < 7.0) {
      reasons.push(`Classic score ${data.classicScore} is below minimum 7.0`);
    }

    // Check overall confidence
    if (data.overallConfidence < 70) {
      reasons.push(`Overall confidence ${data.overallConfidence}% is below minimum 70%`);
    }

    // Check verdict
    if (!['GO', 'CONDITIONAL_GO'].includes(data.classicVerdict)) {
      reasons.push(`Verdict ${data.classicVerdict} is not allowed for signals`);
    }

    // Check capital flow phase
    if (['late', 'exit'].includes(data.capitalFlowPhase)) {
      reasons.push(`Capital flow phase ${data.capitalFlowPhase} is not optimal for new signals`);
    }

    // Check MLIS confirmation
    if (!data.mlisConfirmation) {
      reasons.push('MLIS Pro did not confirm the classic analysis');
    }

    // Check risk-reward ratio
    if (data.riskRewardRatio < 1.5) {
      reasons.push(`Risk-reward ratio ${data.riskRewardRatio} is below minimum 1.5`);
    }

    return {
      valid: reasons.length === 0,
      reasons,
    };
  }

  /**
   * Check for duplicate signals
   */
  async isDuplicateSignal(symbol: string, direction: string, hours = 4): Promise<boolean> {
    try {
      const since = new Date(Date.now() - hours * 60 * 60 * 1000);

      const existingSignal = await prisma.signal.findFirst({
        where: {
          symbol,
          direction,
          createdAt: { gte: since },
          status: { in: ['pending', 'published'] },
        },
      });

      return !!existingSignal;
    } catch (error) {
      if (isTableMissing(error)) {
        logTableMissingOnce('isDuplicateSignal');
        return false;
      }
      throw error;
    }
  }

  /**
   * Get user signal preferences
   */
  async getUserPreferences(userId: string) {
    try {
      let prefs = await prisma.userSignalPreferences.findUnique({
        where: { userId },
      });

      if (!prefs) {
        // Create default preferences
        prefs = await prisma.userSignalPreferences.create({
          data: {
            userId,
            enabledMarkets: ['crypto', 'stocks', 'metals', 'bonds'],
            enabledAssetClasses: ['crypto', 'stocks', 'metals', 'bonds'],
            minConfidence: 70,
            minClassicScore: 7.0,
            requireMlisConfirm: true,
            allowedVerdicts: ['GO', 'CONDITIONAL_GO'],
            telegramEnabled: false,
            discordEnabled: false,
            emailEnabled: true,
            quietHoursEnabled: false,
          },
        });
      }

      return prefs;
    } catch (error) {
      if (isTableMissing(error)) {
        logTableMissingOnce('getUserPreferences');
        // Return default preferences object without DB
        return {
          id: '',
          userId,
          enabledMarkets: ['crypto', 'stocks', 'metals', 'bonds'],
          enabledAssetClasses: ['crypto', 'stocks', 'metals', 'bonds'],
          minConfidence: 70,
          minClassicScore: 7.0,
          requireMlisConfirm: false,
          allowedVerdicts: ['GO', 'CONDITIONAL_GO'],
          telegramEnabled: false,
          telegramChatId: null,
          discordEnabled: false,
          discordWebhookUrl: null,
          emailEnabled: true,
          quietHoursEnabled: false,
          quietHoursStart: null,
          quietHoursEnd: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }
      throw error;
    }
  }

  /**
   * Update user signal preferences
   */
  async updateUserPreferences(userId: string, updates: Partial<{
    enabledMarkets: string[];
    enabledAssetClasses: string[];
    minConfidence: number;
    minClassicScore: number;
    requireMlisConfirm: boolean;
    allowedVerdicts: string[];
    telegramEnabled: boolean;
    telegramChatId: string;
    discordEnabled: boolean;
    discordWebhookUrl: string;
    emailEnabled: boolean;
    quietHoursEnabled: boolean;
    quietHoursStart: number;
    quietHoursEnd: number;
  }>) {
    try {
      return await prisma.userSignalPreferences.upsert({
        where: { userId },
        update: updates,
        create: {
          userId,
          enabledMarkets: updates.enabledMarkets || ['crypto', 'stocks', 'metals', 'bonds'],
          enabledAssetClasses: updates.enabledAssetClasses || ['crypto', 'stocks', 'metals', 'bonds'],
          minConfidence: updates.minConfidence || 70,
          minClassicScore: updates.minClassicScore || 7.0,
          requireMlisConfirm: updates.requireMlisConfirm ?? true,
          allowedVerdicts: updates.allowedVerdicts || ['GO', 'CONDITIONAL_GO'],
          telegramEnabled: updates.telegramEnabled || false,
          telegramChatId: updates.telegramChatId,
          discordEnabled: updates.discordEnabled || false,
          discordWebhookUrl: updates.discordWebhookUrl,
          emailEnabled: updates.emailEnabled ?? true,
          quietHoursEnabled: updates.quietHoursEnabled || false,
          quietHoursStart: updates.quietHoursStart,
          quietHoursEnd: updates.quietHoursEnd,
        },
      });
    } catch (error) {
      if (isTableMissing(error)) {
        logTableMissingOnce('updateUserPreferences');
        return null;
      }
      throw error;
    }
  }

  /**
   * Get users who should receive a signal
   */
  async getTargetUsers(signal: SignalData) {
    try {
      const users = await prisma.userSignalPreferences.findMany({
        where: {
          enabledMarkets: { has: signal.market },
          minConfidence: { lte: signal.overallConfidence },
          minClassicScore: { lte: signal.classicScore },
          allowedVerdicts: { has: signal.classicVerdict },
          OR: [
            { requireMlisConfirm: false },
            { requireMlisConfirm: true, AND: [{ requireMlisConfirm: signal.mlisConfirmation }] },
          ],
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              telegramChatId: true,
              discordWebhookUrl: true,
            },
          },
        },
      });

      // Filter out users in quiet hours
      const now = new Date();
      const currentHour = now.getUTCHours();

      return users.filter((prefs) => {
        if (!prefs.quietHoursEnabled) return true;
        if (prefs.quietHoursStart === null || prefs.quietHoursEnd === null) return true;

        // Check if current time is within quiet hours
        const start = prefs.quietHoursStart;
        const end = prefs.quietHoursEnd;

        if (start <= end) {
          // Normal case: e.g., 22:00 to 06:00 same day
          return currentHour < start || currentHour >= end;
        } else {
          // Wrapped case: e.g., 22:00 to 06:00 next day
          return currentHour >= end && currentHour < start;
        }
      });
    } catch (error) {
      if (isTableMissing(error)) {
        logTableMissingOnce('getTargetUsers');
        return [];
      }
      throw error;
    }
  }

  // Private helpers

  private getExpiryHours(data: SignalData): number {
    // Estimate trade type based on asset class and confidence
    // Crypto tends to be shorter timeframes, stocks/bonds longer
    if (data.assetClass === 'crypto') {
      return data.overallConfidence >= 85 ? 12 : 24; // 12-24 hours for crypto
    } else if (data.assetClass === 'stocks') {
      return 48; // 2 days for stocks
    } else {
      return 72; // 3 days for metals/bonds
    }
  }

  private async cacheSignal(signalId: string, signal: any) {
    if (redis) {
      await redis.setex(
        `${CACHE_KEY_PREFIX}${signalId}`,
        CACHE_TTL,
        JSON.stringify(signal)
      );
    }
  }

  private async invalidateCache(signalId: string) {
    if (redis) {
      await redis.del(`${CACHE_KEY_PREFIX}${signalId}`);
    }
  }
}

export const signalService = new SignalService();
