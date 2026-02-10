'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { cn } from '../../../lib/utils';

const BacktestPerformance = dynamic(
  () => import('../../../components/methodology/BacktestPerformance'),
  {
    ssr: false,
    loading: () => (
      <div className="h-48 bg-neutral-100 dark:bg-neutral-900 rounded-sm animate-pulse" />
    ),
  }
);

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const SEVEN_STEPS = [
  {
    step: 1,
    name: 'Market Pulse',
    description:
      'Macro-regime classification via composite scoring of volatility surfaces (VIX term structure), cross-asset correlation matrices, and funding rate divergences.',
    metrics: [
      'VIX Term Structure',
      'Funding Rate Spread',
      'BTC Dominance Delta',
      'Fear & Greed Composite',
    ],
  },
  {
    step: 2,
    name: 'Asset Scanner',
    description:
      'Multi-timeframe technical decomposition using 40+ indicators with adaptive weighting based on current volatility regime.',
    metrics: [
      'RSI / Stochastic Oscillator',
      'MACD Histogram Divergence',
      'Bollinger Band Width',
      'ADX Trend Strength',
    ],
  },
  {
    step: 3,
    name: 'Safety Check',
    description:
      'Microstructure analysis combining order book imbalance detection, wash-trading filters, and liquidity depth assessment.',
    metrics: [
      'Bid-Ask Imbalance Ratio',
      'Order Book Depth (40 levels)',
      'Spoofing Detection Score',
      'Liquidity Score',
    ],
  },
  {
    step: 4,
    name: 'Timing Analysis',
    description:
      'Entry optimization through confluence of support/resistance clustering, economic calendar event proximity, and intraday volume profile.',
    metrics: [
      'S/R Cluster Proximity',
      'Economic Event Window',
      'Volume Profile (VPOC)',
      'Momentum Confluence',
    ],
  },
  {
    step: 5,
    name: 'Trade Plan',
    description:
      'Structured position construction with AI-optimized entry, stop-loss, and take-profit levels derived from ATR-adjusted support/resistance.',
    metrics: [
      'ATR-Based Stop Distance',
      'R:R Optimization',
      'AI Price Prediction',
      'Position Sizing',
    ],
  },
  {
    step: 6,
    name: 'Trap Check',
    description:
      'Counter-trend signal detection by analyzing liquidation heatmaps, whale position clustering, and smart money flow divergence.',
    metrics: [
      'Liquidation Density Map',
      'Whale Wallet Monitoring',
      'Open Interest Delta',
      'Smart Money Index',
    ],
  },
  {
    step: 7,
    name: 'Final Verdict',
    description:
      'Weighted ensemble verdict aggregating all prior steps with confidence intervals and directional conviction scoring.',
    metrics: [
      'Composite Score (0-10)',
      'Confidence Interval',
      'Direction Conviction',
      'Verdict: GO / COND / WAIT / AVOID',
    ],
  },
];

const MLIS_LAYERS = [
  {
    layer: 1,
    name: 'Technical',
    description:
      'Convolutional feature extraction from raw OHLCV sequences across multiple lookback windows.',
    signal: 'Pattern recognition strength',
  },
  {
    layer: 2,
    name: 'Momentum',
    description:
      'Velocity and acceleration decomposition of trend indicators with regime-adaptive thresholds.',
    signal: 'Trend persistence probability',
  },
  {
    layer: 3,
    name: 'Volatility',
    description:
      'GARCH-family variance modeling with regime-switching detection for risk surface estimation.',
    signal: 'Volatility regime classification',
  },
  {
    layer: 4,
    name: 'Volume',
    description:
      'On-balance volume divergence analysis with institutional flow estimation from tick-level data.',
    signal: 'Accumulation / Distribution score',
  },
  {
    layer: 5,
    name: 'Verdict',
    description:
      'Ensemble aggregation with calibrated confidence output (Platt scaling) and recommendation mapping.',
    signal: 'STRONG_BUY / BUY / HOLD / SELL',
  },
];

const DATA_SOURCES = [
  {
    provider: 'FRED (Federal Reserve)',
    domain: 'Macroeconomic',
    coverage: 'US monetary policy, treasury yields, M2',
    refresh: 'Daily / Weekly',
  },
  {
    provider: 'Binance',
    domain: 'Crypto OHLCV + Order Book',
    coverage: '500+ crypto pairs',
    refresh: 'Real-time',
  },
  {
    provider: 'Yahoo Finance',
    domain: 'Equities, Metals, Bonds',
    coverage: 'Global equities, ETFs, commodities',
    refresh: '15-min delayed',
  },
  {
    provider: 'DefiLlama',
    domain: 'DeFi TVL & Protocol Flows',
    coverage: '2000+ DeFi protocols',
    refresh: 'Hourly',
  },
  {
    provider: 'CoinGecko / CMC',
    domain: 'Tokenomics & Fundamentals',
    coverage: 'Market cap, supply metrics',
    refresh: '5-min',
  },
  {
    provider: 'Finnhub',
    domain: 'Economic Calendar',
    coverage: 'FOMC, CPI, NFP, GDP events',
    refresh: 'Event-driven',
  },
];

const EXPERTS = [
  { name: 'ARIA', domain: 'Technical Analysis', desc: 'Interprets indicator confluence, candlestick patterns, and chart formations with contextual market commentary.' },
  { name: 'NEXUS', domain: 'Risk Assessment', desc: 'Evaluates position-level and portfolio-level risk metrics including correlation risk, concentration risk, and tail-event probability.' },
  { name: 'ORACLE', domain: 'On-Chain & Flow', desc: 'Analyzes on-chain whale movements, exchange flow netflows, and stablecoin supply dynamics for crypto assets.' },
  { name: 'SENTINEL', domain: 'Security & Integrity', desc: 'Monitors smart contract vulnerabilities, regulatory risks, exchange solvency indicators, and market manipulation signals.' },
];

const LAYERS = [
  {
    id: 'L1',
    name: 'Global Liquidity Tracker',
    sub: 'Macro regime classification',
    desc: 'Ingests Fed balance sheet data, M2 money supply, DXY momentum, VIX term structure, and yield curve dynamics to determine the prevailing liquidity regime.',
    tags: ['FRED API', 'Fed Balance Sheet', 'M2 YoY', 'DXY', 'VIX', '10Y-2Y Spread'],
  },
  {
    id: 'L2',
    name: 'Market Flow Analyzer',
    sub: 'Cross-asset rotation detection',
    desc: 'Measures 7-day and 30-day capital flow velocity across four asset classes to identify rotation patterns and phase-classify each market.',
    tags: ['Binance', 'Yahoo Finance', 'DefiLlama', 'Flow Velocity', 'Phase Detection', 'Rotation Signal'],
  },
  {
    id: 'L3',
    name: 'Sector Drill-Down',
    sub: 'Intra-market capital concentration',
    desc: 'Sector-level TVL flows, trading volume distribution, and dominance shifts are analyzed to pinpoint which vertical is attracting disproportionate capital.',
    tags: ['DeFi TVL', 'L2 Activity', 'Sector Volume', 'Dominance Shift', 'Flow Anomaly', 'Relative Strength'],
  },
  {
    id: 'L4',
    name: 'Asset Analysis Engine',
    sub: 'Instrument-level quantitative analysis',
    desc: 'Deploys our dual-engine suite (7-Step Classic + MLIS Pro) on recommended instruments, producing a structured verdict with calibrated confidence and trade plan.',
    tags: ['7-Step Engine', 'MLIS Pro', 'AI Expert Panel', 'Trade Plan', 'Confidence Score', 'RAG Enrichment'],
  },
];

const PHASES = [
  { phase: 'EARLY', days: '0–30 days', desc: 'Optimal entry zone. Capital inflow accelerating with positive velocity delta.' },
  { phase: 'MID', days: '30–60 days', desc: 'Trend maturing. Flow velocity stabilizing; position sizing should decrease.' },
  { phase: 'LATE', days: '60–90 days', desc: 'Trend exhaustion imminent. Negative flow acceleration detected.' },
  { phase: 'EXIT', days: '90+ / Reversal', desc: 'Capital outflow confirmed. Rotation to alternative asset class underway.' },
];

// ---------------------------------------------------------------------------
// Navigation Structure
// ---------------------------------------------------------------------------

type SectionId =
  | 'overview'
  | 'l1' | 'l2' | 'l3' | 'l4'
  | 'phases'
  | 'seven-step'
  | 'mlis'
  | 'dual-engine'
  | 'experts'
  | 'data-sources'
  | 'data-integrity'
  | 'performance'
  | 'scope'
  | 'markets';

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
      { id: 'overview', label: 'Framework Overview' },
      { id: 'l1', label: 'Global Liquidity', tag: 'L1' },
      { id: 'l2', label: 'Market Flow', tag: 'L2' },
      { id: 'l3', label: 'Sector Drill-Down', tag: 'L3' },
      { id: 'l4', label: 'Asset Analysis', tag: 'L4' },
      { id: 'phases', label: 'Phase Detection' },
    ],
  },
  {
    title: 'Asset Analysis',
    items: [
      { id: 'seven-step', label: '7-Step Engine', tag: '7' },
      { id: 'mlis', label: 'MLIS Pro', tag: '5L' },
      { id: 'dual-engine', label: 'Dual-Engine Protocol' },
      { id: 'experts', label: 'AI Expert Panel', tag: '4' },
    ],
  },
  {
    title: 'Infrastructure',
    items: [
      { id: 'data-sources', label: 'Data Sources', tag: String(DATA_SOURCES.length) },
      { id: 'data-integrity', label: 'Data Integrity' },
    ],
  },
  {
    title: 'Performance',
    items: [
      { id: 'performance', label: 'Verified Metrics' },
    ],
  },
  {
    title: 'Platform',
    items: [
      { id: 'scope', label: 'Scope & Limitations' },
      { id: 'markets', label: 'Markets & Signals' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Micro-components
// ---------------------------------------------------------------------------

function Tag({ children, accent }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <span className={cn(
      'px-1.5 py-0.5 text-[10px] font-sans border rounded',
      accent
        ? 'border-[#14B8A6]/30 dark:border-[#5EEAD4]/20 text-[#14B8A6] dark:text-[#5EEAD4] bg-[#14B8A6]/5 dark:bg-[#5EEAD4]/5'
        : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300'
    )}>
      {children}
    </span>
  );
}

function PhaseColor(phase: string) {
  const map: Record<string, string> = {
    EARLY: 'text-[#22C55E] dark:text-[#4ADE80]',
    MID: 'text-[#F59E0B] dark:text-[#FBBF24]',
    LATE: 'text-[#F97316] dark:text-[#FB923C]',
    EXIT: 'text-[#EF4444] dark:text-[#F87171]',
  };
  return map[phase] || map.MID;
}

function PhaseDot(phase: string) {
  const map: Record<string, string> = {
    EARLY: 'bg-[#22C55E]',
    MID: 'bg-[#F59E0B]',
    LATE: 'bg-[#F97316]',
    EXIT: 'bg-[#EF4444]',
  };
  return map[phase] || map.MID;
}

function ContentHeader({ tag, title, subtitle }: { tag: string; title: string; subtitle?: string }) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2.5 mb-1">
        <span className="text-[10px] font-sans text-[#14B8A6] dark:text-[#5EEAD4] uppercase tracking-widest">
          {tag}
        </span>
        <span className="text-sm font-sans font-medium text-neutral-900 dark:text-neutral-100">
          {title}
        </span>
      </div>
      {subtitle && (
        <p className="text-[11px] font-sans text-neutral-400 dark:text-neutral-500 leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Content Renderers
// ---------------------------------------------------------------------------

function OverviewContent() {
  return (
    <div className="space-y-4">
      <ContentHeader
        tag="§1"
        title="Capital Flow Intelligence Framework"
        subtitle="Capital allocation precedes price action. Instead of picking random assets, we track global capital flows to identify where money is moving — then drill down to find the best opportunities."
      />

      <div className="border border-neutral-200 dark:border-neutral-800 rounded-sm bg-neutral-50/50 dark:bg-neutral-900/30 p-3">
        <span className="text-[10px] font-sans text-[#14B8A6] dark:text-[#5EEAD4] uppercase tracking-widest block mb-1.5">
          Principle
        </span>
        <p className="text-[11px] font-sans text-neutral-600 dark:text-neutral-300 leading-relaxed">
          &ldquo;Where money flows, potential exists.&rdquo; — Our top-down approach first classifies the global liquidity regime, then traces capital rotation across markets, sectors, and individual assets before generating any trade signal.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-neutral-200 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 rounded-sm overflow-hidden">
        {LAYERS.map((l) => (
          <div key={l.id} className="bg-white dark:bg-neutral-950 p-3.5 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded text-[10px] font-sans font-bold bg-neutral-100 dark:bg-neutral-900 text-neutral-500 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-800">
                {l.id}
              </span>
              <span className="text-xs font-sans font-medium text-neutral-900 dark:text-white">
                {l.name}
              </span>
            </div>
            <span className="text-[10px] font-sans text-neutral-400 dark:text-neutral-500">
              {l.sub}
            </span>
            <p className="text-[11px] font-sans text-neutral-500 dark:text-neutral-400 leading-relaxed">
              {l.desc}
            </p>
            <div className="flex flex-wrap gap-1 mt-auto pt-1">
              {l.tags.map((t) => (
                <Tag key={t}>{t}</Tag>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-center gap-2 py-2">
        {['L1', 'L2', 'L3', 'L4'].map((l, i) => (
          <div key={l} className="flex items-center gap-2">
            <span className="text-[10px] font-sans text-neutral-400 dark:text-neutral-500">{l}</span>
            {i < 3 && <span className="text-neutral-300 dark:text-neutral-700">→</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function LayerContent({ layerIndex }: { layerIndex: number }) {
  const l = LAYERS[layerIndex];
  if (!l) return null;

  return (
    <div className="space-y-4">
      <ContentHeader
        tag={l.id}
        title={l.name}
        subtitle={l.sub}
      />

      <div className="border border-neutral-200 dark:border-neutral-800 rounded-sm bg-white dark:bg-neutral-950 p-4">
        <p className="text-[11px] font-sans text-neutral-600 dark:text-neutral-300 leading-relaxed">
          {l.desc}
        </p>
      </div>

      <div>
        <span className="text-[10px] font-sans text-neutral-400 dark:text-neutral-500 uppercase tracking-widest block mb-2">
          Data Inputs
        </span>
        <div className="flex flex-wrap gap-1.5">
          {l.tags.map((t) => (
            <Tag key={t} accent>{t}</Tag>
          ))}
        </div>
      </div>

      {layerIndex === 0 && (
        <div className="border border-neutral-200 dark:border-neutral-800 rounded-sm overflow-hidden">
          <div className="bg-neutral-50 dark:bg-neutral-900/50 px-3 py-2">
            <span className="text-[10px] font-sans text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Regime Classification Output</span>
          </div>
          <div className="grid grid-cols-3 gap-px bg-neutral-200 dark:bg-neutral-800">
            {[
              { regime: 'RISK ON', color: 'text-[#22C55E] dark:text-[#4ADE80]', desc: 'Expansionary liquidity. Favor risk assets.' },
              { regime: 'NEUTRAL', color: 'text-neutral-500 dark:text-neutral-400', desc: 'Mixed signals. Selective positioning.' },
              { regime: 'RISK OFF', color: 'text-[#EF4444] dark:text-[#F87171]', desc: 'Tightening liquidity. Favor safe havens.' },
            ].map((r) => (
              <div key={r.regime} className="bg-white dark:bg-neutral-950 p-3">
                <span className={cn('text-xs font-sans font-bold block mb-1', r.color)}>{r.regime}</span>
                <p className="text-[10px] font-sans text-neutral-500 dark:text-neutral-400">{r.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {layerIndex === 1 && (
        <div className="border border-neutral-200 dark:border-neutral-800 rounded-sm overflow-hidden">
          <div className="bg-neutral-50 dark:bg-neutral-900/50 px-3 py-2">
            <span className="text-[10px] font-sans text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Tracked Asset Classes</span>
          </div>
          <div className="grid grid-cols-4 gap-px bg-neutral-200 dark:bg-neutral-800">
            {[
              { market: 'Crypto', source: 'Binance', icon: '₿' },
              { market: 'Stocks', source: 'Yahoo Finance', icon: '📈' },
              { market: 'Metals', source: 'Yahoo Finance', icon: '🥇' },
              { market: 'Bonds', source: 'Yahoo Finance', icon: '🏛' },
            ].map((m) => (
              <div key={m.market} className="bg-white dark:bg-neutral-950 p-3 text-center">
                <span className="text-lg block mb-1">{m.icon}</span>
                <span className="text-[11px] font-sans font-medium text-neutral-900 dark:text-white block">{m.market}</span>
                <span className="text-[10px] font-sans text-neutral-400 dark:text-neutral-500">{m.source}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {layerIndex === 2 && (
        <div className="border border-neutral-200 dark:border-neutral-800 rounded-sm bg-neutral-50/50 dark:bg-neutral-900/30 p-3">
          <span className="text-[10px] font-sans text-[#14B8A6] dark:text-[#5EEAD4] uppercase tracking-widest block mb-1.5">Sector Analysis</span>
          <p className="text-[10px] font-sans text-neutral-500 dark:text-neutral-400 leading-relaxed">
            Within each market, sector-level TVL flows, trading volume distribution, and dominance shifts pinpoint which vertical attracts disproportionate capital. Sectors with {">"} 10% weekly flow anomaly trigger CRITICAL alerts.
          </p>
        </div>
      )}

      {layerIndex === 3 && (
        <div className="border border-neutral-200 dark:border-neutral-800 rounded-sm bg-neutral-50/50 dark:bg-neutral-900/30 p-3">
          <span className="text-[10px] font-sans text-[#14B8A6] dark:text-[#5EEAD4] uppercase tracking-widest block mb-1.5">Dual-Engine Suite</span>
          <p className="text-[10px] font-sans text-neutral-500 dark:text-neutral-400 leading-relaxed">
            Layer 4 deploys both 7-Step Classic and MLIS Pro simultaneously. When both engines agree on direction, confidence is elevated. On contradiction, the verdict is automatically downgraded to WAIT or AVOID.
          </p>
        </div>
      )}
    </div>
  );
}

function PhasesContent() {
  return (
    <div className="space-y-4">
      <ContentHeader
        tag="§1.1"
        title="Phase Detection & Rotation Model"
        subtitle="Each market is independently phase-classified based on flow velocity, duration, and historical pattern matching."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-neutral-200 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 rounded-sm overflow-hidden">
        {PHASES.map((p) => (
          <div key={p.phase} className="bg-white dark:bg-neutral-950 p-3.5 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className={cn('w-2 h-2 rounded-full', PhaseDot(p.phase))} />
              <span className={cn('text-xs font-sans font-bold', PhaseColor(p.phase))}>
                {p.phase}
              </span>
              <span className="text-[10px] font-sans text-neutral-400 dark:text-neutral-500 tabular-nums ml-auto">
                {p.days}
              </span>
            </div>
            <p className="text-[11px] font-sans text-neutral-500 dark:text-neutral-400 leading-relaxed">
              {p.desc}
            </p>
          </div>
        ))}
      </div>

      <div>
        <span className="text-[10px] font-sans text-neutral-400 dark:text-neutral-500 uppercase tracking-widest block mb-2">
          Rotation Signals
        </span>
        <div className="grid grid-cols-3 gap-px bg-neutral-200 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 rounded-sm overflow-hidden">
          <div className="bg-white dark:bg-neutral-950 p-3 flex items-center gap-2.5">
            <span className="text-sm font-sans text-[#22C55E] dark:text-[#4ADE80]">↗</span>
            <div>
              <span className="text-[11px] font-sans font-medium text-neutral-900 dark:text-white block">Entering</span>
              <p className="text-[10px] font-sans text-neutral-400 dark:text-neutral-500">Capital flowing in</p>
            </div>
          </div>
          <div className="bg-white dark:bg-neutral-950 p-3 flex items-center gap-2.5">
            <span className="text-sm font-sans text-neutral-400 dark:text-neutral-500">—</span>
            <div>
              <span className="text-[11px] font-sans font-medium text-neutral-900 dark:text-white block">Stable</span>
              <p className="text-[10px] font-sans text-neutral-400 dark:text-neutral-500">Holding steady</p>
            </div>
          </div>
          <div className="bg-white dark:bg-neutral-950 p-3 flex items-center gap-2.5">
            <span className="text-sm font-sans text-[#EF4444] dark:text-[#F87171]">↘</span>
            <div>
              <span className="text-[11px] font-sans font-medium text-neutral-900 dark:text-white block">Exiting</span>
              <p className="text-[10px] font-sans text-neutral-400 dark:text-neutral-500">Capital flowing out</p>
            </div>
          </div>
        </div>
      </div>

      <div className="border border-neutral-200 dark:border-neutral-800 rounded-sm bg-neutral-50/50 dark:bg-neutral-900/30 p-3">
        <p className="text-[10px] font-sans text-neutral-500 dark:text-neutral-400 leading-relaxed">
          <span className="text-[#F59E0B] dark:text-[#FBBF24] uppercase tracking-wider mr-1.5">Note</span>
          Historical phase durations are averaged per asset class to estimate remaining time in current phase. When the current phase exceeds 1.5× average duration, an EXIT transition warning is triggered.
        </p>
      </div>
    </div>
  );
}

function SevenStepContent() {
  return (
    <div className="space-y-4">
      <ContentHeader
        tag="§2"
        title="7-Step Analysis Engine"
        subtitle="Each step is independently auditable. Sub-scores, raw indicator values, and confidence intervals are preserved for full transparency."
      />

      <div className="space-y-2">
        {SEVEN_STEPS.map((s) => (
          <div
            key={s.step}
            className="border border-neutral-200 dark:border-neutral-800 rounded-sm bg-white dark:bg-neutral-950 p-3.5 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors"
          >
            <div className="flex items-center gap-2.5 mb-2">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-sans font-bold bg-neutral-100 dark:bg-neutral-900 text-neutral-500 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-800 tabular-nums">
                {s.step}
              </span>
              <span className="text-[11px] font-sans font-medium text-neutral-900 dark:text-white">{s.name}</span>
            </div>
            <p className="text-[10px] font-sans text-neutral-500 dark:text-neutral-400 leading-relaxed mb-2.5">
              {s.description}
            </p>
            <div className="flex flex-wrap gap-1">
              {s.metrics.map((m) => (
                <Tag key={m}>{m}</Tag>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="border border-neutral-200 dark:border-neutral-800 rounded-sm overflow-hidden">
        <div className="bg-neutral-50 dark:bg-neutral-900/50 px-3 py-2">
          <span className="text-[10px] font-sans text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Verdict Outputs</span>
        </div>
        <div className="grid grid-cols-4 gap-px bg-neutral-200 dark:bg-neutral-800">
          {[
            { verdict: 'GO', color: 'text-[#22C55E] dark:text-[#4ADE80]', desc: 'All conditions met' },
            { verdict: 'COND', color: 'text-[#F59E0B] dark:text-[#FBBF24]', desc: 'Conditional entry' },
            { verdict: 'WAIT', color: 'text-[#F97316] dark:text-[#FB923C]', desc: 'Unfavorable timing' },
            { verdict: 'AVOID', color: 'text-[#EF4444] dark:text-[#F87171]', desc: 'High risk detected' },
          ].map((v) => (
            <div key={v.verdict} className="bg-white dark:bg-neutral-950 p-2.5 text-center">
              <span className={cn('text-xs font-sans font-bold block mb-0.5', v.color)}>{v.verdict}</span>
              <span className="text-[9px] font-sans text-neutral-400 dark:text-neutral-500">{v.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MLISContent() {
  return (
    <div className="space-y-4">
      <ContentHeader
        tag="§3"
        title="MLIS Pro — Machine Learning Inference System"
        subtitle="5-layer neural confirmation engine with calibrated confidence outputs. Cross-validates the 7-Step engine using orthogonal feature extraction."
      />

      <div className="space-y-2">
        {MLIS_LAYERS.map((l) => (
          <div
            key={l.layer}
            className="border border-neutral-200 dark:border-neutral-800 rounded-sm bg-white dark:bg-neutral-950 p-3.5 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-sans font-bold bg-neutral-100 dark:bg-neutral-900 text-neutral-500 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-800 tabular-nums">
                  {l.layer}
                </span>
                <span className="text-[11px] font-sans font-medium text-neutral-900 dark:text-white">{l.name}</span>
              </div>
              <span className="text-[10px] font-sans text-neutral-400 dark:text-neutral-500">{l.signal}</span>
            </div>
            <p className="text-[10px] font-sans text-neutral-500 dark:text-neutral-400 leading-relaxed">
              {l.description}
            </p>
          </div>
        ))}
      </div>

      <div className="border border-neutral-200 dark:border-neutral-800 rounded-sm overflow-hidden">
        <div className="bg-neutral-50 dark:bg-neutral-900/50 px-3 py-2">
          <span className="text-[10px] font-sans text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">MLIS Recommendation Outputs</span>
        </div>
        <div className="grid grid-cols-4 gap-px bg-neutral-200 dark:bg-neutral-800">
          {[
            { rec: 'STRONG_BUY', color: 'text-[#22C55E] dark:text-[#4ADE80]' },
            { rec: 'BUY', color: 'text-[#22C55E]/70 dark:text-[#4ADE80]/70' },
            { rec: 'HOLD', color: 'text-[#F59E0B] dark:text-[#FBBF24]' },
            { rec: 'SELL', color: 'text-[#EF4444] dark:text-[#F87171]' },
          ].map((r) => (
            <div key={r.rec} className="bg-white dark:bg-neutral-950 p-2.5 text-center">
              <span className={cn('text-[10px] font-sans font-bold', r.color)}>{r.rec}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DualEngineContent() {
  return (
    <div className="space-y-4">
      <ContentHeader
        tag="§3.1"
        title="Dual-Engine Confirmation Protocol"
        subtitle="When MLIS contradicts the 7-Step verdict, conviction is automatically downgraded."
      />

      <div className="space-y-2">
        {[
          {
            status: 'Full Confirmation',
            color: 'text-[#22C55E] dark:text-[#4ADE80]',
            borderColor: 'border-[#22C55E]/20 dark:border-[#4ADE80]/20',
            desc: 'Both engines agree on direction and conviction. Confidence level elevated. Highest-probability signal output.',
          },
          {
            status: 'Partial Confirmation',
            color: 'text-[#F59E0B] dark:text-[#FBBF24]',
            borderColor: 'border-[#F59E0B]/20 dark:border-[#FBBF24]/20',
            desc: 'Direction aligned, conviction divergent. Confidence maintained at base. Position sizing should be reduced.',
          },
          {
            status: 'Contradiction',
            color: 'text-[#EF4444] dark:text-[#F87171]',
            borderColor: 'border-[#EF4444]/20 dark:border-[#F87171]/20',
            desc: 'Engines disagree on direction. Confidence automatically downgraded. Verdict shifts toward WAIT or AVOID.',
          },
        ].map((s) => (
          <div
            key={s.status}
            className={cn('border rounded-sm bg-white dark:bg-neutral-950 p-3.5', s.borderColor)}
          >
            <span className={cn('text-xs font-sans font-bold block mb-1.5', s.color)}>{s.status}</span>
            <p className="text-[11px] font-sans text-neutral-500 dark:text-neutral-400 leading-relaxed">
              {s.desc}
            </p>
          </div>
        ))}
      </div>

      <div className="border border-neutral-200 dark:border-neutral-800 rounded-sm bg-neutral-50/50 dark:bg-neutral-900/30 p-3">
        <p className="text-[10px] font-sans text-neutral-500 dark:text-neutral-400 leading-relaxed">
          <span className="text-[#14B8A6] dark:text-[#5EEAD4] uppercase tracking-wider mr-1.5">Architecture</span>
          7-Step Classic provides the primary trade signal. MLIS Pro operates as a secondary validation layer. The two engines use orthogonal feature sets to avoid correlated errors.
        </p>
      </div>
    </div>
  );
}

function ExpertsContent() {
  return (
    <div className="space-y-4">
      <ContentHeader
        tag="§4"
        title="AI Expert Panel (VOLTRAN Synthesis)"
        subtitle="Multi-agent reasoning system for qualitative overlay. Four specialized agents provide independent assessments, synthesized by the VOLTRAN aggregation module."
      />

      <div className="space-y-2">
        {EXPERTS.map((e) => (
          <div
            key={e.name}
            className="border border-neutral-200 dark:border-neutral-800 rounded-sm bg-white dark:bg-neutral-950 p-3.5 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors"
          >
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="text-xs font-sans font-bold text-neutral-900 dark:text-white">{e.name}</span>
              <span className="text-[10px] font-sans text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">{e.domain}</span>
            </div>
            <p className="text-[11px] font-sans text-neutral-500 dark:text-neutral-400 leading-relaxed">
              {e.desc}
            </p>
          </div>
        ))}
      </div>

      <div className="border border-neutral-200 dark:border-neutral-800 rounded-sm bg-neutral-50/50 dark:bg-neutral-900/30 p-3">
        <span className="text-[10px] font-sans text-[#14B8A6] dark:text-[#5EEAD4] uppercase tracking-widest block mb-1.5">VOLTRAN Synthesis</span>
        <p className="text-[10px] font-sans text-neutral-500 dark:text-neutral-400 leading-relaxed">
          VOLTRAN aggregates the four expert opinions into a weighted consensus. Disagreements between experts are highlighted as risk factors. Each expert&apos;s individual assessment is preserved in the analysis output for full auditability.
        </p>
      </div>
    </div>
  );
}

function DataSourcesContent() {
  return (
    <div className="space-y-4">
      <ContentHeader
        tag="§5"
        title="Data Infrastructure & Sources"
        subtitle={`${DATA_SOURCES.length} production data providers with automatic failover and cross-validation.`}
      />

      <div className="border border-neutral-200 dark:border-neutral-800 rounded-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-neutral-50 dark:bg-neutral-900/50">
              <th className="text-left p-2.5 font-sans text-[10px] text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Provider</th>
              <th className="text-left p-2.5 font-sans text-[10px] text-neutral-400 dark:text-neutral-500 uppercase tracking-wider hidden sm:table-cell">Domain</th>
              <th className="text-left p-2.5 font-sans text-[10px] text-neutral-400 dark:text-neutral-500 uppercase tracking-wider hidden md:table-cell">Coverage</th>
              <th className="text-right p-2.5 font-sans text-[10px] text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Refresh</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/50">
            {DATA_SOURCES.map((d) => (
              <tr key={d.provider} className="bg-white dark:bg-neutral-950 hover:bg-neutral-50 dark:hover:bg-neutral-900/30 transition-colors">
                <td className="p-2.5">
                  <span className="text-[11px] font-sans font-medium text-neutral-900 dark:text-white">{d.provider}</span>
                </td>
                <td className="p-2.5 hidden sm:table-cell">
                  <span className="text-[10px] font-sans text-neutral-500 dark:text-neutral-400">{d.domain}</span>
                </td>
                <td className="p-2.5 hidden md:table-cell">
                  <span className="text-[10px] font-sans text-neutral-500 dark:text-neutral-400">{d.coverage}</span>
                </td>
                <td className="p-2.5 text-right">
                  <Tag>{d.refresh}</Tag>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DataIntegrityContent() {
  return (
    <div className="space-y-4">
      <ContentHeader
        tag="§5.1"
        title="Data Integrity Protocol"
        subtitle="Production-grade safeguards ensuring data consistency and freshness across all providers."
      />

      <div className="space-y-2">
        {[
          { title: 'Multi-Provider Cross-Validation', desc: 'Primary and fallback data sources are compared. Discrepancies exceeding configurable thresholds trigger reconciliation logic.' },
          { title: 'Outlier & Wash-Trading Filters', desc: 'Raw OHLCV data passes through statistical outlier detection and exchange-specific wash-trading identification before entering the analysis pipeline.' },
          { title: 'Redis-Backed Cache Layer', desc: 'Configurable TTL per data source. Cache invalidation on significant price moves. Stale data prevention with max-age enforcement.' },
          { title: 'Query Timeout Middleware', desc: 'Prisma middleware enforces 15-second query timeout. Queries exceeding 5 seconds are logged for performance monitoring.' },
          { title: 'Graceful Degradation', desc: 'If any single provider fails, the system falls back to cached data or alternative providers. No single point of failure in the data layer.' },
        ].map((item) => (
          <div key={item.title} className="border border-neutral-200 dark:border-neutral-800 rounded-sm bg-white dark:bg-neutral-950 p-3.5">
            <div className="flex items-start gap-2 mb-1">
              <span className="text-xs font-sans text-[#22C55E] dark:text-[#4ADE80] shrink-0 mt-0.5">✓</span>
              <span className="text-[11px] font-sans font-medium text-neutral-900 dark:text-white">{item.title}</span>
            </div>
            <p className="text-[10px] font-sans text-neutral-500 dark:text-neutral-400 leading-relaxed pl-5">
              {item.desc}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function PerformanceContent() {
  return (
    <div className="space-y-4">
      <ContentHeader
        tag="§6"
        title="Verified Performance Metrics"
        subtitle="All metrics are derived from verified, outcome-tracked analyses."
      />

      <div className="border border-neutral-200 dark:border-neutral-800 rounded-sm bg-white dark:bg-neutral-950 p-3.5">
        <p className="text-[11px] font-sans text-neutral-600 dark:text-neutral-300 leading-relaxed mb-2">
          Outcomes are recorded only when a definitive TP or SL hit is confirmed — pending trades are excluded from all performance calculations.
        </p>
        <p className="text-[10px] font-sans text-[#F59E0B] dark:text-[#FBBF24]">
          <span className="uppercase tracking-wider mr-1.5">Survivorship bias notice:</span>
          Metrics include all analyses, not just profitable ones. WAIT and AVOID verdicts are excluded as they do not generate trade plans.
        </p>
      </div>

      <BacktestPerformance />
    </div>
  );
}

function ScopeContent() {
  return (
    <div className="space-y-4">
      <ContentHeader
        tag="§7"
        title="Platform Scope & Limitations"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-neutral-200 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 rounded-sm overflow-hidden">
        <div className="bg-white dark:bg-neutral-950 p-3.5">
          <span className="text-[11px] font-sans font-medium text-[#22C55E] dark:text-[#4ADE80] block mb-2.5">TraderPath IS</span>
          <div className="space-y-2">
            {[
              'An analytical research and intelligence platform',
              'A data processing engine for market analysis',
              'An educational tool for understanding capital flows',
              'A transparent system with verifiable performance metrics',
              'A technology product, not a financial service',
            ].map((item) => (
              <div key={item} className="flex items-start gap-2">
                <span className="text-xs font-sans text-[#22C55E] dark:text-[#4ADE80] shrink-0 mt-0.5">✓</span>
                <span className="text-[10px] font-sans text-neutral-500 dark:text-neutral-400">{item}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white dark:bg-neutral-950 p-3.5">
          <span className="text-[11px] font-sans font-medium text-[#EF4444] dark:text-[#F87171] block mb-2.5">TraderPath is NOT</span>
          <div className="space-y-2">
            {[
              'A broker-dealer or trading platform',
              'A registered investment advisor (RIA)',
              'A provider of personalized financial advice',
              'A fund manager or asset custodian',
              'A guarantee of future performance or returns',
            ].map((item) => (
              <div key={item} className="flex items-start gap-2">
                <span className="text-xs font-sans text-[#EF4444] dark:text-[#F87171] shrink-0 mt-0.5">✗</span>
                <span className="text-[10px] font-sans text-neutral-500 dark:text-neutral-400">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="border border-neutral-200 dark:border-neutral-800 rounded-sm bg-white dark:bg-neutral-950 p-3.5">
        <div className="flex items-start gap-2">
          <span className="text-xs font-sans text-[#F59E0B] dark:text-[#FBBF24] shrink-0 mt-0.5">⚠</span>
          <div>
            <span className="text-[10px] font-sans text-[#F59E0B] dark:text-[#FBBF24] uppercase tracking-wider block mb-1">Important Disclaimer</span>
            <p className="text-[10px] font-sans text-neutral-500 dark:text-neutral-400 leading-relaxed">
              This analysis is for informational and educational purposes only and does not constitute financial, investment, or trading advice. All investments carry risk, including the potential loss of principal. Past performance does not guarantee future results. Conduct your own research and consult with a licensed financial advisor before making any investment decisions.{' '}
              <Link href="/disclaimer" className="underline hover:text-neutral-900 dark:hover:text-white transition-colors">
                Read full Risk Disclosure Statement
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function MarketsContent() {
  return (
    <div className="space-y-4">
      <ContentHeader
        tag="§7.1"
        title="Markets & AI Recommendations"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-neutral-200 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 rounded-sm overflow-hidden">
        <div className="bg-white dark:bg-neutral-950 p-3.5">
          <span className="text-[10px] font-sans text-neutral-400 dark:text-neutral-500 uppercase tracking-widest block mb-3">AI Recommendations</span>
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-sans font-bold text-[#22C55E] dark:text-[#4ADE80]">BUY</span>
                <Tag>EARLY / MID Phase</Tag>
              </div>
              <p className="text-[10px] font-sans text-neutral-500 dark:text-neutral-400">Capital entering + strong flow velocity</p>
            </div>
            <div className="h-px bg-neutral-100 dark:bg-neutral-800" />
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-sans font-bold text-[#EF4444] dark:text-[#F87171]">SELL</span>
                <Tag>LATE / EXIT Phase</Tag>
              </div>
              <p className="text-[10px] font-sans text-neutral-500 dark:text-neutral-400">Capital exiting + slowing momentum</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-950 p-3.5">
          <span className="text-[10px] font-sans text-neutral-400 dark:text-neutral-500 uppercase tracking-widest block mb-3">Supported Markets</span>
          <div className="space-y-1.5">
            {[
              { market: 'Crypto', source: 'Binance' },
              { market: 'Stocks', source: 'Yahoo Finance' },
              { market: 'Metals', source: 'Yahoo Finance' },
              { market: 'Bonds', source: 'Yahoo Finance' },
            ].map((m) => (
              <div key={m.market} className="flex items-center justify-between py-1.5 border-b border-neutral-100 dark:border-neutral-800/50 last:border-0">
                <span className="text-[11px] font-sans font-medium text-neutral-900 dark:text-white">{m.market}</span>
                <span className="text-[10px] font-sans text-neutral-400 dark:text-neutral-500">{m.source}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="text-center pt-2">
        <Link
          href="/analyze"
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-sans font-medium border border-neutral-200 dark:border-neutral-800 rounded-sm text-neutral-900 dark:text-white hover:border-[#14B8A6] dark:hover:border-[#5EEAD4] hover:text-[#14B8A6] dark:hover:text-[#5EEAD4] transition-colors"
        >
          Start Analysis →
        </Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Content Router
// ---------------------------------------------------------------------------

function ContentPanel({ activeSection }: { activeSection: SectionId }) {
  switch (activeSection) {
    case 'overview':
      return <OverviewContent />;
    case 'l1':
      return <LayerContent layerIndex={0} />;
    case 'l2':
      return <LayerContent layerIndex={1} />;
    case 'l3':
      return <LayerContent layerIndex={2} />;
    case 'l4':
      return <LayerContent layerIndex={3} />;
    case 'phases':
      return <PhasesContent />;
    case 'seven-step':
      return <SevenStepContent />;
    case 'mlis':
      return <MLISContent />;
    case 'dual-engine':
      return <DualEngineContent />;
    case 'experts':
      return <ExpertsContent />;
    case 'data-sources':
      return <DataSourcesContent />;
    case 'data-integrity':
      return <DataIntegrityContent />;
    case 'performance':
      return <PerformanceContent />;
    case 'scope':
      return <ScopeContent />;
    case 'markets':
      return <MarketsContent />;
    default:
      return <OverviewContent />;
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function MethodologyPage() {
  const [activeSection, setActiveSection] = useState<SectionId>('overview');

  return (
    <div className="w-full h-[calc(100vh-3.5rem)] flex flex-col bg-white dark:bg-neutral-950">

      {/* ── Top Header ──────────────────────────────────────────── */}
      <header className="shrink-0 flex items-center justify-between px-4 md:px-5 py-3 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 bg-[#14B8A6] rounded-full" />
            <div className="w-2 h-2 bg-[#EF5A6F] rounded-full" />
          </div>
          <span className="text-sm font-sans font-bold tracking-tight bg-gradient-to-r from-[#14B8A6] to-[#EF5A6F] bg-clip-text text-transparent">
            METHODOLOGY
          </span>
          <span className="hidden sm:inline text-[10px] font-sans text-neutral-400 dark:text-neutral-500">
            — Where money flows, potential exists
          </span>
        </div>
        <Link
          href="/how-it-works"
          target="_blank"
          className="px-2 py-1 text-[10px] font-sans border border-neutral-200 dark:border-neutral-800 rounded text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors uppercase tracking-wider"
        >
          Full Paper ↗
        </Link>
      </header>

      {/* ── Mobile Nav (horizontal scroll) ──────────────────────── */}
      <div className="md:hidden shrink-0 border-b border-neutral-200 dark:border-neutral-800 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-0.5 px-3 py-2 min-w-max">
          {NAV_GROUPS.flatMap((g) => g.items).map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={cn(
                'shrink-0 px-2.5 py-1.5 text-[10px] font-sans rounded transition-colors whitespace-nowrap',
                activeSection === item.id
                  ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900'
                  : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-900'
              )}
            >
              {item.tag && (
                <span className="opacity-50 mr-1">{item.tag}</span>
              )}
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Body: Sidebar + Content ─────────────────────────────── */}
      <div className="flex-1 flex min-h-0">

        {/* Sidebar (desktop) */}
        <nav className="hidden md:flex flex-col w-56 lg:w-60 shrink-0 border-r border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/20 overflow-y-auto">
          <div className="py-3 space-y-4">
            {NAV_GROUPS.map((group) => (
              <div key={group.title}>
                <span className="block px-4 mb-1.5 text-[9px] font-sans text-neutral-400 dark:text-neutral-600 uppercase tracking-[0.15em]">
                  {group.title}
                </span>
                <div className="space-y-px">
                  {group.items.map((item) => {
                    const isActive = activeSection === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveSection(item.id)}
                        className={cn(
                          'w-full flex items-center gap-2 px-4 py-2 text-left transition-all duration-150',
                          isActive
                            ? 'bg-white dark:bg-neutral-950 border-l-2 border-[#14B8A6] dark:border-[#5EEAD4]'
                            : 'border-l-2 border-transparent hover:bg-white/60 dark:hover:bg-neutral-900/40'
                        )}
                      >
                        {item.tag && (
                          <span className={cn(
                            'inline-flex items-center justify-center min-w-[20px] h-5 px-1 rounded text-[9px] font-sans font-bold tabular-nums',
                            isActive
                              ? 'bg-[#14B8A6]/10 dark:bg-[#5EEAD4]/10 text-[#14B8A6] dark:text-[#5EEAD4]'
                              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500'
                          )}>
                            {item.tag}
                          </span>
                        )}
                        <span className={cn(
                          'text-[11px] font-sans truncate',
                          isActive
                            ? 'text-neutral-900 dark:text-white font-medium'
                            : 'text-neutral-500 dark:text-neutral-400'
                        )}>
                          {item.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </nav>

        {/* Content Panel */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 md:px-6 lg:px-8 py-5">
            <ContentPanel activeSection={activeSection} />
          </div>
        </main>
      </div>
    </div>
  );
}
