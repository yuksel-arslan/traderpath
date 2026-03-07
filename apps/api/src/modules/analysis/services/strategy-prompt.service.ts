/**
 * Strategy Prompt Service — TraderPath.io
 * =========================================
 * Loads strategy-specific prompt files (MD) at startup and provides
 * context strings that are injected into Gemini AI calls during analysis.
 *
 * Each timeframe maps to a strategy type:
 *   5m, 15m        → SCALPING
 *   30m, 1h, 4h    → DAY_TRADE
 *   1d              → SWING_TRADE
 *   1w, 1M          → POSITION_TRADE
 *
 * The strategy context enriches:
 *   - Step 5 (Trade Plan): strategy-specific entry methodology, R:R, SL/TP rules
 *   - Step 7 (Final Verdict / AI Summary): strategy-weighted scoring, narrative length
 *   - Preliminary Verdict: market condition pre-checks per strategy
 */

import fs from 'fs';
import path from 'path';
import { TradeType } from '../config/trade-config';

// ============================================================
// TYPES
// ============================================================

export type StrategyType = 'SCALPING' | 'DAY_TRADE' | 'SWING_TRADE' | 'POSITION_TRADE';

export interface StrategyConfig {
  type: StrategyType;
  intervals: string[];
  expectedHoldTime: string;
  minConfidence: number;
  minRiskReward: number;
  maxLeverage: number;
  narrativeLength: string;
  promptFile: string;
  /** Full content of the strategy prompt MD file (loaded at startup) */
  promptContent: string;
  // Trade plan parameters (derived from strategy MD files)
  /** Base risk percent per trade (before safety/confidence adjustments) */
  riskPercentPerTrade: number;
  /** TP1 allocation percentage */
  tp1Percent: number;
  /** TP2 allocation percentage */
  tp2Percent: number;
  /** Maximum stop loss distance as % of entry price */
  maxStopPercent: number;
  /** Maximum take profit distance as % of entry price */
  maxTPPercent: number;
  /** Maximum S/R level distance to consider as % of price */
  maxLevelDistance: number;
}

export interface StrategyContext {
  strategyType: StrategyType;
  config: StrategyConfig;
  /** Condensed strategy rules for Gemini system prompt injection */
  tradePlanContext: string;
  /** Condensed strategy rules for AI summary / verdict prompt injection */
  verdictContext: string;
  /** Market condition warnings specific to this strategy */
  marketConditionRules: string;
}

export interface MarketConditionCheck {
  viable: boolean;
  warnings: string[];
  autoWait: boolean;
  autoWaitReasons: string[];
}

export interface MarketConditionInput {
  spreadPercent: number;
  volumeRatio: number;   // current / avg20
  adx: number;
  fundingRate: number;
  fearGreedIndex: number;
  rsi: number;
}

// ============================================================
// STRATEGY CONFIG
// ============================================================

const STRATEGY_CONFIGS: Record<StrategyType, Omit<StrategyConfig, 'promptContent'>> = {
  SCALPING: {
    type: 'SCALPING',
    intervals: ['1m', '3m', '5m', '15m'],
    expectedHoldTime: '2-30 minutes',
    minConfidence: 65,
    minRiskReward: 1.5,
    maxLeverage: 10,
    narrativeLength: '100-150 words (bullet points)',
    promptFile: 'SCALPING_PROMPT.md',
    riskPercentPerTrade: 0.5,  // 0.5% per trade (high frequency)
    tp1Percent: 60,            // TP1: 60% at 1.5R
    tp2Percent: 40,            // TP2: 40% at 2.5R (trailing)
    maxStopPercent: 3,         // ATR(14) × 0.5 hard stop, tight
    maxTPPercent: 5,           // Scalp targets are close
    maxLevelDistance: 5,       // Only very nearby S/R levels
  },
  DAY_TRADE: {
    type: 'DAY_TRADE',
    intervals: ['30m', '1h', '4h'],
    expectedHoldTime: '1-8 hours',
    minConfidence: 60,
    minRiskReward: 2.0,
    maxLeverage: 20,
    narrativeLength: '200-300 words',
    promptFile: 'DAYTRADING_PROMPT.md',
    riskPercentPerTrade: 1.0,  // 1% per trade
    tp1Percent: 60,            // TP1: 60% at 2:1
    tp2Percent: 40,            // TP2: 40% at 3:1+
    maxStopPercent: 8,         // Moderate stop width
    maxTPPercent: 15,          // Intraday targets
    maxLevelDistance: 10,      // Standard S/R range
  },
  SWING_TRADE: {
    type: 'SWING_TRADE',
    intervals: ['4h', '1d'],
    expectedHoldTime: '3-14 days',
    minConfidence: 60,
    minRiskReward: 2.5,
    maxLeverage: 10,
    narrativeLength: '300-400 words',
    promptFile: 'SWINGTRADING_PROMPT.md',
    riskPercentPerTrade: 1.5,  // 1.5% per trade
    tp1Percent: 50,            // TP1: 50% at 2.5:1 (Fibonacci retracement)
    tp2Percent: 50,            // TP2: 50% at 4:1+ (measured move)
    maxStopPercent: 15,        // Wider stops for swing (1.5× ATR)
    maxTPPercent: 25,          // Multi-day targets
    maxLevelDistance: 15,      // Wider S/R scope
  },
  POSITION_TRADE: {
    type: 'POSITION_TRADE',
    intervals: ['1w', '1M'],
    expectedHoldTime: '1-12 months',
    minConfidence: 55,
    minRiskReward: 3.0,
    maxLeverage: 5,
    narrativeLength: '500-700 words (full report)',
    promptFile: 'POSITIONTRADING_PROMPT.md',
    riskPercentPerTrade: 3.0,  // Up to 4% for HIGH conviction, 3% base
    tp1Percent: 40,            // TP1: 40% at 2× gain
    tp2Percent: 60,            // TP2: 60% runner (cycle top signals)
    maxStopPercent: 30,        // 15-30% is normal for position trades
    maxTPPercent: 50,          // Macro targets can be very far
    maxLevelDistance: 30,      // Monthly/weekly levels can be far
  },
};

// ============================================================
// INTERVAL → STRATEGY MAPPING
// ============================================================

export function detectStrategyFromInterval(interval: string): StrategyType {
  switch (interval) {
    case '1m':
    case '3m':
    case '5m':
      return 'SCALPING';
    case '15m':
      return 'SCALPING';
    case '30m':
    case '1h':
      return 'DAY_TRADE';
    case '4h':
      return 'DAY_TRADE';
    case '1d':
      return 'SWING_TRADE';
    case '1w':
    case '1W':
    case '1M':
      return 'POSITION_TRADE';
    default:
      return 'DAY_TRADE';
  }
}

/** Map TradeType (engine enum) to StrategyType (prompt enum) */
export function tradeTypeToStrategy(tradeType: TradeType): StrategyType {
  switch (tradeType) {
    case 'scalping': return 'SCALPING';
    case 'dayTrade': return 'DAY_TRADE';
    case 'swing':    return 'SWING_TRADE';
    default:         return 'DAY_TRADE';
  }
}

// ============================================================
// FILE LOADING (one-time at startup, cached in memory)
// ============================================================

const loadedConfigs: Map<StrategyType, StrategyConfig> = new Map();
let initialized = false;

/**
 * Load all strategy prompt MD files into memory.
 * Called once at server startup. Safe to call multiple times (idempotent).
 */
export function initializeStrategyPrompts(): void {
  if (initialized) return;

  // Resolve path relative to this file → ../../../ → analysis_service root
  // analysis_service/src/prompts/strategies/
  const strategiesDir = path.resolve(__dirname, '..', '..', '..', '..', '..', '..', 'analysis_service', 'src', 'prompts', 'strategies');

  for (const [key, cfg] of Object.entries(STRATEGY_CONFIGS)) {
    const strategyType = key as StrategyType;
    const filePath = path.join(strategiesDir, cfg.promptFile);
    let content = '';

    try {
      content = fs.readFileSync(filePath, 'utf-8');
      console.log(`[StrategyPrompt] Loaded ${cfg.promptFile} (${content.length} chars)`);
    } catch {
      console.warn(`[StrategyPrompt] Could not load ${filePath}, using inline fallback`);
      content = getFallbackContent(strategyType);
    }

    loadedConfigs.set(strategyType, { ...cfg, promptContent: content });
  }

  initialized = true;
  console.log(`[StrategyPrompt] Initialized ${loadedConfigs.size} strategy prompts`);
}

// ============================================================
// STRATEGY CONTEXT BUILDER
// ============================================================

/**
 * Get the full strategy context for a given interval or trade type.
 * This is injected into Gemini prompts during analysis.
 */
export function getStrategyContext(intervalOrTradeType: string): StrategyContext {
  // Lazy-init if not done yet
  if (!initialized) initializeStrategyPrompts();

  const strategyType = (['scalping', 'dayTrade', 'swing'] as const).includes(intervalOrTradeType as TradeType)
    ? tradeTypeToStrategy(intervalOrTradeType as TradeType)
    : detectStrategyFromInterval(intervalOrTradeType);

  const config = loadedConfigs.get(strategyType) || {
    ...STRATEGY_CONFIGS[strategyType],
    promptContent: getFallbackContent(strategyType),
  };

  return {
    strategyType,
    config,
    tradePlanContext: buildTradePlanContext(strategyType, config),
    verdictContext: buildVerdictContext(strategyType, config),
    marketConditionRules: buildMarketConditionRules(strategyType, config),
  };
}

/**
 * Get the raw strategy config (without context strings).
 */
export function getStrategyConfig(strategyType: StrategyType): StrategyConfig {
  if (!initialized) initializeStrategyPrompts();
  return loadedConfigs.get(strategyType) || {
    ...STRATEGY_CONFIGS[strategyType],
    promptContent: getFallbackContent(strategyType),
  };
}

// ============================================================
// MARKET CONDITION PRE-CHECKS
// ============================================================

/**
 * Check market conditions against strategy-specific thresholds.
 * Returns warnings and auto-wait triggers.
 */
export function checkMarketConditions(
  strategyType: StrategyType,
  input: MarketConditionInput
): MarketConditionCheck {
  const warnings: string[] = [];
  const autoWaitReasons: string[] = [];

  if (strategyType === 'SCALPING') {
    if (input.spreadPercent > 0.1) autoWaitReasons.push(`Spread too high for scalping: ${input.spreadPercent.toFixed(3)}%`);
    if (input.volumeRatio < 0.8) autoWaitReasons.push(`Volume too low for scalping: ${(input.volumeRatio * 100).toFixed(0)}% of average`);
    if (input.adx < 15) warnings.push(`Low ADX (${input.adx.toFixed(1)}): Choppy conditions, scalping risky`);
    if (Math.abs(input.fundingRate) > 0.05) warnings.push(`Extreme funding rate: ${input.fundingRate}% — scalping volatility risk`);
    if (input.rsi > 75 || input.rsi < 25) warnings.push(`RSI extreme (${input.rsi.toFixed(1)}): Reversal risk for scalp entries`);
  }

  if (strategyType === 'DAY_TRADE') {
    if (input.volumeRatio < 0.8) warnings.push(`Below-average volume: ${(input.volumeRatio * 100).toFixed(0)}% — weaker day trade setups`);
    if (input.adx < 20) warnings.push(`Weak trend: ADX ${input.adx.toFixed(1)} — day trade needs directional movement`);
  }

  if (strategyType === 'SWING_TRADE') {
    if (input.fearGreedIndex > 80) warnings.push(`Extreme greed (FGI ${input.fearGreedIndex}): Swing trade reversal risk elevated`);
    if (input.fearGreedIndex < 15) warnings.push(`Extreme fear (FGI ${input.fearGreedIndex}): Potential capitulation — swing entry opportunity but risky`);
  }

  if (strategyType === 'POSITION_TRADE') {
    if (input.fundingRate > 0.1) warnings.push(`High chronic funding: ${input.fundingRate}% — position trade distribution risk`);
  }

  return {
    viable: autoWaitReasons.length === 0,
    warnings,
    autoWait: autoWaitReasons.length > 0,
    autoWaitReasons,
  };
}

// ============================================================
// CONTEXT BUILDERS (extract key sections from MD for Gemini)
// ============================================================

function buildTradePlanContext(strategy: StrategyType, config: StrategyConfig): string {
  const content = config.promptContent;

  // Extract key sections from the MD content for trade plan generation
  const sections: string[] = [];

  // Strategy identity
  const identityMatch = content.match(/## STRATEGY IDENTITY\n([\s\S]*?)(?=\n---)/);
  if (identityMatch) sections.push(identityMatch[1].trim());

  // Entry methodology
  const entryMatch = content.match(/## ENTRY METHODOLOGY\n([\s\S]*?)(?=\n---)/);
  if (entryMatch) sections.push('ENTRY METHODOLOGY:\n' + entryMatch[1].trim());

  // Risk management
  const riskMatch = content.match(/## RISK MANAGEMENT[\s\S]*?\n([\s\S]*?)(?=\n---)/);
  if (riskMatch) sections.push('RISK MANAGEMENT:\n' + riskMatch[1].trim());

  // If no sections extracted, use fallback
  if (sections.length === 0) {
    return getFallbackTradePlanContext(strategy);
  }

  return `## ACTIVE STRATEGY: ${strategy}
Expected Hold Time: ${config.expectedHoldTime}
Minimum R:R: ${config.minRiskReward}:1
Maximum Leverage: ${config.maxLeverage}x
Max Risk Per Trade: ${strategy === 'SCALPING' ? '0.5%' : strategy === 'DAY_TRADE' ? '1%' : strategy === 'SWING_TRADE' ? '1.5%' : '4%'}

${sections.join('\n\n')}`;
}

function buildVerdictContext(strategy: StrategyType, config: StrategyConfig): string {
  const content = config.promptContent;

  // Extract red flags and narrative requirements
  const sections: string[] = [];

  // Red flags
  const redFlagsMatch = content.match(/## (?:SCALPING|DAY TRADING|SWING TRADE|POSITION TRADE) RED FLAGS[\s\S]*?\n([\s\S]*?)$/);
  if (redFlagsMatch) sections.push('RED FLAGS:\n' + redFlagsMatch[1].trim());

  // Narrative requirements
  const narrativeMatch = content.match(/## NARRATIVE REQUIREMENTS\n([\s\S]*?)(?=\n---)/);
  if (narrativeMatch) sections.push('NARRATIVE REQUIREMENTS:\n' + narrativeMatch[1].trim());

  // Specific output additions
  const outputMatch = content.match(/## (?:SCALPING|DAY TRADING|SWING TRADING|POSITION TRADING)[- ]SPECIFIC OUTPUT[\s\S]*?\n([\s\S]*?)(?=\n---)/);
  if (outputMatch) sections.push(outputMatch[1].trim());

  return `## STRATEGY VERDICT CONTEXT: ${strategy}
Minimum Confidence Threshold: ${config.minConfidence}% (below → WAIT)
Minimum R:R: ${config.minRiskReward}:1
Narrative Length: ${config.narrativeLength}

${sections.join('\n\n')}`;
}

function buildMarketConditionRules(strategy: StrategyType, config: StrategyConfig): string {
  const content = config.promptContent;

  // Extract market condition filters
  const filterMatch = content.match(/## (?:SCALPING-SPECIFIC )?MARKET CONDITIONS? FILTER\n([\s\S]*?)(?=\n---)/);
  if (filterMatch) return filterMatch[1].trim();

  // Extract session framework for day trading
  const sessionMatch = content.match(/## DAY TRADING SESSION FRAMEWORK\n([\s\S]*?)(?=\n---)/);
  if (sessionMatch) return sessionMatch[1].trim();

  // Extract sentiment framework for swing
  const sentimentMatch = content.match(/## SENTIMENT & MACRO INTEGRATION\n([\s\S]*?)(?=\n---)/);
  if (sentimentMatch) return sentimentMatch[1].trim();

  // Extract macro framework for position
  const macroMatch = content.match(/## MACRO FRAMEWORK[\s\S]*?\n([\s\S]*?)(?=\n---)/);
  if (macroMatch) return macroMatch[1].trim();

  return getFallbackMarketConditionRules(strategy);
}

// ============================================================
// FALLBACK CONTENT (when MD files not available)
// ============================================================

function getFallbackContent(strategy: StrategyType): string {
  const fallbacks: Record<StrategyType, string> = {
    SCALPING: `## STRATEGY IDENTITY
You are analyzing for a professional scalper capturing micro price inefficiencies.
Core: Small edges, executed perfectly at high frequency. Hold: 2-30 minutes.

## ENTRY METHODOLOGY
- VWAP Reclaim, Range Breakout, Support Bounce, Resistance Rejection, ORB
- Aggressive: Market order on breakout. Conservative: Limit at 38.2-50% Fib pullback.

## RISK MANAGEMENT
- Max Risk: 0.5% per trade. Leverage: 3x-10x.
- Hard Stop: ATR(14) × 0.5. Time Stop: 5 candles = EXIT.
- TP1 (60%): 1.5× risk → move SL to breakeven. TP2 (30%): 2.5× risk. TP3 (10%): trail EMA(9).

## SCALPING RED FLAGS
- Spread > 0.1%, Volume < 100% avg, ADX < 15, Confidence < 65%`,

    DAY_TRADE: `## STRATEGY IDENTITY
Active day trader seeking high-probability intraday setups. Close all positions EOD.
Core: Trade the session trend, capture the move, close clean. Hold: 1-8 hours.

## ENTRY METHODOLOGY
- Trend Pullback (60-70% WR), Range Breakout w/ Retest (55-65% WR), ORB (50-60% WR), VWAP Mean Reversion (55-65% WR).
- Multi-timeframe: 4H structure → 1H trend → 15m entry.

## RISK MANAGEMENT
- Max Risk: 1% per trade. Max 2 concurrent positions. Leverage: 5x-20x.
- SL: Wider of structural or 1.5× ATR.
- TP1 (40%): 2:1 R/R. TP2 (35%): 3:1 R/R. TP3 (25%): 4:1+ R/R.
- EOD Rule: Close 30min before session end.

## DAY TRADING RED FLAGS
- 4H/1H trends conflicted, Dead zone entry, Volume < 80%, ADX < 20, Confidence < 60%`,

    SWING_TRADE: `## STRATEGY IDENTITY
Disciplined swing trader capturing multi-day price swings. Patience for setup maturation.
Core: Wait for structure, enter at value, ride the wave. Hold: 3-14 days.

## ENTRY METHODOLOGY
- Fibonacci Pullback (38.2-50% entry, stop below 61.8%), Wyckoff Spring/Upthrust (4:1-8:1 R/R), Base Breakout.
- Weekly → Daily (Wyckoff phase) → 4H (entry).

## RISK MANAGEMENT
- Max Risk: 1.5% per trade. Max 3 concurrent. Leverage: 2x-10x.
- Min Stop Width: 1.5× ATR. Trail after 2:1 with weekly swing lows.
- TP1 (30%): 2.5:1 R/R. TP2 (40%): 4:1 R/R. TP3 (30%): max extension.
- Weekend: 75% max size. No entries Friday after 18:00 UTC.

## SWING TRADE RED FLAGS
- Weekly/daily trend conflict, Wyckoff Phase E, RSI divergence, Confidence < 60%`,

    POSITION_TRADE: `## STRATEGY IDENTITY
Patient position trader capturing large macro moves. Portfolio construction thinking.
Core: Right side of macro trend, size appropriately, let time work. Hold: 1-12 months.

## ENTRY METHODOLOGY
- Macro regime analysis mandatory. Elliott Wave + on-chain fundamentals.
- Wave 1-2 setup = best R/R. ABC Wave C = true buy opportunity.

## RISK MANAGEMENT
- Risk: HIGH(85+)=4%, MOD-HIGH(70-84)=3%, MOD(55-69)=1.5%. Max 15% portfolio.
- SL: 15-30% from entry is normal. Below 200-week SMA = ultimate stop.
- Scale-out: TP1(20%) at 2×, TP2(30%) measured move, TP3(30%) cycle top, TP4(20%) runner.

## POSITION TRADE RED FLAGS
- RISK_OFF regime, MVRV > 3.0, Chronic funding > 0.05%, Confidence < 55%, R/R < 3:1`,
  };

  return fallbacks[strategy];
}

function getFallbackTradePlanContext(strategy: StrategyType): string {
  const config = STRATEGY_CONFIGS[strategy];
  return `## ACTIVE STRATEGY: ${strategy}
Expected Hold Time: ${config.expectedHoldTime}
Minimum R:R: ${config.minRiskReward}:1
Maximum Leverage: ${config.maxLeverage}x`;
}

function getFallbackMarketConditionRules(strategy: StrategyType): string {
  const rules: Record<StrategyType, string> = {
    SCALPING: 'Favorable: Spread < 0.05%, Volume >= 150% avg, ADX > 20. Unfavorable: Spread > 0.1%, Volume < 80%, ADX < 15.',
    DAY_TRADE: 'Favorable: Strong session, HTF alignment, Volume > avg. Unfavorable: Dead zone, conflicting trends, ADX < 20.',
    SWING_TRADE: 'Favorable: Clear Wyckoff phase, Fibonacci confluence. Unfavorable: Phase E, RSI divergence, weekend gap risk.',
    POSITION_TRADE: 'Favorable: Risk-on regime, cycle accumulation. Unfavorable: Risk-off, MVRV > 3, extreme funding.',
  };
  return rules[strategy];
}

// ============================================================
// EXPORT SINGLETON
// ============================================================

export const strategyPromptService = {
  initialize: initializeStrategyPrompts,
  getContext: getStrategyContext,
  getConfig: getStrategyConfig,
  checkMarketConditions,
  detectStrategy: detectStrategyFromInterval,
  tradeTypeToStrategy,
};
