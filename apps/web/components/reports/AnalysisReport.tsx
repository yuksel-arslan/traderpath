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
    verdict?: string;
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

function getGateStatus(gate: { canProceed: boolean; confidence: number } | undefined): { text: string; color: string } {
  if (!gate) return { text: '', color: '#666' };
  const conf = formatPercent(gate.confidence);
  return gate.canProceed ? { text: `Passed ${conf}`, color: '#16a34a' } : { text: `Review ${conf}`, color: '#d97706' };
}

function formatAction(actionOrVerdict: string | undefined): string {
  if (!actionOrVerdict) return 'ANALYSIS COMPLETE';
  const map: Record<string, string> = {
    'go': 'GO', 'conditional_go': 'Conditionally GO', 'conditionally_go': 'Conditionally GO',
    'wait': 'WAIT', 'no_go': 'NO GO', 'avoid': 'AVOID', 'stop': 'STOP', 'hold': 'HOLD',
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

function renderIndicatorTable(indicators: Record<string, IndicatorDetailItem | undefined> | undefined, title: string): string {
  if (!indicators) return '';
  const items = Object.values(indicators).filter((i): i is IndicatorDetailItem => i !== undefined);
  if (items.length === 0) return '';
  return `
    <div class="section" style="margin-bottom: 6px;">
      <div style="font-size: 7px; font-weight: 600; margin-bottom: 3px; color: #333;">${title} (${items.length})</div>
      <table class="table indicator-table">
        <tr><th style="width: 25%;">Indicator</th><th style="width: 15%;">Value</th><th style="width: 12%;">Signal</th><th style="width: 48%;">Interpretation</th></tr>
        ${items.slice(0, 6).map(ind => `
          <tr>
            <td style="font-weight: 500;">${ind.name}${ind.isLeadingIndicator ? ' *' : ''}</td>
            <td>${formatIndicatorValue(ind.value)}</td>
            <td class="${ind.signal === 'bullish' ? 'text-green' : ind.signal === 'bearish' ? 'text-red' : ''}" style="font-weight: 600;">${ind.signal.toUpperCase()}</td>
            <td style="font-size: 6px;">${ind.interpretation?.slice(0, 60) || '-'}${(ind.interpretation?.length || 0) > 60 ? '...' : ''}</td>
          </tr>
        `).join('')}
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
  .brand { display: flex; align-items: center; gap: 8px; }
  .logo { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; }
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
  const isLong = tp?.direction === 'long';
  const score = formatPercent(v?.overallScore);
  const tradeTypes: Record<string, string> = { scalping: 'Scalping', dayTrade: 'Day Trade', swing: 'Swing Trade' };

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${styles}</style></head><body>
  <div class="page">
    <!-- Centered Brand Header for Executive Summary -->
    <div style="text-align: center; padding: 15px 0 20px 0; border-bottom: 2px solid #1a1a1a; margin-bottom: 15px;">
      <div style="display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 8px;">
        <div class="logo">${logoSvg}</div>
        <div class="brand-name" style="font-size: 28px;"><span class="brand-trade">Trader</span><span class="brand-path">Path</span></div>
      </div>
      <div style="font-size: 11px; font-weight: 600; color: #1a1a1a; text-transform: uppercase; letter-spacing: 1px;">Executive Summary</div>
      <div style="font-size: 9px; color: #666; margin-top: 3px;">${tradeTypes[data.tradeType || ''] || 'Analysis'} | ${data.generatedAt}</div>
      <div style="margin-top: 8px;">
        <span class="symbol" style="font-size: 18px;">${data.symbol}/USDT</span>
        <span class="direction-tag ${isLong ? 'tag-long' : 'tag-short'}" style="font-size: 14px; margin-left: 10px;">${isLong ? 'LONG' : 'SHORT'}</span>
      </div>
    </div>

    <!-- Main Verdict Box -->
    <div class="verdict-box" style="background: ${isLong ? 'linear-gradient(135deg, #f0fdf4, #dcfce7)' : 'linear-gradient(135deg, #fef2f2, #fee2e2)'}; border-color: ${isLong ? '#16a34a' : '#dc2626'};">
      <div class="verdict-action ${isLong ? 'text-green' : 'text-red'}">${formatAction(getVerdictAction(v))}</div>
      <div style="font-size: 36px; font-weight: 800; margin: 10px 0; color: ${isLong ? '#16a34a' : '#dc2626'};">${score}</div>
      <div style="font-size: 10px; color: #666;">Confidence Score</div>
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

    <!-- Full Page Chart -->
    ${data.chartImage ? `
    <div class="chart-container" style="height: 480px; display: flex; align-items: center; justify-content: center;">
      <img src="${data.chartImage}" style="max-height: 100%; width: auto; max-width: 100%;" alt="Trade Plan Chart" />
    </div>
    ` : `
    <div class="chart-container" style="height: 480px; display: flex; align-items: center; justify-content: center; background: #f9fafb;">
      <div style="text-align: center; color: #666;">
        <div style="font-size: 14px; margin-bottom: 5px;">📈</div>
        <div style="font-size: 10px;">Chart not available</div>
      </div>
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
    ` : `
    <!-- No Tokenomics Data -->
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 500px; text-align: center;">
      <div style="font-size: 48px; margin-bottom: 15px;">📊</div>
      <div style="font-size: 14px; font-weight: 600; color: #333; margin-bottom: 8px;">Tokenomics Data Not Available</div>
      <div style="font-size: 10px; color: #666; max-width: 300px;">Detailed tokenomics analysis is not available for this asset. This may be due to limited data availability or the asset type.</div>
    </div>
    `}

    ${generateFooter(data, 3, totalPages)}
  </div>
</body></html>`;
}

// ===========================================
// PAGE 4: Steps 1-3 (Market, Asset, Safety)
// ===========================================

function generatePageSteps123(data: AnalysisReportData, totalPages: number): string {
  const mp = data.marketPulse;
  const as = data.assetScan;
  const sc = data.safetyCheck;
  const tk = data.tokenomics;
  const mpGate = getGateStatus(mp.gate);
  const asGate = getGateStatus(as.gate);
  const scGate = getGateStatus(sc.gate);

  // Step Summaries from gate reasons
  const mpSummary = mp.gate?.reason ? `Market Pulse: ${mp.gate.reason}` : '';
  const asSummary = as.gate?.reason ? `Asset Scan: ${as.gate.reason}` : '';
  const scSummary = sc.gate?.reason ? `Safety Check: ${sc.gate.reason}` : '';

  // Get indicators for each step
  const ind = data.indicatorDetails;
  const trendIndicators = ind?.trend ? Object.values(ind.trend).filter(Boolean).slice(0, 4) : [];
  const volumeIndicators = ind?.volume ? Object.values(ind.volume).filter(Boolean).slice(0, 4) : [];
  const advancedIndicators = ind?.advanced ? Object.values(ind.advanced).filter(Boolean).slice(0, 4) : [];

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${styles}</style></head><body>
  <div class="page">
    <div class="header">
      <div class="brand">
        <div class="logo">${logoSvg}</div>
        <div class="brand-name"><span class="brand-trade">Trader</span><span class="brand-path">Path</span></div>
      </div>
      <div class="header-center">
        <div class="report-title">Analysis Steps 1-3</div>
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
      <div style="margin-top: 8px; font-size: 7px; font-weight: 600; color: #666; border-top: 1px dashed #ddd; padding-top: 6px;">Advanced Indicators (ORDER_FLOW, WHALE, SQUEEZE)</div>
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

    ${generateFooter(data, 4, totalPages)}
  </div>
</body></html>`;
}

// ===========================================
// PAGE 5: Steps 4-6 (Timing, Plan, Trap)
// ===========================================

function generatePageSteps456(data: AnalysisReportData, totalPages: number): string {
  const tm = data.timing;
  const tp = data.tradePlan;
  const tc = data.trapCheck;
  const isLong = tp?.direction === 'long';
  const tmGate = getGateStatus(tm.gate);
  const tpGate = getGateStatus(tp.gate);
  const tcGate = tc?.gate ? getGateStatus(tc.gate) : { text: '', color: '#666' };

  // Step Summaries from gate reasons
  const tmSummary = tm.gate?.reason ? `Timing: ${tm.gate.reason}` : '';
  const tpSummary = tp.gate?.reason ? `Trade Plan: ${tp.gate.reason}` : '';
  const tcSummary = tc?.gate?.reason ? `Trap Check: ${tc.gate.reason}` : '';

  // Get indicators
  const ind = data.indicatorDetails;
  const momentumIndicators = ind?.momentum ? Object.values(ind.momentum).filter(Boolean).slice(0, 4) : [];
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
        <div class="report-title">Analysis Steps 4-6</div>
      </div>
      <div class="header-right">
        <span class="symbol">${data.symbol}/USDT</span>
      </div>
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
      <div style="margin-top: 8px; font-size: 7px; font-weight: 600; color: #666; border-top: 1px dashed #ddd; padding-top: 6px;">Momentum Indicators (RSI, STOCH, MACD, SUPERTREND)</div>
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

    ${generateFooter(data, 5, totalPages)}
  </div>
</body></html>`;
}

// ===========================================
// PAGE 6: Final Verdict & Technical Indicators
// ===========================================

function generatePageVerdict(data: AnalysisReportData, totalPages: number): string {
  const v = data.verdict;
  const ind = data.indicatorDetails;
  const isLong = data.tradePlan?.direction === 'long';

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
    <div class="step-box" style="background: ${isLong ? 'linear-gradient(135deg, #f0fdf4, #dcfce7)' : 'linear-gradient(135deg, #fef2f2, #fee2e2)'};">
      <div class="step-box-header">
        <span class="step-box-num">07</span>
        <span class="step-box-title">Final Verdict</span>
      </div>
      <div style="text-align: center; padding: 10px 0;">
        <div style="font-size: 24px; font-weight: 700; ${isLong ? 'color: #16a34a' : 'color: #dc2626'}">${formatAction(getVerdictAction(v))}</div>
        <div style="font-size: 28px; font-weight: 800; margin: 8px 0;">${formatPercent(v?.overallScore)}</div>
        <div style="font-size: 9px; color: #666;">${isLong ? 'Bullish setup - Long position recommended' : 'Bearish setup - Short position recommended'}</div>
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

    <!-- Technical Indicator Summary -->
    ${ind?.summary ? `
    <div class="step-box">
      <div class="step-box-header">
        <span class="step-box-title">Technical Indicator Summary (${ind.summary.totalIndicatorsUsed} indicators)</span>
      </div>
      <div class="row">
        <div class="col metric metric-sm" style="text-align: center;">
          <div class="metric-value text-green" style="font-size: 16px;">${ind.summary.bullishIndicators}</div>
          <div class="metric-label">Bullish</div>
        </div>
        <div class="col metric metric-sm" style="text-align: center;">
          <div class="metric-value text-red" style="font-size: 16px;">${ind.summary.bearishIndicators}</div>
          <div class="metric-label">Bearish</div>
        </div>
        <div class="col metric metric-sm" style="text-align: center;">
          <div class="metric-value" style="font-size: 16px;">${ind.summary.neutralIndicators}</div>
          <div class="metric-label">Neutral</div>
        </div>
        <div class="col metric metric-sm" style="text-align: center;">
          <div class="metric-value ${ind.summary.overallSignal === 'bullish' ? 'text-green' : ind.summary.overallSignal === 'bearish' ? 'text-red' : ''}">${formatDirection(ind.summary.overallSignal)}</div>
          <div class="metric-label">Overall Signal</div>
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

    ${generateFooter(data, 6, totalPages)}
  </div>
</body></html>`;
}

// ===========================================
// CHART CAPTURE & PDF GENERATION
// ===========================================

export async function captureChartAsImage(): Promise<string | null> {
  try {
    // Try multiple possible chart IDs
    const chartIds = ['trade-plan-chart-visible', 'trade-plan-chart', 'tradingview-chart'];
    let element: HTMLElement | null = null;

    for (const id of chartIds) {
      element = document.getElementById(id);
      if (element) {
        console.log(`[Chart Capture] Found chart element with id: ${id}`);
        break;
      }
    }

    if (!element) {
      console.warn('[Chart Capture] No chart element found with IDs:', chartIds);
      return null;
    }

    await new Promise(resolve => setTimeout(resolve, 800));
    const canvas = await html2canvas(element, { backgroundColor: '#ffffff', scale: 2, logging: false, useCORS: true, allowTaint: true });
    console.log('[Chart Capture] Chart captured successfully');
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
  if (captureChart && !data.chartImage) {
    const chartImage = await captureChartAsImage();
    if (chartImage) data.chartImage = chartImage;
  }

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();

  // Total pages: 6 (Executive Summary, Trade Plan, Tokenomics, Steps 1-3, Steps 4-6, Verdict)
  const totalPages = 6;

  // Page 1: Executive Summary
  const canvas1 = await renderPageToCanvas(generatePageExecutiveSummary(data, totalPages));
  pdf.addImage(canvas1.toDataURL('image/png'), 'PNG', 0, 0, pdfWidth, pdfHeight);

  // Page 2: Trade Plan (Full Chart)
  pdf.addPage();
  const canvas2 = await renderPageToCanvas(generatePageTradePlan(data, totalPages));
  pdf.addImage(canvas2.toDataURL('image/png'), 'PNG', 0, 0, pdfWidth, pdfHeight);

  // Page 3: Tokenomics
  pdf.addPage();
  const canvas3 = await renderPageToCanvas(generatePageTokenomics(data, totalPages));
  pdf.addImage(canvas3.toDataURL('image/png'), 'PNG', 0, 0, pdfWidth, pdfHeight);

  // Page 4: Steps 1-3
  pdf.addPage();
  const canvas4 = await renderPageToCanvas(generatePageSteps123(data, totalPages));
  pdf.addImage(canvas4.toDataURL('image/png'), 'PNG', 0, 0, pdfWidth, pdfHeight);

  // Page 5: Steps 4-6
  pdf.addPage();
  const canvas5 = await renderPageToCanvas(generatePageSteps456(data, totalPages));
  pdf.addImage(canvas5.toDataURL('image/png'), 'PNG', 0, 0, pdfWidth, pdfHeight);

  // Page 6: Final Verdict
  pdf.addPage();
  const canvas6 = await renderPageToCanvas(generatePageVerdict(data, totalPages));
  pdf.addImage(canvas6.toDataURL('image/png'), 'PNG', 0, 0, pdfWidth, pdfHeight);

  const tradeTypes: Record<string, string> = { scalping: 'Scalping', dayTrade: 'DayTrade', swing: 'Swing' };
  const tradeType = data.tradeType ? tradeTypes[data.tradeType] || '' : '';
  const fileName = `TraderPath_${data.symbol}${tradeType ? `_${tradeType}` : ''}_${new Date().toISOString().split('T')[0]}.pdf`;

  const pdfBase64 = pdf.output('datauristring').split(',')[1];
  pdf.save(fileName);

  console.log(`[TraderPath] Report generated: 6 pages`);

  return { base64: pdfBase64, fileName };
}

export type { AnalysisReportData as ReportData };
