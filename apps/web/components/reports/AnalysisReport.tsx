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

// Common CSS styles
const commonStyles = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #1e293b; background: #fff; line-height: 1.4; }
  .page { width: 595px; height: 842px; padding: 30px; position: relative; }

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
  .section-title { font-size: 14px; font-weight: bold; color: #1e293b; margin-bottom: 15px; padding-bottom: 8px; border-bottom: 2px solid #3b82f6; }
  .section-title span { color: #64748b; font-weight: normal; font-size: 10px; }

  /* Page number */
  .page-number { position: absolute; bottom: 20px; right: 30px; font-size: 9px; color: #94a3b8; }
  .page-footer { position: absolute; bottom: 20px; left: 30px; font-size: 8px; color: #94a3b8; }

  /* 7-Step Analysis */
  .step-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 15px; margin-bottom: 10px; }
  .step-header { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
  .step-num { width: 24px; height: 24px; background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; }
  .step-icon { font-size: 16px; }
  .step-title { font-weight: 600; font-size: 12px; flex: 1; }
  .step-status { padding: 3px 10px; border-radius: 12px; font-size: 9px; font-weight: 600; }
  .step-desc { font-size: 10px; color: #475569; line-height: 1.6; padding-left: 34px; }

  /* Trade Plan Section */
  .trade-plan-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; margin-bottom: 20px; }
  .trade-plan-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid #e2e8f0; }
  .trade-plan-title { font-weight: bold; font-size: 13px; }
  .trade-plan-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
  .trade-item { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center; }
  .trade-label { font-size: 9px; color: #64748b; text-transform: uppercase; margin-bottom: 5px; }
  .trade-value { font-size: 14px; font-weight: bold; }
  .text-blue { color: #2563eb; }
  .text-red { color: #dc2626; }
  .text-green { color: #16a34a; }

  .chart-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; }
  .chart-header { background: #fff; padding: 12px 15px; border-bottom: 1px solid #e2e8f0; font-weight: bold; font-size: 12px; }
  .chart-image { width: 100%; height: 280px; object-fit: contain; background: #fff; }
  .chart-placeholder { height: 280px; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 12px; }

  /* AI Expert Section */
  .expert-box { background: linear-gradient(135deg, #fef3c7, #fde68a); border: 1px solid #fbbf24; border-radius: 10px; padding: 15px; margin-bottom: 15px; }
  .expert-header { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
  .expert-avatar { width: 36px; height: 36px; background: linear-gradient(135deg, #f59e0b, #d97706); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 14px; font-weight: bold; }
  .expert-name { font-weight: bold; color: #92400e; font-size: 12px; }
  .expert-role { font-size: 9px; color: #a16207; }
  .expert-content { background: rgba(255,255,255,0.8); border-radius: 8px; padding: 12px; font-size: 10px; color: #78350f; line-height: 1.7; }
  .no-expert { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 30px; text-align: center; color: #94a3b8; font-size: 11px; }

  /* Footer/Disclaimer */
  .disclaimer-box { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 15px; margin-top: 20px; }
  .disclaimer-title { font-size: 10px; font-weight: bold; color: #dc2626; margin-bottom: 6px; }
  .disclaimer-text { font-size: 8px; color: #7f1d1d; line-height: 1.6; }
`;

// Generate header HTML
function generateHeader(data: AnalysisReportData, isLong: boolean, score: number): string {
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
        <div class="coin-symbol">${data.symbol}/USDT</div>
        <div class="coin-badge ${isLong ? 'badge-green' : 'badge-red'}">${isLong ? '▲ BULLISH' : '▼ BEARISH'}</div>
        <div class="coin-score">Score: ${score}/100</div>
      </div>
    </div>
  `;
}

// PAGE 1: 7-Step Analysis
function generatePage1HTML(data: AnalysisReportData): string {
  const isLong = data.tradePlan.direction === 'long';
  const score = Math.round((data.verdict.overallScore || 0) * 10);

  const steps = [
    {
      num: 1,
      title: 'Market Pulse',
      icon: '🌐',
      status: data.marketPulse.trend?.direction === 'bullish' ? 'Bullish' : data.marketPulse.trend?.direction === 'bearish' ? 'Bearish' : 'Neutral',
      statusColor: data.marketPulse.trend?.direction === 'bullish' ? '#16a34a' : data.marketPulse.trend?.direction === 'bearish' ? '#dc2626' : '#d97706',
      description: `Fear & Greed Index at ${data.marketPulse.fearGreedIndex} (${data.marketPulse.fearGreedLabel}). BTC Dominance: ${data.marketPulse.btcDominance?.toFixed(1)}%. Market trend shows ${data.marketPulse.trend?.direction || 'neutral'} momentum.`
    },
    {
      num: 2,
      title: 'Asset Scan',
      icon: '🔍',
      status: data.assetScan.priceChange24h >= 2 ? 'Strong' : data.assetScan.priceChange24h >= 0 ? 'Stable' : data.assetScan.priceChange24h >= -2 ? 'Weak' : 'Declining',
      statusColor: data.assetScan.priceChange24h >= 0 ? '#16a34a' : '#dc2626',
      description: `Current price ${formatPrice(data.assetScan.currentPrice)} with ${data.assetScan.priceChange24h >= 0 ? '+' : ''}${data.assetScan.priceChange24h?.toFixed(2)}% change in 24h. RSI: ${data.assetScan.indicators?.rsi?.toFixed(0) || '-'}, MACD: ${data.assetScan.indicators?.macd?.histogram > 0 ? 'Bullish' : 'Bearish'}.`
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
      description: data.timing.reason || (data.timing.tradeNow ? 'Market conditions are favorable for entry. Technical indicators align with trade direction.' : 'Wait for better entry. Current market structure suggests patience.')
    },
    {
      num: 5,
      title: 'Trade Plan',
      icon: '🎯',
      status: 'Ready',
      statusColor: '#16a34a',
      description: `${isLong ? 'Long' : 'Short'} position with ${data.tradePlan.riskReward?.toFixed(1)}:1 risk-reward. Entry: ${formatPrice(data.tradePlan.averageEntry)}, Stop: ${formatPrice(data.tradePlan.stopLoss?.price)}.`
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
      description: data.verdict.aiSummary || `Analysis recommends ${isLong ? 'long' : 'short'} position with ${score}/100 confidence. ${data.timing.tradeNow ? 'Entry timing favorable.' : 'Consider waiting.'}`
    }
  ];

  const stepsHTML = steps.map(step => `
    <div class="step-box">
      <div class="step-header">
        <div class="step-num">${step.num}</div>
        <div class="step-icon">${step.icon}</div>
        <div class="step-title">${step.title}</div>
        <div class="step-status" style="background: ${step.statusColor}15; color: ${step.statusColor}; border: 1px solid ${step.statusColor}40;">${step.status}</div>
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
  const score = Math.round((data.verdict.overallScore || 0) * 10);

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>${commonStyles}</style></head>
<body>
  <div class="page">
    ${generateHeader(data, isLong, score)}

    <div class="section-title">Trade Plan & Price Levels <span>— Entry, targets, and risk management</span></div>

    <div class="trade-plan-box">
      <div class="trade-plan-header">
        <div class="trade-plan-title">📊 ${data.symbol}/USDT Trade Setup</div>
        <div style="font-size: 10px; color: #64748b;">Risk/Reward: <strong>${data.tradePlan.riskReward?.toFixed(1)}:1</strong> • Win Rate: <strong>${data.tradePlan.winRateEstimate || 50}%</strong></div>
      </div>
      <div class="trade-plan-grid">
        <div class="trade-item">
          <div class="trade-label">Entry Price</div>
          <div class="trade-value text-blue">${formatPrice(data.tradePlan.averageEntry)}</div>
        </div>
        <div class="trade-item">
          <div class="trade-label">Stop Loss</div>
          <div class="trade-value text-red">${formatPrice(data.tradePlan.stopLoss?.price)}</div>
          <div style="font-size: 8px; color: #dc2626; margin-top: 3px;">-${data.tradePlan.stopLoss?.percentage?.toFixed(1) || '5'}%</div>
        </div>
        <div class="trade-item">
          <div class="trade-label">Take Profit 1</div>
          <div class="trade-value text-green">${formatPrice(data.tradePlan.takeProfits?.[0]?.price)}</div>
          <div style="font-size: 8px; color: #16a34a; margin-top: 3px;">+${data.tradePlan.takeProfits?.[0]?.percentage?.toFixed(1) || '5'}%</div>
        </div>
        <div class="trade-item">
          <div class="trade-label">Take Profit 2</div>
          <div class="trade-value text-green">${formatPrice(data.tradePlan.takeProfits?.[1]?.price)}</div>
          <div style="font-size: 8px; color: #16a34a; margin-top: 3px;">+${data.tradePlan.takeProfits?.[1]?.percentage?.toFixed(1) || '10'}%</div>
        </div>
        <div class="trade-item">
          <div class="trade-label">Take Profit 3</div>
          <div class="trade-value text-green">${formatPrice(data.tradePlan.takeProfits?.[2]?.price)}</div>
          <div style="font-size: 8px; color: #16a34a; margin-top: 3px;">+${data.tradePlan.takeProfits?.[2]?.percentage?.toFixed(1) || '15'}%</div>
        </div>
        <div class="trade-item">
          <div class="trade-label">Direction</div>
          <div class="trade-value" style="color: ${isLong ? '#16a34a' : '#dc2626'};">${isLong ? '▲ LONG' : '▼ SHORT'}</div>
        </div>
      </div>
    </div>

    <div class="section-title" style="margin-top: 25px;">Price Chart <span>— Visual representation of trade levels</span></div>
    <div class="chart-box">
      <div class="chart-header">📈 ${data.symbol}/USDT with Entry, Stop Loss & Take Profit Levels</div>
      ${data.chartImage
        ? `<img src="${data.chartImage}" class="chart-image" />`
        : `<div class="chart-placeholder">Chart visualization not available</div>`
      }
    </div>

    <div class="page-footer"><span class="logo-red">Trade</span><span class="logo-green">Path</span> • ${data.analysisId?.slice(-12) || 'N/A'}</div>
    <div class="page-number">Page 2 of 3</div>
  </div>
</body></html>`;
}

// PAGE 3: AI Expert Comments
function generatePage3HTML(data: AnalysisReportData): string {
  const isLong = data.tradePlan.direction === 'long';
  const score = Math.round((data.verdict.overallScore || 0) * 10);
  const experts = parseExpertComments(data.aiExpertComment || '');

  const expertRoles: Record<string, string> = {
    'ARIA': 'Technical Analysis Specialist',
    'ORACLE': 'Market Intelligence Expert',
    'SENTINEL': 'Risk Assessment Analyst',
    'NEXUS': 'AI Analysis Engine'
  };

  const expertsHTML = experts.length > 0 ? experts.map(expert => `
    <div class="expert-box">
      <div class="expert-header">
        <div class="expert-avatar">${expert.name.charAt(0)}</div>
        <div>
          <div class="expert-name">${expert.name}</div>
          <div class="expert-role">${expertRoles[expert.name] || 'AI Expert'}</div>
        </div>
      </div>
      <div class="expert-content">${expert.content.slice(0, 600)}${expert.content.length > 600 ? '...' : ''}</div>
    </div>
  `).join('') : '<div class="no-expert">No AI Expert comments available for this analysis.</div>';

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>${commonStyles}</style></head>
<body>
  <div class="page">
    ${generateHeader(data, isLong, score)}

    <div class="section-title">AI Expert Comments <span>— Multi-perspective risk assessment by NEXUS AI Panel</span></div>
    ${expertsHTML}

    <div class="disclaimer-box">
      <div class="disclaimer-title">⚠️ Risk Disclaimer</div>
      <div class="disclaimer-text">
        This report is generated by TradePath AI for educational and informational purposes only. It does not constitute financial advice, investment recommendation, or an offer to buy or sell any financial instruments. Cryptocurrency trading involves substantial risk of loss and is not suitable for all investors. Past performance is not indicative of future results. Always conduct your own research and consult with a qualified financial advisor before making any investment decisions. TradePath and its affiliates are not responsible for any losses incurred based on information provided in this report.
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

  await new Promise(resolve => setTimeout(resolve, 300));

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
  });

  document.body.removeChild(iframe);
  return canvas;
}

// Main export function - 3 Page PDF
export async function generateAnalysisReport(data: AnalysisReportData, captureChart: boolean = true): Promise<void> {
  // Capture chart if needed
  if (captureChart && !data.chartImage) {
    const chartImage = await captureChartAsImage();
    if (chartImage) {
      data.chartImage = chartImage;
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

  // Save
  const filename = `TradePath_${data.symbol}_Report_${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(filename);
}

export type { AnalysisReportData as ReportData };
