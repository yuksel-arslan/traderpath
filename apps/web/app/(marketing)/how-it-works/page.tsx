'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  ArrowLeft,
  ArrowRight,
  Globe,
  Layers,
  Brain,
  Shield,
  Database,
  Activity,
  BarChart3,
  Target,
  Landmark,
  LineChart,
  TrendingUp,
  TrendingDown,
  Clock,
  Zap,
  Bot,
  CheckCircle2,
  Cpu,
  Gauge,
  Search,
  Lock,
  Eye,
  GitBranch,
  Sigma,
  FlaskConical,
} from 'lucide-react';
import { TraderPathLogo } from '../../../components/common/TraderPathLogo';
import { ThemeToggle } from '../../../components/common/ThemeToggle';
import { Footer } from '../../../components/common/Footer';

const BacktestPerformance = dynamic(
  () => import('../../../components/methodology/BacktestPerformance'),
  { ssr: false, loading: () => <div className="h-64 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" /> }
);

const SEVEN_STEPS = [
  {
    step: 1,
    name: 'Market Pulse',
    icon: Activity,
    color: 'blue',
    description: 'Macro-regime classification via composite scoring of volatility surfaces (VIX term structure), cross-asset correlation matrices, and funding rate divergences.',
    metrics: ['VIX Term Structure', 'Funding Rate Spread', 'BTC Dominance Delta', 'Fear & Greed Composite'],
  },
  {
    step: 2,
    name: 'Asset Scanner',
    icon: Search,
    color: 'purple',
    description: 'Multi-timeframe technical decomposition using 40+ indicators with adaptive weighting based on current volatility regime.',
    metrics: ['RSI / Stochastic Oscillator', 'MACD Histogram Divergence', 'Bollinger Band Width', 'ADX Trend Strength'],
  },
  {
    step: 3,
    name: 'Safety Check',
    icon: Shield,
    color: 'red',
    description: 'Microstructure analysis combining order book imbalance detection, wash-trading filters, and liquidity depth assessment.',
    metrics: ['Bid-Ask Imbalance Ratio', 'Order Book Depth (40 levels)', 'Spoofing Detection Score', 'Liquidity Score'],
  },
  {
    step: 4,
    name: 'Timing Analysis',
    icon: Clock,
    color: 'amber',
    description: 'Entry optimization through confluence of support/resistance clustering, economic calendar event proximity, and intraday volume profile.',
    metrics: ['S/R Cluster Proximity', 'Economic Event Window', 'Volume Profile (VPOC)', 'Momentum Confluence'],
  },
  {
    step: 5,
    name: 'Trade Plan',
    icon: Target,
    color: 'emerald',
    description: 'Structured position construction with AI-optimized entry, stop-loss, and take-profit levels derived from ATR-adjusted support/resistance.',
    metrics: ['ATR-Based Stop Distance', 'R:R Optimization', 'AI Price Prediction', 'Position Sizing'],
  },
  {
    step: 6,
    name: 'Trap Check',
    icon: Eye,
    color: 'orange',
    description: 'Counter-trend signal detection by analyzing liquidation heatmaps, whale position clustering, and smart money flow divergence.',
    metrics: ['Liquidation Density Map', 'Whale Wallet Monitoring', 'Open Interest Delta', 'Smart Money Index'],
  },
  {
    step: 7,
    name: 'Final Verdict',
    icon: Gauge,
    color: 'teal',
    description: 'Weighted ensemble verdict aggregating all prior steps with confidence intervals and directional conviction scoring.',
    metrics: ['Composite Score (0-10)', 'Confidence Interval', 'Direction Conviction', 'Verdict: GO / COND / WAIT / AVOID'],
  },
];

const MLIS_LAYERS = [
  {
    layer: 1,
    name: 'Technical Layer',
    description: 'Convolutional feature extraction from raw OHLCV sequences across multiple lookback windows.',
    signal: 'Pattern recognition strength',
  },
  {
    layer: 2,
    name: 'Momentum Layer',
    description: 'Velocity and acceleration decomposition of trend indicators with regime-adaptive thresholds.',
    signal: 'Trend persistence probability',
  },
  {
    layer: 3,
    name: 'Volatility Layer',
    description: 'GARCH-family variance modeling with regime-switching detection for risk surface estimation.',
    signal: 'Volatility regime classification',
  },
  {
    layer: 4,
    name: 'Volume Layer',
    description: 'On-balance volume divergence analysis with institutional flow estimation from tick-level data.',
    signal: 'Accumulation / Distribution score',
  },
  {
    layer: 5,
    name: 'Verdict Layer',
    description: 'Ensemble aggregation with calibrated confidence output (Platt scaling) and recommendation mapping.',
    signal: 'STRONG_BUY / BUY / HOLD / SELL',
  },
];

function getStepColors(color: string) {
  const map: Record<string, { bg: string; border: string; text: string; badge: string; dot: string }> = {
    blue: { bg: 'from-blue-50 to-blue-100 dark:from-blue-500/10 dark:to-blue-500/5', border: 'border-blue-200 dark:border-blue-500/20', text: 'text-blue-700 dark:text-blue-400', badge: 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300', dot: 'bg-blue-500' },
    purple: { bg: 'from-purple-50 to-purple-100 dark:from-purple-500/10 dark:to-purple-500/5', border: 'border-purple-200 dark:border-purple-500/20', text: 'text-purple-700 dark:text-purple-400', badge: 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300', dot: 'bg-purple-500' },
    red: { bg: 'from-red-50 to-red-100 dark:from-red-500/10 dark:to-red-500/5', border: 'border-red-200 dark:border-red-500/20', text: 'text-red-700 dark:text-red-400', badge: 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300', dot: 'bg-red-500' },
    amber: { bg: 'from-amber-50 to-amber-100 dark:from-amber-500/10 dark:to-amber-500/5', border: 'border-amber-200 dark:border-amber-500/20', text: 'text-amber-700 dark:text-amber-400', badge: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300', dot: 'bg-amber-500' },
    emerald: { bg: 'from-emerald-50 to-emerald-100 dark:from-emerald-500/10 dark:to-emerald-500/5', border: 'border-emerald-200 dark:border-emerald-500/20', text: 'text-emerald-700 dark:text-emerald-400', badge: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500' },
    orange: { bg: 'from-orange-50 to-orange-100 dark:from-orange-500/10 dark:to-orange-500/5', border: 'border-orange-200 dark:border-orange-500/20', text: 'text-orange-700 dark:text-orange-400', badge: 'bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300', dot: 'bg-orange-500' },
    teal: { bg: 'from-teal-50 to-teal-100 dark:from-teal-500/10 dark:to-teal-500/5', border: 'border-teal-200 dark:border-teal-500/20', text: 'text-teal-700 dark:text-teal-400', badge: 'bg-teal-100 dark:bg-teal-500/20 text-teal-700 dark:text-teal-300', dot: 'bg-teal-500' },
  };
  return map[color] || map.teal;
}

export default function MethodologyPublicPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <TraderPathLogo size="md" showText={true} showTagline={false} href="/" />
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link href="/login" className="px-4 py-2 text-muted-foreground hover:text-foreground transition">
              Sign In
            </Link>
            <Link href="/register" className="px-4 py-2 bg-gradient-to-r from-teal-500 to-rose-500 text-white rounded-lg font-medium hover:from-teal-600 hover:to-rose-600 transition-all shadow-sm shadow-teal-500/20">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-5xl">
        {/* Back Link */}
        <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition mb-8">
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        {/* ===== HERO ===== */}
        <section className="mb-16">
          <div className="flex items-center gap-2 mb-4">
            <span className="px-3 py-1 text-xs font-semibold bg-teal-100 dark:bg-teal-500/20 text-teal-700 dark:text-teal-300 rounded-full uppercase tracking-wider">
              Technical White Paper
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground mb-4">
            Analysis Methodology &<br />
            <span className="bg-gradient-to-r from-teal-500 to-emerald-500 bg-clip-text text-transparent">
              Data Processing Architecture
            </span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-3xl">
            A rigorous, multi-layered analytical framework that synthesizes macroeconomic liquidity signals,
            cross-asset capital flow dynamics, and quantitative technical analysis into actionable market intelligence.
            TraderPath is an analysis and research platform &mdash; not a broker, advisor, or trading service.
          </p>
          <div className="flex flex-wrap gap-4 mt-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><Database className="w-4 h-4 text-teal-500" /> 6 institutional data feeds</span>
            <span className="flex items-center gap-1.5"><Cpu className="w-4 h-4 text-violet-500" /> 40+ quantitative indicators</span>
            <span className="flex items-center gap-1.5"><GitBranch className="w-4 h-4 text-blue-500" /> Dual-engine confirmation</span>
            <span className="flex items-center gap-1.5"><Sigma className="w-4 h-4 text-amber-500" /> Confidence-interval outputs</span>
          </div>
        </section>

        {/* ===== SECTION 1: CAPITAL FLOW FRAMEWORK ===== */}
        <section className="mb-16" id="capital-flow-framework">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Globe className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">1. Capital Flow Intelligence Framework</h2>
              <p className="text-sm text-muted-foreground">Top-down liquidity analysis across four hierarchical layers</p>
            </div>
          </div>

          <div className="bg-card border rounded-2xl p-6 mb-6">
            <p className="text-muted-foreground mb-6">
              Our analytical thesis is rooted in a fundamental principle of financial markets:
              <strong className="text-foreground"> capital allocation precedes price action</strong>.
              Rather than relying on isolated technical signals, we construct a hierarchical model
              that tracks the flow of liquidity from central bank balance sheets through asset classes,
              sectors, and ultimately into individual instruments. This top-down architecture maximizes
              the signal-to-noise ratio by filtering opportunities through progressively granular lenses.
            </p>

            {/* 4-Layer Architecture */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* L1 */}
              <div className="p-5 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-500/10 dark:to-blue-500/5 rounded-xl border border-blue-200 dark:border-blue-500/20">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white text-sm font-bold">L1</div>
                  <div>
                    <h4 className="font-bold text-blue-900 dark:text-blue-300">Global Liquidity Tracker</h4>
                    <p className="text-xs text-blue-600 dark:text-blue-400">Macro regime classification</p>
                  </div>
                </div>
                <p className="text-sm text-blue-800 dark:text-blue-200/80 mb-3">
                  Ingests Federal Reserve balance sheet data, M2 money supply growth rates,
                  DXY (US Dollar Index) momentum, VIX term structure, and yield curve dynamics
                  to determine the prevailing liquidity regime: <em>risk-on</em>, <em>risk-off</em>, or <em>transitional</em>.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {['FRED API', 'Fed Balance Sheet', 'M2 YoY Growth', 'DXY Momentum', 'VIX Surface', '10Y-2Y Spread'].map(t => (
                    <span key={t} className="px-2 py-0.5 text-[10px] font-medium bg-blue-200/50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 rounded">
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              {/* L2 */}
              <div className="p-5 bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-500/10 dark:to-purple-500/5 rounded-xl border border-purple-200 dark:border-purple-500/20">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center text-white text-sm font-bold">L2</div>
                  <div>
                    <h4 className="font-bold text-purple-900 dark:text-purple-300">Market Flow Analyzer</h4>
                    <p className="text-xs text-purple-600 dark:text-purple-400">Cross-asset rotation detection</p>
                  </div>
                </div>
                <p className="text-sm text-purple-800 dark:text-purple-200/80 mb-3">
                  Measures 7-day and 30-day capital flow velocity across four asset classes
                  (Crypto, Equities, Fixed Income, Precious Metals) to identify rotation patterns
                  and phase-classify each market as <em>EARLY</em>, <em>MID</em>, <em>LATE</em>, or <em>EXIT</em>.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {['Binance', 'Yahoo Finance', 'DefiLlama', 'Flow Velocity', 'Phase Detection', 'Rotation Signal'].map(t => (
                    <span key={t} className="px-2 py-0.5 text-[10px] font-medium bg-purple-200/50 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 rounded">
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              {/* L3 */}
              <div className="p-5 bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-500/10 dark:to-amber-500/5 rounded-xl border border-amber-200 dark:border-amber-500/20">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center text-white text-sm font-bold">L3</div>
                  <div>
                    <h4 className="font-bold text-amber-900 dark:text-amber-300">Sector Drill-Down</h4>
                    <p className="text-xs text-amber-600 dark:text-amber-400">Intra-market capital concentration</p>
                  </div>
                </div>
                <p className="text-sm text-amber-800 dark:text-amber-200/80 mb-3">
                  Within the identified primary market, sector-level TVL (Total Value Locked)
                  flows, trading volume distribution, and dominance shifts are analyzed to pinpoint
                  which vertical is attracting disproportionate capital inflow relative to peers.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {['DeFi TVL', 'L2 Activity', 'Sector Volume', 'Dominance Shift', 'Flow Anomaly', 'Relative Strength'].map(t => (
                    <span key={t} className="px-2 py-0.5 text-[10px] font-medium bg-amber-200/50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 rounded">
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              {/* L4 */}
              <div className="p-5 bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-500/10 dark:to-emerald-500/5 rounded-xl border border-emerald-200 dark:border-emerald-500/20">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white text-sm font-bold">L4</div>
                  <div>
                    <h4 className="font-bold text-emerald-900 dark:text-emerald-300">Asset Analysis Engine</h4>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">Instrument-level quantitative analysis</p>
                  </div>
                </div>
                <p className="text-sm text-emerald-800 dark:text-emerald-200/80 mb-3">
                  The final layer deploys our dual-engine analytical suite (7-Step Classic + MLIS Pro)
                  on the recommended instruments, producing a structured verdict with calibrated confidence
                  levels, directional conviction, and a risk-bounded trade plan.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {['7-Step Engine', 'MLIS Pro', 'AI Expert Panel', 'Trade Plan', 'Confidence Score', 'RAG Enrichment'].map(t => (
                    <span key={t} className="px-2 py-0.5 text-[10px] font-medium bg-emerald-200/50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Phase Detection */}
          <div className="bg-card border rounded-2xl p-6">
            <h3 className="text-lg font-bold mb-2">Phase Detection & Rotation Model</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Capital flows follow observable cyclical patterns. We measure the duration and velocity
              of flow into each market to classify the current phase. Statistical analysis of historical
              phase durations provides expected holding periods and transition probabilities.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { phase: 'EARLY', days: '0-30', color: 'emerald', signal: 'Optimal entry zone. Capital inflow accelerating with positive velocity delta.' },
                { phase: 'MID', days: '30-60', color: 'amber', signal: 'Trend maturing. Flow velocity stabilizing; position sizing should decrease.' },
                { phase: 'LATE', days: '60-90', color: 'orange', signal: 'Trend exhaustion imminent. Negative flow acceleration detected.' },
                { phase: 'EXIT', days: '90+ / Reversal', color: 'red', signal: 'Capital outflow confirmed. Rotation to alternative asset class underway.' },
              ].map(p => (
                <div key={p.phase} className={`p-4 rounded-xl bg-${p.color}-50 dark:bg-${p.color}-500/10 border border-${p.color}-200 dark:border-${p.color}-500/20`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-2.5 h-2.5 rounded-full bg-${p.color}-500 ${p.phase === 'EARLY' ? 'animate-pulse' : ''}`} />
                    <span className={`font-bold text-${p.color}-700 dark:text-${p.color}-400 text-sm`}>{p.phase}</span>
                  </div>
                  <p className={`text-xs text-${p.color}-600 dark:text-${p.color}-300/80 font-medium mb-1`}>{p.days}</p>
                  <p className={`text-xs text-${p.color}-700 dark:text-${p.color}-300/70`}>{p.signal}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== SECTION 2: 7-STEP ENGINE ===== */}
        <section className="mb-16" id="seven-step-engine">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">2. 7-Step Analysis Engine</h2>
              <p className="text-sm text-muted-foreground">Sequential, gated analysis pipeline with 40+ quantitative indicators</p>
            </div>
          </div>

          <div className="bg-card border rounded-2xl p-6 mb-6">
            <p className="text-muted-foreground mb-4">
              The 7-Step engine is a sequential pipeline where each step acts as a gate. If a preceding
              step flags critical risk (e.g., Safety Check detects wash trading), the pipeline can
              terminate early with a <strong className="text-foreground">AVOID</strong> verdict, conserving
              computational resources and preventing analysis on compromised data. Each step produces a
              sub-score on a normalized 0-10 scale, which feeds into the final weighted ensemble.
            </p>
            <div className="flex items-center gap-2 px-4 py-2 bg-teal-50 dark:bg-teal-500/10 rounded-lg border border-teal-200 dark:border-teal-500/20 text-sm text-teal-700 dark:text-teal-300 mb-6">
              <FlaskConical className="w-4 h-4 flex-shrink-0" />
              <span>
                <strong>Key principle:</strong> Each step is independently auditable. Sub-scores, raw indicator
                values, and confidence intervals are preserved for full transparency.
              </span>
            </div>

            <div className="space-y-4">
              {SEVEN_STEPS.map((step) => {
                const c = getStepColors(step.color);
                const Icon = step.icon;
                return (
                  <div key={step.step} className={`p-5 bg-gradient-to-br ${c.bg} rounded-xl border ${c.border}`}>
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-lg ${c.dot} flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>
                        {step.step}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className={`w-4 h-4 ${c.text}`} />
                          <h4 className={`font-bold ${c.text}`}>{step.name}</h4>
                        </div>
                        <p className="text-sm text-slate-700 dark:text-slate-300 mb-3">{step.description}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {step.metrics.map(m => (
                            <span key={m} className={`px-2 py-0.5 text-[10px] font-medium ${c.badge} rounded`}>{m}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ===== SECTION 3: MLIS PRO ===== */}
        <section className="mb-16" id="mlis-pro">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">3. MLIS Pro &mdash; Machine Learning Inference System</h2>
              <p className="text-sm text-muted-foreground">5-layer neural confirmation engine with calibrated confidence outputs</p>
            </div>
          </div>

          <div className="bg-card border rounded-2xl p-6 mb-6">
            <p className="text-muted-foreground mb-4">
              MLIS Pro serves as an independent confirmation layer that cross-validates the 7-Step
              engine output. It processes raw market data through five specialized neural inference
              layers, each extracting orthogonal features. The final Verdict Layer uses
              calibrated probability estimation (Platt scaling) to produce confidence-adjusted
              recommendations. When MLIS Pro contradicts the 7-Step verdict, the system automatically
              downgrades the conviction level, significantly reducing false positive rates.
            </p>

            <div className="space-y-3">
              {MLIS_LAYERS.map(l => (
                <div key={l.layer} className="flex items-start gap-4 p-4 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-500/10 dark:to-purple-500/5 rounded-xl border border-violet-200 dark:border-violet-500/20">
                  <div className="w-8 h-8 bg-violet-500 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {l.layer}
                  </div>
                  <div>
                    <h4 className="font-bold text-violet-800 dark:text-violet-300 mb-0.5">{l.name}</h4>
                    <p className="text-sm text-slate-700 dark:text-slate-300 mb-1">{l.description}</p>
                    <span className="text-xs text-violet-600 dark:text-violet-400 font-medium">Output: {l.signal}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dual-Engine Confirmation */}
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border rounded-2xl p-6">
            <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-teal-500" />
              Dual-Engine Confirmation Protocol
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              The interplay between the rule-based 7-Step engine and the neural MLIS Pro system
              creates a robust confirmation mechanism analogous to ensemble methods in predictive modeling.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl border border-emerald-200 dark:border-emerald-500/20">
                <h4 className="font-bold text-emerald-700 dark:text-emerald-400 text-sm mb-1">Full Confirmation</h4>
                <p className="text-xs text-emerald-600 dark:text-emerald-300/80">
                  Both engines agree on direction and conviction. Confidence level elevated.
                  Highest-probability signal output.
                </p>
              </div>
              <div className="p-4 bg-amber-50 dark:bg-amber-500/10 rounded-xl border border-amber-200 dark:border-amber-500/20">
                <h4 className="font-bold text-amber-700 dark:text-amber-400 text-sm mb-1">Partial Confirmation</h4>
                <p className="text-xs text-amber-600 dark:text-amber-300/80">
                  Direction aligned, conviction divergent. Confidence level maintained at base.
                  Position sizing should be reduced.
                </p>
              </div>
              <div className="p-4 bg-red-50 dark:bg-red-500/10 rounded-xl border border-red-200 dark:border-red-500/20">
                <h4 className="font-bold text-red-700 dark:text-red-400 text-sm mb-1">Contradiction</h4>
                <p className="text-xs text-red-600 dark:text-red-300/80">
                  Engines disagree on direction. Confidence automatically downgraded.
                  Verdict shifts toward WAIT or AVOID.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ===== SECTION 4: AI EXPERT PANEL ===== */}
        <section className="mb-16" id="ai-expert-panel">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">4. AI Expert Panel (VOLTRAN Synthesis)</h2>
              <p className="text-sm text-muted-foreground">Multi-agent reasoning system for qualitative overlay</p>
            </div>
          </div>

          <div className="bg-card border rounded-2xl p-6">
            <p className="text-muted-foreground mb-6">
              Beyond quantitative signals, our AI Expert Panel employs four specialized agents, each
              trained on domain-specific reasoning, to provide qualitative context. Their independent
              assessments are then synthesized by the VOLTRAN aggregation module into a unified narrative.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { name: 'ARIA', domain: 'Technical Analysis', color: 'blue', desc: 'Interprets indicator confluence, candlestick patterns, and chart formations with contextual market commentary.' },
                { name: 'NEXUS', domain: 'Risk Assessment', color: 'amber', desc: 'Evaluates position-level and portfolio-level risk metrics including correlation risk, concentration risk, and tail-event probability.' },
                { name: 'ORACLE', domain: 'On-Chain & Flow', color: 'purple', desc: 'Analyzes on-chain whale movements, exchange flow netflows, and stablecoin supply dynamics for crypto assets.' },
                { name: 'SENTINEL', domain: 'Security & Integrity', color: 'red', desc: 'Monitors for smart contract vulnerabilities, regulatory risks, exchange solvency indicators, and market manipulation signals.' },
              ].map(expert => (
                <div key={expert.name} className={`p-5 bg-${expert.color}-50 dark:bg-${expert.color}-500/10 rounded-xl border border-${expert.color}-200 dark:border-${expert.color}-500/20`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-sm font-bold text-${expert.color}-600 dark:text-${expert.color}-400`}>{expert.name}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded bg-${expert.color}-100 dark:bg-${expert.color}-500/20 text-${expert.color}-700 dark:text-${expert.color}-300`}>
                      {expert.domain}
                    </span>
                  </div>
                  <p className={`text-sm text-${expert.color}-800 dark:text-${expert.color}-200/80`}>{expert.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== SECTION 5: DATA INFRASTRUCTURE ===== */}
        <section className="mb-16" id="data-infrastructure">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center shadow-lg shadow-slate-500/20">
              <Database className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">5. Data Infrastructure & Sources</h2>
              <p className="text-sm text-muted-foreground">Institutional-grade data feeds with multi-provider redundancy</p>
            </div>
          </div>

          <div className="bg-card border rounded-2xl p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b dark:border-slate-700">
                    <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Provider</th>
                    <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Data Domain</th>
                    <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Asset Coverage</th>
                    <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Refresh Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-slate-700">
                  {[
                    { provider: 'FRED (Federal Reserve)', domain: 'Macroeconomic', coverage: 'US monetary policy, treasury yields, M2', refresh: 'Daily / Weekly' },
                    { provider: 'Binance', domain: 'Crypto OHLCV + Order Book', coverage: '500+ crypto pairs', refresh: 'Real-time' },
                    { provider: 'Yahoo Finance', domain: 'Equities, Metals, Bonds', coverage: 'Global equities, ETFs, commodities', refresh: '15-min delayed' },
                    { provider: 'DefiLlama', domain: 'DeFi TVL & Protocol Flows', coverage: '2000+ DeFi protocols', refresh: 'Hourly' },
                    { provider: 'CoinGecko / CMC', domain: 'Tokenomics & Fundamentals', coverage: 'Market cap, supply metrics', refresh: '5-min' },
                    { provider: 'Finnhub', domain: 'Economic Calendar', coverage: 'FOMC, CPI, NFP, GDP events', refresh: 'Event-driven' },
                  ].map(row => (
                    <tr key={row.provider}>
                      <td className="py-3 px-4 font-medium text-foreground">{row.provider}</td>
                      <td className="py-3 px-4 text-muted-foreground">{row.domain}</td>
                      <td className="py-3 px-4 text-muted-foreground">{row.coverage}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 text-xs bg-slate-100 dark:bg-slate-800 rounded font-medium">{row.refresh}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
              <h4 className="font-bold text-sm mb-2 flex items-center gap-2">
                <Lock className="w-4 h-4 text-slate-500" />
                Data Integrity Protocol
              </h4>
              <ul className="text-xs text-muted-foreground space-y-1.5">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                  Multi-provider cross-validation with automatic fallback chains
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                  Outlier detection and wash-trading filters on raw OHLCV data
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                  Redis-backed caching layer with configurable TTL per data source
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                  Prisma query timeout middleware (15s) with slow-query logging
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* ===== SECTION 6: BACKTEST PERFORMANCE ===== */}
        <section className="mb-16" id="verified-performance">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">6. Verified Performance Metrics</h2>
              <p className="text-sm text-muted-foreground">Outcome-tracked results from live analysis outputs</p>
            </div>
          </div>

          <div className="bg-card border rounded-2xl p-6 mb-4">
            <p className="text-muted-foreground mb-4">
              All performance metrics below are derived from <strong className="text-foreground">verified, outcome-tracked analyses</strong>.
              When a trade plan is generated, the system monitors price action against the defined
              take-profit and stop-loss levels using Binance Klines API (crypto) or Yahoo Finance (non-crypto).
              Outcomes are recorded only when a definitive TP or SL hit is confirmed &mdash; pending
              trades are excluded from performance calculations.
            </p>
            <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-500/10 rounded-lg border border-amber-200 dark:border-amber-500/20 text-sm text-amber-700 dark:text-amber-300">
              <Shield className="w-4 h-4 flex-shrink-0" />
              <span>
                <strong>Survivorship bias notice:</strong> Metrics include all analyses, not just profitable ones.
                WAIT and AVOID verdicts are excluded as they do not generate trade plans.
              </span>
            </div>
          </div>

          <BacktestPerformance />
        </section>

        {/* ===== SECTION 7: IMPORTANT DISTINCTIONS ===== */}
        <section className="mb-16" id="platform-scope">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">7. Platform Scope & Limitations</h2>
              <p className="text-sm text-muted-foreground">What TraderPath is and what it is not</p>
            </div>
          </div>

          <div className="bg-card border rounded-2xl p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-bold text-emerald-600 dark:text-emerald-400 mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  TraderPath IS:
                </h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2"><span className="text-emerald-500 mt-1">&#x2022;</span> An analytical research and intelligence platform</li>
                  <li className="flex items-start gap-2"><span className="text-emerald-500 mt-1">&#x2022;</span> A data processing engine for market analysis</li>
                  <li className="flex items-start gap-2"><span className="text-emerald-500 mt-1">&#x2022;</span> An educational tool for understanding capital flows</li>
                  <li className="flex items-start gap-2"><span className="text-emerald-500 mt-1">&#x2022;</span> A transparent system with verifiable performance metrics</li>
                  <li className="flex items-start gap-2"><span className="text-emerald-500 mt-1">&#x2022;</span> A technology product, not a financial service</li>
                </ul>
              </div>
              <div>
                <h3 className="font-bold text-red-600 dark:text-red-400 mb-3 flex items-center gap-2">
                  <TrendingDown className="w-4 h-4" />
                  TraderPath is NOT:
                </h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2"><span className="text-red-500 mt-1">&#x2022;</span> A broker-dealer or trading platform</li>
                  <li className="flex items-start gap-2"><span className="text-red-500 mt-1">&#x2022;</span> A registered investment advisor (RIA)</li>
                  <li className="flex items-start gap-2"><span className="text-red-500 mt-1">&#x2022;</span> A provider of personalized financial advice</li>
                  <li className="flex items-start gap-2"><span className="text-red-500 mt-1">&#x2022;</span> A fund manager or asset custodian</li>
                  <li className="flex items-start gap-2"><span className="text-red-500 mt-1">&#x2022;</span> A guarantee of future performance or returns</li>
                </ul>
              </div>
            </div>

            <div className="mt-6 p-4 bg-red-50 dark:bg-red-500/10 rounded-xl border border-red-200 dark:border-red-500/20">
              <p className="text-sm text-red-700 dark:text-red-300">
                <strong>Regulatory notice:</strong> TraderPath does not execute trades, hold customer funds,
                or provide personalized investment recommendations. All analysis outputs are
                informational and educational in nature. Users are solely responsible for their
                own trading and investment decisions.
              </p>
            </div>
          </div>
        </section>

        {/* ===== CTA ===== */}
        <section className="mb-12">
          <div className="bg-gradient-to-r from-teal-500 to-emerald-600 rounded-2xl p-8 text-center">
            <h3 className="text-white font-bold text-2xl mb-3">Explore the Methodology in Action</h3>
            <p className="text-teal-100 text-sm mb-6 max-w-2xl mx-auto">
              See how our 4-layer Capital Flow framework, 7-Step engine, and MLIS Pro confirmation
              system work together to produce institutional-grade market intelligence.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-teal-600 font-bold rounded-lg hover:bg-teal-50 transition-colors"
              >
                <Zap className="w-4 h-4" />
                Start Free Analysis
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/disclaimer"
                className="inline-flex items-center gap-2 px-6 py-3 border-2 border-white/30 text-white font-medium rounded-lg hover:bg-white/10 transition-colors"
              >
                <Shield className="w-4 h-4" />
                Risk Disclosure
              </Link>
            </div>
          </div>
        </section>

        {/* Related Links */}
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <Link href="/disclaimer" className="hover:text-foreground transition underline underline-offset-4">Risk Disclosure Statement</Link>
          <Link href="/terms" className="hover:text-foreground transition underline underline-offset-4">Terms of Service</Link>
          <Link href="/privacy" className="hover:text-foreground transition underline underline-offset-4">Privacy Policy</Link>
          <Link href="/pricing" className="hover:text-foreground transition underline underline-offset-4">Pricing</Link>
        </div>
      </main>

      <Footer variant="minimal" />
    </div>
  );
}
