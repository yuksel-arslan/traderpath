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
  method?: 'classic' | 'mlis_pro'; // Analysis method: Classic 7-Step or MLIS Pro
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

  // Capital Flow Data (4 Layers)
  capitalFlow?: {
    layer1?: { // Global Liquidity
      bias: 'risk_on' | 'risk_off' | 'neutral';
      fedBalanceSheet?: number;
      m2Supply?: number;
      dxy?: number;
      vix?: number;
    };
    layer2?: { // Market Flow
      primaryMarket?: string;
      flows?: Array<{ market: string; flow7d: number; flow30d: number; phase: string }>;
    };
    layer3?: { // Sector Activity
      topSectors?: Array<{ name: string; flow: number; trend: string }>;
    };
    layer4?: { // AI Recommendation
      direction: 'BUY' | 'SELL' | 'HOLD';
      market: string;
      confidence: number;
      reason?: string;
    };
  };

  // ML Confirmation (MLIS Pro results)
  mlConfirmation?: {
    recommendation: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';
    confidence: number;
    layers?: {
      technical?: { score: number; signal: string };
      momentum?: { score: number; signal: string };
      volatility?: { score: number; signal: string };
      volume?: { score: number; signal: string };
    };
  };

  indicatorDetails?: {
    trend?: Record<string, IndicatorDetailItem | undefined>;
    momentum?: Record<string, IndicatorDetailItem | undefined>;
    volatility?: Record<string, IndicatorDetailItem | undefined>;
    volume?: Record<string, IndicatorDetailItem | undefined>;
    advanced?: Record<string, IndicatorDetailItem | undefined>;
    divergences?: Array<{ type: 'bullish' | 'bearish' | 'none'; indicator: string; description: string; reliability: 'high' | 'medium' | 'low'; isEarlySignal: boolean }>;
    summary?: { bullishIndicators: number; bearishIndicators: number; neutralIndicators: number; totalIndicatorsUsed: number; overallSignal: 'bullish' | 'bearish' | 'neutral'; signalConfidence: number; leadingIndicatorsSignal: 'bullish' | 'bearish' | 'neutral' | 'mixed'; leadingIndicatorsCount?: number; laggingIndicatorsCount?: number };
  };

  // RAG Enrichment Layer
  ragEnrichment?: {
    research?: {
      mode: 'fast' | 'news' | 'deep';
      summary?: string | null;
      sentiment?: { label: string; score: number } | null;
      citations?: Array<{ source: string; title: string; sentiment?: string; reliability: number }>;
    } | null;
    forecastBands?: Array<{
      horizon: string;
      label: string;
      barsAhead: number;
      p10: number;
      p50: number;
      p90: number;
      bandWidthPercent: number;
      drivers: string[];
    }> | null;
    strategies?: {
      recommended: string;
      strategies: Array<{
        id: string;
        label: string;
        applicability: number;
        direction: string;
        entry: { price: number; type: string };
        stopLoss: { price: number };
        takeProfits: Array<{ price: number; label: string; weight: number }>;
        riskReward: number;
        counterFlow?: boolean;
      }>;
    } | null;
    validation?: {
      passed: boolean;
      summary: string;
    } | null;
    capitalFlowAligned?: boolean;
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
  metadata?: Record<string, any>;
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
  // Guard: regime could be non-string from API data even though typed as string
  const key = typeof regime === 'string' ? regime.toLowerCase() : '';
  return map[key] || (typeof regime === 'string' ? regime.charAt(0).toUpperCase() + regime.slice(1).replace(/_/g, ' ') : 'Normal');
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
  // Guard: actionOrVerdict could be non-string from API data
  const safeStr = typeof actionOrVerdict === 'string' ? actionOrVerdict : '';
  const lower = safeStr.toLowerCase().replace(/-/g, '_');
  return map[lower] || safeStr.toUpperCase().replace(/_/g, ' ');
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
            + ${items.length - maxItems} more ${(typeof title === 'string' ? title.toLowerCase() : 'items')} analyzed...
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

const DISCLAIMER_TEXT = 'IMPORTANT DISCLAIMER: This analysis is for informational and educational purposes only and does not constitute financial, investment, or trading advice. All investments carry risk, including the potential loss of principal. Past performance does not guarantee future results. Conduct your own research and consult with a licensed financial advisor before making any investment decisions. TraderPath is not responsible for any losses resulting from the use of this report.';

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
  const current = as?.currentPrice || entry;
  const isLong = tp.direction === 'long';

  // Get candle data (use provided or empty)
  const candles = chartCandles && chartCandles.length > 0 ? chartCandles.slice(-40) : [];
  const hasCandles = candles.length > 0;

  // Calculate price range (include candles if available)
  const tradeLevelPrices = [entry, sl, tp1, tp2, current].filter(p => p > 0);
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

  // Take Profit lines (only TP1 and TP2)
  const tpColors = ['#3b82f6', '#8b5cf6'];
  const tpPrices = [tp1, tp2];
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

  // Method display
  const methodDisplay = data.method === 'mlis_pro' ? 'MLIS Pro' : 'Classic 7-Step';
  const methodColor = data.method === 'mlis_pro' ? '#8b5cf6' : '#14B8A6'; // Purple for MLIS, Teal for Classic

  // Verdict and conditional explanation
  const verdictAction = getVerdictAction(v);
  // Guard: verdictAction could be non-string
  const verdictActionLower = typeof verdictAction === 'string' ? verdictAction.toLowerCase() : '';
  const isConditional = verdictActionLower.includes('conditional') || verdictActionLower.includes('cond');

  // Format date nicely
  const reportDate = data.generatedAt || new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${styles}</style></head><body>
  <div class="page">
    <!-- Professional Report Header with Logo, Title, Method, and Date -->
    <div style="text-align: center; padding: 20px 0 25px 0; border-bottom: 3px solid #1a1a1a; margin-bottom: 20px;">
      <!-- TraderPath Brand with Larger Logo -->
      <div style="display: flex; flex-direction: column; align-items: center; gap: 8px; margin-bottom: 15px;">
        <div style="width: 56px; height: 56px;">
          <svg width="56" height="56" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="tealGradPdf" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#5EEDC3"/><stop offset="50%" stop-color="#2DD4A8"/><stop offset="100%" stop-color="#14B8A6"/>
              </linearGradient>
              <linearGradient id="coralGradPdf" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#FF8A9B"/><stop offset="50%" stop-color="#F87171"/><stop offset="100%" stop-color="#EF5A6F"/>
              </linearGradient>
            </defs>
            <path d="M100 10 L120 80 L100 100 L80 80 Z" fill="url(#tealGradPdf)"/>
            <path d="M190 100 L120 120 L100 100 L120 80 Z" fill="url(#tealGradPdf)"/>
            <path d="M100 190 L80 120 L100 100 L120 120 Z" fill="url(#coralGradPdf)"/>
            <path d="M10 100 L80 80 L100 100 L80 120 Z" fill="url(#coralGradPdf)"/>
          </svg>
        </div>
        <div style="font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">
          <span style="color: #14B8A6;">Trader</span><span style="color: #F87171;">Path</span>
        </div>
      </div>

      <!-- Report Title -->
      <div style="font-size: 16px; font-weight: 700; color: #1a1a1a; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px;">Asset Analysis Report</div>

      <!-- Method Badge -->
      <div style="display: inline-block; padding: 4px 12px; background: ${methodColor}; color: #fff; border-radius: 4px; font-size: 10px; font-weight: 600; margin-bottom: 10px;">
        ${methodDisplay}
      </div>

      <!-- Report Date -->
      <div style="font-size: 10px; color: #666; margin-top: 5px;">
        <span style="font-weight: 600;">Report Date:</span> ${reportDate}
      </div>
      <div style="font-size: 9px; color: #888; margin-top: 2px;">${tradeTypes[data.tradeType || ''] || 'Analysis'}</div>

      <!-- Symbol and Direction -->
      <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e0e0e0;">
        <span class="symbol" style="font-size: 22px; font-weight: 800;">${data.symbol}/USDT</span>
        <span class="direction-tag ${hasDirection ? (isLong ? 'tag-long' : 'tag-short') : ''}" style="font-size: 14px; margin-left: 12px; padding: 3px 10px; border-radius: 4px; ${!hasDirection ? 'background: #fef3c7; color: #d97706;' : hasDirection ? (isLong ? 'background: #dcfce7; color: #16a34a;' : 'background: #fee2e2; color: #dc2626;') : ''}">${hasDirection ? (isLong ? 'LONG' : 'SHORT') : 'WAIT'}</span>
      </div>
    </div>

    <!-- Verdict & Direction Box -->
    <div class="step-box" style="background: ${hasDirection ? (isLong ? 'linear-gradient(135deg, #f0fdf4, #dcfce7)' : 'linear-gradient(135deg, #fef2f2, #fee2e2)') : 'linear-gradient(135deg, #fef3c7, #fde68a)'}; border: 1px solid ${hasDirection ? (isLong ? '#16a34a' : '#dc2626') : '#d97706'}; padding: 10px 15px;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div style="font-size: 8px; color: #666; margin-bottom: 2px;">VERDICT</div>
          <div style="font-size: 16px; font-weight: 700; ${isConditional ? 'color: #d97706' : hasDirection ? (isLong ? 'color: #16a34a' : 'color: #dc2626') : 'color: #d97706'}">${formatAction(verdictAction)}</div>
        </div>
        <div>
          <div style="font-size: 8px; color: #666; margin-bottom: 2px;">DIRECTION</div>
          <div style="font-size: 16px; font-weight: 700; ${hasDirection ? (isLong ? 'color: #16a34a' : 'color: #dc2626') : 'color: #d97706'}">${hasDirection ? (isLong ? 'LONG' : 'SHORT') : 'NEUTRAL'}</div>
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

    ${isConditional ? `
    <!-- CONDITIONAL GO Explanation Box -->
    <div style="margin-top: 8px; margin-bottom: 8px; padding: 10px 12px; background: linear-gradient(135deg, #fef3c7, #fde68a); border: 1px solid #d97706; border-radius: 6px;">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
        <span style="font-size: 14px;">⚠️</span>
        <span style="font-size: 10px; font-weight: 700; color: #92400e;">CONDITIONAL ENTRY - CONDITIONS REQUIRED</span>
      </div>
      <div style="font-size: 8px; color: #78350f; line-height: 1.5;">
        <strong>This trade requires specific conditions to be met before entry:</strong>
        <ul style="margin: 4px 0 0 15px; padding: 0;">
          ${data.timing?.conditions?.filter(c => !c.met).map(c => `<li style="margin-bottom: 2px;">${c.name}: ${c.details || 'Pending confirmation'}</li>`).join('') || '<li>Wait for price to reach optimal entry zone</li><li>Monitor volume confirmation</li>'}
        </ul>
        ${data.timing?.waitFor ? `<div style="margin-top: 4px;"><strong>Wait for:</strong> ${data.timing.waitFor.event} (Est: ${data.timing.waitFor.estimatedTime})</div>` : ''}
      </div>
    </div>
    ` : ''}

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
  const methodDisplay = data.method === 'mlis_pro' ? 'MLIS Pro' : 'Classic 7-Step';
  const methodColor = data.method === 'mlis_pro' ? '#8b5cf6' : '#14B8A6';

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${styles}</style></head><body>
  <div class="page">
    <div class="header">
      <div class="brand">
        <div class="logo">
          <svg width="32" height="32" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="tealGrad2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#5EEDC3"/><stop offset="100%" stop-color="#14B8A6"/></linearGradient>
              <linearGradient id="coralGrad2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#FF8A9B"/><stop offset="100%" stop-color="#EF5A6F"/></linearGradient>
            </defs>
            <path d="M100 10 L120 80 L100 100 L80 80 Z" fill="url(#tealGrad2)"/>
            <path d="M190 100 L120 120 L100 100 L120 80 Z" fill="url(#tealGrad2)"/>
            <path d="M100 190 L80 120 L100 100 L120 120 Z" fill="url(#coralGrad2)"/>
            <path d="M10 100 L80 80 L100 100 L80 120 Z" fill="url(#coralGrad2)"/>
          </svg>
        </div>
        <div class="brand-name"><span style="color: #14B8A6;">Trader</span><span style="color: #F87171;">Path</span></div>
      </div>
      <div class="header-center">
        <div class="report-title">Trade Plan</div>
        <div style="display: inline-block; padding: 2px 6px; background: ${methodColor}; color: #fff; border-radius: 3px; font-size: 7px; font-weight: 600; margin-top: 2px;">${methodDisplay}</div>
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
  const methodDisplay = data.method === 'mlis_pro' ? 'MLIS Pro' : 'Classic 7-Step';
  const methodColor = data.method === 'mlis_pro' ? '#8b5cf6' : '#14B8A6';

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${styles}</style></head><body>
  <div class="page">
    <div class="header">
      <div class="brand">
        <div class="logo">
          <svg width="32" height="32" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="tealGrad3" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#5EEDC3"/><stop offset="100%" stop-color="#14B8A6"/></linearGradient>
              <linearGradient id="coralGrad3" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#FF8A9B"/><stop offset="100%" stop-color="#EF5A6F"/></linearGradient>
            </defs>
            <path d="M100 10 L120 80 L100 100 L80 80 Z" fill="url(#tealGrad3)"/>
            <path d="M190 100 L120 120 L100 100 L120 80 Z" fill="url(#tealGrad3)"/>
            <path d="M100 190 L80 120 L100 100 L120 120 Z" fill="url(#coralGrad3)"/>
            <path d="M10 100 L80 80 L100 100 L80 120 Z" fill="url(#coralGrad3)"/>
          </svg>
        </div>
        <div class="brand-name"><span style="color: #14B8A6;">Trader</span><span style="color: #F87171;">Path</span></div>
      </div>
      <div class="header-center">
        <div class="report-title">Tokenomics Analysis</div>
        <div style="display: inline-block; padding: 2px 6px; background: ${methodColor}; color: #fff; border-radius: 3px; font-size: 7px; font-weight: 600; margin-top: 2px;">${methodDisplay}</div>
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

  const methodDisplay = data.method === 'mlis_pro' ? 'MLIS Pro' : 'Classic 7-Step';
  const methodColor = data.method === 'mlis_pro' ? '#8b5cf6' : '#14B8A6';

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${styles}</style></head><body>
  <div class="page">
    <div class="header">
      <div class="brand">
        <div class="logo">
          <svg width="32" height="32" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="tealGrad4" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#5EEDC3"/><stop offset="100%" stop-color="#14B8A6"/></linearGradient>
              <linearGradient id="coralGrad4" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#FF8A9B"/><stop offset="100%" stop-color="#EF5A6F"/></linearGradient>
            </defs>
            <path d="M100 10 L120 80 L100 100 L80 80 Z" fill="url(#tealGrad4)"/>
            <path d="M190 100 L120 120 L100 100 L120 80 Z" fill="url(#tealGrad4)"/>
            <path d="M100 190 L80 120 L100 100 L120 120 Z" fill="url(#coralGrad4)"/>
            <path d="M10 100 L80 80 L100 100 L80 120 Z" fill="url(#coralGrad4)"/>
          </svg>
        </div>
        <div class="brand-name"><span style="color: #14B8A6;">Trader</span><span style="color: #F87171;">Path</span></div>
      </div>
      <div class="header-center">
        <div class="report-title">Analysis Steps 1-2</div>
        <div style="display: inline-block; padding: 2px 6px; background: ${methodColor}; color: #fff; border-radius: 3px; font-size: 7px; font-weight: 600; margin-top: 2px;">${methodDisplay}</div>
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

  const methodDisplay = data.method === 'mlis_pro' ? 'MLIS Pro' : 'Classic 7-Step';
  const methodColor = data.method === 'mlis_pro' ? '#8b5cf6' : '#14B8A6';

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${styles}</style></head><body>
  <div class="page">
    <div class="header">
      <div class="brand">
        <div class="logo">
          <svg width="32" height="32" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="tealGrad5" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#5EEDC3"/><stop offset="100%" stop-color="#14B8A6"/></linearGradient>
              <linearGradient id="coralGrad5" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#FF8A9B"/><stop offset="100%" stop-color="#EF5A6F"/></linearGradient>
            </defs>
            <path d="M100 10 L120 80 L100 100 L80 80 Z" fill="url(#tealGrad5)"/>
            <path d="M190 100 L120 120 L100 100 L120 80 Z" fill="url(#tealGrad5)"/>
            <path d="M100 190 L80 120 L100 100 L120 120 Z" fill="url(#coralGrad5)"/>
            <path d="M10 100 L80 80 L100 100 L80 120 Z" fill="url(#coralGrad5)"/>
          </svg>
        </div>
        <div class="brand-name"><span style="color: #14B8A6;">Trader</span><span style="color: #F87171;">Path</span></div>
      </div>
      <div class="header-center">
        <div class="report-title">Analysis Steps 3-4</div>
        <div style="display: inline-block; padding: 2px 6px; background: ${methodColor}; color: #fff; border-radius: 3px; font-size: 7px; font-weight: 600; margin-top: 2px;">${methodDisplay}</div>
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

  const methodDisplay = data.method === 'mlis_pro' ? 'MLIS Pro' : 'Classic 7-Step';
  const methodColor = data.method === 'mlis_pro' ? '#8b5cf6' : '#14B8A6';

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${styles}</style></head><body>
  <div class="page">
    <div class="header">
      <div class="brand">
        <div class="logo">
          <svg width="32" height="32" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="tealGrad6" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#5EEDC3"/><stop offset="100%" stop-color="#14B8A6"/></linearGradient>
              <linearGradient id="coralGrad6" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#FF8A9B"/><stop offset="100%" stop-color="#EF5A6F"/></linearGradient>
            </defs>
            <path d="M100 10 L120 80 L100 100 L80 80 Z" fill="url(#tealGrad6)"/>
            <path d="M190 100 L120 120 L100 100 L120 80 Z" fill="url(#tealGrad6)"/>
            <path d="M100 190 L80 120 L100 100 L120 120 Z" fill="url(#coralGrad6)"/>
            <path d="M10 100 L80 80 L100 100 L80 120 Z" fill="url(#coralGrad6)"/>
          </svg>
        </div>
        <div class="brand-name"><span style="color: #14B8A6;">Trader</span><span style="color: #F87171;">Path</span></div>
      </div>
      <div class="header-center">
        <div class="report-title">Analysis Steps 5-6</div>
        <div style="display: inline-block; padding: 2px 6px; background: ${methodColor}; color: #fff; border-radius: 3px; font-size: 7px; font-weight: 600; margin-top: 2px;">${methodDisplay}</div>
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

  const methodDisplay = data.method === 'mlis_pro' ? 'MLIS Pro' : 'Classic 7-Step';
  const methodColor = data.method === 'mlis_pro' ? '#8b5cf6' : '#14B8A6';

  // Check for conditional verdict
  const verdictAction = getVerdictAction(v);
  // Guard: verdictAction could be non-string
  const verdictActionLower2 = typeof verdictAction === 'string' ? verdictAction.toLowerCase() : '';
  const isConditional = verdictActionLower2.includes('conditional') || verdictActionLower2.includes('cond');

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${styles}</style></head><body>
  <div class="page">
    <div class="header">
      <div class="brand">
        <div class="logo">
          <svg width="32" height="32" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="tealGrad7" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#5EEDC3"/><stop offset="100%" stop-color="#14B8A6"/></linearGradient>
              <linearGradient id="coralGrad7" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#FF8A9B"/><stop offset="100%" stop-color="#EF5A6F"/></linearGradient>
            </defs>
            <path d="M100 10 L120 80 L100 100 L80 80 Z" fill="url(#tealGrad7)"/>
            <path d="M190 100 L120 120 L100 100 L120 80 Z" fill="url(#tealGrad7)"/>
            <path d="M100 190 L80 120 L100 100 L120 120 Z" fill="url(#coralGrad7)"/>
            <path d="M10 100 L80 80 L100 100 L80 120 Z" fill="url(#coralGrad7)"/>
          </svg>
        </div>
        <div class="brand-name"><span style="color: #14B8A6;">Trader</span><span style="color: #F87171;">Path</span></div>
      </div>
      <div class="header-center">
        <div class="report-title">Final Verdict</div>
        <div style="display: inline-block; padding: 2px 6px; background: ${methodColor}; color: #fff; border-radius: 3px; font-size: 7px; font-weight: 600; margin-top: 2px;">${methodDisplay}</div>
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
        <div style="font-size: 24px; font-weight: 700; ${isConditional ? 'color: #d97706' : hasDirection ? (isLong ? 'color: #16a34a' : 'color: #dc2626') : 'color: #d97706'}">${formatAction(getVerdictAction(v))}</div>
        <div style="font-size: 28px; font-weight: 800; margin: 8px 0;">${formatPercent(v?.overallScore)}</div>
        <div style="font-size: 9px; color: #666;">${isConditional ? 'Conditional entry - Specific conditions must be met before entering' : hasDirection ? (isLong ? 'Bullish setup - Long position recommended' : 'Bearish setup - Short position recommended') : 'Market conditions unclear - Wait for better setup'}</div>
      </div>
    </div>

    ${isConditional ? `
    <!-- CONDITIONAL GO Explanation -->
    <div style="margin-bottom: 10px; padding: 12px; background: linear-gradient(135deg, #fef3c7, #fde68a); border: 2px solid #d97706; border-radius: 6px;">
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
        <span style="font-size: 18px;">⚠️</span>
        <span style="font-size: 12px; font-weight: 700; color: #92400e;">CONDITIONAL ENTRY REQUIREMENTS</span>
      </div>
      <div style="font-size: 9px; color: #78350f; line-height: 1.6;">
        <strong>This trade signal requires the following conditions to be met before entering:</strong>
        <div style="margin-top: 8px; padding-left: 15px;">
          ${data.timing?.conditions?.filter(c => !c.met).map(c => `
            <div style="margin-bottom: 4px; display: flex; align-items: start; gap: 6px;">
              <span style="color: #d97706;">◉</span>
              <span><strong>${c.name}:</strong> ${c.details || 'Confirmation pending'}</span>
            </div>
          `).join('') || `
            <div style="margin-bottom: 4px; display: flex; align-items: start; gap: 6px;"><span style="color: #d97706;">◉</span><span>Price must reach optimal entry zone</span></div>
            <div style="margin-bottom: 4px; display: flex; align-items: start; gap: 6px;"><span style="color: #d97706;">◉</span><span>Volume confirmation required</span></div>
            <div style="margin-bottom: 4px; display: flex; align-items: start; gap: 6px;"><span style="color: #d97706;">◉</span><span>Wait for trend confirmation on lower timeframe</span></div>
          `}
        </div>
        ${data.timing?.waitFor ? `
        <div style="margin-top: 8px; padding: 6px 10px; background: #fef9c3; border-radius: 4px;">
          <strong>⏳ Wait for:</strong> ${data.timing.waitFor.event} (Estimated: ${data.timing.waitFor.estimatedTime})
        </div>
        ` : ''}
        <div style="margin-top: 8px; padding: 6px 10px; background: #fef2f2; border-left: 3px solid #dc2626; font-size: 8px; color: #991b1b;">
          <strong>Warning:</strong> Do NOT enter this trade until all conditions above are satisfied. Entering prematurely significantly increases risk.
        </div>
      </div>
    </div>
    ` : ''}

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
        break;
      }
    }

    // Also try to find by class name if ID search fails
    if (!element) {
      element = document.querySelector('.trade-plan-chart-container') as HTMLElement;
      // Found by class name
    }

    // Try to find any canvas element as last resort (Lightweight Charts renders to canvas)
    if (!element) {
      const canvasElements = document.querySelectorAll('canvas');
      for (const canvas of canvasElements) {
        const parent = canvas.parentElement;
        if (parent && (parent.offsetWidth > 400 || parent.clientHeight > 300)) {
          element = parent as HTMLElement;
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

// ===========================================
// PAGE 8: RAG INTELLIGENCE LAYER
// Forecast Bands, Multi-Strategy, Web Research, Validation
// ===========================================

function generatePageRAG(data: AnalysisReportData, totalPages: number): string {
  const rag = data.ragEnrichment;
  if (!rag) return '';

  const bands = rag.forecastBands || [];
  const strategies = rag.strategies?.strategies || [];
  const research = rag.research;
  const validation = rag.validation;
  const recommended = rag.strategies?.recommended || '';

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${styles}</style></head><body>
  <div class="page">
    <!-- Header -->
    <div style="text-align:center;padding:12px 0 15px;border-bottom:2px solid #1a1a1a;margin-bottom:12px;">
      <div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#1a1a1a;">RAG Intelligence Layer</div>
      <div style="font-size:7px;color:#666;margin-top:3px;">${data.symbol} | Page 8 of ${totalPages}</div>
    </div>

    ${validation ? `
    <!-- Validation Badge -->
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;padding:6px 10px;border-radius:6px;border:1px solid ${validation.passed ? '#86efac' : '#fca5a5'};background:${validation.passed ? '#f0fdf4' : '#fef2f2'};">
      <span style="font-size:12px;">${validation.passed ? '✓' : '✗'}</span>
      <span style="font-size:8px;font-weight:600;color:${validation.passed ? '#16a34a' : '#dc2626'};">${validation.passed ? 'Plan Validated' : 'Validation Issues Found'}</span>
      ${rag.capitalFlowAligned != null ? `<span style="margin-left:auto;font-size:6px;font-weight:600;color:${rag.capitalFlowAligned ? '#16a34a' : '#dc2626'};padding:2px 6px;border-radius:3px;background:${rag.capitalFlowAligned ? '#dcfce7' : '#fee2e2'};">${rag.capitalFlowAligned ? 'Flow Aligned' : 'Counter-Flow'}</span>` : ''}
    </div>
    ${validation.summary ? `<div style="font-size:7px;color:#666;margin-bottom:10px;padding:4px 8px;background:#fafafa;border-radius:4px;">${validation.summary}</div>` : ''}
    ` : ''}

    ${bands.length > 0 ? `
    <!-- Forecast Bands -->
    <div class="section">
      <div class="section-header"><span class="section-title">AI Forecast Bands (P10 / P50 / P90)</span></div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;">
        ${bands.map((b: { horizon: string; label: string; p10: number; p50: number; p90: number; bandWidthPercent: number; drivers: string[] }) => {
          const horizonColor = b.horizon === 'short' ? '#16a34a' : b.horizon === 'medium' ? '#2563eb' : '#7c3aed';
          return `
          <div style="border:1px solid #e0e0e0;border-radius:6px;padding:6px 8px;background:#fafafa;">
            <div style="font-size:7px;font-weight:600;color:${horizonColor};text-transform:uppercase;margin-bottom:4px;">${b.label || b.horizon}</div>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:2px;text-align:center;">
              <div><div style="font-size:5px;color:#999;">P10</div><div style="font-size:8px;font-weight:600;color:#dc2626;">${formatPrice(b.p10)}</div></div>
              <div style="background:#f0fdf4;border-radius:3px;padding:2px;"><div style="font-size:5px;color:#999;">P50</div><div style="font-size:10px;font-weight:700;color:#1a1a1a;">${formatPrice(b.p50)}</div></div>
              <div><div style="font-size:5px;color:#999;">P90</div><div style="font-size:8px;font-weight:600;color:#16a34a;">${formatPrice(b.p90)}</div></div>
            </div>
            <div style="font-size:6px;color:#888;margin-top:3px;text-align:center;">Band: ${b.bandWidthPercent?.toFixed(1) || '0'}%</div>
            ${b.drivers?.length ? `<div style="margin-top:3px;display:flex;flex-wrap:wrap;gap:2px;">${b.drivers.slice(0, 3).map((d: string) => `<span style="font-size:5px;padding:1px 4px;background:#e0e7ff;border-radius:2px;color:#3730a3;">${d}</span>`).join('')}</div>` : ''}
          </div>`;
        }).join('')}
      </div>
    </div>
    ` : ''}

    ${strategies.length > 0 ? `
    <!-- Multi-Strategy Plans -->
    <div class="section">
      <div class="section-header"><span class="section-title">Multi-Strategy Plans (${strategies.length} strategies)</span></div>
      <table class="table" style="margin-top:4px;">
        <thead>
          <tr>
            <th style="width:22%;">Strategy</th>
            <th style="width:10%;">Dir</th>
            <th style="width:13%;">Entry</th>
            <th style="width:13%;">Stop Loss</th>
            <th style="width:17%;">Take Profits</th>
            <th style="width:8%;">R:R</th>
            <th style="width:17%;">Score</th>
          </tr>
        </thead>
        <tbody>
          ${strategies.map((s: { id: string; label: string; direction: string; entry: { price: number; type: string }; stopLoss: { price: number }; takeProfits: Array<{ price: number; label: string }>; riskReward: number; applicability: number; counterFlow?: boolean }) => {
            const isRec = s.id === recommended;
            return `
            <tr style="${isRec ? 'background:#f0fdf4;font-weight:600;' : ''}">
              <td>
                ${s.label}${isRec ? ' ★' : ''}${s.counterFlow ? ' ⚠️' : ''}
              </td>
              <td><span style="color:${s.direction === 'long' ? '#16a34a' : '#dc2626'};font-weight:600;">${s.direction.toUpperCase()}</span></td>
              <td>${formatPrice(s.entry?.price)} <span style="color:#888;font-size:5px;">(${s.entry?.type || 'market'})</span></td>
              <td style="color:#dc2626;">${formatPrice(s.stopLoss?.price)}</td>
              <td>${s.takeProfits?.map((tp: { price: number; label: string }) => `${formatPrice(tp.price)}`).join(' / ') || '-'}</td>
              <td style="font-weight:600;">${s.riskReward?.toFixed(1) || '-'}:1</td>
              <td>
                <div style="display:flex;align-items:center;gap:3px;">
                  <div style="flex:1;height:4px;background:#e5e7eb;border-radius:2px;overflow:hidden;"><div style="width:${s.applicability || 0}%;height:100%;background:${(s.applicability || 0) >= 70 ? '#16a34a' : (s.applicability || 0) >= 40 ? '#d97706' : '#dc2626'};border-radius:2px;"></div></div>
                  <span style="font-size:6px;min-width:22px;text-align:right;">${s.applicability || 0}%</span>
                </div>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
    ` : ''}

    ${research ? `
    <!-- Web Research -->
    <div class="section">
      <div class="section-header">
        <span class="section-title">Web Research</span>
        <span style="font-size:6px;padding:1px 5px;border-radius:3px;background:${research.mode === 'deep' ? '#ede9fe' : research.mode === 'news' ? '#dbeafe' : '#f3f4f6'};color:${research.mode === 'deep' ? '#6d28d9' : research.mode === 'news' ? '#1d4ed8' : '#4b5563'};font-weight:600;">${research.mode?.toUpperCase()}</span>
        ${research.sentiment ? `<span style="font-size:6px;margin-left:auto;color:${research.sentiment.label === 'bullish' ? '#16a34a' : research.sentiment.label === 'bearish' ? '#dc2626' : '#d97706'};font-weight:600;">${research.sentiment.label?.toUpperCase()} (${research.sentiment.score}/100)</span>` : ''}
      </div>
      ${research.summary ? `<div style="font-size:7px;color:#374151;line-height:1.5;margin-bottom:6px;padding:6px 8px;background:#f9fafb;border-radius:4px;">${research.summary}</div>` : ''}
      ${research.citations?.length ? `
      <div style="font-size:6px;color:#666;font-weight:600;margin-bottom:3px;">Sources (${research.citations.length})</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:3px;">
        ${research.citations.slice(0, 6).map((c: { source: string; title: string; sentiment?: string; reliability: number }, i: number) => `
        <div style="font-size:6px;padding:3px 5px;background:#fafafa;border:1px solid #eee;border-radius:3px;">
          <span style="font-weight:600;">[${i + 1}] ${c.source}</span>
          <span style="color:${c.sentiment === 'bullish' ? '#16a34a' : c.sentiment === 'bearish' ? '#dc2626' : '#666'}; margin-left:3px;">${c.sentiment || ''}</span>
          <div style="color:#888;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${c.title || ''}</div>
        </div>`).join('')}
      </div>
      ` : ''}
    </div>
    ` : ''}

    <!-- Footer -->
    <div style="position:absolute;bottom:15px;left:24px;right:24px;display:flex;justify-content:space-between;font-size:6px;color:#999;border-top:1px solid #eee;padding-top:6px;">
      <span>TraderPath RAG Intelligence Layer</span>
      <span>Page 8 of ${totalPages}</span>
    </div>
  </div>
  </body></html>`;
}

// ===========================================
// SINGLE PAGE REPORT FORMAT
// Section 1: Capital Flow Analysis Summary (4 layer boxes 2x2)
// Section 2: 7 Step Analysis (2-column layout + Trade Decision + ML Confirmation + Trade Plan)
// ===========================================

function generateSinglePageReport(data: AnalysisReportData): string {
  const mp = data.marketPulse || { btcDominance: 0, fearGreedIndex: 0, fearGreedLabel: 'N/A', trend: { direction: 'neutral', strength: 0 } };
  const as = data.assetScan || { currentPrice: 0, priceChange24h: 0, indicators: { rsi: 0, macd: { histogram: 0 } } };
  const sc = data.safetyCheck || { riskLevel: 'N/A', warnings: [], manipulation: { pumpDumpRisk: 'N/A' }, whaleActivity: { bias: 'N/A' } };
  const tm = data.timing || { tradeNow: false, reason: 'N/A', conditions: [] };
  const tp = data.tradePlan || { direction: 'N/A', averageEntry: 0, stopLoss: { price: 0 }, takeProfits: [], riskReward: 0 };
  const tc = data.trapCheck || { traps: { bullTrap: false, bearTrap: false, fakeoutRisk: 'N/A' } };
  const verdict = data.verdict || { action: 'WAIT', overallScore: 0 };
  const cf = data.capitalFlow || {};
  const ml = data.mlConfirmation;

  const directionStr = formatDirection(tp.direction);
  // Guard: formatDirection returns string, but defensive against edge cases
  const dirLower = typeof directionStr === 'string' ? directionStr.toLowerCase() : '';
  const isLong = dirLower === 'long';
  const isShort = dirLower === 'short';

  const verdictAction = formatAction(getVerdictAction(verdict));
  const verdictColor = verdictAction === 'GO' ? '#16a34a' : verdictAction.includes('CONDITIONAL') ? '#d97706' : verdictAction === 'AVOID' ? '#dc2626' : '#666';

  // Unique gradient IDs for this page
  const tealGradId = 'tealGradSP';
  const coralGradId = 'coralGradSP';

  const logoSvgSinglePage = `<svg width="28" height="28" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="${tealGradId}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#5EEDC3"/><stop offset="50%" stop-color="#2DD4A8"/><stop offset="100%" stop-color="#14B8A6"/>
      </linearGradient>
      <linearGradient id="${coralGradId}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#FF8A9B"/><stop offset="50%" stop-color="#F87171"/><stop offset="100%" stop-color="#EF5A6F"/>
      </linearGradient>
    </defs>
    <path d="M100 10 L120 80 L100 100 L80 80 Z" fill="url(#${tealGradId})"/>
    <path d="M190 100 L120 120 L100 100 L120 80 Z" fill="url(#${tealGradId})"/>
    <path d="M100 190 L80 120 L100 100 L120 120 Z" fill="url(#${coralGradId})"/>
    <path d="M10 100 L80 80 L100 100 L80 120 Z" fill="url(#${coralGradId})"/>
  </svg>`;

  // Helper for Capital Flow layer boxes
  const getLayerBox = (num: number, title: string, content: string, badge?: string, badgeColor?: string) => `
    <div style="flex: 1; min-width: 240px; border: 1px solid #e0e0e0; border-radius: 4px; padding: 6px 8px; background: #fafafa;">
      <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 4px;">
        <span style="font-size: 7px; font-weight: 700; color: #666;">L${num}</span>
        <span style="font-size: 8px; font-weight: 600; color: #1a1a1a;">${title}</span>
        ${badge ? `<span style="margin-left: auto; font-size: 6px; font-weight: 600; padding: 1px 4px; border-radius: 2px; background: ${badgeColor || '#666'}; color: white;">${badge}</span>` : ''}
      </div>
      <div style="font-size: 7px; color: #444; line-height: 1.4;">${content}</div>
    </div>
  `;

  // Layer 1: Global Liquidity
  const l1Bias = cf.layer1?.bias || 'neutral';
  const l1BiasColor = l1Bias === 'risk_on' ? '#16a34a' : l1Bias === 'risk_off' ? '#dc2626' : '#666';
  const l1Content = cf.layer1
    ? `DXY: ${cf.layer1.dxy?.toFixed(2) || '-'} | VIX: ${cf.layer1.vix?.toFixed(1) || '-'}`
    : 'No data available';

  // Layer 2: Market Flow
  const l2Market = cf.layer2?.primaryMarket || '-';
  const l2Content = cf.layer2?.flows?.slice(0, 2).map(f => `${f.market}: ${f.flow7d > 0 ? '+' : ''}${f.flow7d.toFixed(1)}%`).join(' | ') || 'No flow data';

  // Layer 3: Sector Activity
  const l3Content = cf.layer3?.topSectors?.slice(0, 2).map(s => `${s.name}: ${s.flow > 0 ? '+' : ''}${s.flow.toFixed(1)}%`).join(' | ') || 'No sector data';

  // Layer 4: AI Recommendation
  const l4Dir = cf.layer4?.direction || 'HOLD';
  const l4DirColor = l4Dir === 'BUY' ? '#16a34a' : l4Dir === 'SELL' ? '#dc2626' : '#666';
  const l4Content = cf.layer4 ? `${cf.layer4.market || '-'} | Conf: ${cf.layer4.confidence || 0}%` : 'No recommendation';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        ${styles}
        .single-page { padding: 12px 24px; max-width: 560px; margin: 0 auto; }
        .section-box { border: 1px solid #ddd; border-radius: 4px; padding: 8px 10px; margin-bottom: 8px; background: #fff; }
        .section-title-bar { display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px solid #e0e0e0; }
        .section-num { font-size: 8px; font-weight: 700; color: #fff; background: #1a1a1a; padding: 2px 6px; border-radius: 3px; }
        .section-name { font-size: 10px; font-weight: 600; color: #1a1a1a; }
        .layer-grid { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; }
        .two-col { display: flex; gap: 8px; justify-content: center; }
        .two-col > div { flex: 1; max-width: 260px; }
        .step-mini { border: 1px solid #e5e5e5; border-radius: 3px; padding: 5px 7px; margin-bottom: 5px; background: #fafafa; }
        .step-mini-header { display: flex; align-items: center; gap: 4px; margin-bottom: 3px; }
        .step-mini-num { font-size: 7px; font-weight: 700; color: #666; }
        .step-mini-title { font-size: 8px; font-weight: 600; color: #1a1a1a; }
        .step-mini-gate { margin-left: auto; font-size: 6px; font-weight: 600; }
        .step-mini-content { font-size: 7px; color: #444; line-height: 1.35; }
        .step-mini-row { display: flex; gap: 4px; margin-top: 3px; justify-content: center; }
        .step-mini-metric { background: #fff; border: 1px solid #eee; border-radius: 2px; padding: 2px 5px; flex: 1; text-align: center; }
        .step-mini-metric-label { font-size: 5px; color: #888; text-transform: uppercase; }
        .step-mini-metric-value { font-size: 8px; font-weight: 600; color: #1a1a1a; }
        .trade-decision-box { border: 2px solid #1a1a1a; border-radius: 4px; padding: 8px 12px; text-align: center; background: linear-gradient(135deg, #fafafa 0%, #f0f0f0 100%); }
        .trade-decision-action { font-size: 20px; font-weight: 700; }
        .trade-decision-sub { font-size: 7px; color: #666; margin-top: 2px; }
        .ml-box { border: 1px solid #8b5cf6; border-radius: 4px; padding: 6px 10px; background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%); margin-top: 6px; }
        .ml-header { display: flex; align-items: center; justify-content: center; gap: 6px; margin-bottom: 4px; }
        .ml-badge { font-size: 7px; font-weight: 700; color: #fff; background: #8b5cf6; padding: 2px 6px; border-radius: 3px; }
        .ml-title { font-size: 8px; font-weight: 600; color: #6b21a8; }
        .ml-content { display: flex; gap: 8px; justify-content: center; }
        .ml-rec { font-size: 12px; font-weight: 700; color: #6b21a8; }
        .ml-conf { font-size: 8px; color: #7c3aed; }
        .ml-layers { display: flex; gap: 4px; flex: 1; justify-content: center; }
        .ml-layer { flex: 1; max-width: 60px; background: #fff; border: 1px solid #ddd6fe; border-radius: 2px; padding: 2px 4px; text-align: center; }
        .ml-layer-name { font-size: 5px; color: #7c3aed; text-transform: uppercase; }
        .ml-layer-score { font-size: 8px; font-weight: 600; color: #6b21a8; }
        .trade-plan-box { border: 1px solid #0d9488; border-radius: 4px; padding: 8px 10px; background: linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%); margin-top: 6px; }
        .tp-header { display: flex; align-items: center; justify-content: center; gap: 6px; margin-bottom: 6px; }
        .tp-badge { font-size: 7px; font-weight: 700; color: #fff; background: #0d9488; padding: 2px 6px; border-radius: 3px; }
        .tp-title { font-size: 9px; font-weight: 600; color: #0f766e; }
        .tp-grid { display: flex; gap: 6px; justify-content: center; }
        .tp-item { flex: 1; max-width: 120px; background: #fff; border: 1px solid #99f6e4; border-radius: 3px; padding: 4px 6px; text-align: center; }
        .tp-item-label { font-size: 6px; color: #0f766e; text-transform: uppercase; }
        .tp-item-value { font-size: 10px; font-weight: 700; color: #0d9488; }
        .tp-item-sub { font-size: 6px; color: #5eead4; }
      </style>
    </head>
    <body>
      <div class="page single-page">
        <!-- HEADER -->
        <div class="header" style="margin-bottom: 8px; padding-bottom: 6px; display: flex; justify-content: center; align-items: center; gap: 16px;">
          <div class="brand" style="display: flex; align-items: center; gap: 4px;">
            <div class="logo">${logoSvgSinglePage}</div>
            <div class="brand-name" style="font-size: 11px;">
              <span style="color: #0D9488;">Trader</span><span style="color: #DC2626;">Path</span>
            </div>
          </div>
          <div class="header-center" style="text-align: center;">
            <div class="report-title" style="font-size: 10px;">Asset Analysis Report</div>
            <div class="report-subtitle" style="font-size: 6px;">${data.method === 'mlis_pro' ? 'MLIS Pro' : 'Classic 7-Step'} | ${new Date(data.generatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</div>
          </div>
          <div class="header-right" style="text-align: center;">
            <div class="symbol" style="font-size: 12px;">${data.symbol}
              <span class="direction-tag ${isLong ? 'tag-long' : isShort ? 'tag-short' : ''}" style="font-size: 8px;">${directionStr}</span>
            </div>
            <div class="score-box" style="margin-top: 2px;">
              <span class="score-value" style="font-size: 14px; color: ${verdictColor};">${(verdict.overallScore || 0).toFixed(1)}</span>
              <span class="score-label" style="font-size: 6px;">/10</span>
            </div>
          </div>
        </div>

        <!-- SECTION 1: CAPITAL FLOW ANALYSIS SUMMARY -->
        <div class="section-box">
          <div class="section-title-bar">
            <span class="section-num">1</span>
            <span class="section-name">Capital Flow Analysis Summary</span>
          </div>
          <div class="layer-grid">
            <!-- Row 1: L1 + L2 -->
            <div style="display: flex; gap: 6px; width: 100%; margin-bottom: 4px;">
              ${getLayerBox(1, 'Global Liquidity', l1Content, l1Bias.toUpperCase().replace('_', ' '), l1BiasColor)}
              ${getLayerBox(2, 'Market Flow', l2Content, l2Market.toUpperCase(), '#0369a1')}
            </div>
            <!-- Row 2: L3 + L4 -->
            <div style="display: flex; gap: 6px; width: 100%;">
              ${getLayerBox(3, 'Sector Activity', l3Content)}
              ${getLayerBox(4, 'AI Recommendation', l4Content, l4Dir, l4DirColor)}
            </div>
          </div>
        </div>

        <!-- SECTION 2: 7 STEP ANALYSIS -->
        <div class="section-box" style="flex: 1; display: flex; flex-direction: column;">
          <div class="section-title-bar">
            <span class="section-num">2</span>
            <span class="section-name">7 Step Analysis</span>
          </div>

          <!-- 2-COLUMN LAYOUT -->
          <div class="two-col">
            <!-- LEFT COLUMN: Market Pulse, Asset Scan, Technical Analysis -->
            <div>
              <!-- Market Pulse -->
              <div class="step-mini">
                <div class="step-mini-header">
                  <span class="step-mini-num">1</span>
                  <span class="step-mini-title">Market Pulse</span>
                  <span class="step-mini-gate" style="color: ${getGateStatus(mp.gate).color};">${getGateStatus(mp.gate).text}</span>
                </div>
                <div class="step-mini-row">
                  <div class="step-mini-metric">
                    <div class="step-mini-metric-label">BTC Dom</div>
                    <div class="step-mini-metric-value">${mp.btcDominance?.toFixed(1) || '-'}%</div>
                  </div>
                  <div class="step-mini-metric">
                    <div class="step-mini-metric-label">Fear/Greed</div>
                    <div class="step-mini-metric-value">${mp.fearGreedIndex || '-'}</div>
                  </div>
                  <div class="step-mini-metric">
                    <div class="step-mini-metric-label">Regime</div>
                    <div class="step-mini-metric-value">${formatRegime(mp.marketRegime)}</div>
                  </div>
                </div>
              </div>

              <!-- Asset Scan -->
              <div class="step-mini">
                <div class="step-mini-header">
                  <span class="step-mini-num">2</span>
                  <span class="step-mini-title">Asset Scanner</span>
                  <span class="step-mini-gate" style="color: ${getGateStatus(as.gate).color};">${getGateStatus(as.gate).text}</span>
                </div>
                <div class="step-mini-row">
                  <div class="step-mini-metric">
                    <div class="step-mini-metric-label">Price</div>
                    <div class="step-mini-metric-value">${formatPrice(as.currentPrice)}</div>
                  </div>
                  <div class="step-mini-metric">
                    <div class="step-mini-metric-label">24h Chg</div>
                    <div class="step-mini-metric-value ${(as.priceChange24h || 0) >= 0 ? 'text-green' : 'text-red'}">${(as.priceChange24h || 0) >= 0 ? '+' : ''}${(as.priceChange24h || 0).toFixed(2)}%</div>
                  </div>
                  <div class="step-mini-metric">
                    <div class="step-mini-metric-label">RSI</div>
                    <div class="step-mini-metric-value">${as.indicators?.rsi?.toFixed(0) || '-'}</div>
                  </div>
                </div>
              </div>

              <!-- Technical Analysis -->
              <div class="step-mini">
                <div class="step-mini-header">
                  <span class="step-mini-num">3</span>
                  <span class="step-mini-title">Technical Analysis</span>
                </div>
                <div class="step-mini-row">
                  <div class="step-mini-metric">
                    <div class="step-mini-metric-label">Bullish</div>
                    <div class="step-mini-metric-value text-green">${data.indicatorDetails?.summary?.bullishIndicators || 0}</div>
                  </div>
                  <div class="step-mini-metric">
                    <div class="step-mini-metric-label">Bearish</div>
                    <div class="step-mini-metric-value text-red">${data.indicatorDetails?.summary?.bearishIndicators || 0}</div>
                  </div>
                  <div class="step-mini-metric">
                    <div class="step-mini-metric-label">Neutral</div>
                    <div class="step-mini-metric-value">${data.indicatorDetails?.summary?.neutralIndicators || 0}</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- RIGHT COLUMN: Safety Check, Timing Analysis, Trap Check -->
            <div>
              <!-- Safety Check -->
              <div class="step-mini">
                <div class="step-mini-header">
                  <span class="step-mini-num">4</span>
                  <span class="step-mini-title">Safety Check</span>
                  <span class="step-mini-gate" style="color: ${getGateStatus(sc.gate).color};">${getGateStatus(sc.gate).text}</span>
                </div>
                <div class="step-mini-row">
                  <div class="step-mini-metric">
                    <div class="step-mini-metric-label">Risk</div>
                    <div class="step-mini-metric-value ${sc.riskLevel === 'low' ? 'text-green' : sc.riskLevel === 'high' ? 'text-red' : 'text-amber'}">${(sc.riskLevel || 'N/A').toUpperCase()}</div>
                  </div>
                  <div class="step-mini-metric">
                    <div class="step-mini-metric-label">Whale</div>
                    <div class="step-mini-metric-value">${(sc.whaleActivity?.bias || 'N/A').charAt(0).toUpperCase() + (sc.whaleActivity?.bias || 'N/A').slice(1)}</div>
                  </div>
                  <div class="step-mini-metric">
                    <div class="step-mini-metric-label">Pump/Dump</div>
                    <div class="step-mini-metric-value">${(sc.manipulation?.pumpDumpRisk || 'N/A').charAt(0).toUpperCase() + (sc.manipulation?.pumpDumpRisk || 'N/A').slice(1)}</div>
                  </div>
                </div>
              </div>

              <!-- Timing Analysis -->
              <div class="step-mini">
                <div class="step-mini-header">
                  <span class="step-mini-num">5</span>
                  <span class="step-mini-title">Timing Analysis</span>
                  <span class="step-mini-gate" style="color: ${getGateStatus(tm.gate).color};">${getGateStatus(tm.gate).text}</span>
                </div>
                <div class="step-mini-row">
                  <div class="step-mini-metric">
                    <div class="step-mini-metric-label">Trade Now</div>
                    <div class="step-mini-metric-value ${tm.tradeNow ? 'text-green' : 'text-amber'}">${tm.tradeNow ? 'YES' : 'WAIT'}</div>
                  </div>
                  <div class="step-mini-metric" style="flex: 2;">
                    <div class="step-mini-metric-label">Reason</div>
                    <div class="step-mini-metric-value" style="font-size: 6px;">${(tm.reason || 'N/A').slice(0, 35)}${(tm.reason || '').length > 35 ? '...' : ''}</div>
                  </div>
                </div>
              </div>

              <!-- Trap Check -->
              <div class="step-mini">
                <div class="step-mini-header">
                  <span class="step-mini-num">6</span>
                  <span class="step-mini-title">Trap Check</span>
                  <span class="step-mini-gate" style="color: ${getGateStatus(tc.gate).color};">${getGateStatus(tc.gate).text}</span>
                </div>
                <div class="step-mini-row">
                  <div class="step-mini-metric">
                    <div class="step-mini-metric-label">Bull Trap</div>
                    <div class="step-mini-metric-value ${tc.traps?.bullTrap ? 'text-red' : 'text-green'}">${tc.traps?.bullTrap ? 'YES' : 'NO'}</div>
                  </div>
                  <div class="step-mini-metric">
                    <div class="step-mini-metric-label">Bear Trap</div>
                    <div class="step-mini-metric-value ${tc.traps?.bearTrap ? 'text-red' : 'text-green'}">${tc.traps?.bearTrap ? 'YES' : 'NO'}</div>
                  </div>
                  <div class="step-mini-metric">
                    <div class="step-mini-metric-label">Fakeout</div>
                    <div class="step-mini-metric-value">${(tc.traps?.fakeoutRisk || 'N/A').charAt(0).toUpperCase() + (tc.traps?.fakeoutRisk || 'N/A').slice(1)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- TRADE DECISION (Full Width) -->
          <div class="trade-decision-box" style="margin-top: 6px;">
            <div class="trade-decision-action" style="color: ${verdictColor};">${verdictAction}</div>
            <div class="trade-decision-sub">
              Score: ${(verdict.overallScore || 0).toFixed(1)}/10 | Direction: ${directionStr} | Confidence: ${formatPercent(tp.confidence)}
            </div>
          </div>

          <!-- ML CONFIRMATION (Full Width) -->
          <div class="ml-box" style="margin-top: 6px;">
            <div class="ml-header">
              <span class="ml-badge">ML</span>
              <span class="ml-title">ML Confirmation</span>
            </div>
            ${ml ? `
            <div style="display: flex; gap: 8px; align-items: center;">
              <div class="ml-rec">${ml.recommendation || 'HOLD'}</div>
              <div class="ml-conf">Confidence: ${ml.confidence || 0}%</div>
              <div class="ml-layers" style="flex: 1;">
                ${ml.layers ? Object.entries(ml.layers).slice(0, 4).map(([name, layer]) => `
                  <div class="ml-layer">
                    <div class="ml-layer-name">${name}</div>
                    <div class="ml-layer-score">${layer?.score?.toFixed(0) || '-'}</div>
                  </div>
                `).join('') : ''}
              </div>
            </div>
            ` : `
            <div style="font-size: 7px; color: #9ca3af; text-align: center; padding: 4px;">Run MLIS Pro for ML confirmation</div>
            `}
          </div>

          <!-- AI RECOMMENDATION (Full Width) -->
          <div style="border: 1px solid #f59e0b; border-radius: 4px; padding: 6px 10px; background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); margin-top: 6px;">
            <div style="display: flex; align-items: center; justify-content: center; gap: 6px; margin-bottom: 4px;">
              <span style="font-size: 7px; font-weight: 700; color: #fff; background: #f59e0b; padding: 2px 6px; border-radius: 3px;">AI</span>
              <span style="font-size: 8px; font-weight: 600; color: #92400e;">AI Recommendation</span>
            </div>
            <div style="display: flex; gap: 8px; justify-content: center;">
              <div style="flex: 1; max-width: 90px; background: #fff; border: 1px solid #fcd34d; border-radius: 3px; padding: 4px 6px; text-align: center;">
                <div style="font-size: 6px; color: #92400e; text-transform: uppercase;">Direction</div>
                <div style="font-size: 12px; font-weight: 700; color: ${l4Dir === 'BUY' ? '#16a34a' : l4Dir === 'SELL' ? '#dc2626' : '#666'};">${l4Dir}</div>
              </div>
              <div style="flex: 1; max-width: 90px; background: #fff; border: 1px solid #fcd34d; border-radius: 3px; padding: 4px 6px; text-align: center;">
                <div style="font-size: 6px; color: #92400e; text-transform: uppercase;">Market</div>
                <div style="font-size: 10px; font-weight: 600; color: #92400e;">${cf.layer4?.market || '-'}</div>
              </div>
              <div style="flex: 1; max-width: 90px; background: #fff; border: 1px solid #fcd34d; border-radius: 3px; padding: 4px 6px; text-align: center;">
                <div style="font-size: 6px; color: #92400e; text-transform: uppercase;">Confidence</div>
                <div style="font-size: 10px; font-weight: 600; color: #b45309;">${cf.layer4?.confidence || 0}%</div>
              </div>
              <div style="flex: 2; max-width: 200px; background: #fff; border: 1px solid #fcd34d; border-radius: 3px; padding: 4px 6px; text-align: center;">
                <div style="font-size: 6px; color: #92400e; text-transform: uppercase;">Reason</div>
                <div style="font-size: 7px; color: #78350f;">${cf.layer4?.reason || 'Capital flow analysis based recommendation'}</div>
              </div>
            </div>
          </div>

          <!-- TRADE PLAN (Full Width) -->
          <div class="trade-plan-box" style="margin-top: 6px;">
            <div class="tp-header">
              <span class="tp-badge">PLAN</span>
              <span class="tp-title">Trade Plan</span>
              <span style="margin-left: auto; font-size: 7px; font-weight: 600; color: #0f766e;">R:R ${formatRiskReward(tp.riskReward)}</span>
            </div>
            <div class="tp-grid">
              <div class="tp-item">
                <div class="tp-item-label">Entry</div>
                <div class="tp-item-value">${formatPrice(tp.averageEntry)}</div>
              </div>
              <div class="tp-item">
                <div class="tp-item-label">TP1</div>
                <div class="tp-item-value" style="color: #16a34a;">${formatPrice(tp.takeProfits?.[0]?.price)}</div>
                <div class="tp-item-sub">${tp.takeProfits?.[0]?.percentage ? `+${tp.takeProfits[0].percentage.toFixed(1)}%` : ''}</div>
              </div>
              <div class="tp-item">
                <div class="tp-item-label">TP2</div>
                <div class="tp-item-value" style="color: #16a34a;">${formatPrice(tp.takeProfits?.[1]?.price)}</div>
                <div class="tp-item-sub">${tp.takeProfits?.[1]?.percentage ? `+${tp.takeProfits[1].percentage.toFixed(1)}%` : ''}</div>
              </div>
              <div class="tp-item">
                <div class="tp-item-label">Stop Loss</div>
                <div class="tp-item-value" style="color: #dc2626;">${formatPrice(tp.stopLoss?.price)}</div>
                <div class="tp-item-sub">${tp.stopLoss?.percentage ? `-${Math.abs(tp.stopLoss.percentage).toFixed(1)}%` : ''}</div>
              </div>
            </div>
          </div>

          <!-- TRADE PLAN CHART (Full Width) -->
          <div style="border: 1px solid #e0e0e0; border-radius: 4px; padding: 6px; margin-top: 6px; background: #1a1a2e;">
            <div style="font-size: 7px; font-weight: 600; color: #fff; margin-bottom: 4px; display: flex; align-items: center; justify-content: center; gap: 6px;">
              <span>Trade Plan Chart</span>
              <span style="font-size: 6px; color: #9ca3af;">Entry • TP1-2 • SL</span>
            </div>
            ${generateTradePlanSvgChart(tp, as, as?.chartCandles)}
          </div>
        </div>

        <!-- FOOTER -->
        <div class="footer" style="position: absolute; bottom: 8px; left: 24px; right: 24px; max-width: 560px; margin: 0 auto;">
          <div class="footer-row" style="display: flex; justify-content: center; gap: 16px;">
            <span>TraderPath.io</span>
            <span>Analysis ID: ${data.analysisId || 'N/A'}</span>
            <span>${new Date(data.generatedAt).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <div class="footer-disclaimer" style="text-align: center;">${DISCLAIMER_TEXT}</div>
        </div>
      </div>
    </body>
    </html>
  `;
}

export async function generateAnalysisReport(data: AnalysisReportData, captureChart: boolean = true, singlePage: boolean = false): Promise<PdfResult | void> {
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

    const tradeTypes: Record<string, string> = { scalping: 'Scalping', dayTrade: 'DayTrade', swing: 'Swing' };
    const tradeType = data.tradeType ? tradeTypes[data.tradeType] || '' : '';

    // SINGLE PAGE FORMAT - Compact layout with all info on one page
    if (singlePage) {
      const canvas = await renderPageToCanvas(generateSinglePageReport(data));
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, pdfWidth, pdfHeight);

      const fileName = `TraderPath_${data.symbol}${tradeType ? `_${tradeType}` : ''}_Summary_${new Date().toISOString().split('T')[0]}.pdf`;
      const pdfBase64 = pdf.output('datauristring').split(',')[1];
      pdf.save(fileName);

      return { base64: pdfBase64, fileName };
    }

    // MULTI-PAGE FORMAT - Detailed report (7 pages + optional RAG page)
    const hasRAG = !!data.ragEnrichment;
    const totalPages = hasRAG ? 8 : 7;

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

    // Page 4: Steps 1-2 (Market Pulse + Asset Scanner)
    pdf.addPage();
    const canvas4 = await renderPageToCanvas(generatePageSteps12(data, totalPages));
    pdf.addImage(canvas4.toDataURL('image/png'), 'PNG', 0, 0, pdfWidth, pdfHeight);

    // Page 5: Steps 3-4 (Safety Check + Timing)
    pdf.addPage();
    const canvas5 = await renderPageToCanvas(generatePageSteps34(data, totalPages));
    pdf.addImage(canvas5.toDataURL('image/png'), 'PNG', 0, 0, pdfWidth, pdfHeight);

    // Page 6: Steps 5-6 (Trade Plan Details + Trap Check)
    pdf.addPage();
    const canvas6 = await renderPageToCanvas(generatePageSteps56(data, totalPages));
    pdf.addImage(canvas6.toDataURL('image/png'), 'PNG', 0, 0, pdfWidth, pdfHeight);

    // Page 7: Final Verdict
    pdf.addPage();
    const canvas7 = await renderPageToCanvas(generatePageVerdict(data, totalPages));
    pdf.addImage(canvas7.toDataURL('image/png'), 'PNG', 0, 0, pdfWidth, pdfHeight);

    // Page 8: RAG Intelligence Layer (optional - only if RAG enrichment data exists)
    if (hasRAG) {
      pdf.addPage();
      const canvas8 = await renderPageToCanvas(generatePageRAG(data, totalPages));
      pdf.addImage(canvas8.toDataURL('image/png'), 'PNG', 0, 0, pdfWidth, pdfHeight);
    }

    const fileName = `TraderPath_${data.symbol}${tradeType ? `_${tradeType}` : ''}_${new Date().toISOString().split('T')[0]}.pdf`;
    const pdfBase64 = pdf.output('datauristring').split(',')[1];
    pdf.save(fileName);

    return { base64: pdfBase64, fileName };
  } catch (error) {
    console.error('[PDF] Generation failed:', error);
    throw new Error(`PDF generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export type { AnalysisReportData as ReportData };
