'use client';

// ===========================================
// TradePath Analysis Report - HTML to PDF
// Clean template using html2canvas + jsPDF
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
    indicators: { rsi: number; macd: { histogram: number } };
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

function getVerdictColor(action: string): string {
  const a = (action || '').toLowerCase();
  if (a.includes('go') && !a.includes('wait') && !a.includes('conditional')) return '#16a34a';
  if (a.includes('wait') || a.includes('conditional')) return '#d97706';
  return '#dc2626';
}

// Generate HTML for Page 1
function generatePage1HTML(data: AnalysisReportData): string {
  const verdictBg = getVerdictColor(data.verdict.action);
  const isLong = data.tradePlan.direction === 'long';
  const score = Math.round((data.verdict.overallScore || 0) * 10);

  return `
    <div style="width: 595px; height: 842px; padding: 30px; font-family: Arial, sans-serif; background: #fff; position: relative; box-sizing: border-box;">

      <!-- Header -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #1e293b; padding-bottom: 15px; margin-bottom: 20px;">
        <div style="font-size: 24px; font-weight: bold;">
          <span style="color: #dc2626;">Trade</span><span style="color: #16a34a;">Path</span>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 18px; font-weight: bold; color: #1e293b;">${data.symbol}/USDT</div>
          <div style="font-size: 10px; color: #64748b;">${data.generatedAt}</div>
        </div>
      </div>

      <!-- Verdict Box -->
      <div style="background: ${verdictBg}; border-radius: 10px; padding: 15px 20px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div style="font-size: 24px; font-weight: bold; color: #fff;">${data.verdict.action || 'ANALYZE'}</div>
          <div style="font-size: 14px; color: rgba(255,255,255,0.9);">Score: ${score}/100</div>
        </div>
        <div style="background: rgba(255,255,255,0.2); padding: 8px 16px; border-radius: 6px;">
          <span style="font-size: 14px; font-weight: bold; color: #fff;">${isLong ? 'LONG' : 'SHORT'}</span>
        </div>
      </div>

      <!-- Trade Plan -->
      <div style="margin-bottom: 20px;">
        <div style="font-size: 12px; font-weight: bold; color: #1e293b; margin-bottom: 10px; text-transform: uppercase;">Trade Plan</div>
        <div style="display: flex; gap: 8px;">
          <div style="flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; text-align: center;">
            <div style="font-size: 9px; font-weight: bold; color: #2563eb; margin-bottom: 4px;">ENTRY</div>
            <div style="font-size: 12px; font-weight: bold; color: #1e293b;">${formatPrice(data.tradePlan.averageEntry)}</div>
          </div>
          <div style="flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; text-align: center;">
            <div style="font-size: 9px; font-weight: bold; color: #dc2626; margin-bottom: 4px;">STOP LOSS</div>
            <div style="font-size: 12px; font-weight: bold; color: #dc2626;">${formatPrice(data.tradePlan.stopLoss?.price)}</div>
            <div style="font-size: 8px; color: #dc2626;">-${(data.tradePlan.stopLoss?.percentage || 0).toFixed(1)}%</div>
          </div>
          <div style="flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; text-align: center;">
            <div style="font-size: 9px; font-weight: bold; color: #16a34a; margin-bottom: 4px;">TP1</div>
            <div style="font-size: 12px; font-weight: bold; color: #16a34a;">${formatPrice(data.tradePlan.takeProfits?.[0]?.price)}</div>
          </div>
          <div style="flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; text-align: center;">
            <div style="font-size: 9px; font-weight: bold; color: #16a34a; margin-bottom: 4px;">TP2</div>
            <div style="font-size: 12px; font-weight: bold; color: #16a34a;">${formatPrice(data.tradePlan.takeProfits?.[1]?.price)}</div>
          </div>
          <div style="flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; text-align: center;">
            <div style="font-size: 9px; font-weight: bold; color: #16a34a; margin-bottom: 4px;">TP3</div>
            <div style="font-size: 12px; font-weight: bold; color: #16a34a;">${formatPrice(data.tradePlan.takeProfits?.[2]?.price)}</div>
          </div>
        </div>
      </div>

      <!-- Analysis Steps -->
      <div style="margin-bottom: 20px;">
        <div style="font-size: 12px; font-weight: bold; color: #1e293b; margin-bottom: 10px; text-transform: uppercase;">Analysis Steps</div>
        <div style="display: flex; flex-wrap: wrap; gap: 8px;">

          <!-- Step 1 -->
          <div style="width: calc(33.33% - 6px); background: #f8fafc; border-radius: 6px; padding: 10px; border-left: 4px solid #2563eb;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <span style="font-size: 10px; font-weight: bold;">1. Market</span>
              <span style="font-size: 8px; font-weight: bold; color: #fff; background: ${data.marketPulse.trend?.direction === 'bullish' ? '#16a34a' : '#d97706'}; padding: 2px 6px; border-radius: 3px;">${(data.marketPulse.trend?.direction || 'N/A').slice(0, 4).toUpperCase()}</span>
            </div>
            <div style="font-size: 8px; color: #64748b;">Fear/Greed: ${data.marketPulse.fearGreedIndex}</div>
            <div style="font-size: 8px; color: #64748b;">BTC Dom: ${data.marketPulse.btcDominance?.toFixed(1)}%</div>
          </div>

          <!-- Step 2 -->
          <div style="width: calc(33.33% - 6px); background: #f8fafc; border-radius: 6px; padding: 10px; border-left: 4px solid #06b6d4;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <span style="font-size: 10px; font-weight: bold;">2. Asset</span>
              <span style="font-size: 8px; font-weight: bold; color: #fff; background: ${(data.assetScan.priceChange24h || 0) >= 0 ? '#16a34a' : '#dc2626'}; padding: 2px 6px; border-radius: 3px;">${(data.assetScan.priceChange24h || 0) >= 0 ? 'UP' : 'DOWN'}</span>
            </div>
            <div style="font-size: 8px; color: #64748b;">Price: ${formatPrice(data.assetScan.currentPrice)}</div>
            <div style="font-size: 8px; color: #64748b;">RSI: ${data.assetScan.indicators?.rsi?.toFixed(0) || '-'}</div>
          </div>

          <!-- Step 3 -->
          <div style="width: calc(33.33% - 6px); background: #f8fafc; border-radius: 6px; padding: 10px; border-left: 4px solid #f97316;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <span style="font-size: 10px; font-weight: bold;">3. Safety</span>
              <span style="font-size: 8px; font-weight: bold; color: #fff; background: ${data.safetyCheck.riskLevel === 'low' ? '#16a34a' : '#d97706'}; padding: 2px 6px; border-radius: 3px;">${(data.safetyCheck.riskLevel || 'MED').toUpperCase()}</span>
            </div>
            <div style="font-size: 8px; color: #64748b;">Whale: ${data.safetyCheck.whaleActivity?.bias || '-'}</div>
          </div>

          <!-- Step 4 -->
          <div style="width: calc(33.33% - 6px); background: #f8fafc; border-radius: 6px; padding: 10px; border-left: 4px solid #a855f7;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <span style="font-size: 10px; font-weight: bold;">4. Timing</span>
              <span style="font-size: 8px; font-weight: bold; color: #fff; background: ${data.timing.tradeNow ? '#16a34a' : '#d97706'}; padding: 2px 6px; border-radius: 3px;">${data.timing.tradeNow ? 'NOW' : 'WAIT'}</span>
            </div>
            <div style="font-size: 8px; color: #64748b;">${(data.timing.reason || '-').slice(0, 25)}</div>
          </div>

          <!-- Step 5 -->
          <div style="width: calc(33.33% - 6px); background: #f8fafc; border-radius: 6px; padding: 10px; border-left: 4px solid #6366f1;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <span style="font-size: 10px; font-weight: bold;">5. Plan</span>
              <span style="font-size: 8px; font-weight: bold; color: #fff; background: ${isLong ? '#16a34a' : '#dc2626'}; padding: 2px 6px; border-radius: 3px;">${isLong ? 'LONG' : 'SHORT'}</span>
            </div>
            <div style="font-size: 8px; color: #64748b;">R:R ${(data.tradePlan.riskReward || 0).toFixed(1)}:1</div>
            <div style="font-size: 8px; color: #64748b;">Win: ${data.tradePlan.winRateEstimate || 0}%</div>
          </div>

          <!-- Step 6 -->
          <div style="width: calc(33.33% - 6px); background: #f8fafc; border-radius: 6px; padding: 10px; border-left: 4px solid #dc2626;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <span style="font-size: 10px; font-weight: bold;">6. Traps</span>
              <span style="font-size: 8px; font-weight: bold; color: #fff; background: ${(data.trapCheck?.traps?.bullTrap || data.trapCheck?.traps?.bearTrap) ? '#dc2626' : '#16a34a'}; padding: 2px 6px; border-radius: 3px;">${(data.trapCheck?.traps?.bullTrap || data.trapCheck?.traps?.bearTrap) ? 'WARN' : 'OK'}</span>
            </div>
            <div style="font-size: 8px; color: #64748b;">Fakeout: ${data.trapCheck?.traps?.fakeoutRisk || 'low'}</div>
          </div>
        </div>
      </div>

      <!-- AI Expert Comment -->
      ${data.aiExpertComment ? `
      <div style="background: #ecfdf5; border: 1px solid #6ee7b7; border-radius: 8px; padding: 12px; margin-bottom: 15px;">
        <div style="font-size: 11px; font-weight: bold; color: #047857; margin-bottom: 8px;">🤖 AI Expert Analysis</div>
        <div style="font-size: 9px; color: #065f46; line-height: 1.5;">${data.aiExpertComment.slice(0, 600)}${data.aiExpertComment.length > 600 ? '...' : ''}</div>
      </div>
      ` : ''}

      <!-- Risk Warning -->
      <div style="background: #fef3c7; border-radius: 6px; padding: 10px; margin-bottom: 15px;">
        <div style="font-size: 8px; color: #92400e; text-align: center;">
          ⚠️ This report is for educational purposes only and is not investment advice. Cryptocurrency investments carry high risk.
        </div>
      </div>

      <!-- Footer -->
      <div style="position: absolute; bottom: 20px; left: 30px; right: 30px; display: flex; justify-content: space-between; border-top: 1px solid #e2e8f0; padding-top: 10px;">
        <span style="font-size: 8px; color: #64748b;">Report ID: ${data.analysisId?.slice(-12) || 'N/A'}</span>
        <span style="font-size: 8px; color: #64748b;">TradePath AI • Page 1/2</span>
      </div>
    </div>
  `;
}

// Generate HTML for Page 2
function generatePage2HTML(data: AnalysisReportData): string {
  return `
    <div style="width: 595px; height: 842px; padding: 30px; font-family: Arial, sans-serif; background: #fff; position: relative; box-sizing: border-box;">

      <!-- Header -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #1e293b; padding-bottom: 15px; margin-bottom: 20px;">
        <div style="font-size: 24px; font-weight: bold;">
          <span style="color: #dc2626;">Trade</span><span style="color: #16a34a;">Path</span>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 18px; font-weight: bold; color: #1e293b;">${data.symbol}/USDT</div>
          <div style="font-size: 10px; color: #64748b;">Trade Plan Chart</div>
        </div>
      </div>

      <!-- Chart -->
      <div style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; margin-bottom: 25px;">
        <div style="background: #f8fafc; padding: 10px 15px; border-bottom: 1px solid #e2e8f0;">
          <div style="font-size: 12px; font-weight: bold;">📊 ${data.symbol}/USDT - Entry, Stop Loss & Take Profit Levels</div>
        </div>
        ${data.chartImage
          ? `<img src="${data.chartImage}" style="width: 100%; height: 300px; object-fit: contain; display: block;" />`
          : `<div style="height: 300px; display: flex; align-items: center; justify-content: center; color: #64748b; font-size: 14px; background: #f8fafc;">Chart not available - Run analysis with chart visible</div>`
        }
      </div>

      <!-- Quick Reference -->
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
        <div style="font-size: 12px; font-weight: bold; color: #1e293b; margin-bottom: 15px; text-transform: uppercase;">Quick Reference</div>
        <div style="display: flex; gap: 15px;">
          <div style="flex: 1; text-align: center;">
            <div style="font-size: 9px; color: #64748b; margin-bottom: 5px;">ENTRY</div>
            <div style="font-size: 16px; font-weight: bold; color: #2563eb;">${formatPrice(data.tradePlan.averageEntry)}</div>
          </div>
          <div style="flex: 1; text-align: center;">
            <div style="font-size: 9px; color: #64748b; margin-bottom: 5px;">STOP LOSS</div>
            <div style="font-size: 16px; font-weight: bold; color: #dc2626;">${formatPrice(data.tradePlan.stopLoss?.price)}</div>
          </div>
          <div style="flex: 1; text-align: center;">
            <div style="font-size: 9px; color: #64748b; margin-bottom: 5px;">TP1</div>
            <div style="font-size: 16px; font-weight: bold; color: #16a34a;">${formatPrice(data.tradePlan.takeProfits?.[0]?.price)}</div>
          </div>
          <div style="flex: 1; text-align: center;">
            <div style="font-size: 9px; color: #64748b; margin-bottom: 5px;">TP2</div>
            <div style="font-size: 16px; font-weight: bold; color: #16a34a;">${formatPrice(data.tradePlan.takeProfits?.[1]?.price)}</div>
          </div>
          <div style="flex: 1; text-align: center;">
            <div style="font-size: 9px; color: #64748b; margin-bottom: 5px;">TP3</div>
            <div style="font-size: 16px; font-weight: bold; color: #16a34a;">${formatPrice(data.tradePlan.takeProfits?.[2]?.price)}</div>
          </div>
        </div>
      </div>

      <!-- AI Summary -->
      ${data.verdict.aiSummary ? `
      <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px;">
        <div style="font-size: 11px; font-weight: bold; margin-bottom: 10px; color: #1e293b;">📝 AI Analysis Summary</div>
        <div style="font-size: 9px; color: #64748b; line-height: 1.6;">${data.verdict.aiSummary}</div>
      </div>
      ` : ''}

      <!-- Footer -->
      <div style="position: absolute; bottom: 20px; left: 30px; right: 30px; display: flex; justify-content: space-between; border-top: 1px solid #e2e8f0; padding-top: 10px;">
        <span style="font-size: 8px; color: #64748b;">Generated: ${data.generatedAt}</span>
        <span style="font-size: 8px; color: #64748b;">TradePath AI • Page 2/2</span>
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

    // Make sure element is visible
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

  // Create PDF (A4: 595 x 842 points)
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  // Render Page 1
  const container1 = document.createElement('div');
  container1.innerHTML = generatePage1HTML(data);
  container1.style.cssText = 'position: fixed; left: -9999px; top: 0;';
  document.body.appendChild(container1);

  await new Promise(resolve => setTimeout(resolve, 100));

  const canvas1 = await html2canvas(container1.firstElementChild as HTMLElement, {
    backgroundColor: '#ffffff',
    scale: 2,
    logging: false,
    width: 595,
    height: 842,
  });

  document.body.removeChild(container1);

  const imgData1 = canvas1.toDataURL('image/png');
  pdf.addImage(imgData1, 'PNG', 0, 0, 595, 842);

  // Render Page 2
  pdf.addPage();

  const container2 = document.createElement('div');
  container2.innerHTML = generatePage2HTML(data);
  container2.style.cssText = 'position: fixed; left: -9999px; top: 0;';
  document.body.appendChild(container2);

  await new Promise(resolve => setTimeout(resolve, 100));

  const canvas2 = await html2canvas(container2.firstElementChild as HTMLElement, {
    backgroundColor: '#ffffff',
    scale: 2,
    logging: false,
    width: 595,
    height: 842,
  });

  document.body.removeChild(container2);

  const imgData2 = canvas2.toDataURL('image/png');
  pdf.addImage(imgData2, 'PNG', 0, 0, 595, 842);

  // Save
  const filename = `TradePath_${data.symbol}_Report_${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(filename);
}

export type { AnalysisReportData as ReportData };
