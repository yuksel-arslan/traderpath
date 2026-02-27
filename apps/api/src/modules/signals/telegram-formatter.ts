/**
 * Telegram Signal Formatter
 * Formats trading signals for Telegram publication
 */

import type { SignalData, SignalQualityEnrichment } from './types';
import { QUALITY_THRESHOLDS } from './types';

// Direction emojis
const DIRECTION_EMOJI = {
  long: '🟢',
  short: '🔴',
};

// Verdict emojis
const VERDICT_EMOJI = {
  GO: '✅',
  CONDITIONAL_GO: '⚡',
  WAIT: '⏳',
  AVOID: '🚫',
};

// Market emojis
const MARKET_EMOJI = {
  crypto: '₿',
  stocks: '📈',
  metals: '🥇',
  bonds: '📊',
};

// Phase emojis
const PHASE_EMOJI = {
  early: '🌱',
  mid: '🌿',
  late: '🍂',
  exit: '🍁',
};

// Confidence badges
const getConfidenceBadge = (confidence: number): string => {
  if (confidence >= 90) return '🔥 Very High';
  if (confidence >= 80) return '💪 High';
  if (confidence >= 70) return '👍 Good';
  return '⚠️ Moderate';
};

// MLIS confirmation badge
const getMLISBadge = (confirmed: boolean, recommendation?: string): string => {
  if (!confirmed) return '❌ Not Confirmed';

  switch (recommendation) {
    case 'STRONG_BUY':
      return '🚀 STRONG BUY';
    case 'BUY':
      return '📈 BUY';
    case 'HOLD':
      return '⏸️ HOLD';
    case 'SELL':
      return '📉 SELL';
    case 'STRONG_SELL':
      return '⚠️ STRONG SELL';
    default:
      return '✅ Confirmed';
  }
};

// Quality score emoji/badge
const getQualityBadge = (score: number | undefined): string => {
  if (score === undefined || score === null) return '';
  if (score >= QUALITY_THRESHOLDS.medium + 1) return `🟢 ${score}/100 High`;
  if (score >= QUALITY_THRESHOLDS.low + 1) return `🟡 ${score}/100 Medium`;
  return `🔴 ${score}/100 Low`;
};

/**
 * Format signal for Telegram publication
 */
export function formatTelegramSignal(signal: SignalData, signalId: string, qualityEnrichment?: SignalQualityEnrichment): string {
  const directionEmoji = DIRECTION_EMOJI[signal.direction];
  const marketEmoji = MARKET_EMOJI[signal.market as keyof typeof MARKET_EMOJI] || '📊';

  const direction = signal.direction.toUpperCase();
  const rr = signal.riskRewardRatio.toFixed(2);

  // Calculate potential profit/loss percentages
  const calcPercent = (target: number) => {
    const raw = ((target - signal.entryPrice) / signal.entryPrice * 100);
    return signal.direction === 'long' ? raw : -raw;
  };
  const slPercent = calcPercent(signal.stopLoss);
  const tp1Percent = calcPercent(signal.takeProfit1);
  const tp2Percent = calcPercent(signal.takeProfit2);

  // TP3 line (only if exists)
  const tp3Line = signal.takeProfit3
    ? `\n🎯 TP3: <code>${formatPrice(signal.takeProfit3)}</code> (+${calcPercent(signal.takeProfit3).toFixed(1)}%)`
    : '';

  // Timeframe line
  const timeLine = signal.interval ? ` | ${signal.interval}` : '';

  const message = `
${directionEmoji} <b>TraderPath Signal</b> ${directionEmoji}

<b>━━━━━━━━━━━━━━━━━━━━</b>

${marketEmoji} <b>${signal.symbol}</b> | ${direction}${timeLine}

<b>━━━ Metrics ━━━</b>
🎯 Confidence: <b>${signal.overallConfidence}%</b> ${getConfidenceBadge(signal.overallConfidence)}
📊 Win Rate: <b>${signal.winRateEstimate != null ? signal.winRateEstimate + '%' : 'N/A'}</b>
⚖️ R:R = <b>${rr}</b>

<b>━━━ Trade Plan ━━━</b>
📍 Entry: <code>${formatPrice(signal.entryPrice)}</code>
🛑 SL: <code>${formatPrice(signal.stopLoss)}</code> (${slPercent.toFixed(1)}%)
🎯 TP1: <code>${formatPrice(signal.takeProfit1)}</code> (+${tp1Percent.toFixed(1)}%)
🎯 TP2: <code>${formatPrice(signal.takeProfit2)}</code> (+${tp2Percent.toFixed(1)}%)${tp3Line}

<b>━━━━━━━━━━━━━━━━━━━━</b>

⏰ ${new Date().toUTCString()}
🆔 <code>${signalId.slice(0, 8)}</code>

<i>Not financial advice. Past performance does not guarantee future results.</i>
<i>📊 TraderPath.io</i>
`.trim();

  return message;
}

/**
 * Format signal update (TP hit, SL hit, etc.)
 */
export function formatSignalUpdate(
  symbol: string,
  direction: string,
  outcome: 'tp1_hit' | 'tp2_hit' | 'sl_hit' | 'expired',
  entryPrice: number,
  outcomePrice: number,
  pnlPercent: number,
  signalId: string
): string {
  const emoji = {
    tp1_hit: '🎯',
    tp2_hit: '🎯🎯',
    sl_hit: '🛑',
    expired: '⏰',
  }[outcome];

  const resultText = {
    tp1_hit: 'TP1 HIT',
    tp2_hit: 'TP2 HIT',
    sl_hit: 'STOPPED OUT',
    expired: 'EXPIRED',
  }[outcome];

  const pnlEmoji = pnlPercent > 0 ? '💰' : '📉';
  const pnlColor = pnlPercent > 0 ? '+' : '';

  return `
${emoji} <b>Signal Update</b> ${emoji}

<b>${symbol}</b> | ${direction.toUpperCase()}

📊 Result: <b>${resultText}</b>
📍 Entry: <code>${formatPrice(entryPrice)}</code>
📍 Exit: <code>${formatPrice(outcomePrice)}</code>
${pnlEmoji} P/L: <b>${pnlColor}${pnlPercent.toFixed(2)}%</b>

🆔 <code>${signalId.slice(0, 8)}</code>
⏰ ${new Date().toUTCString()}
`.trim();
}

/**
 * Format daily summary
 */
export function formatDailySummary(stats: {
  total: number;
  wins: number;
  losses: number;
  totalPnL: number;
  bestSignal: { symbol: string; pnl: number } | null;
  worstSignal: { symbol: string; pnl: number } | null;
}): string {
  const winRate = stats.total > 0 ? (stats.wins / stats.total * 100).toFixed(1) : '0';
  const pnlEmoji = stats.totalPnL >= 0 ? '📈' : '📉';
  const pnlSign = stats.totalPnL >= 0 ? '+' : '';

  return `
📊 <b>Daily Signal Summary</b> 📊

<b>━━━━━━━━━━━━━━━━━━━━</b>

📢 Signals: <b>${stats.total}</b>
✅ Wins: <b>${stats.wins}</b>
❌ Losses: <b>${stats.losses}</b>
🎯 Win Rate: <b>${winRate}%</b>

${pnlEmoji} Total P/L: <b>${pnlSign}${stats.totalPnL.toFixed(2)}%</b>

${stats.bestSignal ? `🏆 Best: ${stats.bestSignal.symbol} (+${stats.bestSignal.pnl.toFixed(2)}%)` : ''}
${stats.worstSignal ? `📉 Worst: ${stats.worstSignal.symbol} (${stats.worstSignal.pnl.toFixed(2)}%)` : ''}

<b>━━━━━━━━━━━━━━━━━━━━</b>

⏰ ${new Date().toUTCString()}
<i>📊 Powered by TraderPath.io</i>
`.trim();
}

/**
 * Format Capital Flow alert
 */
export function formatCapitalFlowAlert(
  market: string,
  direction: 'BUY' | 'SELL',
  phase: string,
  flow7d: number,
  suggestedAssets: string[]
): string {
  const marketEmoji = MARKET_EMOJI[market as keyof typeof MARKET_EMOJI] || '📊';
  const directionEmoji = direction === 'BUY' ? '🟢' : '🔴';
  const phaseEmoji = PHASE_EMOJI[phase as keyof typeof PHASE_EMOJI] || '🌿';

  return `
${directionEmoji} <b>Capital Flow Alert</b> ${directionEmoji}

${marketEmoji} <b>${market.toUpperCase()}</b>

📊 Signal: <b>${direction}</b>
${phaseEmoji} Phase: <b>${phase.toUpperCase()}</b>
🌊 7D Flow: <b>${flow7d > 0 ? '+' : ''}${flow7d.toFixed(1)}%</b>

🎯 Watch List:
${suggestedAssets.map(a => `  • ${a}`).join('\n')}

⏰ ${new Date().toUTCString()}
<i>📊 TraderPath Capital Flow Radar</i>
`.trim();
}

// Utility functions

function formatPrice(price: number): string {
  if (price >= 1000) {
    return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  } else if (price >= 1) {
    return price.toFixed(4);
  } else if (price >= 0.0001) {
    return price.toFixed(6);
  } else {
    return price.toFixed(8);
  }
}
