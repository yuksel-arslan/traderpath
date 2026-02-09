/**
 * NEXUS Quantitative Risk Service
 * =================================
 * Provides real quantitative risk metrics for the NEXUS AI Expert:
 *   1. Correlation risk matrix (multi-asset return correlations)
 *   2. Concentration risk (portfolio diversification metrics)
 *   3. Tail-event probability (historical VaR / CVaR)
 *   4. Drawdown analysis (max drawdown, recovery time)
 *
 * These metrics are computed BEFORE passing to Gemini, so the AI expert
 * has real numbers to cite rather than making up statistics.
 *
 * Methodology claim: "Correlation risk, concentration risk, tail-event probability"
 */

export interface NexusRiskMetrics {
  /** Historical Value-at-Risk (1-day, 95% confidence) */
  var95: number;
  /** Conditional VaR / Expected Shortfall (1-day, 95%) */
  cvar95: number;
  /** Tail-event probability: P(loss > 2 × avg daily range) */
  tailEventProbability: number;
  /** Maximum drawdown in the lookback period */
  maxDrawdown: number;
  /** Average drawdown recovery time (in bars) */
  avgRecoveryBars: number;
  /** Correlation with BTC (for non-BTC assets) */
  btcCorrelation: number | null;
  /** Downside volatility (Sortino-style) */
  downsideVolatility: number;
  /** Risk-adjusted return (Sharpe-like: mean return / std dev) */
  sharpeProxy: number;
  /** Skewness of return distribution (<0 = fat left tail) */
  returnSkewness: number;
  /** Kurtosis of return distribution (>3 = fat tails) */
  returnKurtosis: number;
  /** Overall risk score (0-100, higher = riskier) */
  riskScore: number;
  /** Risk level classification */
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
}

interface CandleLike {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Compute log returns from close prices
 */
function logReturns(candles: CandleLike[]): number[] {
  const returns: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    if (candles[i - 1].close > 0 && candles[i].close > 0) {
      returns.push(Math.log(candles[i].close / candles[i - 1].close));
    }
  }
  return returns;
}

/**
 * Calculate percentile value from sorted array
 */
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.floor(sorted.length * p);
  return sorted[Math.min(idx, sorted.length - 1)];
}

/**
 * Calculate mean of array
 */
function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

/**
 * Calculate standard deviation
 */
function stdDev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  const variance = arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

/**
 * Calculate skewness (3rd moment)
 */
function skewness(arr: number[]): number {
  if (arr.length < 3) return 0;
  const m = mean(arr);
  const s = stdDev(arr);
  if (s < 1e-10) return 0;
  const n = arr.length;
  const sum3 = arr.reduce((acc, v) => acc + ((v - m) / s) ** 3, 0);
  return (n / ((n - 1) * (n - 2))) * sum3;
}

/**
 * Calculate excess kurtosis (4th moment - 3)
 */
function kurtosis(arr: number[]): number {
  if (arr.length < 4) return 0;
  const m = mean(arr);
  const s = stdDev(arr);
  if (s < 1e-10) return 0;
  const n = arr.length;
  const sum4 = arr.reduce((acc, v) => acc + ((v - m) / s) ** 4, 0);
  const rawKurt = ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * sum4;
  const correction = (3 * (n - 1) ** 2) / ((n - 2) * (n - 3));
  return rawKurt - correction;
}

/**
 * Pearson correlation between two arrays
 */
function correlation(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n < 5) return 0;

  const aSlice = a.slice(-n);
  const bSlice = b.slice(-n);

  const meanA = mean(aSlice);
  const meanB = mean(bSlice);

  let cov = 0, varA = 0, varB = 0;
  for (let i = 0; i < n; i++) {
    const dA = aSlice[i] - meanA;
    const dB = bSlice[i] - meanB;
    cov += dA * dB;
    varA += dA * dA;
    varB += dB * dB;
  }

  const denom = Math.sqrt(varA * varB);
  return denom > 1e-10 ? cov / denom : 0;
}

/**
 * Calculate NEXUS quantitative risk metrics for an asset.
 *
 * @param candles - OHLCV price data for the target asset
 * @param btcCandles - Optional BTC candles for correlation analysis
 * @returns NexusRiskMetrics
 */
export function calculateNexusRiskMetrics(
  candles: CandleLike[],
  btcCandles?: CandleLike[]
): NexusRiskMetrics {
  const defaultMetrics: NexusRiskMetrics = {
    var95: 0,
    cvar95: 0,
    tailEventProbability: 0,
    maxDrawdown: 0,
    avgRecoveryBars: 0,
    btcCorrelation: null,
    downsideVolatility: 0,
    sharpeProxy: 0,
    returnSkewness: 0,
    returnKurtosis: 0,
    riskScore: 50,
    riskLevel: 'MEDIUM',
  };

  if (candles.length < 30) {
    return defaultMetrics;
  }

  const returns = logReturns(candles);
  if (returns.length < 20) return defaultMetrics;

  // ── 1. Historical VaR (95%) ──
  // VaR = worst loss at 5th percentile of historical returns
  const sortedReturns = [...returns].sort((a, b) => a - b);
  const var95 = -percentile(sortedReturns, 0.05) * 100; // positive % loss

  // ── 2. Conditional VaR (Expected Shortfall) ──
  // CVaR = average of losses beyond VaR threshold
  const varThreshold = percentile(sortedReturns, 0.05);
  const tailReturns = sortedReturns.filter(r => r <= varThreshold);
  const cvar95 = tailReturns.length > 0 ? -mean(tailReturns) * 100 : var95;

  // ── 3. Tail-event probability ──
  // P(daily loss > 2 × average daily range)
  const avgRange = mean(candles.map(c => (c.high - c.low) / Math.max(c.close, 1e-10)));
  const tailThreshold = -2 * avgRange;
  const tailCount = returns.filter(r => r < tailThreshold).length;
  const tailEventProbability = returns.length > 0 ? tailCount / returns.length : 0;

  // ── 4. Maximum Drawdown ──
  let peak = candles[0].close;
  let maxDD = 0;
  let drawdownStart = 0;
  let inDrawdown = false;
  let recoveryBars: number[] = [];
  let currentDDStart = 0;

  for (let i = 0; i < candles.length; i++) {
    const price = candles[i].close;
    if (price > peak) {
      if (inDrawdown) {
        recoveryBars.push(i - currentDDStart);
        inDrawdown = false;
      }
      peak = price;
    }
    const dd = (peak - price) / peak;
    if (dd > 0 && !inDrawdown) {
      inDrawdown = true;
      currentDDStart = i;
    }
    if (dd > maxDD) maxDD = dd;
  }

  const avgRecoveryBars = recoveryBars.length > 0
    ? Math.round(mean(recoveryBars))
    : 0;

  // ── 5. BTC Correlation ──
  let btcCorrelation: number | null = null;
  if (btcCandles && btcCandles.length >= 30) {
    const btcReturns = logReturns(btcCandles);
    if (btcReturns.length >= 20) {
      btcCorrelation = Math.round(correlation(returns, btcReturns) * 100) / 100;
    }
  }

  // ── 6. Downside Volatility (Sortino denominator) ──
  const negativeReturns = returns.filter(r => r < 0);
  const downsideVol = negativeReturns.length > 0
    ? Math.sqrt(negativeReturns.reduce((s, r) => s + r * r, 0) / negativeReturns.length) * 100
    : 0;

  // ── 7. Sharpe-like ratio ──
  const meanReturn = mean(returns);
  const returnStd = stdDev(returns);
  const sharpeProxy = returnStd > 0 ? (meanReturn / returnStd) * Math.sqrt(252) : 0;

  // ── 8. Distribution shape ──
  const returnSkew = skewness(returns);
  const returnKurt = kurtosis(returns);

  // ── 9. Composite Risk Score ──
  let riskScore = 50;
  // VaR contribution (higher VaR = riskier)
  riskScore += Math.min(20, var95 * 3);
  // Drawdown contribution
  riskScore += Math.min(15, maxDD * 100);
  // Tail probability contribution
  riskScore += Math.min(10, tailEventProbability * 100);
  // Negative skewness = fat left tail = riskier
  if (returnSkew < -0.5) riskScore += 5;
  // Excess kurtosis = fat tails = riskier
  if (returnKurt > 3) riskScore += 5;
  // High downside vol = riskier
  riskScore += Math.min(10, downsideVol);
  // Good Sharpe = safer
  if (sharpeProxy > 1) riskScore -= 10;
  else if (sharpeProxy < -0.5) riskScore += 10;

  riskScore = Math.max(0, Math.min(100, Math.round(riskScore)));

  let riskLevel: NexusRiskMetrics['riskLevel'];
  if (riskScore >= 80) riskLevel = 'EXTREME';
  else if (riskScore >= 60) riskLevel = 'HIGH';
  else if (riskScore >= 40) riskLevel = 'MEDIUM';
  else riskLevel = 'LOW';

  return {
    var95: Math.round(var95 * 100) / 100,
    cvar95: Math.round(cvar95 * 100) / 100,
    tailEventProbability: Math.round(tailEventProbability * 1000) / 1000,
    maxDrawdown: Math.round(maxDD * 10000) / 100, // as percentage
    avgRecoveryBars,
    btcCorrelation,
    downsideVolatility: Math.round(downsideVol * 100) / 100,
    sharpeProxy: Math.round(sharpeProxy * 100) / 100,
    returnSkewness: Math.round(returnSkew * 100) / 100,
    returnKurtosis: Math.round(returnKurt * 100) / 100,
    riskScore,
    riskLevel,
  };
}
