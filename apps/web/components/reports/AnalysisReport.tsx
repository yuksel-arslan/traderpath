'use client';

// ===========================================
// TradePath Analysis Report - HTML to PDF
// Simple, clean HTML structure
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

// Generate clean HTML report
function generateReportHTML(data: AnalysisReportData): string {
  const isLong = data.tradePlan.direction === 'long';
  const score = Math.round((data.verdict.overallScore || 0) * 10);

  const getTrendBadge = () => {
    const dir = data.marketPulse.trend?.direction;
    if (dir === 'bullish') return { text: 'Bullish', color: '#16a34a', bg: '#dcfce7' };
    if (dir === 'bearish') return { text: 'Bearish', color: '#dc2626', bg: '#fee2e2' };
    return { text: 'Neutral', color: '#d97706', bg: '#fef3c7' };
  };

  const getAssetBadge = () => {
    const change = data.assetScan.priceChange24h;
    if (change >= 2) return { text: 'Strong', color: '#16a34a', bg: '#dcfce7' };
    if (change >= 0) return { text: 'Stable', color: '#2563eb', bg: '#dbeafe' };
    if (change >= -2) return { text: 'Weak', color: '#d97706', bg: '#fef3c7' };
    return { text: 'Declining', color: '#dc2626', bg: '#fee2e2' };
  };

  const getSafetyBadge = () => {
    const risk = data.safetyCheck.riskLevel;
    if (risk === 'low') return { text: 'Safe', color: '#16a34a', bg: '#dcfce7' };
    if (risk === 'high') return { text: 'Risky', color: '#dc2626', bg: '#fee2e2' };
    return { text: 'Caution', color: '#d97706', bg: '#fef3c7' };
  };

  const trendBadge = getTrendBadge();
  const assetBadge = getAssetBadge();
  const safetyBadge = getSafetyBadge();

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #1e293b; background: #fff; }
    .container { width: 595px; padding: 30px; }
    .header { text-align: center; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 2px solid #e2e8f0; }
    .logo { font-size: 20px; font-weight: bold; margin-bottom: 5px; }
    .logo-red { color: #dc2626; }
    .logo-green { color: #16a34a; }
    .title { font-size: 16px; color: #64748b; margin-bottom: 8px; }
    .symbol-row { display: flex; justify-content: center; align-items: center; gap: 15px; }
    .symbol { font-size: 22px; font-weight: bold; }
    .badge { padding: 4px 12px; border-radius: 15px; font-size: 10px; font-weight: bold; }
    .badge-green { background: #dcfce7; color: #16a34a; }
    .badge-red { background: #fee2e2; color: #dc2626; }
    .score { font-size: 18px; font-weight: bold; }
    .date { font-size: 9px; color: #94a3b8; margin-top: 5px; }

    .section { margin-bottom: 20px; }
    .section-title { font-size: 12px; font-weight: bold; color: #475569; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px; }

    .grid-2 { display: flex; gap: 10px; }
    .grid-2 > div { flex: 1; }
    .grid-3 { display: flex; gap: 10px; }
    .grid-3 > div { flex: 1; }

    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; }
    .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
    .card-title { font-weight: 600; font-size: 11px; }
    .card-badge { padding: 2px 8px; border-radius: 10px; font-size: 9px; font-weight: 600; }
    .card-text { font-size: 9px; color: #64748b; }

    .verdict-box { padding: 15px; border-radius: 10px; margin-bottom: 20px; }
    .verdict-green { background: #dcfce7; border: 1px solid #86efac; }
    .verdict-red { background: #fee2e2; border: 1px solid #fca5a5; }
    .verdict-title { font-size: 13px; font-weight: bold; margin-bottom: 8px; }
    .verdict-text { font-size: 10px; line-height: 1.5; }

    .trade-plan { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 15px; margin-bottom: 20px; }
    .trade-plan-header { display: flex; justify-content: space-between; margin-bottom: 12px; }
    .trade-plan-title { font-weight: bold; }
    .trade-plan-grid { display: flex; gap: 8px; text-align: center; }
    .trade-plan-item { flex: 1; background: #fff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; }
    .trade-plan-label { font-size: 8px; color: #64748b; margin-bottom: 4px; text-transform: uppercase; }
    .trade-plan-value { font-size: 12px; font-weight: bold; }
    .text-blue { color: #2563eb; }
    .text-red { color: #dc2626; }
    .text-green { color: #16a34a; }

    .chart-section { border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; margin-bottom: 20px; }
    .chart-header { background: #f8fafc; padding: 10px 12px; border-bottom: 1px solid #e2e8f0; }
    .chart-image { width: 100%; height: 200px; object-fit: contain; background: #fff; }
    .chart-placeholder { height: 200px; display: flex; align-items: center; justify-content: center; color: #94a3b8; background: #f8fafc; }

    .ai-expert { background: linear-gradient(135deg, #fef3c7, #fde68a); border: 1px solid #fbbf24; border-radius: 10px; padding: 15px; margin-bottom: 20px; }
    .ai-expert-header { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
    .ai-expert-icon { width: 30px; height: 30px; background: linear-gradient(135deg, #f59e0b, #d97706); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 14px; }
    .ai-expert-title { font-weight: bold; color: #92400e; }
    .ai-expert-subtitle { font-size: 8px; color: #a16207; }
    .ai-expert-content { background: rgba(255,255,255,0.7); border-radius: 8px; padding: 12px; }
    .ai-expert-text { font-size: 9px; color: #78350f; line-height: 1.6; }

    .footer { text-align: center; padding-top: 15px; border-top: 1px solid #e2e8f0; margin-top: 20px; }
    .footer-text { font-size: 8px; color: #94a3b8; }
    .warning { font-size: 7px; color: #94a3b8; margin-top: 8px; }
  </style>
</head>
<body>
  <div class="container">

    <!-- Header -->
    <div class="header">
      <div class="logo"><span class="logo-red">Trade</span><span class="logo-green">Path</span></div>
      <div class="title">Analysis Report</div>
      <div class="symbol-row">
        <span class="symbol">${data.symbol}/USDT</span>
        <span class="badge ${isLong ? 'badge-green' : 'badge-red'}">${isLong ? '▲ BULLISH' : '▼ BEARISH'}</span>
        <span class="score">${score}/100</span>
      </div>
      <div class="date">${data.generatedAt}</div>
    </div>

    <!-- Analysis Overview -->
    <div class="section">
      <div class="section-title">Analysis Overview</div>
      <div class="grid-2" style="margin-bottom: 10px;">
        <div class="card">
          <div class="card-header">
            <span class="card-title">🌐 Market Pulse</span>
            <span class="card-badge" style="background: ${trendBadge.bg}; color: ${trendBadge.color};">${trendBadge.text}</span>
          </div>
          <div class="card-text">Fear & Greed: ${data.marketPulse.fearGreedIndex} (${data.marketPulse.fearGreedLabel}) • BTC Dom: ${data.marketPulse.btcDominance?.toFixed(1)}%</div>
        </div>
        <div class="card">
          <div class="card-header">
            <span class="card-title">🔍 Asset Scan</span>
            <span class="card-badge" style="background: ${assetBadge.bg}; color: ${assetBadge.color};">${assetBadge.text}</span>
          </div>
          <div class="card-text">Price: ${formatPrice(data.assetScan.currentPrice)} • 24h: ${data.assetScan.priceChange24h >= 0 ? '+' : ''}${data.assetScan.priceChange24h?.toFixed(2)}%</div>
        </div>
      </div>
      <div class="grid-2" style="margin-bottom: 10px;">
        <div class="card">
          <div class="card-header">
            <span class="card-title">🛡️ Safety Check</span>
            <span class="card-badge" style="background: ${safetyBadge.bg}; color: ${safetyBadge.color};">${safetyBadge.text}</span>
          </div>
          <div class="card-text">Whale activity: ${data.safetyCheck.whaleActivity?.bias || 'neutral'}</div>
        </div>
        <div class="card">
          <div class="card-header">
            <span class="card-title">⏱️ Timing</span>
            <span class="card-badge" style="background: ${data.timing.tradeNow ? '#dcfce7' : '#fef3c7'}; color: ${data.timing.tradeNow ? '#16a34a' : '#d97706'};">${data.timing.tradeNow ? 'Now' : 'Wait'}</span>
          </div>
          <div class="card-text">RSI: ${data.assetScan.indicators?.rsi?.toFixed(0) || '-'} • MACD: ${data.assetScan.indicators?.macd?.histogram > 0 ? 'Bullish' : 'Bearish'}</div>
        </div>
      </div>
      <div class="grid-2">
        <div class="card">
          <div class="card-header">
            <span class="card-title">🎯 Trade Plan</span>
            <span class="card-badge" style="background: #dcfce7; color: #16a34a;">Ready</span>
          </div>
          <div class="card-text">R:R ${data.tradePlan.riskReward?.toFixed(1)}:1 • Win Rate: ${data.tradePlan.winRateEstimate || 50}%</div>
        </div>
        <div class="card">
          <div class="card-header">
            <span class="card-title">⚠️ Trap Check</span>
            <span class="card-badge" style="background: ${(data.trapCheck?.traps?.bullTrap || data.trapCheck?.traps?.bearTrap) ? '#fee2e2' : '#dcfce7'}; color: ${(data.trapCheck?.traps?.bullTrap || data.trapCheck?.traps?.bearTrap) ? '#dc2626' : '#16a34a'};">${(data.trapCheck?.traps?.bullTrap || data.trapCheck?.traps?.bearTrap) ? 'Warning' : 'Clear'}</span>
          </div>
          <div class="card-text">Fakeout risk: ${data.trapCheck?.traps?.fakeoutRisk || 'low'}</div>
        </div>
      </div>
    </div>

    <!-- Final Verdict -->
    <div class="verdict-box ${isLong ? 'verdict-green' : 'verdict-red'}">
      <div class="verdict-title" style="color: ${isLong ? '#16a34a' : '#dc2626'};">✓ Final Verdict: ${data.tradePlan.direction?.toUpperCase()} Recommended</div>
      <div class="verdict-text" style="color: ${isLong ? '#166534' : '#991b1b'};">
        ${data.verdict.aiSummary || `Market conditions favor ${isLong ? 'bullish' : 'bearish'} continuation. Entry zone ${formatPrice(data.tradePlan.averageEntry)} with ${data.tradePlan.riskReward?.toFixed(1)}:1 risk-reward ratio.`}
      </div>
    </div>

    <!-- Trade Plan Levels -->
    <div class="trade-plan">
      <div class="trade-plan-header">
        <span class="trade-plan-title">${data.symbol}/USDT Trade Plan</span>
        <span style="font-size: 9px; color: #64748b;">Risk: <span class="text-red">${data.tradePlan.stopLoss?.percentage?.toFixed(1) || '5'}%</span> | Reward: <span class="text-green">${((data.tradePlan.riskReward || 2) * (data.tradePlan.stopLoss?.percentage || 5)).toFixed(1)}%</span></span>
      </div>
      <div class="trade-plan-grid">
        <div class="trade-plan-item">
          <div class="trade-plan-label">Entry</div>
          <div class="trade-plan-value text-blue">${formatPrice(data.tradePlan.averageEntry)}</div>
        </div>
        <div class="trade-plan-item">
          <div class="trade-plan-label">Stop Loss</div>
          <div class="trade-plan-value text-red">${formatPrice(data.tradePlan.stopLoss?.price)}</div>
        </div>
        <div class="trade-plan-item">
          <div class="trade-plan-label">TP1</div>
          <div class="trade-plan-value text-green">${formatPrice(data.tradePlan.takeProfits?.[0]?.price)}</div>
        </div>
        <div class="trade-plan-item">
          <div class="trade-plan-label">TP2</div>
          <div class="trade-plan-value text-green">${formatPrice(data.tradePlan.takeProfits?.[1]?.price)}</div>
        </div>
        <div class="trade-plan-item">
          <div class="trade-plan-label">TP3</div>
          <div class="trade-plan-value text-green">${formatPrice(data.tradePlan.takeProfits?.[2]?.price)}</div>
        </div>
      </div>
    </div>

    <!-- Chart -->
    <div class="chart-section">
      <div class="chart-header">
        <span style="font-weight: bold;">📊 Price Chart with Trade Levels</span>
      </div>
      ${data.chartImage
        ? `<img src="${data.chartImage}" class="chart-image" />`
        : `<div class="chart-placeholder">Chart not available</div>`
      }
    </div>

    <!-- AI Expert Review -->
    ${data.aiExpertComment ? `
    <div class="ai-expert">
      <div class="ai-expert-header">
        <div class="ai-expert-icon">🤖</div>
        <div>
          <div class="ai-expert-title">AI Expert Review</div>
          <div class="ai-expert-subtitle">NEXUS Risk Assessment</div>
        </div>
      </div>
      <div class="ai-expert-content">
        <div class="ai-expert-text">${data.aiExpertComment.slice(0, 1000)}${data.aiExpertComment.length > 1000 ? '...' : ''}</div>
      </div>
    </div>
    ` : ''}

    <!-- Footer -->
    <div class="footer">
      <div class="footer-text">
        <span class="logo-red">Trade</span><span class="logo-green">Path</span> AI Analysis Report • ID: ${data.analysisId?.slice(-12) || 'N/A'}
      </div>
      <div class="warning">⚠️ This report is for educational purposes only and is not investment advice. Cryptocurrency investments carry high risk.</div>
    </div>

  </div>
</body>
</html>`;
}

// Chart capture function
export async function captureChartAsImage(): Promise<string | null> {
  try {
    const element = document.getElementById('trade-plan-chart');
    if (!element) return null;

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

// Main export function - HTML to PDF
export async function generateAnalysisReport(data: AnalysisReportData, captureChart: boolean = true): Promise<void> {
  // Capture chart if needed
  if (captureChart && !data.chartImage) {
    const chartImage = await captureChartAsImage();
    if (chartImage) {
      data.chartImage = chartImage;
    }
  }

  // Create hidden iframe for rendering
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position: fixed; left: -9999px; top: 0; width: 595px; height: 842px; border: none;';
  document.body.appendChild(iframe);

  // Write HTML to iframe
  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!iframeDoc) {
    document.body.removeChild(iframe);
    throw new Error('Could not access iframe document');
  }

  iframeDoc.open();
  iframeDoc.write(generateReportHTML(data));
  iframeDoc.close();

  // Wait for content to render
  await new Promise(resolve => setTimeout(resolve, 500));

  try {
    const container = iframeDoc.querySelector('.container') as HTMLElement;
    if (!container) throw new Error('Container not found');

    // Render to canvas
    const canvas = await html2canvas(container, {
      backgroundColor: '#ffffff',
      scale: 2,
      logging: false,
      width: 595,
      windowWidth: 595,
    });

    // Create PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4',
    });

    const imgData = canvas.toDataURL('image/png');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    // Add image, handle multi-page if needed
    const pageHeight = pdf.internal.pageSize.getHeight();
    let position = 0;

    if (pdfHeight <= pageHeight) {
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    } else {
      // Multi-page handling
      let heightLeft = pdfHeight;
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }
    }

    // Save
    const filename = `TradePath_${data.symbol}_Report_${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(filename);

  } finally {
    document.body.removeChild(iframe);
  }
}

export type { AnalysisReportData as ReportData };
