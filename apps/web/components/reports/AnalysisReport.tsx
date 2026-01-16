'use client';

// ===========================================
// TraderPath Analysis Report - Professional PDF
// Clean, Minimal, Compact Design
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

  verdict: {
    action: string;
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

function formatConfidence(conf: number): string {
  if (conf > 1) return `${Math.round(conf)}%`;
  return `${Math.round(conf * 100)}%`;
}

// ===========================================
// MINIMAL STYLES
// ===========================================

const styles = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', -apple-system, Arial, sans-serif; font-size: 9px; color: #1a1a1a; background: #fff; line-height: 1.4; }
  .page { width: 595px; height: 842px; padding: 24px 28px; position: relative; }

  .header { display: flex; justify-content: space-between; align-items: flex-end; padding-bottom: 10px; border-bottom: 1px solid #e0e0e0; margin-bottom: 14px; }
  .header-left { }
  .brand { font-size: 14px; font-weight: 700; letter-spacing: -0.5px; }
  .brand-trade { color: #dc2626; }
  .brand-path { color: #16a34a; }
  .header-subtitle { font-size: 7px; color: #666; margin-top: 2px; }
  .header-right { text-align: right; }
  .symbol-large { font-size: 16px; font-weight: 700; color: #1a1a1a; }
  .direction-badge { display: inline-block; padding: 2px 8px; border-radius: 3px; font-size: 8px; font-weight: 600; margin-left: 6px; }
  .direction-long { background: #dcfce7; color: #166534; }
  .direction-short { background: #fee2e2; color: #991b1b; }
  .meta-line { font-size: 7px; color: #888; margin-top: 3px; }

  .step { margin-bottom: 12px; }
  .step-header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
  .step-num { font-size: 7px; font-weight: 700; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }
  .step-title { font-size: 10px; font-weight: 600; color: #1a1a1a; }
  .step-gate { margin-left: auto; font-size: 7px; font-weight: 600; padding: 2px 6px; border-radius: 3px; }
  .gate-pass { background: #dcfce7; color: #166534; }
  .gate-fail { background: #fee2e2; color: #991b1b; }

  .grid { display: grid; gap: 6px; }
  .grid-2 { grid-template-columns: 1fr 1fr; }
  .grid-3 { grid-template-columns: 1fr 1fr 1fr; }
  .grid-4 { grid-template-columns: 1fr 1fr 1fr 1fr; }

  .metric { background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 4px; padding: 6px 8px; }
  .metric-label { font-size: 7px; color: #666; text-transform: uppercase; letter-spacing: 0.3px; margin-bottom: 2px; }
  .metric-value { font-size: 11px; font-weight: 600; color: #1a1a1a; }
  .metric-sub { font-size: 7px; color: #888; margin-top: 1px; }

  .text-green { color: #16a34a; }
  .text-red { color: #dc2626; }
  .text-amber { color: #d97706; }
  .text-gray { color: #666; }

  .table { width: 100%; border-collapse: collapse; margin-top: 6px; }
  .table th { text-align: left; font-size: 7px; font-weight: 600; color: #666; text-transform: uppercase; padding: 4px 6px; border-bottom: 1px solid #e0e0e0; }
  .table td { font-size: 8px; padding: 4px 6px; border-bottom: 1px solid #f0f0f0; }
  .table tr:last-child td { border-bottom: none; }

  .summary-box { background: #f8f9fa; border: 1px solid #e0e0e0; border-radius: 4px; padding: 8px 10px; margin-top: 8px; }
  .summary-title { font-size: 8px; font-weight: 600; color: #1a1a1a; margin-bottom: 4px; }
  .summary-text { font-size: 8px; color: #444; line-height: 1.5; }

  .verdict-box { border: 2px solid #1a1a1a; border-radius: 6px; padding: 12px; margin-bottom: 12px; }
  .verdict-action { font-size: 14px; font-weight: 700; color: #1a1a1a; }
  .verdict-score { font-size: 28px; font-weight: 700; }

  .indicator-row { display: flex; align-items: center; padding: 3px 0; border-bottom: 1px solid #f0f0f0; }
  .indicator-row:last-child { border-bottom: none; }
  .indicator-name { flex: 1; font-size: 8px; color: #444; }
  .indicator-value { width: 60px; text-align: right; font-size: 8px; font-weight: 600; }
  .indicator-signal { width: 50px; text-align: right; font-size: 7px; font-weight: 500; }
  .leading-tag { font-size: 6px; background: #e0e7ff; color: #3730a3; padding: 1px 3px; border-radius: 2px; margin-left: 4px; }

  .section-title { font-size: 9px; font-weight: 600; color: #1a1a1a; margin-bottom: 6px; padding-bottom: 4px; border-bottom: 1px solid #e0e0e0; }

  .warning-box { background: #fef3c7; border: 1px solid #fcd34d; border-radius: 4px; padding: 6px 8px; margin-top: 6px; }
  .warning-text { font-size: 7px; color: #92400e; }

  .footer { position: absolute; bottom: 12px; left: 28px; right: 28px; display: flex; justify-content: space-between; font-size: 7px; color: #999; }

  .trade-level { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #f0f0f0; }
  .trade-level:last-child { border-bottom: none; }
  .trade-level-label { font-size: 8px; color: #666; }
  .trade-level-value { font-size: 9px; font-weight: 600; }

  .condition-row { display: flex; align-items: center; gap: 6px; padding: 3px 0; }
  .condition-status { width: 14px; height: 14px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 8px; font-weight: 700; }
  .condition-met { background: #dcfce7; color: #166534; }
  .condition-not { background: #fee2e2; color: #991b1b; }
  .condition-name { font-size: 8px; color: #444; }
`;

// ===========================================
// PAGE 1: Overview & Market Pulse
// ===========================================

function generatePage1(data: AnalysisReportData): string {
  const mp = data.marketPulse;
  const tp = data.tradePlan;
  const v = data.verdict;
  const isLong = tp?.direction === 'long';
  const score = Math.round((v?.overallScore || 0) * 10);
  const tradeTypeLabels: Record<string, string> = { scalping: 'Scalping', dayTrade: 'Day Trade', swing: 'Swing' };

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${styles}</style></head><body>
  <div class="page">
    <div class="header">
      <div class="header-left">
        <div class="brand"><span class="brand-trade">Trade</span><span class="brand-path">Path</span></div>
        <div class="header-subtitle">AI-Powered Trading Intelligence</div>
      </div>
      <div class="header-right">
        <span class="symbol-large">${data.symbol}/USDT</span>
        <span class="direction-badge ${isLong ? 'direction-long' : 'direction-short'}">${isLong ? 'LONG' : 'SHORT'}</span>
        <div class="meta-line">${data.generatedAt} | ${tradeTypeLabels[data.tradeType || ''] || 'Analysis'} | Score: ${score}/100</div>
      </div>
    </div>

    <!-- Verdict Summary -->
    <div class="verdict-box" style="display: flex; justify-content: space-between; align-items: center;">
      <div>
        <div class="verdict-action">${v?.action || 'ANALYSIS COMPLETE'}</div>
        <div style="font-size: 8px; color: #666; margin-top: 4px; max-width: 380px;">${v?.aiSummary?.slice(0, 180) || 'Review sections below for detailed analysis.'}${(v?.aiSummary?.length || 0) > 180 ? '...' : ''}</div>
      </div>
      <div style="text-align: center;">
        <div class="verdict-score ${isLong ? 'text-green' : 'text-red'}">${score}</div>
        <div style="font-size: 7px; color: #666;">/ 100</div>
      </div>
    </div>

    <!-- Quick Trade Plan -->
    <div class="step">
      <div class="section-title">Trade Plan Summary</div>
      <div class="grid grid-3">
        <div class="metric">
          <div class="metric-label">Entry</div>
          <div class="metric-value">${formatPrice(tp?.averageEntry)}</div>
        </div>
        <div class="metric">
          <div class="metric-label">Stop Loss</div>
          <div class="metric-value text-red">${formatPrice(tp?.stopLoss?.price)}</div>
          <div class="metric-sub">${tp?.stopLoss?.percentage ? `-${tp.stopLoss.percentage.toFixed(2)}%` : ''}</div>
        </div>
        <div class="metric">
          <div class="metric-label">Risk:Reward</div>
          <div class="metric-value">${tp?.riskReward?.toFixed(2) || '-'}:1</div>
        </div>
      </div>
      <div class="grid grid-3" style="margin-top: 6px;">
        ${(tp?.takeProfits || []).slice(0, 3).map((t, i) => `
          <div class="metric">
            <div class="metric-label">Target ${i + 1}</div>
            <div class="metric-value text-green">${formatPrice(t.price)}</div>
            <div class="metric-sub">${t.percentage ? `+${t.percentage.toFixed(1)}%` : ''}</div>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- Step 1: Market Pulse -->
    <div class="step">
      <div class="step-header">
        <span class="step-num">Step 1</span>
        <span class="step-title">Market Pulse</span>
        ${mp.gate ? `<span class="step-gate ${mp.gate.canProceed ? 'gate-pass' : 'gate-fail'}">${mp.gate.canProceed ? 'PASS' : 'FAIL'} ${formatConfidence(mp.gate.confidence)}</span>` : ''}
      </div>
      <div class="grid grid-4">
        <div class="metric">
          <div class="metric-label">Fear & Greed</div>
          <div class="metric-value ${mp.fearGreedIndex >= 55 ? 'text-green' : mp.fearGreedIndex <= 45 ? 'text-red' : ''}">${mp.fearGreedIndex}</div>
          <div class="metric-sub">${mp.fearGreedLabel}</div>
        </div>
        <div class="metric">
          <div class="metric-label">BTC Dominance</div>
          <div class="metric-value">${mp.btcDominance?.toFixed(1)}%</div>
        </div>
        <div class="metric">
          <div class="metric-label">Trend</div>
          <div class="metric-value ${mp.trend?.direction === 'bullish' ? 'text-green' : mp.trend?.direction === 'bearish' ? 'text-red' : ''}">${(mp.trend?.direction || 'neutral').toUpperCase()}</div>
          <div class="metric-sub">Strength: ${((mp.trend?.strength || 0) * 100).toFixed(0)}%</div>
        </div>
        <div class="metric">
          <div class="metric-label">Regime</div>
          <div class="metric-value" style="font-size: 9px;">${mp.marketRegime || 'Normal'}</div>
        </div>
      </div>
      ${mp.gate ? `<div class="summary-box"><div class="summary-text">${mp.gate.reason}</div></div>` : ''}
    </div>

    <!-- Step 2: Asset Scanner -->
    <div class="step">
      <div class="step-header">
        <span class="step-num">Step 2</span>
        <span class="step-title">Asset Scanner</span>
        ${data.assetScan.gate ? `<span class="step-gate ${data.assetScan.gate.canProceed ? 'gate-pass' : 'gate-fail'}">${data.assetScan.gate.canProceed ? 'PASS' : 'FAIL'} ${formatConfidence(data.assetScan.gate.confidence)}</span>` : ''}
      </div>
      <div class="grid grid-4">
        <div class="metric">
          <div class="metric-label">Price</div>
          <div class="metric-value">${formatPrice(data.assetScan.currentPrice)}</div>
          <div class="metric-sub ${data.assetScan.priceChange24h >= 0 ? 'text-green' : 'text-red'}">${formatPercent(data.assetScan.priceChange24h)}</div>
        </div>
        <div class="metric">
          <div class="metric-label">Volume 24h</div>
          <div class="metric-value">${formatVolume(data.assetScan.volume24h)}</div>
        </div>
        <div class="metric">
          <div class="metric-label">RSI</div>
          <div class="metric-value ${(data.assetScan.indicators?.rsi || 50) >= 70 ? 'text-red' : (data.assetScan.indicators?.rsi || 50) <= 30 ? 'text-green' : ''}">${data.assetScan.indicators?.rsi?.toFixed(1) || '-'}</div>
        </div>
        <div class="metric">
          <div class="metric-label">Direction</div>
          <div class="metric-value ${data.assetScan.direction === 'long' ? 'text-green' : data.assetScan.direction === 'short' ? 'text-red' : ''}">${(data.assetScan.direction || 'neutral').toUpperCase()}</div>
          <div class="metric-sub">${data.assetScan.directionConfidence ? `${((data.assetScan.directionConfidence) * 100).toFixed(0)}% conf` : ''}</div>
        </div>
      </div>
      ${data.assetScan.levels ? `
      <div style="margin-top: 6px; display: flex; gap: 12px;">
        <div style="flex: 1;"><span style="font-size: 7px; color: #666;">Support:</span> <span style="font-size: 8px; color: #16a34a;">${data.assetScan.levels.support.slice(0, 2).map(s => formatPrice(s)).join(', ')}</span></div>
        <div style="flex: 1;"><span style="font-size: 7px; color: #666;">Resistance:</span> <span style="font-size: 8px; color: #dc2626;">${data.assetScan.levels.resistance.slice(0, 2).map(r => formatPrice(r)).join(', ')}</span></div>
      </div>
      ` : ''}
    </div>

    <!-- Step 3: Safety Check -->
    <div class="step">
      <div class="step-header">
        <span class="step-num">Step 3</span>
        <span class="step-title">Safety Check</span>
        ${data.safetyCheck.gate ? `<span class="step-gate ${data.safetyCheck.gate.canProceed ? 'gate-pass' : 'gate-fail'}">${data.safetyCheck.gate.canProceed ? 'PASS' : 'FAIL'} ${formatConfidence(data.safetyCheck.gate.confidence)}</span>` : ''}
      </div>
      <div class="grid grid-4">
        <div class="metric">
          <div class="metric-label">Risk Level</div>
          <div class="metric-value ${data.safetyCheck.riskLevel === 'low' ? 'text-green' : data.safetyCheck.riskLevel === 'high' ? 'text-red' : 'text-amber'}">${(data.safetyCheck.riskLevel || 'medium').toUpperCase()}</div>
        </div>
        <div class="metric">
          <div class="metric-label">Manipulation</div>
          <div class="metric-value ${data.safetyCheck.manipulation.pumpDumpRisk === 'low' ? 'text-green' : 'text-red'}">${(data.safetyCheck.manipulation.pumpDumpRisk || 'N/A').toUpperCase()}</div>
        </div>
        <div class="metric">
          <div class="metric-label">Whale Bias</div>
          <div class="metric-value ${data.safetyCheck.whaleActivity.bias === 'accumulation' ? 'text-green' : data.safetyCheck.whaleActivity.bias === 'distribution' ? 'text-red' : ''}">${(data.safetyCheck.whaleActivity.bias || 'neutral').toUpperCase()}</div>
        </div>
        <div class="metric">
          <div class="metric-label">Smart Money</div>
          <div class="metric-value">${(data.safetyCheck.smartMoney?.positioning || 'neutral').toUpperCase()}</div>
        </div>
      </div>
    </div>

    <div class="footer">
      <span><span class="brand-trade">Trade</span><span class="brand-path">Path</span> | ${data.analysisId?.slice(-12) || 'N/A'}</span>
      <span>Page 1 of 4</span>
    </div>
  </div>
</body></html>`;
}

// ===========================================
// PAGE 2: Technical Indicators
// ===========================================

function generatePage2(data: AnalysisReportData): string {
  const ind = data.indicatorDetails;
  const as = data.assetScan;

  const renderIndicators = (title: string, indicators: Record<string, IndicatorDetailItem | undefined> | undefined) => {
    if (!indicators) return '';
    const items = Object.values(indicators).filter((i): i is IndicatorDetailItem => i !== undefined);
    if (items.length === 0) return '';

    return `
      <div style="margin-bottom: 10px;">
        <div style="font-size: 8px; font-weight: 600; color: #333; margin-bottom: 4px; padding-bottom: 2px; border-bottom: 1px solid #eee;">${title} (${items.length})</div>
        ${items.map(i => `
          <div class="indicator-row">
            <span class="indicator-name">${i.name}${i.isLeadingIndicator ? '<span class="leading-tag">LEADING</span>' : ''}</span>
            <span class="indicator-value">${typeof i.value === 'number' ? (i.value >= 1000 ? i.value.toLocaleString('en-US', { maximumFractionDigits: 0 }) : i.value >= 1 ? i.value.toFixed(2) : i.value.toFixed(4)) : (i.value || '-')}</span>
            <span class="indicator-signal ${i.signal === 'bullish' ? 'text-green' : i.signal === 'bearish' ? 'text-red' : 'text-gray'}">${i.signal.toUpperCase()}</span>
          </div>
        `).join('')}
      </div>
    `;
  };

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${styles}</style></head><body>
  <div class="page">
    <div class="header">
      <div class="header-left">
        <div class="brand"><span class="brand-trade">Trade</span><span class="brand-path">Path</span></div>
      </div>
      <div class="header-right">
        <span class="symbol-large">${data.symbol}/USDT</span>
        <div class="meta-line">Technical Indicators Analysis</div>
      </div>
    </div>

    ${ind ? `
    <!-- Indicator Summary -->
    <div class="step">
      <div class="grid grid-4">
        <div class="metric">
          <div class="metric-label">Total Indicators</div>
          <div class="metric-value">${ind.summary?.totalIndicatorsUsed || 0}</div>
        </div>
        <div class="metric">
          <div class="metric-label">Bullish</div>
          <div class="metric-value text-green">${ind.summary?.bullishIndicators || 0}</div>
        </div>
        <div class="metric">
          <div class="metric-label">Bearish</div>
          <div class="metric-value text-red">${ind.summary?.bearishIndicators || 0}</div>
        </div>
        <div class="metric">
          <div class="metric-label">Signal</div>
          <div class="metric-value ${ind.summary?.overallSignal === 'bullish' ? 'text-green' : ind.summary?.overallSignal === 'bearish' ? 'text-red' : ''}">${(ind.summary?.overallSignal || 'neutral').toUpperCase()}</div>
          <div class="metric-sub">${ind.summary?.signalConfidence || 0}% confidence</div>
        </div>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
      <div>
        ${renderIndicators('Trend Indicators', ind.trend)}
        ${renderIndicators('Momentum Indicators', ind.momentum)}
      </div>
      <div>
        ${renderIndicators('Volatility Indicators', ind.volatility)}
        ${renderIndicators('Volume Indicators', ind.volume)}
        ${renderIndicators('Advanced Indicators', ind.advanced)}
      </div>
    </div>

    ${ind.divergences && ind.divergences.length > 0 ? `
    <div class="warning-box">
      <div style="font-size: 8px; font-weight: 600; color: #92400e; margin-bottom: 4px;">Divergence Alerts</div>
      ${ind.divergences.map(d => `
        <div style="font-size: 7px; color: #92400e; padding: 2px 0;">${d.type.toUpperCase()} ${d.indicator}: ${d.description} (${d.reliability})</div>
      `).join('')}
    </div>
    ` : ''}
    ` : `
    <!-- Fallback Basic Indicators -->
    <div class="step">
      <div class="section-title">Basic Indicators</div>
      <div class="grid grid-3">
        <div class="metric">
          <div class="metric-label">RSI (14)</div>
          <div class="metric-value">${as.indicators?.rsi?.toFixed(1) || '-'}</div>
        </div>
        <div class="metric">
          <div class="metric-label">MACD Histogram</div>
          <div class="metric-value">${as.indicators?.macd?.histogram?.toFixed(4) || '-'}</div>
        </div>
        <div class="metric">
          <div class="metric-label">ATR</div>
          <div class="metric-value">${as.indicators?.atr?.toFixed(4) || '-'}</div>
        </div>
      </div>
      <div class="summary-box">
        <div class="summary-text">Full indicator details not available. Generate new analysis for comprehensive data.</div>
      </div>
    </div>
    `}

    <div class="footer">
      <span><span class="brand-trade">Trade</span><span class="brand-path">Path</span> | ${data.analysisId?.slice(-12) || 'N/A'}</span>
      <span>Page 2 of 4</span>
    </div>
  </div>
</body></html>`;
}

// ===========================================
// PAGE 3: Timing & Trade Plan
// ===========================================

function generatePage3(data: AnalysisReportData): string {
  const tm = data.timing;
  const tp = data.tradePlan;
  const tc = data.trapCheck;
  const isLong = tp.direction === 'long';

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${styles}</style></head><body>
  <div class="page">
    <div class="header">
      <div class="header-left">
        <div class="brand"><span class="brand-trade">Trade</span><span class="brand-path">Path</span></div>
      </div>
      <div class="header-right">
        <span class="symbol-large">${data.symbol}/USDT</span>
        <div class="meta-line">Execution Plan</div>
      </div>
    </div>

    <!-- Step 4: Timing -->
    <div class="step">
      <div class="step-header">
        <span class="step-num">Step 4</span>
        <span class="step-title">Timing Analysis</span>
        ${tm.gate ? `<span class="step-gate ${tm.gate.canProceed ? 'gate-pass' : 'gate-fail'}">${tm.gate.canProceed ? 'PASS' : 'FAIL'} ${formatConfidence(tm.gate.confidence)}</span>` : ''}
      </div>

      <div class="metric" style="margin-bottom: 8px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div class="metric-value ${tm.tradeNow ? 'text-green' : 'text-amber'}">${tm.tradeNow ? 'TRADE NOW' : 'WAIT'}</div>
            <div class="metric-sub">${tm.reason}</div>
          </div>
          ${tm.gate?.urgency ? `<div style="font-size: 8px; font-weight: 600; color: ${tm.gate.urgency === 'immediate' ? '#dc2626' : '#d97706'};">Urgency: ${tm.gate.urgency.toUpperCase()}</div>` : ''}
        </div>
      </div>

      ${tm.conditions && tm.conditions.length > 0 ? `
      <div style="margin-bottom: 8px;">
        <div style="font-size: 7px; color: #666; margin-bottom: 4px;">Entry Conditions:</div>
        ${tm.conditions.map(c => `
          <div class="condition-row">
            <div class="condition-status ${c.met ? 'condition-met' : 'condition-not'}">${c.met ? 'Y' : 'N'}</div>
            <span class="condition-name">${c.name}</span>
          </div>
        `).join('')}
      </div>
      ` : ''}

      ${tm.entryZones && tm.entryZones.length > 0 ? `
      <div style="font-size: 7px; color: #666; margin-bottom: 4px;">Entry Zones:</div>
      <div class="grid grid-3">
        ${tm.entryZones.slice(0, 3).map((ez, i) => `
          <div class="metric">
            <div class="metric-label">Zone ${i + 1}</div>
            <div class="metric-value" style="font-size: 9px;">${formatPrice(ez.priceLow)} - ${formatPrice(ez.priceHigh)}</div>
            <div class="metric-sub">Prob: ${(ez.probability * 100).toFixed(0)}%</div>
          </div>
        `).join('')}
      </div>
      ` : ''}
    </div>

    <!-- Step 5: Trade Plan -->
    <div class="step">
      <div class="step-header">
        <span class="step-num">Step 5</span>
        <span class="step-title">Trade Plan</span>
        ${tp.gate ? `<span class="step-gate ${tp.gate.canProceed ? 'gate-pass' : 'gate-fail'}">${tp.gate.canProceed ? 'PASS' : 'FAIL'} ${formatConfidence(tp.gate.confidence)}</span>` : ''}
      </div>

      <div class="grid grid-2" style="margin-bottom: 8px;">
        <div class="metric">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div class="metric-label">Direction</div>
              <div class="metric-value ${isLong ? 'text-green' : 'text-red'}">${isLong ? 'LONG' : 'SHORT'}</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 7px; color: #666;">R:R</div>
              <div style="font-size: 12px; font-weight: 700;">${tp.riskReward?.toFixed(2) || '-'}:1</div>
            </div>
          </div>
        </div>
        <div class="metric">
          <div class="metric-label">Win Rate Estimate</div>
          <div class="metric-value">${tp.winRateEstimate || 50}%</div>
          <div class="metric-sub">Position Size: ${tp.positionSizePercent?.toFixed(1) || '-'}%</div>
        </div>
      </div>

      <table class="table">
        <tr><th>Level</th><th>Price</th><th>Change</th><th>Note</th></tr>
        <tr>
          <td>Entry</td>
          <td style="font-weight: 600;">${formatPrice(tp.averageEntry)}</td>
          <td>-</td>
          <td style="font-size: 7px; color: #666;">${tp.entries?.length ? `${tp.entries.length} zones` : ''}</td>
        </tr>
        <tr>
          <td>Stop Loss</td>
          <td style="font-weight: 600; color: #dc2626;">${formatPrice(tp.stopLoss?.price)}</td>
          <td class="text-red">${tp.stopLoss?.percentage ? `-${tp.stopLoss.percentage.toFixed(2)}%` : ''}</td>
          <td style="font-size: 7px; color: #666;">${tp.stopLoss?.reason?.slice(0, 30) || ''}</td>
        </tr>
        ${(tp.takeProfits || []).slice(0, 3).map((t, i) => `
          <tr>
            <td>Target ${i + 1}</td>
            <td style="font-weight: 600; color: #16a34a;">${formatPrice(t.price)}</td>
            <td class="text-green">${t.percentage ? `+${t.percentage.toFixed(1)}%` : ''}</td>
            <td style="font-size: 7px; color: #666;">${t.reason?.slice(0, 30) || ''}</td>
          </tr>
        `).join('')}
      </table>
    </div>

    <!-- Step 6: Trap Check -->
    ${tc ? `
    <div class="step">
      <div class="step-header">
        <span class="step-num">Step 6</span>
        <span class="step-title">Trap Check</span>
        ${tc.gate ? `<span class="step-gate ${tc.gate.canProceed ? 'gate-pass' : 'gate-fail'}">${tc.gate.canProceed ? 'PASS' : 'FAIL'} ${formatConfidence(tc.gate.confidence)}</span>` : ''}
      </div>
      <div class="grid grid-4">
        <div class="metric">
          <div class="metric-label">Bull Trap</div>
          <div class="metric-value ${tc.traps.bullTrap ? 'text-red' : 'text-green'}">${tc.traps.bullTrap ? 'DETECTED' : 'CLEAR'}</div>
        </div>
        <div class="metric">
          <div class="metric-label">Bear Trap</div>
          <div class="metric-value ${tc.traps.bearTrap ? 'text-red' : 'text-green'}">${tc.traps.bearTrap ? 'DETECTED' : 'CLEAR'}</div>
        </div>
        <div class="metric">
          <div class="metric-label">Fakeout Risk</div>
          <div class="metric-value ${tc.traps.fakeoutRisk === 'high' ? 'text-red' : tc.traps.fakeoutRisk === 'medium' ? 'text-amber' : 'text-green'}">${(tc.traps.fakeoutRisk || 'low').toUpperCase()}</div>
        </div>
        <div class="metric">
          <div class="metric-label">Liquidity Grab</div>
          <div class="metric-value ${tc.traps.liquidityGrab?.detected ? 'text-amber' : 'text-green'}">${tc.traps.liquidityGrab?.detected ? 'POSSIBLE' : 'UNLIKELY'}</div>
        </div>
      </div>
      ${tc.proTip ? `<div class="summary-box"><div class="summary-text"><strong>Pro Tip:</strong> ${tc.proTip}</div></div>` : ''}
    </div>
    ` : ''}

    <div class="footer">
      <span><span class="brand-trade">Trade</span><span class="brand-path">Path</span> | ${data.analysisId?.slice(-12) || 'N/A'}</span>
      <span>Page 3 of 4</span>
    </div>
  </div>
</body></html>`;
}

// ===========================================
// PAGE 4: Verdict & AI Expert
// ===========================================

function generatePage4(data: AnalysisReportData): string {
  const v = data.verdict;
  const isLong = data.tradePlan?.direction === 'long';
  const score = Math.round((v.overallScore || 0) * 10);

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${styles}</style></head><body>
  <div class="page">
    <div class="header">
      <div class="header-left">
        <div class="brand"><span class="brand-trade">Trade</span><span class="brand-path">Path</span></div>
      </div>
      <div class="header-right">
        <span class="symbol-large">${data.symbol}/USDT</span>
        <div class="meta-line">Final Verdict & AI Expert</div>
      </div>
    </div>

    <!-- Final Verdict -->
    <div class="step">
      <div class="step-header">
        <span class="step-num">Step 7</span>
        <span class="step-title">Final Verdict</span>
      </div>

      <div class="verdict-box">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div class="verdict-action">${v.action || 'ANALYSIS COMPLETE'}</div>
            <div style="font-size: 9px; color: #666; margin-top: 4px;">${isLong ? 'Bullish setup - Long position' : 'Bearish setup - Short position'}</div>
          </div>
          <div style="text-align: center; padding: 10px 20px; background: ${isLong ? '#dcfce7' : '#fee2e2'}; border-radius: 8px;">
            <div class="verdict-score ${isLong ? 'text-green' : 'text-red'}">${score}</div>
            <div style="font-size: 7px; color: #666;">/ 100</div>
          </div>
        </div>
      </div>

      ${v.componentScores ? `
      <div style="margin-bottom: 12px;">
        <div style="font-size: 8px; font-weight: 600; margin-bottom: 6px;">Component Scores</div>
        <div class="grid grid-4">
          ${Object.entries(v.componentScores).slice(0, 8).map(([key, val]) => `
            <div class="metric">
              <div class="metric-label">${key.replace(/([A-Z])/g, ' $1').trim()}</div>
              <div class="metric-value ${Number(val) >= 7 ? 'text-green' : Number(val) >= 5 ? 'text-amber' : 'text-red'}">${Number(val).toFixed(1)}</div>
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}

      ${v.confidenceFactors && v.confidenceFactors.length > 0 ? `
      <div style="margin-bottom: 12px;">
        <div style="font-size: 8px; font-weight: 600; margin-bottom: 6px;">Confidence Factors</div>
        ${v.confidenceFactors.slice(0, 6).map(cf => `
          <div class="condition-row">
            <div class="condition-status ${cf.positive ? 'condition-met' : 'condition-not'}">${cf.positive ? '+' : '-'}</div>
            <span class="condition-name">${cf.factor}</span>
          </div>
        `).join('')}
      </div>
      ` : ''}

      <div class="summary-box">
        <div class="summary-title">AI Summary</div>
        <div class="summary-text">${v.aiSummary || v.recommendation || 'Analysis complete. Review all sections for detailed insights.'}</div>
      </div>
    </div>

    <!-- AI Expert Comment -->
    ${data.aiExpertComment ? `
    <div class="step">
      <div class="section-title">AI Expert Risk Assessment</div>
      <div style="background: #f8f9fa; border: 1px solid #e0e0e0; border-radius: 4px; padding: 10px; font-size: 8px; line-height: 1.6; white-space: pre-wrap; color: #333;">${data.aiExpertComment}</div>
    </div>
    ` : ''}

    <!-- Disclaimer -->
    <div style="position: absolute; bottom: 40px; left: 28px; right: 28px;">
      <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 4px; padding: 8px;">
        <div style="font-size: 7px; font-weight: 600; color: #991b1b; margin-bottom: 4px;">RISK DISCLAIMER</div>
        <div style="font-size: 6px; color: #991b1b; line-height: 1.5;">
          This report is for educational and informational purposes only. It does not constitute financial advice. Cryptocurrency trading involves substantial risk of loss. Past performance is not indicative of future results. Always conduct your own research (DYOR) and consult with a qualified financial advisor before making investment decisions.
        </div>
      </div>
    </div>

    <div class="footer">
      <span>(c) ${new Date().getFullYear()} TradePath | ${data.analysisId?.slice(-12) || 'N/A'}</span>
      <span>Page 4 of 4</span>
    </div>
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
  if (captureChart && !data.chartImage) {
    const chartImage = await captureChartAsImage();
    if (chartImage) data.chartImage = chartImage;
  }

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();

  // Page 1: Overview & Market Pulse
  const canvas1 = await renderPageToCanvas(generatePage1(data));
  pdf.addImage(canvas1.toDataURL('image/png'), 'PNG', 0, 0, pdfWidth, pdfHeight);

  // Page 2: Technical Indicators
  pdf.addPage();
  const canvas2 = await renderPageToCanvas(generatePage2(data));
  pdf.addImage(canvas2.toDataURL('image/png'), 'PNG', 0, 0, pdfWidth, pdfHeight);

  // Page 3: Timing & Trade Plan
  pdf.addPage();
  const canvas3 = await renderPageToCanvas(generatePage3(data));
  pdf.addImage(canvas3.toDataURL('image/png'), 'PNG', 0, 0, pdfWidth, pdfHeight);

  // Page 4: Verdict & AI Expert
  pdf.addPage();
  const canvas4 = await renderPageToCanvas(generatePage4(data));
  pdf.addImage(canvas4.toDataURL('image/png'), 'PNG', 0, 0, pdfWidth, pdfHeight);

  const tradeTypeLabels: Record<string, string> = { scalping: 'Scalping', dayTrade: 'DayTrade', swing: 'Swing' };
  const tradeTypeLabel = data.tradeType ? tradeTypeLabels[data.tradeType] || '' : '';
  const fileName = `TradePath_${data.symbol}${tradeTypeLabel ? `_${tradeTypeLabel}` : ''}_${new Date().toISOString().split('T')[0]}.pdf`;

  const pdfBase64 = pdf.output('datauristring').split(',')[1];
  pdf.save(fileName);

  return { base64: pdfBase64, fileName };
}

export type { AnalysisReportData as ReportData };
