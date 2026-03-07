// TraderPath.io — Strategy Prompt Builder
// File: analysis_service/src/prompts/strategyPromptBuilder.ts
// Builds dynamic prompts based on trading strategy type

import fs from 'fs/promises';
import path from 'path';

// ============================================================
// TYPES
// ============================================================

export type StrategyType = 'SCALPING' | 'DAY_TRADE' | 'SWING_TRADE' | 'POSITION_TRADE';

export interface MarketData {
  symbol: string;
  currentPrice: number;
  interval: string;
  ohlcv: OHLCV[];
  indicators: Indicators;
  orderBook: OrderBook;
  sentiment: SentimentData;
}

export interface OHLCV {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Indicators {
  ema: { 9: number; 21: number; 50: number; 200: number };
  rsi: { 14: number; 7: number };
  macd: { line: number; signal: number; histogram: number };
  bbands: { upper: number; middle: number; lower: number };
  atr: { 14: number };
  volume: { current: number; avgVolume20: number; vwap: number };
  stochRsi: { k: number; d: number };
  adx: { adx: number; di_plus: number; di_minus: number };
}

export interface OrderBook {
  bidWall: number;
  askWall: number;
  spread: number;
  imbalance: number; // -1 to 1 (negative = sell pressure, positive = buy pressure)
}

export interface SentimentData {
  fearGreedIndex: number;
  fundingRate: number;
  openInterest: number;
  longShortRatio: number;
}

export interface PromptBuildResult {
  strategyType: StrategyType;
  interval: string;
  systemPrompt: string;
  userPrompt: string;
  estimatedTokens: number;
  metadata: {
    expectedHoldTime: string;
    minConfidence: number;
    minRiskReward: number;
    maxLeverage: number;
  };
}

// ============================================================
// STRATEGY CONFIG MAP
// ============================================================

const STRATEGY_CONFIG = {
  SCALPING: {
    intervals: ['1m', '3m', '5m'],
    expectedHoldTime: '2-30 minutes',
    minConfidence: 65,
    minRiskReward: 1.5,
    maxLeverage: 10,
    narrativeLength: '100-150 words (bullet points)',
    promptFile: 'SCALPING_PROMPT.md',
  },
  DAY_TRADE: {
    intervals: ['15m', '30m', '1h'],
    expectedHoldTime: '1-8 hours',
    minConfidence: 60,
    minRiskReward: 2.0,
    maxLeverage: 20,
    narrativeLength: '200-300 words',
    promptFile: 'DAYTRADING_PROMPT.md',
  },
  SWING_TRADE: {
    intervals: ['4h', '1d'],
    expectedHoldTime: '3-14 days',
    minConfidence: 60,
    minRiskReward: 2.5,
    maxLeverage: 10,
    narrativeLength: '300-400 words',
    promptFile: 'SWINGTRADING_PROMPT.md',
  },
  POSITION_TRADE: {
    intervals: ['1w', '1M'],
    expectedHoldTime: '1-12 months',
    minConfidence: 55,
    minRiskReward: 3.0,
    maxLeverage: 5,
    narrativeLength: '500-700 words (full report)',
    promptFile: 'POSITIONTRADING_PROMPT.md',
  },
} as const;

// ============================================================
// AUTO-DETECT STRATEGY FROM INTERVAL
// ============================================================

export function detectStrategyFromInterval(interval: string): StrategyType {
  const scalping = ['1m', '3m', '5m'];
  const dayTrade = ['15m', '30m', '1h'];
  const swingTrade = ['4h', '1d'];
  const positionTrade = ['3d', '1w', '1M'];

  if (scalping.includes(interval)) return 'SCALPING';
  if (dayTrade.includes(interval)) return 'DAY_TRADE';
  if (swingTrade.includes(interval)) return 'SWING_TRADE';
  if (positionTrade.includes(interval)) return 'POSITION_TRADE';

  // Default to day trade for unknown intervals
  return 'DAY_TRADE';
}

// ============================================================
// MARKET CONDITION PRE-CHECKS
// ============================================================

interface MarketConditionCheck {
  viable: boolean;
  warnings: string[];
  autoWait: boolean;
  autoWaitReasons: string[];
}

function checkMarketConditions(
  strategy: StrategyType,
  data: MarketData
): MarketConditionCheck {
  const warnings: string[] = [];
  const autoWaitReasons: string[] = [];

  const spreadPercent = (data.orderBook.spread / data.currentPrice) * 100;
  const volumeRatio = data.indicators.volume.current / data.indicators.volume.avgVolume20;
  const fundingRate = data.sentiment.fundingRate;

  if (strategy === 'SCALPING') {
    if (spreadPercent > 0.1) autoWaitReasons.push(`Spread too high: ${spreadPercent.toFixed(3)}%`);
    if (volumeRatio < 0.8) autoWaitReasons.push(`Volume too low: ${(volumeRatio * 100).toFixed(0)}% of average`);
    if (data.indicators.adx.adx < 15) warnings.push(`Low ADX (${data.indicators.adx.adx.toFixed(1)}): Choppy conditions`);
    if (Math.abs(fundingRate) > 0.05) warnings.push(`Extreme funding rate: ${fundingRate}%`);
  }

  if (strategy === 'DAY_TRADE') {
    if (volumeRatio < 0.8) warnings.push(`Below-average volume: ${(volumeRatio * 100).toFixed(0)}%`);
    if (data.indicators.adx.adx < 20) warnings.push(`Weak trend: ADX ${data.indicators.adx.adx.toFixed(1)}`);
  }

  if (strategy === 'SWING_TRADE') {
    if (data.sentiment.fearGreedIndex > 80) warnings.push(`Extreme greed: FGI ${data.sentiment.fearGreedIndex}`);
    if (data.sentiment.fearGreedIndex < 15) warnings.push(`Extreme fear: FGI ${data.sentiment.fearGreedIndex}`);
  }

  if (strategy === 'POSITION_TRADE') {
    if (fundingRate > 0.1) warnings.push(`High chronic funding: ${fundingRate}% (distribution risk)`);
  }

  return {
    viable: autoWaitReasons.length === 0,
    warnings,
    autoWait: autoWaitReasons.length > 0,
    autoWaitReasons,
  };
}

// ============================================================
// SYSTEM PROMPT BUILDER
// ============================================================

function buildSystemPrompt(strategy: StrategyType, coreContext: string, strategyContext: string): string {
  return `${coreContext}

---

${strategyContext}

---

## CURRENT STRATEGY MODE: ${strategy}
${getStrategyModeInstructions(strategy)}`;
}

function getStrategyModeInstructions(strategy: StrategyType): string {
  const config = STRATEGY_CONFIG[strategy];
  return `
- Minimum Confidence Threshold: ${config.minConfidence}% (return WAIT if below)
- Minimum Risk/Reward: ${config.minRiskReward}:1 (refuse trade if not achievable)
- Maximum Leverage: ${config.maxLeverage}x
- Expected Hold Time: ${config.expectedHoldTime}
- Narrative Length: ${config.narrativeLength}
- ALWAYS return valid JSON matching the provided schema
- ALWAYS include strategy-specific metrics for this strategy type
- If market conditions are unfavorable per strategy rules, return direction: "WAIT"
`;
}

// ============================================================
// USER PROMPT BUILDER
// ============================================================

function buildUserPrompt(
  strategy: StrategyType,
  data: MarketData,
  conditionCheck: MarketConditionCheck,
  analysisTimestamp: number
): string {
  const config = STRATEGY_CONFIG[strategy];

  let prompt = `## TRADING ANALYSIS REQUEST

**Symbol**: ${data.symbol}
**Strategy**: ${strategy}
**Timeframe**: ${data.interval}
**Current Price**: $${data.currentPrice.toLocaleString()}
**Analysis Timestamp**: ${analysisTimestamp} (FORECAST MUST START FROM THIS TIMESTAMP)

`;

  // Auto-wait override
  if (conditionCheck.autoWait) {
    prompt += `## ⚠️ AUTO-WAIT CONDITIONS DETECTED
The following conditions require immediate WAIT signal:
${conditionCheck.autoWaitReasons.map(r => `- ${r}`).join('\n')}

Generate a WAIT signal with explanation. Still provide full JSON output.

`;
  }

  // Warnings
  if (conditionCheck.warnings.length > 0) {
    prompt += `## ⚠️ MARKET WARNINGS
${conditionCheck.warnings.map(w => `- ${w}`).join('\n')}
Factor these into confidence scoring.

`;
  }

  // Market data
  prompt += `## MARKET DATA

### Indicators
\`\`\`json
${JSON.stringify(data.indicators, null, 2)}
\`\`\`

### Order Book Snapshot
\`\`\`json
${JSON.stringify(data.orderBook, null, 2)}
\`\`\`

### Sentiment Data
\`\`\`json
${JSON.stringify(data.sentiment, null, 2)}
\`\`\`

### Recent OHLCV (Last 20 candles)
\`\`\`json
${JSON.stringify(data.ohlcv.slice(-20), null, 2)}
\`\`\`

## ANALYSIS REQUIREMENTS

Apply the **${strategy}** strategy framework:
1. Check all favorable/unfavorable conditions for this strategy
2. Identify applicable setups from the strategy's setup library
3. Score confidence using the universal matrix
4. Apply minimum ${config.minRiskReward}:1 R/R filter
5. Generate 3 prediction scenarios (bull/base/bear)
6. Complete pre-mortem analysis
7. Return complete JSON output per schema

**CRITICAL**: Forecast chart data timestamps must start from analysis timestamp: ${analysisTimestamp}
Interval in seconds for ${data.interval}: ${getIntervalSeconds(data.interval)}

Return ONLY valid JSON. No markdown, no preamble.`;

  return prompt;
}

// ============================================================
// UTILITIES
// ============================================================

function getIntervalSeconds(interval: string): number {
  const map: Record<string, number> = {
    '1m': 60, '3m': 180, '5m': 300, '15m': 900, '30m': 1800,
    '1h': 3600, '2h': 7200, '4h': 14400, '1d': 86400,
    '3d': 259200, '1w': 604800, '1M': 2592000,
  };
  return map[interval] ?? 3600;
}

function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4); // Rough estimation
}

// ============================================================
// MAIN EXPORT — BUILD PROMPT
// ============================================================

export async function buildStrategyPrompt(
  data: MarketData,
  strategyOverride?: StrategyType
): Promise<PromptBuildResult> {
  const strategy = strategyOverride ?? detectStrategyFromInterval(data.interval);
  const config = STRATEGY_CONFIG[strategy];

  // Load prompt files (in production, these would be loaded from DB or file system)
  // For now, they're inlined — consider caching in production
  const promptsDir = path.join(__dirname, '..', 'prompts', 'strategies');
  
  let coreContext = '';
  let strategyContext = '';
  
  try {
    coreContext = await fs.readFile(path.join(promptsDir, 'CORE_CONTEXT.md'), 'utf-8');
    strategyContext = await fs.readFile(path.join(promptsDir, config.promptFile), 'utf-8');
  } catch {
    // Fallback: use inline minimal context
    coreContext = getCoreContextFallback();
    strategyContext = getStrategyContextFallback(strategy);
  }

  const conditionCheck = checkMarketConditions(strategy, data);
  const analysisTimestamp = Math.floor(Date.now() / 1000);

  const systemPrompt = buildSystemPrompt(strategy, coreContext, strategyContext);
  const userPrompt = buildUserPrompt(strategy, data, conditionCheck, analysisTimestamp);

  return {
    strategyType: strategy,
    interval: data.interval,
    systemPrompt,
    userPrompt,
    estimatedTokens: estimateTokenCount(systemPrompt + userPrompt),
    metadata: {
      expectedHoldTime: config.expectedHoldTime,
      minConfidence: config.minConfidence,
      minRiskReward: config.minRiskReward,
      maxLeverage: config.maxLeverage,
    },
  };
}

// ============================================================
// FALLBACK CONTEXTS (minimal, for when files not available)
// ============================================================

function getCoreContextFallback(): string {
  return `You are an elite quantitative financial analyst. 
Provide structured trading analysis with explicit risk management.
Always return valid JSON per the output schema.
Minimum confidence 55% — below this, return WAIT.`;
}

function getStrategyContextFallback(strategy: StrategyType): string {
  const contexts = {
    SCALPING: 'Focus on microstructure, order flow, and momentum. Short narrative (bullet points). High confidence bar (65%+).',
    DAY_TRADE: 'Multi-timeframe analysis required. Session awareness. 200-300 word narrative. Close all positions EOD.',
    SWING_TRADE: 'Wyckoff phase analysis. Fibonacci entries. Sentiment integration. 300-400 word narrative. Weekend risk management.',
    POSITION_TRADE: 'Macro regime analysis mandatory. Elliott Wave required. On-chain fundamentals. Pre-mortem with 3+ scenarios. 500-700 word report.',
  };
  return contexts[strategy];
}

// ============================================================
// HELPER: GET STRATEGY INFO FOR UI
// ============================================================

export function getStrategyInfo(strategy: StrategyType) {
  return STRATEGY_CONFIG[strategy];
}

export function getAllStrategies() {
  return Object.entries(STRATEGY_CONFIG).map(([key, config]) => ({
    type: key as StrategyType,
    ...config,
  }));
}
