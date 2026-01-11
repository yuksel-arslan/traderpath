'use client';

// ===========================================
// TradePath Detailed Analysis Report - Comprehensive PDF
// Multi-Page Layout with Step Details, Indicator Charts, and Commentary
// ===========================================

import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

// ===========================================
// TYPE DEFINITIONS
// ===========================================

interface IndicatorChartData {
  name: string;
  category: 'trend' | 'momentum' | 'volatility' | 'volume' | 'advanced';
  values: number[];
  timestamps: number[];
  currentValue: number;
  signal: 'bullish' | 'bearish' | 'neutral';
  signalStrength: number;
  interpretation: string;
  chartColor: string;
  secondaryValues?: number[];
  secondaryLabel?: string;
  referenceLines?: { value: number; label: string; color: string }[];
  metadata?: Record<string, unknown>;
}

interface DetailedStepData {
  stepNumber: number;
  stepName: string;
  stepDescription: string;
  input: {
    timeframes: {
      timeframe: string;
      candleCount: number;
      priority: 'primary' | 'secondary' | 'confirmation';
      dataRange: { startTime: number; endTime: number };
    }[];
    indicators: {
      name: string;
      category: string;
      params: Record<string, number>;
      weight: number;
    }[];
    tradeType: 'scalping' | 'dayTrade' | 'swing';
    aiPromptFocus: string;
  };
  output: {
    indicators: Record<string, {
      value: number | null;
      signal: 'bullish' | 'bearish' | 'neutral';
      strength: number;
      metadata?: Record<string, unknown>;
    }>;
    signals: {
      bullish: string[];
      bearish: string[];
      neutral: string[];
    };
    stepScore: number;
    stepConfidence: number;
    keyFindings: string[];
  };
  commentary: {
    summary: string;
    signalInterpretation: string;
    riskFactors: string[];
    opportunities: string[];
    recommendation: string;
  };
  indicatorCharts: IndicatorChartData[];
}

export interface DetailedReportData {
  symbol: string;
  tradeType: 'scalping' | 'dayTrade' | 'swing';
  generatedAt: string;
  analysisId: string;
  marketContext: {
    btcPrice: number;
    btcDominance: number;
    fearGreedIndex: number;
    marketTrend: 'bullish' | 'bearish' | 'neutral';
  };
  assetInfo: {
    currentPrice: number;
    priceChange24h: number;
    volume24h: number;
  };
  steps: DetailedStepData[];
  tradePlanSummary: {
    direction: 'long' | 'short';
    entries: { price: number; percentage: number }[];
    averageEntry: number;
    stopLoss: { price: number; percentage: number; reason: string };
    takeProfits: { price: number; percentage: number; reason: string }[];
    riskReward: number;
    winRateEstimate: number;
  };
  verdict: {
    action: 'go' | 'conditional_go' | 'wait' | 'avoid';
    overallScore: number;
    overallConfidence: number;
    direction: 'long' | 'short' | null;
    reasons: string[];
  };
  chartImage?: string;
}

// ===========================================
// HELPERS
// ===========================================

function formatPrice(price: number): string {
  if (!price || isNaN(price)) return '-';
  if (price >= 10000) return `$${price.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  if (price >= 100) return `$${price.toFixed(2)}`;
  if (price >= 1) return `$${price.toFixed(4)}`;
  return `$${price.toFixed(6)}`;
}

function formatVolume(vol: number): string {
  if (!vol || isNaN(vol)) return '-';
  if (vol >= 1e9) return `$${(vol / 1e9).toFixed(2)}B`;
  if (vol >= 1e6) return `$${(vol / 1e6).toFixed(2)}M`;
  if (vol >= 1e3) return `$${(vol / 1e3).toFixed(2)}K`;
  return `$${vol.toFixed(2)}`;
}

function safeToFixed(value: number | undefined | null, decimals: number = 2): string {
  if (value === undefined || value === null || isNaN(value)) return '-';
  return value.toFixed(decimals);
}

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getTradeTypeName(type: string): string {
  return type === 'scalping' ? 'Scalping' : type === 'dayTrade' ? 'Day Trade' : 'Swing Trade';
}

function getSignalBadge(signal: string): string {
  const color = signal === 'bullish' ? '#16a34a' : signal === 'bearish' ? '#dc2626' : '#d97706';
  const bg = signal === 'bullish' ? '#dcfce7' : signal === 'bearish' ? '#fee2e2' : '#fef3c7';
  return `<span style="background: ${bg}; color: ${color}; padding: 2px 6px; border-radius: 4px; font-size: 8px; font-weight: 600;">${signal.toUpperCase()}</span>`;
}

function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    trend: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>',
    momentum: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>',
    volatility: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
    volume: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
    advanced: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
  };
  return icons[category] || icons.trend;
}

// ===========================================
// SVG LINE CHART GENERATOR
// ===========================================

function generateLineChart(
  chartData: IndicatorChartData,
  width: number = 400,
  height: number = 120
): string {
  const values = chartData.values;
  if (values.length < 2) return '<div style="text-align: center; color: #94a3b8; font-size: 10px;">Insufficient data</div>';

  const padding = { top: 15, right: 40, bottom: 20, left: 10 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;

  // Generate path
  const points = values.map((v, i) => {
    const x = padding.left + (i / (values.length - 1)) * chartWidth;
    const y = padding.top + chartHeight - ((v - minVal) / range) * chartHeight;
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(' L ')}`;

  // Reference lines
  let refLinesHTML = '';
  if (chartData.referenceLines) {
    chartData.referenceLines.forEach(ref => {
      const y = padding.top + chartHeight - ((ref.value - minVal) / range) * chartHeight;
      if (y > padding.top && y < padding.top + chartHeight) {
        refLinesHTML += `
          <line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}"
                stroke="${ref.color}" stroke-width="1" stroke-dasharray="3,3" opacity="0.5"/>
          <text x="${width - padding.right + 3}" y="${y + 3}"
                fill="${ref.color}" font-size="7" font-weight="500">${ref.value}</text>
        `;
      }
    });
  }

  // Y-axis labels
  const yLabels = [maxVal, (maxVal + minVal) / 2, minVal].map((v, i) => {
    const y = padding.top + (i * chartHeight) / 2;
    return `<text x="${width - padding.right + 3}" y="${y + 3}" fill="#64748b" font-size="7">${safeToFixed(v, 1)}</text>`;
  }).join('');

  // Current value indicator
  const currentY = padding.top + chartHeight - ((chartData.currentValue - minVal) / range) * chartHeight;
  const currentX = width - padding.right;

  return `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" style="background: #f8fafc; border-radius: 4px;">
      <!-- Grid -->
      <line x1="${padding.left}" y1="${padding.top + chartHeight}" x2="${width - padding.right}" y2="${padding.top + chartHeight}"
            stroke="#e2e8f0" stroke-width="1"/>

      <!-- Reference lines -->
      ${refLinesHTML}

      <!-- Main line -->
      <path d="${pathD}" fill="none" stroke="${chartData.chartColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>

      <!-- Current value dot -->
      <circle cx="${currentX}" cy="${currentY}" r="4" fill="${chartData.chartColor}" stroke="white" stroke-width="1.5"/>

      <!-- Y-axis labels -->
      ${yLabels}
    </svg>
  `;
}

// ===========================================
// CSS STYLES
// ===========================================

const commonStyles = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 10px; color: #1e293b; background: #fff; line-height: 1.4; }
  .page { width: 595px; min-height: 842px; padding: 25px 30px; position: relative; page-break-after: always; }

  /* Header */
  .header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 2px solid #3b82f6; margin-bottom: 15px; }
  .logo { font-size: 16px; font-weight: bold; }
  .logo-red { color: #dc2626; }
  .logo-green { color: #16a34a; }
  .header-info { text-align: right; }
  .header-symbol { font-size: 14px; font-weight: bold; }
  .header-type { font-size: 9px; color: #64748b; }

  /* Section */
  .section { margin-bottom: 15px; }
  .section-title { font-size: 12px; font-weight: bold; color: #1e293b; margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; gap: 8px; }
  .section-title svg { flex-shrink: 0; }

  /* Step Box */
  .step-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 12px; }
  .step-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
  .step-title { font-size: 11px; font-weight: bold; color: #1e293b; }
  .step-desc { font-size: 8px; color: #64748b; margin-top: 2px; }
  .step-score { font-size: 18px; font-weight: bold; color: #3b82f6; }
  .step-score-label { font-size: 7px; color: #64748b; }

  /* Grid */
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }

  /* Cards */
  .card { background: #fff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; }
  .card-title { font-size: 9px; font-weight: 600; color: #64748b; text-transform: uppercase; margin-bottom: 6px; }
  .card-content { font-size: 10px; color: #1e293b; }

  /* Indicator Row */
  .indicator-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid #f1f5f9; }
  .indicator-row:last-child { border-bottom: none; }
  .indicator-name { font-size: 9px; font-weight: 500; display: flex; align-items: center; gap: 4px; }
  .indicator-value { font-size: 9px; font-weight: 600; }

  /* Signal List */
  .signal-list { font-size: 8px; line-height: 1.6; }
  .signal-item { padding: 3px 0; }
  .signal-bullish { color: #16a34a; }
  .signal-bearish { color: #dc2626; }
  .signal-neutral { color: #d97706; }

  /* Commentary */
  .commentary-box { background: linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%); border: 1px solid #bfdbfe; border-radius: 6px; padding: 10px; }
  .commentary-summary { font-size: 10px; font-weight: 500; margin-bottom: 6px; }
  .commentary-detail { font-size: 8px; color: #475569; margin-bottom: 4px; }
  .commentary-list { font-size: 8px; color: #475569; margin-left: 10px; }
  .commentary-recommendation { font-size: 9px; font-weight: 600; color: #1e40af; margin-top: 6px; padding-top: 6px; border-top: 1px solid #bfdbfe; }

  /* Chart Container */
  .chart-container { background: #fff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px; margin-bottom: 10px; }
  .chart-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
  .chart-title { font-size: 9px; font-weight: 600; display: flex; align-items: center; gap: 4px; }
  .chart-interpretation { font-size: 8px; color: #64748b; margin-top: 4px; padding: 6px; background: #f8fafc; border-radius: 4px; }

  /* Input Data */
  .input-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .input-item { font-size: 8px; padding: 4px 6px; background: #f1f5f9; border-radius: 4px; }
  .input-label { color: #64748b; }
  .input-value { color: #1e293b; font-weight: 500; }

  /* Trade Plan */
  .trade-plan { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
  .trade-item { background: #fff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px; text-align: center; }
  .trade-label { font-size: 7px; color: #64748b; text-transform: uppercase; margin-bottom: 3px; }
  .trade-value { font-size: 11px; font-weight: bold; }
  .trade-value.entry { color: #3b82f6; }
  .trade-value.stop { color: #dc2626; }
  .trade-value.target { color: #16a34a; }

  /* Verdict */
  .verdict-box { background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; border-radius: 8px; padding: 15px; text-align: center; }
  .verdict-action { font-size: 20px; font-weight: bold; margin-bottom: 5px; }
  .verdict-score { font-size: 12px; opacity: 0.9; }
  .verdict-direction { display: inline-block; margin-top: 8px; padding: 4px 12px; background: rgba(255,255,255,0.2); border-radius: 4px; font-size: 10px; font-weight: 600; }

  /* Footer */
  .page-footer { position: absolute; bottom: 15px; left: 30px; right: 30px; display: flex; justify-content: space-between; align-items: center; font-size: 7px; color: #94a3b8; }
  .page-number { font-weight: 500; }
`;

// ===========================================
// PAGE GENERATORS
// ===========================================

function generateCoverPage(data: DetailedReportData): string {
  const isLong = data.tradePlanSummary.direction === 'long';
  const actionColors: Record<string, string> = {
    go: '#16a34a',
    conditional_go: '#d97706',
    wait: '#6b7280',
    avoid: '#dc2626',
  };
  const actionColor = actionColors[data.verdict.action] || '#6b7280';

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>${commonStyles}</style></head>
<body>
  <div class="page">
    <div class="header">
      <div>
        <div class="logo"><span class="logo-red">Trade</span><span class="logo-green">Path</span></div>
        <div style="font-size: 8px; color: #64748b;">Detailed Analysis Report</div>
      </div>
      <div class="header-info">
        <div class="header-symbol">${data.symbol}/USDT</div>
        <div class="header-type">${getTradeTypeName(data.tradeType)} Analysis</div>
        <div style="font-size: 8px; color: #94a3b8;">${data.generatedAt}</div>
      </div>
    </div>

    <!-- Verdict Banner -->
    <div class="verdict-box" style="background: linear-gradient(135deg, ${actionColor} 0%, ${actionColor}dd 100%);">
      <div class="verdict-action">${data.verdict.action.replace('_', ' ').toUpperCase()}</div>
      <div class="verdict-score">Overall Score: ${safeToFixed(data.verdict.overallScore, 1)}/10 | Confidence: ${data.verdict.overallConfidence ?? 0}%</div>
      ${data.verdict.direction ? `<div class="verdict-direction">${isLong ? '▲ LONG' : '▼ SHORT'}</div>` : ''}
    </div>

    <!-- Market Context & Asset Info -->
    <div class="section" style="margin-top: 15px;">
      <div class="section-title">Market & Asset Overview</div>
      <div class="grid-2">
        <div class="card">
          <div class="card-title">Asset Information</div>
          <div class="indicator-row">
            <span class="indicator-name">Current Price</span>
            <span class="indicator-value">${formatPrice(data.assetInfo.currentPrice)}</span>
          </div>
          <div class="indicator-row">
            <span class="indicator-name">24h Change</span>
            <span class="indicator-value" style="color: ${(data.assetInfo.priceChange24h ?? 0) >= 0 ? '#16a34a' : '#dc2626'}">
              ${(data.assetInfo.priceChange24h ?? 0) >= 0 ? '+' : ''}${safeToFixed(data.assetInfo.priceChange24h, 2)}%
            </span>
          </div>
          <div class="indicator-row">
            <span class="indicator-name">24h Volume</span>
            <span class="indicator-value">${formatVolume(data.assetInfo.volume24h)}</span>
          </div>
        </div>
        <div class="card">
          <div class="card-title">Market Context</div>
          <div class="indicator-row">
            <span class="indicator-name">Fear & Greed</span>
            <span class="indicator-value">${data.marketContext.fearGreedIndex}</span>
          </div>
          <div class="indicator-row">
            <span class="indicator-name">BTC Dominance</span>
            <span class="indicator-value">${safeToFixed(data.marketContext.btcDominance, 1)}%</span>
          </div>
          <div class="indicator-row">
            <span class="indicator-name">Market Trend</span>
            <span>${getSignalBadge(data.marketContext.marketTrend)}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Trade Plan Summary -->
    <div class="section">
      <div class="section-title">Trade Plan Summary</div>
      <div class="trade-plan">
        <div class="trade-item">
          <div class="trade-label">Entry</div>
          <div class="trade-value entry">${formatPrice(data.tradePlanSummary.averageEntry)}</div>
        </div>
        <div class="trade-item">
          <div class="trade-label">Stop Loss</div>
          <div class="trade-value stop">${formatPrice(data.tradePlanSummary.stopLoss.price)}</div>
          <div style="font-size: 7px; color: #dc2626;">-${data.tradePlanSummary.stopLoss.percentage}%</div>
        </div>
        ${data.tradePlanSummary.takeProfits.slice(0, 2).map((tp, i) => `
        <div class="trade-item">
          <div class="trade-label">TP${i + 1}</div>
          <div class="trade-value target">${formatPrice(tp.price)}</div>
          <div style="font-size: 7px; color: #16a34a;">+${tp.percentage}%</div>
        </div>
        `).join('')}
      </div>
      <div style="margin-top: 8px; display: flex; justify-content: center; gap: 20px; font-size: 9px; color: #64748b;">
        <span>R:R <strong style="color: #1e293b;">${safeToFixed(data.tradePlanSummary.riskReward, 1)}:1</strong></span>
        <span>Win Rate <strong style="color: #1e293b;">${data.tradePlanSummary.winRateEstimate}%</strong></span>
      </div>
    </div>

    <!-- 7-Step Overview -->
    <div class="section">
      <div class="section-title">7-Step Analysis Overview</div>
      <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px;">
        ${data.steps.map(step => `
          <div style="text-align: center; padding: 8px; background: ${step.output.stepScore >= 6 ? '#dcfce7' : step.output.stepScore >= 4 ? '#fef3c7' : '#fee2e2'}; border-radius: 6px;">
            <div style="font-size: 14px; font-weight: bold; color: ${step.output.stepScore >= 6 ? '#16a34a' : step.output.stepScore >= 4 ? '#d97706' : '#dc2626'};">${safeToFixed(step.output.stepScore, 1)}</div>
            <div style="font-size: 7px; color: #64748b; margin-top: 2px;">Step ${step.stepNumber}</div>
            <div style="font-size: 6px; color: #94a3b8;">${step.stepName.split(' ')[0]}</div>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- Key Reasons -->
    <div class="section">
      <div class="section-title">Analysis Summary</div>
      <div class="signal-list">
        ${data.verdict.reasons.map(r => `
          <div class="signal-item ${r.includes('Bullish') ? 'signal-bullish' : r.includes('Bearish') ? 'signal-bearish' : ''}">${r}</div>
        `).join('')}
      </div>
    </div>

    <div class="page-footer">
      <span><span class="logo-red">Trade</span><span class="logo-green">Path</span> Detailed Analysis • ${data.analysisId.slice(-12)}</span>
      <span class="page-number">Page 1</span>
    </div>
  </div>
</body></html>`;
}

function generateStepDetailPage(data: DetailedReportData, step: DetailedStepData, pageNumber: number): string {
  const scoreColor = step.output.stepScore >= 6 ? '#16a34a' : step.output.stepScore >= 4 ? '#d97706' : '#dc2626';

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>${commonStyles}</style></head>
<body>
  <div class="page">
    <div class="header">
      <div>
        <div class="logo"><span class="logo-red">Trade</span><span class="logo-green">Path</span></div>
        <div style="font-size: 8px; color: #64748b;">${data.symbol}/USDT • Detailed Analysis</div>
      </div>
      <div class="header-info">
        <div style="font-size: 11px; font-weight: bold;">Step ${step.stepNumber}: ${step.stepName}</div>
        <div style="font-size: 8px; color: #64748b;">${step.stepDescription}</div>
      </div>
    </div>

    <!-- Step Score Banner -->
    <div class="step-box" style="background: linear-gradient(135deg, ${scoreColor}15 0%, ${scoreColor}05 100%); border-color: ${scoreColor}40;">
      <div class="step-header">
        <div>
          <div class="step-title" style="color: ${scoreColor};">Step ${step.stepNumber}: ${step.stepName}</div>
          <div class="step-desc">${step.stepDescription}</div>
        </div>
        <div style="text-align: right;">
          <div class="step-score" style="color: ${scoreColor};">${safeToFixed(step.output.stepScore, 1)}</div>
          <div class="step-score-label">Score / 10</div>
        </div>
      </div>
    </div>

    <div class="grid-2">
      <!-- INPUT Section -->
      <div class="section">
        <div class="section-title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Input Data
        </div>
        <div class="card">
          <div class="card-title">Timeframes Used</div>
          <div class="input-grid">
            ${step.input.timeframes.map(tf => `
              <div class="input-item">
                <span class="input-label">${tf.priority}: </span>
                <span class="input-value">${tf.timeframe} (${tf.candleCount} candles)</span>
              </div>
            `).join('')}
          </div>
          <div class="card-title" style="margin-top: 10px;">Indicators (${step.input.indicators.length})</div>
          <div style="font-size: 8px; color: #475569;">
            ${step.input.indicators.map(ind => `<span style="display: inline-block; background: #f1f5f9; padding: 2px 6px; border-radius: 3px; margin: 2px;">${ind.name}</span>`).join('')}
          </div>
          <div class="card-title" style="margin-top: 10px;">Analysis Focus</div>
          <div style="font-size: 8px; color: #475569; font-style: italic;">"${step.input.aiPromptFocus}"</div>
        </div>
      </div>

      <!-- OUTPUT Section -->
      <div class="section">
        <div class="section-title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          Output Results
        </div>
        <div class="card">
          <div class="card-title">Signal Summary</div>
          <div style="display: flex; gap: 8px; margin-bottom: 8px;">
            <span style="background: #dcfce7; color: #16a34a; padding: 3px 8px; border-radius: 4px; font-size: 8px; font-weight: 600;">
              ${step.output.signals.bullish.length} Bullish
            </span>
            <span style="background: #fee2e2; color: #dc2626; padding: 3px 8px; border-radius: 4px; font-size: 8px; font-weight: 600;">
              ${step.output.signals.bearish.length} Bearish
            </span>
            <span style="background: #fef3c7; color: #d97706; padding: 3px 8px; border-radius: 4px; font-size: 8px; font-weight: 600;">
              ${step.output.signals.neutral.length} Neutral
            </span>
          </div>
          <div class="card-title">Key Indicators</div>
          ${Object.entries(step.output.indicators).slice(0, 5).map(([name, ind]) => `
            <div class="indicator-row">
              <span class="indicator-name">${name}</span>
              <span class="indicator-value">${ind.value?.toFixed(2) || 'N/A'} ${getSignalBadge(ind.signal)}</span>
            </div>
          `).join('')}
        </div>
      </div>
    </div>

    <!-- Key Findings -->
    <div class="section">
      <div class="section-title">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        Key Findings
      </div>
      <div class="signal-list" style="background: #fefce8; border: 1px solid #fef08a; border-radius: 6px; padding: 10px;">
        ${step.output.keyFindings.map(f => `<div class="signal-item">${f}</div>`).join('')}
      </div>
    </div>

    <!-- Commentary -->
    <div class="section">
      <div class="section-title">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        AI Commentary
      </div>
      <div class="commentary-box">
        <div class="commentary-summary">${step.commentary.summary}</div>
        <div class="commentary-detail"><strong>Signals:</strong> ${step.commentary.signalInterpretation}</div>
        ${step.commentary.riskFactors.length > 0 ? `
          <div class="commentary-detail"><strong>Risk Factors:</strong></div>
          <ul class="commentary-list">
            ${step.commentary.riskFactors.map(r => `<li>${r}</li>`).join('')}
          </ul>
        ` : ''}
        ${step.commentary.opportunities.length > 0 ? `
          <div class="commentary-detail"><strong>Opportunities:</strong></div>
          <ul class="commentary-list">
            ${step.commentary.opportunities.map(o => `<li>${o}</li>`).join('')}
          </ul>
        ` : ''}
        <div class="commentary-recommendation">💡 ${step.commentary.recommendation}</div>
      </div>
    </div>

    <div class="page-footer">
      <span><span class="logo-red">Trade</span><span class="logo-green">Path</span> • ${data.symbol}/USDT • Step ${step.stepNumber}</span>
      <span class="page-number">Page ${pageNumber}</span>
    </div>
  </div>
</body></html>`;
}

function generateIndicatorChartsPage(data: DetailedReportData, step: DetailedStepData, pageNumber: number): string {
  const charts = step.indicatorCharts.slice(0, 4); // Max 4 charts per page

  if (charts.length === 0) {
    return ''; // Skip if no charts
  }

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>${commonStyles}</style></head>
<body>
  <div class="page">
    <div class="header">
      <div>
        <div class="logo"><span class="logo-red">Trade</span><span class="logo-green">Path</span></div>
        <div style="font-size: 8px; color: #64748b;">${data.symbol}/USDT • Indicator Charts</div>
      </div>
      <div class="header-info">
        <div style="font-size: 11px; font-weight: bold;">Step ${step.stepNumber}: ${step.stepName}</div>
        <div style="font-size: 8px; color: #64748b;">Technical Indicator Visualization</div>
      </div>
    </div>

    <div class="section-title" style="margin-bottom: 12px;">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
      Indicator Charts & Analysis
    </div>

    ${charts.map(chart => `
      <div class="chart-container">
        <div class="chart-header">
          <div class="chart-title">
            ${getCategoryIcon(chart.category)}
            <span>${chart.name}</span>
            ${getSignalBadge(chart.signal)}
          </div>
          <div style="font-size: 10px; font-weight: bold; color: ${chart.chartColor};">
            ${safeToFixed(chart.currentValue, 2)}
          </div>
        </div>
        ${generateLineChart(chart, 520, 100)}
        <div class="chart-interpretation">${chart.interpretation}</div>
      </div>
    `).join('')}

    <div class="page-footer">
      <span><span class="logo-red">Trade</span><span class="logo-green">Path</span> • Indicator Charts</span>
      <span class="page-number">Page ${pageNumber}</span>
    </div>
  </div>
</body></html>`;
}

// ===========================================
// RENDER & EXPORT
// ===========================================

async function renderPageToCanvas(html: string): Promise<HTMLCanvasElement | null> {
  if (!html || html.trim() === '') return null;

  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position: fixed; left: -9999px; top: 0; width: 595px; height: 842px; border: none;';
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!iframeDoc) {
    document.body.removeChild(iframe);
    return null;
  }

  iframeDoc.open();
  iframeDoc.write(html);
  iframeDoc.close();

  await new Promise(resolve => setTimeout(resolve, 300));

  const page = iframeDoc.querySelector('.page') as HTMLElement;
  if (!page) {
    document.body.removeChild(iframe);
    return null;
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

export async function generateDetailedReport(data: DetailedReportData): Promise<{ base64: string; fileName: string } | void> {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();

  let pageNumber = 1;
  const pages: string[] = [];

  // Page 1: Cover
  pages.push(generateCoverPage(data));

  // Pages 2-8: Step Details (one page per step)
  for (const step of data.steps) {
    pageNumber++;
    pages.push(generateStepDetailPage(data, step, pageNumber));

    // Add indicator charts page if step has charts
    if (step.indicatorCharts.length > 0) {
      pageNumber++;
      const chartPage = generateIndicatorChartsPage(data, step, pageNumber);
      if (chartPage) pages.push(chartPage);
    }
  }

  // Render all pages
  let isFirst = true;
  for (const pageHtml of pages) {
    if (!pageHtml) continue;

    const canvas = await renderPageToCanvas(pageHtml);
    if (canvas) {
      if (!isFirst) pdf.addPage();
      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      isFirst = false;
    }
  }

  const fileName = `TradePath_${data.symbol}_Detailed_${new Date().toISOString().split('T')[0]}.pdf`;
  const pdfBase64 = pdf.output('datauristring').split(',')[1];

  pdf.save(fileName);

  return {
    base64: pdfBase64,
    fileName,
  };
}

// Types are already exported via interface declarations above
