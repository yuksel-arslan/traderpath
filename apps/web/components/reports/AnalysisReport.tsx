'use client';

// ===========================================
// TradePath Analysis Report - Professional PDF
// 3-Page Layout: Each section on separate page
// ===========================================

import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

// Data type
export interface AnalysisReportData {
  symbol: string;
  generatedAt: string;
  analysisId: string;
  chartImage?: string;
  marketPulse: {
    btcDominance: number;
    fearGreedIndex: number;
    fearGreedLabel: string;
    trend: { direction: string; strength: number };
  };
  assetScan: {
    currentPrice: number;
    priceChange24h: number;
    indicators: { rsi: number; macd: { histogram: number; signal?: string } };
  };
  safetyCheck: {
    riskLevel: string;
    manipulation: { pumpDumpRisk: string };
    whaleActivity: { bias: string };
  };
  timing: {
    tradeNow: boolean;
    reason: string;
  };
  tradePlan: {
    direction: string;
    averageEntry: number;
    stopLoss: { price: number; percentage?: number };
    takeProfits: Array<{ price: number; percentage?: number }>;
    riskReward: number;
    winRateEstimate?: number;
  };
  trapCheck?: {
    traps: { bullTrap: boolean; bearTrap: boolean; fakeoutRisk: string };
  };
  verdict: {
    action: string;
    overallScore: number;
    aiSummary?: string;
  };
  aiExpertComment?: string;
}

// Helpers
function formatPrice(price: number): string {
  if (!price || isNaN(price)) return '-';
  if (price >= 10000) return `$${price.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  if (price >= 100) return `$${price.toFixed(2)}`;
  if (price >= 1) return `$${price.toFixed(4)}`;
  return `$${price.toFixed(6)}`;
}

// Get coin icon URL from CDN
function getCoinIconUrl(symbol: string): string {
  const upperSymbol = symbol.toUpperCase();
  // Using cryptocurrency-icons CDN (reliable source)
  return `https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/${upperSymbol.toLowerCase()}.png`;
}

// Fallback icon as data URI
const FALLBACK_COIN_ICON = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ccircle cx="50" cy="50" r="45" fill="%236366f1"/%3E%3Ctext x="50" y="65" font-size="40" fill="white" text-anchor="middle" font-weight="bold"%3E%3F%3C/text%3E%3C/svg%3E';

// Parse AI Expert comments into separate experts
function parseExpertComments(comment: string): Array<{ name: string; content: string }> {
  if (!comment) return [];

  const experts: Array<{ name: string; content: string }> = [];
  const expertMatches = comment.match(/\[EXPERT:(\w+)\]([^[]*)/g);

  if (expertMatches) {
    expertMatches.forEach(match => {
      const nameMatch = match.match(/\[EXPERT:(\w+)\]/);
      if (nameMatch) {
        const name = nameMatch[1];
        const content = match.replace(/\[EXPERT:\w+\]/, '').trim();
        if (content) {
          experts.push({ name, content });
        }
      }
    });
  }

  if (experts.length === 0 && comment.length > 0) {
    const cleanComment = comment.replace(/\[PANEL_HEADER\][^-]*---/, '').trim();
    if (cleanComment) {
      experts.push({ name: 'NEXUS', content: cleanComment });
    }
  }

  return experts;
}

// Step icons as SVG paths (matching web app)
const stepIcons = {
  marketPulse: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
  assetScan: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
  safety: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  timing: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  tradePlan: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`,
  trapCheck: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  verdict: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`
};

// AI Expert icons
const expertIcons = {
  ARIA: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
  NEXUS: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="22" y1="12" x2="18" y2="12"/><line x1="6" y1="12" x2="2" y2="12"/><line x1="12" y1="6" x2="12" y2="2"/><line x1="12" y1="22" x2="12" y2="18"/></svg>`,
  ORACLE: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#a855f7" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
  SENTINEL: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f97316" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`
};

// Common CSS styles
const commonStyles = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #1e293b; background: #fff; line-height: 1.4; }
  .page { width: 595px; height: 842px; padding: 30px; position: relative; }

  /* Header - Only Page 1 */
  .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 15px; border-bottom: 2px solid #e2e8f0; margin-bottom: 20px; }
  .header-left { }
  .logo { font-size: 18px; font-weight: bold; }
  .logo-red { color: #dc2626; }
  .logo-green { color: #16a34a; }
  .motto { font-size: 8px; color: #64748b; margin-top: 2px; }
  .header-center { text-align: center; flex: 1; }
  .report-title { font-size: 16px; font-weight: bold; color: #1e293b; }
  .report-date { font-size: 8px; color: #94a3b8; margin-top: 3px; }
  .header-right { display: flex; align-items: flex-start; gap: 10px; }
  .coin-logo { width: 36px; height: 36px; border-radius: 50%; object-fit: contain; }
  .coin-info { text-align: left; }
  .coin-symbol { font-size: 12px; font-weight: bold; color: #1e293b; }
  .coin-badge { display: inline-flex; align-items: center; font-size: 9px; font-weight: bold; margin-top: 2px; }
  .badge-green { color: #16a34a; }
  .badge-red { color: #dc2626; }
  .coin-score { font-size: 8px; color: #64748b; margin-top: 2px; }

  /* Page Title for pages 2 & 3 */
  .page-title { font-size: 12px; font-weight: bold; color: #64748b; margin-bottom: 15px; padding-bottom: 8px; border-bottom: 1px solid #e2e8f0; }
  .page-title .symbol { color: #1e293b; font-size: 14px; }

  /* Section Title */
  .section-title { font-size: 13px; font-weight: bold; color: #1e293b; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 2px solid #3b82f6; }
  .section-title span { color: #64748b; font-weight: normal; font-size: 9px; }

  /* Page number */
  .page-number { position: absolute; bottom: 15px; right: 30px; font-size: 8px; color: #94a3b8; }
  .page-footer { position: absolute; bottom: 15px; left: 30px; font-size: 7px; color: #94a3b8; }

  /* 7-Step Analysis */
  .step-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; margin-bottom: 8px; }
  .step-header { display: flex; align-items: center; gap: 10px; margin-bottom: 4px; }
  .step-icon { width: 28px; height: 28px; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
  .step-icon svg { width: 18px; height: 18px; }
  .step-info { flex: 1; }
  .step-top { display: flex; align-items: center; gap: 8px; }
  .step-num { font-size: 10px; font-weight: 600; color: #64748b; }
  .step-title { font-weight: 600; font-size: 11px; color: #1e293b; }
  .step-subtitle { font-size: 8px; color: #94a3b8; margin-top: 1px; }
  .step-status { font-size: 9px; font-weight: 600; }
  .step-desc { font-size: 9px; color: #475569; line-height: 1.5; margin-top: 6px; padding-left: 38px; }

  /* Icon backgrounds */
  .icon-blue { background: #dbeafe; }
  .icon-purple { background: #f3e8ff; }
  .icon-green { background: #dcfce7; }
  .icon-amber { background: #fef3c7; }
  .icon-red { background: #fee2e2; }

  /* Trade Plan Section */
  .trade-plan-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; margin-bottom: 15px; }
  .trade-plan-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #e2e8f0; }
  .trade-plan-title { font-weight: bold; font-size: 12px; }
  .trade-plan-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  .trade-item { background: #fff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; text-align: center; }
  .trade-label { font-size: 8px; color: #64748b; text-transform: uppercase; margin-bottom: 4px; }
  .trade-value { font-size: 12px; font-weight: bold; }
  .text-blue { color: #2563eb; }
  .text-red { color: #dc2626; }
  .text-green { color: #16a34a; }

  .chart-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
  .chart-header { background: #fff; padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-weight: bold; font-size: 11px; }
  .chart-image { width: 100%; height: 320px; object-fit: contain; background: #fff; display: block; }
  .chart-placeholder { height: 320px; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 11px; background: #f8fafc; }

  /* AI Expert Section - Full content */
  .expert-box { border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; margin-bottom: 8px; }
  .expert-header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
  .expert-icon { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
  .expert-icon svg { width: 20px; height: 20px; }
  .expert-info { flex: 1; }
  .expert-name { font-weight: bold; font-size: 10px; color: #1e293b; }
  .expert-role { font-size: 8px; font-weight: 500; margin-top: 1px; }
  .expert-content { background: #f8fafc; border-radius: 6px; padding: 8px; font-size: 8px; color: #475569; line-height: 1.5; }
  .no-expert { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; text-align: center; color: #94a3b8; font-size: 10px; }

  /* Expert colors */
  .expert-aria { background: #dbeafe; }
  .expert-aria .expert-role { color: #3b82f6; }
  .expert-nexus { background: #dcfce7; }
  .expert-nexus .expert-role { color: #10b981; }
  .expert-oracle { background: #f3e8ff; }
  .expert-oracle .expert-role { color: #a855f7; }
  .expert-sentinel { background: #ffedd5; }
  .expert-sentinel .expert-role { color: #f97316; }

  /* Footer/Disclaimer */
  .disclaimer-box { background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 8px; margin-top: 8px; }
  .disclaimer-title { font-size: 8px; font-weight: bold; color: #dc2626; margin-bottom: 3px; }
  .disclaimer-text { font-size: 6px; color: #7f1d1d; line-height: 1.4; }
`;

// Generate header HTML - Only for Page 1
function generateHeader(data: AnalysisReportData, isLong: boolean, score: number): string {
  const coinIconUrl = getCoinIconUrl(data.symbol);
  return `
    <div class="header">
      <div class="header-left">
        <div class="logo"><span class="logo-red">Trade</span><span class="logo-green">Path</span></div>
        <div class="motto">AI-Powered Trading Intelligence</div>
      </div>
      <div class="header-center">
        <div class="report-title">Analysis Report</div>
        <div class="report-date">${data.generatedAt}</div>
      </div>
      <div class="header-right">
        <img src="${coinIconUrl}" class="coin-logo" alt="${data.symbol}" onerror="this.src='${FALLBACK_COIN_ICON}'" />
        <div class="coin-info">
          <div class="coin-symbol">${data.symbol}/USDT</div>
          <div class="coin-badge ${isLong ? 'badge-green' : 'badge-red'}">${isLong ? '▲ BULLISH' : '▼ BEARISH'}</div>
          <div class="coin-score">Score: ${score}/100</div>
        </div>
      </div>
    </div>
  `;
}

// Simple page title for pages 2 & 3
function generatePageTitle(data: AnalysisReportData): string {
  return `<div class="page-title"><span class="logo-red">Trade</span><span class="logo-green">Path</span> • <span class="symbol">${data.symbol}/USDT</span> Analysis Report</div>`;
}

// PAGE 1: 7-Step Analysis
function generatePage1HTML(data: AnalysisReportData): string {
  const isLong = data.tradePlan.direction === 'long';
  const score = Math.round((data.verdict.overallScore || 0) * 10);

  const steps = [
    {
      num: 'Step 1',
      title: 'Market Pulse',
      subtitle: 'Understanding the Big Picture',
      icon: stepIcons.marketPulse,
      iconClass: 'icon-blue',
      status: data.marketPulse.trend?.direction === 'bullish' ? 'Bullish' : data.marketPulse.trend?.direction === 'bearish' ? 'Bearish' : 'Neutral',
      statusColor: data.marketPulse.trend?.direction === 'bullish' ? '#16a34a' : data.marketPulse.trend?.direction === 'bearish' ? '#dc2626' : '#d97706',
      description: `Fear & Greed Index at ${data.marketPulse.fearGreedIndex} (${data.marketPulse.fearGreedLabel}). BTC Dominance: ${data.marketPulse.btcDominance?.toFixed(1)}%. Market trend shows ${data.marketPulse.trend?.direction || 'neutral'} momentum.`
    },
    {
      num: 'Step 2',
      title: 'Asset Scan',
      subtitle: 'Deep Technical Analysis',
      icon: stepIcons.assetScan,
      iconClass: 'icon-purple',
      status: data.assetScan.priceChange24h >= 2 ? 'Strong' : data.assetScan.priceChange24h >= 0 ? 'Stable' : data.assetScan.priceChange24h >= -2 ? 'Weak' : 'Declining',
      statusColor: data.assetScan.priceChange24h >= 0 ? '#16a34a' : '#dc2626',
      description: `Current price ${formatPrice(data.assetScan.currentPrice)} with ${data.assetScan.priceChange24h >= 0 ? '+' : ''}${data.assetScan.priceChange24h?.toFixed(2)}% change in 24h. RSI: ${data.assetScan.indicators?.rsi?.toFixed(0) || '-'}, MACD: ${data.assetScan.indicators?.macd?.histogram > 0 ? 'Bullish' : 'Bearish'}.`
    },
    {
      num: 'Step 3',
      title: 'Safety Check',
      subtitle: 'Risk & Manipulation Detection',
      icon: stepIcons.safety,
      iconClass: 'icon-green',
      status: data.safetyCheck.riskLevel === 'low' ? 'Safe' : data.safetyCheck.riskLevel === 'high' ? 'Risky' : 'Caution',
      statusColor: data.safetyCheck.riskLevel === 'low' ? '#16a34a' : data.safetyCheck.riskLevel === 'high' ? '#dc2626' : '#d97706',
      description: `Risk level: ${data.safetyCheck.riskLevel}. Whale activity bias: ${data.safetyCheck.whaleActivity?.bias || 'neutral'}. Pump/dump risk: ${data.safetyCheck.manipulation?.pumpDumpRisk || 'low'}.`
    },
    {
      num: 'Step 4',
      title: 'Timing',
      subtitle: 'Optimal Entry Window',
      icon: stepIcons.timing,
      iconClass: 'icon-amber',
      status: data.timing.tradeNow ? 'Trade Now' : 'Wait',
      statusColor: data.timing.tradeNow ? '#16a34a' : '#d97706',
      description: data.timing.reason || (data.timing.tradeNow ? 'Market conditions are favorable for entry. Technical indicators align with trade direction.' : 'Wait for better entry. Current market structure suggests patience.')
    },
    {
      num: 'Step 5',
      title: 'Trade Plan',
      subtitle: 'Your Execution Strategy',
      icon: stepIcons.tradePlan,
      iconClass: 'icon-green',
      status: 'Ready',
      statusColor: '#16a34a',
      description: `${isLong ? 'Long' : 'Short'} position with ${data.tradePlan.riskReward?.toFixed(1)}:1 risk-reward. Entry: ${formatPrice(data.tradePlan.averageEntry)}, Stop: ${formatPrice(data.tradePlan.stopLoss?.price)}.`
    },
    {
      num: 'Step 6',
      title: 'Trap Check',
      subtitle: 'Avoiding Common Pitfalls',
      icon: stepIcons.trapCheck,
      iconClass: 'icon-red',
      status: (data.trapCheck?.traps?.bullTrap || data.trapCheck?.traps?.bearTrap) ? 'Warning' : 'Clear',
      statusColor: (data.trapCheck?.traps?.bullTrap || data.trapCheck?.traps?.bearTrap) ? '#dc2626' : '#16a34a',
      description: `Bull trap: ${data.trapCheck?.traps?.bullTrap ? 'Detected' : 'None'}. Bear trap: ${data.trapCheck?.traps?.bearTrap ? 'Detected' : 'None'}. Fakeout risk: ${data.trapCheck?.traps?.fakeoutRisk || 'low'}.`
    },
    {
      num: 'Step 7',
      title: 'Final Verdict',
      subtitle: 'The Final Decision',
      icon: stepIcons.verdict,
      iconClass: 'icon-green',
      status: `${isLong ? 'LONG' : 'SHORT'} (${score}/100)`,
      statusColor: isLong ? '#16a34a' : '#dc2626',
      description: data.verdict.aiSummary || `Analysis recommends ${isLong ? 'long' : 'short'} position with ${score}/100 confidence. ${data.timing.tradeNow ? 'Entry timing favorable.' : 'Consider waiting.'}`
    }
  ];

  const stepsHTML = steps.map(step => `
    <div class="step-box">
      <div class="step-header">
        <div class="step-icon ${step.iconClass}">${step.icon}</div>
        <div class="step-info">
          <div class="step-top">
            <div class="step-num">${step.num}</div>
            <div class="step-title">${step.title}</div>
          </div>
          <div class="step-subtitle">${step.subtitle}</div>
        </div>
        <div class="step-status" style="color: ${step.statusColor};">${step.status}</div>
      </div>
      <div class="step-desc">${step.description}</div>
    </div>
  `).join('');

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>${commonStyles}</style></head>
<body>
  <div class="page">
    ${generateHeader(data, isLong, score)}
    <div class="section-title">7-Step Trading Analysis <span>— Comprehensive market evaluation</span></div>
    ${stepsHTML}
    <div class="page-footer"><span class="logo-red">Trade</span><span class="logo-green">Path</span> • ${data.analysisId?.slice(-12) || 'N/A'}</div>
    <div class="page-number">Page 1 of 3</div>
  </div>
</body></html>`;
}

// PAGE 2: Trade Plan & Chart
function generatePage2HTML(data: AnalysisReportData): string {
  const isLong = data.tradePlan.direction === 'long';

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>${commonStyles}</style></head>
<body>
  <div class="page">
    ${generatePageTitle(data)}

    <div class="section-title">Trade Plan & Price Levels <span>— Entry, targets, and risk management</span></div>

    <div class="trade-plan-box">
      <div class="trade-plan-header">
        <div class="trade-plan-title">${data.symbol}/USDT Trade Setup</div>
        <div style="font-size: 9px; color: #64748b;">R:R <strong>${data.tradePlan.riskReward?.toFixed(1)}:1</strong> • Win Rate <strong>${data.tradePlan.winRateEstimate || 50}%</strong></div>
      </div>
      <div class="trade-plan-grid">
        <div class="trade-item">
          <div class="trade-label">Entry Price</div>
          <div class="trade-value text-blue">${formatPrice(data.tradePlan.averageEntry)}</div>
        </div>
        <div class="trade-item">
          <div class="trade-label">Stop Loss</div>
          <div class="trade-value text-red">${formatPrice(data.tradePlan.stopLoss?.price)}</div>
          <div style="font-size: 7px; color: #dc2626; margin-top: 2px;">-${data.tradePlan.stopLoss?.percentage?.toFixed(1) || '5'}%</div>
        </div>
        <div class="trade-item">
          <div class="trade-label">Take Profit 1</div>
          <div class="trade-value text-green">${formatPrice(data.tradePlan.takeProfits?.[0]?.price)}</div>
          <div style="font-size: 7px; color: #16a34a; margin-top: 2px;">+${data.tradePlan.takeProfits?.[0]?.percentage?.toFixed(1) || '5'}%</div>
        </div>
        <div class="trade-item">
          <div class="trade-label">Take Profit 2</div>
          <div class="trade-value text-green">${formatPrice(data.tradePlan.takeProfits?.[1]?.price)}</div>
          <div style="font-size: 7px; color: #16a34a; margin-top: 2px;">+${data.tradePlan.takeProfits?.[1]?.percentage?.toFixed(1) || '10'}%</div>
        </div>
        <div class="trade-item">
          <div class="trade-label">Take Profit 3</div>
          <div class="trade-value text-green">${formatPrice(data.tradePlan.takeProfits?.[2]?.price)}</div>
          <div style="font-size: 7px; color: #16a34a; margin-top: 2px;">+${data.tradePlan.takeProfits?.[2]?.percentage?.toFixed(1) || '15'}%</div>
        </div>
        <div class="trade-item">
          <div class="trade-label">Direction</div>
          <div class="trade-value" style="color: ${isLong ? '#16a34a' : '#dc2626'};">${isLong ? '▲ LONG' : '▼ SHORT'}</div>
        </div>
      </div>
    </div>

    <div class="section-title">Price Chart <span>— Visual representation of trade levels</span></div>
    <div class="chart-box">
      <div class="chart-header">${data.symbol}/USDT with Entry, Stop Loss & Take Profit Levels</div>
      ${data.chartImage
        ? `<img src="${data.chartImage}" class="chart-image" alt="Trade Chart" />`
        : `<div class="chart-placeholder">Chart visualization not available</div>`
      }
    </div>

    <div class="page-footer"><span class="logo-red">Trade</span><span class="logo-green">Path</span> • ${data.analysisId?.slice(-12) || 'N/A'}</div>
    <div class="page-number">Page 2 of 3</div>
  </div>
</body></html>`;
}

// PAGE 3: AI Expert Comments - Full content without truncation
function generatePage3HTML(data: AnalysisReportData): string {
  const experts = parseExpertComments(data.aiExpertComment || '');

  const expertConfig: Record<string, { role: string; desc: string; icon: string; colorClass: string }> = {
    'ARIA': {
      role: 'Technical Analysis Mentor',
      desc: 'Your go-to mentor for all things technical analysis.',
      icon: expertIcons.ARIA,
      colorClass: 'expert-aria'
    },
    'NEXUS': {
      role: 'Risk Management Mentor',
      desc: 'Your mentor for smart money management.',
      icon: expertIcons.NEXUS,
      colorClass: 'expert-nexus'
    },
    'ORACLE': {
      role: 'On-Chain Intelligence Mentor',
      desc: 'Your guide to understanding on-chain data.',
      icon: expertIcons.ORACLE,
      colorClass: 'expert-oracle'
    },
    'SENTINEL': {
      role: 'Security & Safety Mentor',
      desc: 'Your protector in the crypto world.',
      icon: expertIcons.SENTINEL,
      colorClass: 'expert-sentinel'
    }
  };

  // Calculate max characters per expert based on number of experts
  const numExperts = experts.length || 1;
  const maxCharsPerExpert = numExperts <= 2 ? 800 : numExperts === 3 ? 500 : 350;

  const expertsHTML = experts.length > 0 ? experts.map(expert => {
    const config = expertConfig[expert.name] || {
      role: 'AI Expert',
      desc: '',
      icon: expertIcons.NEXUS,
      colorClass: 'expert-nexus'
    };
    const content = expert.content.length > maxCharsPerExpert
      ? expert.content.slice(0, maxCharsPerExpert) + '...'
      : expert.content;
    return `
    <div class="expert-box">
      <div class="expert-header">
        <div class="expert-icon ${config.colorClass}">${config.icon}</div>
        <div class="expert-info">
          <div class="expert-name">${expert.name}</div>
          <div class="expert-role">${config.role}</div>
        </div>
      </div>
      <div class="expert-content">${content}</div>
    </div>
  `}).join('') : '<div class="no-expert">No AI Expert comments available for this analysis.</div>';

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>${commonStyles}</style></head>
<body>
  <div class="page">
    ${generatePageTitle(data)}

    <div class="section-title">AI Expert Comments <span>— Multi-perspective risk assessment by NEXUS AI Panel</span></div>
    ${expertsHTML}

    <div class="disclaimer-box">
      <div class="disclaimer-title">Risk Disclaimer</div>
      <div class="disclaimer-text">
        This report is generated by TradePath AI for educational and informational purposes only. It does not constitute financial advice, investment recommendation, or an offer to buy or sell any financial instruments. Cryptocurrency trading involves substantial risk of loss and is not suitable for all investors. Past performance is not indicative of future results. Always conduct your own research and consult with a qualified financial advisor before making any investment decisions.
      </div>
    </div>

    <div class="page-footer">© 2024 TradePath. All rights reserved. • www.tradepath.io</div>
    <div class="page-number">Page 3 of 3</div>
  </div>
</body></html>`;
}

// Chart capture function
export async function captureChartAsImage(): Promise<string | null> {
  try {
    const element = document.getElementById('trade-plan-chart');
    if (!element) {
      console.log('Chart element not found');
      return null;
    }

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

// Render HTML to canvas
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

  // Wait for content and images to load
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

// Return type for PDF generation
interface PdfResult {
  base64: string;
  fileName: string;
}

// Main export function - 3 Page PDF
export async function generateAnalysisReport(data: AnalysisReportData, captureChart: boolean = true): Promise<PdfResult | void> {
  // Capture chart if needed
  if (captureChart && !data.chartImage) {
    console.log('Attempting to capture chart...');
    const chartImage = await captureChartAsImage();
    if (chartImage) {
      console.log('Chart captured successfully');
      data.chartImage = chartImage;
    } else {
      console.log('Chart capture returned null');
    }
  }

  // Create PDF
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();

  // Page 1: 7-Step Analysis
  const canvas1 = await renderPageToCanvas(generatePage1HTML(data));
  const imgData1 = canvas1.toDataURL('image/png');
  pdf.addImage(imgData1, 'PNG', 0, 0, pdfWidth, pdfHeight);

  // Page 2: Trade Plan & Chart
  pdf.addPage();
  const canvas2 = await renderPageToCanvas(generatePage2HTML(data));
  const imgData2 = canvas2.toDataURL('image/png');
  pdf.addImage(imgData2, 'PNG', 0, 0, pdfWidth, pdfHeight);

  // Page 3: AI Expert Comments
  pdf.addPage();
  const canvas3 = await renderPageToCanvas(generatePage3HTML(data));
  const imgData3 = canvas3.toDataURL('image/png');
  pdf.addImage(imgData3, 'PNG', 0, 0, pdfWidth, pdfHeight);

  // Generate filename
  const fileName = `TradePath_${data.symbol}_Report_${new Date().toISOString().split('T')[0]}.pdf`;

  // Get PDF as base64 for email (remove data:application/pdf;base64, prefix)
  const pdfBase64 = pdf.output('datauristring').split(',')[1];

  // Save to user's device
  pdf.save(fileName);

  // Return PDF data for email sending
  return {
    base64: pdfBase64,
    fileName,
  };
}

export type { AnalysisReportData as ReportData };
