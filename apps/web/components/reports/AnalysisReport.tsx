'use client';

// ===========================================
// TraderPath Analysis Report - Professional PDF
// Comprehensive 6-Page Layout with Full Indicators
// ===========================================

import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

// ===========================================
// COMPREHENSIVE DATA INTERFACE
// ===========================================

export interface AnalysisReportData {
  symbol: string;
  generatedAt: string;
  analysisId: string;
  tradeType?: 'scalping' | 'dayTrade' | 'swing';
  chartImage?: string;

  // Step 1: Market Pulse
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

  // Step 2: Asset Scan - FULL DATA
  assetScan: {
    currentPrice: number;
    priceChange24h: number;
    volume24h?: number;
    timeframes?: Array<{ tf: string; trend: string; strength: number }>;
    forecast?: {
      price24h: number;
      price7d: number;
      confidence: number;
      scenarios?: Array<{ name: string; price: number; probability: number }>;
    };
    levels?: {
      resistance: number[];
      support: number[];
      poc?: number;
    };
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
  };

  // Step 3: Safety Check - FULL DATA
  safetyCheck: {
    riskLevel: string;
    warnings?: string[];
    manipulation: {
      pumpDumpRisk: string;
      spoofingDetected?: boolean;
      layeringDetected?: boolean;
      icebergDetected?: boolean;
      washTrading?: boolean;
    };
    whaleActivity: {
      bias: string;
      netFlowUsd?: number;
      largeBuys?: Array<{ amountUsd: number; price: number }>;
      largeSells?: Array<{ amountUsd: number; price: number }>;
      orderFlowImbalance?: number;
      orderFlowBias?: string;
    };
    advancedMetrics?: {
      volumeSpike: boolean;
      volumeSpikeFactor: number;
      relativeVolume: number;
      pvt?: number;
      pvtTrend?: string;
      historicalVolatility?: number;
      liquidityScore?: number;
    };
    smartMoney?: { positioning: string; confidence?: number };
    newsSentiment?: {
      overall: string;
      score: number;
      newsCount: number;
      positiveCount: number;
      negativeCount: number;
    };
    gate?: { canProceed: boolean; reason: string; confidence: number; riskAdjustment?: number };
  };

  // Step 4: Timing
  timing: {
    tradeNow: boolean;
    reason: string;
    conditions?: Array<{ name: string; met: boolean; details?: string }>;
    entryZones?: Array<{ priceLow: number; priceHigh: number; probability: number; quality?: number; eta?: string }>;
    optimalEntry?: number;
    waitFor?: { event: string; estimatedTime: string };
    gate?: { canProceed: boolean; reason: string; confidence: number; urgency?: string };
  };

  // Step 5: Trade Plan - FULL DATA
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

  // Step 6: Trap Check
  trapCheck?: {
    traps: {
      bullTrap: boolean;
      bullTrapZone?: number;
      bearTrap: boolean;
      bearTrapZone?: number;
      fakeoutRisk: string;
      liquidityGrab?: { detected: boolean; zones: number[] };
      stopHuntZones?: number[];
    };
    liquidationLevels?: Array<{ price: number; amountUsd: number; type: string }>;
    counterStrategy?: string[];
    proTip?: string;
    riskLevel?: string;
    gate?: { canProceed: boolean; reason: string; confidence: number; trapRisk?: string };
  };

  // Step 7: Verdict
  verdict: {
    action: string;
    overallScore: number;
    aiSummary?: string;
    componentScores?: Record<string, number>;
    confidenceFactors?: Array<{ factor: string; positive: boolean; impact?: string }>;
    recommendation?: string;
  };

  aiExpertComment?: string;

  // Full 40+ Indicator Details (from technical specification)
  indicatorDetails?: {
    trend?: Record<string, IndicatorDetailItem | undefined>;
    momentum?: Record<string, IndicatorDetailItem | undefined>;
    volatility?: Record<string, IndicatorDetailItem | undefined>;
    volume?: Record<string, IndicatorDetailItem | undefined>;
    advanced?: Record<string, IndicatorDetailItem | undefined>;
    divergences?: Array<{
      type: 'bullish' | 'bearish' | 'none';
      indicator: string;
      description: string;
      reliability: 'high' | 'medium' | 'low';
      isEarlySignal: boolean;
    }>;
    summary?: {
      bullishIndicators: number;
      bearishIndicators: number;
      neutralIndicators: number;
      totalIndicatorsUsed: number;
      overallSignal: 'bullish' | 'bearish' | 'neutral';
      signalConfidence: number;
      leadingIndicatorsSignal: 'bullish' | 'bearish' | 'neutral' | 'mixed';
    };
  };
}

// Indicator detail item interface
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
// HELPER FUNCTIONS
// ===========================================

function formatPrice(price: number | undefined): string {
  if (!price || isNaN(price)) return '-';
  if (price >= 10000) return `$${price.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  if (price >= 100) return `$${price.toFixed(2)}`;
  if (price >= 1) return `$${price.toFixed(4)}`;
  return `$${price.toFixed(6)}`;
}

function formatVolume(vol: number | undefined): string {
  if (!vol) return '-';
  if (vol >= 1e9) return `$${(vol / 1e9).toFixed(2)}B`;
  if (vol >= 1e6) return `$${(vol / 1e6).toFixed(2)}M`;
  if (vol >= 1e3) return `$${(vol / 1e3).toFixed(2)}K`;
  return `$${vol.toFixed(0)}`;
}

function formatPercent(val: number | undefined, showSign = true): string {
  if (val === undefined || isNaN(val)) return '-';
  const sign = showSign && val >= 0 ? '+' : '';
  return `${sign}${val.toFixed(2)}%`;
}

function getCoinIconUrl(symbol: string): string {
  return `https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/${symbol.toLowerCase()}.png`;
}

const FALLBACK_COIN_ICON = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ccircle cx="50" cy="50" r="45" fill="%236366f1"/%3E%3Ctext x="50" y="65" font-size="40" fill="white" text-anchor="middle" font-weight="bold"%3E%3F%3C/text%3E%3C/svg%3E';

// RSI interpretation
function interpretRSI(rsi: number): { text: string; color: string } {
  if (rsi >= 80) return { text: 'Extremely Overbought - Reversal likely', color: '#dc2626' };
  if (rsi >= 70) return { text: 'Overbought - Caution for longs', color: '#f59e0b' };
  if (rsi >= 60) return { text: 'Bullish Momentum', color: '#16a34a' };
  if (rsi >= 40) return { text: 'Neutral Zone', color: '#6b7280' };
  if (rsi >= 30) return { text: 'Bearish Momentum', color: '#dc2626' };
  if (rsi >= 20) return { text: 'Oversold - Caution for shorts', color: '#f59e0b' };
  return { text: 'Extremely Oversold - Bounce likely', color: '#16a34a' };
}

// MACD interpretation
function interpretMACD(histogram: number, signal?: number): { text: string; color: string } {
  if (histogram > 0) {
    if (signal && histogram > signal) return { text: 'Strong Bullish - Momentum increasing', color: '#16a34a' };
    return { text: 'Bullish - Above zero line', color: '#22c55e' };
  } else {
    if (signal && histogram < signal) return { text: 'Strong Bearish - Momentum increasing', color: '#dc2626' };
    return { text: 'Bearish - Below zero line', color: '#ef4444' };
  }
}

// Bollinger interpretation
function interpretBollinger(price: number, bb: { upper: number; middle: number; lower: number }): { text: string; color: string } {
  const range = bb.upper - bb.lower;
  const position = (price - bb.lower) / range;
  if (position >= 0.95) return { text: 'At Upper Band - Overbought', color: '#dc2626' };
  if (position >= 0.8) return { text: 'Near Upper Band - Strong', color: '#f59e0b' };
  if (position >= 0.6) return { text: 'Above Middle - Bullish Bias', color: '#22c55e' };
  if (position >= 0.4) return { text: 'Near Middle - Consolidation', color: '#6b7280' };
  if (position >= 0.2) return { text: 'Below Middle - Bearish Bias', color: '#ef4444' };
  if (position >= 0.05) return { text: 'Near Lower Band - Weak', color: '#f59e0b' };
  return { text: 'At Lower Band - Oversold', color: '#16a34a' };
}

// Gate status badge
function getGateStatusHTML(gate: { canProceed: boolean; reason: string; confidence: number } | undefined): string {
  if (!gate) return '';
  const passed = gate.canProceed;
  // Handle both decimal (0-1) and percentage (0-100) confidence values
  const conf = gate.confidence > 1 ? Math.round(gate.confidence) : Math.round(gate.confidence * 100);
  return `
    <div style="display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 12px; font-size: 8px; font-weight: 600; background: ${passed ? '#dcfce7' : '#fee2e2'}; color: ${passed ? '#166534' : '#991b1b'};">
      ${passed ? 'PASS' : 'FAIL'} (${conf}%)
    </div>
  `;
}

// Signal color mapping
function getSignalColor(signal: string): string {
  switch (signal) {
    case 'bullish': return '#16a34a';
    case 'bearish': return '#dc2626';
    default: return '#6b7280';
  }
}

// Signal strength badge
function getStrengthBadge(strength: string): string {
  const colors: Record<string, { bg: string; text: string }> = {
    strong: { bg: '#dcfce7', text: '#166534' },
    moderate: { bg: '#fef3c7', text: '#92400e' },
    weak: { bg: '#f1f5f9', text: '#64748b' }
  };
  const c = colors[strength] || colors.weak;
  return `<span style="display: inline-block; padding: 1px 4px; border-radius: 3px; font-size: 6px; background: ${c.bg}; color: ${c.text}; font-weight: 600;">${strength.toUpperCase()}</span>`;
}

// Render single indicator row from IndicatorDetailItem
function renderIndicatorRow(ind: IndicatorDetailItem): string {
  const signalColor = getSignalColor(ind.signal);
  const signalIcon = ind.signal === 'bullish' ? '[+]' : ind.signal === 'bearish' ? '[-]' : '[=]';
  const leadingBadge = ind.isLeadingIndicator ? '<span style="background: #dbeafe; color: #1e40af; padding: 1px 3px; border-radius: 2px; font-size: 5px; margin-left: 4px;">LEADING</span>' : '';

  // Format value based on type
  let displayValue = '-';
  if (ind.value !== null && ind.value !== undefined) {
    if (typeof ind.value === 'number') {
      displayValue = ind.value >= 1000 ? ind.value.toLocaleString('en-US', { maximumFractionDigits: 0 }) :
                     ind.value >= 1 ? ind.value.toFixed(2) :
                     ind.value.toFixed(4);
    } else {
      displayValue = String(ind.value);
    }
  }

  return `
    <div style="display: flex; align-items: flex-start; padding: 4px 0; border-bottom: 1px solid #f1f5f9;">
      <div style="flex: 1; min-width: 0;">
        <div style="font-size: 8px; font-weight: 600; color: #475569; display: flex; align-items: center; gap: 3px;">
          <span style="color: ${signalColor};">${signalIcon}</span>
          ${ind.name}${leadingBadge}
        </div>
        <div style="font-size: 7px; color: #64748b; margin-top: 2px; line-height: 1.3; overflow: hidden; text-overflow: ellipsis;">${ind.interpretation}</div>
      </div>
      <div style="text-align: right; min-width: 70px; margin-left: 6px;">
        <div style="font-size: 9px; font-weight: bold; color: ${signalColor};">${displayValue}</div>
        <div style="margin-top: 2px;">${getStrengthBadge(ind.signalStrength)}</div>
      </div>
    </div>
  `;
}

// Render indicator category section
function renderIndicatorCategory(
  title: string,
  indicators: Record<string, IndicatorDetailItem | undefined> | undefined,
  bgColor: string
): string {
  if (!indicators) return '';

  const validIndicators = Object.values(indicators).filter((ind): ind is IndicatorDetailItem => ind !== undefined);
  if (validIndicators.length === 0) return '';

  return `
    <div style="background: ${bgColor}; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px; margin-bottom: 8px;">
      <div style="font-size: 9px; font-weight: 600; color: #1e293b; margin-bottom: 6px; display: flex; align-items: center; gap: 4px;">
        ${title} <span style="color: #94a3b8; font-weight: normal;">(${validIndicators.length})</span>
      </div>
      ${validIndicators.map(ind => renderIndicatorRow(ind)).join('')}
    </div>
  `;
}

// ===========================================
// COMMON STYLES
// ===========================================

const commonStyles = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10px; color: #1e293b; background: #fff; line-height: 1.4; }
  .page { width: 595px; height: 842px; padding: 25px; position: relative; }

  /* Header */
  .header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 2px solid #3b82f6; margin-bottom: 15px; }
  .logo { font-size: 16px; font-weight: bold; }
  .logo-red { color: #dc2626; }
  .logo-green { color: #16a34a; }
  .motto { font-size: 7px; color: #64748b; margin-top: 2px; }
  .header-center { text-align: center; flex: 1; }
  .report-title { font-size: 14px; font-weight: bold; color: #1e293b; }
  .report-date { font-size: 7px; color: #94a3b8; margin-top: 2px; }
  .coin-logo { width: 32px; height: 32px; border-radius: 50%; object-fit: contain; }
  .coin-info { text-align: left; margin-left: 8px; }
  .coin-symbol { font-size: 11px; font-weight: bold; }
  .coin-badge { font-size: 8px; font-weight: 600; margin-top: 2px; }
  .badge-green { color: #16a34a; }
  .badge-red { color: #dc2626; }

  /* Page Title */
  .page-title { font-size: 11px; font-weight: bold; color: #64748b; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 1px solid #e2e8f0; }
  .page-title .symbol { color: #1e293b; font-size: 12px; }

  /* Section */
  .section { margin-bottom: 12px; }
  .section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
  .section-title { font-size: 12px; font-weight: bold; color: #1e293b; display: flex; align-items: center; gap: 6px; }
  .section-title .step-num { background: #3b82f6; color: white; padding: 2px 6px; border-radius: 4px; font-size: 8px; }
  .section-subtitle { font-size: 8px; color: #64748b; margin-left: 8px; }

  /* Cards */
  .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; margin-bottom: 8px; }
  .card-title { font-size: 9px; font-weight: 600; color: #475569; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; }

  /* Metrics Grid */
  .metrics-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
  .metrics-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .metrics-grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
  .metric-box { background: white; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px; text-align: center; }
  .metric-label { font-size: 7px; color: #64748b; text-transform: uppercase; margin-bottom: 3px; }
  .metric-value { font-size: 12px; font-weight: bold; color: #1e293b; }
  .metric-interp { font-size: 7px; margin-top: 2px; }

  /* Indicator Row */
  .indicator-row { display: flex; align-items: center; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f1f5f9; }
  .indicator-row:last-child { border-bottom: none; }
  .indicator-name { font-size: 9px; font-weight: 500; color: #475569; flex: 1; }
  .indicator-value { font-size: 10px; font-weight: bold; color: #1e293b; width: 80px; text-align: right; }
  .indicator-interp { font-size: 8px; width: 180px; text-align: right; padding-left: 8px; }

  /* Summary Box */
  .summary-box { background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border: 1px solid #bae6fd; border-radius: 8px; padding: 10px; margin-top: 8px; }
  .summary-title { font-size: 9px; font-weight: 600; color: #0369a1; margin-bottom: 4px; }
  .summary-text { font-size: 8px; color: #0c4a6e; line-height: 1.5; }

  /* Gate Status */
  .gate-box { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 6px; margin-top: 8px; }
  .gate-pass { background: #dcfce7; border: 1px solid #86efac; }
  .gate-fail { background: #fee2e2; border: 1px solid #fca5a5; }
  .gate-icon { font-size: 14px; }
  .gate-text { flex: 1; }
  .gate-label { font-size: 8px; font-weight: 600; }
  .gate-pass .gate-label { color: #166534; }
  .gate-fail .gate-label { color: #991b1b; }
  .gate-reason { font-size: 7px; color: #475569; margin-top: 2px; }

  /* Conditions List */
  .condition-item { display: flex; align-items: center; gap: 6px; padding: 4px 0; font-size: 8px; }
  .condition-check { width: 14px; height: 14px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: bold; }
  .condition-met { background: #dcfce7; color: #166534; }
  .condition-not { background: #fee2e2; color: #991b1b; }

  /* Trade Plan Grid */
  .trade-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .trade-item { background: white; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px; text-align: center; }
  .trade-label { font-size: 7px; color: #64748b; text-transform: uppercase; }
  .trade-value { font-size: 11px; font-weight: bold; margin-top: 3px; }
  .trade-percent { font-size: 7px; margin-top: 2px; }
  .text-blue { color: #2563eb; }
  .text-red { color: #dc2626; }
  .text-green { color: #16a34a; }
  .text-amber { color: #d97706; }

  /* Warning/Info boxes */
  .warning-box { background: #fef3c7; border: 1px solid #fcd34d; border-radius: 6px; padding: 8px; margin-top: 6px; }
  .warning-text { font-size: 8px; color: #92400e; }
  .info-box { background: #dbeafe; border: 1px solid #93c5fd; border-radius: 6px; padding: 8px; margin-top: 6px; }
  .info-text { font-size: 8px; color: #1e40af; }

  /* Chart */
  .chart-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
  .chart-header { background: white; padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-weight: 600; font-size: 10px; }
  .chart-image { width: 100%; height: 280px; object-fit: contain; background: white; }
  .chart-placeholder { height: 280px; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 10px; }

  /* Expert Section */
  .expert-box { border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; margin-bottom: 8px; }
  .expert-header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
  .expert-icon { width: 28px; height: 28px; border-radius: 6px; display: flex; align-items: center; justify-content: center; }
  .expert-name { font-weight: bold; font-size: 9px; }
  .expert-role { font-size: 7px; font-weight: 500; }
  .expert-content { background: #f8fafc; border-radius: 6px; padding: 8px; font-size: 8px; color: #475569; line-height: 1.5; white-space: pre-wrap; }

  /* Footer */
  .page-number { position: absolute; bottom: 8px; right: 25px; font-size: 7px; color: #94a3b8; }
  .page-footer { position: absolute; bottom: 8px; left: 25px; right: 60px; font-size: 6px; color: #94a3b8; }
`;

// ===========================================
// PAGE 1: OVERVIEW & MARKET PULSE
// ===========================================

function generatePage1HTML(data: AnalysisReportData): string {
  const isLong = data.tradePlan?.direction === 'long';
  const score = Math.round((data.verdict?.overallScore || 0) * 10);
  const mp = data.marketPulse;

  // Fear & Greed interpretation
  const fgInterp = mp.fearGreedIndex >= 75 ? 'Extreme Greed - Market euphoria, risk of correction'
    : mp.fearGreedIndex >= 55 ? 'Greed - Bullish sentiment, watch for reversals'
    : mp.fearGreedIndex >= 45 ? 'Neutral - No clear bias'
    : mp.fearGreedIndex >= 25 ? 'Fear - Bearish sentiment, potential opportunity'
    : 'Extreme Fear - Capitulation, contrarian buy signal';

  // BTC Dominance interpretation
  const btcDomInterp = mp.btcDominance >= 55 ? 'High BTC Dominance - Risk-off, altcoins weak'
    : mp.btcDominance >= 45 ? 'Moderate BTC Dominance - Balanced market'
    : 'Low BTC Dominance - Altcoin season, risk-on';

  const trendColor = mp.trend?.direction === 'bullish' ? '#16a34a' : mp.trend?.direction === 'bearish' ? '#dc2626' : '#d97706';

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>${commonStyles}</style></head>
<body>
  <div class="page">
    <!-- Header -->
    <div class="header">
      <div>
        <div class="logo"><span class="logo-red">Trade</span><span class="logo-green">Path</span></div>
        <div class="motto">AI-Powered Trading Intelligence</div>
      </div>
      <div class="header-center">
        <div class="report-title">Comprehensive Analysis Report</div>
        <div class="report-date">${data.generatedAt}</div>
      </div>
      <div style="display: flex; align-items: center;">
        <img src="${getCoinIconUrl(data.symbol)}" class="coin-logo" alt="${data.symbol}" onerror="this.src='${FALLBACK_COIN_ICON}'" />
        <div class="coin-info">
          <div class="coin-symbol">${data.symbol}/USDT</div>
          <div class="coin-badge ${isLong ? 'badge-green' : 'badge-red'}">${isLong ? 'LONG' : 'SHORT'} | ${score}/100</div>
        </div>
      </div>
    </div>

    <!-- Quick Overview -->
    <div class="section">
      <div class="card" style="background: linear-gradient(135deg, ${isLong ? '#dcfce7' : '#fee2e2'} 0%, #fff 100%);">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-size: 11px; font-weight: bold; color: ${isLong ? '#166534' : '#991b1b'};">
              ${data.verdict?.action || 'N/A'} - ${isLong ? 'BULLISH' : 'BEARISH'} SETUP
            </div>
            <div style="font-size: 8px; color: #475569; margin-top: 4px;">
              ${data.verdict?.aiSummary?.slice(0, 150) || 'Analysis complete. See detailed sections below.'}${(data.verdict?.aiSummary?.length || 0) > 150 ? '...' : ''}
            </div>
          </div>
          <div style="text-align: center; padding: 10px 20px; background: ${isLong ? '#16a34a' : '#dc2626'}; border-radius: 8px;">
            <div style="font-size: 20px; font-weight: bold; color: white;">${score}</div>
            <div style="font-size: 7px; color: rgba(255,255,255,0.8);">SCORE</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Step 1: Market Pulse -->
    <div class="section">
      <div class="section-header">
        <div class="section-title">
          <span class="step-num">STEP 1</span>
          Market Pulse
          <span class="section-subtitle">Global Market Conditions</span>
        </div>
        ${getGateStatusHTML(mp.gate)}
      </div>

      <div class="card">
        <div class="metrics-grid">
          <div class="metric-box">
            <div class="metric-label">Fear & Greed</div>
            <div class="metric-value" style="color: ${mp.fearGreedIndex >= 55 ? '#16a34a' : mp.fearGreedIndex <= 45 ? '#dc2626' : '#d97706'};">${mp.fearGreedIndex || 0}</div>
            <div class="metric-interp" style="color: #64748b;">${mp.fearGreedLabel || 'N/A'}</div>
          </div>
          <div class="metric-box">
            <div class="metric-label">BTC Dominance</div>
            <div class="metric-value">${mp.btcDominance?.toFixed(1) || '0'}%</div>
            <div class="metric-interp" style="color: #64748b;">${mp.btcDominance >= 55 ? 'BTC Strong' : mp.btcDominance <= 45 ? 'Alts Strong' : 'Balanced'}</div>
          </div>
          <div class="metric-box">
            <div class="metric-label">Market Trend</div>
            <div class="metric-value" style="color: ${trendColor};">${(mp.trend?.direction || 'neutral').toUpperCase()}</div>
            <div class="metric-interp" style="color: #64748b;">Strength: ${((mp.trend?.strength || 0) * 100).toFixed(0)}%</div>
          </div>
          <div class="metric-box">
            <div class="metric-label">Market Regime</div>
            <div class="metric-value" style="font-size: 10px;">${mp.marketRegime || 'Normal'}</div>
            <div class="metric-interp" style="color: #64748b;">${mp.btcPrice ? formatPrice(mp.btcPrice) : '-'}</div>
          </div>
        </div>

        <div class="summary-box">
          <div class="summary-title">Market Pulse Summary</div>
          <div class="summary-text">
            <strong>Fear & Greed:</strong> ${fgInterp}<br/>
            <strong>BTC Dominance:</strong> ${btcDomInterp}<br/>
            <strong>Conclusion:</strong> ${mp.trend?.direction === 'bullish' ? 'Market conditions favor long positions. Risk appetite is elevated.' : mp.trend?.direction === 'bearish' ? 'Market conditions favor caution. Risk-off environment.' : 'Neutral conditions - wait for clearer direction.'}
          </div>
        </div>

        ${mp.gate ? `
        <div class="gate-box ${mp.gate.canProceed ? 'gate-pass' : 'gate-fail'}">
          <div class="gate-icon">${mp.gate.canProceed ? '[OK]' : '[X]'}</div>
          <div class="gate-text">
            <div class="gate-label">Gate ${mp.gate.canProceed ? 'PASSED' : 'FAILED'} - Confidence: ${mp.gate.confidence > 1 ? mp.gate.confidence.toFixed(0) : (mp.gate.confidence * 100).toFixed(0)}%</div>
            <div class="gate-reason">${mp.gate.reason}</div>
          </div>
        </div>
        ` : ''}
      </div>
    </div>

    <!-- Quick Trade Summary -->
    <div class="section">
      <div class="card-title">QUICK TRADE SUMMARY</div>
      <div class="trade-grid">
        <div class="trade-item">
          <div class="trade-label">Entry Price</div>
          <div class="trade-value text-blue">${formatPrice(data.tradePlan?.averageEntry)}</div>
        </div>
        <div class="trade-item">
          <div class="trade-label">Stop Loss</div>
          <div class="trade-value text-red">${formatPrice(data.tradePlan?.stopLoss?.price)}</div>
          <div class="trade-percent text-red">${data.tradePlan?.stopLoss?.percentage ? `-${data.tradePlan.stopLoss.percentage.toFixed(1)}%` : ''}</div>
        </div>
        <div class="trade-item">
          <div class="trade-label">Take Profit 1</div>
          <div class="trade-value text-green">${formatPrice(data.tradePlan?.takeProfits?.[0]?.price)}</div>
          <div class="trade-percent text-green">${data.tradePlan?.takeProfits?.[0]?.percentage ? `+${data.tradePlan.takeProfits[0].percentage.toFixed(1)}%` : ''}</div>
        </div>
        <div class="trade-item">
          <div class="trade-label">Take Profit 2</div>
          <div class="trade-value text-green">${formatPrice(data.tradePlan?.takeProfits?.[1]?.price)}</div>
        </div>
        <div class="trade-item">
          <div class="trade-label">Risk:Reward</div>
          <div class="trade-value">${data.tradePlan?.riskReward?.toFixed(1) || '0'}:1</div>
        </div>
        <div class="trade-item">
          <div class="trade-label">Win Rate Est.</div>
          <div class="trade-value">${data.tradePlan?.winRateEstimate || 50}%</div>
        </div>
      </div>
    </div>

    <div class="page-footer"><span class="logo-red">Trade</span><span class="logo-green">Path</span> | Analysis ID: ${data.analysisId?.slice(-12) || 'N/A'}</div>
    <div class="page-number">Page 1 of 6</div>
  </div>
</body></html>`;
}

// ===========================================
// PAGE 2: FULL TECHNICAL INDICATORS (40+)
// ===========================================

function generatePage2HTML(data: AnalysisReportData): string {
  const as = data.assetScan;
  const price = as.currentPrice || 0;
  const dirColor = as.direction === 'long' ? '#16a34a' : as.direction === 'short' ? '#dc2626' : '#6b7280';
  const indDetails = data.indicatorDetails;

  // Count total indicators from indicatorDetails
  let totalIndicators = 0;
  let bullishCount = 0;
  let bearishCount = 0;

  if (indDetails?.summary) {
    totalIndicators = indDetails.summary.totalIndicatorsUsed || 0;
    bullishCount = indDetails.summary.bullishIndicators || 0;
    bearishCount = indDetails.summary.bearishIndicators || 0;
  }

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>${commonStyles}</style></head>
<body>
  <div class="page">
    <div class="page-title"><span class="logo-red">Trade</span><span class="logo-green">Path</span> | <span class="symbol">${data.symbol}/USDT</span> Technical Indicators</div>

    <!-- Step 2: Full Technical Analysis -->
    <div class="section">
      <div class="section-header">
        <div class="section-title">
          <span class="step-num">STEP 2</span>
          Full Technical Analysis
          <span class="section-subtitle">${totalIndicators > 0 ? `${totalIndicators} Indicators Analyzed` : 'Deep Indicator Analysis'}</span>
        </div>
        ${getGateStatusHTML(as.gate)}
      </div>

      <!-- Price & Signal Overview -->
      <div class="card" style="background: linear-gradient(135deg, ${as.direction === 'long' ? '#dcfce7' : as.direction === 'short' ? '#fee2e2' : '#f1f5f9'} 0%, #fff 100%);">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-size: 11px; font-weight: bold; color: ${dirColor};">
              ${formatPrice(price)} | ${as.direction ? as.direction.toUpperCase() : 'NEUTRAL'}
            </div>
            <div style="font-size: 8px; color: #475569; margin-top: 2px;">
              24h: ${formatPercent(as.priceChange24h)} | Volume: ${formatVolume(as.volume24h)}
            </div>
          </div>
          ${indDetails?.summary ? `
          <div style="display: flex; gap: 8px; text-align: center;">
            <div style="padding: 6px 10px; background: #dcfce7; border-radius: 6px;">
              <div style="font-size: 14px; font-weight: bold; color: #16a34a;">${bullishCount}</div>
              <div style="font-size: 6px; color: #166534;">BULLISH</div>
            </div>
            <div style="padding: 6px 10px; background: #fee2e2; border-radius: 6px;">
              <div style="font-size: 14px; font-weight: bold; color: #dc2626;">${bearishCount}</div>
              <div style="font-size: 6px; color: #991b1b;">BEARISH</div>
            </div>
            <div style="padding: 6px 10px; background: ${indDetails.summary.overallSignal === 'bullish' ? '#16a34a' : indDetails.summary.overallSignal === 'bearish' ? '#dc2626' : '#6b7280'}; border-radius: 6px;">
              <div style="font-size: 11px; font-weight: bold; color: white;">${indDetails.summary.signalConfidence}%</div>
              <div style="font-size: 5px; color: rgba(255,255,255,0.9);">CONFIDENCE</div>
            </div>
          </div>
          ` : ''}
        </div>
      </div>

      ${indDetails ? `
      <!-- TREND INDICATORS -->
      ${renderIndicatorCategory('TREND INDICATORS', indDetails.trend, '#f0f9ff')}

      <!-- MOMENTUM INDICATORS -->
      ${renderIndicatorCategory('MOMENTUM INDICATORS', indDetails.momentum, '#fefce8')}

      <!-- VOLATILITY INDICATORS -->
      ${renderIndicatorCategory('VOLATILITY INDICATORS', indDetails.volatility, '#fff7ed')}

      <!-- VOLUME INDICATORS -->
      ${renderIndicatorCategory('VOLUME INDICATORS', indDetails.volume, '#f0fdf4')}

      <!-- ADVANCED INDICATORS -->
      ${renderIndicatorCategory('ADVANCED/ON-CHAIN', indDetails.advanced, '#fdf4ff')}

      <!-- DIVERGENCES -->
      ${indDetails.divergences && indDetails.divergences.length > 0 ? `
      <div style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 6px; padding: 8px; margin-bottom: 8px;">
        <div style="font-size: 9px; font-weight: 600; color: #92400e; margin-bottom: 6px;">DIVERGENCE ALERTS (Early Signals)</div>
        ${indDetails.divergences.map(d => `
          <div style="display: flex; align-items: center; gap: 6px; padding: 3px 0; font-size: 7px;">
            <span style="color: ${d.type === 'bullish' ? '#16a34a' : d.type === 'bearish' ? '#dc2626' : '#6b7280'}; font-weight: bold;">
              ${d.type === 'bullish' ? '[+]' : d.type === 'bearish' ? '[-]' : '[=]'} ${d.indicator}
            </span>
            <span style="flex: 1; color: #78350f;">${d.description}</span>
            <span style="background: ${d.reliability === 'high' ? '#dcfce7' : d.reliability === 'medium' ? '#fef3c7' : '#fee2e2'}; padding: 1px 4px; border-radius: 2px; font-size: 5px;">
              ${d.reliability.toUpperCase()}
            </span>
          </div>
        `).join('')}
      </div>
      ` : ''}

      <!-- INDICATOR SUMMARY -->
      <div class="summary-box">
        <div class="summary-title">Full Indicator Analysis Summary</div>
        <div class="summary-text">
          <strong>Total Indicators:</strong> ${totalIndicators} analyzed | <strong>Bullish:</strong> ${bullishCount} | <strong>Bearish:</strong> ${bearishCount} | <strong>Neutral:</strong> ${indDetails.summary?.neutralIndicators || 0}<br/>
          <strong>Overall Signal:</strong> ${(indDetails.summary?.overallSignal || 'neutral').toUpperCase()} with ${indDetails.summary?.signalConfidence || 0}% confidence<br/>
          <strong>Leading Indicators:</strong> ${(indDetails.summary?.leadingIndicatorsSignal || 'neutral').toUpperCase()} - These provide early warning signals<br/>
          <strong>Direction Bias:</strong> ${as.direction ? `${as.direction.toUpperCase()} with ${((as.directionConfidence || 0) * 100).toFixed(0)}% confidence` : 'No clear bias'}
        </div>
      </div>
      ` : `
      <!-- FALLBACK: Basic Indicators (when indicatorDetails not available) -->
      <div class="card">
        <div class="card-title">Basic Indicators</div>
        <div class="indicator-row">
          <div class="indicator-name">RSI (14)</div>
          <div class="indicator-value">${as.indicators?.rsi?.toFixed(1) || '-'}</div>
          <div class="indicator-interp" style="color: ${interpretRSI(as.indicators?.rsi || 50).color};">${interpretRSI(as.indicators?.rsi || 50).text}</div>
        </div>
        <div class="indicator-row">
          <div class="indicator-name">MACD Histogram</div>
          <div class="indicator-value">${as.indicators?.macd?.histogram?.toFixed(4) || '-'}</div>
          <div class="indicator-interp">${interpretMACD(as.indicators?.macd?.histogram || 0).text}</div>
        </div>
        <div class="indicator-row">
          <div class="indicator-name">ATR</div>
          <div class="indicator-value">${as.indicators?.atr?.toFixed(4) || '-'}</div>
        </div>
        <div style="font-size: 8px; color: #d97706; margin-top: 8px; padding: 6px; background: #fef3c7; border-radius: 4px;">
          Note: Full indicator details not available. Generate new analysis for comprehensive 40+ indicator data.
        </div>
      </div>
      `}

      <!-- Support & Resistance -->
      ${as.levels ? `
      <div class="card">
        <div class="card-title">Key Price Levels</div>
        <div class="metrics-grid-2">
          <div class="metric-box" style="border-color: #86efac;">
            <div class="metric-label">Support</div>
            <div style="font-size: 8px; color: #16a34a; margin-top: 3px;">
              ${as.levels.support.slice(0, 3).map((s, i) => `S${i + 1}: ${formatPrice(s)}`).join('<br/>')}
            </div>
          </div>
          <div class="metric-box" style="border-color: #fca5a5;">
            <div class="metric-label">Resistance</div>
            <div style="font-size: 8px; color: #dc2626; margin-top: 3px;">
              ${as.levels.resistance.slice(0, 3).map((r, i) => `R${i + 1}: ${formatPrice(r)}`).join('<br/>')}
            </div>
          </div>
        </div>
      </div>
      ` : ''}

      ${as.gate ? `
      <div class="gate-box ${as.gate.canProceed ? 'gate-pass' : 'gate-fail'}">
        <div class="gate-icon">${as.gate.canProceed ? '[OK]' : '[X]'}</div>
        <div class="gate-text">
          <div class="gate-label">Gate ${as.gate.canProceed ? 'PASSED' : 'FAILED'} - Confidence: ${as.gate.confidence > 1 ? as.gate.confidence.toFixed(0) : (as.gate.confidence * 100).toFixed(0)}%</div>
          <div class="gate-reason">${as.gate.reason}</div>
        </div>
      </div>
      ` : ''}
    </div>

    <div class="page-footer"><span class="logo-red">Trade</span><span class="logo-green">Path</span> | Analysis ID: ${data.analysisId?.slice(-12) || 'N/A'}</div>
    <div class="page-number">Page 2 of 6</div>
  </div>
</body></html>`;
}

// ===========================================
// PAGE 3: SAFETY CHECK
// ===========================================

function generatePage3HTML(data: AnalysisReportData): string {
  const sc = data.safetyCheck;
  const riskColor = sc.riskLevel === 'low' ? '#16a34a' : sc.riskLevel === 'high' ? '#dc2626' : '#d97706';

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>${commonStyles}</style></head>
<body>
  <div class="page">
    <div class="page-title"><span class="logo-red">Trade</span><span class="logo-green">Path</span> | <span class="symbol">${data.symbol}/USDT</span> Safety Analysis</div>

    <!-- Step 3: Safety Check -->
    <div class="section">
      <div class="section-header">
        <div class="section-title">
          <span class="step-num">STEP 3</span>
          Safety Check
          <span class="section-subtitle">Risk & Manipulation Detection</span>
        </div>
        ${getGateStatusHTML(sc.gate)}
      </div>

      <!-- Risk Level Overview -->
      <div class="card" style="background: ${sc.riskLevel === 'low' ? '#dcfce7' : sc.riskLevel === 'high' ? '#fee2e2' : '#fef3c7'};">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="font-size: 16px; font-weight: bold; color: ${riskColor};">${sc.riskLevel === 'low' ? '[LOW]' : sc.riskLevel === 'high' ? '[HIGH]' : '[MED]'}</div>
          <div>
            <div style="font-size: 12px; font-weight: bold; color: ${riskColor};">
              RISK LEVEL: ${sc.riskLevel?.toUpperCase() || 'UNKNOWN'}
            </div>
            <div style="font-size: 8px; color: #475569; margin-top: 2px;">
              ${sc.riskLevel === 'low' ? 'Safe to proceed with standard risk management' : sc.riskLevel === 'high' ? 'Exercise extreme caution - elevated risk detected' : 'Moderate risk - proceed with enhanced risk management'}
            </div>
          </div>
        </div>
      </div>

      <!-- Manipulation Detection -->
      <div class="card">
        <div class="card-title">Manipulation Detection</div>
        <div class="metrics-grid">
          <div class="metric-box">
            <div class="metric-label">Pump/Dump Risk</div>
            <div class="metric-value" style="color: ${sc.manipulation.pumpDumpRisk === 'low' ? '#16a34a' : sc.manipulation.pumpDumpRisk === 'high' ? '#dc2626' : '#d97706'};">
              ${sc.manipulation.pumpDumpRisk?.toUpperCase() || 'N/A'}
            </div>
          </div>
          <div class="metric-box">
            <div class="metric-label">Spoofing</div>
            <div class="metric-value" style="color: ${sc.manipulation.spoofingDetected ? '#dc2626' : '#16a34a'};">
              ${sc.manipulation.spoofingDetected ? 'DETECTED' : 'CLEAR'}
            </div>
          </div>
          <div class="metric-box">
            <div class="metric-label">Layering</div>
            <div class="metric-value" style="color: ${sc.manipulation.layeringDetected ? '#dc2626' : '#16a34a'};">
              ${sc.manipulation.layeringDetected ? 'DETECTED' : 'CLEAR'}
            </div>
          </div>
          <div class="metric-box">
            <div class="metric-label">Wash Trading</div>
            <div class="metric-value" style="color: ${sc.manipulation.washTrading ? '#dc2626' : '#16a34a'};">
              ${sc.manipulation.washTrading ? 'DETECTED' : 'CLEAR'}
            </div>
          </div>
        </div>
      </div>

      <!-- Whale Activity -->
      <div class="card">
        <div class="card-title">Whale Activity</div>
        <div class="metrics-grid-3">
          <div class="metric-box">
            <div class="metric-label">Whale Bias</div>
            <div class="metric-value" style="color: ${sc.whaleActivity.bias === 'accumulation' ? '#16a34a' : sc.whaleActivity.bias === 'distribution' ? '#dc2626' : '#6b7280'};">
              ${sc.whaleActivity.bias?.toUpperCase() || 'NEUTRAL'}
            </div>
          </div>
          <div class="metric-box">
            <div class="metric-label">Net Flow</div>
            <div class="metric-value" style="color: ${(sc.whaleActivity.netFlowUsd || 0) >= 0 ? '#16a34a' : '#dc2626'};">
              ${sc.whaleActivity.netFlowUsd ? formatVolume(Math.abs(sc.whaleActivity.netFlowUsd)) : '-'}
            </div>
            <div class="metric-interp">${(sc.whaleActivity.netFlowUsd || 0) >= 0 ? 'Inflow' : 'Outflow'}</div>
          </div>
          <div class="metric-box">
            <div class="metric-label">Order Flow</div>
            <div class="metric-value" style="color: ${sc.whaleActivity.orderFlowBias === 'buying' ? '#16a34a' : sc.whaleActivity.orderFlowBias === 'selling' ? '#dc2626' : '#6b7280'};">
              ${sc.whaleActivity.orderFlowBias?.toUpperCase() || 'NEUTRAL'}
            </div>
          </div>
        </div>
      </div>

      <!-- Advanced Metrics -->
      ${sc.advancedMetrics ? `
      <div class="card">
        <div class="card-title">Advanced Metrics</div>
        <div class="metrics-grid">
          <div class="metric-box">
            <div class="metric-label">Volume Spike</div>
            <div class="metric-value" style="color: ${sc.advancedMetrics.volumeSpike ? '#d97706' : '#6b7280'};">
              ${sc.advancedMetrics.volumeSpike ? `YES (${sc.advancedMetrics.volumeSpikeFactor?.toFixed(1)}x)` : 'NO'}
            </div>
          </div>
          <div class="metric-box">
            <div class="metric-label">Relative Volume</div>
            <div class="metric-value">${sc.advancedMetrics.relativeVolume?.toFixed(2) || '-'}x</div>
          </div>
          <div class="metric-box">
            <div class="metric-label">Liquidity Score</div>
            <div class="metric-value">${sc.advancedMetrics.liquidityScore?.toFixed(0) || '-'}</div>
          </div>
          <div class="metric-box">
            <div class="metric-label">Hist. Volatility</div>
            <div class="metric-value">${sc.advancedMetrics.historicalVolatility ? `${(sc.advancedMetrics.historicalVolatility * 100).toFixed(1)}%` : '-'}</div>
          </div>
        </div>
      </div>
      ` : ''}

      <!-- Smart Money -->
      ${sc.smartMoney ? `
      <div class="card">
        <div class="card-title">Smart Money Positioning</div>
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="font-size: 14px; font-weight: bold; color: ${sc.smartMoney.positioning === 'long' ? '#16a34a' : sc.smartMoney.positioning === 'short' ? '#dc2626' : '#6b7280'};">
            ${sc.smartMoney.positioning?.toUpperCase() || 'NEUTRAL'}
          </div>
          ${sc.smartMoney.confidence !== undefined ? `
          <div style="font-size: 9px; color: #64748b;">
            Confidence: ${(sc.smartMoney.confidence * 100).toFixed(0)}%
          </div>
          ` : ''}
        </div>
      </div>
      ` : ''}

      <!-- News Sentiment -->
      ${sc.newsSentiment ? `
      <div class="card">
        <div class="card-title">News Sentiment</div>
        <div class="metrics-grid">
          <div class="metric-box">
            <div class="metric-label">Overall</div>
            <div class="metric-value" style="color: ${sc.newsSentiment.overall === 'bullish' ? '#16a34a' : sc.newsSentiment.overall === 'bearish' ? '#dc2626' : '#6b7280'};">
              ${sc.newsSentiment.overall?.toUpperCase() || 'NEUTRAL'}
            </div>
          </div>
          <div class="metric-box">
            <div class="metric-label">Score</div>
            <div class="metric-value">${sc.newsSentiment.score?.toFixed(0) || '-'}</div>
          </div>
          <div class="metric-box">
            <div class="metric-label">Positive</div>
            <div class="metric-value text-green">${sc.newsSentiment.positiveCount || 0}</div>
          </div>
          <div class="metric-box">
            <div class="metric-label">Negative</div>
            <div class="metric-value text-red">${sc.newsSentiment.negativeCount || 0}</div>
          </div>
        </div>
      </div>
      ` : ''}

      <!-- Warnings -->
      ${sc.warnings && sc.warnings.length > 0 ? `
      <div class="warning-box">
        <div class="warning-text">
          <strong>Warnings:</strong><br/>
          ${sc.warnings.map(w => `• ${w}`).join('<br/>')}
        </div>
      </div>
      ` : ''}

      <!-- Summary -->
      <div class="summary-box">
        <div class="summary-title">Safety Check Summary</div>
        <div class="summary-text">
          <strong>Risk Level:</strong> ${sc.riskLevel?.toUpperCase()} - ${sc.riskLevel === 'low' ? 'No significant risks detected' : sc.riskLevel === 'high' ? 'Multiple risk factors present' : 'Some risk factors to monitor'}<br/>
          <strong>Whale Activity:</strong> ${sc.whaleActivity.bias === 'accumulation' ? 'Whales are buying - bullish signal' : sc.whaleActivity.bias === 'distribution' ? 'Whales are selling - bearish signal' : 'No clear whale bias'}<br/>
          <strong>Manipulation:</strong> ${sc.manipulation.pumpDumpRisk === 'low' && !sc.manipulation.spoofingDetected ? 'No manipulation detected' : 'Potential manipulation - proceed with caution'}
        </div>
      </div>

      ${sc.gate ? `
      <div class="gate-box ${sc.gate.canProceed ? 'gate-pass' : 'gate-fail'}">
        <div class="gate-icon">${sc.gate.canProceed ? '[OK]' : '[X]'}</div>
        <div class="gate-text">
          <div class="gate-label">Gate ${sc.gate.canProceed ? 'PASSED' : 'FAILED'} - Confidence: ${sc.gate.confidence > 1 ? sc.gate.confidence.toFixed(0) : (sc.gate.confidence * 100).toFixed(0)}%</div>
          <div class="gate-reason">${sc.gate.reason}</div>
        </div>
      </div>
      ` : ''}
    </div>

    <div class="page-footer"><span class="logo-red">Trade</span><span class="logo-green">Path</span> | Analysis ID: ${data.analysisId?.slice(-12) || 'N/A'}</div>
    <div class="page-number">Page 3 of 6</div>
  </div>
</body></html>`;
}

// ===========================================
// PAGE 4: TIMING & TRADE PLAN
// ===========================================

function generatePage4HTML(data: AnalysisReportData): string {
  const tm = data.timing;
  const tp = data.tradePlan;
  const isLong = tp.direction === 'long';

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>${commonStyles}</style></head>
<body>
  <div class="page">
    <div class="page-title"><span class="logo-red">Trade</span><span class="logo-green">Path</span> | <span class="symbol">${data.symbol}/USDT</span> Execution Plan</div>

    <!-- Step 4: Timing -->
    <div class="section">
      <div class="section-header">
        <div class="section-title">
          <span class="step-num">STEP 4</span>
          Timing Analysis
          <span class="section-subtitle">Optimal Entry Window</span>
        </div>
        ${getGateStatusHTML(tm.gate)}
      </div>

      <div class="card" style="background: ${tm.tradeNow ? '#dcfce7' : '#fef3c7'};">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="font-size: 14px; font-weight: bold; color: ${tm.tradeNow ? '#166534' : '#92400e'};">${tm.tradeNow ? '[GO]' : '[WAIT]'}</div>
          <div>
            <div style="font-size: 12px; font-weight: bold; color: ${tm.tradeNow ? '#166534' : '#92400e'};">
              ${tm.tradeNow ? 'TRADE NOW' : 'WAIT FOR BETTER ENTRY'}
            </div>
            <div style="font-size: 8px; color: #475569; margin-top: 2px;">${tm.reason || 'See conditions below'}</div>
          </div>
          ${tm.gate?.urgency ? `<div style="margin-left: auto; font-size: 9px; font-weight: 600; color: ${tm.gate.urgency === 'immediate' ? '#dc2626' : tm.gate.urgency === 'soon' ? '#d97706' : '#6b7280'};">Urgency: ${tm.gate.urgency.toUpperCase()}</div>` : ''}
        </div>
      </div>

      <!-- Timing Conditions -->
      ${tm.conditions && tm.conditions.length > 0 ? `
      <div class="card">
        <div class="card-title">Entry Conditions</div>
        ${tm.conditions.map(c => `
          <div class="condition-item">
            <div class="condition-check ${c.met ? 'condition-met' : 'condition-not'}">${c.met ? 'Y' : 'N'}</div>
            <div style="flex: 1;">
              <div style="font-weight: 500;">${c.name}</div>
              ${c.details ? `<div style="font-size: 7px; color: #64748b;">${c.details}</div>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
      ` : ''}

      <!-- Entry Zones -->
      ${tm.entryZones && tm.entryZones.length > 0 ? `
      <div class="card">
        <div class="card-title">Entry Zones</div>
        ${tm.entryZones.slice(0, 3).map((ez, i) => `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 4px 0; border-bottom: 1px solid #f1f5f9;">
            <div style="font-size: 9px; font-weight: 500;">Zone ${i + 1}</div>
            <div style="font-size: 9px;">${formatPrice(ez.priceLow)} - ${formatPrice(ez.priceHigh)}</div>
            <div style="font-size: 8px; color: #64748b;">Probability: ${(ez.probability * 100).toFixed(0)}%</div>
            ${ez.quality !== undefined ? `<div style="font-size: 8px; color: ${ez.quality >= 0.7 ? '#16a34a' : ez.quality >= 0.5 ? '#d97706' : '#dc2626'};">Quality: ${(ez.quality * 100).toFixed(0)}%</div>` : ''}
          </div>
        `).join('')}
        ${tm.optimalEntry ? `<div style="font-size: 9px; margin-top: 6px; text-align: center; font-weight: 600; color: #2563eb;">Optimal Entry: ${formatPrice(tm.optimalEntry)}</div>` : ''}
      </div>
      ` : ''}
    </div>

    <!-- Step 5: Trade Plan -->
    <div class="section">
      <div class="section-header">
        <div class="section-title">
          <span class="step-num">STEP 5</span>
          Trade Plan
          <span class="section-subtitle">Execution Strategy</span>
        </div>
        ${getGateStatusHTML(tp.gate)}
      </div>

      <!-- Direction & Overview -->
      <div class="card" style="background: ${isLong ? '#dcfce7' : '#fee2e2'};">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-size: 14px; font-weight: bold; color: ${isLong ? '#166534' : '#991b1b'};">
              ${isLong ? 'LONG POSITION' : 'SHORT POSITION'}
            </div>
            <div style="font-size: 8px; color: #475569; margin-top: 2px;">
              ${tp.gate?.planQuality ? `Plan Quality: ${tp.gate.planQuality.toUpperCase()}` : ''} | Confidence: ${((tp.confidence || 0) * 100).toFixed(0)}%
            </div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 11px; font-weight: bold;">R:R ${tp.riskReward?.toFixed(1) || '0'}:1</div>
            <div style="font-size: 8px; color: #64748b;">Win Rate: ${tp.winRateEstimate || 50}%</div>
          </div>
        </div>
      </div>

      <!-- Trade Levels -->
      <div class="card">
        <div class="card-title">Trade Levels</div>
        <div class="trade-grid">
          <div class="trade-item" style="border-color: #93c5fd;">
            <div class="trade-label">Entry Price</div>
            <div class="trade-value text-blue">${formatPrice(tp.averageEntry)}</div>
            ${tp.entries && tp.entries.length > 1 ? `<div style="font-size: 7px; color: #64748b; margin-top: 2px;">${tp.entries.length} entry zones</div>` : ''}
          </div>
          <div class="trade-item" style="border-color: #fca5a5;">
            <div class="trade-label">Stop Loss</div>
            <div class="trade-value text-red">${formatPrice(tp.stopLoss?.price)}</div>
            <div class="trade-percent text-red">${tp.stopLoss?.percentage ? `-${tp.stopLoss.percentage.toFixed(2)}%` : ''}</div>
          </div>
          <div class="trade-item" style="border-color: #86efac;">
            <div class="trade-label">Position Size</div>
            <div class="trade-value">${tp.positionSizePercent?.toFixed(1) || '-'}%</div>
            <div style="font-size: 7px; color: #64748b;">of portfolio</div>
          </div>
        </div>

        <div style="margin-top: 10px;">
          <div style="font-size: 9px; font-weight: 600; margin-bottom: 6px;">Take Profit Targets:</div>
          <div class="trade-grid">
            ${tp.takeProfits.slice(0, 3).map((t, i) => `
              <div class="trade-item" style="border-color: #86efac;">
                <div class="trade-label">TP${i + 1} ${t.percentage ? `(${t.percentage}%)` : ''}</div>
                <div class="trade-value text-green">${formatPrice(t.price)}</div>
                ${t.reason ? `<div style="font-size: 6px; color: #64748b; margin-top: 2px;">${t.reason.slice(0, 20)}</div>` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- Entry Details -->
      ${tp.entries && tp.entries.length > 0 ? `
      <div class="card">
        <div class="card-title">Entry Breakdown</div>
        ${tp.entries.map((e, i) => `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 4px 0; border-bottom: 1px solid #f1f5f9;">
            <div style="font-size: 9px; font-weight: 500;">Entry ${i + 1}</div>
            <div style="font-size: 9px; color: #2563eb;">${formatPrice(e.price)}</div>
            <div style="font-size: 8px; color: #64748b;">${e.percentage}% of position</div>
            <div style="font-size: 7px; color: #94a3b8;">${e.source || ''}</div>
          </div>
        `).join('')}
      </div>
      ` : ''}

      <!-- Trailing Stop -->
      ${tp.trailingStop ? `
      <div class="info-box">
        <div class="info-text"><strong>Trailing Stop:</strong> Activates ${tp.trailingStop.activateAfter} with ${tp.trailingStop.trailPercent.toFixed(2)}% trail distance</div>
      </div>
      ` : ''}

      <!-- Summary -->
      <div class="summary-box">
        <div class="summary-title">Trade Plan Summary</div>
        <div class="summary-text">
          <strong>Direction:</strong> ${tp.direction?.toUpperCase()} with ${tp.riskReward?.toFixed(1)}:1 risk-reward<br/>
          <strong>Entry:</strong> ${formatPrice(tp.averageEntry)} | <strong>Stop:</strong> ${formatPrice(tp.stopLoss?.price)} (${tp.stopLoss?.percentage?.toFixed(2) || '-'}% risk)<br/>
          <strong>Targets:</strong> ${tp.takeProfits.map((t, i) => `TP${i + 1}: ${formatPrice(t.price)}`).join(' | ')}<br/>
          ${tp.stopLoss?.reason ? `<strong>SL Reason:</strong> ${tp.stopLoss.reason}` : ''}
        </div>
      </div>
    </div>

    <div class="page-footer"><span class="logo-red">Trade</span><span class="logo-green">Path</span> | Analysis ID: ${data.analysisId?.slice(-12) || 'N/A'}</div>
    <div class="page-number">Page 4 of 6</div>
  </div>
</body></html>`;
}

// ===========================================
// PAGE 5: TRAP CHECK & VERDICT
// ===========================================

function generatePage5HTML(data: AnalysisReportData): string {
  const tc = data.trapCheck;
  const v = data.verdict;
  const isLong = data.tradePlan?.direction === 'long';
  const score = Math.round((v.overallScore || 0) * 10);

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>${commonStyles}</style></head>
<body>
  <div class="page">
    <div class="page-title"><span class="logo-red">Trade</span><span class="logo-green">Path</span> | <span class="symbol">${data.symbol}/USDT</span> Final Analysis</div>

    <!-- Step 6: Trap Check -->
    ${tc ? `
    <div class="section">
      <div class="section-header">
        <div class="section-title">
          <span class="step-num">STEP 6</span>
          Trap Check
          <span class="section-subtitle">Avoiding Common Pitfalls</span>
        </div>
        ${getGateStatusHTML(tc.gate)}
      </div>

      <!-- Trap Detection -->
      <div class="card">
        <div class="card-title">Trap Detection</div>
        <div class="metrics-grid">
          <div class="metric-box">
            <div class="metric-label">Bull Trap</div>
            <div class="metric-value" style="color: ${tc.traps.bullTrap ? '#dc2626' : '#16a34a'};">
              ${tc.traps.bullTrap ? 'DETECTED' : 'CLEAR'}
            </div>
            ${tc.traps.bullTrapZone ? `<div class="metric-interp">Zone: ${formatPrice(tc.traps.bullTrapZone)}</div>` : ''}
          </div>
          <div class="metric-box">
            <div class="metric-label">Bear Trap</div>
            <div class="metric-value" style="color: ${tc.traps.bearTrap ? '#dc2626' : '#16a34a'};">
              ${tc.traps.bearTrap ? 'DETECTED' : 'CLEAR'}
            </div>
            ${tc.traps.bearTrapZone ? `<div class="metric-interp">Zone: ${formatPrice(tc.traps.bearTrapZone)}</div>` : ''}
          </div>
          <div class="metric-box">
            <div class="metric-label">Fakeout Risk</div>
            <div class="metric-value" style="color: ${tc.traps.fakeoutRisk === 'high' ? '#dc2626' : tc.traps.fakeoutRisk === 'medium' ? '#d97706' : '#16a34a'};">
              ${tc.traps.fakeoutRisk?.toUpperCase() || 'LOW'}
            </div>
          </div>
          <div class="metric-box">
            <div class="metric-label">Liquidity Grab</div>
            <div class="metric-value" style="color: ${tc.traps.liquidityGrab?.detected ? '#d97706' : '#16a34a'};">
              ${tc.traps.liquidityGrab?.detected ? 'POSSIBLE' : 'UNLIKELY'}
            </div>
          </div>
        </div>
      </div>

      <!-- Stop Hunt Zones -->
      ${tc.traps.stopHuntZones && tc.traps.stopHuntZones.length > 0 ? `
      <div class="card">
        <div class="card-title">Stop Hunt Zones</div>
        <div style="font-size: 9px; color: #475569;">
          ${tc.traps.stopHuntZones.map(z => formatPrice(z)).join(' | ')}
        </div>
        <div class="warning-box" style="margin-top: 6px;">
          <div class="warning-text">Warning: Avoid placing stops near these levels - high probability of stop hunting</div>
        </div>
      </div>
      ` : ''}

      <!-- Counter Strategy -->
      ${tc.counterStrategy && tc.counterStrategy.length > 0 ? `
      <div class="card">
        <div class="card-title">Counter Strategy</div>
        ${tc.counterStrategy.map(s => `<div style="font-size: 8px; color: #475569; padding: 3px 0;">- ${s}</div>`).join('')}
      </div>
      ` : ''}

      <!-- Pro Tip -->
      ${tc.proTip ? `
      <div class="info-box">
        <div class="info-text"><strong>Pro Tip:</strong> ${tc.proTip}</div>
      </div>
      ` : ''}
    </div>
    ` : ''}

    <!-- Step 7: Final Verdict -->
    <div class="section">
      <div class="section-header">
        <div class="section-title">
          <span class="step-num">STEP 7</span>
          Final Verdict
          <span class="section-subtitle">The Decision</span>
        </div>
      </div>

      <!-- Verdict Box -->
      <div class="card" style="background: linear-gradient(135deg, ${isLong ? '#dcfce7' : '#fee2e2'} 0%, #fff 100%); border: 2px solid ${isLong ? '#16a34a' : '#dc2626'};">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-size: 16px; font-weight: bold; color: ${isLong ? '#166534' : '#991b1b'};">
              ${v.action || 'N/A'}
            </div>
            <div style="font-size: 9px; color: #475569; margin-top: 4px;">
              ${isLong ? 'Bullish setup - Long position recommended' : 'Bearish setup - Short position recommended'}
            </div>
          </div>
          <div style="text-align: center; padding: 15px 25px; background: ${isLong ? '#16a34a' : '#dc2626'}; border-radius: 12px;">
            <div style="font-size: 28px; font-weight: bold; color: white;">${score}</div>
            <div style="font-size: 8px; color: rgba(255,255,255,0.9);">SCORE / 100</div>
          </div>
        </div>
      </div>

      <!-- Component Scores -->
      ${v.componentScores ? `
      <div class="card">
        <div class="card-title">Component Scores</div>
        <div class="metrics-grid">
          ${Object.entries(v.componentScores).slice(0, 8).map(([key, val]) => `
            <div class="metric-box">
              <div class="metric-label">${key.replace(/([A-Z])/g, ' $1').trim()}</div>
              <div class="metric-value" style="color: ${Number(val) >= 7 ? '#16a34a' : Number(val) >= 5 ? '#d97706' : '#dc2626'};">${Number(val).toFixed(1)}</div>
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}

      <!-- Confidence Factors -->
      ${v.confidenceFactors && v.confidenceFactors.length > 0 ? `
      <div class="card">
        <div class="card-title">Confidence Factors</div>
        ${v.confidenceFactors.slice(0, 6).map(cf => `
          <div class="condition-item">
            <div class="condition-check ${cf.positive ? 'condition-met' : 'condition-not'}">${cf.positive ? '+' : '-'}</div>
            <div style="flex: 1; font-size: 8px;">${cf.factor}</div>
            ${cf.impact ? `<div style="font-size: 7px; color: #64748b;">${cf.impact}</div>` : ''}
          </div>
        `).join('')}
      </div>
      ` : ''}

      <!-- AI Summary -->
      <div class="summary-box" style="background: linear-gradient(135deg, #fef3c7 0%, #fef9c3 100%); border-color: #fcd34d;">
        <div class="summary-title">AI Analysis Summary</div>
        <div class="summary-text">${v.aiSummary || v.recommendation || 'Analysis complete. Review all sections for detailed insights.'}</div>
      </div>
    </div>

    <!-- Chart -->
    ${data.chartImage ? `
    <div class="section">
      <div class="chart-box">
        <div class="chart-header">${data.symbol}/USDT - Trade Plan Visualization</div>
        <img src="${data.chartImage}" class="chart-image" alt="Trade Chart" />
      </div>
    </div>
    ` : ''}

    <div class="page-footer"><span class="logo-red">Trade</span><span class="logo-green">Path</span> | Analysis ID: ${data.analysisId?.slice(-12) || 'N/A'}</div>
    <div class="page-number">Page 5 of 6</div>
  </div>
</body></html>`;
}

// ===========================================
// PAGE 6: AI EXPERT COMMENTS
// ===========================================

function generatePage6HTML(data: AnalysisReportData): string {
  const comment = data.aiExpertComment || '';

  // Parse multi-expert format or use as single comment
  const expertConfig: Record<string, { role: string; color: string; bg: string }> = {
    'ARIA': { role: 'Technical Analysis', color: '#3b82f6', bg: '#dbeafe' },
    'NEXUS': { role: 'Risk Management', color: '#10b981', bg: '#dcfce7' },
    'ORACLE': { role: 'On-Chain Intelligence', color: '#a855f7', bg: '#f3e8ff' },
    'SENTINEL': { role: 'Security Analysis', color: '#f97316', bg: '#ffedd5' }
  };

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>${commonStyles}</style></head>
<body>
  <div class="page">
    <div class="page-title"><span class="logo-red">Trade</span><span class="logo-green">Path</span> | <span class="symbol">${data.symbol}/USDT</span> AI Expert Analysis</div>

    <div class="section">
      <div class="section-title" style="margin-bottom: 12px;">
        AI Expert Risk Assessment
        <span class="section-subtitle">Multi-perspective analysis by NEXUS AI Panel</span>
      </div>

      ${comment ? `
      <div class="expert-box" style="background: #f8fafc;">
        <div class="expert-header">
          <div class="expert-icon" style="background: #dcfce7;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="22" y1="12" x2="18" y2="12"/><line x1="6" y1="12" x2="2" y2="12"/><line x1="12" y1="6" x2="12" y2="2"/><line x1="12" y1="22" x2="12" y2="18"/></svg>
          </div>
          <div>
            <div class="expert-name">NEXUS AI Panel</div>
            <div class="expert-role" style="color: #10b981;">Comprehensive Risk Assessment</div>
          </div>
        </div>
        <div class="expert-content" style="white-space: pre-wrap; font-size: 8px; line-height: 1.6;">${comment}</div>
      </div>
      ` : `
      <div style="text-align: center; padding: 40px; color: #94a3b8;">
        <div style="font-size: 14px; font-weight: bold; margin-bottom: 10px;">[AI]</div>
        <div style="font-size: 11px;">No AI Expert comments available for this analysis.</div>
        <div style="font-size: 9px; margin-top: 8px;">Generate a report with AI Expert analysis enabled to see detailed insights.</div>
      </div>
      `}
    </div>

    <!-- Disclaimer -->
    <div style="position: absolute; bottom: 60px; left: 25px; right: 25px;">
      <div class="warning-box" style="background: #fef2f2; border-color: #fecaca;">
        <div class="warning-text" style="color: #991b1b;">
          <strong>RISK DISCLAIMER</strong><br/><br/>
          This report is generated by TraderPath AI for <strong>educational and informational purposes only</strong>. It does not constitute financial advice, investment recommendation, or an offer to buy or sell any financial instruments.<br/><br/>
          <strong>Cryptocurrency trading involves substantial risk of loss.</strong> Past performance is not indicative of future results. The market can move against your position at any time.<br/><br/>
          Always conduct your own research (DYOR) and consult with a qualified financial advisor before making any investment decisions. Never invest more than you can afford to lose.
        </div>
      </div>
    </div>

    <div class="page-footer">
      (c) ${new Date().getFullYear()} TraderPath. All rights reserved. | www.traderpath.io | Analysis ID: ${data.analysisId?.slice(-12) || 'N/A'}
    </div>
    <div class="page-number">Page 6 of 6</div>
  </div>
</body></html>`;
}

// ===========================================
// CHART CAPTURE
// ===========================================

export async function captureChartAsImage(): Promise<string | null> {
  try {
    const element = document.getElementById('trade-plan-chart');
    if (!element) return null;

    await new Promise(resolve => setTimeout(resolve, 500));

    const canvas = await html2canvas(element, {
      backgroundColor: '#ffffff',
      scale: 2,
      logging: false,
      useCORS: true,
      allowTaint: true,
    });

    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('Chart capture failed:', error);
    return null;
  }
}

// ===========================================
// RENDER & GENERATE PDF
// ===========================================

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
  // Capture chart if needed
  if (captureChart && !data.chartImage) {
    const chartImage = await captureChartAsImage();
    if (chartImage) data.chartImage = chartImage;
  }

  // Create PDF
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();

  // Page 1: Overview & Market Pulse
  const canvas1 = await renderPageToCanvas(generatePage1HTML(data));
  pdf.addImage(canvas1.toDataURL('image/png'), 'PNG', 0, 0, pdfWidth, pdfHeight);

  // Page 2: Asset Scan (Full Indicators)
  pdf.addPage();
  const canvas2 = await renderPageToCanvas(generatePage2HTML(data));
  pdf.addImage(canvas2.toDataURL('image/png'), 'PNG', 0, 0, pdfWidth, pdfHeight);

  // Page 3: Safety Check
  pdf.addPage();
  const canvas3 = await renderPageToCanvas(generatePage3HTML(data));
  pdf.addImage(canvas3.toDataURL('image/png'), 'PNG', 0, 0, pdfWidth, pdfHeight);

  // Page 4: Timing & Trade Plan
  pdf.addPage();
  const canvas4 = await renderPageToCanvas(generatePage4HTML(data));
  pdf.addImage(canvas4.toDataURL('image/png'), 'PNG', 0, 0, pdfWidth, pdfHeight);

  // Page 5: Trap Check & Verdict
  pdf.addPage();
  const canvas5 = await renderPageToCanvas(generatePage5HTML(data));
  pdf.addImage(canvas5.toDataURL('image/png'), 'PNG', 0, 0, pdfWidth, pdfHeight);

  // Page 6: AI Expert Comments
  pdf.addPage();
  const canvas6 = await renderPageToCanvas(generatePage6HTML(data));
  pdf.addImage(canvas6.toDataURL('image/png'), 'PNG', 0, 0, pdfWidth, pdfHeight);

  // Generate filename
  const tradeTypeLabels: Record<string, string> = { scalping: 'Scalping', dayTrade: 'DayTrade', swing: 'Swing' };
  const tradeTypeLabel = data.tradeType ? tradeTypeLabels[data.tradeType] || '' : '';
  const fileName = `TraderPath_${data.symbol}${tradeTypeLabel ? `_${tradeTypeLabel}` : ''}_Report_${new Date().toISOString().split('T')[0]}.pdf`;

  // Get PDF as base64
  const pdfBase64 = pdf.output('datauristring').split(',')[1];

  // Save to user's device
  pdf.save(fileName);

  return { base64: pdfBase64, fileName };
}

export type { AnalysisReportData as ReportData };
