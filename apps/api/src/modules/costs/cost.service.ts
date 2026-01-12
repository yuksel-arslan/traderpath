// ===========================================
// Cost Tracking Service
// Tracks API costs and manages dynamic pricing
// ===========================================

import { prisma } from '../../core/database';
import { Decimal } from '@prisma/client/runtime/library';

// Gemini 2.0 Flash pricing (as of Dec 2024)
const GEMINI_PRICING = {
  inputPer1MTokens: 0.075,  // $0.075 per 1M input tokens
  outputPer1MTokens: 0.30,  // $0.30 per 1M output tokens
  avgInputTokensPerPrompt: 500,
  avgOutputTokensPerResponse: 300,
};

// Credit costs per operation (from @tradepath/types)
const CREDIT_COSTS = {
  STEP_MARKET_PULSE: 0,
  STEP_ASSET_SCANNER: 2,
  STEP_SAFETY_CHECK: 5,
  STEP_TIMING: 3,
  STEP_TRADE_PLAN: 5,
  STEP_TRAP_CHECK: 5,
  BUNDLE_FULL_ANALYSIS: 25,
};

interface CostLogInput {
  service: 'gemini' | 'binance' | 'coingecko' | 'internal';
  operation: string;
  inputTokens?: number;
  outputTokens?: number;
  costUsd: number;
  userId?: string;
  symbol?: string;
  durationMs?: number;
  metadata?: Record<string, unknown>;
}

interface CostAnalytics {
  period: string;
  totalCost: number;
  totalRevenue: number;
  profit: number;
  profitMargin: number;
  operationBreakdown: Record<string, { count: number; cost: number; avgCost: number }>;
  serviceBreakdown: Record<string, { count: number; cost: number }>;
  dailyTrend: Array<{ date: string; cost: number; revenue: number }>;
}

class CostService {
  /**
   * Get or create cost settings
   */
  async getSettings() {
    let settings = await prisma.costSettings.findUnique({
      where: { id: 'default' },
    });

    if (!settings) {
      settings = await prisma.costSettings.create({
        data: { id: 'default' },
      });
    }

    return settings;
  }

  /**
   * Update cost settings
   */
  async updateSettings(data: {
    geminiInputCostPer1M?: number;
    geminiOutputCostPer1M?: number;
    targetProfitMargin?: number;
    creditPriceUsd?: number;
    minCreditPriceUsd?: number;
    maxCreditPriceUsd?: number;
    autoPricingEnabled?: boolean;
    autoPricingInterval?: number;
  }) {
    return prisma.costSettings.upsert({
      where: { id: 'default' },
      update: data,
      create: { id: 'default', ...data },
    });
  }

  /**
   * Log an API cost
   */
  async logCost(input: CostLogInput) {
    return prisma.apiCostLog.create({
      data: {
        service: input.service,
        operation: input.operation,
        inputTokens: input.inputTokens || 0,
        outputTokens: input.outputTokens || 0,
        costUsd: input.costUsd,
        userId: input.userId,
        symbol: input.symbol,
        durationMs: input.durationMs || 0,
        metadata: (input.metadata || {}) as object,
      },
    });
  }

  /**
   * Calculate cost for a Gemini API call
   */
  calculateGeminiCost(inputTokens: number, outputTokens: number): number {
    const inputCost = (inputTokens / 1_000_000) * GEMINI_PRICING.inputPer1MTokens;
    const outputCost = (outputTokens / 1_000_000) * GEMINI_PRICING.outputPer1MTokens;
    return inputCost + outputCost;
  }

  /**
   * Estimate cost for an operation
   */
  async estimateOperationCost(operation: string): Promise<number> {
    const settings = await this.getSettings();

    // Get average from historical data
    const avgCost = await prisma.apiCostLog.aggregate({
      where: { operation },
      _avg: { costUsd: true },
      _count: true,
    });

    if (avgCost._count > 10 && avgCost._avg.costUsd) {
      return Number(avgCost._avg.costUsd);
    }

    // Fallback to estimated costs
    const estimatedCosts: Record<string, number> = {
      'market_pulse': this.calculateGeminiCost(400, 200),
      'asset_scan': this.calculateGeminiCost(500, 250),
      'safety_check': this.calculateGeminiCost(600, 300),
      'timing': this.calculateGeminiCost(500, 250),
      'trade_plan': this.calculateGeminiCost(700, 350),
      'trap_check': this.calculateGeminiCost(500, 250),
      'analysis_full': this.calculateGeminiCost(3000, 1500),
    };

    return estimatedCosts[operation] || 0.001;
  }

  /**
   * Get cost analytics for a period
   */
  async getAnalytics(days: number = 30): Promise<CostAnalytics> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get all cost logs for the period
    const logs = await prisma.apiCostLog.findMany({
      where: { createdAt: { gte: startDate } },
      orderBy: { createdAt: 'asc' },
    });

    // Calculate totals
    const totalCost = logs.reduce((sum, log) => sum + Number(log.costUsd), 0);

    // Get credit transactions (revenue) for the period
    const creditSpends = await prisma.creditTransaction.aggregate({
      where: {
        type: 'SPEND',
        createdAt: { gte: startDate },
      },
      _sum: { amount: true },
    });

    const settings = await this.getSettings();
    const creditsSpent = Math.abs(creditSpends._sum.amount || 0);
    const totalRevenue = creditsSpent * Number(settings.creditPriceUsd);

    const profit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

    // Operation breakdown
    const operationBreakdown: Record<string, { count: number; cost: number; avgCost: number }> = {};
    logs.forEach((log) => {
      if (!operationBreakdown[log.operation]) {
        operationBreakdown[log.operation] = { count: 0, cost: 0, avgCost: 0 };
      }
      operationBreakdown[log.operation].count++;
      operationBreakdown[log.operation].cost += Number(log.costUsd);
    });
    Object.keys(operationBreakdown).forEach((op) => {
      operationBreakdown[op].avgCost = operationBreakdown[op].cost / operationBreakdown[op].count;
    });

    // Service breakdown
    const serviceBreakdown: Record<string, { count: number; cost: number }> = {};
    logs.forEach((log) => {
      if (!serviceBreakdown[log.service]) {
        serviceBreakdown[log.service] = { count: 0, cost: 0 };
      }
      serviceBreakdown[log.service].count++;
      serviceBreakdown[log.service].cost += Number(log.costUsd);
    });

    // Daily trend
    const dailyMap = new Map<string, { cost: number; revenue: number }>();
    logs.forEach((log) => {
      const date = log.createdAt.toISOString().split('T')[0];
      if (!dailyMap.has(date)) {
        dailyMap.set(date, { cost: 0, revenue: 0 });
      }
      const day = dailyMap.get(date)!;
      day.cost += Number(log.costUsd);
    });

    // Get daily credit spends for revenue
    const dailySpends = await prisma.creditTransaction.groupBy({
      by: ['createdAt'],
      where: {
        type: 'SPEND',
        createdAt: { gte: startDate },
      },
      _sum: { amount: true },
    });

    dailySpends.forEach((spend) => {
      const date = spend.createdAt.toISOString().split('T')[0];
      if (!dailyMap.has(date)) {
        dailyMap.set(date, { cost: 0, revenue: 0 });
      }
      const day = dailyMap.get(date)!;
      day.revenue = Math.abs(spend._sum.amount || 0) * Number(settings.creditPriceUsd);
    });

    const dailyTrend = Array.from(dailyMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      period: `${days} days`,
      totalCost: Math.round(totalCost * 100) / 100,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      profit: Math.round(profit * 100) / 100,
      profitMargin: Math.round(profitMargin * 10) / 10,
      operationBreakdown,
      serviceBreakdown,
      dailyTrend,
    };
  }

  /**
   * Calculate recommended credit price based on costs
   */
  async calculateRecommendedPrice(): Promise<{
    currentPrice: number;
    recommendedPrice: number;
    avgCostPerCredit: number;
    targetMargin: number;
    shouldUpdate: boolean;
    reason: string;
  }> {
    const settings = await this.getSettings();
    const analytics = await this.getAnalytics(7); // Last 7 days

    // Get total credits spent in the period
    const creditsSpent = await prisma.creditTransaction.aggregate({
      where: {
        type: 'SPEND',
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      _sum: { amount: true },
    });

    const totalCredits = Math.abs(creditsSpent._sum.amount || 1);
    const avgCostPerCredit = analytics.totalCost / totalCredits;
    const targetMargin = Number(settings.targetProfitMargin) / 100;

    // Calculate recommended price: cost / (1 - margin)
    // If margin is 50%, price should be cost / 0.5 = 2x cost
    const recommendedPrice = avgCostPerCredit / (1 - targetMargin);

    // Clamp to min/max
    const clampedPrice = Math.max(
      Number(settings.minCreditPriceUsd),
      Math.min(Number(settings.maxCreditPriceUsd), recommendedPrice)
    );

    const currentPrice = Number(settings.creditPriceUsd);
    const priceDiff = Math.abs(currentPrice - clampedPrice) / currentPrice;

    // Only recommend update if difference is > 10%
    const shouldUpdate = priceDiff > 0.1;

    let reason = '';
    if (shouldUpdate) {
      if (clampedPrice > currentPrice) {
        reason = `Costs increased. Recommend raising price by ${Math.round(priceDiff * 100)}%`;
      } else {
        reason = `Costs decreased. Can lower price by ${Math.round(priceDiff * 100)}%`;
      }
    } else {
      reason = 'Current price is within acceptable range';
    }

    return {
      currentPrice: Math.round(currentPrice * 10000) / 10000,
      recommendedPrice: Math.round(clampedPrice * 10000) / 10000,
      avgCostPerCredit: Math.round(avgCostPerCredit * 10000) / 10000,
      targetMargin: Number(settings.targetProfitMargin),
      shouldUpdate,
      reason,
    };
  }

  /**
   * Run auto-pricing if enabled and interval has passed
   */
  async runAutoPricing(): Promise<{ updated: boolean; newPrice?: number; reason: string }> {
    const settings = await this.getSettings();

    if (!settings.autoPricingEnabled) {
      return { updated: false, reason: 'Auto-pricing is disabled' };
    }

    // Check if enough time has passed
    const hoursSinceUpdate = (Date.now() - settings.lastPriceUpdate.getTime()) / (1000 * 60 * 60);
    if (hoursSinceUpdate < settings.autoPricingInterval) {
      return {
        updated: false,
        reason: `Next update in ${Math.round(settings.autoPricingInterval - hoursSinceUpdate)} hours`,
      };
    }

    const recommendation = await this.calculateRecommendedPrice();

    if (!recommendation.shouldUpdate) {
      // Update timestamp even if price doesn't change
      await prisma.costSettings.update({
        where: { id: 'default' },
        data: { lastPriceUpdate: new Date() },
      });
      return { updated: false, reason: recommendation.reason };
    }

    // Update the price
    await prisma.costSettings.update({
      where: { id: 'default' },
      data: {
        creditPriceUsd: recommendation.recommendedPrice,
        lastPriceUpdate: new Date(),
      },
    });

    // Also update credit packages
    await this.updateCreditPackagePrices(recommendation.recommendedPrice);

    return {
      updated: true,
      newPrice: recommendation.recommendedPrice,
      reason: recommendation.reason,
    };
  }

  /**
   * Update credit package prices based on new base price
   */
  async updateCreditPackagePrices(basePricePerCredit: number) {
    const packages = await prisma.creditPackage.findMany({
      where: { isActive: true },
    });

    for (const pkg of packages) {
      // Apply volume discount
      let discount = 0;
      if (pkg.credits >= 500) discount = 0.20;
      else if (pkg.credits >= 200) discount = 0.15;
      else if (pkg.credits >= 100) discount = 0.10;

      const pricePerCredit = basePricePerCredit * (1 - discount);
      const totalPrice = Math.round(pkg.credits * pricePerCredit * 100) / 100;

      await prisma.creditPackage.update({
        where: { id: pkg.id },
        data: {
          priceUsd: totalPrice,
          pricePerCredit: pricePerCredit,
          discountPercent: Math.round(discount * 100),
        },
      });
    }
  }

  /**
   * Get cost summary for display
   */
  async getCostSummary() {
    const settings = await this.getSettings();
    const analytics = await this.getAnalytics(30);
    const recommendation = await this.calculateRecommendedPrice();

    // Today's costs
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCosts = await prisma.apiCostLog.aggregate({
      where: { createdAt: { gte: today } },
      _sum: { costUsd: true },
      _count: true,
    });

    return {
      settings: {
        creditPriceUsd: Number(settings.creditPriceUsd),
        targetProfitMargin: Number(settings.targetProfitMargin),
        autoPricingEnabled: settings.autoPricingEnabled,
        autoPricingInterval: settings.autoPricingInterval,
        lastPriceUpdate: settings.lastPriceUpdate,
      },
      today: {
        cost: Number(todayCosts._sum.costUsd || 0),
        apiCalls: todayCosts._count,
      },
      monthly: analytics,
      pricing: recommendation,
    };
  }
}

export const costService = new CostService();
