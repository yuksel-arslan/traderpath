// ===========================================
// Before/After Trade Report Service
// Generates comparison report when trade closes
// ===========================================

import { prisma } from '../../core/database';
import { emailService } from '../email/email.service';
import { generateCandlestickSVG, svgToBase64DataUrl } from './svg-chart-generator';
import { fetchCandles } from '../analysis/providers/multi-asset-data-provider';

// Known non-crypto symbols
const KNOWN_NON_CRYPTO = new Set([
  'THYAO', 'GARAN', 'AKBNK', 'YKBNK', 'ISCTR', 'HALKB', 'VAKBN', 'TSKB', 'KCHOL', 'SAHOL',
  'TAVHL', 'TKFEN', 'DOHOL', 'SISE', 'TOASO', 'FROTO', 'EREGL', 'KRDMD', 'TUPRS', 'PETKM',
  'PGSUS', 'TCELL', 'TTKOM', 'BIMAS', 'MGROS', 'SOKM', 'ENKAI', 'EKGYO', 'ASELS', 'LOGO',
  'ARCLK', 'VESTL', 'KOZAL', 'KOZAA', 'XU100',
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA', 'JPM', 'V', 'WMT',
  'SPY', 'QQQ', 'DIA', 'IWM', 'VTI', 'VOO',
  'GLD', 'SLV', 'IAU', 'SGOL', 'XAUUSD', 'XAGUSD',
  'TLT', 'IEF', 'SHY', 'BND', 'AGG', 'LQD', 'HYG',
]);

function formatSymbolPair(symbol: string): string {
  const upper = symbol.toUpperCase().replace('.IS', '');
  if (KNOWN_NON_CRYPTO.has(upper) || symbol.includes('.IS') || symbol.includes('.')) return upper;
  return `${upper}/USDT`;
}

function formatPrice(p: number): string {
  if (p >= 1000) return `$${p.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  if (p >= 1) return `$${p.toFixed(2)}`;
  if (p >= 0.01) return `$${p.toFixed(4)}`;
  return `$${p.toFixed(6)}`;
}

interface OutcomeData {
  analysisId: string;
  outcome: string; // 'tp1_hit' | 'tp2_hit' | 'tp3_hit' | 'sl_hit'
  outcomePrice: number;
  outcomeAt: Date;
}

/**
 * Send before/after trade report when a trade closes (TP or SL hit).
 * Called from checkAllHistoricalOutcomes when an outcome is detected.
 */
export async function sendBeforeAfterReport(data: OutcomeData): Promise<void> {
  try {
    // Fetch full analysis with user info
    const analysis = await prisma.analysis.findUnique({
      where: { id: data.analysisId },
      include: {
        user: { select: { email: true, name: true } },
      },
    });

    if (!analysis || !analysis.user?.email) return;

    const step1 = analysis.step1Result as Record<string, unknown> | null;
    const step5 = analysis.step5Result as Record<string, unknown> | null;
    if (!step1 || !step5) return;

    // Extract trade plan
    const direction = ((step5.direction as string) || 'long').toLowerCase();
    const isLong = direction === 'long';

    const entryData = step5.averageEntry as number | undefined;
    const entry = Number(entryData) || 0;

    const slData = step5.stopLoss as { price?: number } | number | undefined;
    const stopLoss = typeof slData === 'object' ? Number(slData?.price) : Number(slData) || 0;

    const tpData = step5.takeProfits as Array<{ price: number }> | undefined;
    const tp1 = Number(tpData?.[0]?.price) || 0;
    const tp2 = Number(tpData?.[1]?.price) || 0;

    const levels = [
      entry > 0 ? { price: entry, color: '#facc15', label: 'Entry' } : null,
      stopLoss > 0 ? { price: stopLoss, color: '#ef4444', label: 'SL' } : null,
      tp1 > 0 ? { price: tp1, color: '#22c55e', label: 'TP1' } : null,
      tp2 > 0 ? { price: tp2, color: '#4ade80', label: 'TP2' } : null,
    ].filter(Boolean) as Array<{ price: number; color: string; label: string }>;

    // === BEFORE CHART ===
    // chartCandles saved at analysis time (last 50 candles)
    const beforeCandles = (step1.chartCandles as Array<{
      timestamp: number; open: number; high: number; low: number; close: number; volume: number;
    }>) || [];

    const beforeSvg = generateCandlestickSVG(beforeCandles, {
      title: 'BEFORE - Analysis Time',
      subtitle: new Date(analysis.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      levels,
      marker: {
        timestamp: analysis.createdAt.getTime(),
        label: 'Analysis',
        color: '#818cf8',
      },
    });

    // === AFTER CHART ===
    // Fetch fresh candles from analysis creation until now
    let afterCandles: Array<{ timestamp: number; open: number; high: number; low: number; close: number; volume: number }> = [];
    try {
      const raw = await fetchCandles(analysis.symbol, analysis.interval || '4h', 100);
      afterCandles = raw.slice(-50);
    } catch (err) {
      console.error(`[BeforeAfterReport] Failed to fetch after candles for ${analysis.symbol}:`, err);
    }

    const outcomeLabel = data.outcome.includes('tp') ? 'TP HIT' : 'SL HIT';
    const outcomeColor = data.outcome.includes('tp') ? '#22c55e' : '#ef4444';

    const afterLevels = [
      ...levels,
      { price: data.outcomePrice, color: outcomeColor, label: outcomeLabel, dashArray: '2,2' },
    ];

    const afterSvg = generateCandlestickSVG(afterCandles, {
      title: `AFTER - ${outcomeLabel}`,
      subtitle: data.outcomeAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      levels: afterLevels,
      marker: {
        timestamp: data.outcomeAt.getTime(),
        label: outcomeLabel,
        color: outcomeColor,
      },
    });

    // Calculate P/L
    const isTP = data.outcome.includes('tp');
    let pnlPercent = 0;
    if (entry > 0) {
      pnlPercent = isLong
        ? ((data.outcomePrice - entry) / entry) * 100
        : ((entry - data.outcomePrice) / entry) * 100;
    }

    const beforeBase64 = svgToBase64DataUrl(beforeSvg);
    const afterBase64 = svgToBase64DataUrl(afterSvg);

    // Calculate trade duration
    const durationMs = data.outcomeAt.getTime() - analysis.createdAt.getTime();
    const durationHrs = Math.floor(durationMs / (1000 * 60 * 60));
    const durationMins = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    const durationStr = durationHrs > 0 ? `${durationHrs}h ${durationMins}m` : `${durationMins}m`;

    // Send email
    await emailService.sendBeforeAfterReport(analysis.user.email, {
      userName: analysis.user.name || 'Trader',
      symbol: analysis.symbol,
      interval: analysis.interval || '4h',
      direction,
      entry,
      stopLoss,
      tp1,
      tp2,
      outcome: data.outcome,
      outcomePrice: data.outcomePrice,
      pnlPercent,
      duration: durationStr,
      beforeChartBase64: beforeBase64,
      afterChartBase64: afterBase64,
      analysisId: data.analysisId,
      analysisDate: analysis.createdAt,
      outcomeDate: data.outcomeAt,
    });

    console.log(`[BeforeAfterReport] Sent before/after report for ${analysis.symbol} to ${analysis.user.email} (${data.outcome})`);
  } catch (err) {
    console.error(`[BeforeAfterReport] Error sending report for ${data.analysisId}:`, err);
  }
}
