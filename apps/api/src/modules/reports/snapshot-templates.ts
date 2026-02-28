// ===========================================
// Snapshot HTML Templates
// Server-side HTML templates for PNG snapshot generation
// Each function returns self-contained HTML with inline styles
// ===========================================

interface ReportData {
  symbol: string;
  generatedAt: string;
  analysisId?: string;
  tradeType?: string;
  method?: string;
  interval?: string;

  marketPulse?: {
    btcDominance?: number;
    fearGreedIndex?: number;
    fearGreedLabel?: string;
    marketRegime?: string;
    trend?: { direction?: string; strength?: number };
    btcPrice?: number;
    totalMarketCap?: number;
    gate?: { canProceed?: boolean; reason?: string; confidence?: number };
  };

  tokenomics?: {
    supply?: { circulating?: number; total?: number; maxSupply?: number; circulatingPercent?: number; inflationRisk?: string };
    market?: { marketCap?: number; fullyDilutedValuation?: number; mcapFdvRatio?: number; dilutionRisk?: string; liquidityHealth?: string };
    whaleConcentration?: { concentrationRisk?: string; top10HoldersPercent?: number };
    assessment?: { overallScore?: number; riskLevel?: string; recommendation?: string };
  };

  assetScan?: {
    symbol?: string;
    currentPrice?: number;
    priceChange24h?: number;
    volume24h?: number;
    timeframes?: Array<{ tf: string; trend: string; strength: number }>;
    forecast?: { price24h?: number; price7d?: number; confidence?: number };
    levels?: { resistance?: number[]; support?: number[]; poc?: number };
    indicators?: {
      rsi?: number;
      macd?: { value?: number; signal?: number; histogram?: number };
      movingAverages?: { ma20?: number; ma50?: number; ma200?: number };
      bollingerBands?: { upper?: number; middle?: number; lower?: number };
      atr?: number;
    };
    direction?: string;
    directionConfidence?: number;
    gate?: { canProceed?: boolean; reason?: string; confidence?: number };
  };

  safetyCheck?: {
    riskLevel?: string;
    warnings?: string[];
    manipulation?: { pumpDumpRisk?: string; spoofingDetected?: boolean; layeringDetected?: boolean };
    whaleActivity?: { bias?: string; netFlowUsd?: number; largeBuys?: number; largeSells?: number; orderFlowImbalance?: number; orderFlowBias?: string };
    advancedMetrics?: { volumeSpike?: boolean; relativeVolume?: number; historicalVolatility?: number; liquidityScore?: number };
    smartMoney?: { positioning?: string; confidence?: number };
    newsSentiment?: { overall?: string; score?: number; newsCount?: number };
    gate?: { canProceed?: boolean; reason?: string; confidence?: number; riskAdjustment?: number };
  };

  timing?: {
    tradeNow?: boolean;
    reason?: string;
    conditions?: Array<{ name: string; met: boolean; details?: string }>;
    entryZones?: Array<{ priceLow: number; priceHigh: number; probability: number; quality?: string }>;
    optimalEntry?: number;
    gate?: { canProceed?: boolean; reason?: string; confidence?: number; urgency?: string };
  };

  tradePlan?: {
    direction?: string;
    type?: string;
    entries?: Array<{ price: number; percentage?: number; source?: string; type?: string }>;
    averageEntry?: number;
    stopLoss?: { price: number; percentage?: number; reason?: string };
    takeProfits?: Array<{ price: number; percentage?: number; reason?: string; riskReward?: number }>;
    riskReward?: number;
    winRateEstimate?: number;
    positionSizePercent?: number;
    riskAmount?: number;
    confidence?: number;
    gate?: { canProceed?: boolean; reason?: string; confidence?: number };
  };

  trapCheck?: {
    traps?: { bullTrap?: boolean; bearTrap?: boolean; fakeoutRisk?: string; liquidityGrab?: boolean; stopHuntZones?: number[] };
    liquidationLevels?: Array<{ price: number; amountUsd?: number; type?: string }>;
    counterStrategy?: string[];
    riskLevel?: string;
    gate?: { canProceed?: boolean; reason?: string; confidence?: number };
  };

  verdict?: {
    action?: string;
    verdict?: string;
    overallScore?: number;
    aiSummary?: string;
    tokenomicsInsight?: string;
    componentScores?: Record<string, number>;
    confidenceFactors?: Array<{ factor: string; positive: boolean; impact?: string }>;
    recommendation?: string;
  };

  aiExpertComment?: string;

  capitalFlow?: {
    layer1?: { bias?: string };
    layer2?: { primaryMarket?: string; flows?: Array<{ market: string; flow7d?: number; phase?: string }> };
    layer3?: { topSectors?: Array<{ name: string; flow?: number; trend?: string }> };
    layer4?: { direction?: string; confidence?: number; reason?: string };
  };

  indicatorDetails?: {
    summary?: { bullishIndicators?: number; bearishIndicators?: number; neutralIndicators?: number };
  };
}

// Color palette (intelligence theme)
const COLORS = {
  bg: '#0A0B0F',
  card: '#12131A',
  cardBorder: '#1E2030',
  bullish: '#00F5A0',
  bearish: '#FF4757',
  accent: '#00D4FF',
  warning: '#FFB800',
  text: '#E2E8F0',
  textMuted: '#64748B',
  teal: '#14B8A6',
  coral: '#F87171',
};

function formatPrice(price: number | undefined): string {
  if (!price) return '$0';
  if (price >= 1000) return `$${price.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  if (price >= 1) return `$${price.toFixed(2)}`;
  if (price >= 0.01) return `$${price.toFixed(4)}`;
  return `$${price.toFixed(6)}`;
}

function formatNumber(n: number | undefined): string {
  if (!n) return '0';
  if (n >= 1e12) return `${(n / 1e12).toFixed(1)}T`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toFixed(0);
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function getVerdictColor(verdict: string | undefined): string {
  const v = (verdict || '').toLowerCase();
  if (v === 'go' || v === 'go!') return COLORS.bullish;
  if (v.includes('conditional')) return COLORS.accent;
  if (v === 'wait') return COLORS.warning;
  return COLORS.bearish;
}

function getVerdictLabel(verdict: string | undefined): string {
  const v = (verdict || '').toLowerCase();
  if (v === 'go' || v === 'go!') return 'GO';
  if (v.includes('conditional')) return 'CONDITIONAL GO';
  if (v === 'wait') return 'WAIT';
  if (v === 'avoid') return 'AVOID';
  return v.toUpperCase();
}

function scoreColor(score: number): string {
  if (score >= 70) return COLORS.bullish;
  if (score >= 40) return COLORS.warning;
  return COLORS.bearish;
}

function baseStyles(): string {
  return `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', 'Segoe UI', sans-serif; background: ${COLORS.bg}; color: ${COLORS.text}; }
    .container { width: 800px; padding: 32px; }
    .card { background: ${COLORS.card}; border: 1px solid ${COLORS.cardBorder}; border-radius: 12px; padding: 20px; margin-bottom: 16px; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    .logo { font-size: 20px; font-weight: 700; }
    .logo-teal { color: ${COLORS.teal}; }
    .logo-text { color: ${COLORS.text}; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
    .grid-4 { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 12px; }
    .text-xs { font-size: 11px; }
    .text-sm { font-size: 13px; }
    .text-lg { font-size: 18px; }
    .text-xl { font-size: 22px; }
    .text-2xl { font-size: 28px; }
    .font-bold { font-weight: 700; }
    .font-mono { font-family: 'JetBrains Mono', 'Fira Code', monospace; }
    .text-muted { color: ${COLORS.textMuted}; }
    .text-bullish { color: ${COLORS.bullish}; }
    .text-bearish { color: ${COLORS.bearish}; }
    .text-accent { color: ${COLORS.accent}; }
    .text-warning { color: ${COLORS.warning}; }
    .mb-2 { margin-bottom: 8px; }
    .mb-3 { margin-bottom: 12px; }
    .mb-4 { margin-bottom: 16px; }
    .mt-2 { margin-top: 8px; }
    .mt-4 { margin-top: 16px; }
    .flex { display: flex; }
    .items-center { align-items: center; }
    .justify-between { justify-content: space-between; }
    .gap-2 { gap: 8px; }
    .gap-3 { gap: 12px; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; }
    .step-row { display: flex; align-items: center; gap: 12px; padding: 10px 16px; background: rgba(255,255,255,0.03); border-radius: 8px; margin-bottom: 6px; border-left: 3px solid; }
    .step-name { flex: 1; font-size: 13px; }
    .step-score { font-family: 'JetBrains Mono', monospace; font-weight: 700; font-size: 14px; }
    .disclaimer { font-size: 10px; color: ${COLORS.textMuted}; text-align: center; margin-top: 16px; padding-top: 12px; border-top: 1px solid ${COLORS.cardBorder}; }
    .watermark { text-align: center; margin-top: 8px; font-size: 10px; color: ${COLORS.textMuted}; }
  `;
}

function htmlWrapper(content: string, title: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<style>${baseStyles()}</style>
</head>
<body>
<div class="container">
${content}
</div>
</body>
</html>`;
}

function logoHtml(): string {
  return `<span class="logo"><span class="logo-teal">Trader</span><span class="logo-text">Path</span></span>`;
}

function verdictBadgeHtml(verdict: string | undefined): string {
  const color = getVerdictColor(verdict);
  const label = getVerdictLabel(verdict);
  return `<span class="badge" style="background: ${color}20; color: ${color}; border: 1px solid ${color}40;">${label}</span>`;
}

function scoreCircleHtml(score: number, size: number = 64): string {
  const displayScore = Math.round(score * 10);
  const color = scoreColor(displayScore);
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (displayScore / 100) * circumference;
  return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <circle cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="none" stroke="${color}20" stroke-width="4"/>
      <circle cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="none" stroke="${color}" stroke-width="4"
        stroke-dasharray="${progress} ${circumference - progress}" stroke-linecap="round"
        transform="rotate(-90 ${size / 2} ${size / 2})"/>
      <text x="${size / 2}" y="${size / 2 + 1}" text-anchor="middle" dominant-baseline="middle"
        fill="${color}" font-size="${size * 0.3}" font-weight="700" font-family="'JetBrains Mono', monospace">${displayScore}</text>
    </svg>`;
}

// ===========================================
// EXECUTIVE SUMMARY SNAPSHOTS (3-4 PNGs)
// ===========================================

export function execPage1_HeaderVerdict(data: ReportData, chartSvg?: string): string {
  const verdict = data.verdict?.action || data.verdict?.verdict || '';
  const score = data.verdict?.overallScore || 0;
  const direction = data.tradePlan?.direction || '';
  const isLong = direction.toLowerCase() === 'long';
  const dirColor = isLong ? COLORS.bullish : direction ? COLORS.bearish : COLORS.textMuted;
  const dirLabel = isLong ? 'LONG' : direction ? 'SHORT' : 'NEUTRAL';
  const price = data.assetScan?.currentPrice || 0;
  const change24h = data.assetScan?.priceChange24h || 0;
  const changeColor = change24h >= 0 ? COLORS.bullish : COLORS.bearish;

  const content = `
    <div class="header">
      ${logoHtml()}
      <span class="text-xs text-muted">${new Date(data.generatedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</span>
    </div>

    <div class="card" style="display: flex; align-items: center; gap: 24px;">
      ${scoreCircleHtml(score, 80)}
      <div style="flex: 1;">
        <div style="font-size: 24px; font-weight: 700; margin-bottom: 4px;">${escapeHtml(data.symbol)}/USDT</div>
        <div class="flex items-center gap-2">
          ${verdictBadgeHtml(verdict)}
          <span class="badge" style="background: ${dirColor}20; color: ${dirColor}; border: 1px solid ${dirColor}40;">${dirLabel}</span>
          ${data.interval ? `<span class="badge" style="background: rgba(255,255,255,0.05); color: ${COLORS.textMuted}; border: 1px solid ${COLORS.cardBorder};">${data.interval}</span>` : ''}
        </div>
      </div>
      <div style="text-align: right;">
        <div class="font-mono text-xl font-bold">${formatPrice(price)}</div>
        <div class="font-mono text-sm" style="color: ${changeColor};">${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%</div>
      </div>
    </div>

    ${data.tradePlan?.averageEntry ? `
    <div class="grid-4">
      <div class="card" style="text-align: center;">
        <div class="text-xs text-muted mb-2">Entry</div>
        <div class="font-mono font-bold" style="color: ${COLORS.warning};">${formatPrice(data.tradePlan.averageEntry)}</div>
      </div>
      <div class="card" style="text-align: center;">
        <div class="text-xs text-muted mb-2">Stop Loss</div>
        <div class="font-mono font-bold text-bearish">${formatPrice(data.tradePlan.stopLoss?.price)}</div>
      </div>
      <div class="card" style="text-align: center;">
        <div class="text-xs text-muted mb-2">TP1</div>
        <div class="font-mono font-bold text-bullish">${formatPrice(data.tradePlan.takeProfits?.[0]?.price)}</div>
      </div>
      <div class="card" style="text-align: center;">
        <div class="text-xs text-muted mb-2">R:R</div>
        <div class="font-mono font-bold text-accent">${(data.tradePlan.riskReward || 0).toFixed(1)}:1</div>
      </div>
    </div>` : ''}

    ${chartSvg ? `<div class="card" style="padding: 12px;">${chartSvg}</div>` : ''}

    <div class="disclaimer">
      This analysis is for informational and educational purposes only. Not financial advice. Past performance does not guarantee future results.
    </div>
    <div class="watermark">traderpath.io</div>`;

  return htmlWrapper(content, `${data.symbol} Analysis - Header`);
}

export function execPage2_SevenStepSummary(data: ReportData): string {
  const steps = [
    { name: 'Market Pulse', key: 'marketPulse', icon: '🌍', color: COLORS.teal,
      score: data.marketPulse?.gate?.confidence,
      status: data.marketPulse?.gate?.canProceed ? 'PASS' : data.marketPulse?.gate?.canProceed === false ? 'FAIL' : 'N/A',
      detail: `${data.marketPulse?.fearGreedLabel || 'N/A'} (${data.marketPulse?.fearGreedIndex || 0}) • BTC Dom: ${(data.marketPulse?.btcDominance || 0).toFixed(1)}%` },
    { name: 'Asset Scanner', key: 'assetScan', icon: '🔍', color: '#A855F7',
      score: data.assetScan?.gate?.confidence,
      status: data.assetScan?.gate?.canProceed ? 'PASS' : data.assetScan?.gate?.canProceed === false ? 'FAIL' : 'N/A',
      detail: `RSI: ${(data.assetScan?.indicators?.rsi || 0).toFixed(0)} • Direction: ${data.assetScan?.direction || 'N/A'}` },
    { name: 'Safety Check', key: 'safetyCheck', icon: '🛡️', color: COLORS.warning,
      score: data.safetyCheck?.gate?.confidence,
      status: data.safetyCheck?.gate?.canProceed ? 'PASS' : data.safetyCheck?.gate?.canProceed === false ? 'FAIL' : 'N/A',
      detail: `Risk: ${data.safetyCheck?.riskLevel || 'N/A'} • Whale: ${data.safetyCheck?.whaleActivity?.bias || 'neutral'}` },
    { name: 'Timing', key: 'timing', icon: '⏱️', color: COLORS.accent,
      score: data.timing?.gate?.confidence,
      status: data.timing?.tradeNow ? 'NOW' : 'WAIT',
      detail: data.timing?.reason || 'N/A' },
    { name: 'Trade Plan', key: 'tradePlan', icon: '🎯', color: '#06B6D4',
      score: data.tradePlan?.gate?.confidence || data.tradePlan?.confidence,
      status: data.tradePlan?.gate?.canProceed ? 'PASS' : data.tradePlan?.averageEntry ? 'READY' : 'N/A',
      detail: `Entry: ${formatPrice(data.tradePlan?.averageEntry)} • R:R: ${(data.tradePlan?.riskReward || 0).toFixed(1)}:1` },
    { name: 'Trap Check', key: 'trapCheck', icon: '⚠️', color: COLORS.coral,
      score: data.trapCheck?.gate?.confidence,
      status: data.trapCheck?.gate?.canProceed ? 'CLEAR' : data.trapCheck?.traps?.fakeoutRisk === 'high' ? 'RISK' : 'OK',
      detail: `Bull: ${data.trapCheck?.traps?.bullTrap ? 'Yes' : 'No'} • Bear: ${data.trapCheck?.traps?.bearTrap ? 'Yes' : 'No'} • Fakeout: ${data.trapCheck?.traps?.fakeoutRisk || 'low'}` },
    { name: 'Final Verdict', key: 'verdict', icon: '⚖️', color: getVerdictColor(data.verdict?.action || data.verdict?.verdict),
      score: data.verdict?.overallScore ? data.verdict.overallScore * 10 : undefined,
      status: getVerdictLabel(data.verdict?.action || data.verdict?.verdict),
      detail: data.verdict?.aiSummary ? data.verdict.aiSummary.substring(0, 80) + '...' : 'N/A' },
  ];

  const stepsHtml = steps.map(s => {
    const sc = s.score !== undefined ? Math.round(s.score) : null;
    const scColor = sc !== null ? scoreColor(sc) : COLORS.textMuted;
    return `
      <div class="step-row" style="border-left-color: ${s.color};">
        <span style="font-size: 16px;">${s.icon}</span>
        <span class="step-name font-bold">${s.name}</span>
        <span class="text-xs" style="color: ${scColor}; min-width: 40px; text-align: center;">${s.status}</span>
        ${sc !== null ? `<span class="step-score" style="color: ${scColor};">${sc}</span>` : '<span class="step-score text-muted">—</span>'}
      </div>
      <div style="padding: 0 16px 8px 44px; font-size: 11px; color: ${COLORS.textMuted};">${escapeHtml(s.detail.substring(0, 100))}</div>
    `;
  }).join('');

  const content = `
    <div class="header">
      ${logoHtml()}
      <span class="text-sm font-bold">${escapeHtml(data.symbol)}/USDT</span>
    </div>
    <div class="text-lg font-bold mb-3" style="color: ${COLORS.accent};">7-Step Analysis Summary</div>
    ${stepsHtml}
    <div class="watermark mt-4">traderpath.io</div>`;

  return htmlWrapper(content, `${data.symbol} - 7-Step Summary`);
}

export function execPage3_TradePlan(data: ReportData, chartSvg?: string): string {
  const tp = data.tradePlan;
  if (!tp) return htmlWrapper('<div class="card"><p class="text-muted">No trade plan available</p></div>', 'Trade Plan');

  const isLong = (tp.direction || '').toLowerCase() === 'long';
  const dirColor = isLong ? COLORS.bullish : COLORS.bearish;

  const entriesHtml = tp.entries?.filter(Boolean).map((e, i) => `
    <div style="display: flex; justify-content: space-between; padding: 6px 12px; background: rgba(255,184,0,0.05); border-radius: 6px; margin-bottom: 4px;">
      <span class="text-xs" style="color: ${COLORS.warning};">E${i + 1}</span>
      <span class="font-mono text-sm">${formatPrice(e.price)}</span>
    </div>`).join('') || '';

  const tpsHtml = tp.takeProfits?.filter(Boolean).map((t, i) => `
    <div style="display: flex; justify-content: space-between; padding: 6px 12px; background: rgba(0,245,160,0.05); border-radius: 6px; margin-bottom: 4px;">
      <span class="text-xs text-bullish">TP${i + 1}</span>
      <div style="text-align: right;">
        <span class="font-mono text-sm">${formatPrice(t.price)}</span>
        <span class="text-xs text-bullish" style="margin-left: 8px;">${(t.riskReward || 0).toFixed(1)}R</span>
      </div>
    </div>`).join('') || '';

  const content = `
    <div class="header">
      ${logoHtml()}
      <span class="text-sm font-bold">${escapeHtml(data.symbol)}/USDT</span>
    </div>

    <div class="flex items-center gap-3 mb-4">
      <span class="text-lg font-bold" style="color: ${COLORS.accent};">Trade Plan</span>
      <span class="badge" style="background: ${dirColor}20; color: ${dirColor}; border: 1px solid ${dirColor}40;">
        ${isLong ? '📈 LONG' : '📉 SHORT'}
      </span>
    </div>

    ${chartSvg ? `<div class="card" style="padding: 12px; margin-bottom: 16px;">${chartSvg}</div>` : ''}

    <div class="grid-2">
      <div class="card">
        <div class="text-xs text-muted mb-2">Entry Levels</div>
        <div style="display: flex; justify-content: space-between; padding: 8px 12px; background: rgba(255,184,0,0.1); border-radius: 6px; margin-bottom: 8px;">
          <span class="text-sm font-bold" style="color: ${COLORS.warning};">▶ AVG</span>
          <span class="font-mono font-bold" style="color: ${COLORS.warning};">${formatPrice(tp.averageEntry)}</span>
        </div>
        ${entriesHtml}
      </div>

      <div class="card">
        <div class="text-xs text-muted mb-2">Stop Loss</div>
        <div style="display: flex; justify-content: space-between; padding: 8px 12px; background: rgba(255,71,87,0.1); border-radius: 6px;">
          <span class="text-sm font-bold text-bearish">SL</span>
          <div style="text-align: right;">
            <span class="font-mono font-bold text-bearish">${formatPrice(tp.stopLoss?.price)}</span>
            <div class="text-xs text-bearish">-${(tp.stopLoss?.percentage || 0).toFixed(1)}% risk</div>
          </div>
        </div>
        ${tp.stopLoss?.reason ? `<div class="text-xs text-muted mt-2">${escapeHtml(tp.stopLoss.reason.substring(0, 80))}</div>` : ''}
      </div>
    </div>

    <div class="card">
      <div class="text-xs text-muted mb-2">Take Profit Targets</div>
      ${tpsHtml}
    </div>

    <div class="grid-3 mt-2">
      <div class="card" style="text-align: center;">
        <div class="text-xs text-muted mb-2">R:R Ratio</div>
        <div class="font-mono text-xl font-bold text-accent">${(tp.riskReward || 0).toFixed(1)}:1</div>
      </div>
      <div class="card" style="text-align: center;">
        <div class="text-xs text-muted mb-2">Win Rate</div>
        <div class="font-mono text-xl font-bold">${tp.winRateEstimate || 0}%</div>
      </div>
      <div class="card" style="text-align: center;">
        <div class="text-xs text-muted mb-2">Position Size</div>
        <div class="font-mono text-xl font-bold">${tp.positionSizePercent || 0}%</div>
      </div>
    </div>

    <div class="disclaimer">
      This analysis is for informational and educational purposes only. Not financial advice.
    </div>
    <div class="watermark">traderpath.io</div>`;

  return htmlWrapper(content, `${data.symbol} - Trade Plan`);
}

export function execPage4_AISummary(data: ReportData): string {
  const verdict = data.verdict?.action || data.verdict?.verdict || '';
  const vColor = getVerdictColor(verdict);
  const score = data.verdict?.overallScore || 0;

  const componentScoresHtml = data.verdict?.componentScores
    ? Object.entries(data.verdict.componentScores).map(([key, val]) => {
        const sc = typeof val === 'number' ? val : 0;
        const c = scoreColor(sc * 10);
        return `
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
          <span class="text-xs" style="min-width: 100px; color: ${COLORS.textMuted};">${escapeHtml(key)}</span>
          <div style="flex: 1; height: 6px; background: ${COLORS.cardBorder}; border-radius: 3px; overflow: hidden;">
            <div style="width: ${sc * 10}%; height: 100%; background: ${c}; border-radius: 3px;"></div>
          </div>
          <span class="font-mono text-xs" style="color: ${c}; min-width: 28px; text-align: right;">${Math.round(sc * 10)}</span>
        </div>`;
      }).join('')
    : '';

  const confidenceHtml = data.verdict?.confidenceFactors
    ? data.verdict.confidenceFactors.slice(0, 6).map(f => `
        <div style="display: flex; align-items: center; gap: 8px; padding: 6px 0; border-bottom: 1px solid ${COLORS.cardBorder};">
          <span style="color: ${f.positive ? COLORS.bullish : COLORS.bearish}; font-size: 14px;">${f.positive ? '✓' : '✗'}</span>
          <span class="text-sm">${escapeHtml(f.factor)}</span>
        </div>`).join('')
    : '';

  const content = `
    <div class="header">
      ${logoHtml()}
      <span class="text-sm font-bold">${escapeHtml(data.symbol)}/USDT</span>
    </div>

    <div class="card" style="display: flex; align-items: center; gap: 20px; border-color: ${vColor}40;">
      ${scoreCircleHtml(score, 72)}
      <div style="flex: 1;">
        <div class="text-lg font-bold mb-2">Final Verdict</div>
        ${verdictBadgeHtml(verdict)}
      </div>
    </div>

    ${data.verdict?.aiSummary ? `
    <div class="card">
      <div class="text-xs text-muted mb-2">AI Summary</div>
      <p class="text-sm" style="line-height: 1.6;">${escapeHtml(data.verdict.aiSummary)}</p>
    </div>` : ''}

    ${componentScoresHtml ? `
    <div class="card">
      <div class="text-xs text-muted mb-3">Component Scores</div>
      ${componentScoresHtml}
    </div>` : ''}

    ${confidenceHtml ? `
    <div class="card">
      <div class="text-xs text-muted mb-3">Confidence Factors</div>
      ${confidenceHtml}
    </div>` : ''}

    <div class="disclaimer">
      This analysis is for informational and educational purposes only. Not financial advice. Past performance does not guarantee future results.
    </div>
    <div class="watermark">traderpath.io</div>`;

  return htmlWrapper(content, `${data.symbol} - AI Summary`);
}

// ===========================================
// DETAILED ANALYSIS SNAPSHOTS (6-8 PNGs)
// ===========================================

export function detailPage1_MarketPulse(data: ReportData): string {
  const mp = data.marketPulse;
  if (!mp) return htmlWrapper('<div class="card text-muted">No Market Pulse data</div>', 'Market Pulse');

  const trendColor = mp.trend?.direction === 'bullish' ? COLORS.bullish : mp.trend?.direction === 'bearish' ? COLORS.bearish : COLORS.warning;

  const content = `
    <div class="header">
      ${logoHtml()}
      <span class="text-sm font-bold">${escapeHtml(data.symbol)}/USDT — Step 1</span>
    </div>
    <div class="text-lg font-bold mb-3" style="color: ${COLORS.teal};">🌍 Market Pulse</div>

    <div class="grid-2">
      <div class="card" style="text-align: center;">
        <div class="text-xs text-muted mb-2">Fear & Greed Index</div>
        <div class="font-mono text-2xl font-bold" style="color: ${(mp.fearGreedIndex || 0) >= 60 ? COLORS.bullish : (mp.fearGreedIndex || 0) <= 40 ? COLORS.bearish : COLORS.warning};">${mp.fearGreedIndex || 0}</div>
        <div class="text-xs text-muted">${mp.fearGreedLabel || 'N/A'}</div>
      </div>
      <div class="card" style="text-align: center;">
        <div class="text-xs text-muted mb-2">BTC Dominance</div>
        <div class="font-mono text-2xl font-bold">${(mp.btcDominance || 0).toFixed(1)}%</div>
      </div>
    </div>

    <div class="grid-2">
      <div class="card" style="text-align: center;">
        <div class="text-xs text-muted mb-2">Market Trend</div>
        <div class="font-bold" style="color: ${trendColor};">${(mp.trend?.direction || 'N/A').toUpperCase()}</div>
        <div class="text-xs text-muted">Strength: ${mp.trend?.strength || 0}/100</div>
      </div>
      <div class="card" style="text-align: center;">
        <div class="text-xs text-muted mb-2">Market Regime</div>
        <div class="font-bold">${mp.marketRegime || 'N/A'}</div>
      </div>
    </div>

    ${mp.btcPrice ? `
    <div class="grid-2">
      <div class="card" style="text-align: center;">
        <div class="text-xs text-muted mb-2">BTC Price</div>
        <div class="font-mono font-bold">${formatPrice(mp.btcPrice)}</div>
      </div>
      <div class="card" style="text-align: center;">
        <div class="text-xs text-muted mb-2">Total Market Cap</div>
        <div class="font-mono font-bold">${formatNumber(mp.totalMarketCap)}</div>
      </div>
    </div>` : ''}

    ${mp.gate ? `
    <div class="card" style="border-left: 3px solid ${mp.gate.canProceed ? COLORS.bullish : COLORS.bearish};">
      <div class="flex items-center gap-2 mb-2">
        <span style="color: ${mp.gate.canProceed ? COLORS.bullish : COLORS.bearish};">${mp.gate.canProceed ? '✓' : '✗'}</span>
        <span class="text-sm font-bold">Gate: ${mp.gate.canProceed ? 'PASS' : 'BLOCKED'}</span>
      </div>
      <div class="text-xs text-muted">${escapeHtml(mp.gate.reason || '')}</div>
    </div>` : ''}

    <div class="watermark mt-4">traderpath.io</div>`;

  return htmlWrapper(content, `${data.symbol} - Market Pulse`);
}

export function detailPage2_AssetScanner(data: ReportData): string {
  const as = data.assetScan;
  if (!as) return htmlWrapper('<div class="card text-muted">No Asset Scan data</div>', 'Asset Scanner');

  const changeColor = (as.priceChange24h || 0) >= 0 ? COLORS.bullish : COLORS.bearish;

  const timeframesHtml = as.timeframes?.slice(0, 6).map(tf => {
    const c = tf.trend === 'bullish' ? COLORS.bullish : tf.trend === 'bearish' ? COLORS.bearish : COLORS.warning;
    return `
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 6px 12px; background: rgba(255,255,255,0.02); border-radius: 6px; margin-bottom: 4px;">
        <span class="font-mono text-xs">${tf.tf}</span>
        <span class="text-xs font-bold" style="color: ${c};">${tf.trend.toUpperCase()}</span>
        <span class="text-xs text-muted">${tf.strength}/100</span>
      </div>`;
  }).join('') || '';

  const indicatorsHtml = `
    <div class="grid-2">
      <div class="card" style="text-align: center;">
        <div class="text-xs text-muted mb-2">RSI</div>
        <div class="font-mono text-xl font-bold" style="color: ${(as.indicators?.rsi || 50) > 70 ? COLORS.bearish : (as.indicators?.rsi || 50) < 30 ? COLORS.bullish : COLORS.text};">${(as.indicators?.rsi || 0).toFixed(0)}</div>
      </div>
      <div class="card" style="text-align: center;">
        <div class="text-xs text-muted mb-2">MACD</div>
        <div class="font-mono text-xl font-bold" style="color: ${(as.indicators?.macd?.histogram || 0) > 0 ? COLORS.bullish : COLORS.bearish};">${(as.indicators?.macd?.histogram || 0).toFixed(4)}</div>
      </div>
    </div>`;

  const levelsHtml = as.levels ? `
    <div class="grid-2">
      <div class="card">
        <div class="text-xs text-muted mb-2">Support Levels</div>
        ${(as.levels.support || []).slice(0, 3).map(s => `<div class="font-mono text-xs mb-1" style="color: ${COLORS.bullish};">${formatPrice(s)}</div>`).join('')}
      </div>
      <div class="card">
        <div class="text-xs text-muted mb-2">Resistance Levels</div>
        ${(as.levels.resistance || []).slice(0, 3).map(r => `<div class="font-mono text-xs mb-1" style="color: ${COLORS.bearish};">${formatPrice(r)}</div>`).join('')}
      </div>
    </div>` : '';

  const content = `
    <div class="header">
      ${logoHtml()}
      <span class="text-sm font-bold">${escapeHtml(data.symbol)}/USDT — Step 2</span>
    </div>
    <div class="text-lg font-bold mb-3" style="color: #A855F7;">🔍 Asset Scanner</div>

    <div class="card" style="display: flex; align-items: center; justify-content: space-between;">
      <div>
        <div class="text-xs text-muted">Current Price</div>
        <div class="font-mono text-2xl font-bold">${formatPrice(as.currentPrice)}</div>
      </div>
      <div style="text-align: right;">
        <div class="text-xs text-muted">24h Change</div>
        <div class="font-mono text-lg font-bold" style="color: ${changeColor};">${(as.priceChange24h || 0) >= 0 ? '+' : ''}${(as.priceChange24h || 0).toFixed(2)}%</div>
      </div>
      ${as.volume24h ? `<div style="text-align: right;"><div class="text-xs text-muted">24h Volume</div><div class="font-mono text-lg font-bold">${formatNumber(as.volume24h)}</div></div>` : ''}
    </div>

    ${timeframesHtml ? `<div class="card"><div class="text-xs text-muted mb-2">Multi-Timeframe Analysis</div>${timeframesHtml}</div>` : ''}
    ${indicatorsHtml}
    ${levelsHtml}

    <div class="watermark mt-4">traderpath.io</div>`;

  return htmlWrapper(content, `${data.symbol} - Asset Scanner`);
}

export function detailPage3_SafetyTiming(data: ReportData): string {
  const sc = data.safetyCheck;
  const tm = data.timing;

  const riskColor = sc?.riskLevel === 'low' ? COLORS.bullish : sc?.riskLevel === 'high' ? COLORS.bearish : COLORS.warning;

  const manipulationHtml = sc?.manipulation ? `
    <div class="grid-3">
      <div style="padding: 8px; background: rgba(255,255,255,0.02); border-radius: 6px; text-align: center;">
        <div class="text-xs text-muted">Pump/Dump</div>
        <div class="text-xs font-bold" style="color: ${sc.manipulation.pumpDumpRisk === 'low' ? COLORS.bullish : COLORS.bearish};">${sc.manipulation.pumpDumpRisk || 'N/A'}</div>
      </div>
      <div style="padding: 8px; background: rgba(255,255,255,0.02); border-radius: 6px; text-align: center;">
        <div class="text-xs text-muted">Spoofing</div>
        <div class="text-xs font-bold" style="color: ${sc.manipulation.spoofingDetected ? COLORS.bearish : COLORS.bullish};">${sc.manipulation.spoofingDetected ? 'YES' : 'NO'}</div>
      </div>
      <div style="padding: 8px; background: rgba(255,255,255,0.02); border-radius: 6px; text-align: center;">
        <div class="text-xs text-muted">Layering</div>
        <div class="text-xs font-bold" style="color: ${sc.manipulation.layeringDetected ? COLORS.bearish : COLORS.bullish};">${sc.manipulation.layeringDetected ? 'YES' : 'NO'}</div>
      </div>
    </div>` : '';

  const conditionsHtml = tm?.conditions?.map(c => `
    <div style="display: flex; align-items: center; gap: 8px; padding: 6px 0; border-bottom: 1px solid ${COLORS.cardBorder};">
      <span style="color: ${c.met ? COLORS.bullish : COLORS.bearish};">${c.met ? '✓' : '✗'}</span>
      <span class="text-xs">${escapeHtml(c.name)}</span>
    </div>`).join('') || '';

  const content = `
    <div class="header">
      ${logoHtml()}
      <span class="text-sm font-bold">${escapeHtml(data.symbol)}/USDT — Steps 3-4</span>
    </div>

    <div class="text-lg font-bold mb-3" style="color: ${COLORS.warning};">🛡️ Safety Check</div>
    <div class="card">
      <div class="flex items-center justify-between mb-3">
        <span class="text-sm font-bold">Risk Level</span>
        <span class="badge" style="background: ${riskColor}20; color: ${riskColor}; border: 1px solid ${riskColor}40;">${(sc?.riskLevel || 'N/A').toUpperCase()}</span>
      </div>
      ${manipulationHtml}
      ${sc?.whaleActivity ? `
      <div class="mt-2" style="padding: 8px; background: rgba(255,255,255,0.02); border-radius: 6px;">
        <div class="text-xs text-muted mb-1">Whale Activity</div>
        <div class="flex justify-between">
          <span class="text-xs">Bias: <strong>${sc.whaleActivity.bias || 'neutral'}</strong></span>
          <span class="text-xs font-mono">${sc.whaleActivity.netFlowUsd ? formatNumber(sc.whaleActivity.netFlowUsd) : 'N/A'}</span>
        </div>
      </div>` : ''}
    </div>

    <div class="text-lg font-bold mb-3 mt-4" style="color: ${COLORS.accent};">⏱️ Timing Analysis</div>
    <div class="card">
      <div class="flex items-center gap-2 mb-3">
        <span class="badge" style="background: ${tm?.tradeNow ? COLORS.bullish + '20' : COLORS.warning + '20'}; color: ${tm?.tradeNow ? COLORS.bullish : COLORS.warning}; border: 1px solid ${tm?.tradeNow ? COLORS.bullish + '40' : COLORS.warning + '40'};">
          ${tm?.tradeNow ? 'TRADE NOW' : 'WAIT'}
        </span>
      </div>
      <div class="text-xs text-muted mb-3">${escapeHtml(tm?.reason || 'N/A')}</div>
      ${conditionsHtml}
    </div>

    <div class="watermark mt-4">traderpath.io</div>`;

  return htmlWrapper(content, `${data.symbol} - Safety & Timing`);
}

export function detailPage4_Tokenomics(data: ReportData): string {
  const tk = data.tokenomics;
  if (!tk) return htmlWrapper(`
    <div class="header">${logoHtml()}<span class="text-sm font-bold">${escapeHtml(data.symbol)}/USDT</span></div>
    <div class="card text-muted">No Tokenomics data available</div>
    <div class="watermark">traderpath.io</div>`, 'Tokenomics');

  const content = `
    <div class="header">
      ${logoHtml()}
      <span class="text-sm font-bold">${escapeHtml(data.symbol)}/USDT — Tokenomics</span>
    </div>
    <div class="text-lg font-bold mb-3" style="color: #A855F7;">📊 Tokenomics</div>

    <div class="grid-2">
      <div class="card">
        <div class="text-xs text-muted mb-3">Supply Metrics</div>
        <div style="margin-bottom: 8px;">
          <div class="text-xs text-muted">Circulating</div>
          <div class="font-mono text-sm font-bold">${formatNumber(tk.supply?.circulating)}</div>
        </div>
        <div style="margin-bottom: 8px;">
          <div class="text-xs text-muted">Total</div>
          <div class="font-mono text-sm font-bold">${formatNumber(tk.supply?.total)}</div>
        </div>
        <div style="margin-bottom: 8px;">
          <div class="text-xs text-muted">Max Supply</div>
          <div class="font-mono text-sm font-bold">${tk.supply?.maxSupply ? formatNumber(tk.supply.maxSupply) : '∞'}</div>
        </div>
        <div>
          <div class="text-xs text-muted">Circ. %</div>
          <div class="font-mono text-sm font-bold">${(tk.supply?.circulatingPercent || 0).toFixed(1)}%</div>
        </div>
      </div>

      <div class="card">
        <div class="text-xs text-muted mb-3">Market Metrics</div>
        <div style="margin-bottom: 8px;">
          <div class="text-xs text-muted">Market Cap</div>
          <div class="font-mono text-sm font-bold">${formatNumber(tk.market?.marketCap)}</div>
        </div>
        <div style="margin-bottom: 8px;">
          <div class="text-xs text-muted">FDV</div>
          <div class="font-mono text-sm font-bold">${formatNumber(tk.market?.fullyDilutedValuation)}</div>
        </div>
        <div style="margin-bottom: 8px;">
          <div class="text-xs text-muted">MCap/FDV</div>
          <div class="font-mono text-sm font-bold">${(tk.market?.mcapFdvRatio || 0).toFixed(2)}</div>
        </div>
        <div>
          <div class="text-xs text-muted">Dilution Risk</div>
          <div class="text-sm font-bold" style="color: ${tk.market?.dilutionRisk === 'low' ? COLORS.bullish : COLORS.bearish};">${tk.market?.dilutionRisk || 'N/A'}</div>
        </div>
      </div>
    </div>

    ${tk.assessment ? `
    <div class="card" style="border-left: 3px solid ${(tk.assessment.overallScore || 0) >= 60 ? COLORS.bullish : COLORS.warning};">
      <div class="text-xs text-muted mb-2">Assessment</div>
      <div class="flex items-center justify-between">
        <span class="text-sm font-bold">Score: ${tk.assessment.overallScore || 0}/100</span>
        <span class="badge" style="background: ${(tk.assessment.riskLevel === 'low' ? COLORS.bullish : COLORS.warning) + '20'}; color: ${tk.assessment.riskLevel === 'low' ? COLORS.bullish : COLORS.warning};">
          ${(tk.assessment.riskLevel || 'N/A').toUpperCase()}
        </span>
      </div>
      ${tk.assessment.recommendation ? `<div class="text-xs text-muted mt-2">${escapeHtml(tk.assessment.recommendation)}</div>` : ''}
    </div>` : ''}

    <div class="watermark mt-4">traderpath.io</div>`;

  return htmlWrapper(content, `${data.symbol} - Tokenomics`);
}

export function detailPage5_TrapCheck(data: ReportData): string {
  const tc = data.trapCheck;
  if (!tc) return htmlWrapper(`
    <div class="header">${logoHtml()}<span class="text-sm font-bold">${escapeHtml(data.symbol)}/USDT</span></div>
    <div class="card text-muted">No Trap Check data available</div>
    <div class="watermark">traderpath.io</div>`, 'Trap Check');

  const content = `
    <div class="header">
      ${logoHtml()}
      <span class="text-sm font-bold">${escapeHtml(data.symbol)}/USDT — Step 6</span>
    </div>
    <div class="text-lg font-bold mb-3" style="color: ${COLORS.coral};">⚠️ Trap Check</div>

    <div class="grid-3">
      <div class="card" style="text-align: center; border-left: 3px solid ${tc.traps?.bullTrap ? COLORS.bearish : COLORS.bullish};">
        <div class="text-xs text-muted mb-2">Bull Trap</div>
        <div class="text-lg font-bold" style="color: ${tc.traps?.bullTrap ? COLORS.bearish : COLORS.bullish};">${tc.traps?.bullTrap ? 'YES' : 'NO'}</div>
      </div>
      <div class="card" style="text-align: center; border-left: 3px solid ${tc.traps?.bearTrap ? COLORS.bearish : COLORS.bullish};">
        <div class="text-xs text-muted mb-2">Bear Trap</div>
        <div class="text-lg font-bold" style="color: ${tc.traps?.bearTrap ? COLORS.bearish : COLORS.bullish};">${tc.traps?.bearTrap ? 'YES' : 'NO'}</div>
      </div>
      <div class="card" style="text-align: center; border-left: 3px solid ${tc.traps?.fakeoutRisk === 'high' ? COLORS.bearish : COLORS.bullish};">
        <div class="text-xs text-muted mb-2">Fakeout Risk</div>
        <div class="text-lg font-bold" style="color: ${tc.traps?.fakeoutRisk === 'high' ? COLORS.bearish : tc.traps?.fakeoutRisk === 'medium' ? COLORS.warning : COLORS.bullish};">${(tc.traps?.fakeoutRisk || 'low').toUpperCase()}</div>
      </div>
    </div>

    ${tc.counterStrategy?.length ? `
    <div class="card">
      <div class="text-xs text-muted mb-2">Counter Strategies</div>
      ${tc.counterStrategy.map(s => `<div class="text-xs mb-1" style="padding: 4px 0; border-bottom: 1px solid ${COLORS.cardBorder};">• ${escapeHtml(s)}</div>`).join('')}
    </div>` : ''}

    ${tc.gate ? `
    <div class="card" style="border-left: 3px solid ${tc.gate.canProceed ? COLORS.bullish : COLORS.bearish};">
      <div class="flex items-center gap-2">
        <span style="color: ${tc.gate.canProceed ? COLORS.bullish : COLORS.bearish};">${tc.gate.canProceed ? '✓' : '✗'}</span>
        <span class="text-sm font-bold">Gate: ${tc.gate.canProceed ? 'PASS' : 'BLOCKED'}</span>
      </div>
      <div class="text-xs text-muted mt-1">${escapeHtml(tc.gate.reason || '')}</div>
    </div>` : ''}

    <div class="watermark mt-4">traderpath.io</div>`;

  return htmlWrapper(content, `${data.symbol} - Trap Check`);
}

// ===========================================
// Template Registry
// ===========================================

export type SnapshotType = 'executive' | 'detailed';
export type SnapshotPage = {
  id: string;
  title: string;
  generate: (data: ReportData, chartSvg?: string) => string;
};

export function getExecutiveSummaryPages(): SnapshotPage[] {
  return [
    { id: 'exec-1-header', title: 'Header & Verdict', generate: execPage1_HeaderVerdict },
    { id: 'exec-2-steps', title: '7-Step Summary', generate: execPage2_SevenStepSummary },
    { id: 'exec-3-plan', title: 'Trade Plan', generate: execPage3_TradePlan },
    { id: 'exec-4-summary', title: 'AI Summary', generate: execPage4_AISummary },
  ];
}

export function getDetailedAnalysisPages(): SnapshotPage[] {
  return [
    { id: 'detail-1-header', title: 'Header & Verdict', generate: execPage1_HeaderVerdict },
    { id: 'detail-2-market', title: 'Market Pulse', generate: detailPage1_MarketPulse },
    { id: 'detail-3-asset', title: 'Asset Scanner', generate: detailPage2_AssetScanner },
    { id: 'detail-4-safety', title: 'Safety & Timing', generate: detailPage3_SafetyTiming },
    { id: 'detail-5-tokenomics', title: 'Tokenomics', generate: detailPage4_Tokenomics },
    { id: 'detail-6-plan', title: 'Trade Plan', generate: execPage3_TradePlan },
    { id: 'detail-7-trap', title: 'Trap Check', generate: detailPage5_TrapCheck },
    { id: 'detail-8-verdict', title: 'Final Verdict', generate: execPage4_AISummary },
  ];
}
