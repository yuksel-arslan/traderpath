'use client';

// ===========================================
// TradePath Analysis Report - Professional PDF
// 3-Section Layout: 7-Step Analysis, Trade Plan, AI Expert
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

  // If no expert format found, return as single comment
  if (experts.length === 0 && comment.length > 0) {
    // Remove panel header if exists
    const cleanComment = comment.replace(/\[PANEL_HEADER\][^-]*---/, '').trim();
    if (cleanComment) {
      experts.push({ name: 'NEXUS', content: cleanComment });
    }
  }

  return experts;
}

// Generate clean HTML report - 3 sections
function generateReportHTML(data: AnalysisReportData): string {
  const isLong = data.tradePlan.direction === 'long';
  const score = Math.round((data.verdict.overallScore || 0) * 10);
  const experts = parseExpertComments(data.aiExpertComment || '');

  // 7-Step Analysis data with descriptions
  const steps = [
    {
      num: 1,
      title: 'Market Pulse',
      icon: '🌐',
      status: data.marketPulse.trend?.direction === 'bullish' ? 'Bullish' : data.marketPulse.trend?.direction === 'bearish' ? 'Bearish' : 'Neutral',
      statusColor: data.marketPulse.trend?.direction === 'bullish' ? '#16a34a' : data.marketPulse.trend?.direction === 'bearish' ? '#dc2626' : '#d97706',
      description: `Fear & Greed Index at ${data.marketPulse.fearGreedIndex} (${data.marketPulse.fearGreedLabel}). BTC Dominance: ${data.marketPulse.btcDominance?.toFixed(1)}%. Market trend shows ${data.marketPulse.trend?.direction || 'neutral'} momentum with ${data.marketPulse.trend?.strength || 50}% strength.`
    },
    {
      num: 2,
      title: 'Asset Scan',
      icon: '🔍',
      status: data.assetScan.priceChange24h >= 2 ? 'Strong' : data.assetScan.priceChange24h >= 0 ? 'Stable' : data.assetScan.priceChange24h >= -2 ? 'Weak' : 'Declining',
      statusColor: data.assetScan.priceChange24h >= 0 ? '#16a34a' : '#dc2626',
      description: `Current price ${formatPrice(data.assetScan.currentPrice)} with ${data.assetScan.priceChange24h >= 0 ? '+' : ''}${data.assetScan.priceChange24h?.toFixed(2)}% change in 24h. RSI at ${data.assetScan.indicators?.rsi?.toFixed(0) || '-'}, MACD histogram ${data.assetScan.indicators?.macd?.histogram > 0 ? 'positive (bullish)' : 'negative (bearish)'}.`
    },
    {
      num: 3,
      title: 'Safety Check',
      icon: '🛡️',
      status: data.safetyCheck.riskLevel === 'low' ? 'Safe' : data.safetyCheck.riskLevel === 'high' ? 'Risky' : 'Caution',
      statusColor: data.safetyCheck.riskLevel === 'low' ? '#16a34a' : data.safetyCheck.riskLevel === 'high' ? '#dc2626' : '#d97706',
      description: `Risk level: ${data.safetyCheck.riskLevel}. Whale activity bias: ${data.safetyCheck.whaleActivity?.bias || 'neutral'}. Pump/dump risk: ${data.safetyCheck.manipulation?.pumpDumpRisk || 'low'}.`
    },
    {
      num: 4,
      title: 'Timing Analysis',
      icon: '⏱️',
      status: data.timing.tradeNow ? 'Trade Now' : 'Wait',
      statusColor: data.timing.tradeNow ? '#16a34a' : '#d97706',
      description: data.timing.reason || (data.timing.tradeNow ? 'Market conditions are favorable for entry. Technical indicators align with the trade direction.' : 'Wait for better entry conditions. Current market structure suggests patience.')
    },
    {
      num: 5,
      title: 'Trade Plan',
      icon: '🎯',
      status: 'Ready',
      statusColor: '#16a34a',
      description: `${isLong ? 'Long' : 'Short'} position planned with ${data.tradePlan.riskReward?.toFixed(1)}:1 risk-reward ratio. Entry at ${formatPrice(data.tradePlan.averageEntry)}, stop loss at ${formatPrice(data.tradePlan.stopLoss?.price)}.`
    },
    {
      num: 6,
      title: 'Trap Detection',
      icon: '⚠️',
      status: (data.trapCheck?.traps?.bullTrap || data.trapCheck?.traps?.bearTrap) ? 'Warning' : 'Clear',
      statusColor: (data.trapCheck?.traps?.bullTrap || data.trapCheck?.traps?.bearTrap) ? '#dc2626' : '#16a34a',
      description: `Bull trap: ${data.trapCheck?.traps?.bullTrap ? 'Detected' : 'None'}. Bear trap: ${data.trapCheck?.traps?.bearTrap ? 'Detected' : 'None'}. Fakeout risk: ${data.trapCheck?.traps?.fakeoutRisk || 'low'}.`
    },
    {
      num: 7,
      title: 'Final Verdict',
      icon: '✓',
      status: `${isLong ? 'LONG' : 'SHORT'} (${score}/100)`,
      statusColor: isLong ? '#16a34a' : '#dc2626',
      description: data.verdict.aiSummary || `Analysis recommends ${isLong ? 'long' : 'short'} position with overall confidence score of ${score}/100. ${data.timing.tradeNow ? 'Entry timing is favorable.' : 'Consider waiting for better entry.'}`
    }
  ];

  const stepsHTML = steps.map(step => `
    <div class="step-box">
      <div class="step-header">
        <div class="step-num">${step.num}</div>
        <div class="step-icon">${step.icon}</div>
        <div class="step-title">${step.title}</div>
        <div class="step-status" style="background: ${step.statusColor}15; color: ${step.statusColor}; border: 1px solid ${step.statusColor}30;">${step.status}</div>
      </div>
      <div class="step-desc">${step.description}</div>
    </div>
  `).join('');

  const expertsHTML = experts.length > 0 ? experts.map(expert => `
    <div class="expert-box">
      <div class="expert-header">
        <div class="expert-avatar">${expert.name.charAt(0)}</div>
        <div class="expert-name">${expert.name}</div>
      </div>
      <div class="expert-content">${expert.content.slice(0, 400)}${expert.content.length > 400 ? '...' : ''}</div>
    </div>
  `).join('') : '<div class="no-expert">No AI Expert comments available for this report.</div>';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 10px; color: #1e293b; background: #fff; line-height: 1.4; }
    .page { width: 595px; min-height: 842px; padding: 25px 30px; }

    /* Header */
    .header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 15px; border-bottom: 2px solid #e2e8f0; margin-bottom: 20px; }
    .header-left { }
    .logo { font-size: 18px; font-weight: bold; }
    .logo-red { color: #dc2626; }
    .logo-green { color: #16a34a; }
    .motto { font-size: 8px; color: #64748b; margin-top: 2px; }
    .header-center { text-align: center; }
    .report-title { font-size: 16px; font-weight: bold; color: #1e293b; }
    .report-date { font-size: 8px; color: #94a3b8; margin-top: 3px; }
    .header-right { text-align: right; }
    .coin-symbol { font-size: 16px; font-weight: bold; }
    .coin-badge { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 9px; font-weight: bold; margin-top: 3px; }
    .badge-green { background: #dcfce7; color: #16a34a; }
    .badge-red { background: #fee2e2; color: #dc2626; }
    .coin-score { font-size: 9px; color: #64748b; margin-top: 3px; }

    /* Section Title */
    .section-title { font-size: 13px; font-weight: bold; color: #1e293b; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 1px solid #e2e8f0; }
    .section-title span { color: #64748b; font-weight: normal; font-size: 10px; }

    /* 7-Step Analysis */
    .step-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px; margin-bottom: 8px; }
    .step-header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
    .step-num { width: 20px; height: 20px; background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; }
    .step-icon { font-size: 14px; }
    .step-title { font-weight: 600; font-size: 11px; flex: 1; }
    .step-status { padding: 2px 8px; border-radius: 10px; font-size: 8px; font-weight: 600; }
    .step-desc { font-size: 9px; color: #475569; line-height: 1.5; padding-left: 28px; }

    /* Trade Plan Section */
    .trade-section { display: flex; gap: 12px; margin-bottom: 20px; }
    .trade-plan-box { flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; }
    .trade-plan-title { font-weight: bold; font-size: 11px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; }
    .trade-plan-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
    .trade-item { background: #fff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px; text-align: center; }
    .trade-label { font-size: 8px; color: #64748b; text-transform: uppercase; margin-bottom: 3px; }
    .trade-value { font-size: 11px; font-weight: bold; }
    .text-blue { color: #2563eb; }
    .text-red { color: #dc2626; }
    .text-green { color: #16a34a; }

    .chart-box { flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
    .chart-header { background: #fff; padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-weight: bold; font-size: 11px; }
    .chart-image { width: 100%; height: 160px; object-fit: contain; background: #fff; }
    .chart-placeholder { height: 160px; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 11px; }

    /* AI Expert Section */
    .expert-box { background: linear-gradient(135deg, #fef3c7, #fde68a); border: 1px solid #fbbf24; border-radius: 8px; padding: 12px; margin-bottom: 10px; }
    .expert-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
    .expert-avatar { width: 28px; height: 28px; background: linear-gradient(135deg, #f59e0b, #d97706); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 12px; font-weight: bold; }
    .expert-name { font-weight: bold; color: #92400e; font-size: 11px; }
    .expert-content { background: rgba(255,255,255,0.7); border-radius: 6px; padding: 10px; font-size: 9px; color: #78350f; line-height: 1.6; }
    .no-expert { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; text-align: center; color: #94a3b8; font-size: 10px; }

    /* Footer */
    .footer { margin-top: 20px; padding-top: 15px; border-top: 2px solid #e2e8f0; }
    .footer-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
    .footer-logo { font-size: 12px; font-weight: bold; }
    .footer-id { font-size: 8px; color: #94a3b8; }
    .disclaimer { background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 10px; }
    .disclaimer-title { font-size: 9px; font-weight: bold; color: #dc2626; margin-bottom: 4px; }
    .disclaimer-text { font-size: 7px; color: #7f1d1d; line-height: 1.5; }
    .footer-bottom { display: flex; justify-content: space-between; margin-top: 10px; font-size: 7px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="page">

    <!-- HEADER -->
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
        <div class="coin-symbol">${data.symbol}/USDT</div>
        <div class="coin-badge ${isLong ? 'badge-green' : 'badge-red'}">${isLong ? '▲ BULLISH' : '▼ BEARISH'}</div>
        <div class="coin-score">Score: ${score}/100</div>
      </div>
    </div>

    <!-- SECTION 1: 7-Step Analysis -->
    <div class="section">
      <div class="section-title">7-Step Trading Analysis <span>— Comprehensive market evaluation</span></div>
      ${stepsHTML}
    </div>

    <!-- SECTION 2: Trade Plan & Chart -->
    <div class="section-title" style="margin-top: 15px;">Trade Plan & Price Levels <span>— Entry, targets, and risk management</span></div>
    <div class="trade-section">
      <div class="trade-plan-box">
        <div class="trade-plan-title">
          <span>📊 ${data.symbol} Trade Setup</span>
          <span style="font-size: 9px; font-weight: normal; color: #64748b;">R:R ${data.tradePlan.riskReward?.toFixed(1)}:1</span>
        </div>
        <div class="trade-plan-grid">
          <div class="trade-item">
            <div class="trade-label">Entry Price</div>
            <div class="trade-value text-blue">${formatPrice(data.tradePlan.averageEntry)}</div>
          </div>
          <div class="trade-item">
            <div class="trade-label">Stop Loss</div>
            <div class="trade-value text-red">${formatPrice(data.tradePlan.stopLoss?.price)}</div>
          </div>
          <div class="trade-item">
            <div class="trade-label">Take Profit 1</div>
            <div class="trade-value text-green">${formatPrice(data.tradePlan.takeProfits?.[0]?.price)}</div>
          </div>
          <div class="trade-item">
            <div class="trade-label">Take Profit 2</div>
            <div class="trade-value text-green">${formatPrice(data.tradePlan.takeProfits?.[1]?.price)}</div>
          </div>
          <div class="trade-item">
            <div class="trade-label">Take Profit 3</div>
            <div class="trade-value text-green">${formatPrice(data.tradePlan.takeProfits?.[2]?.price)}</div>
          </div>
          <div class="trade-item">
            <div class="trade-label">Win Rate Est.</div>
            <div class="trade-value">${data.tradePlan.winRateEstimate || 50}%</div>
          </div>
        </div>
      </div>
      <div class="chart-box">
        <div class="chart-header">📈 Price Chart with Levels</div>
        ${data.chartImage
          ? `<img src="${data.chartImage}" class="chart-image" />`
          : `<div class="chart-placeholder">Chart not available</div>`
        }
      </div>
    </div>

    <!-- SECTION 3: AI Expert Comments -->
    <div class="section-title">AI Expert Comments <span>— Multi-perspective risk assessment</span></div>
    ${expertsHTML}

    <!-- FOOTER -->
    <div class="footer">
      <div class="footer-top">
        <div class="footer-logo"><span class="logo-red">Trade</span><span class="logo-green">Path</span></div>
        <div class="footer-id">Report ID: ${data.analysisId || 'N/A'}</div>
      </div>
      <div class="disclaimer">
        <div class="disclaimer-title">⚠️ Risk Disclaimer</div>
        <div class="disclaimer-text">
          This report is generated by TradePath AI for educational and informational purposes only. It does not constitute financial advice, investment recommendation, or an offer to buy or sell any financial instruments. Cryptocurrency trading involves substantial risk of loss and is not suitable for all investors. Past performance is not indicative of future results. Always conduct your own research and consult with a qualified financial advisor before making any investment decisions. TradePath and its affiliates are not responsible for any losses incurred based on information provided in this report.
        </div>
      </div>
      <div class="footer-bottom">
        <span>© 2024 TradePath. All rights reserved.</span>
        <span>www.tradepath.io</span>
        <span>Generated: ${data.generatedAt}</span>
      </div>
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
  iframe.style.cssText = 'position: fixed; left: -9999px; top: 0; width: 595px; height: 1200px; border: none;';
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
    const page = iframeDoc.querySelector('.page') as HTMLElement;
    if (!page) throw new Error('Page container not found');

    // Render to canvas
    const canvas = await html2canvas(page, {
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

    if (pdfHeight <= pageHeight) {
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    } else {
      // Multi-page: split image across pages
      let y = 0;
      const imgHeightOnPage = pageHeight;
      const totalPages = Math.ceil(pdfHeight / pageHeight);

      for (let i = 0; i < totalPages; i++) {
        if (i > 0) pdf.addPage();

        // Calculate source rectangle from canvas
        const sourceY = (i * pageHeight * canvas.width) / pdfWidth;
        const sourceHeight = Math.min(
          (pageHeight * canvas.width) / pdfWidth,
          canvas.height - sourceY
        );

        // Create a temporary canvas for this page slice
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = sourceHeight;
        const ctx = pageCanvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(
            canvas,
            0, sourceY, canvas.width, sourceHeight,
            0, 0, canvas.width, sourceHeight
          );
          const pageImgData = pageCanvas.toDataURL('image/png');
          const sliceHeight = (sourceHeight * pdfWidth) / canvas.width;
          pdf.addImage(pageImgData, 'PNG', 0, 0, pdfWidth, sliceHeight);
        }
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
