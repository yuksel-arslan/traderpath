'use client';

// ===========================================
// TraderPath Professional Analysis Report
// ===========================================

import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

// ===========================================
// DATA INTERFACE
// ===========================================

export interface AnalysisReportData {
  symbol: string;
  generatedAt: string;
  analysisId: string;
  tradeType?: 'scalping' | 'dayTrade' | 'swing';
  chartImage?: string;

  marketPulse: {
    btcDominance: number;
    fearGreedIndex: number;
    fearGreedLabel: string;
    marketRegime?: string;
    trend: { direction: string; strength: number };
    btcPrice?: number;
    totalMarketCap?: number;
    altcoinSeasonIndex?: number;
    gate?: { canProceed: boolean; reason: string; confidence: number };
  };

  tokenomics?: {
    supply: {
      circulating: number;
      total: number | null;
      maxSupply: number | null;
      circulatingPercent: number;
      inflationRisk: 'low' | 'medium' | 'high';
    };
    market: {
      marketCap: number;
      fullyDilutedValuation: number | null;
      mcapFdvRatio: number;
      dilutionRisk: 'low' | 'medium' | 'high';
      liquidityHealth: 'excellent' | 'good' | 'moderate' | 'poor';
    };
    whaleConcentration: {
      concentrationRisk: 'low' | 'medium' | 'high';
      top10HoldersPercent: number | null;
    };
    assessment: {
      overallScore: number;
      riskLevel: 'low' | 'medium' | 'high';
      recommendation: string;
    };
  };

  assetScan: {
    symbol?: string;
    currentPrice: number;
    priceChange24h: number;
    volume24h?: number;
    timeframes?: Array<{ tf: string; trend: string; strength: number }>;
    forecast?: { price24h: number; price7d: number; confidence: number; scenarios?: Array<{ name: string; price: number; probability: number }> };
    levels?: { resistance: number[]; support: number[]; poc?: number };
    indicators: {
      rsi: number;
      macd: { value?: number; signal?: number; histogram: number };
      movingAverages?: { ma20: number; ma50: number; ma200: number };
      bollingerBands?: { upper: number; middle: number; lower: number };
      atr?: number;
    };
    direction?: 'long' | 'short' | null;
    directionConfidence?: number;
    gate?: { canProceed: boolean; reason: string; confidence: number };
    // Candlestick data for chart generation
    chartCandles?: Array<{
      timestamp: number;
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number;
    }>;
  };

  safetyCheck: {
    riskLevel: string;
    warnings?: string[];
    manipulation: { pumpDumpRisk: string; spoofingDetected?: boolean; layeringDetected?: boolean; icebergDetected?: boolean; washTrading?: boolean };
    whaleActivity: { bias: string; netFlowUsd?: number; largeBuys?: Array<{ amountUsd: number; price: number }>; largeSells?: Array<{ amountUsd: number; price: number }>; orderFlowImbalance?: number; orderFlowBias?: string };
    advancedMetrics?: { volumeSpike: boolean; volumeSpikeFactor: number; relativeVolume: number; pvt?: number; pvtTrend?: string; historicalVolatility?: number; liquidityScore?: number };
    smartMoney?: { positioning: string; confidence?: number };
    newsSentiment?: { overall: string; score: number; newsCount: number; positiveCount: number; negativeCount: number };
    gate?: { canProceed: boolean; reason: string; confidence: number; riskAdjustment?: number };
  };

  timing: {
    tradeNow: boolean;
    reason: string;
    conditions?: Array<{ name: string; met: boolean; details?: string }>;
    entryZones?: Array<{ priceLow: number; priceHigh: number; probability: number; quality?: number; eta?: string }>;
    optimalEntry?: number;
    waitFor?: { event: string; estimatedTime: string };
    gate?: { canProceed: boolean; reason: string; confidence: number; urgency?: string };
  };

  tradePlan: {
    direction: string;
    type?: string;
    entries?: Array<{ price: number; percentage: number; source?: string; type?: string }>;
    averageEntry: number;
    stopLoss: { price: number; percentage?: number; reason?: string; safetyAdjusted?: boolean };
    takeProfits: Array<{ price: number; percentage?: number; reason?: string; source?: string }>;
    riskReward: number;
    winRateEstimate?: number;
    positionSizePercent?: number;
    riskAmount?: number;
    trailingStop?: { activateAfter: string; trailPercent: number };
    sources?: { direction: string[]; entries: string[]; stopLoss: string[]; targets: string[] };
    confidence?: number;
    gate?: { canProceed: boolean; reason: string; confidence: number; planQuality?: string };
  };

  trapCheck?: {
    traps: { bullTrap: boolean; bullTrapZone?: number; bearTrap: boolean; bearTrapZone?: number; fakeoutRisk: string; liquidityGrab?: { detected: boolean; zones: number[] }; stopHuntZones?: number[] };
    liquidationLevels?: Array<{ price: number; amountUsd: number; type: string }>;
    counterStrategy?: string[];
    proTip?: string;
    riskLevel?: string;
    gate?: { canProceed: boolean; reason: string; confidence: number; trapRisk?: string };
  };

  verdict: {
    action?: string;
    verdict?: string;
    overallScore: number;
    aiSummary?: string;
    tokenomicsInsight?: string;
    componentScores?: Record<string, number>;
    confidenceFactors?: Array<{ factor: string; positive: boolean; impact?: string }>;
    recommendation?: string;
  };

  aiExpertComment?: string;

  indicatorDetails?: {
    trend?: Record<string, IndicatorDetailItem | undefined>;
    momentum?: Record<string, IndicatorDetailItem | undefined>;
    volatility?: Record<string, IndicatorDetailItem | undefined>;
    volume?: Record<string, IndicatorDetailItem | undefined>;
    advanced?: Record<string, IndicatorDetailItem | undefined>;
    divergences?: Array<{ type: 'bullish' | 'bearish' | 'none'; indicator: string; description: string; reliability: 'high' | 'medium' | 'low'; isEarlySignal: boolean }>;
    summary?: { bullishIndicators: number; bearishIndicators: number; neutralIndicators: number; totalIndicatorsUsed: number; overallSignal: 'bullish' | 'bearish' | 'neutral'; signalConfidence: number; leadingIndicatorsSignal: 'bullish' | 'bearish' | 'neutral' | 'mixed'; leadingIndicatorsCount?: number; laggingIndicatorsCount?: number };
  };
}

interface IndicatorDetailItem {
  name: string;
  value: number | string | null;
  signal: 'bullish' | 'bearish' | 'neutral';
  signalStrength: 'strong' | 'moderate' | 'weak';
  interpretation: string;
  category: 'trend' | 'momentum' | 'volatility' | 'volume' | 'advanced';
  isLeadingIndicator: boolean;
  weight: number;
  metadata?: Record<string, unknown>;
}

// ===========================================
// HELPERS
// ===========================================

function formatPrice(price: number | undefined): string {
  if (!price || isNaN(price)) return '-';
  if (price >= 10000) return `$${price.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  if (price >= 100) return `$${price.toFixed(2)}`;
  if (price >= 1) return `$${price.toFixed(4)}`;
  return `$${price.toFixed(6)}`;
}

function formatLargeNumber(num: number | undefined | null): string {
  if (!num) return '-';
  if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
  return `$${num.toFixed(0)}`;
}

function formatVolume(vol: number | undefined): string {
  if (!vol) return '-';
  if (vol >= 1e9) return `$${(vol / 1e9).toFixed(2)}B`;
  if (vol >= 1e6) return `$${(vol / 1e6).toFixed(2)}M`;
  if (vol >= 1e3) return `$${(vol / 1e3).toFixed(2)}K`;
  return `$${vol.toFixed(0)}`;
}

function formatPercent(val: number | undefined): string {
  if (val === undefined || isNaN(val)) return '-';
  let pct: number;
  if (val <= 1) pct = val * 100;
  else if (val <= 10) pct = val * 10;
  else pct = val;
  const capped = Math.min(Math.max(pct, 0), 100);
  return `${capped.toFixed(0)}%`;
}

function formatRiskReward(rr: number | undefined): string {
  if (!rr || isNaN(rr)) return '-';
  return `1:${rr.toFixed(2)}`;
}

function formatRegime(regime: string | undefined): string {
  if (!regime) return 'Normal';
  const map: Record<string, string> = {
    'risk_on': 'Risk On', 'risk_off': 'Risk Off', 'risk-on': 'Risk On', 'risk-off': 'Risk Off',
    'normal': 'Normal', 'volatile': 'Volatile', 'trending': 'Trending', 'ranging': 'Ranging'
  };
  return map[regime.toLowerCase()] || regime.charAt(0).toUpperCase() + regime.slice(1).replace(/_/g, ' ');
}

function formatDirection(dir: string | null | undefined): string {
  if (!dir) return 'Neutral';
  return dir.charAt(0).toUpperCase() + dir.slice(1);
}

function getGateStatus(gate: { canProceed?: boolean; passed?: boolean; confidence: number } | undefined): { text: string; color: string } {
  if (!gate) return { text: '', color: '#666' };
  const conf = formatPercent(gate.confidence);
  // Support both canProceed and passed properties
  const isPassed = gate.canProceed ?? gate.passed ?? false;
  return isPassed ? { text: `Passed ${conf}`, color: '#16a34a' } : { text: `Review ${conf}`, color: '#d97706' };
}

function formatAction(actionOrVerdict: string | undefined): string {
  if (!actionOrVerdict) return 'WAIT';
  const map: Record<string, string> = {
    'go': 'GO', 'conditional_go': 'Conditionally GO', 'conditionally_go': 'Conditionally GO',
    'wait': 'WAIT', 'no_go': 'NO GO', 'avoid': 'AVOID', 'stop': 'STOP', 'hold': 'HOLD',
    'long': 'LONG', 'short': 'SHORT', 'neutral': 'WAIT',
  };
  const lower = actionOrVerdict.toLowerCase().replace(/-/g, '_');
  return map[lower] || actionOrVerdict.toUpperCase().replace(/_/g, ' ');
}

function getVerdictAction(v: { action?: string; verdict?: string } | undefined): string {
  return v?.action || v?.verdict || '';
}

function formatIndicatorValue(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'string') return value;
  if (isNaN(value)) return '-';
  if (Math.abs(value) >= 1000) return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (Math.abs(value) >= 1) return value.toFixed(2);
  return value.toFixed(4);
}

function renderIndicatorTable(indicators: Record<string, IndicatorDetailItem | undefined> | undefined, title: string, maxItems: number = 8): string {
  if (!indicators) return '';
  const items = Object.values(indicators).filter((i): i is IndicatorDetailItem => i !== undefined);
  if (items.length === 0) return '';

  // Sort by signal strength - leading indicators first, then by signal strength
  const sortedItems = items.sort((a, b) => {
    if (a.isLeadingIndicator && !b.isLeadingIndicator) return -1;
    if (!a.isLeadingIndicator && b.isLeadingIndicator) return 1;
    const strengthOrder = { strong: 0, moderate: 1, weak: 2 };
    return (strengthOrder[a.signalStrength] || 2) - (strengthOrder[b.signalStrength] || 2);
  });

  return `
    <div class="section" style="margin-bottom: 6px;">
      <div style="font-size: 7px; font-weight: 600; margin-bottom: 3px; color: #333;">${title} (${items.length} indicators analyzed)</div>
      <table class="table indicator-table">
        <tr><th style="width: 22%;">Indicator</th><th style="width: 13%;">Value</th><th style="width: 13%;">Signal</th><th style="width: 52%;">Interpretation</th></tr>
        ${sortedItems.slice(0, maxItems).map(ind => `
          <tr>
            <td style="font-weight: 500;">${ind.name}${ind.isLeadingIndicator ? ' ★' : ''}</td>
            <td>${formatIndicatorValue(ind.value)}</td>
            <td class="${ind.signal === 'bullish' ? 'text-green' : ind.signal === 'bearish' ? 'text-red' : ''}" style="font-weight: 600;">${ind.signal.toUpperCase()}</td>
            <td style="font-size: 6px;">${ind.interpretation?.slice(0, 55) || '-'}${(ind.interpretation?.length || 0) > 55 ? '...' : ''}</td>
          </tr>
        `).join('')}
        ${items.length > maxItems ? `
        <tr style="background: #f0f9ff;">
          <td colspan="4" style="text-align: center; font-size: 6px; color: #0369a1; font-style: italic;">
            + ${items.length - maxItems} more ${title.toLowerCase()} analyzed...
          </td>
        </tr>
        ` : ''}
      </table>
    </div>
  `;
}

const logoSvg = `<svg width="32" height="32" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="tealGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#5EEDC3"/><stop offset="50%" stop-color="#2DD4A8"/><stop offset="100%" stop-color="#14B8A6"/>
    </linearGradient>
    <linearGradient id="coralGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FF8A9B"/><stop offset="50%" stop-color="#F87171"/><stop offset="100%" stop-color="#EF5A6F"/>
    </linearGradient>
  </defs>
  <path d="M100 10 L120 80 L100 100 L80 80 Z" fill="url(#tealGradient)"/>
  <path d="M190 100 L120 120 L100 100 L120 80 Z" fill="url(#tealGradient)"/>
  <path d="M100 190 L80 120 L100 100 L120 120 Z" fill="url(#coralGradient)"/>
  <path d="M10 100 L80 80 L100 100 L80 120 Z" fill="url(#coralGradient)"/>
</svg>`;

// ===========================================
// STYLES
// ===========================================

const styles = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 9px; color: #1a1a1a; background: #fff; line-height: 1.35; }
  .page { width: 595px; height: 842px; padding: 20px 24px; position: relative; }
  .header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 10px; border-bottom: 2px solid #1a1a1a; margin-bottom: 12px; }
  .brand { display: flex; flex-direction: column; align-items: center; gap: 4px; }
  .logo { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; }
  .brand-name { font-size: 14px; font-weight: 700; letter-spacing: -0.5px; }
  .brand-trade { color: #dc2626; }
  .brand-path { color: #16a34a; }
  .header-center { text-align: center; }
  .report-title { font-size: 11px; font-weight: 600; color: #1a1a1a; text-transform: uppercase; letter-spacing: 1px; }
  .report-subtitle { font-size: 8px; color: #666; margin-top: 2px; }
  .header-right { text-align: right; }
  .symbol { font-size: 14px; font-weight: 700; }
  .direction-tag { display: inline-block; font-size: 10px; font-weight: 700; margin-left: 6px; }
  .tag-long { color: #16a34a; }
  .tag-short { color: #dc2626; }
  .score-box { margin-top: 4px; }
  .score-value { font-size: 16px; font-weight: 700; }
  .score-label { font-size: 7px; color: #666; }
  .section { margin-bottom: 10px; }
  .section-header { display: flex; align-items: baseline; gap: 8px; margin-bottom: 5px; border-bottom: 1px solid #e0e0e0; padding-bottom: 3px; }
  .step-num { font-size: 8px; font-weight: 600; color: #666; }
  .section-title { font-size: 10px; font-weight: 600; color: #1a1a1a; }
  .step-box { border: 1px solid #e0e0e0; border-radius: 6px; padding: 8px 10px; margin-bottom: 8px; background: #fafafa; }
  .step-box-header { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; padding-bottom: 5px; border-bottom: 1px solid #eee; }
  .step-box-num { font-size: 9px; font-weight: 700; color: #666; }
  .step-box-title { font-size: 10px; font-weight: 600; color: #1a1a1a; }
  .step-box-gate { margin-left: auto; font-size: 7px; font-weight: 600; }
  .row { display: flex; gap: 6px; margin-bottom: 5px; }
  .col { flex: 1; }
  .col-2 { flex: 2; }
  .metric { background: #fafafa; border: 1px solid #eee; border-radius: 3px; padding: 5px 7px; }
  .metric-sm { padding: 3px 5px; }
  .metric-label { font-size: 6px; color: #666; text-transform: uppercase; letter-spacing: 0.3px; }
  .metric-value { font-size: 10px; font-weight: 600; color: #1a1a1a; margin-top: 1px; }
  .metric-value-lg { font-size: 12px; }
  .metric-value-xl { font-size: 18px; }
  .metric-note { font-size: 6px; color: #888; margin-top: 1px; }
  .text-green { color: #16a34a; }
  .text-red { color: #dc2626; }
  .text-amber { color: #d97706; }
  .text-muted { color: #666; }
  .list { display: grid; grid-template-columns: 1fr 1fr; gap: 2px 10px; }
  .list-item { display: flex; align-items: center; gap: 5px; padding: 2px 0; font-size: 7px; }
  .list-icon { width: 10px; text-align: center; font-weight: 600; }
  .list-icon-y { color: #16a34a; }
  .list-icon-n { color: #dc2626; }
  .table { width: 100%; border-collapse: collapse; }
  .table th { text-align: left; font-size: 6px; font-weight: 600; color: #666; text-transform: uppercase; padding: 3px 5px; border-bottom: 1px solid #ddd; background: #f9fafb; }
  .table td { font-size: 7px; padding: 3px 5px; border-bottom: 1px solid #f0f0f0; }
  .table tr:last-child td { border-bottom: none; }
  .indicator-table th { font-size: 5px; padding: 2px 3px; }
  .indicator-table td { font-size: 6px; padding: 2px 3px; }
  .verdict-box { border: 2px solid #1a1a1a; border-radius: 6px; padding: 15px; margin-bottom: 12px; text-align: center; }
  .verdict-action { font-size: 28px; font-weight: 700; }
  .verdict-subtitle { font-size: 9px; color: #666; margin-top: 6px; line-height: 1.5; }
  .chart-container { border: 1px solid #ddd; border-radius: 6px; background: #fff; padding: 8px; margin: 10px 0; }
  .chart-container img { width: 100%; height: auto; display: block; }
  .summary-box { background: #f8f9fa; border-left: 3px solid #1a1a1a; padding: 8px 10px; margin-top: 8px; }
  .summary-text { font-size: 8px; color: #333; line-height: 1.5; }
  .step-summary { font-size: 7px; color: #333; background: #f0f9f0; border-left: 2px solid #16a34a; padding: 6px 8px; margin-top: 8px; line-height: 1.5; }
  .step-summary-title { font-size: 7px; font-weight: 600; color: #16a34a; margin-bottom: 3px; }
  .step-box-expanded { border: 1px solid #e0e0e0; border-radius: 6px; padding: 12px 14px; margin-bottom: 10px; background: #fafafa; min-height: 200px; }
  .footer { position: absolute; bottom: 8px; left: 24px; right: 24px; font-size: 6px; color: #999; border-top: 1px solid #eee; padding-top: 4px; }
  .footer-row { display: flex; justify-content: space-between; align-items: center; }
  .footer-disclaimer { font-size: 5px; color: #b91c1c; margin-top: 2px; line-height: 1.3; }
`;

const DISCLAIMER_TEXT = 'RISK DISCLAIMER: This report is for educational purposes only. Not financial advice. Crypto trading involves substantial risk. DYOR. Never invest more than you can afford to lose.';

// ===========================================
// SVG CHART GENERATOR FOR TRADE PLAN
// Generates candlestick chart with entry/SL/TP levels
// ===========================================

interface ChartCandle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

function generateTradePlanSvgChart(
  tp: AnalysisReportData['tradePlan'] | undefined,
  as: AnalysisReportData['assetScan'] | undefined,
  chartCandles?: ChartCandle[]
): string {
  if (!tp?.averageEntry) {
    return `<div style="text-align: center; color: #9ca3af; padding: 150px 0;">
      <div style="font-size: 48px; margin-bottom: 10px;">📊</div>
      <div style="font-size: 12px; font-weight: 600; color: #fff;">Trade Plan Data Not Available</div>
    </div>`;
  }

  const entry = tp.averageEntry || 0;
  const sl = tp.stopLoss?.price || 0;
  const tp1 = tp.takeProfits?.[0]?.price || 0;
  const tp2 = tp.takeProfits?.[1]?.price || 0;
  const tp3 = tp.takeProfits?.[2]?.price || 0;
  const current = as?.currentPrice || entry;
  const isLong = tp.direction === 'long';

  // Get candle data (use provided or empty)
  const candles = chartCandles && chartCandles.length > 0 ? chartCandles.slice(-40) : [];
  const hasCandles = candles.length > 0;

  // Calculate price range (include candles if available)
  const tradeLevelPrices = [entry, sl, tp1, tp2, tp3, current].filter(p => p > 0);
  const candleHighs = candles.map(c => c.high);
  const candleLows = candles.map(c => c.low);
  const allPrices = [...tradeLevelPrices, ...candleHighs, ...candleLows].filter(p => p > 0);

  const dataMin = Math.min(...allPrices);
  const dataMax = Math.max(...allPrices);
  const padding = (dataMax - dataMin) * 0.05;
  const minPrice = dataMin - padding;
  const maxPrice = dataMax + padding;
  const priceRange = maxPrice - minPrice;

  // SVG dimensions
  const width = 520;
  const height = 420;
  const chartLeft = 70;
  const chartRight = width - 15;
  const chartTop = 35;
  const chartBottom = height - 50;
  const chartWidth = chartRight - chartLeft;
  const chartHeight = chartBottom - chartTop;

  // Helper function to convert price to Y coordinate
  const priceToY = (price: number): number => {
    return chartBottom - ((price - minPrice) / priceRange) * chartHeight;
  };

  // Generate candlesticks SVG
  const generateCandlesticks = (): string => {
    if (!hasCandles) return '';

    const candleWidth = Math.max(3, Math.floor((chartWidth - 20) / candles.length) - 2);
    const wickWidth = 1;
    const gap = 2;
    const totalCandleWidth = candleWidth + gap;
    const startX = chartLeft + 10;

    return candles.map((candle, i) => {
      const x = startX + (i * totalCandleWidth);
      const isGreen = candle.close >= candle.open;
      const color = isGreen ? '#22c55e' : '#ef4444';
      const bodyTop = priceToY(Math.max(candle.open, candle.close));
      const bodyBottom = priceToY(Math.min(candle.open, candle.close));
      const bodyHeight = Math.max(1, bodyBottom - bodyTop);
      const wickTop = priceToY(candle.high);
      const wickBottom = priceToY(candle.low);
      const candleCenterX = x + candleWidth / 2;

      return `
        <!-- Wick -->
        <line x1="${candleCenterX}" y1="${wickTop}" x2="${candleCenterX}" y2="${wickBottom}" stroke="${color}" stroke-width="${wickWidth}"/>
        <!-- Body -->
        <rect x="${x}" y="${bodyTop}" width="${candleWidth}" height="${bodyHeight}" fill="${color}" rx="1"/>
      `;
    }).join('');
  };

  // Generate price axis labels (5 levels)
  const priceLabels: string[] = [];
  for (let i = 0; i <= 4; i++) {
    const price = minPrice + (priceRange * i) / 4;
    const y = priceToY(price);
    priceLabels.push(`<text x="${chartLeft - 5}" y="${y + 3}" fill="#9ca3af" font-size="8" text-anchor="end">${formatPrice(price)}</text>`);
    priceLabels.push(`<line x1="${chartLeft}" y1="${y}" x2="${chartRight}" y2="${y}" stroke="#374151" stroke-width="0.5" stroke-dasharray="3,3"/>`);
  }

  // Generate level lines and labels
  const levelLines: string[] = [];

  // Stop Loss line
  if (sl > 0) {
    const y = priceToY(sl);
    levelLines.push(`
      <line x1="${chartLeft}" y1="${y}" x2="${chartRight}" y2="${y}" stroke="#ef4444" stroke-width="2" stroke-dasharray="5,3"/>
      <rect x="${chartRight - 85}" y="${y - 9}" width="82" height="16" fill="#ef4444" rx="2"/>
      <text x="${chartRight - 80}" y="${y + 3}" fill="#fff" font-size="7" font-weight="600">STOP ${formatPrice(sl)}</text>
    `);
  }

  // Entry line
  if (entry > 0) {
    const y = priceToY(entry);
    levelLines.push(`
      <line x1="${chartLeft}" y1="${y}" x2="${chartRight}" y2="${y}" stroke="#fbbf24" stroke-width="2"/>
      <rect x="${chartLeft + 5}" y="${y - 9}" width="82" height="16" fill="#fbbf24" rx="2"/>
      <text x="${chartLeft + 10}" y="${y + 3}" fill="#000" font-size="7" font-weight="600">ENTRY ${formatPrice(entry)}</text>
    `);
  }

  // Take Profit lines
  const tpColors = ['#3b82f6', '#8b5cf6', '#a855f7'];
  const tpPrices = [tp1, tp2, tp3];
  tpPrices.forEach((price, i) => {
    if (price > 0) {
      const y = priceToY(price);
      levelLines.push(`
        <line x1="${chartLeft}" y1="${y}" x2="${chartRight}" y2="${y}" stroke="${tpColors[i]}" stroke-width="2" stroke-dasharray="8,4"/>
        <rect x="${chartRight - 85}" y="${y - 9}" width="82" height="16" fill="${tpColors[i]}" rx="2"/>
        <text x="${chartRight - 80}" y="${y + 3}" fill="#fff" font-size="7" font-weight="600">TP${i + 1} ${formatPrice(price)}</text>
      `);
    }
  });

  // Risk/Reward visualization
  const rrRatio = tp.riskReward || 0;
  const winRate = tp.winRateEstimate || 0;

  return `
    <svg width="100%" height="100%" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#1a1a2e;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#16162a;stop-opacity:1" />
        </linearGradient>
        <linearGradient id="profitZone" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" style="stop-color:#22c55e;stop-opacity:0.05" />
          <stop offset="100%" style="stop-color:#22c55e;stop-opacity:0.15" />
        </linearGradient>
        <linearGradient id="lossZone" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#ef4444;stop-opacity:0.05" />
          <stop offset="100%" style="stop-color:#ef4444;stop-opacity:0.15" />
        </linearGradient>
      </defs>

      <!-- Background -->
      <rect width="${width}" height="${height}" fill="url(#bgGrad)" rx="8"/>

      <!-- Title -->
      <text x="${width / 2}" y="22" fill="#fff" font-size="11" font-weight="600" text-anchor="middle">
        ${as?.symbol || 'Trade'} - ${isLong ? '📈 LONG' : '📉 SHORT'} Trade Plan ${hasCandles ? `(${candles.length} candles)` : ''}
      </text>

      <!-- Chart area border -->
      <rect x="${chartLeft}" y="${chartTop}" width="${chartWidth}" height="${chartHeight}" fill="none" stroke="#374151" stroke-width="1" rx="4"/>

      <!-- Profit/Loss zones (behind candles) -->
      ${entry > 0 && sl > 0 && tp1 > 0 ? `
        <rect x="${chartLeft + 1}" y="${priceToY(isLong ? tp1 : entry)}" width="${chartWidth - 2}" height="${Math.abs(priceToY(entry) - priceToY(tp1))}" fill="url(#profitZone)"/>
        <rect x="${chartLeft + 1}" y="${priceToY(isLong ? entry : sl)}" width="${chartWidth - 2}" height="${Math.abs(priceToY(sl) - priceToY(entry))}" fill="url(#lossZone)"/>
      ` : ''}

      <!-- Price axis labels and grid -->
      ${priceLabels.join('')}

      <!-- Candlesticks -->
      ${generateCandlesticks()}

      <!-- Level lines (on top of candles) -->
      ${levelLines.join('')}

      <!-- Legend -->
      <rect x="${chartLeft}" y="${chartBottom + 8}" width="${chartWidth}" height="35" fill="#1e293b" rx="4"/>
      <circle cx="${chartLeft + 15}" cy="${chartBottom + 20}" r="4" fill="#fbbf24"/>
      <text x="${chartLeft + 25}" y="${chartBottom + 23}" fill="#9ca3af" font-size="7">Entry</text>
      <circle cx="${chartLeft + 70}" cy="${chartBottom + 20}" r="4" fill="#ef4444"/>
      <text x="${chartLeft + 80}" y="${chartBottom + 23}" fill="#9ca3af" font-size="7">Stop Loss</text>
      <circle cx="${chartLeft + 140}" cy="${chartBottom + 20}" r="4" fill="#3b82f6"/>
      <text x="${chartLeft + 150}" y="${chartBottom + 23}" fill="#9ca3af" font-size="7">Targets</text>

      <!-- R:R and Win Rate -->
      ${rrRatio > 0 ? `
        <text x="${chartRight - 100}" y="${chartBottom + 23}" fill="#fbbf24" font-size="8" font-weight="600">R:R ${rrRatio.toFixed(1)}:1</text>
      ` : ''}
      ${winRate > 0 ? `
        <text x="${chartRight - 40}" y="${chartBottom + 23}" fill="#22c55e" font-size="8" font-weight="600">${winRate.toFixed(0)}%</text>
      ` : ''}

      <!-- Candle legend -->
      ${hasCandles ? `
        <rect x="${chartLeft + 15}" y="${chartBottom + 30}" width="8" height="8" fill="#22c55e" rx="1"/>
        <text x="${chartLeft + 28}" y="${chartBottom + 37}" fill="#9ca3af" font-size="6">Bullish</text>
        <rect x="${chartLeft + 70}" y="${chartBottom + 30}" width="8" height="8" fill="#ef4444" rx="1"/>
        <text x="${chartLeft + 83}" y="${chartBottom + 37}" fill="#9ca3af" font-size="6">Bearish</text>
      ` : `
        <text x="${chartLeft + 15}" y="${chartBottom + 37}" fill="#6b7280" font-size="6" font-style="italic">No candlestick data available</text>
      `}
    </svg>
  `;
}

function generateFooter(data: AnalysisReportData, pageNum: number, totalPages: number): string {
  return `
    <div class="footer">
      <div class="footer-row">
        <span><span class="brand-trade">Trader</span><span class="brand-path">Path</span> | ID: ${data.analysisId?.slice(-10) || '-'}</span>
        <span>Page ${pageNum} of ${totalPages}</span>
      </div>
      <div class="footer-disclaimer">${DISCLAIMER_TEXT}</div>
    </div>`;
}

// ===========================================
// PAGE 1: Executive Summary
// ===========================================

function generatePageExecutiveSummary(data: AnalysisReportData, totalPages: number): string {
  const tp = data.tradePlan;
  const v = data.verdict;
  const as = data.assetScan;
  const mp = data.marketPulse;
  const direction = tp?.direction;
  const isLong = direction === 'long';
  const isShort = direction === 'short';
  const hasDirection = direction === 'long' || direction === 'short';
  const score = formatPercent(v?.overallScore);
  const tradeTypes: Record<string, string> = { scalping: 'Scalping', dayTrade: 'Day Trade', swing: 'Swing Trade' };

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${styles}</style></head><body>
  <div class="page">
    <!-- Centered Brand Header for Executive Summary - Logo on top, Brand below -->
    <div style="text-align: center; padding: 15px 0 20px 0; border-bottom: 2px solid #1a1a1a; margin-bottom: 15px;">
      <div style="display: flex; flex-direction: column; align-items: center; gap: 6px; margin-bottom: 8px;">
        <div class="logo" style="width: 48px; height: 48px;">${logoSvg.replace('width="32" height="32"', 'width="48" height="48"')}</div>
        <div class="brand-name" style="font-size: 28px;"><span class="brand-trade">Trader</span><span class="brand-path">Path</span></div>
      </div>
      <div style="font-size: 11px; font-weight: 600; color: #1a1a1a; text-transform: uppercase; letter-spacing: 1px;">Executive Summary</div>
      <div style="font-size: 9px; color: #666; margin-top: 3px;">${tradeTypes[data.tradeType || ''] || 'Analysis'} | ${data.generatedAt}</div>
      <div style="margin-top: 8px;">
        <span class="symbol" style="font-size: 18px;">${data.symbol}/USDT</span>
        <span class="direction-tag ${hasDirection ? (isLong ? 'tag-long' : 'tag-short') : ''}" style="font-size: 14px; margin-left: 10px; ${!hasDirection ? 'background: #fef3c7; color: #d97706;' : ''}">${hasDirection ? (isLong ? 'LONG' : 'SHORT') : 'WAIT'}</span>
      </div>
    </div>

    <!-- Direction & Quick Stats Box (No verdict here - verdict is on final page) -->
    <div class="step-box" style="background: ${hasDirection ? (isLong ? 'linear-gradient(135deg, #f0fdf4, #dcfce7)' : 'linear-gradient(135deg, #fef2f2, #fee2e2)') : 'linear-gradient(135deg, #fef3c7, #fde68a)'}; border: 1px solid ${hasDirection ? (isLong ? '#16a34a' : '#dc2626') : '#d97706'}; padding: 10px 15px;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div style="font-size: 8px; color: #666; margin-bottom: 2px;">POSITION TYPE</div>
          <div style="font-size: 18px; font-weight: 700; ${hasDirection ? (isLong ? 'color: #16a34a' : 'color: #dc2626') : 'color: #d97706'}">${hasDirection ? (isLong ? 'LONG' : 'SHORT') : 'WAIT'}</div>
        </div>
        <div style="text-align: center;">
          <div style="font-size: 8px; color: #666; margin-bottom: 2px;">CONFIDENCE</div>
          <div style="font-size: 20px; font-weight: 800; color: #1a1a1a;">${score}</div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 8px; color: #666; margin-bottom: 2px;">RISK:REWARD</div>
          <div style="font-size: 18px; font-weight: 700; color: #1a1a1a;">${formatRiskReward(tp?.riskReward)}</div>
        </div>
      </div>
    </div>

    <!-- Key Metrics Row -->
    <div class="row" style="margin-bottom: 15px;">
      <div class="col metric" style="text-align: center;">
        <div class="metric-label">Current Price</div>
        <div class="metric-value-lg">${formatPrice(as?.currentPrice)}</div>
        <div class="metric-note ${(as?.priceChange24h || 0) >= 0 ? 'text-green' : 'text-red'}">${(as?.priceChange24h || 0) >= 0 ? '+' : ''}${as?.priceChange24h?.toFixed(2) || '0'}% 24h</div>
      </div>
      <div class="col metric" style="text-align: center;">
        <div class="metric-label">Entry Price</div>
        <div class="metric-value-lg">${formatPrice(tp?.averageEntry)}</div>
      </div>
      <div class="col metric" style="text-align: center;">
        <div class="metric-label">Stop Loss</div>
        <div class="metric-value-lg text-red">${formatPrice(tp?.stopLoss?.price)}</div>
        <div class="metric-note">${tp?.stopLoss?.percentage ? `-${tp.stopLoss.percentage.toFixed(1)}%` : ''}</div>
      </div>
      <div class="col metric" style="text-align: center;">
        <div class="metric-label">Risk:Reward</div>
        <div class="metric-value-lg">${formatRiskReward(tp?.riskReward)}</div>
      </div>
    </div>

    <!-- Take Profit Targets -->
    <div class="step-box">
      <div class="step-box-header">
        <span class="step-box-title">Take Profit Targets</span>
      </div>
      <div class="row">
        ${(tp?.takeProfits || []).slice(0, 4).map((t, i) => `
          <div class="col metric" style="text-align: center;">
            <div class="metric-label">Target ${i + 1}</div>
            <div class="metric-value text-green">${formatPrice(t.price)}</div>
            <div class="metric-note">${t.percentage ? `+${t.percentage.toFixed(1)}%` : ''}</div>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- Market Context -->
    <div class="row">
      <div class="col metric metric-sm">
        <div class="metric-label">Market Trend</div>
        <div class="metric-value ${mp?.trend?.direction === 'bullish' ? 'text-green' : mp?.trend?.direction === 'bearish' ? 'text-red' : ''}">${formatDirection(mp?.trend?.direction)}</div>
      </div>
      <div class="col metric metric-sm">
        <div class="metric-label">Fear & Greed</div>
        <div class="metric-value">${mp?.fearGreedIndex || 0}</div>
        <div class="metric-note">${mp?.fearGreedLabel || ''}</div>
      </div>
      <div class="col metric metric-sm">
        <div class="metric-label">RSI</div>
        <div class="metric-value ${(as?.indicators?.rsi || 50) >= 70 ? 'text-red' : (as?.indicators?.rsi || 50) <= 30 ? 'text-green' : ''}">${as?.indicators?.rsi?.toFixed(0) || '-'}</div>
      </div>
      <div class="col metric metric-sm">
        <div class="metric-label">Volume 24h</div>
        <div class="metric-value">${formatVolume(as?.volume24h)}</div>
      </div>
    </div>

    <!-- AI Summary -->
    <div class="summary-box" style="margin-top: 15px;">
      <div style="font-size: 9px; font-weight: 600; margin-bottom: 5px;">AI Analysis Summary</div>
      <div class="summary-text">${v?.aiSummary || v?.recommendation || 'Analysis complete. See detailed report for full insights.'}</div>
    </div>

    <!-- Note about full report -->
    <div style="margin-top: 15px; padding: 10px; background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 4px; text-align: center;">
      <div style="font-size: 9px; color: #0369a1; font-weight: 600;">📊 Full detailed analysis available in the following pages</div>
    </div>

    ${generateFooter(data, 1, totalPages)}
  </div>
</body></html>`;
}

// ===========================================
// PAGE 2: Trade Plan (Full Page Chart)
// ===========================================

function generatePageTradePlan(data: AnalysisReportData, totalPages: number): string {
  const tp = data.tradePlan;
  const as = data.assetScan;
  const isLong = tp?.direction === 'long';

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${styles}</style></head><body>
  <div class="page">
    <div class="header">
      <div class="brand">
        <div class="logo">${logoSvg}</div>
        <div class="brand-name"><span class="brand-trade">Trader</span><span class="brand-path">Path</span></div>
      </div>
      <div class="header-center">
        <div class="report-title">Trade Plan</div>
      </div>
      <div class="header-right">
        <span class="symbol">${data.symbol}/USDT</span>
        <span class="direction-tag ${isLong ? 'tag-long' : 'tag-short'}">${isLong ? 'LONG' : 'SHORT'}</span>
      </div>
    </div>

    <!-- Trade Levels Table -->
    <table class="table" style="margin-bottom: 10px;">
      <tr><th style="width: 25%;">Level</th><th style="width: 25%;">Price</th><th style="width: 20%;">Change</th><th style="width: 30%;">Note</th></tr>
      <tr style="background: #f0fdf4;">
        <td style="font-weight: 600;">Entry</td>
        <td style="font-weight: 700; font-size: 9px;">${formatPrice(tp?.averageEntry)}</td>
        <td>-</td>
        <td style="font-size: 6px;">${tp?.entries?.length ? `${tp.entries.length} entry zones` : 'Single entry'}</td>
      </tr>
      <tr style="background: #fef2f2;">
        <td style="font-weight: 600;">Stop Loss</td>
        <td style="font-weight: 700; font-size: 9px;" class="text-red">${formatPrice(tp?.stopLoss?.price)}</td>
        <td class="text-red">${tp?.stopLoss?.percentage ? `-${tp.stopLoss.percentage.toFixed(2)}%` : ''}</td>
        <td style="font-size: 6px;">${tp?.stopLoss?.reason?.slice(0, 30) || ''}</td>
      </tr>
      ${(tp?.takeProfits || []).slice(0, 3).map((t, i) => `
        <tr>
          <td style="font-weight: 600;">Target ${i + 1}</td>
          <td style="font-weight: 700; font-size: 9px;" class="text-green">${formatPrice(t.price)}</td>
          <td class="text-green">${t.percentage ? `+${t.percentage.toFixed(1)}%` : ''}</td>
          <td style="font-size: 6px;">${t.reason?.slice(0, 30) || ''}</td>
        </tr>
      `).join('')}
    </table>

    <!-- Full Page Chart with Dark Background -->
    ${data.chartImage ? `
    <div class="chart-container" style="height: 480px; display: flex; align-items: center; justify-content: center; background: #1a1a2e; border-radius: 8px;">
      <img src="${data.chartImage}" style="max-height: 100%; width: auto; max-width: 100%; border-radius: 6px;" alt="Trade Plan Chart" />
    </div>
    ` : `
    <div class="chart-container" style="height: 480px; background: linear-gradient(135deg, #1a1a2e, #16213e); border-radius: 8px; padding: 15px;">
      ${generateTradePlanSvgChart(tp, as, as?.chartCandles)}
    </div>
    `}

    <!-- Key Levels Summary -->
    <div class="row" style="margin-top: 10px;">
      ${as?.levels?.support ? `
      <div class="col metric metric-sm">
        <div class="metric-label">Support Levels</div>
        <div class="metric-value text-green" style="font-size: 8px;">${as.levels.support.slice(0, 3).map(s => formatPrice(s)).join(' | ')}</div>
      </div>
      ` : ''}
      ${as?.levels?.resistance ? `
      <div class="col metric metric-sm">
        <div class="metric-label">Resistance Levels</div>
        <div class="metric-value text-red" style="font-size: 8px;">${as.levels.resistance.slice(0, 3).map(r => formatPrice(r)).join(' | ')}</div>
      </div>
      ` : ''}
    </div>

    ${generateFooter(data, 2, totalPages)}
  </div>
</body></html>`;
}

// ===========================================
// PAGE 3: Tokenomics
// ===========================================

function generatePageTokenomics(data: AnalysisReportData, totalPages: number): string {
  const tk = data.tokenomics;
  const as = data.assetScan;

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${styles}</style></head><body>
  <div class="page">
    <div class="header">
      <div class="brand">
        <div class="logo">${logoSvg}</div>
        <div class="brand-name"><span class="brand-trade">Trader</span><span class="brand-path">Path</span></div>
      </div>
      <div class="header-center">
        <div class="report-title">Tokenomics Analysis</div>
      </div>
      <div class="header-right">
        <span class="symbol">${data.symbol}/USDT</span>
      </div>
    </div>

    ${tk ? `
    <!-- Overall Assessment -->
    <div class="verdict-box" style="padding: 12px; margin-bottom: 15px;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div style="font-size: 10px; color: #666; margin-bottom: 3px;">Tokenomics Score</div>
          <div style="font-size: 32px; font-weight: 700; ${tk.assessment.overallScore >= 70 ? 'color: #16a34a' : tk.assessment.overallScore < 40 ? 'color: #dc2626' : 'color: #d97706'}">${tk.assessment.overallScore}/100</div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 10px; color: #666; margin-bottom: 3px;">Risk Level</div>
          <div style="font-size: 18px; font-weight: 700; ${tk.assessment.riskLevel === 'low' ? 'color: #16a34a' : tk.assessment.riskLevel === 'high' ? 'color: #dc2626' : 'color: #d97706'}">${formatDirection(tk.assessment.riskLevel)}</div>
        </div>
      </div>
      <div style="margin-top: 10px; font-size: 8px; color: #444; border-top: 1px solid #eee; padding-top: 8px;">${tk.assessment.recommendation}</div>
    </div>

    <!-- Supply Information -->
    <div class="step-box">
      <div class="step-box-header">
        <span class="step-box-title">Supply Information</span>
      </div>
      <div class="row">
        <div class="col metric">
          <div class="metric-label">Circulating Supply</div>
          <div class="metric-value">${tk.supply.circulating?.toLocaleString() || '-'}</div>
          <div class="metric-note">${tk.supply.circulatingPercent?.toFixed(1) || '-'}% of total</div>
        </div>
        <div class="col metric">
          <div class="metric-label">Total Supply</div>
          <div class="metric-value">${tk.supply.total?.toLocaleString() || 'Unlimited'}</div>
        </div>
        <div class="col metric">
          <div class="metric-label">Max Supply</div>
          <div class="metric-value">${tk.supply.maxSupply?.toLocaleString() || 'No cap'}</div>
        </div>
        <div class="col metric">
          <div class="metric-label">Inflation Risk</div>
          <div class="metric-value ${tk.supply.inflationRisk === 'low' ? 'text-green' : tk.supply.inflationRisk === 'high' ? 'text-red' : 'text-amber'}">${formatDirection(tk.supply.inflationRisk)}</div>
        </div>
      </div>
    </div>

    <!-- Market Metrics -->
    <div class="step-box">
      <div class="step-box-header">
        <span class="step-box-title">Market Metrics</span>
      </div>
      <div class="row">
        <div class="col metric">
          <div class="metric-label">Market Cap</div>
          <div class="metric-value-lg">${formatLargeNumber(tk.market.marketCap)}</div>
        </div>
        <div class="col metric">
          <div class="metric-label">Fully Diluted Value</div>
          <div class="metric-value">${formatLargeNumber(tk.market.fullyDilutedValuation)}</div>
        </div>
        <div class="col metric">
          <div class="metric-label">MCap/FDV Ratio</div>
          <div class="metric-value">${(tk.market.mcapFdvRatio * 100).toFixed(1)}%</div>
        </div>
      </div>
      <div class="row">
        <div class="col metric">
          <div class="metric-label">Dilution Risk</div>
          <div class="metric-value ${tk.market.dilutionRisk === 'low' ? 'text-green' : tk.market.dilutionRisk === 'high' ? 'text-red' : 'text-amber'}">${formatDirection(tk.market.dilutionRisk)}</div>
        </div>
        <div class="col metric">
          <div class="metric-label">Liquidity Health</div>
          <div class="metric-value ${tk.market.liquidityHealth === 'excellent' || tk.market.liquidityHealth === 'good' ? 'text-green' : tk.market.liquidityHealth === 'poor' ? 'text-red' : 'text-amber'}">${formatDirection(tk.market.liquidityHealth)}</div>
        </div>
        <div class="col metric">
          <div class="metric-label">24h Volume</div>
          <div class="metric-value">${formatVolume(as?.volume24h)}</div>
        </div>
      </div>
    </div>

    <!-- Whale Concentration -->
    <div class="step-box">
      <div class="step-box-header">
        <span class="step-box-title">Whale Concentration</span>
      </div>
      <div class="row">
        <div class="col metric">
          <div class="metric-label">Concentration Risk</div>
          <div class="metric-value ${tk.whaleConcentration.concentrationRisk === 'low' ? 'text-green' : tk.whaleConcentration.concentrationRisk === 'high' ? 'text-red' : 'text-amber'}">${formatDirection(tk.whaleConcentration.concentrationRisk)}</div>
        </div>
        <div class="col metric">
          <div class="metric-label">Top 10 Holders</div>
          <div class="metric-value">${tk.whaleConcentration.top10HoldersPercent?.toFixed(1) || '-'}%</div>
        </div>
      </div>
    </div>

    <!-- AI Tokenomics Insight -->
    ${data.verdict?.tokenomicsInsight ? `
    <div class="step-summary" style="margin-top: 15px; background: #f0f9f0; border-left: 3px solid #16a34a; padding: 10px 12px;">
      <div style="font-size: 9px; font-weight: 600; color: #16a34a; margin-bottom: 5px;">AI Tokenomics Analysis</div>
      <div style="font-size: 8px; color: #333; line-height: 1.5;">${data.verdict.tokenomicsInsight}</div>
    </div>
    ` : ''}
    ` : `
    <!-- No Tokenomics Data - Enhanced Display -->
    <div style="padding: 20px;">
      <div class="verdict-box" style="padding: 20px; margin-bottom: 20px; background: linear-gradient(135deg, #fef3c7, #fde68a); border-color: #d97706;">
        <div style="font-size: 36px; margin-bottom: 10px;">⚠️</div>
        <div style="font-size: 16px; font-weight: 700; color: #92400e; margin-bottom: 5px;">Tokenomics Data Unavailable</div>
        <div style="font-size: 10px; color: #78350f;">Data could not be retrieved from CoinGecko API</div>
      </div>

      <div class="step-box" style="margin-bottom: 15px;">
        <div class="step-box-header">
          <span class="step-box-title">Why This Happens</span>
        </div>
        <div style="font-size: 8px; line-height: 1.6; color: #444;">
          <p style="margin-bottom: 8px;"><strong>1. New or Low-Cap Token:</strong> The token may be too new or have insufficient market data in CoinGecko's database.</p>
          <p style="margin-bottom: 8px;"><strong>2. API Rate Limits:</strong> CoinGecko API has rate limits that may temporarily restrict data access.</p>
          <p style="margin-bottom: 8px;"><strong>3. Symbol Mismatch:</strong> The trading symbol may not directly map to CoinGecko's identifier.</p>
        </div>
      </div>

      <div class="step-box" style="margin-bottom: 15px;">
        <div class="step-box-header">
          <span class="step-box-title">What You Should Do</span>
        </div>
        <div style="font-size: 8px; line-height: 1.6; color: #444;">
          <p style="margin-bottom: 8px;">✓ <strong>Manual Research:</strong> Visit <a href="https://www.coingecko.com" style="color: #0369a1;">CoinGecko</a> or <a href="https://coinmarketcap.com" style="color: #0369a1;">CoinMarketCap</a> directly to verify tokenomics.</p>
          <p style="margin-bottom: 8px;">✓ <strong>Check Token Contract:</strong> Review the token's smart contract for supply information.</p>
          <p style="margin-bottom: 8px;">✓ <strong>Assess Liquidity Risk:</strong> Without tokenomics data, be extra cautious about position sizing.</p>
        </div>
      </div>

      <div class="step-box" style="background: #fef2f2; border-color: #fca5a5;">
        <div class="step-box-header" style="border-color: #fca5a5;">
          <span class="step-box-title" style="color: #dc2626;">⚠️ Risk Warning</span>
        </div>
        <div style="font-size: 8px; line-height: 1.6; color: #b91c1c;">
          Trading without tokenomics data increases risk. Unknown supply dynamics, whale concentration, and dilution risks could significantly impact your trade. Proceed with caution and use smaller position sizes.
        </div>
      </div>
    </div>
    `}

    ${generateFooter(data, 3, totalPages)}
  </div>
</body></html>`;
}

// ===========================================
// PAGE 4: Steps 1-2 (Market Pulse + Asset Scanner)
// ===========================================

function generatePageSteps12(data: AnalysisReportData, totalPages: number): string {
  // Default values to prevent null access errors
  const defaultGate = { canProceed: false, passed: false, reason: '', confidence: 0 };
  const defaultTrend = { direction: 'neutral', strength: 0 };
  const defaultLevels = { support: [], resistance: [] };
  const defaultIndicators = { rsi: 50, macd: { histogram: 0 }, bb: { percentB: 50 } };

  const mp = data.marketPulse || { fearGreedIndex: 50, fearGreedLabel: 'N/A', btcDominance: 0, trend: defaultTrend, marketRegime: 'ranging', gate: defaultGate };
  const as = data.assetScan || { currentPrice: 0, priceChange24h: 0, volume24h: 0, direction: 'neutral', directionConfidence: 0, indicators: defaultIndicators, levels: defaultLevels, gate: defaultGate };
  const tk = data.tokenomics;
  const mpGate = mp?.gate ? getGateStatus(mp.gate) : { text: 'N/A', color: '#666' };
  const asGate = as?.gate ? getGateStatus(as.gate) : { text: 'N/A', color: '#666' };

  // Step Summaries from gate reasons
  const mpSummary = mp?.gate?.reason ? `Market Pulse: ${mp.gate.reason}` : '';
  const asSummary = as?.gate?.reason ? `Asset Scan: ${as.gate.reason}` : '';

  // Get indicators for each step
  const ind = data.indicatorDetails;
  const trendIndicators = ind?.trend ? Object.values(ind.trend).filter(Boolean).slice(0, 4) : [];
  const volumeIndicators = ind?.volume ? Object.values(ind.volume).filter(Boolean).slice(0, 4) : [];

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${styles}</style></head><body>
  <div class="page">
    <div class="header">
      <div class="brand">
        <div class="logo">${logoSvg}</div>
        <div class="brand-name"><span class="brand-trade">Trader</span><span class="brand-path">Path</span></div>
      </div>
      <div class="header-center">
        <div class="report-title">Analysis Steps 1-2</div>
      </div>
      <div class="header-right">
        <span class="symbol">${data.symbol}/USDT</span>
      </div>
    </div>

    <!-- Step 01: Market Pulse -->
    <div class="step-box-expanded">
      <div class="step-box-header">
        <span class="step-box-num">01</span>
        <span class="step-box-title">Market Pulse</span>
        <span class="step-box-gate" style="color: ${mpGate.color}">${mpGate.text}</span>
      </div>
      <div class="row">
        <div class="col metric metric-sm">
          <div class="metric-label">Fear & Greed</div>
          <div class="metric-value ${mp.fearGreedIndex >= 55 ? 'text-green' : mp.fearGreedIndex <= 45 ? 'text-red' : ''}">${mp.fearGreedIndex}</div>
          <div class="metric-note">${mp.fearGreedLabel}</div>
        </div>
        <div class="col metric metric-sm">
          <div class="metric-label">BTC Dominance</div>
          <div class="metric-value">${mp.btcDominance?.toFixed(1)}%</div>
        </div>
        <div class="col metric metric-sm">
          <div class="metric-label">Trend</div>
          <div class="metric-value ${mp.trend?.direction === 'bullish' ? 'text-green' : mp.trend?.direction === 'bearish' ? 'text-red' : ''}">${formatDirection(mp.trend?.direction)}</div>
          <div class="metric-note">${formatPercent(mp.trend?.strength)} strength</div>
        </div>
        <div class="col metric metric-sm">
          <div class="metric-label">Regime</div>
          <div class="metric-value">${formatRegime(mp.marketRegime)}</div>
        </div>
      </div>
      ${trendIndicators.length > 0 ? `
      <div style="margin-top: 8px; font-size: 7px; font-weight: 600; color: #666; border-top: 1px dashed #ddd; padding-top: 6px;">Trend Indicators (SMA, EMA, ADX, Ichimoku)</div>
      <div class="row" style="margin-top: 4px;">
        ${trendIndicators.map(i => `
          <div class="col metric metric-sm">
            <div class="metric-label">${i?.name || ''}</div>
            <div class="metric-value ${i?.signal === 'bullish' ? 'text-green' : i?.signal === 'bearish' ? 'text-red' : ''}">${typeof i?.value === 'number' ? formatIndicatorValue(i.value) : i?.value || '-'}</div>
            <div class="metric-note">${i?.signal || ''}</div>
          </div>
        `).join('')}
      </div>
      ` : ''}
      ${mpSummary ? `<div class="step-summary"><div class="step-summary-title">Step Summary</div>${mpSummary}</div>` : ''}
    </div>

    <!-- Step 02: Asset Scanner -->
    <div class="step-box-expanded">
      <div class="step-box-header">
        <span class="step-box-num">02</span>
        <span class="step-box-title">Asset Scanner</span>
        <span class="step-box-gate" style="color: ${asGate.color}">${asGate.text}</span>
      </div>
      <div class="row">
        <div class="col metric metric-sm">
          <div class="metric-label">Price</div>
          <div class="metric-value">${formatPrice(as.currentPrice)}</div>
          <div class="metric-note ${as.priceChange24h >= 0 ? 'text-green' : 'text-red'}">${as.priceChange24h >= 0 ? '+' : ''}${as.priceChange24h?.toFixed(2)}%</div>
        </div>
        <div class="col metric metric-sm">
          <div class="metric-label">Volume 24h</div>
          <div class="metric-value">${formatVolume(as.volume24h)}</div>
        </div>
        <div class="col metric metric-sm">
          <div class="metric-label">RSI</div>
          <div class="metric-value ${(as.indicators?.rsi || 50) >= 70 ? 'text-red' : (as.indicators?.rsi || 50) <= 30 ? 'text-green' : ''}">${as.indicators?.rsi?.toFixed(0) || '-'}</div>
        </div>
        <div class="col metric metric-sm">
          <div class="metric-label">Signal</div>
          <div class="metric-value ${as.direction === 'long' ? 'text-green' : as.direction === 'short' ? 'text-red' : ''}">${formatDirection(as.direction)}</div>
          <div class="metric-note">${formatPercent(as.directionConfidence)} conf</div>
        </div>
      </div>
      ${as.levels ? `
      <div style="margin-top: 6px; font-size: 7px;">
        <span>Support: <span class="text-green">${as.levels.support.slice(0, 2).map(s => formatPrice(s)).join(', ')}</span></span>
        <span style="margin-left: 12px;">Resistance: <span class="text-red">${as.levels.resistance.slice(0, 2).map(r => formatPrice(r)).join(', ')}</span></span>
      </div>
      ` : ''}
      ${tk ? `
      <div style="margin-top: 8px; font-size: 7px; font-weight: 600; color: #666; border-top: 1px dashed #ddd; padding-top: 6px;">Tokenomics</div>
      <div class="row" style="margin-top: 4px;">
        <div class="col metric metric-sm">
          <div class="metric-label">Market Cap</div>
          <div class="metric-value">${formatVolume(tk.market.marketCap)}</div>
        </div>
        <div class="col metric metric-sm">
          <div class="metric-label">Circulating</div>
          <div class="metric-value">${tk.supply.circulatingPercent?.toFixed(0) || '-'}%</div>
        </div>
        <div class="col metric metric-sm">
          <div class="metric-label">Dilution Risk</div>
          <div class="metric-value ${tk.market.dilutionRisk === 'low' ? 'text-green' : tk.market.dilutionRisk === 'high' ? 'text-red' : 'text-amber'}">${formatDirection(tk.market.dilutionRisk)}</div>
        </div>
        <div class="col metric metric-sm">
          <div class="metric-label">Score</div>
          <div class="metric-value ${tk.assessment.overallScore >= 70 ? 'text-green' : tk.assessment.overallScore < 40 ? 'text-red' : ''}">${tk.assessment.overallScore}/100</div>
        </div>
      </div>
      ` : ''}
      ${volumeIndicators.length > 0 ? `
      <div style="margin-top: 8px; font-size: 7px; font-weight: 600; color: #666; border-top: 1px dashed #ddd; padding-top: 6px;">Volume Indicators (VWAP, OBV, CMF, AD)</div>
      <div class="row" style="margin-top: 4px;">
        ${volumeIndicators.map(i => `
          <div class="col metric metric-sm">
            <div class="metric-label">${i?.name || ''}</div>
            <div class="metric-value ${i?.signal === 'bullish' ? 'text-green' : i?.signal === 'bearish' ? 'text-red' : ''}">${typeof i?.value === 'number' ? formatIndicatorValue(i.value) : i?.value || '-'}</div>
            <div class="metric-note">${i?.signal || ''}</div>
          </div>
        `).join('')}
      </div>
      ` : ''}
      ${asSummary ? `<div class="step-summary"><div class="step-summary-title">Step Summary</div>${asSummary}</div>` : ''}
    </div>

    ${generateFooter(data, 4, totalPages)}
  </div>
</body></html>`;
}

// ===========================================
// PAGE 5: Steps 3-4 (Safety Check + Timing)
// ===========================================

function generatePageSteps34(data: AnalysisReportData, totalPages: number): string {
  const defaultGate = { canProceed: false, passed: false, reason: '', confidence: 0 };

  const sc = data.safetyCheck || { riskScore: 50, liquidityScore: 50, volatilityScore: 50, manipulationRisk: 50, overallSafety: 'moderate', gate: defaultGate };
  const tm = data.timing || { optimalEntryWindow: 'N/A', entryUrgency: 'wait', patterns: [], timeframeAlignment: 0, tradeNow: false, reason: 'Data unavailable', conditions: [], entryZones: [], gate: defaultGate };
  const scGate = sc?.gate ? getGateStatus(sc.gate) : { text: 'N/A', color: '#666' };
  const tmGate = tm?.gate ? getGateStatus(tm.gate) : { text: 'N/A', color: '#666' };

  const scSummary = sc?.gate?.reason ? `Safety Check: ${sc.gate.reason}` : '';
  const tmSummary = tm?.gate?.reason ? `Timing: ${tm.gate.reason}` : '';

  const ind = data.indicatorDetails;
  const advancedIndicators = ind?.advanced ? Object.values(ind.advanced).filter(Boolean).slice(0, 4) : [];
  const momentumIndicators = ind?.momentum ? Object.values(ind.momentum).filter(Boolean).slice(0, 4) : [];

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${styles}</style></head><body>
  <div class="page">
    <div class="header">
      <div class="brand">
        <div class="logo">${logoSvg}</div>
        <div class="brand-name"><span class="brand-trade">Trader</span><span class="brand-path">Path</span></div>
      </div>
      <div class="header-center">
        <div class="report-title">Analysis Steps 3-4</div>
      </div>
      <div class="header-right">
        <span class="symbol">${data.symbol}/USDT</span>
      </div>
    </div>

    <!-- Step 03: Safety Check -->
    <div class="step-box-expanded">
      <div class="step-box-header">
        <span class="step-box-num">03</span>
        <span class="step-box-title">Safety Check</span>
        <span class="step-box-gate" style="color: ${scGate.color}">${scGate.text}</span>
      </div>
      <div class="row">
        <div class="col metric metric-sm">
          <div class="metric-label">Risk Level</div>
          <div class="metric-value ${sc.riskLevel === 'low' ? 'text-green' : sc.riskLevel === 'high' ? 'text-red' : 'text-amber'}">${formatDirection(sc.riskLevel)}</div>
        </div>
        <div class="col metric metric-sm">
          <div class="metric-label">Manipulation</div>
          <div class="metric-value ${sc.manipulation.pumpDumpRisk === 'low' ? 'text-green' : 'text-amber'}">${formatDirection(sc.manipulation.pumpDumpRisk)}</div>
        </div>
        <div class="col metric metric-sm">
          <div class="metric-label">Whale Activity</div>
          <div class="metric-value ${sc.whaleActivity.bias === 'accumulation' ? 'text-green' : sc.whaleActivity.bias === 'distribution' ? 'text-red' : ''}">${formatDirection(sc.whaleActivity.bias)}</div>
        </div>
        <div class="col metric metric-sm">
          <div class="metric-label">Smart Money</div>
          <div class="metric-value">${formatDirection(sc.smartMoney?.positioning)}</div>
        </div>
      </div>
      ${sc.warnings && sc.warnings.length > 0 ? `
      <div style="margin-top: 6px; font-size: 7px; color: #dc2626;">
        ${sc.warnings.slice(0, 3).map(w => `<span style="margin-right: 8px;">⚠ ${w}</span>`).join('')}
      </div>
      ` : ''}
      ${advancedIndicators.length > 0 ? `
      <div style="margin-top: 8px; font-size: 7px; font-weight: 600; color: #666; border-top: 1px dashed #ddd; padding-top: 6px;">Advanced Indicators</div>
      <div class="row" style="margin-top: 4px;">
        ${advancedIndicators.map(i => `
          <div class="col metric metric-sm">
            <div class="metric-label">${i?.name || ''}</div>
            <div class="metric-value ${i?.signal === 'bullish' ? 'text-green' : i?.signal === 'bearish' ? 'text-red' : ''}">${typeof i?.value === 'number' ? formatIndicatorValue(i.value) : i?.value || '-'}</div>
            <div class="metric-note">${i?.signal || ''}</div>
          </div>
        `).join('')}
      </div>
      ` : ''}
      ${scSummary ? `<div class="step-summary"><div class="step-summary-title">Step Summary</div>${scSummary}</div>` : ''}
    </div>

    <!-- Step 04: Timing Analysis -->
    <div class="step-box-expanded">
      <div class="step-box-header">
        <span class="step-box-num">04</span>
        <span class="step-box-title">Timing Analysis</span>
        <span class="step-box-gate" style="color: ${tmGate.color}">${tmGate.text}</span>
      </div>
      <div class="row">
        <div class="col-2 metric">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div class="metric-value metric-value-lg ${tm.tradeNow ? 'text-green' : 'text-amber'}">${tm.tradeNow ? 'TRADE NOW' : 'WAIT'}</div>
              <div class="metric-note">${tm.reason}</div>
            </div>
            ${tm.gate?.urgency ? `<div style="font-size: 8px; font-weight: 600; color: ${tm.gate.urgency === 'immediate' ? '#dc2626' : '#d97706'};">${tm.gate.urgency.toUpperCase()}</div>` : ''}
          </div>
        </div>
      </div>
      ${tm.conditions && tm.conditions.length > 0 ? `
      <div style="margin-top: 6px;">
        <div style="font-size: 7px; color: #666; margin-bottom: 4px;">Entry Conditions (${tm.conditions.filter(c => c.met).length}/${tm.conditions.length} met):</div>
        <div class="list">
          ${tm.conditions.map(c => `
            <div class="list-item">
              <span class="list-icon ${c.met ? 'list-icon-y' : 'list-icon-n'}">${c.met ? 'Y' : 'N'}</span>
              <span>${c.name}</span>
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}
      ${tm.entryZones && tm.entryZones.length > 0 ? `
      <div class="row" style="margin-top: 6px;">
        ${tm.entryZones.slice(0, 3).map((ez, i) => `
          <div class="col metric metric-sm">
            <div class="metric-label">Zone ${i + 1}</div>
            <div class="metric-value" style="font-size: 9px;">${formatPrice(ez.priceLow)} - ${formatPrice(ez.priceHigh)}</div>
            <div class="metric-note">${formatPercent(ez.probability)} probability</div>
          </div>
        `).join('')}
      </div>
      ` : ''}
      ${momentumIndicators.length > 0 ? `
      <div style="margin-top: 8px; font-size: 7px; font-weight: 600; color: #666; border-top: 1px dashed #ddd; padding-top: 6px;">Momentum Indicators</div>
      <div class="row" style="margin-top: 4px;">
        ${momentumIndicators.map(i => `
          <div class="col metric metric-sm">
            <div class="metric-label">${i?.name || ''}</div>
            <div class="metric-value ${i?.signal === 'bullish' ? 'text-green' : i?.signal === 'bearish' ? 'text-red' : ''}">${typeof i?.value === 'number' ? formatIndicatorValue(i.value) : i?.value || '-'}</div>
            <div class="metric-note">${i?.signal || ''}</div>
          </div>
        `).join('')}
      </div>
      ` : ''}
      ${tmSummary ? `<div class="step-summary"><div class="step-summary-title">Step Summary</div>${tmSummary}</div>` : ''}
    </div>

    ${generateFooter(data, 5, totalPages)}
  </div>
</body></html>`;
}

// ===========================================
// PAGE 6: Steps 5-6 (Trade Plan + Trap Check)
// ===========================================

function generatePageSteps56(data: AnalysisReportData, totalPages: number): string {
  // Default values to prevent null access errors
  const defaultGate = { canProceed: false, passed: false, reason: '', confidence: 0 };
  const defaultTraps = { bullTrap: false, bearTrap: false, fakeoutRisk: 'low', liquidityGrab: { detected: false, zones: [] } };

  const tp = data.tradePlan || { direction: 'neutral', entry: 0, stopLoss: 0, takeProfit1: 0, takeProfit2: 0, takeProfit3: 0, riskReward: 0, positionSize: 0, leverage: 1, riskPercent: 0, potentialProfit: 0, potentialLoss: 0, gate: defaultGate };
  const tc = data.trapCheck || { traps: defaultTraps, washTradingDetected: false, overallTrapRisk: 'low', warnings: [], proTip: '', gate: defaultGate };
  const isLong = tp?.direction === 'long';
  const tpGate = tp?.gate ? getGateStatus(tp.gate) : { text: 'N/A', color: '#666' };
  const tcGate = tc?.gate ? getGateStatus(tc.gate) : { text: 'N/A', color: '#666' };

  // Step Summaries from gate reasons
  const tpSummary = tp?.gate?.reason ? `Trade Plan: ${tp.gate.reason}` : '';
  const tcSummary = tc?.gate?.reason ? `Trap Check: ${tc.gate.reason}` : '';

  // Get indicators
  const ind = data.indicatorDetails;
  const volatilityIndicators = ind?.volatility ? Object.values(ind.volatility).filter(Boolean).slice(0, 4) : [];
  const divergences = ind?.divergences || [];

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${styles}</style></head><body>
  <div class="page">
    <div class="header">
      <div class="brand">
        <div class="logo">${logoSvg}</div>
        <div class="brand-name"><span class="brand-trade">Trader</span><span class="brand-path">Path</span></div>
      </div>
      <div class="header-center">
        <div class="report-title">Analysis Steps 5-6</div>
      </div>
      <div class="header-right">
        <span class="symbol">${data.symbol}/USDT</span>
      </div>
    </div>

    <!-- Step 05: Trade Plan -->
    <div class="step-box-expanded">
      <div class="step-box-header">
        <span class="step-box-num">05</span>
        <span class="step-box-title">Trade Plan Details</span>
        <span class="step-box-gate" style="color: ${tpGate.color}">${tpGate.text}</span>
      </div>
      <div class="row">
        <div class="col metric">
          <div class="metric-label">Direction</div>
          <div class="metric-value ${isLong ? 'text-green' : 'text-red'}">${isLong ? 'LONG' : 'SHORT'}</div>
        </div>
        <div class="col metric">
          <div class="metric-label">Risk:Reward</div>
          <div class="metric-value">${formatRiskReward(tp?.riskReward)}</div>
        </div>
        <div class="col metric">
          <div class="metric-label">Win Rate Est.</div>
          <div class="metric-value">${tp?.winRateEstimate || 50}%</div>
        </div>
        <div class="col metric">
          <div class="metric-label">Position Size</div>
          <div class="metric-value">${tp?.positionSizePercent?.toFixed(1) || '-'}%</div>
        </div>
      </div>
      <table class="table" style="margin-top: 6px;">
        <tr><th>Level</th><th>Price</th><th>Change</th><th>Note</th></tr>
        <tr>
          <td>Entry</td>
          <td style="font-weight: 600;">${formatPrice(tp?.averageEntry)}</td>
          <td>-</td>
          <td style="font-size: 6px;">${tp?.entries?.length ? `${tp.entries.length} zones` : ''}</td>
        </tr>
        <tr>
          <td>Stop Loss</td>
          <td class="text-red" style="font-weight: 600;">${formatPrice(tp?.stopLoss?.price)}</td>
          <td class="text-red">${tp?.stopLoss?.percentage ? `-${tp.stopLoss.percentage.toFixed(1)}%` : ''}</td>
          <td style="font-size: 6px;">${tp?.stopLoss?.reason?.slice(0, 25) || ''}</td>
        </tr>
        ${(tp?.takeProfits || []).slice(0, 3).map((t, i) => `
          <tr>
            <td>TP ${i + 1}</td>
            <td class="text-green" style="font-weight: 600;">${formatPrice(t.price)}</td>
            <td class="text-green">${t.percentage ? `+${t.percentage.toFixed(1)}%` : ''}</td>
            <td style="font-size: 6px;">${t.reason?.slice(0, 25) || ''}</td>
          </tr>
        `).join('')}
      </table>
      ${volatilityIndicators.length > 0 ? `
      <div style="margin-top: 8px; font-size: 7px; font-weight: 600; color: #666; border-top: 1px dashed #ddd; padding-top: 6px;">Volatility Indicators (ATR, PSAR, KELTNER, BB)</div>
      <div class="row" style="margin-top: 4px;">
        ${volatilityIndicators.map(i => `
          <div class="col metric metric-sm">
            <div class="metric-label">${i?.name || ''}</div>
            <div class="metric-value ${i?.signal === 'bullish' ? 'text-green' : i?.signal === 'bearish' ? 'text-red' : ''}">${typeof i?.value === 'number' ? formatIndicatorValue(i.value) : i?.value || '-'}</div>
            <div class="metric-note">${i?.signal || ''}</div>
          </div>
        `).join('')}
      </div>
      ` : ''}
      ${tpSummary ? `<div class="step-summary"><div class="step-summary-title">Step Summary</div>${tpSummary}</div>` : ''}
    </div>

    <!-- Step 06: Trap Check -->
    ${tc ? `
    <div class="step-box-expanded">
      <div class="step-box-header">
        <span class="step-box-num">06</span>
        <span class="step-box-title">Trap Check</span>
        <span class="step-box-gate" style="color: ${tcGate.color}">${tcGate.text}</span>
      </div>
      <div class="row">
        <div class="col metric metric-sm">
          <div class="metric-label">Bull Trap</div>
          <div class="metric-value ${tc.traps.bullTrap ? 'text-red' : 'text-green'}">${tc.traps.bullTrap ? 'Detected' : 'Clear'}</div>
        </div>
        <div class="col metric metric-sm">
          <div class="metric-label">Bear Trap</div>
          <div class="metric-value ${tc.traps.bearTrap ? 'text-red' : 'text-green'}">${tc.traps.bearTrap ? 'Detected' : 'Clear'}</div>
        </div>
        <div class="col metric metric-sm">
          <div class="metric-label">Fakeout Risk</div>
          <div class="metric-value ${tc.traps.fakeoutRisk === 'high' ? 'text-red' : tc.traps.fakeoutRisk === 'medium' ? 'text-amber' : 'text-green'}">${formatDirection(tc.traps.fakeoutRisk)}</div>
        </div>
        <div class="col metric metric-sm">
          <div class="metric-label">Liquidity Grab</div>
          <div class="metric-value ${tc.traps.liquidityGrab?.detected ? 'text-amber' : 'text-green'}">${tc.traps.liquidityGrab?.detected ? 'Possible' : 'Unlikely'}</div>
        </div>
      </div>
      ${divergences.length > 0 ? `
      <div style="margin-top: 8px; font-size: 7px; font-weight: 600; color: #666; border-top: 1px dashed #ddd; padding-top: 6px;">Detected Divergences</div>
      <div style="margin-top: 4px; font-size: 7px;">
        ${divergences.slice(0, 3).map(d => `
          <div style="display: flex; align-items: center; margin-bottom: 2px;">
            <span style="width: 60px; font-weight: 500;">${d.indicator}</span>
            <span class="${d.type === 'bullish' ? 'text-green' : d.type === 'bearish' ? 'text-red' : ''}" style="width: 60px;">${d.type}</span>
            <span style="color: #666;">${d.description?.slice(0, 40) || ''}</span>
          </div>
        `).join('')}
      </div>
      ` : ''}
      ${tc.proTip ? `<div style="margin-top: 6px; font-size: 7px; background: #fef3c7; padding: 6px 8px; border-radius: 3px;"><strong>Pro Tip:</strong> ${tc.proTip}</div>` : ''}
      ${tcSummary ? `<div class="step-summary"><div class="step-summary-title">Step Summary</div>${tcSummary}</div>` : ''}
    </div>
    ` : ''}

    ${generateFooter(data, 6, totalPages)}
  </div>
</body></html>`;
}

// ===========================================
// PAGE 7: Final Verdict & Technical Indicators
// ===========================================

function generatePageVerdict(data: AnalysisReportData, totalPages: number): string {
  // Default verdict values
  const defaultVerdict = {
    action: 'WAIT',
    verdict: 'WAIT',
    overallScore: 50,
    confidenceFactors: [],
    recommendation: 'Insufficient data for analysis. Please wait for complete data.',
  };
  const v = data.verdict || defaultVerdict;
  const ind = data.indicatorDetails;
  const direction = data.tradePlan?.direction;
  const isLong = direction === 'long';
  const isShort = direction === 'short';
  const hasDirection = direction === 'long' || direction === 'short';

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${styles}</style></head><body>
  <div class="page">
    <div class="header">
      <div class="brand">
        <div class="logo">${logoSvg}</div>
        <div class="brand-name"><span class="brand-trade">Trader</span><span class="brand-path">Path</span></div>
      </div>
      <div class="header-center">
        <div class="report-title">Final Verdict</div>
      </div>
      <div class="header-right">
        <span class="symbol">${data.symbol}/USDT</span>
      </div>
    </div>

    <!-- Step 07: Final Verdict -->
    <div class="step-box" style="background: ${hasDirection ? (isLong ? 'linear-gradient(135deg, #f0fdf4, #dcfce7)' : 'linear-gradient(135deg, #fef2f2, #fee2e2)') : 'linear-gradient(135deg, #fef3c7, #fde68a)'};">
      <div class="step-box-header">
        <span class="step-box-num">07</span>
        <span class="step-box-title">Final Verdict</span>
      </div>
      <div style="text-align: center; padding: 10px 0;">
        <div style="font-size: 24px; font-weight: 700; ${hasDirection ? (isLong ? 'color: #16a34a' : 'color: #dc2626') : 'color: #d97706'}">${formatAction(getVerdictAction(v))}</div>
        <div style="font-size: 28px; font-weight: 800; margin: 8px 0;">${formatPercent(v?.overallScore)}</div>
        <div style="font-size: 9px; color: #666;">${hasDirection ? (isLong ? 'Bullish setup - Long position recommended' : 'Bearish setup - Short position recommended') : 'Market conditions unclear - Wait for better setup'}</div>
      </div>
    </div>

    <!-- Confidence Factors -->
    ${v?.confidenceFactors && v.confidenceFactors.length > 0 ? `
    <div class="step-box">
      <div class="step-box-header">
        <span class="step-box-title">Confidence Factors</span>
      </div>
      <div class="list">
        ${v.confidenceFactors.slice(0, 8).map(cf => `
          <div class="list-item">
            <span class="list-icon ${cf.positive ? 'list-icon-y' : 'list-icon-n'}">${cf.positive ? '+' : '-'}</span>
            <span>${cf.factor}</span>
          </div>
        `).join('')}
      </div>
    </div>
    ` : ''}

    <!-- Technical Indicator Summary - 40+ Indicators -->
    ${ind?.summary ? `
    <div class="step-box">
      <div class="step-box-header">
        <span class="step-box-title">Technical Indicator Analysis (40+ Indicators)</span>
      </div>

      <!-- Main Stats -->
      <div class="row" style="margin-bottom: 8px;">
        <div class="col metric metric-sm" style="text-align: center; background: linear-gradient(135deg, #f0fdf4, #dcfce7);">
          <div class="metric-value text-green" style="font-size: 18px;">${ind.summary.bullishIndicators}</div>
          <div class="metric-label">Bullish</div>
        </div>
        <div class="col metric metric-sm" style="text-align: center; background: linear-gradient(135deg, #fef2f2, #fee2e2);">
          <div class="metric-value text-red" style="font-size: 18px;">${ind.summary.bearishIndicators}</div>
          <div class="metric-label">Bearish</div>
        </div>
        <div class="col metric metric-sm" style="text-align: center;">
          <div class="metric-value" style="font-size: 18px;">${ind.summary.neutralIndicators}</div>
          <div class="metric-label">Neutral</div>
        </div>
        <div class="col metric metric-sm" style="text-align: center; background: ${ind.summary.overallSignal === 'bullish' ? 'linear-gradient(135deg, #f0fdf4, #dcfce7)' : ind.summary.overallSignal === 'bearish' ? 'linear-gradient(135deg, #fef2f2, #fee2e2)' : '#fafafa'};">
          <div class="metric-value ${ind.summary.overallSignal === 'bullish' ? 'text-green' : ind.summary.overallSignal === 'bearish' ? 'text-red' : ''}" style="font-size: 14px;">${formatDirection(ind.summary.overallSignal).toUpperCase()}</div>
          <div class="metric-label">Overall Signal</div>
        </div>
      </div>

      <!-- Indicator Categories Breakdown -->
      <div style="margin-top: 8px; padding: 8px; background: #f8f9fa; border-radius: 4px;">
        <div style="font-size: 7px; font-weight: 600; color: #666; margin-bottom: 6px;">INDICATOR CATEGORIES ANALYZED:</div>
        <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; font-size: 7px;">
          <div style="text-align: center;">
            <div style="font-weight: 600; color: #333;">Trend</div>
            <div style="color: #666; font-size: 6px;">EMA, SMA, MACD, ADX, Ichimoku, Supertrend, PSAR, Aroon, VWMA</div>
          </div>
          <div style="text-align: center;">
            <div style="font-weight: 600; color: #333;">Momentum</div>
            <div style="color: #666; font-size: 6px;">RSI, Stoch, StochRSI, CCI, Williams %R, ROC, MFI, Ultimate, TSI</div>
          </div>
          <div style="text-align: center;">
            <div style="font-weight: 600; color: #333;">Volatility</div>
            <div style="color: #666; font-size: 6px;">BB, ATR, Keltner, Donchian, Hist Vol, Squeeze</div>
          </div>
          <div style="text-align: center;">
            <div style="font-weight: 600; color: #333;">Volume</div>
            <div style="color: #666; font-size: 6px;">OBV, VWAP, A/D, CMF, Force, EOM, PVT, Rel Vol</div>
          </div>
          <div style="text-align: center;">
            <div style="font-weight: 600; color: #333;">Advanced</div>
            <div style="color: #666; font-size: 6px;">Order Flow, Whale, Liquidity, Spoofing, Market Impact</div>
          </div>
        </div>
      </div>

      <!-- Signal Confidence -->
      <div style="margin-top: 8px; display: flex; justify-content: space-between; align-items: center; font-size: 7px;">
        <div>
          <span style="color: #666;">Leading Indicators Signal: </span>
          <span class="${(ind.summary as unknown as { leadingIndicatorsSignal?: string }).leadingIndicatorsSignal === 'bullish' ? 'text-green' : (ind.summary as unknown as { leadingIndicatorsSignal?: string }).leadingIndicatorsSignal === 'bearish' ? 'text-red' : ''}" style="font-weight: 600;">
            ${formatDirection((ind.summary as unknown as { leadingIndicatorsSignal?: string }).leadingIndicatorsSignal || 'neutral')}
          </span>
        </div>
        <div>
          <span style="color: #666;">Confidence: </span>
          <span style="font-weight: 600; color: #333;">${ind.summary.signalConfidence}%</span>
        </div>
        <div>
          <span style="color: #666;">Total Analyzed: </span>
          <span style="font-weight: 600; color: #333;">${ind.summary.totalIndicatorsUsed}+</span>
        </div>
      </div>
    </div>
    ` : ''}

    <!-- AI Expert Comment -->
    ${data.aiExpertComment ? `
    <div class="step-box" style="background: linear-gradient(135deg, #f0fdf4, #ecfdf5); border-color: #86efac;">
      <div class="step-box-header" style="border-color: #86efac;">
        <span style="font-size: 8px; font-weight: 700; color: #fff; background: #16a34a; padding: 2px 5px; border-radius: 3px;">AI</span>
        <span class="step-box-title" style="color: #166534;">Expert Review</span>
      </div>
      <div style="font-size: 7px; line-height: 1.5; color: #15803d; max-height: 150px; overflow: hidden;">${data.aiExpertComment.slice(0, 800)}${data.aiExpertComment.length > 800 ? '...' : ''}</div>
    </div>
    ` : ''}

    <!-- AI Summary -->
    <div class="summary-box">
      <div style="font-size: 8px; font-weight: 600; margin-bottom: 4px;">Analysis Summary</div>
      <div class="summary-text">${v?.aiSummary || v?.recommendation || 'Analysis complete. Review all sections for detailed insights.'}</div>
    </div>

    ${generateFooter(data, 7, totalPages)}
  </div>
</body></html>`;
}

// ===========================================
// CHART CAPTURE & PDF GENERATION
// ===========================================

export async function captureChartAsImage(): Promise<string | null> {
  try {
    // Try multiple possible chart IDs - look for the chart container
    const chartIds = ['trade-plan-chart-visible', 'trade-plan-chart', 'tradingview-chart', 'analysis-chart'];
    let element: HTMLElement | null = null;

    for (const id of chartIds) {
      element = document.getElementById(id);
      if (element) {
        console.log(`[Chart Capture] Found chart element with id: ${id}`);
        break;
      }
    }

    // Also try to find by class name if ID search fails
    if (!element) {
      element = document.querySelector('.trade-plan-chart-container') as HTMLElement;
      if (element) console.log('[Chart Capture] Found chart by class name');
    }

    // Try to find any canvas element as last resort (Lightweight Charts renders to canvas)
    if (!element) {
      const canvasElements = document.querySelectorAll('canvas');
      console.log(`[Chart Capture] Found ${canvasElements.length} canvas elements`);
      for (const canvas of canvasElements) {
        const parent = canvas.parentElement;
        if (parent && (parent.offsetWidth > 400 || parent.clientHeight > 300)) {
          element = parent as HTMLElement;
          console.log('[Chart Capture] Found chart via canvas parent');
          break;
        }
      }
    }

    if (!element) {
      console.warn('[Chart Capture] No chart element found on page');
      return null;
    }

    // Scroll element into view to ensure it's rendered
    element.scrollIntoView({ behavior: 'instant', block: 'center' });

    // Wait for chart to fully render (Lightweight Charts needs time)
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check if element has a canvas child (required for Lightweight Charts)
    const chartCanvas = element.querySelector('canvas');
    if (!chartCanvas) {
      console.warn('[Chart Capture] No canvas found inside chart element - chart may not be fully rendered');
    }

    // Capture with dark background for better visibility
    const canvas = await html2canvas(element, {
      backgroundColor: '#1a1a2e',  // Dark background
      scale: 2,
      logging: false,
      useCORS: true,
      allowTaint: true,
      removeContainer: false,
      onclone: (clonedDoc) => {
        // Ensure canvas elements are properly cloned
        const clonedElement = clonedDoc.body.querySelector(`#${element?.id}`) ||
                              clonedDoc.body.querySelector('.trade-plan-chart-container');
        if (clonedElement) {
          (clonedElement as HTMLElement).style.overflow = 'visible';
        }
      }
    });
    console.log('[Chart Capture] Chart captured successfully with dark background');
    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('[Chart Capture] Failed:', error);
    return null;
  }
}

async function renderPageToCanvas(html: string): Promise<HTMLCanvasElement> {
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position: fixed; left: -9999px; top: 0; width: 595px; height: 842px; border: none;';
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!iframeDoc) {
    document.body.removeChild(iframe);
    throw new Error('Could not access iframe document');
  }

  iframeDoc.open();
  iframeDoc.write(html);
  iframeDoc.close();

  await new Promise(resolve => setTimeout(resolve, 500));

  const page = iframeDoc.querySelector('.page') as HTMLElement;
  if (!page) {
    document.body.removeChild(iframe);
    throw new Error('Page container not found');
  }

  const canvas = await html2canvas(page, {
    backgroundColor: '#ffffff',
    scale: 2,
    logging: false,
    width: 595,
    height: 842,
    windowWidth: 595,
    windowHeight: 842,
    useCORS: true,
    allowTaint: true,
  });

  document.body.removeChild(iframe);
  return canvas;
}

interface PdfResult {
  base64: string;
  fileName: string;
}

export async function generateAnalysisReport(data: AnalysisReportData, captureChart: boolean = true): Promise<PdfResult | void> {
  // Validate required data
  if (!data) {
    throw new Error('Report data is required');
  }
  if (!data.symbol) {
    throw new Error('Symbol is required');
  }

  try {
    if (captureChart && !data.chartImage) {
      const chartImage = await captureChartAsImage();
      if (chartImage) data.chartImage = chartImage;
    }

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    // Total pages: 7 (Executive Summary, Trade Plan, Tokenomics, Steps 1-2, Steps 3-4, Steps 5-6, Verdict)
    const totalPages = 7;

    // Page 1: Executive Summary
    console.log('[PDF] Generating page 1: Executive Summary');
    const canvas1 = await renderPageToCanvas(generatePageExecutiveSummary(data, totalPages));
    pdf.addImage(canvas1.toDataURL('image/png'), 'PNG', 0, 0, pdfWidth, pdfHeight);

    // Page 2: Trade Plan (Full Chart)
    console.log('[PDF] Generating page 2: Trade Plan');
    pdf.addPage();
    const canvas2 = await renderPageToCanvas(generatePageTradePlan(data, totalPages));
    pdf.addImage(canvas2.toDataURL('image/png'), 'PNG', 0, 0, pdfWidth, pdfHeight);

    // Page 3: Tokenomics
    console.log('[PDF] Generating page 3: Tokenomics');
    pdf.addPage();
    const canvas3 = await renderPageToCanvas(generatePageTokenomics(data, totalPages));
    pdf.addImage(canvas3.toDataURL('image/png'), 'PNG', 0, 0, pdfWidth, pdfHeight);

    // Page 4: Steps 1-2 (Market Pulse + Asset Scanner)
    console.log('[PDF] Generating page 4: Steps 1-2');
    pdf.addPage();
    const canvas4 = await renderPageToCanvas(generatePageSteps12(data, totalPages));
    pdf.addImage(canvas4.toDataURL('image/png'), 'PNG', 0, 0, pdfWidth, pdfHeight);

    // Page 5: Steps 3-4 (Safety Check + Timing)
    console.log('[PDF] Generating page 5: Steps 3-4');
    pdf.addPage();
    const canvas5 = await renderPageToCanvas(generatePageSteps34(data, totalPages));
    pdf.addImage(canvas5.toDataURL('image/png'), 'PNG', 0, 0, pdfWidth, pdfHeight);

    // Page 6: Steps 5-6 (Trade Plan Details + Trap Check)
    console.log('[PDF] Generating page 6: Steps 5-6');
    pdf.addPage();
    const canvas6 = await renderPageToCanvas(generatePageSteps56(data, totalPages));
    pdf.addImage(canvas6.toDataURL('image/png'), 'PNG', 0, 0, pdfWidth, pdfHeight);

    // Page 7: Final Verdict
    console.log('[PDF] Generating page 7: Final Verdict');
    pdf.addPage();
    const canvas7 = await renderPageToCanvas(generatePageVerdict(data, totalPages));
    pdf.addImage(canvas7.toDataURL('image/png'), 'PNG', 0, 0, pdfWidth, pdfHeight);

    const tradeTypes: Record<string, string> = { scalping: 'Scalping', dayTrade: 'DayTrade', swing: 'Swing' };
    const tradeType = data.tradeType ? tradeTypes[data.tradeType] || '' : '';
    const fileName = `TraderPath_${data.symbol}${tradeType ? `_${tradeType}` : ''}_${new Date().toISOString().split('T')[0]}.pdf`;

    const pdfBase64 = pdf.output('datauristring').split(',')[1];
    pdf.save(fileName);

    console.log(`[TraderPath] Report generated successfully: 7 pages`);

    return { base64: pdfBase64, fileName };
  } catch (error) {
    console.error('[PDF] Generation failed:', error);
    throw new Error(`PDF generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export type { AnalysisReportData as ReportData };
