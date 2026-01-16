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

  // Tokenomics data (optional)
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
    verdict?: string; // API returns 'verdict', some places use 'action'
    overallScore: number;
    aiSummary?: string;
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
    summary?: { bullishIndicators: number; bearishIndicators: number; neutralIndicators: number; totalIndicatorsUsed: number; overallSignal: 'bullish' | 'bearish' | 'neutral'; signalConfidence: number; leadingIndicatorsSignal: 'bullish' | 'bearish' | 'neutral' | 'mixed' };
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

function formatVolume(vol: number | undefined): string {
  if (!vol) return '-';
  if (vol >= 1e9) return `$${(vol / 1e9).toFixed(2)}B`;
  if (vol >= 1e6) return `$${(vol / 1e6).toFixed(2)}M`;
  if (vol >= 1e3) return `$${(vol / 1e3).toFixed(2)}K`;
  return `$${vol.toFixed(0)}`;
}

function formatPercent(val: number | undefined): string {
  if (val === undefined || isNaN(val)) return '-';
  // Normalize: handle different scales
  // 0-1 range (0.75) -> multiply by 100 = 75%
  // 0-10 range (7.5) -> multiply by 10 = 75%
  // 0-100 range (75) -> keep as is = 75%
  let pct: number;
  if (val <= 1) {
    pct = val * 100;
  } else if (val <= 10) {
    pct = val * 10;
  } else {
    pct = val;
  }
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
    'risk_on': 'Risk On',
    'risk_off': 'Risk Off',
    'risk-on': 'Risk On',
    'risk-off': 'Risk Off',
    'normal': 'Normal',
    'volatile': 'Volatile',
    'trending': 'Trending',
    'ranging': 'Ranging'
  };
  return map[regime.toLowerCase()] || regime.charAt(0).toUpperCase() + regime.slice(1).replace(/_/g, ' ');
}

function formatDirection(dir: string | null | undefined): string {
  if (!dir) return 'Neutral';
  return dir.charAt(0).toUpperCase() + dir.slice(1);
}

// Gate status - softer language
function getGateStatus(gate: { canProceed: boolean; confidence: number } | undefined): { text: string; color: string } {
  if (!gate) return { text: '', color: '#666' };
  const conf = formatPercent(gate.confidence);
  if (gate.canProceed) {
    return { text: `Passed ${conf}`, color: '#16a34a' };
  } else {
    return { text: `Review ${conf}`, color: '#d97706' };
  }
}

// Format action text (conditional_go → Conditionally GO)
// Accepts either verdict.action or verdict.verdict field
function formatAction(actionOrVerdict: string | undefined): string {
  if (!actionOrVerdict) return 'ANALYSIS COMPLETE';
  const map: Record<string, string> = {
    'go': 'GO',
    'conditional_go': 'Conditionally GO',
    'conditionally_go': 'Conditionally GO',
    'wait': 'WAIT',
    'no_go': 'NO GO',
    'avoid': 'AVOID',
    'stop': 'STOP',
    'hold': 'HOLD',
  };
  const lower = actionOrVerdict.toLowerCase().replace(/-/g, '_');
  return map[lower] || actionOrVerdict.toUpperCase().replace(/_/g, ' ');
}

// Get action from verdict object (supports both action and verdict fields)
function getVerdictAction(v: { action?: string; verdict?: string } | undefined): string {
  return v?.action || v?.verdict || '';
}

// Format indicator value for display
function formatIndicatorValue(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'string') return value;
  if (isNaN(value)) return '-';
  if (Math.abs(value) >= 1000) return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (Math.abs(value) >= 1) return value.toFixed(2);
  return value.toFixed(4);
}

// Render indicator table for a category
function renderIndicatorTable(indicators: Record<string, IndicatorDetailItem | undefined> | undefined, title: string): string {
  if (!indicators) return '';
  const items = Object.values(indicators).filter((i): i is IndicatorDetailItem => i !== undefined);
  if (items.length === 0) return '';

  return `
    <div class="section" style="margin-bottom: 8px;">
      <div style="font-size: 8px; font-weight: 600; margin-bottom: 4px; color: #333;">${title} Indicators (${items.length})</div>
      <table class="table indicator-table">
        <tr>
          <th style="width: 22%;">Indicator</th>
          <th style="width: 15%;">Value</th>
          <th style="width: 12%;">Signal</th>
          <th style="width: 10%;">Strength</th>
          <th style="width: 41%;">Interpretation</th>
        </tr>
        ${items.map(ind => `
          <tr>
            <td style="font-weight: 500;">${ind.name}${ind.isLeadingIndicator ? ' *' : ''}</td>
            <td>${formatIndicatorValue(ind.value)}</td>
            <td class="${ind.signal === 'bullish' ? 'text-green' : ind.signal === 'bearish' ? 'text-red' : ''}" style="font-weight: 600;">${ind.signal.toUpperCase()}</td>
            <td>${ind.signalStrength}</td>
            <td style="font-size: 6.5px;">${ind.interpretation?.slice(0, 80) || '-'}${(ind.interpretation?.length || 0) > 80 ? '...' : ''}</td>
          </tr>
        `).join('')}
      </table>
    </div>
  `;
}

// Logo SVG inline
const logoSvg = `<svg width="32" height="32" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="tealGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#5EEDC3"/>
      <stop offset="50%" stop-color="#2DD4A8"/>
      <stop offset="100%" stop-color="#14B8A6"/>
    </linearGradient>
    <linearGradient id="coralGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FF8A9B"/>
      <stop offset="50%" stop-color="#F87171"/>
      <stop offset="100%" stop-color="#EF5A6F"/>
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

  .header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 2px solid #1a1a1a; margin-bottom: 14px; }
  .brand { display: flex; align-items: center; gap: 8px; }
  .logo { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; }
  .logo svg { width: 32px; height: 32px; }
  .brand-name { font-size: 18px; font-weight: 700; letter-spacing: -0.5px; }
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

  .section { margin-bottom: 12px; }
  .section-header { display: flex; align-items: baseline; gap: 8px; margin-bottom: 6px; border-bottom: 1px solid #e0e0e0; padding-bottom: 4px; }
  .step-num { font-size: 8px; font-weight: 600; color: #666; }
  .section-title { font-size: 10px; font-weight: 600; color: #1a1a1a; }
  .gate-status { margin-left: auto; font-size: 7px; font-weight: 600; }

  /* Step Box Styling */
  .step-box { border: 1px solid #e0e0e0; border-radius: 6px; padding: 10px 12px; margin-bottom: 10px; background: #fafafa; }
  .step-box-header { display: flex; align-items: center; gap: 6px; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid #eee; }
  .step-box-num { font-size: 9px; font-weight: 700; color: #666; }
  .step-box-title { font-size: 10px; font-weight: 600; color: #1a1a1a; }
  .step-box-gate { margin-left: auto; font-size: 7px; font-weight: 600; }
  .step-summary { font-size: 7px; color: #333; background: #f0f0f0; border-left: 2px solid #16a34a; padding: 6px 8px; margin-top: 8px; line-height: 1.5; }
  .step-summary-title { font-size: 7px; font-weight: 600; color: #666; margin-bottom: 3px; }

  .row { display: flex; gap: 8px; margin-bottom: 6px; }
  .col { flex: 1; }
  .col-2 { flex: 2; }

  .metric { background: #fafafa; border: 1px solid #eee; border-radius: 3px; padding: 6px 8px; }
  .metric-sm { padding: 4px 6px; }
  .metric-label { font-size: 7px; color: #666; text-transform: uppercase; letter-spacing: 0.3px; }
  .metric-value { font-size: 11px; font-weight: 600; color: #1a1a1a; margin-top: 1px; }
  .metric-value-lg { font-size: 13px; }
  .metric-note { font-size: 7px; color: #888; margin-top: 1px; }

  .text-green { color: #16a34a; }
  .text-red { color: #dc2626; }
  .text-amber { color: #d97706; }
  .text-muted { color: #666; }

  .list { display: grid; grid-template-columns: 1fr 1fr; gap: 3px 12px; }
  .list-item { display: flex; align-items: center; gap: 6px; padding: 2px 0; font-size: 8px; }
  .list-icon { width: 12px; text-align: center; font-weight: 600; }
  .list-icon-y { color: #16a34a; }
  .list-icon-n { color: #dc2626; }

  .table { width: 100%; border-collapse: collapse; }
  .table th { text-align: left; font-size: 7px; font-weight: 600; color: #666; text-transform: uppercase; padding: 4px 6px; border-bottom: 1px solid #ddd; background: #f9fafb; }
  .table td { font-size: 7px; padding: 4px 6px; border-bottom: 1px solid #f0f0f0; }
  .table tr:last-child td { border-bottom: none; }
  .table tr:nth-child(even) { background: #fafafa; }
  .indicator-table { font-size: 7px; }
  .indicator-table th { font-size: 6px; padding: 3px 4px; }
  .indicator-table td { font-size: 6.5px; padding: 2px 4px; }

  .indicator-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 12px; }
  .indicator-item { display: flex; justify-content: space-between; align-items: center; padding: 2px 0; border-bottom: 1px solid #f5f5f5; font-size: 8px; }
  .indicator-name { color: #444; }
  .indicator-value { font-weight: 600; min-width: 50px; text-align: right; }
  .indicator-signal { font-size: 7px; min-width: 45px; text-align: right; }
  .leading-badge { font-size: 6px; background: #e0e7ff; color: #3730a3; padding: 1px 3px; border-radius: 2px; margin-left: 3px; }

  .summary-box { background: #f8f9fa; border-left: 3px solid #1a1a1a; padding: 8px 10px; margin-top: 8px; }
  .summary-text { font-size: 8px; color: #333; line-height: 1.5; }

  .verdict-box { border: 2px solid #1a1a1a; border-radius: 4px; padding: 12px; margin-bottom: 10px; }
  .verdict-row { display: flex; justify-content: space-between; align-items: center; }
  .verdict-action { font-size: 16px; font-weight: 700; }
  .verdict-action-centered { font-size: 16px; font-weight: 700; text-align: center; display: block; }
  .verdict-subtitle-centered { font-size: 8px; color: #666; margin-top: 4px; text-align: center; }
  .verdict-score { text-align: center; }
  .verdict-score-value { font-size: 32px; font-weight: 700; }
  .verdict-score-label { font-size: 8px; color: #666; }

  /* Indicator Summary Box */
  .indicator-summary-box { border: 1px solid #d0d0d0; border-radius: 6px; padding: 12px; margin-top: 10px; background: linear-gradient(180deg, #f8f9fa 0%, #fff 100%); }
  .indicator-summary-header { font-size: 10px; font-weight: 600; color: #1a1a1a; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid #eee; }
  .ai-comment { background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%); border: 1px solid #86efac; border-radius: 4px; padding: 8px 10px; margin-top: 8px; }
  .ai-comment-header { font-size: 7px; font-weight: 600; color: #166534; margin-bottom: 4px; display: flex; align-items: center; gap: 4px; }
  .ai-comment-text { font-size: 7px; color: #15803d; line-height: 1.5; }

  .factor-list { }
  .factor-item { display: flex; align-items: center; gap: 6px; padding: 3px 0; font-size: 8px; }
  .factor-icon { font-weight: 700; width: 14px; text-align: center; }

  .footer { position: absolute; bottom: 10px; left: 24px; right: 24px; display: flex; justify-content: space-between; font-size: 7px; color: #999; border-top: 1px solid #eee; padding-top: 6px; }

  .disclaimer { background: #fef2f2; border: 1px solid #fecaca; border-radius: 3px; padding: 8px; margin-top: 10px; }
  .disclaimer-title { font-size: 7px; font-weight: 600; color: #991b1b; margin-bottom: 3px; }
  .disclaimer-text { font-size: 6px; color: #991b1b; line-height: 1.4; }
`;

// ===========================================
// PAGE 1: Executive Summary
// ===========================================

function generatePage1(data: AnalysisReportData, totalPages: number = 5): string {
  const mp = data.marketPulse;
  const as = data.assetScan;
  const sc = data.safetyCheck;
  const tp = data.tradePlan;
  const v = data.verdict;
  const tk = data.tokenomics;
  const ind = data.indicatorDetails;
  const isLong = tp?.direction === 'long';
  const score = formatPercent(v?.overallScore);
  const tradeTypes: Record<string, string> = { scalping: 'Scalping', dayTrade: 'Day Trade', swing: 'Swing Trade' };

  const mpGate = getGateStatus(mp.gate);
  const asGate = getGateStatus(as.gate);
  const scGate = getGateStatus(sc.gate);

  // Generate step summaries from AI insights
  const mpSummary = mp.aiSummary || (mp.gate?.reason ? `Market conditions: ${mp.gate.reason}` : '');
  const asSummary = as.aiInsight || (as.gate?.reason ? `Asset analysis: ${as.gate.reason}` : '');
  const scSummary = sc.aiInsight || (sc.gate?.reason ? `Safety assessment: ${sc.gate.reason}` : '');

  // Get trend indicators for Asset Scanner step
  const trendIndicators = ind?.trend ? Object.values(ind.trend).filter(Boolean).slice(0, 4) : [];
  const momentumIndicators = ind?.momentum ? Object.values(ind.momentum).filter(Boolean).slice(0, 3) : [];

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${styles}</style></head><body>
  <div class="page">
    <div class="header">
      <div class="brand">
        <div class="logo">${logoSvg}</div>
        <div>
          <div class="brand-name"><span class="brand-trade">Trader</span><span class="brand-path">Path</span></div>
        </div>
      </div>
      <div class="header-center">
        <div class="report-title">AI-Based Analysis Report</div>
        <div class="report-subtitle">${tradeTypes[data.tradeType || ''] || 'Comprehensive Analysis'} | ${data.generatedAt}</div>
      </div>
      <div class="header-right">
        <div>
          <span class="symbol">${data.symbol}/USDT</span>
          <span class="direction-tag ${isLong ? 'tag-long' : 'tag-short'}">${isLong ? 'LONG' : 'SHORT'}</span>
        </div>
        <div class="score-box">
          <span class="score-value ${isLong ? 'text-green' : 'text-red'}">${score}</span>
          <span class="score-label"> confidence</span>
        </div>
      </div>
    </div>

    <!-- Executive Summary - Centered Verdict -->
    <div class="verdict-box">
      <div class="verdict-action-centered">${formatAction(getVerdictAction(v))}</div>
      <div class="verdict-subtitle-centered">${v?.aiSummary?.slice(0, 200) || 'Review the detailed analysis sections below.'}${(v?.aiSummary?.length || 0) > 200 ? '...' : ''}</div>
    </div>

    <!-- Trade Plan Summary Box -->
    <div class="step-box">
      <div class="step-box-header">
        <span class="step-box-title">Trade Plan</span>
      </div>
      <div class="row">
        <div class="col metric">
          <div class="metric-label">Direction</div>
          <div class="metric-value ${isLong ? 'text-green' : 'text-red'}">${formatDirection(tp?.direction)}</div>
        </div>
        <div class="col metric">
          <div class="metric-label">Entry</div>
          <div class="metric-value">${formatPrice(tp?.averageEntry)}</div>
        </div>
        <div class="col metric">
          <div class="metric-label">Stop Loss</div>
          <div class="metric-value text-red">${formatPrice(tp?.stopLoss?.price)}</div>
          <div class="metric-note">${tp?.stopLoss?.percentage ? `${tp.stopLoss.percentage.toFixed(1)}% risk` : ''}</div>
        </div>
        <div class="col metric">
          <div class="metric-label">Risk:Reward</div>
          <div class="metric-value">${formatRiskReward(tp?.riskReward)}</div>
        </div>
      </div>
      <div class="row">
        ${(tp?.takeProfits || []).slice(0, 4).map((t, i) => `
          <div class="col metric metric-sm">
            <div class="metric-label">Target ${i + 1}</div>
            <div class="metric-value text-green">${formatPrice(t.price)}</div>
            <div class="metric-note">${t.percentage ? `+${t.percentage.toFixed(1)}%` : ''}</div>
          </div>
        `).join('')}
      </div>
          </div>

    <!-- Step 01: Market Pulse with Tokenomics -->
    <div class="step-box">
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
      ${tk ? `
      <div style="margin-top: 6px; font-size: 7px; font-weight: 600; color: #666; border-top: 1px dashed #ddd; padding-top: 6px;">Tokenomics</div>
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
      ${mpSummary ? `<div class="step-summary"><div class="step-summary-title">Step Summary</div>${mpSummary}</div>` : ''}
    </div>

    <!-- Step 02: Asset Scanner -->
    <div class="step-box">
      <div class="step-box-header">
        <span class="step-box-num">02</span>
        <span class="step-box-title">Asset Scanner</span>
        <span class="step-box-gate" style="color: ${asGate.color}">${asGate.text}</span>
      </div>
      <div class="row">
        <div class="col metric metric-sm">
          <div class="metric-label">Price</div>
          <div class="metric-value">${formatPrice(as.currentPrice)}</div>
          <div class="metric-note ${as.priceChange24h >= 0 ? 'text-green' : 'text-red'}">${as.priceChange24h >= 0 ? '+' : ''}${as.priceChange24h?.toFixed(2)}% 24h</div>
        </div>
        <div class="col metric metric-sm">
          <div class="metric-label">Volume 24h</div>
          <div class="metric-value">${formatVolume(as.volume24h)}</div>
        </div>
        <div class="col metric metric-sm">
          <div class="metric-label">RSI</div>
          <div class="metric-value ${(as.indicators?.rsi || 50) >= 70 ? 'text-red' : (as.indicators?.rsi || 50) <= 30 ? 'text-green' : ''}">${as.indicators?.rsi?.toFixed(1) || '-'}</div>
        </div>
        <div class="col metric metric-sm">
          <div class="metric-label">Signal</div>
          <div class="metric-value ${as.direction === 'long' ? 'text-green' : as.direction === 'short' ? 'text-red' : ''}">${formatDirection(as.direction)}</div>
          <div class="metric-note">${formatPercent(as.directionConfidence)} conf</div>
        </div>
      </div>
      ${as.levels ? `
      <div style="margin-top: 4px; font-size: 7px; color: #666;">
        <span>Support: <span class="text-green">${as.levels.support.slice(0, 2).map(s => formatPrice(s)).join(', ')}</span></span>
        <span style="margin-left: 12px;">Resistance: <span class="text-red">${as.levels.resistance.slice(0, 2).map(r => formatPrice(r)).join(', ')}</span></span>
      </div>
      ` : ''}
      ${trendIndicators.length > 0 ? `
      <div style="margin-top: 6px; font-size: 7px; font-weight: 600; color: #666; border-top: 1px dashed #ddd; padding-top: 6px;">Key Indicators</div>
      <div class="row" style="margin-top: 4px;">
        ${trendIndicators.slice(0, 4).map(i => `
          <div class="col metric metric-sm">
            <div class="metric-label">${i?.name || ''}</div>
            <div class="metric-value ${i?.signal === 'bullish' ? 'text-green' : i?.signal === 'bearish' ? 'text-red' : ''}">${typeof i?.value === 'number' ? i.value.toFixed(2) : i?.value || '-'}</div>
            <div class="metric-note">${i?.signal || ''}</div>
          </div>
        `).join('')}
      </div>
      ` : ''}
      ${asSummary ? `<div class="step-summary"><div class="step-summary-title">Step Summary</div>${asSummary}</div>` : ''}
    </div>

    <!-- Step 03: Safety Check -->
    <div class="step-box">
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
      <div style="margin-top: 4px; font-size: 7px; color: #dc2626;">
        ${sc.warnings.slice(0, 2).map(w => `<span style="margin-right: 8px;">⚠ ${w}</span>`).join('')}
      </div>
      ` : ''}
      ${scSummary ? `<div class="step-summary"><div class="step-summary-title">Step Summary</div>${scSummary}</div>` : ''}
    </div>

    <div class="footer">
      <span><span class="brand-trade">Trader</span><span class="brand-path">Path</span> | ID: ${data.analysisId?.slice(-10) || '-'}</span>
      <span>Page 1 of ${totalPages}</span>
    </div>
  </div>
</body></html>`;
}

// ===========================================
// PAGE 2: Execution & Analysis
// ===========================================

function generatePage2(data: AnalysisReportData, totalPages: number = 5): string {
  const tm = data.timing;
  const tp = data.tradePlan;
  const tc = data.trapCheck;
  const isLong = tp.direction === 'long';

  const tmGate = getGateStatus(tm.gate);
  const tpGate = getGateStatus(tp.gate);
  const tcGate = tc?.gate ? getGateStatus(tc.gate) : { text: '', color: '#666' };

  // Get relevant indicators for timing decision
  const ind = data.indicatorDetails;

  // Step summaries
  const tmSummary = tm.aiInsight || (tm.gate?.reason ? `Timing analysis: ${tm.gate.reason}` : '');
  const tpSummary = tp.aiInsight || (tp.gate?.reason ? `Trade plan: ${tp.gate.reason}` : '');
  const tcSummary = tc?.aiInsight || (tc?.gate?.reason ? `Trap check: ${tc.gate.reason}` : '');

  // Get momentum indicators for timing step
  const momentumIndicators = ind?.momentum ? Object.values(ind.momentum).filter(Boolean).slice(0, 4) : [];

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${styles}</style></head><body>
  <div class="page">
    <div class="header">
      <div class="brand">
        <div class="logo">${logoSvg}</div>
        <div class="brand-name"><span class="brand-trade">Trader</span><span class="brand-path">Path</span></div>
      </div>
      <div class="header-center">
        <div class="report-title">Execution Analysis</div>
      </div>
      <div class="header-right">
        <span class="symbol">${data.symbol}/USDT</span>
      </div>
    </div>

    <!-- Step 04: Timing Analysis -->
    <div class="step-box">
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
      <div style="margin-top: 6px; font-size: 7px; font-weight: 600; color: #666; border-top: 1px dashed #ddd; padding-top: 6px;">Momentum Indicators</div>
      <div class="row" style="margin-top: 4px;">
        ${momentumIndicators.slice(0, 4).map(i => `
          <div class="col metric metric-sm">
            <div class="metric-label">${i?.name || ''}</div>
            <div class="metric-value ${i?.signal === 'bullish' ? 'text-green' : i?.signal === 'bearish' ? 'text-red' : ''}">${typeof i?.value === 'number' ? i.value.toFixed(2) : i?.value || '-'}</div>
            <div class="metric-note">${i?.signal || ''}</div>
          </div>
        `).join('')}
      </div>
      ` : ''}
      ${tmSummary ? `<div class="step-summary"><div class="step-summary-title">Step Summary</div>${tmSummary}</div>` : ''}
    </div>

    <!-- Step 05: Trade Plan with Chart Inside -->
    <div class="step-box">
      <div class="step-box-header">
        <span class="step-box-num">05</span>
        <span class="step-box-title">Trade Plan</span>
        <span class="step-box-gate" style="color: ${tpGate.color}">${tpGate.text}</span>
      </div>

      <div class="row">
        <div class="col metric">
          <div class="metric-label">Direction</div>
          <div class="metric-value metric-value-lg ${isLong ? 'text-green' : 'text-red'}">${isLong ? 'LONG' : 'SHORT'}</div>
        </div>
        <div class="col metric">
          <div class="metric-label">Risk:Reward</div>
          <div class="metric-value metric-value-lg">${formatRiskReward(tp.riskReward)}</div>
        </div>
        <div class="col metric">
          <div class="metric-label">Win Rate Est.</div>
          <div class="metric-value">${tp.winRateEstimate || 50}%</div>
        </div>
        <div class="col metric">
          <div class="metric-label">Position Size</div>
          <div class="metric-value">${tp.positionSizePercent?.toFixed(1) || '-'}%</div>
        </div>
      </div>

      <table class="table" style="margin-top: 6px;">
        <tr><th style="width: 20%;">Level</th><th style="width: 25%;">Price</th><th style="width: 20%;">Change</th><th>Note</th></tr>
        <tr>
          <td>Entry</td>
          <td style="font-weight: 600;">${formatPrice(tp.averageEntry)}</td>
          <td>-</td>
          <td style="font-size: 7px; color: #666;">${tp.entries?.length ? `${tp.entries.length} entry zones` : ''}</td>
        </tr>
        <tr>
          <td>Stop Loss</td>
          <td style="font-weight: 600;" class="text-red">${formatPrice(tp.stopLoss?.price)}</td>
          <td class="text-red">${tp.stopLoss?.percentage ? `-${tp.stopLoss.percentage.toFixed(2)}%` : ''}</td>
          <td style="font-size: 7px; color: #666;">${tp.stopLoss?.reason?.slice(0, 40) || ''}</td>
        </tr>
        ${(tp.takeProfits || []).slice(0, 3).map((t, i) => `
          <tr>
            <td>Target ${i + 1}</td>
            <td style="font-weight: 600;" class="text-green">${formatPrice(t.price)}</td>
            <td class="text-green">${t.percentage ? `+${t.percentage.toFixed(1)}%` : ''}</td>
            <td style="font-size: 7px; color: #666;">${t.reason?.slice(0, 40) || ''}</td>
          </tr>
        `).join('')}
      </table>

      <!-- Trade Plan Chart Inside the Box -->
      ${data.chartImage ? `
      <div style="margin-top: 8px; background: #fff; border: 1px solid #ddd; border-radius: 4px; padding: 4px;">
        <img src="${data.chartImage}" style="width: 100%; height: auto; max-height: 150px; display: block; object-fit: contain;" alt="Trade Plan Chart" />
      </div>
      ` : ''}
      ${tpSummary ? `<div class="step-summary"><div class="step-summary-title">Step Summary</div>${tpSummary}</div>` : ''}
    </div>

    <!-- Step 06: Trap Check -->
    ${tc ? `
    <div class="step-box">
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
      ${tc.proTip ? `<div style="margin-top: 6px; font-size: 7px; background: #fef3c7; border: 1px solid #fcd34d; border-radius: 3px; padding: 6px;"><strong>Pro Tip:</strong> ${tc.proTip}</div>` : ''}
      ${tcSummary ? `<div class="step-summary"><div class="step-summary-title">Step Summary</div>${tcSummary}</div>` : ''}
    </div>
    ` : ''}

    <!-- Indicator Summary Box -->
    ${ind ? `
    <div class="indicator-summary-box">
      <div class="indicator-summary-header">Indicator Summary</div>
      <div class="row">
        <div class="col metric metric-sm">
          <div class="metric-label">Total Analyzed</div>
          <div class="metric-value">${ind.summary?.totalIndicatorsUsed || 0}</div>
        </div>
        <div class="col metric metric-sm">
          <div class="metric-label">Bullish</div>
          <div class="metric-value text-green">${ind.summary?.bullishIndicators || 0}</div>
        </div>
        <div class="col metric metric-sm">
          <div class="metric-label">Bearish</div>
          <div class="metric-value text-red">${ind.summary?.bearishIndicators || 0}</div>
        </div>
        <div class="col metric metric-sm">
          <div class="metric-label">Neutral</div>
          <div class="metric-value">${ind.summary?.neutralIndicators || 0}</div>
        </div>
        <div class="col metric metric-sm">
          <div class="metric-label">Overall Signal</div>
          <div class="metric-value ${ind.summary?.overallSignal === 'bullish' ? 'text-green' : ind.summary?.overallSignal === 'bearish' ? 'text-red' : ''}">${formatDirection(ind.summary?.overallSignal)}</div>
          <div class="metric-note">${formatPercent(ind.summary?.signalConfidence)} conf</div>
        </div>
      </div>
    </div>
    ` : ''}

    <div class="footer">
      <span><span class="brand-trade">Trader</span><span class="brand-path">Path</span> | ID: ${data.analysisId?.slice(-10) || '-'}</span>
      <span>Page 2 of ${totalPages}</span>
    </div>
  </div>
</body></html>`;
}

// ===========================================
// PAGE 3: Verdict & Expert Analysis
// ===========================================

function generatePage3(data: AnalysisReportData, totalPages: number = 5): string {
  const v = data.verdict;
  const isLong = data.tradePlan?.direction === 'long';
  const score = formatPercent(v.overallScore);

  // Get step scores from gates
  const stepScores = [
    { name: 'Market Pulse', score: data.marketPulse.gate?.confidence },
    { name: 'Asset Scanner', score: data.assetScan.gate?.confidence },
    { name: 'Safety Check', score: data.safetyCheck.gate?.confidence },
    { name: 'Timing', score: data.timing.gate?.confidence },
    { name: 'Trade Plan', score: data.tradePlan.gate?.confidence },
    { name: 'Trap Check', score: data.trapCheck?.gate?.confidence },
  ].filter(s => s.score !== undefined);

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

    <!-- Final Verdict -->
    <div class="section">
      <div class="section-header">
        <span class="step-num">07</span>
        <span class="section-title">Final Verdict</span>
      </div>

      <div class="verdict-box">
        <div class="verdict-row">
          <div style="flex: 1;">
            <div class="verdict-action">${formatAction(getVerdictAction(v))}</div>
            <div style="font-size: 9px; color: #666; margin-top: 4px;">${isLong ? 'Bullish setup - Long position recommended' : 'Bearish setup - Short position recommended'}</div>
          </div>
        </div>
      </div>

      <!-- Step Scores -->
      ${stepScores.length > 0 ? `
      <div style="margin-bottom: 10px;">
        <div style="font-size: 8px; font-weight: 600; margin-bottom: 6px;">Step Analysis Scores</div>
        <div class="row">
          ${stepScores.map(s => `
            <div class="col metric metric-sm">
              <div class="metric-label">${s.name}</div>
              <div class="metric-value ${(s.score || 0) >= 0.7 || (s.score || 0) >= 70 ? 'text-green' : (s.score || 0) >= 0.5 || (s.score || 0) >= 50 ? 'text-amber' : 'text-red'}">${formatPercent(s.score)}</div>
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}

      <!-- Confidence Factors -->
      ${v.confidenceFactors && v.confidenceFactors.length > 0 ? `
      <div style="margin-bottom: 10px;">
        <div style="font-size: 8px; font-weight: 600; margin-bottom: 6px;">Confidence Factors</div>
        <div class="list">
          ${v.confidenceFactors.slice(0, 8).map(cf => `
            <div class="factor-item">
              <span class="factor-icon ${cf.positive ? 'text-green' : 'text-red'}">${cf.positive ? '+' : '-'}</span>
              <span>${cf.factor}</span>
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}

      <!-- AI Summary -->
      <div class="summary-box">
        <div style="font-size: 8px; font-weight: 600; margin-bottom: 4px;">AI Analysis Summary</div>
        <div class="summary-text">${v.aiSummary || v.recommendation || 'Analysis complete. Review all sections for detailed insights.'}</div>
      </div>
    </div>

    <!-- AI Expert Review -->
    ${data.aiExpertComment ? `
    <div class="step-box" style="background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%); border: 1px solid #86efac;">
      <div class="step-box-header" style="border-bottom-color: #86efac;">
        <span style="font-size: 9px; font-weight: 700; color: #fff; background: linear-gradient(135deg, #22c55e, #16a34a); padding: 2px 6px; border-radius: 4px;">AI</span>
        <span class="step-box-title" style="color: #166534;">AI Expert Review</span>
      </div>
      <div style="font-size: 8px; line-height: 1.6; white-space: pre-wrap; color: #15803d; max-height: 260px; overflow: hidden;">${data.aiExpertComment.slice(0, 1500)}${data.aiExpertComment.length > 1500 ? '...' : ''}</div>
    </div>
    ` : ''}

    <!-- Disclaimer -->
    <div class="disclaimer">
      <div class="disclaimer-title">RISK DISCLAIMER</div>
      <div class="disclaimer-text">
        This report is generated by TraderPath AI for educational and informational purposes only. It does not constitute financial advice, investment recommendation, or an offer to buy or sell any financial instruments. Cryptocurrency trading involves substantial risk of loss. Past performance is not indicative of future results. Always conduct your own research (DYOR) and consult with a qualified financial advisor before making investment decisions. Never invest more than you can afford to lose.
      </div>
    </div>

    <div class="footer">
      <span>(c) ${new Date().getFullYear()} TraderPath | ID: ${data.analysisId?.slice(-10) || '-'}</span>
      <span>Page 3 of ${totalPages}</span>
    </div>
  </div>
</body></html>`;
}

// ===========================================
// PAGE 4: Technical Indicators - Trend & Momentum
// ===========================================

function generatePage4(data: AnalysisReportData): string {
  const ind = data.indicatorDetails;
  const tradeTypeLabels: Record<string, string> = { scalping: 'Scalping', dayTrade: 'Day Trade', swing: 'Swing Trade' };

  // Count indicators
  const trendCount = ind?.trend ? Object.values(ind.trend).filter(Boolean).length : 0;
  const momentumCount = ind?.momentum ? Object.values(ind.momentum).filter(Boolean).length : 0;
  const totalIndicators = ind?.summary?.totalIndicatorsUsed || 0;

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${styles}</style></head><body>
  <div class="page">
    <div class="header">
      <div class="brand">
        <div class="logo">${logoSvg}</div>
        <div class="brand-name"><span class="brand-trade">Trader</span><span class="brand-path">Path</span></div>
      </div>
      <div class="header-center">
        <div class="report-title">Technical Indicator Analysis</div>
        <div class="report-subtitle">${tradeTypeLabels[data.tradeType || ''] || ''} | Trend & Momentum</div>
      </div>
      <div class="header-right">
        <span class="symbol">${data.symbol}/USDT</span>
        <div style="font-size: 8px; color: #666; margin-top: 2px;">${totalIndicators} Indicators Analyzed</div>
      </div>
    </div>

    <!-- Indicator Summary -->
    ${ind?.summary ? `
    <div class="section">
      <div class="section-header">
        <span class="section-title">Indicator Summary</span>
      </div>
      <div class="row">
        <div class="col metric metric-sm">
          <div class="metric-label">Bullish</div>
          <div class="metric-value text-green">${ind.summary.bullishIndicators}</div>
        </div>
        <div class="col metric metric-sm">
          <div class="metric-label">Bearish</div>
          <div class="metric-value text-red">${ind.summary.bearishIndicators}</div>
        </div>
        <div class="col metric metric-sm">
          <div class="metric-label">Neutral</div>
          <div class="metric-value">${ind.summary.neutralIndicators}</div>
        </div>
        <div class="col metric metric-sm">
          <div class="metric-label">Overall Signal</div>
          <div class="metric-value ${ind.summary.overallSignal === 'bullish' ? 'text-green' : ind.summary.overallSignal === 'bearish' ? 'text-red' : ''}">${formatDirection(ind.summary.overallSignal)}</div>
          <div class="metric-note">${formatPercent(ind.summary.signalConfidence)} confidence</div>
        </div>
        <div class="col metric metric-sm">
          <div class="metric-label">Leading Indicators</div>
          <div class="metric-value ${ind.summary.leadingIndicatorsSignal === 'bullish' ? 'text-green' : ind.summary.leadingIndicatorsSignal === 'bearish' ? 'text-red' : ''}">${formatDirection(ind.summary.leadingIndicatorsSignal)}</div>
        </div>
      </div>
    </div>
    ` : ''}

    <!-- Trend Indicators -->
    ${renderIndicatorTable(ind?.trend, 'Trend')}

    <!-- Momentum Indicators -->
    ${renderIndicatorTable(ind?.momentum, 'Momentum')}

    <div style="margin-top: 8px; padding: 6px; background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 3px; font-size: 7px; color: #0369a1;">
      <strong>* Leading Indicators:</strong> These indicators typically signal changes before they occur in price. They are weighted more heavily in the analysis.
    </div>

    <div class="footer">
      <span><span class="brand-trade">Trader</span><span class="brand-path">Path</span> | ID: ${data.analysisId?.slice(-10) || '-'}</span>
      <span>Page 4 of 5</span>
    </div>
  </div>
</body></html>`;
}

// ===========================================
// PAGE 5: Technical Indicators - Volatility, Volume & Advanced
// ===========================================

function generatePage5(data: AnalysisReportData): string {
  const ind = data.indicatorDetails;
  const tradeTypeLabels: Record<string, string> = { scalping: 'Scalping', dayTrade: 'Day Trade', swing: 'Swing Trade' };

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${styles}</style></head><body>
  <div class="page">
    <div class="header">
      <div class="brand">
        <div class="logo">${logoSvg}</div>
        <div class="brand-name"><span class="brand-trade">Trader</span><span class="brand-path">Path</span></div>
      </div>
      <div class="header-center">
        <div class="report-title">Technical Indicator Analysis</div>
        <div class="report-subtitle">${tradeTypeLabels[data.tradeType || ''] || ''} | Volatility, Volume & Advanced</div>
      </div>
      <div class="header-right">
        <span class="symbol">${data.symbol}/USDT</span>
      </div>
    </div>

    <!-- Volatility Indicators -->
    ${renderIndicatorTable(ind?.volatility, 'Volatility')}

    <!-- Volume Indicators -->
    ${renderIndicatorTable(ind?.volume, 'Volume')}

    <!-- Advanced Indicators -->
    ${renderIndicatorTable(ind?.advanced, 'Advanced')}

    <!-- Divergences Section -->
    ${ind?.divergences && ind.divergences.length > 0 ? `
    <div class="section">
      <div class="section-header">
        <span class="section-title">Detected Divergences</span>
      </div>
      <table class="table">
        <tr>
          <th style="width: 15%;">Type</th>
          <th style="width: 20%;">Indicator</th>
          <th style="width: 15%;">Reliability</th>
          <th style="width: 50%;">Description</th>
        </tr>
        ${ind.divergences.map(div => `
          <tr>
            <td class="${div.type === 'bullish' ? 'text-green' : div.type === 'bearish' ? 'text-red' : ''}" style="font-weight: 600;">${div.type.toUpperCase()}${div.isEarlySignal ? ' (Early)' : ''}</td>
            <td>${div.indicator}</td>
            <td>${div.reliability}</td>
            <td style="font-size: 6.5px;">${div.description}</td>
          </tr>
        `).join('')}
      </table>
    </div>
    ` : `
    <div class="section">
      <div class="section-header">
        <span class="section-title">Detected Divergences</span>
      </div>
      <div style="padding: 10px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 3px; font-size: 8px; color: #6b7280; text-align: center;">
        No significant divergences detected in current analysis
      </div>
    </div>
    `}

    <!-- Trade Type Specific Notes -->
    <div class="summary-box" style="margin-top: auto;">
      <div style="font-size: 8px; font-weight: 600; margin-bottom: 4px;">Trade Type: ${tradeTypeLabels[data.tradeType || ''] || 'Standard'}</div>
      <div class="summary-text">
        ${data.tradeType === 'scalping' ? 'Scalping analysis focuses on short-term momentum and volatility indicators. Quick entries/exits are prioritized. Volume confirmation is critical.' :
          data.tradeType === 'dayTrade' ? 'Day trade analysis balances trend and momentum indicators. Intraday levels and volume patterns are weighted heavily. Risk management is key.' :
          data.tradeType === 'swing' ? 'Swing trade analysis emphasizes trend indicators and support/resistance levels. Longer timeframes are prioritized. Patience is rewarded.' :
          'Analysis includes comprehensive indicator coverage across all categories.'}
      </div>
    </div>

    <div class="footer">
      <span><span class="brand-trade">Trader</span><span class="brand-path">Path</span> | ID: ${data.analysisId?.slice(-10) || '-'}</span>
      <span>Page 5 of 5</span>
    </div>
  </div>
</body></html>`;
}

// ===========================================
// CHART CAPTURE & PDF GENERATION
// ===========================================

export async function captureChartAsImage(): Promise<string | null> {
  try {
    const element = document.getElementById('trade-plan-chart');
    if (!element) return null;
    await new Promise(resolve => setTimeout(resolve, 500));
    const canvas = await html2canvas(element, { backgroundColor: '#ffffff', scale: 2, logging: false, useCORS: true, allowTaint: true });
    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('Chart capture failed:', error);
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
  if (captureChart && !data.chartImage) {
    const chartImage = await captureChartAsImage();
    if (chartImage) data.chartImage = chartImage;
  }

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();

  // Determine total pages based on indicator details availability
  const hasIndicatorDetails = data.indicatorDetails && (
    (data.indicatorDetails.trend && Object.keys(data.indicatorDetails.trend).length > 0) ||
    (data.indicatorDetails.momentum && Object.keys(data.indicatorDetails.momentum).length > 0) ||
    (data.indicatorDetails.volatility && Object.keys(data.indicatorDetails.volatility).length > 0) ||
    (data.indicatorDetails.volume && Object.keys(data.indicatorDetails.volume).length > 0) ||
    (data.indicatorDetails.advanced && Object.keys(data.indicatorDetails.advanced).length > 0)
  );
  const totalPages = hasIndicatorDetails ? 5 : 3;

  // Page 1
  const canvas1 = await renderPageToCanvas(generatePage1(data, totalPages));
  pdf.addImage(canvas1.toDataURL('image/png'), 'PNG', 0, 0, pdfWidth, pdfHeight);

  // Page 2
  pdf.addPage();
  const canvas2 = await renderPageToCanvas(generatePage2(data, totalPages));
  pdf.addImage(canvas2.toDataURL('image/png'), 'PNG', 0, 0, pdfWidth, pdfHeight);

  // Page 3
  pdf.addPage();
  const canvas3 = await renderPageToCanvas(generatePage3(data, totalPages));
  pdf.addImage(canvas3.toDataURL('image/png'), 'PNG', 0, 0, pdfWidth, pdfHeight);

  // Page 4 & 5: Technical Indicators - only if indicator details exist
  if (hasIndicatorDetails) {
    pdf.addPage();
    const canvas4 = await renderPageToCanvas(generatePage4(data));
    pdf.addImage(canvas4.toDataURL('image/png'), 'PNG', 0, 0, pdfWidth, pdfHeight);

    pdf.addPage();
    const canvas5 = await renderPageToCanvas(generatePage5(data));
    pdf.addImage(canvas5.toDataURL('image/png'), 'PNG', 0, 0, pdfWidth, pdfHeight);
  }

  const tradeTypes: Record<string, string> = { scalping: 'Scalping', dayTrade: 'DayTrade', swing: 'Swing' };
  const tradeType = data.tradeType ? tradeTypes[data.tradeType] || '' : '';
  const fileName = `TraderPath_${data.symbol}${tradeType ? `_${tradeType}` : ''}_${new Date().toISOString().split('T')[0]}.pdf`;

  const pdfBase64 = pdf.output('datauristring').split(',')[1];
  pdf.save(fileName);

  // Log detailed report availability
  console.log(`[TraderPath] Detailed report generated: ${data.indicatorDetails ? '5 pages with full indicator analysis' : '3 pages summary'}`);

  return { base64: pdfBase64, fileName };
}

export type { AnalysisReportData as ReportData };
