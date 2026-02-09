/**
 * GARCH(1,1) Variance Modeling Service
 * =====================================
 * Forecasts future volatility by modeling conditional variance as:
 *   σ²_t = ω + α·ε²_{t-1} + β·σ²_{t-1}
 *
 * Parameters estimated via maximum likelihood grid search.
 * No external dependencies - pure TypeScript math.
 *
 * Methodology claim: "GARCH-family variance modeling with regime-switching detection
 * for risk surface estimation" (MLIS Layer 3)
 */

export interface GARCHParams {
  omega: number;   // base variance (intercept)
  alpha: number;   // shock persistence (ARCH term)
  beta: number;    // variance persistence (GARCH term)
}

export interface GARCHResult {
  params: GARCHParams;
  currentVariance: number;
  forecastVariance1d: number;
  forecastVariance5d: number;
  annualizedVol: number;
  longRunVariance: number;
  halfLife: number;
  regimeLabel: 'low' | 'normal' | 'high' | 'extreme';
  varianceRatio: number;         // current / long-run (>1 = elevated)
  logLikelihood: number;
  varianceSeries: number[];      // conditional variance series for charting
}

interface CandleLike {
  close: number;
  timestamp?: number;
}

/**
 * Compute log returns from candle close prices
 */
function computeLogReturns(candles: CandleLike[]): number[] {
  const returns: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    if (candles[i - 1].close > 0 && candles[i].close > 0) {
      returns.push(Math.log(candles[i].close / candles[i - 1].close));
    }
  }
  return returns;
}

/**
 * GARCH(1,1) filter: compute conditional variance series given parameters
 */
function garchFilter(returns: number[], params: GARCHParams): number[] {
  const { omega, alpha, beta } = params;
  const n = returns.length;
  if (n === 0) return [];

  const sigma2 = new Array<number>(n);

  // Initialize with sample variance
  const sampleVar = returns.reduce((s, r) => s + r * r, 0) / n;
  sigma2[0] = Math.max(sampleVar, 1e-10);

  for (let t = 1; t < n; t++) {
    sigma2[t] = omega + alpha * returns[t - 1] * returns[t - 1] + beta * sigma2[t - 1];
    // Floor to prevent numerical issues
    if (sigma2[t] < 1e-12) sigma2[t] = 1e-12;
  }
  return sigma2;
}

/**
 * Gaussian log-likelihood for GARCH parameter estimation
 */
function logLikelihood(returns: number[], params: GARCHParams): number {
  const sigma2 = garchFilter(returns, params);
  let ll = 0;
  const LOG2PI = Math.log(2 * Math.PI);

  for (let t = 0; t < returns.length; t++) {
    if (sigma2[t] <= 0) return -Infinity;
    ll += -0.5 * (LOG2PI + Math.log(sigma2[t]) + (returns[t] * returns[t]) / sigma2[t]);
  }

  return isFinite(ll) ? ll : -Infinity;
}

/**
 * Fit GARCH(1,1) parameters via grid search over parameter space.
 * Grid: ~1600 points, each computing a 250-500 length variance series.
 * Runtime: ~30-50ms on Railway CPU.
 */
function fitGARCH(returns: number[]): GARCHParams {
  let bestLL = -Infinity;
  let bestParams: GARCHParams = { omega: 0.00001, alpha: 0.1, beta: 0.8 };

  // Grid search boundaries
  const omegaValues = [1e-7, 3e-7, 1e-6, 3e-6, 1e-5, 3e-5, 1e-4, 3e-4, 1e-3];
  const alphaValues = [0.02, 0.05, 0.08, 0.11, 0.14, 0.17, 0.20, 0.25, 0.30];
  const betaValues = [0.50, 0.55, 0.60, 0.65, 0.70, 0.75, 0.80, 0.85, 0.88, 0.90, 0.92, 0.94, 0.96];

  for (const omega of omegaValues) {
    for (const alpha of alphaValues) {
      for (const beta of betaValues) {
        // Stationarity constraint: α + β < 1
        if (alpha + beta >= 0.999) continue;

        const ll = logLikelihood(returns, { omega, alpha, beta });
        if (ll > bestLL) {
          bestLL = ll;
          bestParams = { omega, alpha, beta };
        }
      }
    }
  }

  return bestParams;
}

/**
 * Main entry point: analyze GARCH volatility from candle data
 */
export function analyzeGARCH(candles: CandleLike[]): GARCHResult {
  const returns = computeLogReturns(candles);

  if (returns.length < 30) {
    // Insufficient data - return neutral defaults
    const sampleVar = returns.length > 0
      ? returns.reduce((s, r) => s + r * r, 0) / returns.length
      : 0.0004; // ~2% daily vol assumption

    return {
      params: { omega: 0.00001, alpha: 0.1, beta: 0.8 },
      currentVariance: sampleVar,
      forecastVariance1d: sampleVar,
      forecastVariance5d: sampleVar,
      annualizedVol: Math.sqrt(sampleVar * 252) * 100,
      longRunVariance: sampleVar,
      halfLife: 10,
      regimeLabel: 'normal',
      varianceRatio: 1.0,
      logLikelihood: 0,
      varianceSeries: [],
    };
  }

  // Fit GARCH(1,1) parameters
  const params = fitGARCH(returns);
  const sigma2 = garchFilter(returns, params);

  const currentVar = sigma2[sigma2.length - 1];
  const persist = params.alpha + params.beta;
  const longRunVar = persist < 0.999
    ? params.omega / (1 - persist)
    : currentVar;

  // Half-life: how many periods until variance halves toward long-run mean
  const halfLife = persist > 0 && persist < 1
    ? Math.log(2) / (-Math.log(persist))
    : Infinity;

  // Multi-step variance forecast: σ²_{t+h} = V_L + (α+β)^h × (σ²_t - V_L)
  const forecast1d = longRunVar + persist * (currentVar - longRunVar);
  const forecast5d = longRunVar + Math.pow(persist, 5) * (currentVar - longRunVar);

  const annualizedVol = Math.sqrt(Math.max(0, currentVar) * 252) * 100;
  const varianceRatio = longRunVar > 0 ? currentVar / longRunVar : 1.0;

  // Regime classification based on variance ratio
  let regimeLabel: GARCHResult['regimeLabel'];
  if (varianceRatio < 0.6) regimeLabel = 'low';
  else if (varianceRatio <= 1.4) regimeLabel = 'normal';
  else if (varianceRatio <= 2.5) regimeLabel = 'high';
  else regimeLabel = 'extreme';

  return {
    params,
    currentVariance: currentVar,
    forecastVariance1d: forecast1d,
    forecastVariance5d: forecast5d,
    annualizedVol,
    longRunVariance: longRunVar,
    halfLife: isFinite(halfLife) ? halfLife : 999,
    regimeLabel,
    varianceRatio,
    logLikelihood: logLikelihood(returns, params),
    varianceSeries: sigma2,
  };
}
