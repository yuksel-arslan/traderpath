/**
 * Multi-Market Analysis Routes
 *
 * Unified API for analyzing any supported market:
 * - Crypto: Full 7-Step Analysis
 * - Stocks: Technical Analysis + Fundamentals
 * - Bonds: Yield Analysis + ETF Analysis
 * - Metals: Technical Analysis + Correlation Analysis
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  fetchCandles,
  fetchMarketData,
  fetchFundamentals,
  resolve,
  detect,
  getSupportedSymbols,
  searchSymbols,
  isSymbolSupported,
  getCapabilities,
  AssetClass,
} from './providers';
import { IndicatorsService, OHLCV as IndicatorOHLCV } from './services/indicators.service';
import { isValidTimeframe, VALID_TIMEFRAMES } from './config/timeframe.enum';

// Create indicators service instance
const indicatorsService = new IndicatorsService();

// Helper type for processed indicators
interface ProcessedIndicators {
  rsi?: { current: number; signal: string };
  macd?: { macd: number; signal: number; histogram: number };
  stochastic?: { k: number; d: number };
  trend?: { direction: 'up' | 'down' | 'neutral'; strength: number };
  sma50?: number;
  sma200?: number;
  ema20?: number;
  ema50?: number;
  atr?: number;
  bollingerBands?: { upper: number; middle: number; lower: number };
  volume?: { obv: number; vwap?: number };
}

/**
 * Calculate all indicators and return in a standardized format
 */
function calculateAllIndicators(candles: IndicatorOHLCV[]): ProcessedIndicators {
  // Calculate core indicators
  const rsiResult = indicatorsService.calculateRSI(candles, 14);
  const macdResult = indicatorsService.calculateMACD(candles);
  const stochResult = indicatorsService.calculateStochastic(candles);
  const sma50Result = indicatorsService.calculateSMA(candles, 50);
  const sma200Result = indicatorsService.calculateSMA(candles, 200);
  const ema20Result = indicatorsService.calculateEMA(candles, 20);
  const ema50Result = indicatorsService.calculateEMA(candles, 50);
  const atrResult = indicatorsService.calculateATR(candles, 14);
  const bbResult = indicatorsService.calculateBollinger(candles);
  const obvResult = indicatorsService.calculateOBV(candles);

  // Determine trend direction from EMA alignment
  const currentPrice = candles[candles.length - 1]?.close || 0;
  const ema20Val = ema20Result.value || 0;
  const ema50Val = ema50Result.value || 0;
  const sma200Val = sma200Result.value || 0;

  let trendDirection: 'up' | 'down' | 'neutral' = 'neutral';
  let trendStrength = 50;

  if (currentPrice > ema20Val && ema20Val > ema50Val && ema50Val > sma200Val) {
    trendDirection = 'up';
    trendStrength = 80;
  } else if (currentPrice < ema20Val && ema20Val < ema50Val && ema50Val < sma200Val) {
    trendDirection = 'down';
    trendStrength = 20;
  } else if (currentPrice > ema50Val) {
    trendDirection = 'up';
    trendStrength = 60;
  } else if (currentPrice < ema50Val) {
    trendDirection = 'down';
    trendStrength = 40;
  }

  return {
    rsi: rsiResult.value !== null ? {
      current: rsiResult.value,
      signal: rsiResult.signal || 'neutral'
    } : undefined,
    macd: macdResult.metadata ? {
      macd: macdResult.metadata.macd || 0,
      signal: macdResult.metadata.signal || 0,
      histogram: macdResult.value || 0
    } : undefined,
    stochastic: stochResult.metadata ? {
      k: stochResult.metadata.k || 0,
      d: stochResult.metadata.d || 0
    } : undefined,
    trend: {
      direction: trendDirection,
      strength: trendStrength
    },
    sma50: sma50Result.value || undefined,
    sma200: sma200Result.value || undefined,
    ema20: ema20Result.value || undefined,
    ema50: ema50Result.value || undefined,
    atr: atrResult.value || undefined,
    bollingerBands: bbResult.metadata ? {
      upper: bbResult.metadata.upper || 0,
      middle: bbResult.metadata.middle || 0,
      lower: bbResult.metadata.lower || 0
    } : undefined,
    volume: obvResult.value !== null ? {
      obv: obvResult.value
    } : undefined
  };
}

// Types for request params/query
interface AnalyzeParams {
  symbol: string;
}

interface AnalyzeQuery {
  interval?: string;
  limit?: string;
}

interface SearchQuery {
  q: string;
  limit?: string;
}

export async function multiMarketRoutes(app: FastifyInstance) {
  /**
   * GET /api/multi-market/resolve/:symbol
   *
   * Resolve a symbol to its asset class and normalized form
   */
  app.get<{ Params: AnalyzeParams }>(
    '/resolve/:symbol',
    async (request: FastifyRequest<{ Params: AnalyzeParams }>, reply: FastifyReply) => {
      try {
        const { symbol } = request.params;
        const resolved = resolve(symbol);
        const capabilities = getCapabilities(symbol);

        return reply.send({
          success: true,
          data: {
            ...resolved,
            ...capabilities,
          },
        });
      } catch (error) {
        console.error('[MultiMarket] Error resolving symbol:', error);
        return reply.status(400).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to resolve symbol',
        });
      }
    }
  );

  /**
   * GET /api/multi-market/supported
   *
   * Get all supported symbols grouped by asset class
   */
  app.get('/supported', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const supported: Record<AssetClass, string[]> = {
        crypto: getSupportedSymbols('crypto'),
        stocks: getSupportedSymbols('stocks'),
        bonds: getSupportedSymbols('bonds'),
        metals: getSupportedSymbols('metals'),
        bist: getSupportedSymbols('bist'),
      };

      return reply.send({
        success: true,
        data: supported,
      });
    } catch (error) {
      console.error('[MultiMarket] Error getting supported symbols:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to get supported symbols',
      });
    }
  });

  /**
   * GET /api/multi-market/search
   *
   * Search symbols across all asset classes
   */
  app.get<{ Querystring: SearchQuery }>(
    '/search',
    async (request: FastifyRequest<{ Querystring: SearchQuery }>, reply: FastifyReply) => {
      try {
        const { q, limit = '20' } = request.query;

        if (!q || q.length < 1) {
          return reply.status(400).send({
            success: false,
            error: 'Search query required (q parameter)',
          });
        }

        const results = searchSymbols(q, parseInt(limit, 10));

        return reply.send({
          success: true,
          data: results,
        });
      } catch (error) {
        console.error('[MultiMarket] Error searching symbols:', error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to search symbols',
        });
      }
    }
  );

  /**
   * GET /api/multi-market/candles/:symbol
   *
   * Fetch OHLCV candles for any supported symbol
   */
  app.get<{ Params: AnalyzeParams; Querystring: AnalyzeQuery }>(
    '/candles/:symbol',
    async (request: FastifyRequest<{ Params: AnalyzeParams; Querystring: AnalyzeQuery }>, reply: FastifyReply) => {
      try {
        const { symbol } = request.params;
        const { interval = '1d', limit = '100' } = request.query;

        if (!isValidTimeframe(interval)) {
          return reply.status(400).send({
            success: false,
            error: `Invalid interval '${interval}'. Accepted: ${VALID_TIMEFRAMES.join(', ')}`,
          });
        }

        const { candles, resolved } = await fetchCandles(symbol, interval, parseInt(limit, 10));

        return reply.send({
          success: true,
          data: {
            symbol: resolved.displayName,
            assetClass: resolved.assetClass,
            interval,
            candles,
          },
        });
      } catch (error) {
        console.error('[MultiMarket] Error fetching candles:', error);
        return reply.status(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch candles',
        });
      }
    }
  );

  /**
   * GET /api/multi-market/quote/:symbol
   *
   * Fetch current market data for any supported symbol
   */
  app.get<{ Params: AnalyzeParams }>(
    '/quote/:symbol',
    async (request: FastifyRequest<{ Params: AnalyzeParams }>, reply: FastifyReply) => {
      try {
        const { symbol } = request.params;
        const { data, resolved } = await fetchMarketData(symbol);

        return reply.send({
          success: true,
          data: {
            ...data,
            assetClass: resolved.assetClass,
            displayName: resolved.displayName,
          },
        });
      } catch (error) {
        console.error('[MultiMarket] Error fetching quote:', error);
        return reply.status(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch quote',
        });
      }
    }
  );

  /**
   * GET /api/multi-market/fundamentals/:symbol
   *
   * Fetch fundamentals for any supported symbol
   * - Crypto: Tokenomics + Futures data
   * - Stocks: P/E, earnings, sector
   * - Bonds: Yield, duration
   * - Metals: USD correlation, ratios
   */
  app.get<{ Params: AnalyzeParams }>(
    '/fundamentals/:symbol',
    async (request: FastifyRequest<{ Params: AnalyzeParams }>, reply: FastifyReply) => {
      try {
        const { symbol } = request.params;
        const { fundamentals, resolved } = await fetchFundamentals(symbol);

        if (!fundamentals) {
          return reply.status(404).send({
            success: false,
            error: `Fundamentals not available for ${resolved.assetClass}`,
          });
        }

        return reply.send({
          success: true,
          data: fundamentals,
        });
      } catch (error) {
        console.error('[MultiMarket] Error fetching fundamentals:', error);
        return reply.status(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch fundamentals',
        });
      }
    }
  );

  /**
   * GET /api/multi-market/indicators/:symbol
   *
   * Calculate technical indicators for any supported symbol
   */
  app.get<{ Params: AnalyzeParams; Querystring: AnalyzeQuery }>(
    '/indicators/:symbol',
    async (request: FastifyRequest<{ Params: AnalyzeParams; Querystring: AnalyzeQuery }>, reply: FastifyReply) => {
      try {
        const { symbol } = request.params;
        const { interval = '1d', limit = '200' } = request.query;

        if (!isValidTimeframe(interval)) {
          return reply.status(400).send({
            success: false,
            error: `Invalid interval '${interval}'. Accepted: ${VALID_TIMEFRAMES.join(', ')}`,
          });
        }

        // Fetch candles
        const { candles, resolved } = await fetchCandles(symbol, interval, parseInt(limit, 10));

        if (candles.length < 50) {
          return reply.status(400).send({
            success: false,
            error: 'Insufficient data for indicator calculation (need at least 50 candles)',
          });
        }

        // Convert to format expected by indicators service
        const candleData: IndicatorOHLCV[] = candles.map(c => ({
          timestamp: c.timestamp,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
          volume: c.volume,
        }));

        // Calculate indicators
        const indicators = calculateAllIndicators(candleData);

        return reply.send({
          success: true,
          data: {
            symbol: resolved.displayName,
            assetClass: resolved.assetClass,
            interval,
            candleCount: candles.length,
            indicators,
          },
        });
      } catch (error) {
        console.error('[MultiMarket] Error calculating indicators:', error);
        return reply.status(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to calculate indicators',
        });
      }
    }
  );

  /**
   * POST /api/multi-market/analyze/:symbol
   *
   * Run full technical analysis for any supported symbol
   * Returns: indicators, trend, support/resistance, signals
   */
  app.post<{ Params: AnalyzeParams; Querystring: AnalyzeQuery }>(
    '/analyze/:symbol',
    { preHandler: [app.authenticate] },
    async (request: FastifyRequest<{ Params: AnalyzeParams; Querystring: AnalyzeQuery }>, reply: FastifyReply) => {
      try {
        const { symbol } = request.params;
        const { interval = '4h', limit = '200' } = request.query;
        const resolved = resolve(symbol);

        if (!isValidTimeframe(interval)) {
          return reply.status(400).send({
            success: false,
            error: `Invalid interval '${interval}'. Accepted: ${VALID_TIMEFRAMES.join(', ')}`,
          });
        }

        // Check if symbol is supported
        if (!isSymbolSupported(symbol)) {
          return reply.status(400).send({
            success: false,
            error: `Symbol ${symbol} is not supported`,
          });
        }

        // Fetch candles
        const { candles } = await fetchCandles(symbol, interval, parseInt(limit, 10));

        if (candles.length < 50) {
          return reply.status(400).send({
            success: false,
            error: 'Insufficient data for analysis',
          });
        }

        // Convert candles to indicator format
        const candleData: IndicatorOHLCV[] = candles.map(c => ({
          timestamp: c.timestamp,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
          volume: c.volume,
        }));

        // Calculate indicators
        const indicators = calculateAllIndicators(candleData);

        // Fetch fundamentals if available
        const { fundamentals } = await fetchFundamentals(symbol);

        // Fetch market data
        const { data: marketData } = await fetchMarketData(symbol);

        // Generate analysis summary
        const analysis = generateAnalysisSummary(resolved.assetClass, indicators, fundamentals, marketData);

        return reply.send({
          success: true,
          data: {
            symbol: resolved.displayName,
            assetClass: resolved.assetClass,
            interval,
            price: marketData.price,
            change24h: marketData.changePercent24h,
            analysis,
            indicators: {
              trend: indicators.trend,
              momentum: {
                rsi: indicators.rsi?.current,
                macd: indicators.macd,
                stochastic: indicators.stochastic,
              },
              volatility: {
                atr: indicators.atr,
                bollingerBands: indicators.bollingerBands,
              },
              volume: indicators.volume,
            },
            fundamentals,
            timestamp: new Date(),
          },
        });
      } catch (error) {
        console.error('[MultiMarket] Error analyzing symbol:', error);
        return reply.status(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to analyze symbol',
        });
      }
    }
  );

  /**
   * GET /api/multi-market/top/:assetClass
   *
   * Get top performing assets in an asset class
   */
  app.get<{ Params: { assetClass: string }; Querystring: { limit?: string } }>(
    '/top/:assetClass',
    async (request: FastifyRequest<{ Params: { assetClass: string }; Querystring: { limit?: string } }>, reply: FastifyReply) => {
      try {
        const { assetClass } = request.params;
        const { limit = '10' } = request.query;

        if (!['crypto', 'stocks', 'bonds', 'metals'].includes(assetClass)) {
          return reply.status(400).send({
            success: false,
            error: 'Invalid asset class. Must be: crypto, stocks, bonds, or metals',
          });
        }

        const symbols = getSupportedSymbols(assetClass as AssetClass).slice(0, parseInt(limit, 10));

        // Fetch market data for each symbol in parallel
        const results = await Promise.allSettled(
          symbols.map(async (symbol) => {
            const { data, resolved } = await fetchMarketData(symbol);
            return {
              symbol: resolved.displayName,
              normalized: resolved.normalized,
              price: data.price,
              change24h: data.changePercent24h,
              volume24h: data.volume24h,
            };
          })
        );

        const assets = results
          .filter((r): r is PromiseFulfilledResult<{
            symbol: string;
            normalized: string;
            price: number;
            change24h: number;
            volume24h: number;
          }> => r.status === 'fulfilled')
          .map(r => r.value)
          .sort((a, b) => b.change24h - a.change24h); // Sort by performance

        return reply.send({
          success: true,
          data: {
            assetClass,
            assets,
            timestamp: new Date(),
          },
        });
      } catch (error) {
        console.error('[MultiMarket] Error fetching top assets:', error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to fetch top assets',
        });
      }
    }
  );
}

/**
 * Generate analysis summary based on indicators and fundamentals
 */
function generateAnalysisSummary(
  assetClass: AssetClass,
  indicators: ReturnType<typeof calculateAllIndicators>,
  fundamentals: Awaited<ReturnType<typeof fetchFundamentals>>['fundamentals'],
  marketData: Awaited<ReturnType<typeof fetchMarketData>>['data']
) {
  // Count bullish/bearish signals
  let bullishSignals = 0;
  let bearishSignals = 0;

  // RSI
  if (indicators.rsi?.current) {
    if (indicators.rsi.current < 30) bullishSignals += 2; // Oversold
    else if (indicators.rsi.current > 70) bearishSignals += 2; // Overbought
    else if (indicators.rsi.current < 50) bearishSignals += 1;
    else bullishSignals += 1;
  }

  // MACD
  if (indicators.macd) {
    if (indicators.macd.histogram > 0 && indicators.macd.signal < indicators.macd.macd) {
      bullishSignals += 2;
    } else if (indicators.macd.histogram < 0 && indicators.macd.signal > indicators.macd.macd) {
      bearishSignals += 2;
    }
  }

  // Trend
  if (indicators.trend?.direction === 'up') bullishSignals += 2;
  else if (indicators.trend?.direction === 'down') bearishSignals += 2;

  // Price vs Moving Averages
  const currentPrice = marketData.price;
  if (indicators.sma50 && currentPrice > indicators.sma50) bullishSignals += 1;
  else if (indicators.sma50) bearishSignals += 1;

  if (indicators.sma200 && currentPrice > indicators.sma200) bullishSignals += 1;
  else if (indicators.sma200) bearishSignals += 1;

  // Calculate overall score (0-100)
  const totalSignals = bullishSignals + bearishSignals;
  const score = totalSignals > 0 ? Math.round((bullishSignals / totalSignals) * 100) : 50;

  // Determine verdict
  let verdict: 'GO' | 'CONDITIONAL_GO' | 'WAIT' | 'AVOID';
  let direction: 'LONG' | 'SHORT' | 'NEUTRAL';

  if (score >= 70) {
    verdict = 'GO';
    direction = 'LONG';
  } else if (score >= 55) {
    verdict = 'CONDITIONAL_GO';
    direction = 'LONG';
  } else if (score >= 45) {
    verdict = 'WAIT';
    direction = 'NEUTRAL';
  } else if (score >= 30) {
    verdict = 'CONDITIONAL_GO';
    direction = 'SHORT';
  } else {
    verdict = 'AVOID';
    direction = 'SHORT';
  }

  // Asset class specific adjustments
  let assetSpecificNotes: string[] = [];

  if (assetClass === 'stocks' && fundamentals && 'peRatio' in fundamentals) {
    const stockFund = fundamentals;
    if (stockFund.peRatio && stockFund.peRatio < 15) {
      assetSpecificNotes.push('P/E ratio indicates value');
      bullishSignals += 1;
    } else if (stockFund.peRatio && stockFund.peRatio > 30) {
      assetSpecificNotes.push('High P/E ratio - potentially overvalued');
      bearishSignals += 1;
    }
    if (stockFund.analystRating === 'strong_buy' || stockFund.analystRating === 'buy') {
      assetSpecificNotes.push(`Analyst rating: ${stockFund.analystRating}`);
    }
  }

  if (assetClass === 'bonds' && fundamentals && 'yield' in fundamentals) {
    const bondFund = fundamentals;
    if (bondFund.yieldCurveSpread !== undefined) {
      if (bondFund.yieldCurveSpread < 0) {
        assetSpecificNotes.push('Inverted yield curve - recession signal');
      } else if (bondFund.yieldCurveSpread > 1) {
        assetSpecificNotes.push('Steep yield curve - growth signal');
      }
    }
  }

  if (assetClass === 'metals' && fundamentals && 'usdCorrelation' in fundamentals) {
    const metalFund = fundamentals;
    if (metalFund.usdCorrelation !== undefined && metalFund.usdCorrelation < -0.5) {
      assetSpecificNotes.push('Strong inverse USD correlation');
    }
    if (metalFund.goldSilverRatio !== undefined) {
      assetSpecificNotes.push(`Gold/Silver ratio: ${metalFund.goldSilverRatio.toFixed(1)}`);
    }
  }

  return {
    score,
    verdict,
    direction,
    bullishSignals,
    bearishSignals,
    confidence: Math.abs(score - 50) * 2, // 0-100 confidence based on signal strength
    assetSpecificNotes,
    summary: generateSummaryText(verdict, direction, score, assetClass),
  };
}

function generateSummaryText(
  verdict: string,
  direction: string,
  score: number,
  assetClass: AssetClass
): string {
  const assetName = {
    crypto: 'cryptocurrency',
    stocks: 'stock',
    bonds: 'bond',
    metals: 'precious metal',
  }[assetClass];

  if (verdict === 'GO') {
    return `Strong ${direction.toLowerCase()} signal for this ${assetName}. Technical indicators align with ${score}% bullish bias.`;
  } else if (verdict === 'CONDITIONAL_GO') {
    return `Conditional ${direction.toLowerCase()} opportunity. Consider entering with proper risk management.`;
  } else if (verdict === 'WAIT') {
    return `Mixed signals for this ${assetName}. Wait for clearer trend confirmation.`;
  } else {
    return `Avoid this ${assetName} currently. Technical indicators show weakness.`;
  }
}
