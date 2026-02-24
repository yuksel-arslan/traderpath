/**
 * Morning Briefing Service
 * Generates daily market briefings with L1-L4 Capital Flow analysis
 */

import { nanoid } from 'nanoid';
import { redis } from '../../core/cache';
import { getCapitalFlowSummary } from '../capital-flow/capital-flow.service';
import { prisma } from '../../core/database';
import type { MorningBriefing, BriefingPreferences } from './types';

const BRIEFING_CACHE_KEY = 'morning-briefing:latest';
const BRIEFING_TTL = 3600 * 8; // 8 hours

export class MorningBriefingService {
  /**
   * Generate today's morning briefing
   */
  async generateBriefing(): Promise<MorningBriefing> {
    console.log('[MorningBriefing] Generating briefing...');

    try {
      // Get Capital Flow summary (L1-L4)
      const capitalFlow = await getCapitalFlowSummary();

      // Get top assets from coin score cache
      const topCoins = await this.getTopAssets();

      // Detect risk alerts
      const riskAlerts = this.detectRiskAlerts(capitalFlow);

      // Generate opportunities
      const opportunities = this.generateOpportunities(capitalFlow);

      const briefing: MorningBriefing = {
        id: nanoid(),
        date: new Date().toISOString().split('T')[0],
        generatedAt: new Date(),

        globalLiquidityStatus: {
          bias: capitalFlow.liquidityBias,
          fedBalanceSheet: capitalFlow.globalLiquidity.fedBalanceSheet.value,
          m2Growth: capitalFlow.globalLiquidity.m2MoneySupply.yoyGrowth,
          dxyLevel: capitalFlow.globalLiquidity.dxy.value,
          vixLevel: capitalFlow.globalLiquidity.vix.value,
          verdict: this.generateL1Verdict(capitalFlow),
        },

        marketBias: {
          primary: capitalFlow.recommendation.primaryMarket as 'crypto' | 'stocks' | 'bonds' | 'metals',
          flow7d: this.getMarketFlow(capitalFlow, capitalFlow.recommendation.primaryMarket, '7d'),
          flow30d: this.getMarketFlow(capitalFlow, capitalFlow.recommendation.primaryMarket, '30d'),
          phase: this.getMarketPhase(capitalFlow, capitalFlow.recommendation.primaryMarket),
          recommendation: this.generateL2Recommendation(capitalFlow),
        },

        topAssets: topCoins,

        riskAlerts,

        opportunities,
      };

      // Cache the briefing
      await this.cacheBriefing(briefing);

      console.log('[MorningBriefing] Briefing generated successfully');
      return briefing;
    } catch (error) {
      console.error('[MorningBriefing] Generation failed:', error);
      throw error;
    }
  }

  /**
   * Get cached briefing (avoids regenerating multiple times)
   */
  async getCachedBriefing(): Promise<MorningBriefing | null> {
    try {
      const cached = await redis?.get(BRIEFING_CACHE_KEY);
      if (cached) {
        return JSON.parse(cached);
      }
      return null;
    } catch (error) {
      console.error('[MorningBriefing] Cache read failed:', error);
      return null;
    }
  }

  /**
   * Get or generate today's briefing
   */
  async getTodaysBriefing(): Promise<MorningBriefing> {
    const cached = await this.getCachedBriefing();
    if (cached && cached.date === new Date().toISOString().split('T')[0]) {
      return cached;
    }
    return this.generateBriefing();
  }

  /**
   * Cache briefing in Redis
   */
  private async cacheBriefing(briefing: MorningBriefing): Promise<void> {
    try {
      await redis?.set(BRIEFING_CACHE_KEY, JSON.stringify(briefing), 'EX', BRIEFING_TTL);
    } catch (error) {
      console.error('[MorningBriefing] Cache write failed:', error);
    }
  }

  /**
   * Get top assets from coin score cache
   */
  private async getTopAssets(): Promise<MorningBriefing['topAssets']> {
    try {
      const cacheEntry = await prisma.coinScoreCache.findFirst({
        orderBy: { updatedAt: 'desc' },
      });

      if (!cacheEntry?.coins) {
        return this.getFallbackTopAssets();
      }

      const coins = JSON.parse(cacheEntry.coins as any);
      return coins.slice(0, 3).map((coin: any) => ({
        symbol: coin.symbol,
        name: coin.name || coin.symbol,
        direction: coin.direction?.toLowerCase() || 'long',
        score: coin.totalScore || 0,
        reason: this.generateAssetReason(coin),
      }));
    } catch (error) {
      console.error('[MorningBriefing] Failed to fetch top assets:', error);
      return this.getFallbackTopAssets();
    }
  }

  /**
   * Fallback top assets if cache unavailable
   */
  private getFallbackTopAssets(): MorningBriefing['topAssets'] {
    return [
      {
        symbol: 'BTC/USDT',
        name: 'Bitcoin',
        direction: 'long',
        score: 8.5,
        reason: 'Strong momentum continuation',
      },
      {
        symbol: 'ETH/USDT',
        name: 'Ethereum',
        direction: 'long',
        score: 8.2,
        reason: 'Accumulation phase breakout',
      },
      {
        symbol: 'SOL/USDT',
        name: 'Solana',
        direction: 'long',
        score: 7.8,
        reason: 'High volume momentum',
      },
    ];
  }

  /**
   * Generate asset reason from coin data
   */
  private generateAssetReason(coin: any): string {
    const score = coin.totalScore || 0;
    const phase = coin.phase || 'mid';

    if (score >= 8.5) return 'Strong bullish breakout setup';
    if (score >= 8.0) return 'Accumulation phase with momentum';
    if (score >= 7.5) return 'High probability setup';
    if (phase === 'early') return 'Early phase opportunity';
    return 'Moderate setup quality';
  }

  /**
   * Detect risk alerts from Capital Flow
   */
  private detectRiskAlerts(capitalFlow: any): MorningBriefing['riskAlerts'] {
    const alerts: MorningBriefing['riskAlerts'] = [];

    // VIX alert (fear index)
    if (capitalFlow.globalLiquidity.vix.current > 25) {
      alerts.push({
        severity: 'high',
        message: `VIX elevated at ${capitalFlow.globalLiquidity.vix.current.toFixed(1)} - Heightened market volatility`,
      });
    }

    // DXY alert (USD strength)
    if (capitalFlow.globalLiquidity.dxy.current > 105) {
      alerts.push({
        severity: 'medium',
        message: `Dollar strength at ${capitalFlow.globalLiquidity.dxy.current.toFixed(2)} - Risk asset headwinds`,
      });
    }

    // Yield curve alert
    if (capitalFlow.globalLiquidity.yieldCurve.spread10y2y < 0) {
      alerts.push({
        severity: 'medium',
        message: 'Inverted yield curve - Recession risk elevated',
      });
    }

    // Exit phase alert
    const exitPhaseMarkets = capitalFlow.markets.filter((m: any) => m.phase === 'exit');
    if (exitPhaseMarkets.length > 0) {
      alerts.push({
        severity: 'low',
        message: `${exitPhaseMarkets.map((m: any) => m.market).join(', ')} in EXIT phase - Avoid new entries`,
      });
    }

    // Risk-off environment
    if (capitalFlow.liquidityBias === 'risk_off') {
      alerts.push({
        severity: 'high',
        message: 'RISK-OFF environment - Capital flowing to safe havens',
      });
    }

    return alerts;
  }

  /**
   * Generate trading opportunities from Capital Flow
   */
  private generateOpportunities(capitalFlow: any): MorningBriefing['opportunities'] {
    const opportunities: MorningBriefing['opportunities'] = [];

    // Primary market opportunity
    if (capitalFlow.recommendation.action === 'analyze') {
      opportunities.push({
        title: `${capitalFlow.recommendation.primaryMarket.toUpperCase()} Opportunity`,
        description: capitalFlow.recommendation.reason,
        market: capitalFlow.recommendation.primaryMarket,
        confidence: capitalFlow.recommendation.confidence,
      });
    }

    // Sector opportunities
    const primaryMarket = capitalFlow.markets.find(
      (m: any) => m.market === capitalFlow.recommendation.primaryMarket
    );

    if (primaryMarket?.sectors) {
      const topSectors = primaryMarket.sectors
        .filter((s: any) => s.strength === 'strong')
        .slice(0, 2);

      topSectors.forEach((sector: any) => {
        opportunities.push({
          title: `${sector.name} Sector`,
          description: `${sector.flow7d > 0 ? 'Inflow' : 'Outflow'}: ${Math.abs(sector.flow7d).toFixed(1)}% (7D)`,
          market: primaryMarket.market,
          confidence: 75,
        });
      });
    }

    return opportunities;
  }

  /**
   * Generate L1 Global Liquidity verdict
   */
  private generateL1Verdict(capitalFlow: any): string {
    const bias = capitalFlow.liquidityBias;
    const netLiquidity = capitalFlow.globalLiquidity.netLiquidity;

    if (bias === 'risk_on' && netLiquidity.change7d > 0) {
      return 'Liquidity expanding, favorable risk-on environment for growth assets.';
    }

    if (bias === 'risk_off') {
      return 'Risk-off environment. Capital flowing to safe havens (Bonds, Gold).';
    }

    return 'Neutral liquidity environment. Monitor for directional catalyst.';
  }

  /**
   * Generate L2 Market recommendation
   */
  private generateL2Recommendation(capitalFlow: any): string {
    const primary = capitalFlow.recommendation.primaryMarket;
    const phase = this.getMarketPhase(capitalFlow, primary);
    const flow7d = this.getMarketFlow(capitalFlow, primary, '7d');

    if (flow7d > 5) {
      return `Focus on ${primary.toUpperCase()} - Strong capital inflow (${flow7d.toFixed(1)}% 7D).`;
    }

    if (phase === 'early') {
      return `${primary.toUpperCase()} in EARLY phase - Optimal entry window.`;
    }

    return `${primary.toUpperCase()} recommended. Phase: ${phase.toUpperCase()}.`;
  }

  /**
   * Get market flow percentage
   */
  private getMarketFlow(capitalFlow: any, market: string, period: '7d' | '30d'): number {
    const marketData = capitalFlow.markets.find((m: any) => m.market === market);
    return period === '7d' ? marketData?.flow7d || 0 : marketData?.flow30d || 0;
  }

  /**
   * Get market phase
   */
  private getMarketPhase(capitalFlow: any, market: string): 'early' | 'mid' | 'late' | 'exit' {
    const marketData = capitalFlow.markets.find((m: any) => m.market === market);
    return marketData?.phase || 'mid';
  }

  /**
   * Get user briefing preferences
   */
  async getUserPreferences(userId: string): Promise<BriefingPreferences | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          telegramChatId: true,
          discordWebhookUrl: true,
        },
      });

      if (!user) return null;

      // For now, return default preferences (can be stored in DB later)
      return {
        userId: user.id,
        enabled: true,
        deliveryTime: '08:00',
        channels: ['email'],
        includePersonalStats: false,
        markets: ['crypto', 'stocks', 'metals', 'bonds'],
      };
    } catch (error) {
      console.error('[MorningBriefing] Failed to get user preferences:', error);
      return null;
    }
  }
}

export const morningBriefingService = new MorningBriefingService();
