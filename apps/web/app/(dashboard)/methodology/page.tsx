'use client';

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
} from 'lucide-react';
import Link from 'next/link';

export default function MethodologyPage() {
  return (
    <div className="w-full px-4 md:px-8 lg:px-12 py-6 space-y-6">
      {/* ===== Header - Capital Flow Philosophy ===== */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border border-gray-200 dark:border-slate-700">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-teal-500/5 dark:from-teal-500/10 via-transparent to-transparent" />

        <div className="relative z-10 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-teal-500/30">
              <Globe className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold gradient-text-logo-animate">Capital Flow Methodology</h1>
              <p className="text-xs text-gray-500 dark:text-slate-400">&ldquo;Where money flows, potential exists&rdquo;</p>
            </div>
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
              Instead of picking random assets, we track global capital flows to identify where money is moving — then drill down to find the best opportunities.
            </p>
          </div>
        </div>
      </div>

      {/* ===== 4-Layer System ===== */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700">
        <h3 className="font-bold gradient-text-logo-animate mb-4 flex items-center gap-2">
          <Layers className="w-4 h-4" />
          4-Layer Capital Flow System
        </h3>

        {/* Layer Flow Visualization */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
          {/* Layer 1 */}
          <div className="relative p-3 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-500/10 dark:to-blue-500/20 rounded-xl border border-blue-200 dark:border-blue-500/30">
            <div className="absolute -top-2 -left-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">1</div>
            <div className="flex items-center gap-2 mb-2">
              <Landmark className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="font-semibold text-sm text-blue-900 dark:text-blue-300">Global Liquidity</span>
            </div>
            <ul className="text-[10px] text-blue-700 dark:text-blue-300/80 space-y-0.5">
              <li>Fed Balance Sheet</li>
              <li>M2 Money Supply</li>
              <li>DXY (Dollar Index)</li>
              <li>VIX (Fear Index)</li>
              <li>Yield Curve</li>
            </ul>
            <div className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 z-10">
              <ArrowRight className="w-5 h-5 text-slate-400" />
            </div>
          </div>

          {/* Layer 2 */}
          <div className="relative p-3 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-500/10 dark:to-purple-500/20 rounded-xl border border-purple-200 dark:border-purple-500/30">
            <div className="absolute -top-2 -left-2 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold">2</div>
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span className="font-semibold text-sm text-purple-900 dark:text-purple-300">Market Flow</span>
            </div>
            <div className="grid grid-cols-2 gap-1 text-[10px]">
              <div className="flex items-center gap-1 text-purple-700 dark:text-purple-300/80">
                <Coins className="w-3 h-3" /> Crypto
              </div>
              <div className="flex items-center gap-1 text-purple-700 dark:text-purple-300/80">
                <LineChart className="w-3 h-3" /> Stocks
              </div>
              <div className="flex items-center gap-1 text-purple-700 dark:text-purple-300/80">
                <DollarSign className="w-3 h-3" /> Bonds
              </div>
              <div className="flex items-center gap-1 text-purple-700 dark:text-purple-300/80">
                <Gem className="w-3 h-3" /> Metals
              </div>
            </div>
            <div className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 z-10">
              <ArrowRight className="w-5 h-5 text-slate-400" />
            </div>
          </div>

          {/* Layer 3 */}
          <div className="relative p-3 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-500/10 dark:to-amber-500/20 rounded-xl border border-amber-200 dark:border-amber-500/30">
            <div className="absolute -top-2 -left-2 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center text-white text-xs font-bold">3</div>
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span className="font-semibold text-sm text-amber-900 dark:text-amber-300">Sector Activity</span>
            </div>
            <ul className="text-[10px] text-amber-700 dark:text-amber-300/80 space-y-0.5">
              <li>DeFi TVL Flows</li>
              <li>Layer 2 Activity</li>
              <li>NFT/Gaming Volume</li>
              <li>AI Token Movement</li>
            </ul>
            <div className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 z-10">
              <ArrowRight className="w-5 h-5 text-slate-400" />
            </div>
          </div>

          {/* Layer 4 */}
          <div className="relative p-3 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-500/10 dark:to-emerald-500/20 rounded-xl border border-emerald-200 dark:border-emerald-500/30">
            <div className="absolute -top-2 -left-2 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-white text-xs font-bold">4</div>
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="font-semibold text-sm text-emerald-900 dark:text-emerald-300">Asset Analysis</span>
            </div>
            <ul className="text-[10px] text-emerald-700 dark:text-emerald-300/80 space-y-0.5">
              <li>7-Step Analysis (40+ indicators)</li>
              <li>MLIS Pro AI Confirmation</li>
              <li>AI Expert Panel</li>
              <li>Trade Plan Generation</li>
            </ul>
          </div>
        </div>

        <p className="text-xs text-center text-gray-500 dark:text-slate-400 italic">
          Global Liquidity → Market Selection → Sector Focus → Asset Analysis
        </p>
      </div>

      {/* ===== Phase Detection ===== */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700">
        <h3 className="font-bold gradient-text-logo-animate mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Phase Detection System
        </h3>
        <p className="text-xs text-gray-600 dark:text-slate-400 mb-3">
          We track how long capital has been flowing into each market to identify the optimal entry timing.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {/* Early Phase */}
          <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg border border-emerald-200 dark:border-emerald-500/30">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-bold text-emerald-700 dark:text-emerald-400 text-sm">EARLY</span>
            </div>
            <p className="text-[10px] text-emerald-600 dark:text-emerald-300/80">0-30 days</p>
            <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium mt-1">Best Entry Point</p>
          </div>

          {/* Mid Phase */}
          <div className="p-3 bg-yellow-50 dark:bg-yellow-500/10 rounded-lg border border-yellow-200 dark:border-yellow-500/30">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-yellow-500" />
              <span className="font-bold text-yellow-700 dark:text-yellow-400 text-sm">MID</span>
            </div>
            <p className="text-[10px] text-yellow-600 dark:text-yellow-300/80">30-60 days</p>
            <p className="text-[10px] text-yellow-700 dark:text-yellow-400 font-medium mt-1">Careful Entry</p>
          </div>

          {/* Late Phase */}
          <div className="p-3 bg-orange-50 dark:bg-orange-500/10 rounded-lg border border-orange-200 dark:border-orange-500/30">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-orange-500" />
              <span className="font-bold text-orange-700 dark:text-orange-400 text-sm">LATE</span>
            </div>
            <p className="text-[10px] text-orange-600 dark:text-orange-300/80">60-90 days</p>
            <p className="text-[10px] text-orange-700 dark:text-orange-400 font-medium mt-1">No New Entry</p>
          </div>

          {/* Exit Phase */}
          <div className="p-3 bg-red-50 dark:bg-red-500/10 rounded-lg border border-red-200 dark:border-red-500/30">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="font-bold text-red-700 dark:text-red-400 text-sm">EXIT</span>
            </div>
            <p className="text-[10px] text-red-600 dark:text-red-300/80">90+ days / reversal</p>
            <p className="text-[10px] text-red-700 dark:text-red-400 font-medium mt-1">Money Leaving</p>
          </div>
        </div>
      </div>

      {/* ===== Rotation & Recommendations ===== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Rotation Detection */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700">
          <h3 className="font-bold gradient-text-logo-animate mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Rotation Detection
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg">
              <div className="flex items-center gap-2">
                <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Entering</span>
              </div>
              <span className="text-xs text-emerald-600 dark:text-emerald-300">Capital flowing in</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-500/10 rounded-lg">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium text-blue-700 dark:text-blue-400">Stable</span>
              </div>
              <span className="text-xs text-blue-600 dark:text-blue-300">Capital holding steady</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-500/10 rounded-lg">
              <div className="flex items-center gap-2">
                <ArrowDownRight className="w-4 h-4 text-red-500" />
                <span className="text-sm font-medium text-red-700 dark:text-red-400">Exiting</span>
              </div>
              <span className="text-xs text-red-600 dark:text-red-300">Capital flowing out</span>
            </div>
          </div>
        </div>

        {/* AI Recommendations */}
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
      </div>

      {/* ===== Data Sources ===== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Macro Data */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
              <Landmark className="w-4 h-4 text-white" />
            </div>
            <h3 className="font-bold gradient-text-logo-animate">Macro Data</h3>
          </div>
          <ul className="text-xs text-gray-600 dark:text-slate-300 space-y-1.5">
            <li className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />
              FRED API (Fed Data)
            </li>
            <li className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />
              Yahoo Finance (DXY, VIX)
            </li>
            <li className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />
              Treasury Yields
            </li>
          </ul>
        </div>

        {/* Market Data */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">
              <Database className="w-4 h-4 text-white" />
            </div>
            <h3 className="font-bold gradient-text-logo-animate">Market Data</h3>
          </div>
          <ul className="text-xs text-gray-600 dark:text-slate-300 space-y-1.5">
            <li className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />
              Binance (Crypto)
            </li>
            <li className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />
              Yahoo Finance (Stocks/Metals)
            </li>
            <li className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />
              DefiLlama (DeFi TVL)
            </li>
          </ul>
        </div>

        {/* AI Analysis */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <h3 className="font-bold gradient-text-logo-animate">AI Experts</h3>
          </div>
          <ul className="text-xs text-gray-600 dark:text-slate-300 space-y-1.5">
            <li className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />
              <span><strong className="text-blue-500">ARIA</strong> - Technical</span>
            </li>
            <li className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />
              <span><strong className="text-amber-500">NEXUS</strong> - Risk</span>
            </li>
            <li className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />
              <span><strong className="text-purple-500">ORACLE</strong> - On-Chain</span>
            </li>
            <li className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />
              <span><strong className="text-red-500">SENTINEL</strong> - Security</span>
            </li>
          </ul>
        </div>
      </div>

      {/* ===== Analysis Methods ===== */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700">
        <h3 className="font-bold gradient-text-logo-animate mb-3 flex items-center gap-2">
          <Brain className="w-4 h-4" />
          Asset Analysis Methods (Layer 4)
        </h3>
        <div className="space-y-3">
          {/* 7-Step Analysis - Main Method */}
          <div className="p-3 bg-teal-50 dark:bg-teal-500/10 rounded-lg border border-teal-200 dark:border-teal-500/30">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-teal-700 dark:text-teal-400 text-sm">7-Step Analysis</span>
              <span className="text-[10px] bg-teal-100 dark:bg-teal-500/20 text-teal-600 dark:text-teal-300 px-1.5 py-0.5 rounded">40+ Indicators</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {['Market Pulse', 'Asset Scanner', 'Safety Check', 'Timing', 'Trade Plan', 'Trap Check', 'Verdict'].map((step, i) => (
                <span key={step} className="text-[9px] bg-teal-100 dark:bg-teal-500/20 text-teal-700 dark:text-teal-300 px-1.5 py-0.5 rounded">
                  {i + 1}. {step}
                </span>
              ))}
            </div>
          </div>

          {/* MLIS Pro Confirmation - Step 8 */}
          <div className="p-3 bg-gradient-to-r from-violet-50 to-teal-50 dark:from-violet-500/10 dark:to-teal-500/10 rounded-lg border border-violet-200 dark:border-violet-500/30">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-violet-700 dark:text-violet-400 text-sm">MLIS Pro Confirmation</span>
                <span className="text-[10px] bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-300 px-1.5 py-0.5 rounded">Step 8</span>
              </div>
              <span className="text-[10px] bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 px-1.5 py-0.5 rounded">AI Validation</span>
            </div>
            <p className="text-[10px] text-slate-600 dark:text-slate-400 mb-2">
              Neural network validates 7-Step findings with 5 independent layers:
            </p>
            <div className="flex flex-wrap gap-1">
              {['Technical', 'Momentum', 'Volatility', 'Volume', 'Verdict'].map((layer, i) => (
                <span key={layer} className="text-[9px] bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 px-1.5 py-0.5 rounded">
                  L{i + 1}. {layer}
                </span>
              ))}
            </div>
            <p className="text-[9px] text-slate-500 dark:text-slate-500 mt-2 italic">
              Confirms, partially confirms, or contradicts the 7-Step verdict
            </p>
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
              This analysis is for informational and educational purposes only and does not constitute financial, investment, or trading advice. All investments carry risk, including the potential loss of principal. Past performance does not guarantee future results. Conduct your own research and consult with a licensed financial advisor before making any investment decisions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
