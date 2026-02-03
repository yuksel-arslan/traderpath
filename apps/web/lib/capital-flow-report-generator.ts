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
// PDF Report Generator - Single Page Corporate Style
// ===========================================

export async function generateCapitalFlowPDF(data: CapitalFlowData): Promise<Blob> {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 12;
  const contentWidth = pageWidth - (margin * 2);

  // Helper: Draw rounded rectangle
  const drawRoundedRect = (x: number, yPos: number, w: number, h: number, r: number, fill: string, stroke?: string) => {
    pdf.setFillColor(fill);
    if (stroke) pdf.setDrawColor(stroke);
    pdf.roundedRect(x, yPos, w, h, r, r, stroke ? 'FD' : 'F');
  };

  // ===========================================
  // HEADER - Compact Corporate Style
  // ===========================================

  // Dark header bar
  pdf.setFillColor('#0F172A');
  pdf.rect(0, 0, pageWidth, 42, 'F');

  // Teal accent line
  pdf.setFillColor(COLORS.primary);
  pdf.rect(0, 42, pageWidth, 1.5, 'F');

  // Logo (4-dot star)
  const logoX = margin;
  const logoY = 10;
  const dotSize = 3;
  pdf.setFillColor(COLORS.primary);
  pdf.circle(logoX + dotSize, logoY, dotSize/2, 'F');
  pdf.setFillColor(COLORS.secondary);
  pdf.circle(logoX + dotSize*2.5, logoY, dotSize/2, 'F');
  pdf.setFillColor(COLORS.primary);
  pdf.circle(logoX + dotSize, logoY + dotSize*1.5, dotSize/2, 'F');
  pdf.setFillColor(COLORS.secondary);
  pdf.circle(logoX + dotSize*2.5, logoY + dotSize*1.5, dotSize/2, 'F');

  // Brand name
  pdf.setTextColor('#FFFFFF');
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.text('TraderPath', logoX + dotSize*4, logoY + 5);

  // Subtitle
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor('#94A3B8');
  pdf.text('Capital Flow Intelligence Report', logoX + dotSize*4, logoY + 10);

  // Report date - right side
  const reportDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  pdf.setFontSize(8);
  pdf.setTextColor('#64748B');
  pdf.text(reportDate, pageWidth - margin, logoY + 2, { align: 'right' });

  // Main recommendation - right side prominent
  const direction = data.recommendation?.direction || 'BUY';
  const confidence = data.recommendation?.confidence || 0;
  const primaryMarket = data.recommendation?.primaryMarket?.toUpperCase() || 'N/A';
  const dirColor = getDirectionColor(direction);

  drawRoundedRect(pageWidth - margin - 35, logoY + 8, 35, 14, 3, dirColor);
  pdf.setTextColor('#FFFFFF');
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text(direction, pageWidth - margin - 17.5, logoY + 17, { align: 'center' });

  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor('#94A3B8');
  pdf.text(`${confidence}% • ${primaryMarket}`, pageWidth - margin - 17.5, logoY + 24, { align: 'center' });

  // ===========================================
  // MAIN CONTENT - 2 Column Layout
  // ===========================================

  let y = 50;
  const colWidth = (contentWidth - 6) / 2;
  const leftCol = margin;
  const rightCol = margin + colWidth + 6;

  // --- LEFT COLUMN ---

  // LAYER 1: Global Liquidity
  pdf.setTextColor(COLORS.dark);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.text('GLOBAL LIQUIDITY', leftCol, y);

  // L1 badge
  drawRoundedRect(leftCol + 48, y - 4, 10, 5, 1.5, '#3B82F6');
  pdf.setTextColor('#FFFFFF');
  pdf.setFontSize(5);
  pdf.text('L1', leftCol + 53, y - 1, { align: 'center' });

  y += 5;

  const liquidity = data.globalLiquidity;
  const bias = data.liquidityBias || 'neutral';
  const biasLabel = bias === 'risk_on' ? 'RISK-ON' : bias === 'risk_off' ? 'RISK-OFF' : 'NEUTRAL';
  const biasColor = getBiasColor(bias);

  // Bias badge
  drawRoundedRect(leftCol, y, 22, 6, 2, biasColor);
  pdf.setTextColor('#FFFFFF');
  pdf.setFontSize(5);
  pdf.setFont('helvetica', 'bold');
  pdf.text(biasLabel, leftCol + 11, y + 4, { align: 'center' });

  y += 10;

  // Liquidity metrics - compact 2x2 grid
  const liqMetrics = [
    { label: 'Fed B/S', value: formatNumber(liquidity?.fedBalanceSheet?.value || 0), change: liquidity?.fedBalanceSheet?.change30d || 0 },
    { label: 'M2', value: formatNumber(liquidity?.m2MoneySupply?.value || 0), change: liquidity?.m2MoneySupply?.change30d || 0 },
    { label: 'DXY', value: (liquidity?.dxy?.value || 0).toFixed(1), change: liquidity?.dxy?.change7d || 0 },
    { label: 'VIX', value: (liquidity?.vix?.value || 0).toFixed(1), level: liquidity?.vix?.level || '' },
  ];

  const metricW = (colWidth - 3) / 2;
  const metricH = 16;

  liqMetrics.forEach((metric, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const mx = leftCol + (col * (metricW + 3));
    const my = y + (row * (metricH + 3));

    drawRoundedRect(mx, my, metricW, metricH, 2, '#F8FAFC', COLORS.border);

    pdf.setTextColor(COLORS.muted);
    pdf.setFontSize(6);
    pdf.setFont('helvetica', 'normal');
    pdf.text(metric.label, mx + 3, my + 5);

    pdf.setTextColor(COLORS.dark);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text(metric.value, mx + 3, my + 12);

    if (metric.change && metric.change !== 0) {
      const chgColor = metric.change >= 0 ? COLORS.success : COLORS.danger;
      pdf.setTextColor(chgColor);
      pdf.setFontSize(6);
      pdf.text(formatPercent(metric.change), mx + metricW - 3, my + 12, { align: 'right' });
    }
  });

  y += (metricH * 2) + 12;

  // LAYER 2: Market Flow
  pdf.setTextColor(COLORS.dark);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.text('MARKET FLOW', leftCol, y);

  // L2 badge
  drawRoundedRect(leftCol + 36, y - 4, 10, 5, 1.5, '#10B981');
  pdf.setTextColor('#FFFFFF');
  pdf.setFontSize(5);
  pdf.text('L2', leftCol + 41, y - 1, { align: 'center' });

  y += 6;

  // Market table - compact
  const markets = data.markets || [];
  const rowH = 9;

  // Table header
  drawRoundedRect(leftCol, y, colWidth, 7, 1, COLORS.dark);
  pdf.setTextColor('#FFFFFF');
  pdf.setFontSize(5);
  pdf.setFont('helvetica', 'bold');
  pdf.text('MARKET', leftCol + 3, y + 4.5);
  pdf.text('7D', leftCol + 30, y + 4.5);
  pdf.text('30D', leftCol + 45, y + 4.5);
  pdf.text('PHASE', leftCol + 65, y + 4.5);

  y += 8;

  markets.forEach((market, idx) => {
    const rowY = y + (idx * rowH);
    const bgCol = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';

    drawRoundedRect(leftCol, rowY, colWidth, rowH - 1, 0, bgCol);

    pdf.setTextColor(COLORS.dark);
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'bold');
    pdf.text(market.market.toUpperCase(), leftCol + 3, rowY + 6);

    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(market.flow7d >= 0 ? COLORS.success : COLORS.danger);
    pdf.text(formatPercent(market.flow7d), leftCol + 28, rowY + 6);

    pdf.setTextColor(market.flow30d >= 0 ? COLORS.success : COLORS.danger);
    pdf.text(formatPercent(market.flow30d), leftCol + 43, rowY + 6);

    // Phase badge
    const phColor = getPhaseColor(market.phase);
    drawRoundedRect(leftCol + 62, rowY + 1.5, 18, 5, 1.5, phColor);
    pdf.setTextColor('#FFFFFF');
    pdf.setFontSize(4.5);
    pdf.setFont('helvetica', 'bold');
    pdf.text(market.phase.toUpperCase(), leftCol + 71, rowY + 5, { align: 'center' });
  });

  // --- RIGHT COLUMN ---

  let ry = 50;

  // LAYER 4: AI Recommendation
  pdf.setTextColor(COLORS.dark);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.text('AI RECOMMENDATION', rightCol, ry);

  // L4 badge
  drawRoundedRect(rightCol + 52, ry - 4, 10, 5, 1.5, '#8B5CF6');
  pdf.setTextColor('#FFFFFF');
  pdf.setFontSize(5);
  pdf.text('L4', rightCol + 57, ry - 1, { align: 'center' });

  ry += 6;

  // Large recommendation card
  const recBgColor = direction === 'BUY' ? '#ECFDF5' : '#FEF2F2';
  const recBorderColor = direction === 'BUY' ? '#10B981' : '#EF4444';
  drawRoundedRect(rightCol, ry, colWidth, 50, 4, recBgColor, recBorderColor);

  // Direction - large
  pdf.setTextColor(recBorderColor);
  pdf.setFontSize(28);
  pdf.setFont('helvetica', 'bold');
  pdf.text(direction, rightCol + colWidth/2, ry + 18, { align: 'center' });

  // Confidence bar
  const barWidth = colWidth - 20;
  const barHeight = 6;
  const barX = rightCol + 10;
  const barY = ry + 25;

  drawRoundedRect(barX, barY, barWidth, barHeight, 2, '#E2E8F0');
  drawRoundedRect(barX, barY, (barWidth * confidence) / 100, barHeight, 2, recBorderColor);

  pdf.setTextColor(COLORS.dark);
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`${confidence}% Confidence`, rightCol + colWidth/2, barY + 12, { align: 'center' });

  // Target & Phase
  const phase = data.recommendation?.phase || 'N/A';
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`Target: ${primaryMarket}`, rightCol + 8, ry + 44);

  const phaseColor = getPhaseColor(phase);
  drawRoundedRect(rightCol + colWidth - 25, ry + 38, 20, 7, 2, phaseColor);
  pdf.setTextColor('#FFFFFF');
  pdf.setFontSize(5);
  pdf.text(phase.toUpperCase(), rightCol + colWidth - 15, ry + 43, { align: 'center' });

  ry += 58;

  // Executive Summary Box
  pdf.setTextColor(COLORS.dark);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.text('EXECUTIVE SUMMARY', rightCol, ry);

  ry += 6;

  drawRoundedRect(rightCol, ry, colWidth, 45, 3, '#F8FAFC', COLORS.border);

  const reason = data.recommendation?.reason || 'Analysis in progress...';
  const splitReason = pdf.splitTextToSize(reason, colWidth - 8);

  pdf.setTextColor(COLORS.dark);
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  pdf.text(splitReason.slice(0, 6), rightCol + 4, ry + 7); // Max 6 lines

  ry += 52;

  // Sectors (if available)
  if (data.recommendation?.sectors && data.recommendation.sectors.length > 0) {
    pdf.setTextColor(COLORS.dark);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text('FOCUS SECTORS', rightCol, ry);

    ry += 6;

    const sectors = data.recommendation.sectors.slice(0, 6); // Max 6 sectors
    sectors.forEach((sector, idx) => {
      const sectorX = rightCol + (idx % 3) * (colWidth / 3);
      const sectorY = ry + Math.floor(idx / 3) * 10;

      drawRoundedRect(sectorX, sectorY, colWidth/3 - 2, 8, 2, COLORS.primary);
      pdf.setTextColor('#FFFFFF');
      pdf.setFontSize(5);
      pdf.setFont('helvetica', 'bold');
      const sectorName = sector.length > 8 ? sector.substring(0, 8) + '..' : sector;
      pdf.text(sectorName.toUpperCase(), sectorX + (colWidth/6 - 1), sectorY + 5.5, { align: 'center' });
    });
  }

  // ===========================================
  // FOOTER
  // ===========================================

  // Footer separator line
  pdf.setDrawColor(COLORS.border);
  pdf.setLineWidth(0.3);
  pdf.line(margin, pageHeight - 18, pageWidth - margin, pageHeight - 18);

  // Footer content
  pdf.setTextColor(COLORS.muted);
  pdf.setFontSize(6);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Generated by TraderPath Capital Flow Intelligence • traderpath.io', margin, pageHeight - 12);
  pdf.text('This report is for informational purposes only. Not financial advice.', margin, pageHeight - 8);

  const timestamp = new Date().toISOString().split('T')[0];
  pdf.text(`Report ID: CF-${timestamp}`, pageWidth - margin, pageHeight - 12, { align: 'right' });

  // Page number
  pdf.setFontSize(7);
  pdf.text('Page 1 of 1', pageWidth - margin, pageHeight - 8, { align: 'right' });

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
