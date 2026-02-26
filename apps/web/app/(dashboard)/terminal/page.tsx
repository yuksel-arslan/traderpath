'use client';

// =============================================================================
// TraderPath Intelligence Terminal — Decision Engine Control Room
// Redesigned with intelligence UI components — 2026
// =============================================================================

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import {
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Sun,
  Moon,
  Eye,
  Loader2,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import {
  createChart,
  ColorType,
  CrosshairMode,
  LineStyle,
  IChartApi,
  CandlestickData,
  Time,
} from 'lightweight-charts';
import { cn, formatNumber, formatPrice, formatPriceValue } from '../../../lib/utils';
import { authFetch } from '../../../lib/api';
import dynamic from 'next/dynamic';

// New redesigned components
import { TerminalSidebar } from '../../../components/terminal/TerminalSidebar';
import { GlobalLiquidity } from '../../../components/terminal/GlobalLiquidity';
import { MarketFlow } from '../../../components/terminal/MarketFlow';
import { RotationMatrix } from '../../../components/terminal/RotationMatrix';
import { SectorActivity } from '../../../components/terminal/SectorActivity';
import { AIRecommendation } from '../../../components/terminal/AIRecommendation';
import { AssetTable } from '../../../components/terminal/AssetTable';
import { RunAnalysis } from '../../../components/terminal/RunAnalysis';
import {
  TradeHeader,
  TradeLevelCards,
  ForecastPanel,
  RiskMetrics,
} from '../../../components/terminal/TradeVisualizerMetrics';
import { PulseDot, VerdictBadge } from '../../../components/ui/intelligence';

const CoinIcon = dynamic(
  () => import('../../../components/common/CoinIcon').then(mod => ({ default: mod.CoinIcon })),
  { ssr: false, loading: () => <div className="w-5 h-5 rounded-full bg-neutral-200 dark:bg-neutral-800 animate-pulse shrink-0" /> }
);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MacroMetric {
  label: string;
  value: string;
  delta?: number;
  signal?: 'bullish' | 'bearish' | 'neutral';
}

interface MarketFlowData {
  market: string;
  flow7d: number;
  flow30d: number;
  velocity: number;
  phase: 'EARLY' | 'MID' | 'LATE' | 'EXIT';
  daysInPhase: number;
  rotationSignal: 'entering' | 'stable' | 'exiting' | null;
  marketCap: string;
}

interface SectorData {
  name: string;
  market: string;
  flow: number;
  dominance: number;
  trending: 'up' | 'down' | 'flat';
  topAssets: string[];
}

interface ScreenerAsset {
  rank: number;
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  volume: number;
  aiScore: number;
  trend: 'STRONG_UP' | 'UP' | 'FLAT' | 'DOWN' | 'STRONG_DOWN';
  verdict: 'GO' | 'COND' | 'WAIT' | 'AVOID';
  direction: 'LONG' | 'SHORT' | 'NEUTRAL';
  market: string;
  phase: 'EARLY' | 'MID' | 'LATE' | 'EXIT';
  rsi: number;
  macd: 'bullish' | 'bearish' | 'neutral';
  flowScore: number;
  analysisId?: string;
}

interface DecisionGate {
  label: string;
  passed: boolean;
  detail: string;
}

interface VerdictOpportunity {
  action: 'BUY' | 'SELL' | 'HOLD' | 'AVOID';
  market: string;
  confidence: number;
  reason: string;
  phase: 'EARLY' | 'MID' | 'LATE' | 'EXIT';
  suggestedAssets: string[];
}

interface VerdictData {
  gates: DecisionGate[];
  buy: VerdictOpportunity | null;
  sell: VerdictOpportunity | null;
  regime: 'RISK_ON' | 'RISK_OFF' | 'NEUTRAL';
  timestamp: string;
}

interface TradePlan {
  entry: number;
  sl: number;
  tp1: number;
  tp2: number;
  rr: number;
  direction: 'LONG' | 'SHORT';
}

interface AnalysisResult {
  symbol: string;
  classicDone: boolean;
  mlisDone: boolean;
  tradePlan?: TradePlan;
  verdict?: string;
  direction?: string;
  score?: number;
}

type SortKey = 'rank' | 'symbol' | 'price' | 'change24h' | 'volume' | 'aiScore' | 'trend';
type SortDir = 'asc' | 'desc';

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

type SectionId =
  | 'l1' | 'l2' | 'rotation' | 'l3' | 'l4'
  | 'l5'
  | 'analysis'
  | 'l7';

interface NavItem {
  id: SectionId;
  label: string;
  tag?: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Capital Flow',
    items: [
      { id: 'l1', label: 'Global Liquidity', tag: 'L1' },
      { id: 'l2', label: 'Market Flow', tag: 'L2' },
      { id: 'rotation', label: 'Rotation Matrix', tag: 'L2' },
      { id: 'l3', label: 'Sector Activity', tag: 'L3' },
      { id: 'l4', label: 'AI Recommendation', tag: 'L4' },
    ],
  },
  {
    title: 'Asset Analysis',
    items: [
      { id: 'l5', label: 'Asset Table', tag: '' },
      { id: 'analysis', label: 'Run Analysis', tag: '' },
    ],
  },
  {
    title: 'Visualizer',
    items: [
      { id: 'l7', label: 'Trade Visualizer', tag: 'L7' },
    ],
  },
];

// ---------------------------------------------------------------------------
// API Data Mapping — Capital Flow + Top Coins
// ---------------------------------------------------------------------------

function mapMacroMetrics(gl: Record<string, any> | null | undefined): MacroMetric[] {
  if (!gl) return [];
  const metrics: MacroMetric[] = [];
  if (gl.m2MoneySupply) {
    const val = Number(gl.m2MoneySupply.value ?? 0);
    const growth = Number(gl.m2MoneySupply.yoyGrowth ?? 0);
    metrics.push({
      label: 'M2 Supply',
      value: val > 0 ? `$${(val / 1e12).toFixed(1)}T` : 'N/A',
      delta: growth,
      signal: growth > 0 ? 'bullish' : 'bearish',
    });
  }
  if (gl.fedBalanceSheet) {
    const val = Number(gl.fedBalanceSheet.value ?? 0);
    const change = Number(gl.fedBalanceSheet.monthlyChange ?? 0);
    metrics.push({
      label: 'Fed BS',
      value: val > 0 ? `$${(val / 1e12).toFixed(1)}T` : 'N/A',
      delta: change,
      signal: change > 0 ? 'bullish' : change < -2 ? 'bearish' : 'neutral',
    });
  }
  if (gl.dxy) {
    const val = Number(gl.dxy.value ?? 0);
    const change = Number(gl.dxy.weeklyChange ?? 0);
    metrics.push({
      label: 'DXY',
      value: val > 0 ? val.toFixed(2) : 'N/A',
      delta: change,
      signal: change < 0 ? 'bullish' : 'bearish',
    });
  }
  if (gl.vix) {
    const val = Number(gl.vix.value ?? 0);
    const change = Number(gl.vix.weeklyChange ?? 0);
    metrics.push({
      label: 'VIX',
      value: val > 0 ? val.toFixed(1) : 'N/A',
      delta: change,
      signal: val < 20 ? 'bullish' : val > 30 ? 'bearish' : 'neutral',
    });
  }
  if (gl.yieldCurve) {
    const us10y = Number(gl.yieldCurve.us10y ?? 0);
    const spread = Number(gl.yieldCurve.spread10y2y ?? 0);
    metrics.push({
      label: 'US10Y',
      value: us10y > 0 ? `${us10y.toFixed(2)}%` : 'N/A',
      delta: Number(gl.yieldCurve.weeklyChange10y ?? 0),
      signal: 'neutral',
    });
    metrics.push({
      label: 'Yield Curve',
      value: spread > 0 ? `+${spread.toFixed(2)}` : spread.toFixed(2),
      delta: Number(gl.yieldCurve.weeklyChangeSpread ?? 0),
      signal: spread > 0 ? 'bullish' : 'bearish',
    });
  }
  return metrics;
}

function mapMarketFlows(markets: any[] | null | undefined): MarketFlowData[] {
  if (!Array.isArray(markets)) return [];
  return markets.filter(m => m && m.market).map(m => ({
    market: String(m.market || '').charAt(0).toUpperCase() + String(m.market || '').slice(1).toLowerCase(),
    flow7d: Number(m.flow7d ?? 0),
    flow30d: Number(m.flow30d ?? 0),
    velocity: Number(m.flowVelocity ?? 0),
    phase: String(m.phase ?? 'MID').toUpperCase() as 'EARLY' | 'MID' | 'LATE' | 'EXIT',
    daysInPhase: Number(m.daysInPhase ?? 0),
    rotationSignal: m.rotationSignal || null,
    marketCap: m.currentValue ? `$${formatNumber(m.currentValue)}` : 'N/A',
  }));
}

function mapSectors(markets: any[] | null | undefined): SectorData[] {
  if (!Array.isArray(markets)) return [];
  const sectors: SectorData[] = [];
  for (const m of markets) {
    if (!m || !Array.isArray(m.sectors)) continue;
    const marketName = String(m.market || '').charAt(0).toUpperCase() + String(m.market || '').slice(1).toLowerCase();
    for (const s of m.sectors) {
      if (!s) continue;
      const flow = Number(s.flow ?? s.flow7d ?? s.weeklyFlow ?? 0);
      sectors.push({
        name: String(s.name ?? ''),
        market: marketName,
        flow,
        dominance: Number(s.dominance ?? 0),
        trending: flow > 1 ? 'up' : flow < -1 ? 'down' : 'flat',
        topAssets: Array.isArray(s.topAssets) ? s.topAssets : [],
      });
    }
  }
  return sectors.sort((a, b) => b.flow - a.flow);
}

function mapScreenerAssets(items: any[] | null | undefined): ScreenerAsset[] {
  if (!Array.isArray(items)) return [];
  return items.map((item, idx) => {
    const symbol = String(item.symbol ?? '');
    const verdict = String(item.verdict ?? 'WAIT').toUpperCase();
    const dir = String(item.direction ?? 'NEUTRAL').toUpperCase();
    const score = Number(item.totalScore ?? item.reliabilityScore ?? item.score ?? 0);
    const change = Number(item.change24h ?? item.priceChange24h ?? 0);
    let trend: ScreenerAsset['trend'] = 'FLAT';
    if (change > 5) trend = 'STRONG_UP';
    else if (change > 1) trend = 'UP';
    else if (change < -5) trend = 'STRONG_DOWN';
    else if (change < -1) trend = 'DOWN';
    return {
      rank: idx + 1,
      symbol,
      name: String(item.name ?? symbol),
      price: Number(item.currentPrice ?? item.price ?? 0),
      change24h: change,
      volume: Number(item.volume ?? item.volume24h ?? 0),
      aiScore: Math.round(score * 10),
      trend,
      verdict: (['GO', 'COND', 'WAIT', 'AVOID'].includes(verdict) ? verdict : 'WAIT') as ScreenerAsset['verdict'],
      direction: (['LONG', 'SHORT', 'NEUTRAL'].includes(dir) ? dir : 'NEUTRAL') as ScreenerAsset['direction'],
      market: String(item.market ?? item.assetClass ?? 'Crypto'),
      phase: String(item.phase ?? 'MID').toUpperCase() as ScreenerAsset['phase'],
      rsi: Number(item.rsi ?? 50),
      macd: String(item.macd ?? 'neutral') as ScreenerAsset['macd'],
      flowScore: Number(item.flowScore ?? 50),
      analysisId: item.analysisId ? String(item.analysisId) : undefined,
    };
  });
}

function mapVerdictData(data: Record<string, any> | null | undefined): VerdictData {
  if (!data) return { gates: [], buy: null, sell: null, regime: 'NEUTRAL', timestamp: '--:--' };
  const bias = String(data.liquidityBias ?? 'neutral').toLowerCase();
  const rec = data.recommendation as Record<string, any> | undefined;
  const sellRec = data.sellRecommendation as Record<string, any> | undefined;
  const gl = data.globalLiquidity as Record<string, any> | undefined;

  const gates: DecisionGate[] = [
    {
      label: 'Liquidity Expanding',
      passed: bias === 'risk_on',
      detail: data.insights?.ragLayer1 || `Liquidity bias: ${bias.replace('_', ' ')}`,
    },
    {
      label: 'USD Weakening',
      passed: Number(gl?.dxy?.weeklyChange ?? 0) < 0,
      detail: `DXY ${Number(gl?.dxy?.value ?? 0).toFixed(2)} (${Number(gl?.dxy?.weeklyChange ?? 0).toFixed(1)}% weekly)`,
    },
    {
      label: 'Capital Destination',
      passed: !!rec?.primaryMarket,
      detail: rec ? `${rec.primaryMarket} leads (${String(rec.phase ?? '').toUpperCase()} phase)` : 'No clear destination',
    },
    {
      label: 'Sector Confirmed',
      passed: Array.isArray(rec?.sectors) && rec.sectors.length > 0,
      detail: data.insights?.ragLayer3 || 'Sector activity assessment',
    },
    {
      label: 'Phase Timing',
      passed: String(rec?.phase ?? '').toLowerCase() === 'early' || String(rec?.phase ?? '').toLowerCase() === 'mid',
      detail: rec ? `${String(rec.phase ?? '').toUpperCase()} phase` : 'Unknown phase',
    },
  ];

  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

  let buy: VerdictOpportunity | null = null;
  if (rec && String(rec.direction ?? '').toLowerCase() === 'buy') {
    buy = {
      action: 'BUY',
      market: capitalize(String(rec.primaryMarket ?? '')),
      confidence: Number(rec.confidence ?? 0),
      reason: String(rec.reason ?? ''),
      phase: String(rec.phase ?? 'MID').toUpperCase() as VerdictOpportunity['phase'],
      suggestedAssets: Array.isArray(rec.suggestedAssets)
        ? rec.suggestedAssets.map((a: any) => String(typeof a === 'string' ? a : a?.symbol ?? a))
        : [],
    };
  }

  let sell: VerdictOpportunity | null = null;
  if (sellRec && String(sellRec.direction ?? '').toLowerCase() === 'sell') {
    sell = {
      action: 'SELL',
      market: capitalize(String(sellRec.primaryMarket ?? '')),
      confidence: Number(sellRec.confidence ?? 0),
      reason: String(sellRec.reason ?? ''),
      phase: String(sellRec.phase ?? 'EXIT').toUpperCase() as VerdictOpportunity['phase'],
      suggestedAssets: Array.isArray(sellRec.suggestedAssets)
        ? sellRec.suggestedAssets.map((a: any) => String(typeof a === 'string' ? a : a?.symbol ?? a))
        : [],
    };
  }

  return {
    gates,
    buy,
    sell,
    regime: bias === 'risk_on' ? 'RISK_ON' : bias === 'risk_off' ? 'RISK_OFF' : 'NEUTRAL',
    timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
  };
}

// Derives quick trade plan levels from asset price + direction
function calculateTradePlan(asset: ScreenerAsset): TradePlan {
  const isLong = asset.direction === 'LONG';
  const entry = asset.price;
  const slPct = 0.035;
  const tp1Pct = 0.05;
  const tp2Pct = 0.10;

  return {
    entry,
    sl: isLong ? entry * (1 - slPct) : entry * (1 + slPct),
    tp1: isLong ? entry * (1 + tp1Pct) : entry * (1 - tp1Pct),
    tp2: isLong ? entry * (1 + tp2Pct) : entry * (1 - tp2Pct),
    rr: tp1Pct / slPct,
    direction: isLong ? 'LONG' : 'SHORT',
  };
}

// ---------------------------------------------------------------------------
// L7: Trade Visualizer (Lightweight Charts — PRESERVED AS-IS)
// ---------------------------------------------------------------------------

function L7TradeVisualizer({
  selectedAsset,
  tradePlan,
}: {
  selectedAsset: ScreenerAsset | null;
  tradePlan: TradePlan | null;
}) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [resolvedPlan, setResolvedPlan] = useState<TradePlan | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch real trade plan from latest analysis when analysisId exists
  useEffect(() => {
    if (!selectedAsset?.analysisId) {
      setResolvedPlan(tradePlan);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await authFetch(`/api/analysis/${selectedAsset.analysisId}`);
        if (!res.ok || cancelled) { setResolvedPlan(tradePlan); return; }
        const json = await res.json();
        const analysis = json?.data;
        const step5 = analysis?.step5Result;
        if (step5 && !cancelled) {
          const dir = (step5.direction?.toUpperCase() === 'SHORT') ? 'SHORT' : 'LONG';
          const entry = Number(step5.averageEntry || step5.entryPrice || 0);
          const sl = Number(step5.stopLoss?.price || 0);
          const tp1 = Number(step5.takeProfits?.[0]?.price || 0);
          const tp2 = Number(step5.takeProfits?.[1]?.price || step5.takeProfits?.[0]?.price || 0);
          const slPct = entry > 0 ? Math.abs(entry - sl) / entry : 0;
          const tp1Pct = entry > 0 ? Math.abs(tp1 - entry) / entry : 0;
          const rr = slPct > 0 ? tp1Pct / slPct : 0;

          if (entry > 0 && sl > 0 && tp1 > 0) {
            setResolvedPlan({ entry, sl, tp1, tp2: tp2 || tp1, rr, direction: dir as TradePlan['direction'] });
            return;
          }
        }
        if (!cancelled) setResolvedPlan(tradePlan);
      } catch {
        if (!cancelled) setResolvedPlan(tradePlan);
      }
    })();

    return () => { cancelled = true; };
  }, [selectedAsset?.analysisId, tradePlan]);

  useEffect(() => {
    if (!mounted || !chartContainerRef.current || !selectedAsset) return;

    let chart: IChartApi | null = null;

    const initChart = async () => {
      if (!chartContainerRef.current) return;

      const isDark = resolvedTheme === 'dark';

      chart = createChart(chartContainerRef.current, {
        width: chartContainerRef.current.clientWidth,
        height: chartContainerRef.current.clientHeight,
        layout: {
          background: { type: ColorType.Solid, color: isDark ? '#0a0a0a' : '#FFFFFF' },
          textColor: isDark ? '#737373' : '#A3A3A3',
          fontFamily: "'Inter', sans-serif",
          fontSize: 10,
        },
        grid: {
          vertLines: { color: isDark ? '#171717' : '#F5F5F5' },
          horzLines: { color: isDark ? '#171717' : '#F5F5F5' },
        },
        crosshair: {
          mode: CrosshairMode.Normal,
          vertLine: {
            color: isDark ? '#404040' : '#D4D4D4',
            width: 1,
            style: LineStyle.Dotted,
            labelBackgroundColor: isDark ? '#262626' : '#F5F5F5',
          },
          horzLine: {
            color: isDark ? '#404040' : '#D4D4D4',
            width: 1,
            style: LineStyle.Dotted,
            labelBackgroundColor: isDark ? '#262626' : '#F5F5F5',
          },
        },
        timeScale: {
          borderColor: isDark ? '#262626' : '#E5E5E5',
          timeVisible: true,
          secondsVisible: false,
        },
        rightPriceScale: {
          borderColor: isDark ? '#262626' : '#E5E5E5',
          scaleMargins: { top: 0.1, bottom: 0.1 },
        },
      });

      chartRef.current = chart;

      // Fetch real candle data from API
      let candles: CandlestickData<Time>[] = [];
      try {
        const res = await authFetch(`/api/analysis/chart/candles?symbol=${encodeURIComponent(selectedAsset.symbol)}&interval=1h&limit=100`);
        if (res.ok) {
          const json = await res.json();
          const raw = json?.data?.candles ?? json?.data ?? json ?? [];
          if (Array.isArray(raw) && raw.length > 0) {
            candles = raw.map((c: any) => ({
              time: (typeof c.time === 'number' ? c.time : Math.floor(new Date(c.time ?? c.openTime ?? 0).getTime() / 1000)) as Time,
              open: Number(c.open ?? c.o ?? 0),
              high: Number(c.high ?? c.h ?? 0),
              low: Number(c.low ?? c.l ?? 0),
              close: Number(c.close ?? c.c ?? 0),
            }));
          }
        }
      } catch {
        // fallback: empty candles
      }

      if (candles.length === 0) {
        const basePrice = selectedAsset.price || 100;
        const now = Math.floor(Date.now() / 1000);
        for (let i = 50; i >= 0; i--) {
          const time = (now - i * 3600) as Time;
          candles.push({ time, open: basePrice, high: basePrice * 1.001, low: basePrice * 0.999, close: basePrice });
        }
      }

      const series = chart.addCandlestickSeries({
        upColor: '#22C55E',
        downColor: '#EF4444',
        borderUpColor: '#22C55E',
        borderDownColor: '#EF4444',
        wickUpColor: '#22C55E',
        wickDownColor: '#EF4444',
      });

      series.setData(candles);

      // Trade plan lines — use resolvedPlan (from analysis API) or fallback to prop
      const activePlan = resolvedPlan || tradePlan;
      if (activePlan) {
        series.createPriceLine({ price: activePlan.entry, color: '#3B82F6', lineWidth: 1, lineStyle: LineStyle.Solid, axisLabelVisible: true, title: 'ENTRY' });
        series.createPriceLine({ price: activePlan.sl, color: '#EF4444', lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: 'SL' });
        series.createPriceLine({ price: activePlan.tp1, color: '#22C55E', lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: 'TP1' });
        series.createPriceLine({ price: activePlan.tp2, color: '#84CC16', lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: 'TP2' });
      }

      // Forecast Path — starts from the LAST candle and extends 48h into the future only
      const isLong = selectedAsset.direction === 'LONG';
      const score = selectedAsset.aiScore;
      const pctMove = (score / 100) * 8;

      const lastCandle = candles[candles.length - 1];
      const forecastStartPrice = lastCandle.close;
      const forecastStartTime = lastCandle.time as number;
      const forecastDuration = 48 * 3600; // 48 hours forward
      const forecastSteps = 60;

      const p50Data: { time: Time; value: number }[] = [];
      const p90Data: { time: Time; value: number }[] = [];
      const p10Data: { time: Time; value: number }[] = [];

      for (let s = 0; s <= forecastSteps; s++) {
        const t = (forecastStartTime + Math.round((s / forecastSteps) * forecastDuration)) as Time;
        const progress = s / forecastSteps;
        const ease = 1 - Math.pow(1 - progress, 2);
        const p50Offset = (pctMove / 100) * ease * (isLong ? 1 : -1);
        const bandWidth = (pctMove / 100) * 0.6 * ease;
        const p90Offset = p50Offset + bandWidth * (isLong ? 1 : -1);
        const p10Offset = p50Offset - bandWidth * (isLong ? 1 : -1);
        p50Data.push({ time: t, value: forecastStartPrice * (1 + p50Offset) });
        p90Data.push({ time: t, value: forecastStartPrice * (1 + p90Offset) });
        p10Data.push({ time: t, value: forecastStartPrice * (1 + p10Offset) });
      }

      const p90Area = chart.addAreaSeries({ lineColor: 'rgba(34, 197, 94, 0.3)', topColor: 'rgba(34, 197, 94, 0.08)', bottomColor: 'rgba(34, 197, 94, 0.0)', lineWidth: 1, lineStyle: LineStyle.Dotted, priceLineVisible: false, crosshairMarkerVisible: false, lastValueVisible: false });
      p90Area.setData(p90Data);
      const p10Area = chart.addAreaSeries({ lineColor: 'rgba(34, 197, 94, 0.3)', topColor: 'rgba(34, 197, 94, 0.0)', bottomColor: 'rgba(34, 197, 94, 0.08)', lineWidth: 1, lineStyle: LineStyle.Dotted, priceLineVisible: false, crosshairMarkerVisible: false, lastValueVisible: false });
      p10Area.setData(p10Data);
      const p50Line = chart.addLineSeries({ color: '#22C55E', lineWidth: 2, lineStyle: LineStyle.Dashed, priceLineVisible: false, crosshairMarkerVisible: false, lastValueVisible: true });
      p50Line.setData(p50Data);

      chart.timeScale().fitContent();

      const resizeObserver = new ResizeObserver((entries) => {
        if (chart && entries[0]) {
          const { width, height } = entries[0].contentRect;
          chart.resize(width, height);
        }
      });
      resizeObserver.observe(chartContainerRef.current);

      return () => { resizeObserver.disconnect(); };
    };

    let cancelled = false;
    let cleanupFn: (() => void) | undefined;

    initChart().then((fn) => {
      if (cancelled) { fn?.(); } else { cleanupFn = fn ?? undefined; }
    });

    return () => {
      cancelled = true;
      cleanupFn?.();
      if (chart) { chart.remove(); chart = null; chartRef.current = null; }
    };
  }, [mounted, selectedAsset, tradePlan, resolvedPlan, resolvedTheme]);

  if (!selectedAsset) {
    return (
      <section>
        <div
          className="rounded-xl h-[300px] sm:h-[400px] flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="text-center">
            <Eye className="w-5 h-5 text-gray-400 dark:text-white/30 mx-auto mb-2" />
            <p className="text-xs text-gray-400 dark:text-white/40">Select an asset from the screener</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section>
      {/* Trade Header with ScoreRing + VerdictBadge */}
      <TradeHeader asset={selectedAsset} />

      {/* Chart */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div ref={chartContainerRef} className="w-full h-[300px] sm:h-[400px]" />
      </div>

      {/* Trade Level Cards (Entry/SL/TP1/TP2/R:R) — uses analysis data when available */}
      {(resolvedPlan || tradePlan) && <TradeLevelCards tradePlan={(resolvedPlan || tradePlan)!} />}

      {/* Forecast Panel */}
      <ForecastPanel selectedAsset={selectedAsset} />

      {/* Risk Metrics */}
      {(resolvedPlan || tradePlan) && <RiskMetrics tradePlan={(resolvedPlan || tradePlan)!} selectedAsset={selectedAsset} />}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Terminal Header
// ---------------------------------------------------------------------------

function TerminalHeader() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="flex items-center justify-between py-3">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 bg-[#14B8A6] rounded-full" />
          <div className="w-2 h-2 bg-[#EF5A6F] rounded-full" />
        </div>
        <span className="text-sm font-bold tracking-tight bg-gradient-to-r from-[#14B8A6] to-[#EF5A6F] bg-clip-text text-transparent">
          TERMINAL
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <PulseDot color="#22C55E" size={8} />
          <span className="text-[10px] text-gray-400 dark:text-white/40 uppercase tracking-wider hidden sm:inline">
            Live
          </span>
        </div>

        {mounted && (
          <button
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            className="p-1.5 text-gray-400 dark:text-white/40 hover:text-gray-900 dark:hover:text-white transition-colors"
            aria-label="Toggle theme"
          >
            {resolvedTheme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------------
// Content Panel — Routes active section to new components
// ---------------------------------------------------------------------------

function ContentPanel({
  activeSection,
  macroMetrics,
  marketFlows,
  sectors,
  verdict,
  screenerData,
  selectedAsset,
  tradePlan,
  onAssetSelect,
  l1Interpretation,
  l2Interpretation,
  marketFilter,
  setMarketFilter,
  recommendedSymbols,
  analysisResults,
  onAnalysisComplete,
  onAssetChipClick,
  onAnalyze,
  onVisualize,
  cfData,
}: {
  activeSection: SectionId;
  macroMetrics: MacroMetric[];
  marketFlows: MarketFlowData[];
  sectors: SectorData[];
  verdict: VerdictData;
  screenerData: ScreenerAsset[];
  selectedAsset: ScreenerAsset | null;
  tradePlan: TradePlan | null;
  onAssetSelect: (asset: ScreenerAsset) => void;
  l1Interpretation?: string;
  l2Interpretation?: string;
  marketFilter: string;
  setMarketFilter: (f: string) => void;
  recommendedSymbols: string[];
  analysisResults: AnalysisResult[];
  onAnalysisComplete: (results: AnalysisResult[]) => void;
  onAssetChipClick?: (symbol: string) => void;
  onAnalyze?: (symbol: string) => void;
  onVisualize?: (symbol: string) => void;
  cfData: Record<string, any> | null;
}) {
  // Determine L1 regime from cfData
  const l1Regime: 'EXPANDING' | 'CONTRACTING' | 'NEUTRAL' = (() => {
    const bias = String(cfData?.liquidityBias ?? 'neutral').toLowerCase();
    if (bias === 'risk_on') return 'EXPANDING';
    if (bias === 'risk_off') return 'CONTRACTING';
    return 'NEUTRAL';
  })();

  const l1Confidence = Number(cfData?.recommendation?.confidence ?? cfData?.overallConfidence ?? 50);

  switch (activeSection) {
    case 'l1':
      return (
        <GlobalLiquidity
          metrics={macroMetrics}
          interpretation={l1Interpretation}
          regime={l1Regime}
          confidence={l1Confidence}
        />
      );
    case 'l2':
      return (
        <MarketFlow
          flows={marketFlows}
          interpretation={l2Interpretation}
        />
      );
    case 'rotation':
      return <RotationMatrix flows={marketFlows} />;
    case 'l3':
      return (
        <SectorActivity
          sectors={sectors}
          marketFilter={marketFilter}
          setMarketFilter={setMarketFilter}
        />
      );
    case 'l4':
      return (
        <AIRecommendation
          verdict={verdict}
          onAssetClick={onAssetChipClick}
        />
      );
    case 'l5':
      return (
        <AssetTable
          assets={screenerData}
          selectedSymbol={selectedAsset?.symbol ?? null}
          onSelect={onAssetSelect}
          recommendedSymbols={recommendedSymbols}
          onAnalyze={onAnalyze}
          onVisualize={onVisualize}
        />
      );
    case 'analysis':
      return (
        <RunAnalysis
          screenerData={screenerData}
          recommendedSymbols={recommendedSymbols}
          onAnalysisComplete={onAnalysisComplete}
          calculateTradePlan={calculateTradePlan}
        />
      );
    case 'l7':
      return (
        <L7TradeVisualizer
          selectedAsset={selectedAsset}
          tradePlan={tradePlan}
        />
      );
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Main Terminal Page
// ---------------------------------------------------------------------------

export default function TestPage() {
  // API data
  const [cfData, setCfData] = useState<Record<string, any> | null>(null);
  const [topCoinsRaw, setTopCoinsRaw] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selection state
  const [selectedAsset, setSelectedAsset] = useState<ScreenerAsset | null>(null);
  const [tradePlan, setTradePlan] = useState<TradePlan | null>(null);

  // Analysis results state
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);

  // Navigation
  const [activeSection, setActiveSection] = useState<SectionId>('l1');
  const [marketFilter, setMarketFilter] = useState('All');

  // Fetch Capital Flow + Top Coins on mount
  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [cfRes, coinsRes] = await Promise.all([
          authFetch('/api/capital-flow/summary'),
          authFetch('/api/analysis/top-coins?limit=20&sortBy=reliabilityScore'),
        ]);
        if (cancelled) return;
        const cfJson = cfRes.ok ? await cfRes.json() : null;
        const coinsJson = coinsRes.ok ? await coinsRes.json() : null;
        setCfData(cfJson?.data ?? cfJson ?? null);
        const coins = coinsJson?.data?.coins ?? coinsJson?.data ?? coinsJson?.coins ?? [];
        setTopCoinsRaw(Array.isArray(coins) ? coins : []);
      } catch (err: any) {
        if (!cancelled) setError(err?.message || 'Failed to load terminal data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    return () => { cancelled = true; };
  }, []);

  // Derive display data from API responses
  const macroMetrics = useMemo(() => mapMacroMetrics(cfData?.globalLiquidity ?? cfData), [cfData]);
  const marketFlows = useMemo(() => mapMarketFlows(cfData?.markets), [cfData]);
  const sectors = useMemo(() => mapSectors(cfData?.markets), [cfData]);
  const screenerData = useMemo(() => mapScreenerAssets(topCoinsRaw), [topCoinsRaw]);
  const verdict = useMemo(() => mapVerdictData(cfData), [cfData]);
  const l1Interpretation = cfData?.insights?.ragLayer1 as string | undefined;
  const l2Interpretation = cfData?.insights?.ragLayer2 as string | undefined;

  // Derive recommended symbols from L4 verdict
  const recommendedSymbols = useMemo(() => {
    const syms: string[] = [];
    if (verdict.buy?.suggestedAssets) {
      syms.push(...verdict.buy.suggestedAssets.map(s => s.toUpperCase()));
    }
    if (verdict.sell?.suggestedAssets) {
      syms.push(...verdict.sell.suggestedAssets.map(s => s.toUpperCase()));
    }
    return [...new Set(syms)];
  }, [verdict]);

  // Derive sidebar status indicators
  const capitalFlowDirection = useMemo<'up' | 'down' | 'neutral'>(() => {
    const bias = String(cfData?.liquidityBias ?? 'neutral').toLowerCase();
    if (bias === 'risk_on') return 'up';
    if (bias === 'risk_off') return 'down';
    return 'neutral';
  }, [cfData]);

  const handleAssetSelect = useCallback((asset: ScreenerAsset) => {
    setSelectedAsset(asset);
    setTradePlan(calculateTradePlan(asset));
    setActiveSection('l7');
  }, []);

  const handleAnalysisComplete = useCallback((results: AnalysisResult[]) => {
    setAnalysisResults(results);
    const first = results.find(r => r.tradePlan);
    if (first) {
      const asset = screenerData.find(a => a.symbol.toUpperCase() === first.symbol.toUpperCase());
      if (asset) {
        setSelectedAsset(asset);
        setTradePlan(first.tradePlan ?? calculateTradePlan(asset));
      }
    }
    setActiveSection('l7');
  }, [screenerData]);

  const handleNavClick = useCallback((id: string) => {
    setActiveSection(id as SectionId);
  }, []);

  const handleAssetChipClick = useCallback((symbol: string) => {
    const asset = screenerData.find(a => a.symbol.toUpperCase() === symbol.toUpperCase());
    if (asset) {
      handleAssetSelect(asset);
    }
  }, [screenerData, handleAssetSelect]);

  const handleAnalyze = useCallback((symbol: string) => {
    setActiveSection('analysis');
  }, []);

  const handleVisualize = useCallback((symbol: string) => {
    const asset = screenerData.find(a => a.symbol.toUpperCase() === symbol.toUpperCase());
    if (asset) {
      setSelectedAsset(asset);
      setTradePlan(calculateTradePlan(asset));
      setActiveSection('l7');
    }
  }, [screenerData]);

  // Reload handler
  const handleRetry = useCallback(() => {
    setCfData(null);
    setTopCoinsRaw([]);
    setLoading(true);
    setError(null);
    Promise.all([
      authFetch('/api/capital-flow/summary'),
      authFetch('/api/analysis/top-coins?limit=20&sortBy=reliabilityScore'),
    ]).then(async ([cfRes, coinsRes]) => {
      const cfJson = cfRes.ok ? await cfRes.json() : null;
      const coinsJson = coinsRes.ok ? await coinsRes.json() : null;
      setCfData(cfJson?.data ?? cfJson ?? null);
      const coins = coinsJson?.data?.coins ?? coinsJson?.data ?? coinsJson?.coins ?? [];
      setTopCoinsRaw(Array.isArray(coins) ? coins : []);
    }).catch((err: any) => {
      setError(err?.message || 'Failed to load terminal data');
    }).finally(() => {
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-white dark:bg-[#0A0B0F]">
        <div className="text-center">
          <Loader2 className="w-6 h-6 animate-spin text-[#00D4FF] mx-auto mb-3" />
          <p className="text-xs text-gray-400 dark:text-white/40">Loading terminal data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-white dark:bg-[#0A0B0F]">
        <div className="text-center">
          <AlertTriangle className="w-6 h-6 text-[#FFB800] mx-auto mb-3" />
          <p className="text-xs text-gray-400 dark:text-white/40 mb-3">{error}</p>
          <button
            onClick={handleRetry}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-colors text-gray-400 dark:text-white/40 hover:text-white"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <RefreshCw className="w-3 h-3" /> Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-[#0A0B0F] text-gray-900 dark:text-white overflow-hidden">
      <div className="max-w-7xl mx-auto w-full px-3 sm:px-4 flex flex-col h-full">
        <TerminalHeader />

        {/* Mobile: Horizontal scroll tab bar */}
        <div className="lg:hidden mt-3 -mx-3 px-3 overflow-x-auto scrollbar-none">
          <div className="flex gap-1 w-max">
            {NAV_GROUPS.flatMap((g) => g.items).map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={cn(
                  'px-3 py-2 text-[10px] uppercase tracking-wider transition-colors whitespace-nowrap rounded-lg',
                  activeSection === item.id
                    ? 'bg-[#00D4FF]/10 text-[#00D4FF] font-semibold'
                    : 'text-gray-400 dark:text-white/40',
                )}
                style={
                  activeSection === item.id
                    ? { border: '1px solid rgba(0,212,255,0.2)' }
                    : { border: '1px solid transparent' }
                }
              >
                {item.tag && (
                  <span className="text-[9px] opacity-50 mr-1">{item.tag}</span>
                )}
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Desktop: Sidebar + Content Panel */}
        <div className="mt-4 flex-1 min-h-0 flex gap-0">
          {/* New redesigned sidebar */}
          <TerminalSidebar
            navGroups={NAV_GROUPS}
            activeSection={activeSection}
            onNavClick={handleNavClick}
            selectedAsset={
              selectedAsset
                ? {
                    symbol: selectedAsset.symbol,
                    price: selectedAsset.price,
                    change24h: selectedAsset.change24h,
                    aiScore: selectedAsset.aiScore,
                    verdict: selectedAsset.verdict,
                    direction: selectedAsset.direction,
                  }
                : null
            }
            capitalFlowDirection={capitalFlowDirection}
            recentAnalysisCount={analysisResults.length}
            activeChart={!!selectedAsset && activeSection === 'l7'}
          />

          {/* Content Panel */}
          <main className="flex-1 min-w-0 overflow-y-auto scrollbar-none lg:pl-5 py-1 pb-4">
            <ContentPanel
              activeSection={activeSection}
              macroMetrics={macroMetrics}
              marketFlows={marketFlows}
              sectors={sectors}
              verdict={verdict}
              screenerData={screenerData}
              selectedAsset={selectedAsset}
              tradePlan={tradePlan}
              onAssetSelect={handleAssetSelect}
              l1Interpretation={l1Interpretation}
              l2Interpretation={l2Interpretation}
              marketFilter={marketFilter}
              setMarketFilter={setMarketFilter}
              recommendedSymbols={recommendedSymbols}
              analysisResults={analysisResults}
              onAnalysisComplete={handleAnalysisComplete}
              onAssetChipClick={handleAssetChipClick}
              onAnalyze={handleAnalyze}
              onVisualize={handleVisualize}
              cfData={cfData}
            />
          </main>
        </div>
      </div>
    </div>
  );
}
