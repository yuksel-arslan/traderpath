// ===========================================
// Capital Flow Professional Report Generator
// 2026 Professional PDF Report System
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

// Helper: Draw TraderPath Star Logo
function drawStarLogo(pdf: jsPDF, centerX: number, centerY: number, size: number) {
  const scale = size / 200; // Original viewBox is 200x200

  // Star points coordinates (scaled)
  const points = {
    top: { x: centerX, y: centerY - 85 * scale },
    right: { x: centerX + 85 * scale, y: centerY },
    bottom: { x: centerX, y: centerY + 85 * scale },
    left: { x: centerX - 85 * scale, y: centerY },
    center: { x: centerX, y: centerY },
    // Inner points for 3D effect
    topLeft: { x: centerX - 30 * scale, y: centerY - 25 * scale },
    topRight: { x: centerX + 30 * scale, y: centerY - 25 * scale },
    bottomLeft: { x: centerX - 30 * scale, y: centerY + 25 * scale },
    bottomRight: { x: centerX + 30 * scale, y: centerY + 25 * scale },
  };

  // TOP POINT - Teal (left face bright, right face dark)
  pdf.setFillColor('#2DD4BF'); // Teal bright
  pdf.triangle(points.top.x, points.top.y, points.center.x, points.center.y, points.topLeft.x, points.topLeft.y, 'F');
  pdf.setFillColor('#0D9488'); // Teal dark
  pdf.triangle(points.top.x, points.top.y, points.topRight.x, points.topRight.y, points.center.x, points.center.y, 'F');

  // RIGHT POINT - Coral (top face bright, bottom face dark)
  pdf.setFillColor('#F87171'); // Coral bright
  pdf.triangle(points.right.x, points.right.y, points.center.x, points.center.y, points.topRight.x, points.topRight.y, 'F');
  pdf.setFillColor('#DC2626'); // Coral dark
  pdf.triangle(points.right.x, points.right.y, points.bottomRight.x, points.bottomRight.y, points.center.x, points.center.y, 'F');

  // BOTTOM POINT - Coral (right face bright, left face dark)
  pdf.setFillColor('#F87171'); // Coral bright
  pdf.triangle(points.bottom.x, points.bottom.y, points.center.x, points.center.y, points.bottomRight.x, points.bottomRight.y, 'F');
  pdf.setFillColor('#DC2626'); // Coral dark
  pdf.triangle(points.bottom.x, points.bottom.y, points.bottomLeft.x, points.bottomLeft.y, points.center.x, points.center.y, 'F');

  // LEFT POINT - Teal (bottom face bright, top face dark)
  pdf.setFillColor('#2DD4BF'); // Teal bright
  pdf.triangle(points.left.x, points.left.y, points.center.x, points.center.y, points.bottomLeft.x, points.bottomLeft.y, 'F');
  pdf.setFillColor('#0D9488'); // Teal dark
  pdf.triangle(points.left.x, points.left.y, points.topLeft.x, points.topLeft.y, points.center.x, points.center.y, 'F');
}

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

  // Helper: Draw rounded rectangle
  const drawRoundedRect = (x: number, yPos: number, w: number, h: number, r: number, fill: string, stroke?: string) => {
    pdf.setFillColor(fill);
    if (stroke) pdf.setDrawColor(stroke);
    pdf.roundedRect(x, yPos, w, h, r, r, stroke ? 'FD' : 'F');
  };

  // ===========================================
  // HEADER - Corporate Style with Star Logo
  // ===========================================

  let y = 15;

  // Draw Star Logo
  drawStarLogo(pdf, margin + 8, y + 8, 40);

  // Brand name with gradient colors (Trader in teal, Path in coral)
  pdf.setFontSize(22);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor('#0D9488'); // Teal
  pdf.text('Trader', margin + 22, y + 10);
  const traderWidth = pdf.getTextWidth('Trader');
  pdf.setTextColor('#DC2626'); // Coral
  pdf.text('Path', margin + 22 + traderWidth, y + 10);

  // Report date - right aligned
  const reportDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(COLORS.muted);
  pdf.text(reportDate, pageWidth - margin, y + 5, { align: 'right' });

  y += 22;

  // Teal accent line
  pdf.setFillColor(COLORS.primary);
  pdf.rect(margin, y, contentWidth, 1, 'F');

  y += 8;

  // ===========================================
  // REPORT TITLE - Executive Summary
  // ===========================================

  pdf.setTextColor(COLORS.dark);
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Executive Summary', margin, y);

  y += 10;

  // ===========================================
  // AI RECOMMENDATION - Prominent Card
  // ===========================================

  const direction = data.recommendation?.direction || 'BUY';
  const confidence = data.recommendation?.confidence || 0;
  const primaryMarket = data.recommendation?.primaryMarket?.toUpperCase() || 'N/A';
  const phase = data.recommendation?.phase || 'N/A';
  const reason = data.recommendation?.reason || 'Analysis in progress...';

  const recBgColor = direction === 'BUY' ? '#ECFDF5' : '#FEF2F2';
  const recBorderColor = direction === 'BUY' ? '#10B981' : '#EF4444';

  drawRoundedRect(margin, y, contentWidth, 38, 4, recBgColor, recBorderColor);

  // Direction badge
  drawRoundedRect(margin + 8, y + 8, 45, 22, 4, recBorderColor);
  pdf.setTextColor('#FFFFFF');
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.text(direction, margin + 30.5, y + 22, { align: 'center' });

  // Confidence and details
  pdf.setTextColor(COLORS.dark);
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`${confidence}% Confidence`, margin + 62, y + 15);

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Primary Market: ${primaryMarket}`, margin + 62, y + 24);

  // Phase badge
  const phaseColor = getPhaseColor(phase);
  drawRoundedRect(margin + 62, y + 27, 25, 7, 2, phaseColor);
  pdf.setTextColor('#FFFFFF');
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  pdf.text(phase.toUpperCase(), margin + 74.5, y + 32, { align: 'center' });

  // Bias badge
  const bias = data.liquidityBias || 'neutral';
  const biasLabel = bias === 'risk_on' ? 'RISK-ON' : bias === 'risk_off' ? 'RISK-OFF' : 'NEUTRAL';
  const biasColor = getBiasColor(bias);
  drawRoundedRect(margin + 92, y + 27, 28, 7, 2, biasColor);
  pdf.setTextColor('#FFFFFF');
  pdf.text(biasLabel, margin + 106, y + 32, { align: 'center' });

  y += 46;

  // ===========================================
  // ANALYSIS SUMMARY
  // ===========================================

  drawRoundedRect(margin, y, contentWidth, 28, 3, '#F8FAFC', COLORS.border);

  const splitReason = pdf.splitTextToSize(reason, contentWidth - 12);
  pdf.setTextColor(COLORS.dark);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.text(splitReason.slice(0, 3), margin + 6, y + 8);

  y += 34;

  // ===========================================
  // GLOBAL LIQUIDITY - L1
  // ===========================================

  pdf.setTextColor(COLORS.dark);
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Global Liquidity', margin, y);

  // L1 badge
  drawRoundedRect(margin + 42, y - 4, 12, 6, 2, '#3B82F6');
  pdf.setTextColor('#FFFFFF');
  pdf.setFontSize(6);
  pdf.text('L1', margin + 48, y, { align: 'center' });

  y += 6;

  // Liquidity metrics - 4 column grid
  const liquidity = data.globalLiquidity;
  const liqMetrics = [
    { label: 'Fed Balance Sheet', value: formatNumber(liquidity?.fedBalanceSheet?.value || 0), change: liquidity?.fedBalanceSheet?.change30d || 0 },
    { label: 'M2 Money Supply', value: formatNumber(liquidity?.m2MoneySupply?.value || 0), change: liquidity?.m2MoneySupply?.change30d || 0 },
    { label: 'DXY Index', value: (liquidity?.dxy?.value || 0).toFixed(2), change: liquidity?.dxy?.change7d || 0 },
    { label: 'VIX', value: (liquidity?.vix?.value || 0).toFixed(2), level: liquidity?.vix?.level || '' },
  ];

  const metricW = (contentWidth - 9) / 4;
  const metricH = 20;

  liqMetrics.forEach((metric, idx) => {
    const mx = margin + (idx * (metricW + 3));

    drawRoundedRect(mx, y, metricW, metricH, 2, '#FFFFFF', COLORS.border);

    pdf.setTextColor(COLORS.muted);
    pdf.setFontSize(6);
    pdf.setFont('helvetica', 'normal');
    pdf.text(metric.label, mx + 3, y + 5);

    pdf.setTextColor(COLORS.dark);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text(metric.value, mx + 3, y + 14);

    if (metric.change && metric.change !== 0) {
      const chgColor = metric.change >= 0 ? COLORS.success : COLORS.danger;
      pdf.setTextColor(chgColor);
      pdf.setFontSize(6);
      pdf.text(formatPercent(metric.change), mx + metricW - 3, y + 14, { align: 'right' });
    }
  });

  y += metricH + 8;

  // ===========================================
  // MARKET FLOW - L2
  // ===========================================

  pdf.setTextColor(COLORS.dark);
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Market Flow', margin, y);

  // L2 badge
  drawRoundedRect(margin + 32, y - 4, 12, 6, 2, '#10B981');
  pdf.setTextColor('#FFFFFF');
  pdf.setFontSize(6);
  pdf.text('L2', margin + 38, y, { align: 'center' });

  y += 6;

  // Market flow table
  const markets = data.markets || [];

  // Table header
  drawRoundedRect(margin, y, contentWidth, 8, 2, COLORS.dark);
  pdf.setTextColor('#FFFFFF');
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  pdf.text('MARKET', margin + 5, y + 5.5);
  pdf.text('7D FLOW', margin + 50, y + 5.5);
  pdf.text('30D FLOW', margin + 85, y + 5.5);
  pdf.text('VELOCITY', margin + 125, y + 5.5);
  pdf.text('PHASE', margin + 160, y + 5.5);

  y += 9;

  const rowH = 10;
  markets.forEach((market, idx) => {
    const rowY = y + (idx * rowH);
    const bgCol = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';

    drawRoundedRect(margin, rowY, contentWidth, rowH - 1, 0, bgCol);

    pdf.setTextColor(COLORS.dark);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text(market.market.toUpperCase(), margin + 5, rowY + 6.5);

    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(market.flow7d >= 0 ? COLORS.success : COLORS.danger);
    pdf.text(formatPercent(market.flow7d), margin + 50, rowY + 6.5);

    pdf.setTextColor(market.flow30d >= 0 ? COLORS.success : COLORS.danger);
    pdf.text(formatPercent(market.flow30d), margin + 85, rowY + 6.5);

    const velocityColor = market.flowVelocity >= 0 ? COLORS.success : COLORS.danger;
    pdf.setTextColor(velocityColor);
    pdf.text(market.flowVelocity?.toFixed(2) || '0.00', margin + 125, rowY + 6.5);

    // Phase badge
    const phColor = getPhaseColor(market.phase);
    drawRoundedRect(margin + 155, rowY + 1.5, 22, 6, 2, phColor);
    pdf.setTextColor('#FFFFFF');
    pdf.setFontSize(6);
    pdf.setFont('helvetica', 'bold');
    pdf.text(market.phase.toUpperCase(), margin + 166, rowY + 5.5, { align: 'center' });
  });

  y += (markets.length * rowH) + 8;

  // ===========================================
  // FOCUS SECTORS (if available)
  // ===========================================

  if (data.recommendation?.sectors && data.recommendation.sectors.length > 0) {
    pdf.setTextColor(COLORS.dark);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Focus Sectors', margin, y);

    y += 6;

    const sectors = data.recommendation.sectors.slice(0, 6);
    const sectorW = (contentWidth - 10) / Math.min(sectors.length, 3);

    sectors.forEach((sector, idx) => {
      const sectorX = margin + (idx % 3) * (sectorW + 5);
      const sectorY = y + Math.floor(idx / 3) * 12;

      drawRoundedRect(sectorX, sectorY, sectorW, 10, 3, COLORS.primary);
      pdf.setTextColor('#FFFFFF');
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.text(sector.toUpperCase(), sectorX + sectorW / 2, sectorY + 7, { align: 'center' });
    });
  }

  // ===========================================
  // FOOTER - Standard Corporate
  // ===========================================

  // Footer separator
  pdf.setDrawColor(COLORS.border);
  pdf.setLineWidth(0.5);
  pdf.line(margin, pageHeight - 20, pageWidth - margin, pageHeight - 20);

  // Footer left - Company info
  pdf.setTextColor(COLORS.muted);
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  pdf.text('TraderPath Capital Flow Intelligence', margin, pageHeight - 14);
  pdf.text('traderpath.io', margin, pageHeight - 10);

  // Footer center - Disclaimer
  pdf.setFontSize(6);
  pdf.setTextColor('#94A3B8');
  const disclaimer = 'This analysis is for informational and educational purposes only and does not constitute financial, investment, or trading advice. Past performance does not guarantee future results.';
  pdf.text(disclaimer, pageWidth / 2, pageHeight - 14, { align: 'center' });

  // Footer right - Report info
  pdf.setFontSize(7);
  pdf.setTextColor(COLORS.muted);
  const timestamp = new Date().toISOString().split('T')[0];
  pdf.text(`Report: CF-${timestamp}`, pageWidth - margin, pageHeight - 14, { align: 'right' });
  pdf.text('Page 1 of 1', pageWidth - margin, pageHeight - 10, { align: 'right' });

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
        <a href="https://traderpath.io/flow" style="display: inline-block; background: linear-gradient(135deg, #0D9488 0%, #14B8A6 100%); color: #FFFFFF; text-decoration: none; padding: 14px 35px; border-radius: 8px; font-size: 14px; font-weight: 600;">View Live Dashboard →</a>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color: #F8FAFC; padding: 20px 25px; border-top: 1px solid #E2E8F0;">
        <p style="margin: 0 0 5px 0; color: #64748B; font-size: 10px;">Generated by TraderPath Capital Flow Intelligence</p>
        <p style="margin: 0; color: #94A3B8; font-size: 9px;">This analysis is for informational and educational purposes only and does not constitute financial, investment, or trading advice. Past performance does not guarantee future results.</p>
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
