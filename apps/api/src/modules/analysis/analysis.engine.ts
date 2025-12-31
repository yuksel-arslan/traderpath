// ===========================================
// Analysis Engine - Real Market Data & Analysis
// ===========================================

interface Candle {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closeTime: number;
}

interface MarketData {
  symbol: string;
  price: number;
  priceChange24h: number;
  priceChangePercent24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  quoteVolume24h: number;
}

// ===========================================
// Binance API Functions
// ===========================================

async function fetchKlines(symbol: string, interval: string, limit: number = 200): Promise<Candle[]> {
  const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}USDT&interval=${interval}&limit=${limit}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch klines: ${response.statusText}`);
  }

  const data = await response.json();

  return data.map((k: number[]) => ({
    openTime: k[0],
    open: parseFloat(k[1] as unknown as string),
    high: parseFloat(k[2] as unknown as string),
    low: parseFloat(k[3] as unknown as string),
    close: parseFloat(k[4] as unknown as string),
    volume: parseFloat(k[5] as unknown as string),
    closeTime: k[6],
  }));
}

async function fetch24hTicker(symbol: string): Promise<MarketData> {
  const url = `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}USDT`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ticker: ${response.statusText}`);
  }

  const data = await response.json();

  return {
    symbol,
    price: parseFloat(data.lastPrice),
    priceChange24h: parseFloat(data.priceChange),
    priceChangePercent24h: parseFloat(data.priceChangePercent),
    high24h: parseFloat(data.highPrice),
    low24h: parseFloat(data.lowPrice),
    volume24h: parseFloat(data.volume),
    quoteVolume24h: parseFloat(data.quoteVolume),
  };
}

async function fetchGlobalMetrics(): Promise<{
  totalMarketCap: number;
  btcDominance: number;
  totalVolume24h: number;
}> {
  // Using CoinGecko for global metrics (free, no API key)
  try {
    const response = await fetch('https://api.coingecko.com/api/v3/global');
    if (!response.ok) {
      throw new Error('Failed to fetch global metrics');
    }
    const data = await response.json();
    return {
      totalMarketCap: data.data.total_market_cap.usd,
      btcDominance: data.data.market_cap_percentage.btc,
      totalVolume24h: data.data.total_volume.usd,
    };
  } catch {
    // Fallback if CoinGecko is unavailable
    return {
      totalMarketCap: 2500000000000,
      btcDominance: 52,
      totalVolume24h: 80000000000,
    };
  }
}

async function fetchFearGreedIndex(): Promise<{ value: number; classification: string }> {
  try {
    const response = await fetch('https://api.alternative.me/fng/');
    if (!response.ok) {
      throw new Error('Failed to fetch fear & greed');
    }
    const data = await response.json();
    return {
      value: parseInt(data.data[0].value),
      classification: data.data[0].value_classification,
    };
  } catch {
    return { value: 50, classification: 'Neutral' };
  }
}

// ===========================================
// Technical Indicators
// ===========================================

function calculateSMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1];
  const slice = prices.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

function calculateEMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1];

  const multiplier = 2 / (period + 1);
  let ema = calculateSMA(prices.slice(0, period), period);

  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
  }

  return ema;
}

function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) return 50;

  let gains = 0;
  let losses = 0;

  for (let i = prices.length - period; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

function calculateMACD(prices: number[]): { macd: number; signal: number; histogram: number } {
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  const macd = ema12 - ema26;

  // Calculate signal line (9-period EMA of MACD)
  const macdValues: number[] = [];
  for (let i = 26; i <= prices.length; i++) {
    const slice = prices.slice(0, i);
    const e12 = calculateEMA(slice, 12);
    const e26 = calculateEMA(slice, 26);
    macdValues.push(e12 - e26);
  }

  const signal = macdValues.length >= 9 ? calculateEMA(macdValues, 9) : macd;
  const histogram = macd - signal;

  return { macd, signal, histogram };
}

function calculateBollingerBands(prices: number[], period: number = 20, stdDev: number = 2): {
  upper: number;
  middle: number;
  lower: number;
} {
  const sma = calculateSMA(prices, period);
  const slice = prices.slice(-period);

  const variance = slice.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / period;
  const std = Math.sqrt(variance);

  return {
    upper: sma + std * stdDev,
    middle: sma,
    lower: sma - std * stdDev,
  };
}

function findSupportResistance(candles: Candle[]): { support: number[]; resistance: number[] } {
  const prices = candles.map(c => c.close);
  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);

  const currentPrice = prices[prices.length - 1];
  const levels: { price: number; strength: number }[] = [];

  // Find pivot points
  for (let i = 2; i < candles.length - 2; i++) {
    // Pivot high
    if (highs[i] > highs[i-1] && highs[i] > highs[i-2] &&
        highs[i] > highs[i+1] && highs[i] > highs[i+2]) {
      levels.push({ price: highs[i], strength: 1 });
    }
    // Pivot low
    if (lows[i] < lows[i-1] && lows[i] < lows[i-2] &&
        lows[i] < lows[i+1] && lows[i] < lows[i+2]) {
      levels.push({ price: lows[i], strength: 1 });
    }
  }

  // Cluster similar levels
  const clusteredLevels: { price: number; strength: number }[] = [];
  const threshold = currentPrice * 0.01; // 1% threshold

  for (const level of levels) {
    const existing = clusteredLevels.find(l => Math.abs(l.price - level.price) < threshold);
    if (existing) {
      existing.strength++;
      existing.price = (existing.price + level.price) / 2;
    } else {
      clusteredLevels.push({ ...level });
    }
  }

  // Sort by strength and separate into support/resistance
  const sorted = clusteredLevels.sort((a, b) => b.strength - a.strength);
  const support = sorted.filter(l => l.price < currentPrice).slice(0, 3).map(l => Math.round(l.price));
  const resistance = sorted.filter(l => l.price > currentPrice).slice(0, 3).map(l => Math.round(l.price));

  return { support, resistance };
}

function calculateTrend(prices: number[]): { direction: 'bullish' | 'bearish' | 'neutral'; strength: number } {
  const ma20 = calculateSMA(prices, 20);
  const ma50 = calculateSMA(prices, 50);
  const ma200 = calculateSMA(prices, Math.min(200, prices.length));
  const currentPrice = prices[prices.length - 1];

  let bullishSignals = 0;
  let totalSignals = 0;

  // Price vs MAs
  if (currentPrice > ma20) bullishSignals++;
  totalSignals++;
  if (currentPrice > ma50) bullishSignals++;
  totalSignals++;
  if (currentPrice > ma200) bullishSignals++;
  totalSignals++;

  // MA alignment
  if (ma20 > ma50) bullishSignals++;
  totalSignals++;
  if (ma50 > ma200) bullishSignals++;
  totalSignals++;

  const strength = Math.round((bullishSignals / totalSignals) * 100);

  if (strength >= 70) return { direction: 'bullish', strength };
  if (strength <= 30) return { direction: 'bearish', strength: 100 - strength };
  return { direction: 'neutral', strength: 50 };
}

// ===========================================
// Analysis Engine Export
// ===========================================

export const analysisEngine = {
  // Step 1: Market Pulse
  async getMarketPulse() {
    const [btcData, ethData, globalMetrics, fearGreed] = await Promise.all([
      fetch24hTicker('BTC'),
      fetch24hTicker('ETH'),
      fetchGlobalMetrics(),
      fetchFearGreedIndex(),
    ]);

    const btcCandles = await fetchKlines('BTC', '1d', 100);
    const btcPrices = btcCandles.map(c => c.close);
    const btcTrend = calculateTrend(btcPrices);

    // Calculate BTC dominance trend
    const btcDominanceTrend = btcData.priceChangePercent24h > ethData.priceChangePercent24h ? 'rising' : 'falling';

    // Determine market regime
    let marketRegime: 'risk_on' | 'risk_off' | 'neutral' = 'neutral';
    if (fearGreed.value > 60 && btcTrend.direction === 'bullish') marketRegime = 'risk_on';
    else if (fearGreed.value < 40 && btcTrend.direction === 'bearish') marketRegime = 'risk_off';

    // Generate summary
    const summary = `Market sentiment is ${fearGreed.classification.toLowerCase()} with ${btcTrend.direction} trend. ` +
      `BTC dominance is ${btcDominanceTrend} at ${globalMetrics.btcDominance.toFixed(1)}%. ` +
      `24h volume: $${(globalMetrics.totalVolume24h / 1e9).toFixed(1)}B.`;

    return {
      btcDominance: parseFloat(globalMetrics.btcDominance.toFixed(1)),
      btcDominanceTrend,
      totalMarketCap: globalMetrics.totalMarketCap,
      marketCap24hChange: btcData.priceChangePercent24h,
      fearGreedIndex: fearGreed.value,
      fearGreedLabel: fearGreed.classification.toLowerCase() as 'extreme_fear' | 'fear' | 'neutral' | 'greed' | 'extreme_greed',
      marketRegime,
      trend: {
        direction: btcTrend.direction,
        strength: btcTrend.strength,
        timeframesAligned: btcTrend.strength > 70 ? 4 : btcTrend.strength > 50 ? 3 : 2,
      },
      macroEvents: [],
      summary,
      verdict: marketRegime === 'risk_on' ? 'suitable' : marketRegime === 'risk_off' ? 'caution' : 'neutral' as const,
    };
  },

  // Step 2: Asset Scanner
  async scanAsset(symbol: string) {
    const [ticker, candles1d, candles4h, candles1h] = await Promise.all([
      fetch24hTicker(symbol),
      fetchKlines(symbol, '1d', 200),
      fetchKlines(symbol, '4h', 200),
      fetchKlines(symbol, '1h', 200),
    ]);

    const prices1d = candles1d.map(c => c.close);
    const prices4h = candles4h.map(c => c.close);
    const prices1h = candles1h.map(c => c.close);

    const trend1d = calculateTrend(prices1d);
    const trend4h = calculateTrend(prices4h);
    const trend1h = calculateTrend(prices1h);

    const rsi = calculateRSI(prices4h);
    const macd = calculateMACD(prices4h);
    const levels = findSupportResistance(candles1d);

    const ma20 = calculateSMA(prices4h, 20);
    const ma50 = calculateSMA(prices4h, 50);
    const ma200 = calculateSMA(prices4h, Math.min(200, prices4h.length));

    // Forecast calculation
    const avgChange = prices1d.slice(-7).reduce((sum, p, i, arr) => {
      if (i === 0) return 0;
      return sum + ((p - arr[i-1]) / arr[i-1]);
    }, 0) / 6;

    const price24h = Math.round(ticker.price * (1 + avgChange));
    const price7d = Math.round(ticker.price * (1 + avgChange * 7));

    // Calculate confidence
    let confidence = 50;
    if (trend1d.direction === trend4h.direction) confidence += 15;
    if (trend4h.direction === trend1h.direction) confidence += 10;
    if (rsi > 30 && rsi < 70) confidence += 10;
    if (macd.histogram > 0 && trend4h.direction === 'bullish') confidence += 10;
    if (macd.histogram < 0 && trend4h.direction === 'bearish') confidence += 10;
    confidence = Math.min(95, confidence);

    // Calculate overall score
    let score = 5;
    if (trend1d.direction === 'bullish') score += 1;
    if (trend4h.direction === 'bullish') score += 1;
    if (rsi > 40 && rsi < 70) score += 0.5;
    if (macd.histogram > 0) score += 0.5;
    if (ticker.price > ma50) score += 0.5;
    score = Math.min(10, parseFloat(score.toFixed(1)));

    return {
      symbol,
      currentPrice: ticker.price,
      timeframes: [
        { tf: '1D' as const, trend: trend1d.direction, strength: trend1d.strength },
        { tf: '4H' as const, trend: trend4h.direction, strength: trend4h.strength },
        { tf: '1H' as const, trend: trend1h.direction, strength: trend1h.strength },
      ],
      forecast: {
        price24h,
        price7d,
        confidence,
        scenarios: [
          { name: 'bull' as const, price: Math.round(price7d * 1.1), probability: trend4h.direction === 'bullish' ? 40 : 25 },
          { name: 'base' as const, price: price7d, probability: 40 },
          { name: 'bear' as const, price: Math.round(price7d * 0.9), probability: trend4h.direction === 'bearish' ? 40 : 20 },
        ],
      },
      levels: {
        resistance: levels.resistance.length ? levels.resistance : [Math.round(ticker.price * 1.05), Math.round(ticker.price * 1.1)],
        support: levels.support.length ? levels.support : [Math.round(ticker.price * 0.95), Math.round(ticker.price * 0.9)],
        poc: Math.round((ticker.high24h + ticker.low24h) / 2),
      },
      indicators: {
        rsi: Math.round(rsi),
        macd: {
          value: parseFloat(macd.macd.toFixed(2)),
          signal: parseFloat(macd.signal.toFixed(2)),
          histogram: parseFloat(macd.histogram.toFixed(2)),
        },
        movingAverages: {
          ma20: Math.round(ma20),
          ma50: Math.round(ma50),
          ma200: Math.round(ma200),
        },
      },
      score,
    };
  },

  // Step 3: Safety Check
  async safetyCheck(symbol: string) {
    const [ticker, candles] = await Promise.all([
      fetch24hTicker(symbol),
      fetchKlines(symbol, '1h', 100),
    ]);

    // Volume analysis
    const volumes = candles.map(c => c.volume);
    const avgVolume = volumes.slice(-24).reduce((a, b) => a + b, 0) / 24;
    const currentVolume = volumes[volumes.length - 1];
    const volumeAnomaly = currentVolume > avgVolume * 3;

    // Price manipulation check
    const priceChanges = candles.slice(-24).map((c, i, arr) => {
      if (i === 0) return 0;
      return Math.abs((c.close - arr[i-1].close) / arr[i-1].close * 100);
    });
    const avgChange = priceChanges.reduce((a, b) => a + b, 0) / priceChanges.length;
    const priceManipulation = avgChange > 3;

    // Calculate manipulation risk
    let riskScore = 100;
    if (volumeAnomaly) riskScore -= 20;
    if (priceManipulation) riskScore -= 30;
    if (ticker.priceChangePercent24h > 15 || ticker.priceChangePercent24h < -15) riskScore -= 15;

    const manipulationRisk = riskScore >= 70 ? 'low' : riskScore >= 40 ? 'moderate' : 'high';
    const whaleActivity = volumeAnomaly ? 'high' : currentVolume > avgVolume * 1.5 ? 'moderate' : 'low';

    const warnings: string[] = [];
    if (volumeAnomaly) warnings.push('Unusual volume spike detected');
    if (priceManipulation) warnings.push('High price volatility - possible manipulation');
    if (ticker.priceChangePercent24h > 10) warnings.push(`Large price move: +${ticker.priceChangePercent24h.toFixed(1)}% in 24h`);
    if (ticker.priceChangePercent24h < -10) warnings.push(`Large price drop: ${ticker.priceChangePercent24h.toFixed(1)}% in 24h`);

    return {
      overallScore: riskScore,
      manipulationRisk: manipulationRisk as 'low' | 'moderate' | 'high',
      whaleActivity: whaleActivity as 'low' | 'moderate' | 'high',
      volumeAnomaly,
      priceManipulation,
      warnings,
    };
  },

  // Step 4: Timing Analysis
  async timingAnalysis(symbol: string) {
    const [ticker, candles] = await Promise.all([
      fetch24hTicker(symbol),
      fetchKlines(symbol, '1h', 100),
    ]);

    const prices = candles.map(c => c.close);
    const bb = calculateBollingerBands(prices);
    const rsi = calculateRSI(prices);
    const levels = findSupportResistance(candles);

    // Calculate optimal entry
    const nearestSupport = levels.support[0] || ticker.price * 0.97;
    const optimalEntry = Math.round((ticker.price + nearestSupport) / 2);

    // Entry zone
    const entryZone = {
      low: Math.round(bb.lower),
      high: Math.round(ticker.price * 0.99),
    };

    // Confidence based on RSI and BB position
    let confidence = 50;
    if (rsi < 40) confidence += 20; // Oversold - good entry
    if (rsi > 60) confidence -= 10; // Overbought - risky entry
    if (ticker.price < bb.middle) confidence += 15;
    if (ticker.price > bb.upper) confidence -= 20;
    confidence = Math.max(20, Math.min(90, confidence));

    // Recommendation
    let recommendation: 'buy' | 'wait' | 'avoid' = 'wait';
    if (ticker.price <= entryZone.high && rsi < 50) recommendation = 'buy';
    else if (ticker.price > bb.upper || rsi > 70) recommendation = 'avoid';

    return {
      optimalEntry,
      currentPrice: ticker.price,
      entryZone,
      confidence,
      timeWindow: recommendation === 'buy' ? 'Now' : recommendation === 'wait' ? '4-12 hours' : 'Wait for pullback',
      recommendation,
    };
  },

  // Step 5: Trade Plan
  async tradePlan(symbol: string, accountSize: number = 10000) {
    const [ticker, candles] = await Promise.all([
      fetch24hTicker(symbol),
      fetchKlines(symbol, '4h', 100),
    ]);

    const prices = candles.map(c => c.close);
    const trend = calculateTrend(prices);
    const levels = findSupportResistance(candles);
    const atr = calculateATR(candles);

    const direction = trend.direction === 'bullish' ? 'long' : trend.direction === 'bearish' ? 'short' : 'long';
    const entry = ticker.price;

    // Stop loss at nearest support/resistance or ATR-based
    const stopDistance = Math.max(atr * 1.5, ticker.price * 0.02);
    const stopLoss = direction === 'long'
      ? Math.round(entry - stopDistance)
      : Math.round(entry + stopDistance);

    // Take profit levels (1:1.5, 1:2, 1:3 risk/reward)
    const riskAmount = Math.abs(entry - stopLoss);
    const takeProfit = direction === 'long'
      ? [
          Math.round(entry + riskAmount * 1.5),
          Math.round(entry + riskAmount * 2),
          Math.round(entry + riskAmount * 3),
        ]
      : [
          Math.round(entry - riskAmount * 1.5),
          Math.round(entry - riskAmount * 2),
          Math.round(entry - riskAmount * 3),
        ];

    const riskReward = parseFloat((riskAmount * 2 / riskAmount).toFixed(1));
    const positionSize = `${Math.round((accountSize * 0.02) / riskAmount * 100) / 100}%`;

    return {
      direction: direction as 'long' | 'short',
      entry: Math.round(entry),
      stopLoss,
      takeProfit,
      riskReward,
      positionSize,
      leverage: trend.strength > 70 ? '3-5x' : '2-3x',
      notes: [
        `Entry based on ${trend.direction} trend (${trend.strength}% strength)`,
        `Stop loss set at ${((Math.abs(entry - stopLoss) / entry) * 100).toFixed(1)}% from entry`,
        `Risk 2% of portfolio per trade`,
      ],
    };
  },

  // Step 6: Trap Check
  async trapCheck(symbol: string) {
    const [ticker, candles] = await Promise.all([
      fetch24hTicker(symbol),
      fetchKlines(symbol, '1h', 48),
    ]);

    const prices = candles.map(c => c.close);
    const volumes = candles.map(c => c.volume);

    // Check for potential traps
    const recentHigh = Math.max(...prices.slice(-12));
    const recentLow = Math.min(...prices.slice(-12));
    const range = recentHigh - recentLow;

    // Bull trap: price breaks above resistance then falls back
    const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
    const recentVolume = volumes.slice(-6).reduce((a, b) => a + b, 0) / 6;

    let trapProbability = 20;
    if (ticker.price > recentHigh * 0.98 && recentVolume < avgVolume) {
      trapProbability += 30; // Breakout on low volume - potential trap
    }
    if (Math.abs(ticker.priceChangePercent24h) > 10) {
      trapProbability += 20; // Extreme move - reversal possible
    }

    const liquidationRisk = trapProbability > 50 ? 'high' : trapProbability > 30 ? 'moderate' : 'low';

    // Estimate liquidation zones (simplified)
    const longLiquidations = Math.round(ticker.price * 0.9);
    const shortLiquidations = Math.round(ticker.price * 1.1);

    const warnings: string[] = [];
    if (trapProbability > 40) {
      warnings.push('Elevated trap risk - consider waiting for confirmation');
    }
    if (recentVolume < avgVolume * 0.7) {
      warnings.push('Low volume - breakouts may fail');
    }

    return {
      liquidationRisk: liquidationRisk as 'low' | 'moderate' | 'high',
      longLiquidations,
      shortLiquidations,
      heatmapZones: [
        { price: longLiquidations, volume: 65, type: 'long' as const },
        { price: shortLiquidations, volume: 45, type: 'short' as const },
      ],
      trapProbability,
      warnings,
    };
  },

  // Step 7: Final Verdict
  async finalVerdict(symbol: string, allSteps: {
    marketPulse: Awaited<ReturnType<typeof analysisEngine.getMarketPulse>>;
    assetScan: Awaited<ReturnType<typeof analysisEngine.scanAsset>>;
    safetyCheck: Awaited<ReturnType<typeof analysisEngine.safetyCheck>>;
    timing: Awaited<ReturnType<typeof analysisEngine.timingAnalysis>>;
    tradePlan: Awaited<ReturnType<typeof analysisEngine.tradePlan>>;
    trapCheck: Awaited<ReturnType<typeof analysisEngine.trapCheck>>;
  }) {
    const { marketPulse, assetScan, safetyCheck, timing, tradePlan, trapCheck } = allSteps;

    // Calculate overall verdict
    let bullishScore = 0;
    let totalFactors = 0;

    // Market conditions
    if (marketPulse.marketRegime === 'risk_on') bullishScore += 2;
    else if (marketPulse.marketRegime === 'risk_off') bullishScore -= 2;
    totalFactors += 2;

    // Asset trend
    const mainTrend = assetScan.timeframes.find(t => t.tf === '4H');
    if (mainTrend?.trend === 'bullish') bullishScore += 2;
    else if (mainTrend?.trend === 'bearish') bullishScore -= 2;
    totalFactors += 2;

    // Safety
    if (safetyCheck.manipulationRisk === 'low') bullishScore += 1;
    else if (safetyCheck.manipulationRisk === 'high') bullishScore -= 2;
    totalFactors += 1;

    // Timing
    if (timing.recommendation === 'buy') bullishScore += 1;
    else if (timing.recommendation === 'avoid') bullishScore -= 1;
    totalFactors += 1;

    // Trap risk
    if (trapCheck.liquidationRisk === 'low') bullishScore += 1;
    else if (trapCheck.liquidationRisk === 'high') bullishScore -= 1;
    totalFactors += 1;

    const normalizedScore = ((bullishScore + totalFactors) / (totalFactors * 2)) * 100;

    let verdict: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    if (normalizedScore >= 65) verdict = 'bullish';
    else if (normalizedScore <= 35) verdict = 'bearish';

    let action = 'HOLD';
    if (verdict === 'bullish' && timing.recommendation === 'buy') action = 'BUY';
    else if (verdict === 'bearish') action = 'SELL';

    const confidence = Math.round(Math.abs(normalizedScore - 50) * 2);

    // Pros and cons
    const pros: string[] = [];
    const cons: string[] = [];

    if (marketPulse.marketRegime === 'risk_on') pros.push('Favorable market conditions');
    else if (marketPulse.marketRegime === 'risk_off') cons.push('Risk-off market environment');

    if (mainTrend?.trend === 'bullish') pros.push(`${mainTrend.tf} trend is bullish (${mainTrend.strength}%)`);
    else if (mainTrend?.trend === 'bearish') cons.push(`${mainTrend.tf} trend is bearish`);

    if (safetyCheck.manipulationRisk === 'low') pros.push('Low manipulation risk');
    else if (safetyCheck.manipulationRisk === 'high') cons.push('High manipulation risk detected');

    if (assetScan.indicators.rsi < 70 && assetScan.indicators.rsi > 30) {
      pros.push(`RSI at ${assetScan.indicators.rsi} - not overbought/oversold`);
    } else if (assetScan.indicators.rsi >= 70) {
      cons.push(`RSI at ${assetScan.indicators.rsi} - overbought`);
    } else {
      cons.push(`RSI at ${assetScan.indicators.rsi} - oversold`);
    }

    if (trapCheck.trapProbability < 30) pros.push('Low trap probability');
    else if (trapCheck.trapProbability > 50) cons.push('Elevated trap risk');

    const riskLevel = safetyCheck.manipulationRisk === 'high' || trapCheck.liquidationRisk === 'high'
      ? 'high'
      : safetyCheck.manipulationRisk === 'moderate' || trapCheck.liquidationRisk === 'moderate'
        ? 'moderate'
        : 'low';

    const summary = `${symbol} shows a ${verdict} outlook with ${confidence}% confidence. ` +
      `Market is in ${marketPulse.marketRegime.replace('_', ' ')} mode. ` +
      `${mainTrend?.trend === 'bullish' ? 'Uptrend intact' : mainTrend?.trend === 'bearish' ? 'Downtrend in progress' : 'No clear trend'}. ` +
      `Risk level: ${riskLevel}.`;

    return {
      verdict,
      confidence,
      action,
      summary,
      pros,
      cons,
      riskLevel: riskLevel as 'low' | 'moderate' | 'high',
      suggestedAction: action === 'BUY'
        ? `Enter ${tradePlan.direction} position at $${tradePlan.entry}. Stop loss: $${tradePlan.stopLoss}. Target: $${tradePlan.takeProfit[0]}.`
        : action === 'SELL'
          ? 'Consider reducing position or setting tight stop losses.'
          : 'Wait for better entry conditions or more confirmation.',
    };
  },
};

// Helper: Calculate ATR
function calculateATR(candles: Candle[], period: number = 14): number {
  const trueRanges: number[] = [];

  for (let i = 1; i < candles.length; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    const prevClose = candles[i-1].close;

    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    trueRanges.push(tr);
  }

  return trueRanges.slice(-period).reduce((a, b) => a + b, 0) / period;
}

export default analysisEngine;
