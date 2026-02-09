'use client';

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
// Micro-components
// ---------------------------------------------------------------------------

function SectionLabel({ layer, label, count }: { layer: string; label: string; count?: number }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-mono text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">
          {layer}
        </span>
        <span className="text-xs font-medium text-neutral-900 dark:text-neutral-100">
          {label}
        </span>
      </div>
      {count !== undefined && (
        <span className="text-[10px] font-mono text-neutral-400 dark:text-neutral-500">
          {count}
        </span>
      )}
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="px-1.5 py-0.5 text-[10px] font-mono border border-neutral-200 dark:border-neutral-800 rounded text-neutral-600 dark:text-neutral-300">
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

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function MethodologyPage() {
  return (
    <div className="w-full max-w-5xl mx-auto px-4 md:px-6 py-6 space-y-6 bg-white dark:bg-neutral-950 min-h-screen">

      {/* ── Header ────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="flex gap-0.5">
              <div className="w-2 h-2 bg-[#14B8A6] rounded-full" />
              <div className="w-2 h-2 bg-[#EF5A6F] rounded-full" />
            </div>
            <span className="text-sm font-mono font-bold text-neutral-900 dark:text-white tracking-tight">
              TraderPath
            </span>
            <span className="text-[10px] font-mono text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">
              Methodology
            </span>
          </div>
          <p className="text-[10px] font-mono text-neutral-400 dark:text-neutral-500">
            &ldquo;Where money flows, potential exists&rdquo;
          </p>
        </div>
        <Link
          href="/how-it-works"
          target="_blank"
          className="px-2 py-1 text-[10px] font-mono border border-neutral-200 dark:border-neutral-800 rounded text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors uppercase tracking-wider"
        >
          Full Paper ↗
        </Link>
      </header>

      {/* ── Philosophy ────────────────────────────────────────────── */}
      <div className="border border-neutral-200 dark:border-neutral-800 rounded-sm bg-white dark:bg-neutral-950 p-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-mono text-[#14B8A6] dark:text-[#5EEAD4] uppercase tracking-widest">
            Principle
          </span>
          <span className="text-xs font-medium text-neutral-900 dark:text-neutral-100">
            Top-Down Approach
          </span>
        </div>
        <p className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400 leading-relaxed">
          Capital allocation precedes price action. Instead of picking random assets, we track global capital flows to identify where money is moving — then drill down to find the best opportunities.
        </p>
      </div>

      {/* ── §1 Capital Flow Intelligence Framework ─────────────── */}
      <section>
        <SectionLabel layer="§1" label="Capital Flow Intelligence Framework" count={4} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-neutral-200 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 rounded-sm overflow-hidden">
          {LAYERS.map((l) => (
            <div key={l.id} className="bg-white dark:bg-neutral-950 p-3 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">
                  {l.id}
                </span>
                <span className="text-xs font-medium text-neutral-900 dark:text-white">
                  {l.name}
                </span>
              </div>
              <span className="text-[10px] font-mono text-neutral-400 dark:text-neutral-500">
                {l.sub}
              </span>
              <p className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400 leading-relaxed">
                {l.desc}
              </p>
              <div className="flex flex-wrap gap-1 mt-auto">
                {l.tags.map((t) => (
                  <Tag key={t}>{t}</Tag>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="text-[10px] font-mono text-neutral-400 dark:text-neutral-500 text-center mt-2">
          L1 Global Liquidity → L2 Market Selection → L3 Sector Focus → L4 Asset Analysis
        </p>
      </section>

      {/* ── Phase Detection & Rotation ────────────────────────── */}
      <section>
        <SectionLabel layer="§1.1" label="Phase Detection & Rotation Model" count={4} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-neutral-200 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 rounded-sm overflow-hidden">
          {PHASES.map((p) => (
            <div key={p.phase} className="bg-white dark:bg-neutral-950 p-3 flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5">
                <span className={cn(
                  'text-xs font-mono font-bold',
                  PhaseColor(p.phase),
                )}>
                  {p.phase}
                </span>
              </div>
              <span className="text-[10px] font-mono text-neutral-400 dark:text-neutral-500 tabular-nums">
                {p.days}
              </span>
              <p className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400 leading-relaxed">
                {p.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Rotation signals */}
        <div className="grid grid-cols-3 gap-px bg-neutral-200 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 rounded-sm overflow-hidden mt-2">
          <div className="bg-white dark:bg-neutral-950 p-2.5 flex items-center gap-2">
            <span className="text-xs font-mono text-[#22C55E] dark:text-[#4ADE80]">↗</span>
            <div>
              <span className="text-[11px] font-mono font-medium text-neutral-900 dark:text-white">Entering</span>
              <p className="text-[10px] font-mono text-neutral-400 dark:text-neutral-500">Capital flowing in</p>
            </div>
          </div>
          <div className="bg-white dark:bg-neutral-950 p-2.5 flex items-center gap-2">
            <span className="text-xs font-mono text-neutral-400 dark:text-neutral-500">—</span>
            <div>
              <span className="text-[11px] font-mono font-medium text-neutral-900 dark:text-white">Stable</span>
              <p className="text-[10px] font-mono text-neutral-400 dark:text-neutral-500">Holding steady</p>
            </div>
          </div>
          <div className="bg-white dark:bg-neutral-950 p-2.5 flex items-center gap-2">
            <span className="text-xs font-mono text-[#EF4444] dark:text-[#F87171]">↘</span>
            <div>
              <span className="text-[11px] font-mono font-medium text-neutral-900 dark:text-white">Exiting</span>
              <p className="text-[10px] font-mono text-neutral-400 dark:text-neutral-500">Capital flowing out</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── §2 7-Step Analysis Engine ─────────────────────────── */}
      <section>
        <SectionLabel layer="§2" label="7-Step Analysis Engine" count={7} />

        {/* Key principle */}
        <div className="border border-neutral-200 dark:border-neutral-800 rounded-sm bg-white dark:bg-neutral-950 p-2.5 mb-3">
          <p className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400">
            <span className="text-[#14B8A6] dark:text-[#5EEAD4] uppercase tracking-wider mr-1.5">Note</span>
            Each step is independently auditable. Sub-scores, raw indicator values, and confidence intervals are preserved for full transparency.
          </p>
        </div>

        {/* Steps table */}
        <div className="border border-neutral-200 dark:border-neutral-800 rounded-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-neutral-50 dark:bg-neutral-900/50">
                <th className="text-left p-2 font-mono text-[10px] text-neutral-400 dark:text-neutral-500 uppercase tracking-wider w-8">#</th>
                <th className="text-left p-2 font-mono text-[10px] text-neutral-400 dark:text-neutral-500 uppercase tracking-wider w-28">Step</th>
                <th className="text-left p-2 font-mono text-[10px] text-neutral-400 dark:text-neutral-500 uppercase tracking-wider hidden md:table-cell">Description</th>
                <th className="text-left p-2 font-mono text-[10px] text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Key Metrics</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/50">
              {SEVEN_STEPS.map((s) => (
                <tr key={s.step} className="bg-white dark:bg-neutral-950 hover:bg-neutral-50 dark:hover:bg-neutral-900/30 transition-colors">
                  <td className="p-2 font-mono text-xs text-neutral-400 dark:text-neutral-500 tabular-nums">{s.step}</td>
                  <td className="p-2">
                    <span className="text-[11px] font-mono font-medium text-neutral-900 dark:text-white">{s.name}</span>
                  </td>
                  <td className="p-2 hidden md:table-cell">
                    <span className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400 leading-relaxed">{s.description}</span>
                  </td>
                  <td className="p-2">
                    <div className="flex flex-wrap gap-1">
                      {s.metrics.map((m) => (
                        <Tag key={m}>{m}</Tag>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── §3 MLIS Pro ──────────────────────────────────────── */}
      <section>
        <SectionLabel layer="§3" label="MLIS Pro — Machine Learning Inference System" count={5} />

        <p className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400 mb-3 leading-relaxed">
          5-layer neural confirmation engine with calibrated confidence outputs. Cross-validates the 7-Step engine using orthogonal feature extraction. When MLIS contradicts the 7-Step verdict, conviction is automatically downgraded.
        </p>

        {/* Layers */}
        <div className="border border-neutral-200 dark:border-neutral-800 rounded-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-neutral-50 dark:bg-neutral-900/50">
                <th className="text-left p-2 font-mono text-[10px] text-neutral-400 dark:text-neutral-500 uppercase tracking-wider w-8">L</th>
                <th className="text-left p-2 font-mono text-[10px] text-neutral-400 dark:text-neutral-500 uppercase tracking-wider w-24">Layer</th>
                <th className="text-left p-2 font-mono text-[10px] text-neutral-400 dark:text-neutral-500 uppercase tracking-wider hidden md:table-cell">Description</th>
                <th className="text-left p-2 font-mono text-[10px] text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Output Signal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/50">
              {MLIS_LAYERS.map((l) => (
                <tr key={l.layer} className="bg-white dark:bg-neutral-950 hover:bg-neutral-50 dark:hover:bg-neutral-900/30 transition-colors">
                  <td className="p-2 font-mono text-xs text-neutral-400 dark:text-neutral-500 tabular-nums">{l.layer}</td>
                  <td className="p-2">
                    <span className="text-[11px] font-mono font-medium text-neutral-900 dark:text-white">{l.name}</span>
                  </td>
                  <td className="p-2 hidden md:table-cell">
                    <span className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400 leading-relaxed">{l.description}</span>
                  </td>
                  <td className="p-2">
                    <span className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400">{l.signal}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Dual-Engine Confirmation Protocol */}
        <div className="mt-3">
          <SectionLabel layer="§3.1" label="Dual-Engine Confirmation Protocol" count={3} />
          <div className="grid grid-cols-3 gap-px bg-neutral-200 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 rounded-sm overflow-hidden">
            <div className="bg-white dark:bg-neutral-950 p-3">
              <span className="text-[11px] font-mono font-medium text-[#22C55E] dark:text-[#4ADE80] block mb-1">Full Confirmation</span>
              <p className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400 leading-relaxed">
                Both engines agree on direction and conviction. Confidence level elevated. Highest-probability signal output.
              </p>
            </div>
            <div className="bg-white dark:bg-neutral-950 p-3">
              <span className="text-[11px] font-mono font-medium text-[#F59E0B] dark:text-[#FBBF24] block mb-1">Partial Confirmation</span>
              <p className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400 leading-relaxed">
                Direction aligned, conviction divergent. Confidence maintained at base. Position sizing should be reduced.
              </p>
            </div>
            <div className="bg-white dark:bg-neutral-950 p-3">
              <span className="text-[11px] font-mono font-medium text-[#EF4444] dark:text-[#F87171] block mb-1">Contradiction</span>
              <p className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400 leading-relaxed">
                Engines disagree on direction. Confidence automatically downgraded. Verdict shifts toward WAIT or AVOID.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── §4 AI Expert Panel (VOLTRAN) ──────────────────────── */}
      <section>
        <SectionLabel layer="§4" label="AI Expert Panel (VOLTRAN Synthesis)" count={4} />
        <p className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400 mb-3 leading-relaxed">
          Multi-agent reasoning system for qualitative overlay. Four specialized agents provide independent assessments, synthesized by the VOLTRAN aggregation module.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-neutral-200 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 rounded-sm overflow-hidden">
          {EXPERTS.map((e) => (
            <div key={e.name} className="bg-white dark:bg-neutral-950 p-3 flex flex-col gap-1.5">
              <span className="text-xs font-mono font-bold text-neutral-900 dark:text-white">
                {e.name}
              </span>
              <span className="text-[10px] font-mono text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                {e.domain}
              </span>
              <p className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400 leading-relaxed mt-auto">
                {e.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── §5 Data Infrastructure ────────────────────────────── */}
      <section>
        <SectionLabel layer="§5" label="Data Infrastructure & Sources" count={DATA_SOURCES.length} />

        <div className="border border-neutral-200 dark:border-neutral-800 rounded-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-neutral-50 dark:bg-neutral-900/50">
                <th className="text-left p-2 font-mono text-[10px] text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Provider</th>
                <th className="text-left p-2 font-mono text-[10px] text-neutral-400 dark:text-neutral-500 uppercase tracking-wider hidden sm:table-cell">Domain</th>
                <th className="text-left p-2 font-mono text-[10px] text-neutral-400 dark:text-neutral-500 uppercase tracking-wider hidden md:table-cell">Coverage</th>
                <th className="text-right p-2 font-mono text-[10px] text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Refresh</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/50">
              {DATA_SOURCES.map((d) => (
                <tr key={d.provider} className="bg-white dark:bg-neutral-950 hover:bg-neutral-50 dark:hover:bg-neutral-900/30 transition-colors">
                  <td className="p-2">
                    <span className="text-[11px] font-mono font-medium text-neutral-900 dark:text-white">{d.provider}</span>
                  </td>
                  <td className="p-2 hidden sm:table-cell">
                    <span className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400">{d.domain}</span>
                  </td>
                  <td className="p-2 hidden md:table-cell">
                    <span className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400">{d.coverage}</span>
                  </td>
                  <td className="p-2 text-right">
                    <Tag>{d.refresh}</Tag>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Data Integrity */}
        <div className="border border-neutral-200 dark:border-neutral-800 rounded-sm bg-white dark:bg-neutral-950 p-3 mt-2">
          <span className="text-[10px] font-mono text-neutral-400 dark:text-neutral-500 uppercase tracking-widest block mb-2">Data Integrity Protocol</span>
          <div className="space-y-1.5">
            {[
              'Multi-provider cross-validation with automatic fallback chains',
              'Outlier detection and wash-trading filters on raw OHLCV data',
              'Redis-backed caching layer with configurable TTL per data source',
              'Prisma query timeout middleware (15s) with slow-query logging',
            ].map((item) => (
              <div key={item} className="flex items-start gap-2">
                <span className="text-xs font-mono text-[#22C55E] dark:text-[#4ADE80] shrink-0 mt-0.5">✓</span>
                <span className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── §6 Verified Performance ───────────────────────────── */}
      <section>
        <SectionLabel layer="§6" label="Verified Performance Metrics" />

        <div className="border border-neutral-200 dark:border-neutral-800 rounded-sm bg-white dark:bg-neutral-950 p-3 mb-3">
          <p className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400 leading-relaxed mb-2">
            All metrics are derived from verified, outcome-tracked analyses. Outcomes are recorded only when a definitive TP or SL hit is confirmed — pending trades are excluded.
          </p>
          <p className="text-[10px] font-mono text-[#F59E0B] dark:text-[#FBBF24]">
            <span className="uppercase tracking-wider mr-1.5">Survivorship bias notice:</span>
            Metrics include all analyses, not just profitable ones. WAIT and AVOID verdicts are excluded as they do not generate trade plans.
          </p>
        </div>
      </section>

      <BacktestPerformance />

      {/* ── §7 Platform Scope & Limitations ────────────────────── */}
      <section>
        <SectionLabel layer="§7" label="Platform Scope & Limitations" />

        <div className="grid grid-cols-2 gap-px bg-neutral-200 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 rounded-sm overflow-hidden">
          {/* IS */}
          <div className="bg-white dark:bg-neutral-950 p-3">
            <span className="text-[11px] font-mono font-medium text-[#22C55E] dark:text-[#4ADE80] block mb-2">TraderPath IS</span>
            <div className="space-y-1.5">
              {[
                'An analytical research and intelligence platform',
                'A data processing engine for market analysis',
                'An educational tool for understanding capital flows',
                'A transparent system with verifiable performance metrics',
                'A technology product, not a financial service',
              ].map((item) => (
                <div key={item} className="flex items-start gap-2">
                  <span className="text-xs font-mono text-[#22C55E] dark:text-[#4ADE80] shrink-0 mt-0.5">✓</span>
                  <span className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400">{item}</span>
                </div>
              ))}
            </div>
          </div>
          {/* IS NOT */}
          <div className="bg-white dark:bg-neutral-950 p-3">
            <span className="text-[11px] font-mono font-medium text-[#EF4444] dark:text-[#F87171] block mb-2">TraderPath is NOT</span>
            <div className="space-y-1.5">
              {[
                'A broker-dealer or trading platform',
                'A registered investment advisor (RIA)',
                'A provider of personalized financial advice',
                'A fund manager or asset custodian',
                'A guarantee of future performance or returns',
              ].map((item) => (
                <div key={item} className="flex items-start gap-2">
                  <span className="text-xs font-mono text-[#EF4444] dark:text-[#F87171] shrink-0 mt-0.5">✗</span>
                  <span className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── AI Recommendations & Markets ──────────────────────── */}
      <section>
        <div className="grid grid-cols-2 gap-px bg-neutral-200 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 rounded-sm overflow-hidden">
          {/* Recommendations */}
          <div className="bg-white dark:bg-neutral-950 p-3">
            <span className="text-[10px] font-mono text-neutral-400 dark:text-neutral-500 uppercase tracking-widest block mb-2">AI Recommendations</span>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-mono font-bold text-[#22C55E] dark:text-[#4ADE80]">BUY</span>
                <Tag>EARLY / MID Phase</Tag>
              </div>
              <p className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400">Capital entering + strong flow velocity</p>
              <div className="h-px bg-neutral-100 dark:bg-neutral-800" />
              <div className="flex items-center justify-between">
                <span className="text-sm font-mono font-bold text-[#EF4444] dark:text-[#F87171]">SELL</span>
                <Tag>LATE / EXIT Phase</Tag>
              </div>
              <p className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400">Capital exiting + slowing momentum</p>
            </div>
          </div>

          {/* Supported Markets */}
          <div className="bg-white dark:bg-neutral-950 p-3">
            <span className="text-[10px] font-mono text-neutral-400 dark:text-neutral-500 uppercase tracking-widest block mb-2">Supported Markets</span>
            <div className="space-y-1.5">
              {[
                { market: 'Crypto', source: 'Binance' },
                { market: 'Stocks', source: 'Yahoo Finance' },
                { market: 'Metals', source: 'Yahoo Finance' },
                { market: 'Bonds', source: 'Yahoo Finance' },
              ].map((m) => (
                <div key={m.market} className="flex items-center justify-between py-1 border-b border-neutral-100 dark:border-neutral-800/50 last:border-0">
                  <span className="text-[11px] font-mono font-medium text-neutral-900 dark:text-white">{m.market}</span>
                  <span className="text-[10px] font-mono text-neutral-400 dark:text-neutral-500">{m.source}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <div className="border border-neutral-200 dark:border-neutral-800 rounded-sm bg-white dark:bg-neutral-950 p-4 text-center">
        <span className="text-[10px] font-mono text-neutral-400 dark:text-neutral-500 uppercase tracking-widest block mb-2">
          Ready to begin
        </span>
        <Link
          href="/analyze"
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-mono font-medium border border-neutral-200 dark:border-neutral-800 rounded-sm text-neutral-900 dark:text-white hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors"
        >
          View Capital Flow →
        </Link>
      </div>

      {/* ── Disclaimer ───────────────────────────────────────── */}
      <div className="border border-neutral-200 dark:border-neutral-800 rounded-sm bg-white dark:bg-neutral-950 p-3">
        <div className="flex items-start gap-2">
          <span className="text-xs font-mono text-[#F59E0B] dark:text-[#FBBF24] shrink-0 mt-0.5">⚠</span>
          <div>
            <span className="text-[10px] font-mono text-[#F59E0B] dark:text-[#FBBF24] uppercase tracking-wider block mb-1">Important Disclaimer</span>
            <p className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400 leading-relaxed">
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
