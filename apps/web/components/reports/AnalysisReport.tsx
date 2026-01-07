'use client';

// ===========================================
// TradePath Analysis Report - HTML to PDF
// Clean template-based approach using html2canvas + jsPDF
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
  return `$${price.toFixed(8)}`;
}

function getVerdictColor(action: string): { bg: string; text: string } {
  const a = (action || '').toLowerCase();
  if (a.includes('go') && !a.includes('wait') && !a.includes('conditional')) {
    return { bg: '#16a34a', text: '#ffffff' };
  }
  if (a.includes('wait') || a.includes('conditional')) {
    return { bg: '#d97706', text: '#ffffff' };
  }
  return { bg: '#dc2626', text: '#ffffff' };
}

function getStepBadgeColor(condition: boolean | string, positive: string = 'bullish'): string {
  if (typeof condition === 'boolean') {
    return condition ? '#16a34a' : '#d97706';
  }
  return condition?.toLowerCase().includes(positive) ? '#16a34a' : '#d97706';
}

// Generate HTML template for PDF
function generateReportHTML(data: AnalysisReportData): string {
  const verdictColors = getVerdictColor(data.verdict.action);
  const isLong = data.tradePlan.direction === 'long';
  const score = Math.round((data.verdict.overallScore || 0) * 10);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 12px;
          color: #0f172a;
          background: #ffffff;
          line-height: 1.4;
        }
        .page {
          width: 794px;
          min-height: 1123px;
          padding: 40px;
          background: #ffffff;
          page-break-after: always;
        }
        .page:last-child {
          page-break-after: auto;
        }

        /* Header */
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 20px;
          border-bottom: 3px solid #0f172a;
          margin-bottom: 25px;
        }
        .logo {
          font-size: 28px;
          font-weight: bold;
        }
        .logo-red { color: #dc2626; }
        .logo-green { color: #16a34a; }
        .header-right {
          text-align: right;
        }
        .symbol {
          font-size: 22px;
          font-weight: bold;
          color: #0f172a;
        }
        .date {
          font-size: 11px;
          color: #64748b;
          margin-top: 4px;
        }

        /* Verdict Box */
        .verdict-box {
          background: ${verdictColors.bg};
          color: ${verdictColors.text};
          border-radius: 12px;
          padding: 20px 25px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 25px;
        }
        .verdict-text {
          font-size: 32px;
          font-weight: bold;
        }
        .verdict-score {
          font-size: 16px;
          opacity: 0.9;
          margin-top: 4px;
        }
        .direction-badge {
          background: rgba(255,255,255,0.2);
          padding: 8px 20px;
          border-radius: 8px;
          font-size: 16px;
          font-weight: bold;
        }

        /* Section Title */
        .section-title {
          font-size: 14px;
          font-weight: bold;
          color: #0f172a;
          margin-bottom: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        /* Trade Plan Grid */
        .trade-plan-section {
          margin-bottom: 25px;
        }
        .trade-plan-grid {
          display: flex;
          gap: 10px;
        }
        .trade-plan-item {
          flex: 1;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 15px;
          text-align: center;
        }
        .trade-plan-label {
          font-size: 10px;
          font-weight: bold;
          text-transform: uppercase;
          margin-bottom: 6px;
        }
        .trade-plan-price {
          font-size: 14px;
          font-weight: bold;
        }
        .trade-plan-percent {
          font-size: 10px;
          margin-top: 4px;
        }
        .color-entry { color: #2563eb; }
        .color-stop { color: #dc2626; }
        .color-tp { color: #16a34a; }

        /* Steps Grid */
        .steps-section {
          margin-bottom: 25px;
        }
        .steps-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }
        .step-item {
          width: calc(33.33% - 7px);
          background: #f8fafc;
          border-radius: 8px;
          padding: 12px;
          border-left: 4px solid;
        }
        .step-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .step-name {
          font-size: 11px;
          font-weight: bold;
        }
        .step-badge {
          font-size: 9px;
          font-weight: bold;
          color: #ffffff;
          padding: 3px 8px;
          border-radius: 4px;
        }
        .step-metrics {
          margin-top: 6px;
        }
        .step-metric {
          display: flex;
          justify-content: space-between;
          margin-bottom: 3px;
        }
        .step-metric-label {
          font-size: 9px;
          color: #64748b;
        }
        .step-metric-value {
          font-size: 10px;
          font-weight: bold;
        }

        /* AI Expert Box */
        .ai-expert-box {
          background: #ecfdf5;
          border: 1px solid #6ee7b7;
          border-radius: 10px;
          padding: 15px;
          margin-bottom: 20px;
        }
        .ai-expert-title {
          font-size: 12px;
          font-weight: bold;
          color: #047857;
          margin-bottom: 8px;
        }
        .ai-expert-text {
          font-size: 10px;
          color: #065f46;
          line-height: 1.6;
        }

        /* Risk Warning */
        .risk-warning {
          background: #fef3c7;
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 20px;
        }
        .risk-text {
          font-size: 9px;
          color: #92400e;
          text-align: center;
          line-height: 1.5;
        }

        /* Footer */
        .footer {
          position: absolute;
          bottom: 30px;
          left: 40px;
          right: 40px;
          display: flex;
          justify-content: space-between;
          padding-top: 15px;
          border-top: 1px solid #e2e8f0;
        }
        .footer-text {
          font-size: 9px;
          color: #64748b;
        }

        /* Page 2 - Chart */
        .chart-section {
          margin-bottom: 25px;
        }
        .chart-container {
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          overflow: hidden;
        }
        .chart-header {
          background: #f8fafc;
          padding: 12px 15px;
          border-bottom: 1px solid #e2e8f0;
        }
        .chart-title {
          font-size: 13px;
          font-weight: bold;
        }
        .chart-image {
          width: 100%;
          height: auto;
          display: block;
        }
        .chart-placeholder {
          height: 300px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #64748b;
          font-size: 14px;
        }

        /* Quick Reference */
        .quick-ref-box {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 20px;
          margin-bottom: 25px;
        }
        .quick-ref-grid {
          display: flex;
          gap: 15px;
        }
        .quick-ref-item {
          flex: 1;
          text-align: center;
        }
        .quick-ref-label {
          font-size: 10px;
          color: #64748b;
          margin-bottom: 6px;
        }
        .quick-ref-value {
          font-size: 18px;
          font-weight: bold;
        }

        /* AI Summary Box */
        .summary-box {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 15px;
        }
        .summary-title {
          font-size: 12px;
          font-weight: bold;
          margin-bottom: 10px;
          color: #0f172a;
        }
        .summary-text {
          font-size: 10px;
          color: #64748b;
          line-height: 1.6;
        }
      </style>
    </head>
    <body>
      <!-- PAGE 1: Summary -->
      <div class="page">
        <!-- Header -->
        <div class="header">
          <div class="logo">
            <span class="logo-red">Trade</span><span class="logo-green">Path</span>
          </div>
          <div class="header-right">
            <div class="symbol">${data.symbol}/USDT</div>
            <div class="date">${data.generatedAt}</div>
          </div>
        </div>

        <!-- Verdict Box -->
        <div class="verdict-box">
          <div>
            <div class="verdict-text">${data.verdict.action || 'ANALYZE'}</div>
            <div class="verdict-score">Score: ${score}/100</div>
          </div>
          <div class="direction-badge">${isLong ? 'LONG' : 'SHORT'}</div>
        </div>

        <!-- Trade Plan -->
        <div class="trade-plan-section">
          <div class="section-title">Trade Plan</div>
          <div class="trade-plan-grid">
            <div class="trade-plan-item">
              <div class="trade-plan-label color-entry">ENTRY</div>
              <div class="trade-plan-price">${formatPrice(data.tradePlan.averageEntry)}</div>
            </div>
            <div class="trade-plan-item">
              <div class="trade-plan-label color-stop">STOP LOSS</div>
              <div class="trade-plan-price color-stop">${formatPrice(data.tradePlan.stopLoss?.price)}</div>
              <div class="trade-plan-percent color-stop">-${(data.tradePlan.stopLoss?.percentage || 0).toFixed(1)}%</div>
            </div>
            <div class="trade-plan-item">
              <div class="trade-plan-label color-tp">TP1</div>
              <div class="trade-plan-price color-tp">${formatPrice(data.tradePlan.takeProfits?.[0]?.price)}</div>
            </div>
            <div class="trade-plan-item">
              <div class="trade-plan-label color-tp">TP2</div>
              <div class="trade-plan-price color-tp">${formatPrice(data.tradePlan.takeProfits?.[1]?.price)}</div>
            </div>
            <div class="trade-plan-item">
              <div class="trade-plan-label color-tp">TP3</div>
              <div class="trade-plan-price color-tp">${formatPrice(data.tradePlan.takeProfits?.[2]?.price)}</div>
            </div>
          </div>
        </div>

        <!-- 6 Steps Grid -->
        <div class="steps-section">
          <div class="section-title">Analysis Steps</div>
          <div class="steps-grid">
            <!-- Step 1: Market -->
            <div class="step-item" style="border-left-color: #2563eb;">
              <div class="step-header">
                <span class="step-name">1. Market</span>
                <span class="step-badge" style="background: ${getStepBadgeColor(data.marketPulse.trend?.direction)};">
                  ${(data.marketPulse.trend?.direction || 'N/A').slice(0, 4).toUpperCase()}
                </span>
              </div>
              <div class="step-metrics">
                <div class="step-metric">
                  <span class="step-metric-label">Fear/Greed</span>
                  <span class="step-metric-value">${data.marketPulse.fearGreedIndex}</span>
                </div>
                <div class="step-metric">
                  <span class="step-metric-label">BTC Dom.</span>
                  <span class="step-metric-value">${data.marketPulse.btcDominance?.toFixed(1)}%</span>
                </div>
              </div>
            </div>

            <!-- Step 2: Asset -->
            <div class="step-item" style="border-left-color: #06b6d4;">
              <div class="step-header">
                <span class="step-name">2. Asset</span>
                <span class="step-badge" style="background: ${(data.assetScan.priceChange24h || 0) >= 0 ? '#16a34a' : '#dc2626'};">
                  ${(data.assetScan.priceChange24h || 0) >= 0 ? 'UP' : 'DOWN'}
                </span>
              </div>
              <div class="step-metrics">
                <div class="step-metric">
                  <span class="step-metric-label">Price</span>
                  <span class="step-metric-value">${formatPrice(data.assetScan.currentPrice)}</span>
                </div>
                <div class="step-metric">
                  <span class="step-metric-label">RSI</span>
                  <span class="step-metric-value">${data.assetScan.indicators?.rsi?.toFixed(0) || '-'}</span>
                </div>
              </div>
            </div>

            <!-- Step 3: Safety -->
            <div class="step-item" style="border-left-color: #f97316;">
              <div class="step-header">
                <span class="step-name">3. Safety</span>
                <span class="step-badge" style="background: ${data.safetyCheck.riskLevel === 'low' ? '#16a34a' : '#d97706'};">
                  ${(data.safetyCheck.riskLevel || 'MED').toUpperCase()}
                </span>
              </div>
              <div class="step-metrics">
                <div class="step-metric">
                  <span class="step-metric-label">Whale</span>
                  <span class="step-metric-value">${data.safetyCheck.whaleActivity?.bias || '-'}</span>
                </div>
              </div>
            </div>

            <!-- Step 4: Timing -->
            <div class="step-item" style="border-left-color: #a855f7;">
              <div class="step-header">
                <span class="step-name">4. Timing</span>
                <span class="step-badge" style="background: ${data.timing.tradeNow ? '#16a34a' : '#d97706'};">
                  ${data.timing.tradeNow ? 'NOW' : 'WAIT'}
                </span>
              </div>
              <div class="step-metrics">
                <div class="step-metric">
                  <span class="step-metric-label" style="width: 100%;">${(data.timing.reason || '-').slice(0, 30)}</span>
                </div>
              </div>
            </div>

            <!-- Step 5: Plan -->
            <div class="step-item" style="border-left-color: #6366f1;">
              <div class="step-header">
                <span class="step-name">5. Plan</span>
                <span class="step-badge" style="background: ${isLong ? '#16a34a' : '#dc2626'};">
                  ${isLong ? 'LONG' : 'SHORT'}
                </span>
              </div>
              <div class="step-metrics">
                <div class="step-metric">
                  <span class="step-metric-label">R:R</span>
                  <span class="step-metric-value">${(data.tradePlan.riskReward || 0).toFixed(1)}:1</span>
                </div>
                <div class="step-metric">
                  <span class="step-metric-label">Win%</span>
                  <span class="step-metric-value">${data.tradePlan.winRateEstimate || 0}%</span>
                </div>
              </div>
            </div>

            <!-- Step 6: Traps -->
            <div class="step-item" style="border-left-color: #dc2626;">
              <div class="step-header">
                <span class="step-name">6. Traps</span>
                <span class="step-badge" style="background: ${(data.trapCheck?.traps?.bullTrap || data.trapCheck?.traps?.bearTrap) ? '#dc2626' : '#16a34a'};">
                  ${(data.trapCheck?.traps?.bullTrap || data.trapCheck?.traps?.bearTrap) ? 'WARN' : 'OK'}
                </span>
              </div>
              <div class="step-metrics">
                <div class="step-metric">
                  <span class="step-metric-label">Fakeout</span>
                  <span class="step-metric-value">${data.trapCheck?.traps?.fakeoutRisk || 'low'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- AI Expert Comment -->
        ${data.aiExpertComment ? `
        <div class="ai-expert-box">
          <div class="ai-expert-title">🤖 AI Expert Analysis</div>
          <div class="ai-expert-text">${data.aiExpertComment}</div>
        </div>
        ` : ''}

        <!-- Risk Warning -->
        <div class="risk-warning">
          <div class="risk-text">
            ⚠️ This report is for educational purposes only and is not investment advice. Cryptocurrency investments carry high risk.
          </div>
        </div>

        <!-- Footer -->
        <div class="footer">
          <span class="footer-text">Report ID: ${data.analysisId?.slice(-12) || 'N/A'}</span>
          <span class="footer-text">TradePath AI • Page 1/2</span>
        </div>
      </div>

      <!-- PAGE 2: Chart -->
      <div class="page">
        <!-- Header -->
        <div class="header">
          <div class="logo">
            <span class="logo-red">Trade</span><span class="logo-green">Path</span>
          </div>
          <div class="header-right">
            <div class="symbol">${data.symbol}/USDT</div>
            <div class="date">Trade Plan Chart</div>
          </div>
        </div>

        <!-- Chart -->
        <div class="chart-section">
          <div class="chart-container">
            <div class="chart-header">
              <div class="chart-title">📊 ${data.symbol}/USDT - Entry, Stop Loss & Take Profit Levels</div>
            </div>
            ${data.chartImage
              ? `<img src="${data.chartImage}" class="chart-image" alt="Trade Plan Chart" />`
              : `<div class="chart-placeholder">Chart not available</div>`
            }
          </div>
        </div>

        <!-- Quick Reference -->
        <div class="quick-ref-box">
          <div class="section-title">Quick Reference</div>
          <div class="quick-ref-grid">
            <div class="quick-ref-item">
              <div class="quick-ref-label">ENTRY ZONE</div>
              <div class="quick-ref-value color-entry">${formatPrice(data.tradePlan.averageEntry)}</div>
            </div>
            <div class="quick-ref-item">
              <div class="quick-ref-label">STOP LOSS</div>
              <div class="quick-ref-value color-stop">${formatPrice(data.tradePlan.stopLoss?.price)}</div>
            </div>
            <div class="quick-ref-item">
              <div class="quick-ref-label">TP1</div>
              <div class="quick-ref-value color-tp">${formatPrice(data.tradePlan.takeProfits?.[0]?.price)}</div>
            </div>
            <div class="quick-ref-item">
              <div class="quick-ref-label">TP2</div>
              <div class="quick-ref-value color-tp">${formatPrice(data.tradePlan.takeProfits?.[1]?.price)}</div>
            </div>
            <div class="quick-ref-item">
              <div class="quick-ref-label">TP3</div>
              <div class="quick-ref-value color-tp">${formatPrice(data.tradePlan.takeProfits?.[2]?.price)}</div>
            </div>
          </div>
        </div>

        <!-- AI Summary -->
        ${data.verdict.aiSummary ? `
        <div class="summary-box">
          <div class="summary-title">📝 AI Analysis Summary</div>
          <div class="summary-text">${data.verdict.aiSummary}</div>
        </div>
        ` : ''}

        <!-- Footer -->
        <div class="footer">
          <span class="footer-text">Generated: ${data.generatedAt}</span>
          <span class="footer-text">TradePath AI • Page 2/2</span>
        </div>
      </div>
    </body>
    </html>
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

    const parent = element.parentElement;
    const originalStyle = parent?.getAttribute('style') || '';

    // Move into view for capture
    if (parent) {
      parent.style.cssText = 'position: fixed; left: 0; top: 0; width: 800px; z-index: 9999; background: #fff;';
    }

    await new Promise(resolve => setTimeout(resolve, 1500));

    const canvas = await html2canvas(element, {
      backgroundColor: '#ffffff',
      scale: 2,
      logging: false,
      useCORS: true,
      allowTaint: true,
      width: 800,
      windowWidth: 800,
    });

    if (parent) {
      parent.style.cssText = originalStyle;
    }

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

  // Generate HTML
  const html = generateReportHTML(data);

  // Create a hidden container for rendering
  const container = document.createElement('div');
  container.style.cssText = 'position: fixed; left: -9999px; top: 0; width: 794px;';
  container.innerHTML = html;
  document.body.appendChild(container);

  // Wait for images to load
  await new Promise(resolve => setTimeout(resolve, 500));

  try {
    // Get all pages
    const pages = container.querySelectorAll('.page');

    // Create PDF (A4 size)
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'px',
      format: 'a4',
      hotfixes: ['px_scaling'],
    });

    // Process each page
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i] as HTMLElement;

      // Render page to canvas
      const canvas = await html2canvas(page, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
        width: 794,
        windowWidth: 794,
      });

      // Add page to PDF
      const imgData = canvas.toDataURL('image/png');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      if (i > 0) {
        pdf.addPage();
      }

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    }

    // Save PDF
    const filename = `TradePath_${data.symbol}_Report_${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(filename);

  } finally {
    // Cleanup
    document.body.removeChild(container);
  }
}

export type { AnalysisReportData as ReportData };
