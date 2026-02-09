'use client';

import dynamic from 'next/dynamic';
import {
  Database,
  LineChart,
  Brain,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Globe,
  Bot,
  TrendingUp,
  TrendingDown,
  Layers,
  ArrowRight,
  DollarSign,
  Landmark,
  Coins,
  Gem,
  BarChart3,
  Clock,
  Target,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  ExternalLink,
  GitBranch,
  Search,
  Eye,
  Gauge,
  Lock,
  FlaskConical,
} from 'lucide-react';
import Link from 'next/link';

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

export default function MethodologyPage() {
  return (
    <div className="w-full px-4 md:px-8 lg:px-12 py-6 space-y-6">
      {/* ===== Header - Capital Flow Philosophy ===== */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border border-gray-200 dark:border-slate-700">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-teal-500/5 dark:from-teal-500/10 via-transparent to-transparent" />

        <div className="relative z-10 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-teal-500/30">
                <Globe className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold gradient-text-logo-animate">Capital Flow Methodology</h1>
                <p className="text-xs text-gray-500 dark:text-slate-400">&ldquo;Where money flows, potential exists&rdquo;</p>
              </div>
            </div>
            <Link
              href="/how-it-works"
              target="_blank"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-500/10 rounded-lg border border-teal-200 dark:border-teal-500/20 hover:bg-teal-100 dark:hover:bg-teal-500/20 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              Full Technical Paper
            </Link>
          </div>
        </div>
      </div>

      {/* ===== Philosophy Banner ===== */}
      <div className="bg-gradient-to-r from-teal-500/10 via-emerald-500/10 to-cyan-500/10 dark:from-teal-500/20 dark:via-emerald-500/20 dark:to-cyan-500/20 rounded-xl p-4 border border-teal-200 dark:border-teal-700/30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-teal-800 dark:text-teal-300 text-sm">Top-Down Approach</h3>
            <p className="text-xs text-teal-700 dark:text-teal-200/80">
              Capital allocation precedes price action. Instead of picking random assets, we track global capital flows to identify where money is moving &mdash; then drill down to find the best opportunities.
            </p>
          </div>
        </div>
      </div>

      {/* ===== 1. 4-Layer Capital Flow System ===== */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700">
        <h3 className="font-bold gradient-text-logo-animate mb-1 flex items-center gap-2">
          <Layers className="w-4 h-4" />
          1. Capital Flow Intelligence Framework
        </h3>
        <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">Top-down liquidity analysis across four hierarchical layers</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          {/* Layer 1 */}
          <div className="relative p-3 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-500/10 dark:to-blue-500/20 rounded-xl border border-blue-200 dark:border-blue-500/30">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 bg-blue-500 rounded-md flex items-center justify-center text-white text-xs font-bold">L1</div>
              <div>
                <span className="font-semibold text-sm text-blue-900 dark:text-blue-300">Global Liquidity Tracker</span>
                <p className="text-[10px] text-blue-600 dark:text-blue-400">Macro regime classification</p>
              </div>
            </div>
            <p className="text-[11px] text-blue-800 dark:text-blue-200/80 mb-2">
              Ingests Fed balance sheet data, M2 money supply, DXY momentum, VIX term structure, and yield curve dynamics to determine the prevailing liquidity regime.
            </p>
            <div className="flex flex-wrap gap-1">
              {['FRED API', 'Fed Balance Sheet', 'M2 YoY', 'DXY', 'VIX', '10Y-2Y Spread'].map(t => (
                <span key={t} className="px-1.5 py-0.5 text-[9px] font-medium bg-blue-200/50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 rounded">{t}</span>
              ))}
            </div>
          </div>

          {/* Layer 2 */}
          <div className="relative p-3 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-500/10 dark:to-purple-500/20 rounded-xl border border-purple-200 dark:border-purple-500/30">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 bg-purple-500 rounded-md flex items-center justify-center text-white text-xs font-bold">L2</div>
              <div>
                <span className="font-semibold text-sm text-purple-900 dark:text-purple-300">Market Flow Analyzer</span>
                <p className="text-[10px] text-purple-600 dark:text-purple-400">Cross-asset rotation detection</p>
              </div>
            </div>
            <p className="text-[11px] text-purple-800 dark:text-purple-200/80 mb-2">
              Measures 7-day and 30-day capital flow velocity across four asset classes to identify rotation patterns and phase-classify each market.
            </p>
            <div className="flex flex-wrap gap-1">
              {['Binance', 'Yahoo Finance', 'DefiLlama', 'Flow Velocity', 'Phase Detection', 'Rotation Signal'].map(t => (
                <span key={t} className="px-1.5 py-0.5 text-[9px] font-medium bg-purple-200/50 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 rounded">{t}</span>
              ))}
            </div>
          </div>

          {/* Layer 3 */}
          <div className="relative p-3 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-500/10 dark:to-amber-500/20 rounded-xl border border-amber-200 dark:border-amber-500/30">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 bg-amber-500 rounded-md flex items-center justify-center text-white text-xs font-bold">L3</div>
              <div>
                <span className="font-semibold text-sm text-amber-900 dark:text-amber-300">Sector Drill-Down</span>
                <p className="text-[10px] text-amber-600 dark:text-amber-400">Intra-market capital concentration</p>
              </div>
            </div>
            <p className="text-[11px] text-amber-800 dark:text-amber-200/80 mb-2">
              Sector-level TVL flows, trading volume distribution, and dominance shifts are analyzed to pinpoint which vertical is attracting disproportionate capital.
            </p>
            <div className="flex flex-wrap gap-1">
              {['DeFi TVL', 'L2 Activity', 'Sector Volume', 'Dominance Shift', 'Flow Anomaly', 'Relative Strength'].map(t => (
                <span key={t} className="px-1.5 py-0.5 text-[9px] font-medium bg-amber-200/50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 rounded">{t}</span>
              ))}
            </div>
          </div>

          {/* Layer 4 */}
          <div className="relative p-3 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-500/10 dark:to-emerald-500/20 rounded-xl border border-emerald-200 dark:border-emerald-500/30">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 bg-emerald-500 rounded-md flex items-center justify-center text-white text-xs font-bold">L4</div>
              <div>
                <span className="font-semibold text-sm text-emerald-900 dark:text-emerald-300">Asset Analysis Engine</span>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400">Instrument-level quantitative analysis</p>
              </div>
            </div>
            <p className="text-[11px] text-emerald-800 dark:text-emerald-200/80 mb-2">
              Deploys our dual-engine suite (7-Step Classic + MLIS Pro) on recommended instruments, producing a structured verdict with calibrated confidence and trade plan.
            </p>
            <div className="flex flex-wrap gap-1">
              {['7-Step Engine', 'MLIS Pro', 'AI Expert Panel', 'Trade Plan', 'Confidence Score', 'RAG Enrichment'].map(t => (
                <span key={t} className="px-1.5 py-0.5 text-[9px] font-medium bg-emerald-200/50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded">{t}</span>
              ))}
            </div>
          </div>
        </div>

        <p className="text-xs text-center text-gray-500 dark:text-slate-400 italic">
          Global Liquidity &rarr; Market Selection &rarr; Sector Focus &rarr; Asset Analysis
        </p>
      </div>

      {/* ===== Phase Detection ===== */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700">
        <h3 className="font-bold gradient-text-logo-animate mb-1 flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Phase Detection &amp; Rotation Model
        </h3>
        <p className="text-xs text-gray-600 dark:text-slate-400 mb-3">
          Capital flows follow observable cyclical patterns. We measure the duration and velocity of flow into each market to classify the current phase.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
          {[
            { phase: 'EARLY', days: '0-30 days', desc: 'Optimal entry zone. Capital inflow accelerating with positive velocity delta.', color: 'emerald' },
            { phase: 'MID', days: '30-60 days', desc: 'Trend maturing. Flow velocity stabilizing; position sizing should decrease.', color: 'yellow' },
            { phase: 'LATE', days: '60-90 days', desc: 'Trend exhaustion imminent. Negative flow acceleration detected.', color: 'orange' },
            { phase: 'EXIT', days: '90+ / Reversal', desc: 'Capital outflow confirmed. Rotation to alternative asset class underway.', color: 'red' },
          ].map(p => (
            <div key={p.phase} className={`p-3 bg-${p.color}-50 dark:bg-${p.color}-500/10 rounded-lg border border-${p.color}-200 dark:border-${p.color}-500/30`}>
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-2 h-2 rounded-full bg-${p.color}-500 ${p.phase === 'EARLY' ? 'animate-pulse' : ''}`} />
                <span className={`font-bold text-${p.color}-700 dark:text-${p.color}-400 text-sm`}>{p.phase}</span>
              </div>
              <p className={`text-[10px] text-${p.color}-600 dark:text-${p.color}-300/80 font-medium`}>{p.days}</p>
              <p className={`text-[10px] text-${p.color}-700 dark:text-${p.color}-300/70 mt-1`}>{p.desc}</p>
            </div>
          ))}
        </div>

        {/* Rotation Detection */}
        <div className="grid grid-cols-3 gap-2">
          <div className="flex items-center gap-2 p-2 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg">
            <ArrowUpRight className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            <div>
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Entering</span>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-300/80">Capital flowing in</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-500/10 rounded-lg">
            <Activity className="w-4 h-4 text-blue-500 flex-shrink-0" />
            <div>
              <span className="text-xs font-medium text-blue-700 dark:text-blue-400">Stable</span>
              <p className="text-[10px] text-blue-600 dark:text-blue-300/80">Holding steady</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-500/10 rounded-lg">
            <ArrowDownRight className="w-4 h-4 text-red-500 flex-shrink-0" />
            <div>
              <span className="text-xs font-medium text-red-700 dark:text-red-400">Exiting</span>
              <p className="text-[10px] text-red-600 dark:text-red-300/80">Capital flowing out</p>
            </div>
          </div>
        </div>
      </div>

      {/* ===== 2. 7-Step Analysis Engine ===== */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700">
        <h3 className="font-bold gradient-text-logo-animate mb-1 flex items-center gap-2">
          <Layers className="w-4 h-4" />
          2. 7-Step Analysis Engine
        </h3>
        <p className="text-xs text-gray-600 dark:text-slate-400 mb-2">
          Sequential, gated analysis pipeline with 40+ quantitative indicators
        </p>
        <div className="flex items-center gap-2 px-3 py-2 bg-teal-50 dark:bg-teal-500/10 rounded-lg border border-teal-200 dark:border-teal-500/20 text-[11px] text-teal-700 dark:text-teal-300 mb-3">
          <FlaskConical className="w-3.5 h-3.5 flex-shrink-0" />
          <span>
            <strong>Key principle:</strong> Each step is independently auditable. Sub-scores, raw indicator values, and confidence intervals are preserved for full transparency.
          </span>
        </div>

        <div className="space-y-3">
          {SEVEN_STEPS.map((step) => {
            const c = getStepColors(step.color);
            const Icon = step.icon;
            return (
              <div key={step.step} className={`p-3 bg-gradient-to-br ${c.bg} rounded-xl border ${c.border}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg ${c.dot} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                    {step.step}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <Icon className={`w-3.5 h-3.5 ${c.text}`} />
                      <h4 className={`font-bold text-sm ${c.text}`}>{step.name}</h4>
                    </div>
                    <p className="text-[11px] text-slate-700 dark:text-slate-300 mb-2">{step.description}</p>
                    <div className="flex flex-wrap gap-1">
                      {step.metrics.map(m => (
                        <span key={m} className={`px-1.5 py-0.5 text-[9px] font-medium ${c.badge} rounded`}>{m}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ===== 3. MLIS Pro - Machine Learning Inference System ===== */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700">
        <h3 className="font-bold gradient-text-logo-animate mb-1 flex items-center gap-2">
          <Brain className="w-4 h-4" />
          3. MLIS Pro &mdash; Machine Learning Inference System
        </h3>
        <p className="text-xs text-gray-600 dark:text-slate-400 mb-3">
          5-layer neural confirmation engine with calibrated confidence outputs. Cross-validates the 7-Step engine using orthogonal feature extraction. When MLIS contradicts the 7-Step verdict, conviction is automatically downgraded.
        </p>

        <div className="space-y-2 mb-4">
          {MLIS_LAYERS.map(l => (
            <div key={l.layer} className="flex items-start gap-3 p-3 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-500/10 dark:to-purple-500/5 rounded-xl border border-violet-200 dark:border-violet-500/20">
              <div className="w-7 h-7 bg-violet-500 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {l.layer}
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-violet-800 dark:text-violet-300 text-sm mb-0.5">{l.name}</h4>
                <p className="text-[11px] text-slate-700 dark:text-slate-300 mb-1">{l.description}</p>
                <span className="text-[10px] text-violet-600 dark:text-violet-400 font-medium">Output: {l.signal}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Dual-Engine Confirmation Protocol */}
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-700/50 dark:to-slate-800/50 rounded-xl p-3 border border-slate-200 dark:border-slate-600">
          <h4 className="font-bold text-sm mb-2 flex items-center gap-2">
            <GitBranch className="w-3.5 h-3.5 text-teal-500" />
            Dual-Engine Confirmation Protocol
          </h4>
          <p className="text-[10px] text-gray-600 dark:text-slate-400 mb-2">
            The interplay between rule-based 7-Step and neural MLIS Pro creates a robust confirmation mechanism analogous to ensemble methods in predictive modeling.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg border border-emerald-200 dark:border-emerald-500/20">
              <h5 className="font-bold text-emerald-700 dark:text-emerald-400 text-xs mb-1">Full Confirmation</h5>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-300/80">
                Both engines agree on direction and conviction. Confidence level elevated. Highest-probability signal output.
              </p>
            </div>
            <div className="p-2.5 bg-amber-50 dark:bg-amber-500/10 rounded-lg border border-amber-200 dark:border-amber-500/20">
              <h5 className="font-bold text-amber-700 dark:text-amber-400 text-xs mb-1">Partial Confirmation</h5>
              <p className="text-[10px] text-amber-600 dark:text-amber-300/80">
                Direction aligned, conviction divergent. Confidence maintained at base. Position sizing should be reduced.
              </p>
            </div>
            <div className="p-2.5 bg-red-50 dark:bg-red-500/10 rounded-lg border border-red-200 dark:border-red-500/20">
              <h5 className="font-bold text-red-700 dark:text-red-400 text-xs mb-1">Contradiction</h5>
              <p className="text-[10px] text-red-600 dark:text-red-300/80">
                Engines disagree on direction. Confidence automatically downgraded. Verdict shifts toward WAIT or AVOID.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ===== 4. AI Expert Panel (VOLTRAN Synthesis) ===== */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700">
        <h3 className="font-bold gradient-text-logo-animate mb-1 flex items-center gap-2">
          <Bot className="w-4 h-4" />
          4. AI Expert Panel (VOLTRAN Synthesis)
        </h3>
        <p className="text-xs text-gray-600 dark:text-slate-400 mb-3">
          Multi-agent reasoning system for qualitative overlay. Four specialized agents provide independent assessments, synthesized by the VOLTRAN aggregation module.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { name: 'ARIA', domain: 'Technical Analysis', color: 'blue', desc: 'Interprets indicator confluence, candlestick patterns, and chart formations with contextual market commentary.' },
            { name: 'NEXUS', domain: 'Risk Assessment', color: 'amber', desc: 'Evaluates position-level and portfolio-level risk metrics including correlation risk, concentration risk, and tail-event probability.' },
            { name: 'ORACLE', domain: 'On-Chain & Flow', color: 'purple', desc: 'Analyzes on-chain whale movements, exchange flow netflows, and stablecoin supply dynamics for crypto assets.' },
            { name: 'SENTINEL', domain: 'Security & Integrity', color: 'red', desc: 'Monitors smart contract vulnerabilities, regulatory risks, exchange solvency indicators, and market manipulation signals.' },
          ].map(expert => (
            <div key={expert.name} className={`p-3 bg-${expert.color}-50 dark:bg-${expert.color}-500/10 rounded-xl border border-${expert.color}-200 dark:border-${expert.color}-500/20`}>
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`text-sm font-bold text-${expert.color}-600 dark:text-${expert.color}-400`}>{expert.name}</span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded bg-${expert.color}-100 dark:bg-${expert.color}-500/20 text-${expert.color}-700 dark:text-${expert.color}-300`}>
                  {expert.domain}
                </span>
              </div>
              <p className={`text-[11px] text-${expert.color}-800 dark:text-${expert.color}-200/80`}>{expert.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ===== 5. Data Infrastructure & Sources ===== */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700">
        <h3 className="font-bold gradient-text-logo-animate mb-1 flex items-center gap-2">
          <Database className="w-4 h-4" />
          5. Data Infrastructure &amp; Sources
        </h3>
        <p className="text-xs text-gray-600 dark:text-slate-400 mb-3">
          Institutional-grade data feeds with multi-provider redundancy
        </p>

        <div className="overflow-x-auto mb-3">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200 dark:border-slate-600">
                <th className="text-left py-2 px-3 font-semibold text-gray-500 dark:text-slate-400">Provider</th>
                <th className="text-left py-2 px-3 font-semibold text-gray-500 dark:text-slate-400">Data Domain</th>
                <th className="text-left py-2 px-3 font-semibold text-gray-500 dark:text-slate-400">Coverage</th>
                <th className="text-left py-2 px-3 font-semibold text-gray-500 dark:text-slate-400">Refresh</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
              {[
                { provider: 'FRED (Federal Reserve)', domain: 'Macroeconomic', coverage: 'US monetary policy, treasury yields, M2', refresh: 'Daily / Weekly' },
                { provider: 'Binance', domain: 'Crypto OHLCV + Order Book', coverage: '500+ crypto pairs', refresh: 'Real-time' },
                { provider: 'Yahoo Finance', domain: 'Equities, Metals, Bonds', coverage: 'Global equities, ETFs, commodities', refresh: '15-min delayed' },
                { provider: 'DefiLlama', domain: 'DeFi TVL & Protocol Flows', coverage: '2000+ DeFi protocols', refresh: 'Hourly' },
                { provider: 'CoinGecko / CMC', domain: 'Tokenomics & Fundamentals', coverage: 'Market cap, supply metrics', refresh: '5-min' },
                { provider: 'Finnhub', domain: 'Economic Calendar', coverage: 'FOMC, CPI, NFP, GDP events', refresh: 'Event-driven' },
              ].map(row => (
                <tr key={row.provider}>
                  <td className="py-2 px-3 font-medium text-gray-900 dark:text-slate-200">{row.provider}</td>
                  <td className="py-2 px-3 text-gray-600 dark:text-slate-400">{row.domain}</td>
                  <td className="py-2 px-3 text-gray-600 dark:text-slate-400">{row.coverage}</td>
                  <td className="py-2 px-3">
                    <span className="px-1.5 py-0.5 text-[10px] bg-slate-100 dark:bg-slate-700 rounded font-medium text-gray-700 dark:text-slate-300">{row.refresh}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-3 bg-slate-50 dark:bg-slate-700/30 rounded-lg border border-slate-200 dark:border-slate-600">
          <h4 className="font-bold text-xs mb-1.5 flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-slate-500" />
            Data Integrity Protocol
          </h4>
          <ul className="text-[10px] text-gray-600 dark:text-slate-400 space-y-1">
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

      {/* ===== 6. Verified Performance ===== */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700">
        <h3 className="font-bold gradient-text-logo-animate mb-1 flex items-center gap-2">
          <BarChart3 className="w-4 h-4" />
          6. Verified Performance Metrics
        </h3>
        <p className="text-xs text-gray-600 dark:text-slate-400 mb-2">
          All metrics are derived from verified, outcome-tracked analyses. Outcomes are recorded only when a definitive TP or SL hit is confirmed &mdash; pending trades are excluded.
        </p>
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-500/10 rounded-lg border border-amber-200 dark:border-amber-500/20 text-[10px] text-amber-700 dark:text-amber-300 mb-3">
          <Shield className="w-3.5 h-3.5 flex-shrink-0" />
          <span>
            <strong>Survivorship bias notice:</strong> Metrics include all analyses, not just profitable ones.
            WAIT and AVOID verdicts are excluded as they do not generate trade plans.
          </span>
        </div>
      </div>
      <BacktestPerformance />

      {/* ===== 7. Platform Scope & Limitations ===== */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700">
        <h3 className="font-bold gradient-text-logo-animate mb-1 flex items-center gap-2">
          <Shield className="w-4 h-4" />
          7. Platform Scope &amp; Limitations
        </h3>
        <p className="text-xs text-gray-600 dark:text-slate-400 mb-3">What TraderPath is and what it is not</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg border border-emerald-200 dark:border-emerald-500/20">
            <h4 className="font-bold text-emerald-600 dark:text-emerald-400 text-xs mb-2 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              TraderPath IS:
            </h4>
            <ul className="space-y-1 text-[11px] text-emerald-800 dark:text-emerald-200/80">
              <li className="flex items-start gap-1.5"><span className="text-emerald-500 mt-0.5">&bull;</span> An analytical research and intelligence platform</li>
              <li className="flex items-start gap-1.5"><span className="text-emerald-500 mt-0.5">&bull;</span> A data processing engine for market analysis</li>
              <li className="flex items-start gap-1.5"><span className="text-emerald-500 mt-0.5">&bull;</span> An educational tool for understanding capital flows</li>
              <li className="flex items-start gap-1.5"><span className="text-emerald-500 mt-0.5">&bull;</span> A transparent system with verifiable performance metrics</li>
              <li className="flex items-start gap-1.5"><span className="text-emerald-500 mt-0.5">&bull;</span> A technology product, not a financial service</li>
            </ul>
          </div>
          <div className="p-3 bg-red-50 dark:bg-red-500/10 rounded-lg border border-red-200 dark:border-red-500/20">
            <h4 className="font-bold text-red-600 dark:text-red-400 text-xs mb-2 flex items-center gap-1.5">
              <TrendingDown className="w-3.5 h-3.5" />
              TraderPath is NOT:
            </h4>
            <ul className="space-y-1 text-[11px] text-red-800 dark:text-red-200/80">
              <li className="flex items-start gap-1.5"><span className="text-red-500 mt-0.5">&bull;</span> A broker-dealer or trading platform</li>
              <li className="flex items-start gap-1.5"><span className="text-red-500 mt-0.5">&bull;</span> A registered investment advisor (RIA)</li>
              <li className="flex items-start gap-1.5"><span className="text-red-500 mt-0.5">&bull;</span> A provider of personalized financial advice</li>
              <li className="flex items-start gap-1.5"><span className="text-red-500 mt-0.5">&bull;</span> A fund manager or asset custodian</li>
              <li className="flex items-start gap-1.5"><span className="text-red-500 mt-0.5">&bull;</span> A guarantee of future performance or returns</li>
            </ul>
          </div>
        </div>

        <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-500/20">
          <p className="text-[10px] text-red-700 dark:text-red-300">
            <strong>Regulatory notice:</strong> TraderPath does not execute trades, hold customer funds, or provide personalized investment recommendations. All analysis outputs are informational and educational in nature. Users are solely responsible for their own trading and investment decisions.
          </p>
        </div>
      </div>

      {/* ===== AI Recommendations ===== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700">
          <h3 className="font-bold gradient-text-logo-animate mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4" />
            AI Recommendations
          </h3>
          <div className="space-y-2">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg border border-emerald-200 dark:border-emerald-500/30">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> BUY
                </span>
                <span className="text-[10px] text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-500/20 px-1.5 py-0.5 rounded">EARLY/MID Phase</span>
              </div>
              <p className="text-[10px] text-emerald-700 dark:text-emerald-300/80">Capital entering + strong flow velocity</p>
            </div>
            <div className="p-2 bg-red-50 dark:bg-red-500/10 rounded-lg border border-red-200 dark:border-red-500/30">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-red-600 dark:text-red-400 text-sm flex items-center gap-1">
                  <TrendingDown className="w-3 h-3" /> SELL
                </span>
                <span className="text-[10px] text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-500/20 px-1.5 py-0.5 rounded">LATE/EXIT Phase</span>
              </div>
              <p className="text-[10px] text-red-700 dark:text-red-300/80">Capital exiting + slowing momentum</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700">
          <h3 className="font-bold gradient-text-logo-animate mb-3 flex items-center gap-2">
            <LineChart className="w-4 h-4" />
            Supported Markets
          </h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
              <Coins className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-medium text-gray-700 dark:text-slate-300">Crypto</span>
              <span className="text-[10px] text-gray-500 dark:text-slate-400 ml-auto">Binance</span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
              <LineChart className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-medium text-gray-700 dark:text-slate-300">Stocks</span>
              <span className="text-[10px] text-gray-500 dark:text-slate-400 ml-auto">Yahoo Finance</span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
              <Gem className="w-4 h-4 text-yellow-500" />
              <span className="text-xs font-medium text-gray-700 dark:text-slate-300">Metals</span>
              <span className="text-[10px] text-gray-500 dark:text-slate-400 ml-auto">Yahoo Finance</span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
              <DollarSign className="w-4 h-4 text-green-500" />
              <span className="text-xs font-medium text-gray-700 dark:text-slate-300">Bonds</span>
              <span className="text-[10px] text-gray-500 dark:text-slate-400 ml-auto">Yahoo Finance</span>
            </div>
          </div>
        </div>
      </div>

      {/* ===== CTA ===== */}
      <div className="bg-gradient-to-r from-teal-500 to-emerald-600 rounded-xl p-4 text-center">
        <h3 className="text-white font-bold text-lg mb-2">Start Following the Money</h3>
        <p className="text-teal-100 text-sm mb-3">Track global capital flows and find optimal entry points</p>
        <Link
          href="/analyze"
          className="inline-flex items-center gap-2 px-4 py-2 bg-white text-teal-600 font-bold rounded-lg hover:bg-teal-50 transition-colors"
        >
          <Globe className="w-4 h-4" />
          View Capital Flow
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* ===== Disclaimer ===== */}
      <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 border border-amber-200 dark:border-amber-700/30">
        <div className="flex gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-4 h-4 text-white" />
          </div>
          <div>
            <h4 className="font-bold text-amber-800 dark:text-amber-300 text-sm mb-1">Important Disclaimer</h4>
            <p className="text-xs text-amber-700 dark:text-amber-200/80">
              This analysis is for informational and educational purposes only and does not constitute financial, investment, or trading advice. All investments carry risk, including the potential loss of principal. Past performance does not guarantee future results. Conduct your own research and consult with a licensed financial advisor before making any investment decisions.{' '}
              <Link href="/disclaimer" className="underline font-medium hover:text-amber-900 dark:hover:text-amber-100">
                Read full Risk Disclosure Statement
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
