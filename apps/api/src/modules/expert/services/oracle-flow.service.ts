/**
 * ORACLE On-Chain Flow Service
 * ==============================
 * Provides quantitative exchange flow and stablecoin metrics for the ORACLE AI Expert:
 *   1. Exchange netflow estimation (from Binance trade data patterns)
 *   2. Stablecoin supply dynamics (USDT, USDC market cap from public APIs)
 *   3. Whale transaction detection (large trade clustering)
 *   4. Accumulation/Distribution scoring
 *
 * Uses publicly available data (Binance trades, CoinGecko) — no proprietary
 * on-chain data feeds required.
 *
 * Methodology claim: "Whale movements, exchange netflows, stablecoin dynamics"
 */

export interface OracleFlowMetrics {
  /** Estimated exchange netflow direction */
  netflowDirection: 'inflow' | 'outflow' | 'neutral';
  /** Netflow magnitude score (0-100, 0=strong outflow, 100=strong inflow) */
  netflowScore: number;
  /** Whale trade count in recent period (trades > adaptive threshold) */
  whaleTradeCount: number;
  /** Whale buy/sell ratio (>0.5 = net buying) */
  whaleBuySellRatio: number;
  /** Stablecoin metrics */
  stablecoin: {
    /** Total stablecoin market cap (USDT + USDC) in billions */
    totalMarketCapB: number;
    /** 7-day change in stablecoin supply (%) */
    supplyChange7d: number;
    /** Supply trend: 'expanding' | 'contracting' | 'stable' */
    trend: 'expanding' | 'contracting' | 'stable';
  };
  /** Accumulation/Distribution phase */
  accDistPhase: 'accumulation' | 'distribution' | 'markup' | 'markdown' | 'neutral';
  /** Overall flow confidence (0-100) */
  confidence: number;
}

interface CandleLike {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Estimate exchange netflow from OHLCV patterns.
 *
 * Exchange inflow indicators:
 *   - High volume + price decline (selling on exchange)
 *   - Volume spikes with small bodies (market orders hitting limits)
 *
 * Exchange outflow indicators:
 *   - Declining volume + price stability (coins leaving exchange)
 *   - Low-volume accumulation candles
 *
 * This is an estimation based on publicly available OHLCV data.
 * For precise netflow, on-chain data (Glassnode, CryptoQuant) would be needed.
 */
function estimateNetflow(candles: CandleLike[]): { direction: 'inflow' | 'outflow' | 'neutral'; score: number } {
  if (candles.length < 20) {
    return { direction: 'neutral', score: 50 };
  }

  const recent = candles.slice(-20);
  const avgVolume = recent.reduce((s, c) => s + c.volume, 0) / recent.length;

  let inflowSignals = 0;
  let outflowSignals = 0;

  for (let i = 1; i < recent.length; i++) {
    const c = recent[i];
    const prev = recent[i - 1];
    const range = c.high - c.low;
    const body = Math.abs(c.close - c.open);
    const bodyRatio = range > 0 ? body / range : 0.5;
    const volRatio = avgVolume > 0 ? c.volume / avgVolume : 1;

    // Inflow signals: High volume selling (coins arriving at exchange to sell)
    if (c.close < c.open && volRatio > 1.5) {
      inflowSignals += volRatio * 0.5;
    }
    // Small body + high volume = market orders filling (potential inflow dump)
    if (bodyRatio < 0.3 && volRatio > 2) {
      inflowSignals += 0.5;
    }

    // Outflow signals: Low-volume recovery (coins leaving exchange)
    if (c.close > c.open && volRatio < 0.7) {
      outflowSignals += (1 - volRatio) * 0.5;
    }
    // Steady accumulation: rising price, moderate volume, consistent bodies
    if (c.close > prev.close && volRatio > 0.8 && volRatio < 1.5 && bodyRatio > 0.5) {
      outflowSignals += 0.3;
    }
  }

  const total = inflowSignals + outflowSignals;
  if (total < 1) return { direction: 'neutral', score: 50 };

  const netflowRatio = inflowSignals / total; // 0 = all outflow, 1 = all inflow
  const score = Math.round(netflowRatio * 100);

  let direction: 'inflow' | 'outflow' | 'neutral';
  if (netflowRatio > 0.6) direction = 'inflow';
  else if (netflowRatio < 0.4) direction = 'outflow';
  else direction = 'neutral';

  return { direction, score };
}

/**
 * Detect whale trades using adaptive volume threshold.
 * Whale trade = candle with volume > 95th percentile of all candle volumes.
 */
function detectWhaleTrades(candles: CandleLike[]): { count: number; buySellRatio: number } {
  if (candles.length < 20) {
    return { count: 0, buySellRatio: 0.5 };
  }

  const volumes = candles.map(c => c.volume).filter(v => v > 0);
  if (volumes.length === 0) return { count: 0, buySellRatio: 0.5 };

  const sorted = [...volumes].sort((a, b) => a - b);
  const p95 = sorted[Math.floor(sorted.length * 0.95)];

  const recent = candles.slice(-50);
  let whaleCount = 0;
  let whaleBuys = 0;
  let whaleSells = 0;

  for (const c of recent) {
    if (c.volume >= p95) {
      whaleCount++;
      if (c.close >= c.open) {
        whaleBuys++;
      } else {
        whaleSells++;
      }
    }
  }

  const total = whaleBuys + whaleSells;
  const buySellRatio = total > 0 ? whaleBuys / total : 0.5;

  return { count: whaleCount, buySellRatio };
}

/**
 * Detect Wyckoff accumulation/distribution phase.
 *
 * Accumulation: Price flat/declining + volume declining + occasional volume spikes
 * Markup: Price rising + increasing volume
 * Distribution: Price flat/rising + volume declining + occasional spikes
 * Markdown: Price declining + volume increasing
 */
function detectAccDistPhase(candles: CandleLike[]): OracleFlowMetrics['accDistPhase'] {
  if (candles.length < 30) return 'neutral';

  const first = candles.slice(0, Math.floor(candles.length / 2));
  const second = candles.slice(Math.floor(candles.length / 2));

  const firstAvgPrice = first.reduce((s, c) => s + c.close, 0) / first.length;
  const secondAvgPrice = second.reduce((s, c) => s + c.close, 0) / second.length;
  const priceChange = (secondAvgPrice - firstAvgPrice) / firstAvgPrice;

  const firstAvgVol = first.reduce((s, c) => s + c.volume, 0) / first.length;
  const secondAvgVol = second.reduce((s, c) => s + c.volume, 0) / second.length;
  const volChange = firstAvgVol > 0 ? (secondAvgVol - firstAvgVol) / firstAvgVol : 0;

  if (priceChange > 0.03 && volChange > 0.1) return 'markup';
  if (priceChange < -0.03 && volChange > 0.1) return 'markdown';
  if (Math.abs(priceChange) < 0.03 && volChange < -0.1) return 'accumulation';
  if (priceChange > 0.01 && volChange < -0.1) return 'distribution';

  return 'neutral';
}

/**
 * Fetch stablecoin supply data from CoinGecko (public, no API key needed).
 * Returns total USDT + USDC market cap and recent change.
 */
async function fetchStablecoinData(): Promise<OracleFlowMetrics['stablecoin']> {
  const defaultData = {
    totalMarketCapB: 0,
    supplyChange7d: 0,
    trend: 'stable' as const,
  };

  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=tether,usd-coin&vs_currencies=usd&include_market_cap=true&include_24hr_change=true',
      { signal: AbortSignal.timeout(5000) }
    );

    if (!response.ok) return defaultData;

    const data = await response.json();

    const usdtMcap = data?.tether?.usd_market_cap || 0;
    const usdcMcap = data?.['usd-coin']?.usd_market_cap || 0;
    const totalMcapB = (usdtMcap + usdcMcap) / 1e9;

    // Approximate 7d change from 24h change (rough estimate)
    const usdt24h = data?.tether?.usd_24h_change || 0;
    const usdc24h = data?.['usd-coin']?.usd_24h_change || 0;
    const avg24hChange = (usdt24h + usdc24h) / 2;
    const approx7dChange = avg24hChange * 3; // rough 7d extrapolation

    let trend: 'expanding' | 'contracting' | 'stable';
    if (approx7dChange > 0.5) trend = 'expanding';
    else if (approx7dChange < -0.5) trend = 'contracting';
    else trend = 'stable';

    return {
      totalMarketCapB: Math.round(totalMcapB * 10) / 10,
      supplyChange7d: Math.round(approx7dChange * 100) / 100,
      trend,
    };
  } catch {
    return defaultData;
  }
}

/**
 * Calculate ORACLE flow metrics for an asset.
 *
 * @param candles - OHLCV candle data
 * @param includStablecoinData - Whether to fetch live stablecoin data (adds ~1s latency)
 * @returns OracleFlowMetrics
 */
export async function calculateOracleFlowMetrics(
  candles: CandleLike[],
  includeStablecoinData: boolean = true
): Promise<OracleFlowMetrics> {
  const defaultMetrics: OracleFlowMetrics = {
    netflowDirection: 'neutral',
    netflowScore: 50,
    whaleTradeCount: 0,
    whaleBuySellRatio: 0.5,
    stablecoin: { totalMarketCapB: 0, supplyChange7d: 0, trend: 'stable' },
    accDistPhase: 'neutral',
    confidence: 30,
  };

  if (candles.length < 20) return defaultMetrics;

  // Run analyses
  const { direction: netflowDirection, score: netflowScore } = estimateNetflow(candles);
  const { count: whaleTradeCount, buySellRatio: whaleBuySellRatio } = detectWhaleTrades(candles);
  const accDistPhase = detectAccDistPhase(candles);

  // Fetch stablecoin data in parallel (non-blocking)
  const stablecoin = includeStablecoinData
    ? await fetchStablecoinData()
    : { totalMarketCapB: 0, supplyChange7d: 0, trend: 'stable' as const };

  // Calculate confidence based on data quality
  let confidence = 40;
  if (candles.length >= 100) confidence += 15;
  if (candles.length >= 200) confidence += 10;
  if (whaleTradeCount > 3) confidence += 10;
  if (stablecoin.totalMarketCapB > 0) confidence += 10;
  confidence = Math.min(85, confidence);

  return {
    netflowDirection,
    netflowScore,
    whaleTradeCount,
    whaleBuySellRatio: Math.round(whaleBuySellRatio * 100) / 100,
    stablecoin,
    accDistPhase,
    confidence,
  };
}
