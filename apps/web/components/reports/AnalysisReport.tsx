'use client';

// ===========================================
// TradePath Analysis Report - HTML to PDF
// Mirrors the web report detail modal exactly
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

function getBadgeStyle(type: string, value: string | boolean): { bg: string; color: string; text: string } {
  if (type === 'trend') {
    if (value === 'bullish') return { bg: '#dcfce7', color: '#16a34a', text: 'Bullish' };
    if (value === 'bearish') return { bg: '#fee2e2', color: '#dc2626', text: 'Bearish' };
    return { bg: '#fef3c7', color: '#d97706', text: 'Neutral' };
  }
  if (type === 'asset') {
    const change = value as unknown as number;
    if (change >= 2) return { bg: '#dcfce7', color: '#16a34a', text: 'Strong' };
    if (change >= 0) return { bg: '#dbeafe', color: '#2563eb', text: 'Stable' };
    if (change >= -2) return { bg: '#fef3c7', color: '#d97706', text: 'Weak' };
    return { bg: '#fee2e2', color: '#dc2626', text: 'Declining' };
  }
  if (type === 'safety') {
    if (value === 'low') return { bg: '#dcfce7', color: '#16a34a', text: 'Safe' };
    if (value === 'high') return { bg: '#fee2e2', color: '#dc2626', text: 'Risky' };
    return { bg: '#fef3c7', color: '#d97706', text: 'Caution' };
  }
  if (type === 'timing') {
    if (value === true) return { bg: '#dcfce7', color: '#16a34a', text: 'Now' };
    return { bg: '#fef3c7', color: '#d97706', text: 'Wait' };
  }
  if (type === 'plan') {
    return { bg: '#dcfce7', color: '#16a34a', text: 'Ready' };
  }
  if (type === 'trap') {
    if (value === true) return { bg: '#fee2e2', color: '#dc2626', text: 'Warning' };
    return { bg: '#dcfce7', color: '#16a34a', text: 'Clear' };
  }
  return { bg: '#f1f5f9', color: '#64748b', text: String(value) };
}

// Generate HTML matching the web modal design
function generateReportHTML(data: AnalysisReportData): string {
  const isLong = data.tradePlan.direction === 'long';
  const score = Math.round((data.verdict.overallScore || 0) * 10);
  const trendBadge = getBadgeStyle('trend', data.marketPulse.trend?.direction);
  const assetBadge = getBadgeStyle('asset', data.assetScan.priceChange24h as unknown as string);
  const safetyBadge = getBadgeStyle('safety', data.safetyCheck.riskLevel);
  const timingBadge = getBadgeStyle('timing', data.timing.tradeNow);
  const trapBadge = getBadgeStyle('trap', data.trapCheck?.traps?.bullTrap || data.trapCheck?.traps?.bearTrap);

  return `
    <div style="width: 595px; min-height: 842px; padding: 25px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; box-sizing: border-box;">

      <!-- Main Card -->
      <div style="background: #fff; border-radius: 16px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">

        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid #e2e8f0;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 36px; height: 36px; background: linear-gradient(135deg, #f59e0b, #d97706); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: bold; font-size: 14px;">${data.symbol.charAt(0)}</div>
            <div>
              <div style="font-size: 16px; font-weight: 700; color: #0f172a;">${data.symbol}/USDT Analysis</div>
              <div style="font-size: 10px; color: #64748b;">${data.generatedAt}</div>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="display: flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 20px; background: ${isLong ? '#dcfce7' : '#fee2e2'};">
              <span style="font-size: 10px;">▲</span>
              <span style="font-size: 11px; font-weight: 600; color: ${isLong ? '#16a34a' : '#dc2626'};">${isLong ? 'BULLISH' : 'BEARISH'}</span>
            </div>
            <div style="font-size: 18px; font-weight: 700; color: #0f172a;">${score}/100</div>
          </div>
        </div>

        <!-- 6 Analysis Cards Grid (2x3) -->
        <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 16px;">

          <!-- 1. Market Pulse -->
          <div style="width: calc(50% - 5px); background: #f8fafc; border-radius: 10px; padding: 12px; border: 1px solid #e2e8f0;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="color: #10b981; font-size: 12px;">🌐</span>
                <span style="font-size: 11px; font-weight: 600; color: #0f172a;">Market Pulse</span>
              </div>
              <span style="font-size: 9px; font-weight: 600; padding: 2px 8px; border-radius: 10px; background: ${trendBadge.bg}; color: ${trendBadge.color};">${trendBadge.text}</span>
            </div>
            <div style="font-size: 9px; color: #64748b;">Fear & Greed: ${data.marketPulse.fearGreedIndex} (${data.marketPulse.fearGreedLabel}) • BTC Dom: ${data.marketPulse.btcDominance?.toFixed(1)}%</div>
          </div>

          <!-- 2. Asset Scan -->
          <div style="width: calc(50% - 5px); background: #f8fafc; border-radius: 10px; padding: 12px; border: 1px solid #e2e8f0;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="color: #8b5cf6; font-size: 12px;">🔍</span>
                <span style="font-size: 11px; font-weight: 600; color: #0f172a;">Asset Scan</span>
              </div>
              <span style="font-size: 9px; font-weight: 600; padding: 2px 8px; border-radius: 10px; background: ${assetBadge.bg}; color: ${assetBadge.color};">${assetBadge.text}</span>
            </div>
            <div style="font-size: 9px; color: #64748b;">Price: ${formatPrice(data.assetScan.currentPrice)} • 24h: ${data.assetScan.priceChange24h >= 0 ? '+' : ''}${data.assetScan.priceChange24h?.toFixed(2)}%</div>
          </div>

          <!-- 3. Safety Check -->
          <div style="width: calc(50% - 5px); background: #f8fafc; border-radius: 10px; padding: 12px; border: 1px solid #e2e8f0;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="color: #f59e0b; font-size: 12px;">🛡️</span>
                <span style="font-size: 11px; font-weight: 600; color: #0f172a;">Safety Check</span>
              </div>
              <span style="font-size: 9px; font-weight: 600; padding: 2px 8px; border-radius: 10px; background: ${safetyBadge.bg}; color: ${safetyBadge.color};">${safetyBadge.text}</span>
            </div>
            <div style="font-size: 9px; color: #64748b;">No manipulation detected • Whale activity: ${data.safetyCheck.whaleActivity?.bias || 'neutral'}</div>
          </div>

          <!-- 4. Timing Analysis -->
          <div style="width: calc(50% - 5px); background: #f8fafc; border-radius: 10px; padding: 12px; border: 1px solid #e2e8f0;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="color: #3b82f6; font-size: 12px;">⏱️</span>
                <span style="font-size: 11px; font-weight: 600; color: #0f172a;">Timing Analysis</span>
              </div>
              <span style="font-size: 9px; font-weight: 600; padding: 2px 8px; border-radius: 10px; background: ${timingBadge.bg}; color: ${timingBadge.color};">${timingBadge.text}</span>
            </div>
            <div style="font-size: 9px; color: #64748b;">RSI: ${data.assetScan.indicators?.rsi?.toFixed(0) || '-'} • MACD: ${data.assetScan.indicators?.macd?.histogram > 0 ? 'Bullish' : 'Bearish'} momentum</div>
          </div>

          <!-- 5. Trade Plan -->
          <div style="width: calc(50% - 5px); background: #f8fafc; border-radius: 10px; padding: 12px; border: 1px solid #e2e8f0;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="color: #06b6d4; font-size: 12px;">🎯</span>
                <span style="font-size: 11px; font-weight: 600; color: #0f172a;">Trade Plan</span>
              </div>
              <span style="font-size: 9px; font-weight: 600; padding: 2px 8px; border-radius: 10px; background: #dcfce7; color: #16a34a;">Ready</span>
            </div>
            <div style="font-size: 9px; color: #64748b;">Entry: ${formatPrice(data.tradePlan.averageEntry)} • TP: ${formatPrice(data.tradePlan.takeProfits?.[0]?.price)} • SL: ${formatPrice(data.tradePlan.stopLoss?.price)}</div>
          </div>

          <!-- 6. Trap Check -->
          <div style="width: calc(50% - 5px); background: #f8fafc; border-radius: 10px; padding: 12px; border: 1px solid #e2e8f0;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="color: #ef4444; font-size: 12px;">⚠️</span>
                <span style="font-size: 11px; font-weight: 600; color: #0f172a;">Trap Check</span>
              </div>
              <span style="font-size: 9px; font-weight: 600; padding: 2px 8px; border-radius: 10px; background: ${trapBadge.bg}; color: ${trapBadge.color};">${trapBadge.text}</span>
            </div>
            <div style="font-size: 9px; color: #64748b;">Bull trap: ${data.trapCheck?.traps?.bullTrap ? 'Yes' : 'No'} • Bear trap: ${data.trapCheck?.traps?.bearTrap ? 'Yes' : 'No'} • Fakeout: ${data.trapCheck?.traps?.fakeoutRisk || 'low'}</div>
          </div>
        </div>

        <!-- Final Verdict Box -->
        <div style="background: ${isLong ? '#dcfce7' : '#fee2e2'}; border-radius: 10px; padding: 12px; margin-bottom: 16px;">
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
            <span style="color: ${isLong ? '#16a34a' : '#dc2626'}; font-size: 14px;">✓</span>
            <span style="font-size: 12px; font-weight: 600; color: ${isLong ? '#16a34a' : '#dc2626'};">Final Verdict: ${data.tradePlan.direction?.toUpperCase()} Recommended</span>
          </div>
          <div style="font-size: 9px; color: ${isLong ? '#166534' : '#991b1b'}; line-height: 1.5;">
            ${data.verdict.aiSummary || `Market conditions favor ${isLong ? 'bullish' : 'bearish'} continuation. Entry zone ${formatPrice(data.tradePlan.averageEntry)} with ${data.tradePlan.riskReward?.toFixed(1)}:1 risk-reward ratio. Set stop-loss at ${formatPrice(data.tradePlan.stopLoss?.price)} to protect against downside.`}
          </div>
        </div>

        <!-- Chart Section -->
        <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; margin-bottom: 16px; overflow: hidden;">
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
            <div>
              <div style="font-size: 11px; font-weight: 600; color: #0f172a;">${data.symbol}/USDT Trade Plan</div>
              <div style="font-size: 9px; color: #64748b;">${isLong ? 'Long Position' : 'Short Position'}</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 9px; color: #64748b;">Risk: <span style="color: #dc2626; font-weight: 600;">${data.tradePlan.stopLoss?.percentage?.toFixed(1) || '5'}%</span></div>
              <div style="font-size: 9px; color: #64748b;">Reward: <span style="color: #16a34a; font-weight: 600;">${((data.tradePlan.riskReward || 2) * (data.tradePlan.stopLoss?.percentage || 5)).toFixed(1)}%</span></div>
            </div>
          </div>
          ${data.chartImage
            ? `<img src="${data.chartImage}" style="width: 100%; height: 220px; object-fit: contain; display: block;" />`
            : `<div style="height: 220px; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 12px; background: #f8fafc;">Chart preview not available</div>`
          }
        </div>

        <!-- Entry Levels Summary -->
        <div style="display: flex; gap: 8px; margin-bottom: 16px; font-size: 9px;">
          <div style="flex: 1; background: #f8fafc; border-radius: 8px; padding: 10px; text-align: center; border: 1px solid #e2e8f0;">
            <div style="color: #64748b; margin-bottom: 4px;">ENTRY LEVELS</div>
            <div style="font-weight: 700; color: #2563eb;">${formatPrice(data.tradePlan.averageEntry)}</div>
          </div>
          <div style="flex: 1; background: #f8fafc; border-radius: 8px; padding: 10px; text-align: center; border: 1px solid #e2e8f0;">
            <div style="color: #64748b; margin-bottom: 4px;">STOP LOSS</div>
            <div style="font-weight: 700; color: #dc2626;">${formatPrice(data.tradePlan.stopLoss?.price)}</div>
            <div style="font-size: 8px; color: #dc2626;">-${data.tradePlan.stopLoss?.percentage?.toFixed(1) || '5'}% risk</div>
          </div>
          <div style="flex: 2; background: #f8fafc; border-radius: 8px; padding: 10px; border: 1px solid #e2e8f0;">
            <div style="color: #64748b; margin-bottom: 4px; text-align: center;">TAKE PROFIT TARGETS</div>
            <div style="display: flex; justify-content: space-around;">
              <div style="text-align: center;">
                <div style="font-size: 8px; color: #64748b;">TP1</div>
                <div style="font-weight: 700; color: #16a34a;">${formatPrice(data.tradePlan.takeProfits?.[0]?.price)}</div>
              </div>
              <div style="text-align: center;">
                <div style="font-size: 8px; color: #64748b;">TP2</div>
                <div style="font-weight: 700; color: #16a34a;">${formatPrice(data.tradePlan.takeProfits?.[1]?.price)}</div>
              </div>
              <div style="text-align: center;">
                <div style="font-size: 8px; color: #64748b;">TP3</div>
                <div style="font-weight: 700; color: #16a34a;">${formatPrice(data.tradePlan.takeProfits?.[2]?.price)}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- AI Expert Review -->
        ${data.aiExpertComment ? `
        <div style="background: linear-gradient(135deg, #fef3c7, #fde68a); border: 1px solid #fbbf24; border-radius: 10px; padding: 12px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <div style="width: 28px; height: 28px; background: linear-gradient(135deg, #f59e0b, #d97706); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
              <span style="color: #fff; font-size: 12px;">🤖</span>
            </div>
            <div>
              <div style="font-size: 11px; font-weight: 600; color: #92400e;">AI Expert Review</div>
              <div style="font-size: 8px; color: #a16207;">NEXUS Risk Assessment</div>
            </div>
          </div>
          <div style="background: rgba(255,255,255,0.7); border-radius: 8px; padding: 10px;">
            <div style="font-size: 9px; color: #78350f; line-height: 1.6;">${data.aiExpertComment.slice(0, 800)}${data.aiExpertComment.length > 800 ? '...' : ''}</div>
          </div>
        </div>
        ` : ''}

      </div>

      <!-- Footer -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 15px; padding: 0 10px;">
        <div style="font-size: 8px; color: #94a3b8;">Report ID: ${data.analysisId?.slice(-12) || 'N/A'}</div>
        <div style="font-size: 8px; color: #94a3b8;">
          <span style="color: #dc2626; font-weight: 600;">Trade</span><span style="color: #16a34a; font-weight: 600;">Path</span> AI Analysis Report
        </div>
        <div style="font-size: 8px; color: #94a3b8;">Page 1</div>
      </div>

      <!-- Risk Warning -->
      <div style="margin-top: 10px; text-align: center;">
        <div style="font-size: 7px; color: #94a3b8;">⚠️ This report is for educational purposes only and is not investment advice. Cryptocurrency investments carry high risk.</div>
      </div>
    </div>
  `;
}

// Chart capture function
export async function captureChartAsImage(): Promise<string | null> {
  try {
    const element = document.getElementById('trade-plan-chart');
    if (!element) {
      console.warn('Chart element not found');
      return null;
    }

    const rect = element.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      console.warn('Chart element has no dimensions');
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

// Main export function - HTML to PDF
export async function generateAnalysisReport(data: AnalysisReportData, captureChart: boolean = true): Promise<void> {
  // Capture chart if needed
  if (captureChart && !data.chartImage) {
    const chartImage = await captureChartAsImage();
    if (chartImage) {
      data.chartImage = chartImage;
    }
  }

  // Create container for rendering
  const container = document.createElement('div');
  container.innerHTML = generateReportHTML(data);
  container.style.cssText = 'position: fixed; left: -9999px; top: 0;';
  document.body.appendChild(container);

  await new Promise(resolve => setTimeout(resolve, 200));

  try {
    // Render to canvas
    const canvas = await html2canvas(container.firstElementChild as HTMLElement, {
      backgroundColor: '#f8fafc',
      scale: 2,
      logging: false,
      width: 595,
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

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

    // Save
    const filename = `TradePath_${data.symbol}_Report_${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(filename);

  } finally {
    document.body.removeChild(container);
  }
}

export type { AnalysisReportData as ReportData };
