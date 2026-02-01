// ===========================================
// Capital Flow Professional Report Generator
// 2026 Professional PDF & Email Report System
// ===========================================

import { jsPDF } from 'jspdf';

// Types
interface GlobalLiquidity {
  fedBalanceSheet: { value: number; change30d: number; trend: string };
  m2MoneySupply: { value: number; change30d: number; yoyGrowth: number };
  dxy: { value: number; change7d: number; trend: string };
  vix: { value: number; level: string };
  yieldCurve: { spread10y2y: number; inverted: boolean; interpretation: string };
}

interface MarketFlow {
  market: string;
  flow7d: number;
  flow30d: number;
  flowVelocity: number;
  phase: string;
  daysInPhase: number;
  rotationSignal: string | null;
}

interface FlowRecommendation {
  primaryMarket: string;
  phase: string;
  action: string;
  direction: string;
  reason: string;
  sectors?: string[];
  confidence: number;
}

interface CapitalFlowData {
  globalLiquidity: GlobalLiquidity;
  liquidityBias: string;
  markets: MarketFlow[];
  recommendation: FlowRecommendation;
  timestamp: string;
}

// Color Palette
const COLORS = {
  primary: '#0D9488',      // Teal
  secondary: '#F97316',    // Orange/Coral
  success: '#10B981',      // Green
  danger: '#EF4444',       // Red
  warning: '#F59E0B',      // Amber
  dark: '#0F172A',         // Slate 900
  light: '#F8FAFC',        // Slate 50
  muted: '#64748B',        // Slate 500
  border: '#E2E8F0',       // Slate 200
};

// Utility Functions
function formatNumber(num: number, decimals = 2): string {
  if (Math.abs(num) >= 1e12) return (num / 1e12).toFixed(decimals) + 'T';
  if (Math.abs(num) >= 1e9) return (num / 1e9).toFixed(decimals) + 'B';
  if (Math.abs(num) >= 1e6) return (num / 1e6).toFixed(decimals) + 'M';
  if (Math.abs(num) >= 1e3) return (num / 1e3).toFixed(decimals) + 'K';
  return num.toFixed(decimals);
}

function formatPercent(num: number): string {
  const sign = num >= 0 ? '+' : '';
  return sign + num.toFixed(2) + '%';
}

function getPhaseColor(phase: string): string {
  switch (phase?.toLowerCase()) {
    case 'early': return COLORS.success;
    case 'mid': return COLORS.warning;
    case 'late': return '#F97316';
    case 'exit': return COLORS.danger;
    default: return COLORS.muted;
  }
}

function getBiasColor(bias: string): string {
  switch (bias) {
    case 'risk_on': return COLORS.success;
    case 'risk_off': return COLORS.danger;
    default: return COLORS.warning;
  }
}

function getDirectionColor(direction: string): string {
  return direction === 'BUY' ? COLORS.success : COLORS.danger;
}

// ===========================================
// PDF Report Generator
// ===========================================

export async function generateCapitalFlowPDF(data: CapitalFlowData): Promise<Blob> {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);
  let y = margin;

  // Helper: Add new page if needed
  const checkPageBreak = (requiredSpace: number) => {
    if (y + requiredSpace > pageHeight - margin) {
      pdf.addPage();
      y = margin;
      return true;
    }
    return false;
  };

  // Helper: Draw rounded rectangle
  const drawRoundedRect = (x: number, yPos: number, w: number, h: number, r: number, fill: string, stroke?: string) => {
    pdf.setFillColor(fill);
    if (stroke) pdf.setDrawColor(stroke);
    pdf.roundedRect(x, yPos, w, h, r, r, stroke ? 'FD' : 'F');
  };

  // ===========================================
  // PAGE 1: Cover & Executive Summary
  // ===========================================

  // Background gradient effect (dark header)
  pdf.setFillColor('#0F172A');
  pdf.rect(0, 0, pageWidth, 80, 'F');

  // Logo and branding
  y = 20;
  pdf.setTextColor('#FFFFFF');
  pdf.setFontSize(28);
  pdf.setFont('helvetica', 'bold');
  pdf.text('TraderPath', margin, y);

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor('#94A3B8');
  pdf.text('Capital Flow Intelligence Report', margin, y + 8);

  // Report date
  const reportDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  pdf.setFontSize(9);
  pdf.text(reportDate, pageWidth - margin, y, { align: 'right' });

  // Main recommendation badge
  y = 50;
  const direction = data.recommendation?.direction || 'BUY';
  const confidence = data.recommendation?.confidence || 0;
  const badgeColor = getDirectionColor(direction);

  drawRoundedRect(margin, y, 50, 18, 3, badgeColor);
  pdf.setTextColor('#FFFFFF');
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text(direction, margin + 25, y + 12, { align: 'center' });

  // Confidence score
  pdf.setTextColor('#94A3B8');
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`${confidence}% Confidence`, margin + 55, y + 12);

  // Primary market
  const primaryMarket = data.recommendation?.primaryMarket?.toUpperCase() || 'N/A';
  pdf.setTextColor('#FFFFFF');
  pdf.setFontSize(12);
  pdf.text(`Primary Market: ${primaryMarket}`, pageWidth - margin, y + 12, { align: 'right' });

  // ===========================================
  // Executive Summary Section
  // ===========================================
  y = 95;

  pdf.setTextColor(COLORS.primary);
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Executive Summary', margin, y);

  y += 8;
  pdf.setDrawColor(COLORS.primary);
  pdf.setLineWidth(0.5);
  pdf.line(margin, y, margin + 40, y);

  y += 10;

  // Summary box
  drawRoundedRect(margin, y, contentWidth, 35, 3, '#F8FAFC', COLORS.border);

  pdf.setTextColor(COLORS.dark);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');

  const reason = data.recommendation?.reason || 'Analysis in progress...';
  const splitReason = pdf.splitTextToSize(reason, contentWidth - 10);
  pdf.text(splitReason, margin + 5, y + 8);

  // Liquidity Bias indicator
  const bias = data.liquidityBias || 'neutral';
  const biasLabel = bias === 'risk_on' ? 'RISK-ON' : bias === 'risk_off' ? 'RISK-OFF' : 'NEUTRAL';
  const biasColor = getBiasColor(bias);

  drawRoundedRect(margin + 5, y + 22, 25, 8, 2, biasColor);
  pdf.setTextColor('#FFFFFF');
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  pdf.text(biasLabel, margin + 17.5, y + 27.5, { align: 'center' });

  // Phase indicator
  const phase = data.recommendation?.phase || 'N/A';
  const phaseColor = getPhaseColor(phase);
  drawRoundedRect(margin + 35, y + 22, 20, 8, 2, phaseColor);
  pdf.setTextColor('#FFFFFF');
  pdf.text(phase.toUpperCase(), margin + 45, y + 27.5, { align: 'center' });

  y += 45;

  // ===========================================
  // Layer 1: Global Liquidity
  // ===========================================
  checkPageBreak(60);

  pdf.setTextColor(COLORS.dark);
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Layer 1: Global Liquidity', margin, y);

  // Layer badge
  drawRoundedRect(pageWidth - margin - 15, y - 5, 15, 7, 2, '#3B82F6');
  pdf.setTextColor('#FFFFFF');
  pdf.setFontSize(7);
  pdf.text('L1', pageWidth - margin - 7.5, y - 0.5, { align: 'center' });

  y += 10;

  const liquidity = data.globalLiquidity;
  const liquidityMetrics = [
    { label: 'Fed Balance Sheet', value: formatNumber(liquidity?.fedBalanceSheet?.value || 0), change: liquidity?.fedBalanceSheet?.change30d || 0 },
    { label: 'M2 Money Supply', value: formatNumber(liquidity?.m2MoneySupply?.value || 0), change: liquidity?.m2MoneySupply?.change30d || 0 },
    { label: 'DXY Index', value: (liquidity?.dxy?.value || 0).toFixed(2), change: liquidity?.dxy?.change7d || 0 },
    { label: 'VIX', value: (liquidity?.vix?.value || 0).toFixed(2), change: 0 },
  ];

  // Metrics grid (2x2)
  const metricWidth = (contentWidth - 5) / 2;
  const metricHeight = 22;

  liquidityMetrics.forEach((metric, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = margin + (col * (metricWidth + 5));
    const yPos = y + (row * (metricHeight + 5));

    drawRoundedRect(x, yPos, metricWidth, metricHeight, 3, '#F8FAFC', COLORS.border);

    pdf.setTextColor(COLORS.muted);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text(metric.label, x + 5, yPos + 7);

    pdf.setTextColor(COLORS.dark);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text(metric.value, x + 5, yPos + 16);

    if (metric.change !== 0) {
      const changeColor = metric.change >= 0 ? COLORS.success : COLORS.danger;
      pdf.setTextColor(changeColor);
      pdf.setFontSize(8);
      pdf.text(formatPercent(metric.change), x + metricWidth - 5, yPos + 16, { align: 'right' });
    }
  });

  y += (metricHeight * 2) + 15;

  // ===========================================
  // Layer 2: Market Flow
  // ===========================================
  checkPageBreak(70);

  pdf.setTextColor(COLORS.dark);
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Layer 2: Market Flow', margin, y);

  // Layer badge
  drawRoundedRect(pageWidth - margin - 15, y - 5, 15, 7, 2, '#10B981');
  pdf.setTextColor('#FFFFFF');
  pdf.setFontSize(7);
  pdf.text('L2', pageWidth - margin - 7.5, y - 0.5, { align: 'center' });

  y += 10;

  // Market flow table header
  drawRoundedRect(margin, y, contentWidth, 8, 2, COLORS.dark);
  pdf.setTextColor('#FFFFFF');
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  pdf.text('MARKET', margin + 5, y + 5.5);
  pdf.text('7D FLOW', margin + 50, y + 5.5);
  pdf.text('30D FLOW', margin + 80, y + 5.5);
  pdf.text('VELOCITY', margin + 115, y + 5.5);
  pdf.text('PHASE', margin + 150, y + 5.5);

  y += 10;

  // Market flow rows
  const markets = data.markets || [];
  markets.forEach((market, index) => {
    const rowY = y + (index * 12);
    const bgColor = index % 2 === 0 ? '#FFFFFF' : '#F8FAFC';

    drawRoundedRect(margin, rowY, contentWidth, 10, 0, bgColor);

    pdf.setTextColor(COLORS.dark);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text(market.market.toUpperCase(), margin + 5, rowY + 7);

    pdf.setFont('helvetica', 'normal');
    const flow7dColor = market.flow7d >= 0 ? COLORS.success : COLORS.danger;
    pdf.setTextColor(flow7dColor);
    pdf.text(formatPercent(market.flow7d), margin + 50, rowY + 7);

    const flow30dColor = market.flow30d >= 0 ? COLORS.success : COLORS.danger;
    pdf.setTextColor(flow30dColor);
    pdf.text(formatPercent(market.flow30d), margin + 80, rowY + 7);

    const velocityColor = market.flowVelocity >= 0 ? COLORS.success : COLORS.danger;
    pdf.setTextColor(velocityColor);
    pdf.text(market.flowVelocity.toFixed(2), margin + 115, rowY + 7);

    // Phase badge
    const phaseCol = getPhaseColor(market.phase);
    drawRoundedRect(margin + 147, rowY + 1.5, 22, 6, 2, phaseCol);
    pdf.setTextColor('#FFFFFF');
    pdf.setFontSize(6);
    pdf.setFont('helvetica', 'bold');
    pdf.text(market.phase.toUpperCase(), margin + 158, rowY + 5.5, { align: 'center' });
  });

  y += (markets.length * 12) + 15;

  // ===========================================
  // Layer 4: AI Recommendation
  // ===========================================
  checkPageBreak(50);

  pdf.setTextColor(COLORS.dark);
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Layer 4: AI Recommendation', margin, y);

  // Layer badge
  drawRoundedRect(pageWidth - margin - 15, y - 5, 15, 7, 2, '#8B5CF6');
  pdf.setTextColor('#FFFFFF');
  pdf.setFontSize(7);
  pdf.text('L4', pageWidth - margin - 7.5, y - 0.5, { align: 'center' });

  y += 10;

  // Recommendation card
  const recBgColor = direction === 'BUY' ? '#ECFDF5' : '#FEF2F2';
  const recBorderColor = direction === 'BUY' ? '#10B981' : '#EF4444';
  drawRoundedRect(margin, y, contentWidth, 40, 4, recBgColor, recBorderColor);

  // Direction and confidence
  pdf.setTextColor(recBorderColor);
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.text(direction, margin + 10, y + 15);

  pdf.setTextColor(COLORS.dark);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Confidence: ${confidence}%`, margin + 10, y + 25);

  // Target market
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`Target: ${primaryMarket}`, margin + 10, y + 35);

  // Sectors if available
  if (data.recommendation?.sectors && data.recommendation.sectors.length > 0) {
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(COLORS.muted);
    pdf.text(`Focus Sectors: ${data.recommendation.sectors.join(', ')}`, margin + 80, y + 35);
  }

  y += 50;

  // ===========================================
  // Footer
  // ===========================================

  // Footer line
  pdf.setDrawColor(COLORS.border);
  pdf.setLineWidth(0.3);
  pdf.line(margin, pageHeight - 20, pageWidth - margin, pageHeight - 20);

  // Footer text
  pdf.setTextColor(COLORS.muted);
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Generated by TraderPath Capital Flow Intelligence', margin, pageHeight - 12);
  pdf.text('This report is for informational purposes only. Not financial advice.', margin, pageHeight - 8);

  const timestamp = new Date().toISOString();
  pdf.text(timestamp, pageWidth - margin, pageHeight - 12, { align: 'right' });

  // Return as blob
  return pdf.output('blob');
}

// ===========================================
// Email HTML Report Generator
// ===========================================

export function generateCapitalFlowEmailHTML(data: CapitalFlowData): string {
  const direction = data.recommendation?.direction || 'BUY';
  const confidence = data.recommendation?.confidence || 0;
  const primaryMarket = data.recommendation?.primaryMarket?.toUpperCase() || 'N/A';
  const phase = data.recommendation?.phase || 'N/A';
  const reason = data.recommendation?.reason || 'Analysis in progress...';
  const bias = data.liquidityBias || 'neutral';
  const biasLabel = bias === 'risk_on' ? 'RISK-ON' : bias === 'risk_off' ? 'RISK-OFF' : 'NEUTRAL';

  const directionColor = direction === 'BUY' ? '#10B981' : '#EF4444';
  const directionBg = direction === 'BUY' ? '#ECFDF5' : '#FEF2F2';
  const biasColor = bias === 'risk_on' ? '#10B981' : bias === 'risk_off' ? '#EF4444' : '#F59E0B';

  const liquidity = data.globalLiquidity;
  const markets = data.markets || [];

  const reportDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TraderPath Capital Flow Report</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #F1F5F9;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF;">
    <!-- Header -->
    <tr>
      <td style="background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%); padding: 30px 25px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td>
              <h1 style="margin: 0; color: #FFFFFF; font-size: 24px; font-weight: 700;">TraderPath</h1>
              <p style="margin: 5px 0 0 0; color: #94A3B8; font-size: 12px;">Capital Flow Intelligence Report</p>
            </td>
            <td align="right">
              <span style="display: inline-block; background-color: ${directionColor}; color: #FFFFFF; padding: 8px 20px; border-radius: 6px; font-size: 16px; font-weight: 700;">${direction}</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Report Date -->
    <tr>
      <td style="padding: 15px 25px; background-color: #F8FAFC; border-bottom: 1px solid #E2E8F0;">
        <p style="margin: 0; color: #64748B; font-size: 12px;">📅 ${reportDate}</p>
      </td>
    </tr>

    <!-- Executive Summary -->
    <tr>
      <td style="padding: 25px;">
        <h2 style="margin: 0 0 15px 0; color: #0F172A; font-size: 16px; font-weight: 600;">📊 Executive Summary</h2>
        <div style="background-color: ${directionBg}; border-left: 4px solid ${directionColor}; padding: 15px; border-radius: 0 8px 8px 0;">
          <p style="margin: 0 0 10px 0; color: #0F172A; font-size: 14px; line-height: 1.6;">${reason}</p>
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding-right: 10px;">
                <span style="display: inline-block; background-color: ${biasColor}; color: #FFFFFF; padding: 4px 10px; border-radius: 4px; font-size: 10px; font-weight: 600;">${biasLabel}</span>
              </td>
              <td style="padding-right: 10px;">
                <span style="display: inline-block; background-color: ${getPhaseColor(phase)}; color: #FFFFFF; padding: 4px 10px; border-radius: 4px; font-size: 10px; font-weight: 600;">${phase.toUpperCase()}</span>
              </td>
              <td>
                <span style="color: #64748B; font-size: 12px;">${confidence}% Confidence</span>
              </td>
            </tr>
          </table>
        </div>
      </td>
    </tr>

    <!-- Key Metrics -->
    <tr>
      <td style="padding: 0 25px 25px 25px;">
        <h2 style="margin: 0 0 15px 0; color: #0F172A; font-size: 16px; font-weight: 600;">🌍 Global Liquidity (L1)</h2>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td width="50%" style="padding: 0 5px 10px 0;">
              <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px;">
                <p style="margin: 0 0 5px 0; color: #64748B; font-size: 10px;">Fed Balance Sheet</p>
                <p style="margin: 0; color: #0F172A; font-size: 16px; font-weight: 600;">${formatNumber(liquidity?.fedBalanceSheet?.value || 0)}</p>
              </div>
            </td>
            <td width="50%" style="padding: 0 0 10px 5px;">
              <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px;">
                <p style="margin: 0 0 5px 0; color: #64748B; font-size: 10px;">DXY Index</p>
                <p style="margin: 0; color: #0F172A; font-size: 16px; font-weight: 600;">${(liquidity?.dxy?.value || 0).toFixed(2)}</p>
              </div>
            </td>
          </tr>
          <tr>
            <td width="50%" style="padding: 0 5px 0 0;">
              <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px;">
                <p style="margin: 0 0 5px 0; color: #64748B; font-size: 10px;">M2 Money Supply</p>
                <p style="margin: 0; color: #0F172A; font-size: 16px; font-weight: 600;">${formatNumber(liquidity?.m2MoneySupply?.value || 0)}</p>
              </div>
            </td>
            <td width="50%" style="padding: 0 0 0 5px;">
              <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px;">
                <p style="margin: 0 0 5px 0; color: #64748B; font-size: 10px;">VIX</p>
                <p style="margin: 0; color: #0F172A; font-size: 16px; font-weight: 600;">${(liquidity?.vix?.value || 0).toFixed(2)}</p>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Market Flow -->
    <tr>
      <td style="padding: 0 25px 25px 25px;">
        <h2 style="margin: 0 0 15px 0; color: #0F172A; font-size: 16px; font-weight: 600;">📈 Market Flow (L2)</h2>
        <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #E2E8F0; border-radius: 8px; overflow: hidden;">
          <tr style="background-color: #0F172A;">
            <td style="padding: 10px; color: #FFFFFF; font-size: 10px; font-weight: 600;">MARKET</td>
            <td style="padding: 10px; color: #FFFFFF; font-size: 10px; font-weight: 600;">7D FLOW</td>
            <td style="padding: 10px; color: #FFFFFF; font-size: 10px; font-weight: 600;">30D FLOW</td>
            <td style="padding: 10px; color: #FFFFFF; font-size: 10px; font-weight: 600;">PHASE</td>
          </tr>
          ${markets.map((market, i) => `
          <tr style="background-color: ${i % 2 === 0 ? '#FFFFFF' : '#F8FAFC'};">
            <td style="padding: 12px 10px; color: #0F172A; font-size: 12px; font-weight: 600;">${market.market.toUpperCase()}</td>
            <td style="padding: 12px 10px; color: ${market.flow7d >= 0 ? '#10B981' : '#EF4444'}; font-size: 12px; font-weight: 500;">${formatPercent(market.flow7d)}</td>
            <td style="padding: 12px 10px; color: ${market.flow30d >= 0 ? '#10B981' : '#EF4444'}; font-size: 12px; font-weight: 500;">${formatPercent(market.flow30d)}</td>
            <td style="padding: 12px 10px;">
              <span style="display: inline-block; background-color: ${getPhaseColor(market.phase)}; color: #FFFFFF; padding: 3px 8px; border-radius: 4px; font-size: 9px; font-weight: 600;">${market.phase.toUpperCase()}</span>
            </td>
          </tr>
          `).join('')}
        </table>
      </td>
    </tr>

    <!-- AI Recommendation -->
    <tr>
      <td style="padding: 0 25px 25px 25px;">
        <h2 style="margin: 0 0 15px 0; color: #0F172A; font-size: 16px; font-weight: 600;">🤖 AI Recommendation (L4)</h2>
        <div style="background-color: ${directionBg}; border: 2px solid ${directionColor}; border-radius: 12px; padding: 20px; text-align: center;">
          <p style="margin: 0 0 5px 0; color: ${directionColor}; font-size: 28px; font-weight: 700;">${direction}</p>
          <p style="margin: 0 0 10px 0; color: #0F172A; font-size: 14px;">Target Market: <strong>${primaryMarket}</strong></p>
          <p style="margin: 0; color: #64748B; font-size: 12px;">Confidence Level: ${confidence}%</p>
          ${data.recommendation?.sectors && data.recommendation.sectors.length > 0 ? `
          <p style="margin: 10px 0 0 0; color: #64748B; font-size: 11px;">Focus Sectors: ${data.recommendation.sectors.join(', ')}</p>
          ` : ''}
        </div>
      </td>
    </tr>

    <!-- CTA -->
    <tr>
      <td style="padding: 0 25px 25px 25px; text-align: center;">
        <a href="https://traderpath.io/capital-flow" style="display: inline-block; background: linear-gradient(135deg, #0D9488 0%, #14B8A6 100%); color: #FFFFFF; text-decoration: none; padding: 14px 35px; border-radius: 8px; font-size: 14px; font-weight: 600;">View Live Dashboard →</a>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color: #F8FAFC; padding: 20px 25px; border-top: 1px solid #E2E8F0;">
        <p style="margin: 0 0 5px 0; color: #64748B; font-size: 10px;">Generated by TraderPath Capital Flow Intelligence</p>
        <p style="margin: 0; color: #94A3B8; font-size: 9px;">This report is for informational purposes only. Not financial advice. Past performance does not guarantee future results.</p>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

// ===========================================
// Download Report Function
// ===========================================

export async function downloadCapitalFlowReport(data: CapitalFlowData): Promise<void> {
  try {
    const blob = await generateCapitalFlowPDF(data);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const date = new Date().toISOString().split('T')[0];
    link.download = `TraderPath_CapitalFlow_Report_${date}.pdf`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 100);
  } catch (error) {
    console.error('Failed to generate PDF report:', error);
    throw new Error('Failed to generate report. Please try again.');
  }
}
