'use client';

import {
  Database,
  LineChart,
  Brain,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Sparkles,
  Bot,
  TrendingUp,
  Clock
} from 'lucide-react';
import Link from 'next/link';

export default function MethodologyPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-8 md:p-12">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent" />
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }} />

          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Lock className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-white">Data Sources & Methodology</h1>
                <p className="text-white/80 mt-1">The reliable infrastructure behind our analyses</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Data Sources */}
          <div className="group bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-500/50 transition-all hover:shadow-xl">
            <div className="relative mb-4">
              <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <Database className="w-6 h-6 text-white" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Data Sources</h3>
            <ul className="text-sm text-gray-600 dark:text-slate-300 space-y-2.5">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                Binance Exchange API
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                CoinGecko Market Data
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                Fear & Greed Index
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                On-chain Analytics
              </li>
            </ul>
          </div>

          {/* Technical Indicators - 40+ */}
          <div className="group bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-500/50 transition-all hover:shadow-xl">
            <div className="relative mb-4">
              <div className="absolute inset-0 bg-purple-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                <LineChart className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Technical Indicators</h3>
              <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 text-xs font-bold rounded-full">40+</span>
            </div>
            <ul className="text-sm text-gray-600 dark:text-slate-300 space-y-2.5">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                RSI, MACD, Bollinger Bands
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                EMA (8, 21, 50, 200)
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                Volume Profile & OBV
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                ATR, Stochastic, ADX
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                Ichimoku, Pivot Points
              </li>
            </ul>
          </div>

          {/* AI Experts */}
          <div className="group bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-500/50 transition-all hover:shadow-xl">
            <div className="relative mb-4">
              <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <Bot className="w-6 h-6 text-white" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">AI Experts</h3>
            <ul className="text-sm text-gray-600 dark:text-slate-300 space-y-2.5">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span><strong className="text-pink-500">ARIA</strong> - Technical Analysis</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span><strong className="text-amber-500">NEXUS</strong> - Risk Management</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span><strong className="text-cyan-500">ORACLE</strong> - On-Chain Intelligence</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span><strong className="text-red-500">SENTINEL</strong> - Security & Safety</span>
              </li>
            </ul>
            <Link href="/ai-expert" className="mt-4 inline-flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400 hover:underline">
              <Sparkles className="w-4 h-4" />
              Try AI Experts
            </Link>
          </div>

          {/* TFT Model - Coming Soon */}
          <div className="group bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-500/50 transition-all hover:shadow-xl relative overflow-hidden">
            <div className="absolute top-3 right-3">
              <span className="px-2.5 py-1 bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-bold rounded-full flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Coming Soon
              </span>
            </div>
            <div className="relative mb-4">
              <div className="absolute inset-0 bg-amber-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">TFT Model</h3>
            <p className="text-sm text-gray-600 dark:text-slate-300 mb-3">
              Temporal Fusion Transformer - Advanced deep learning model for time series forecasting.
            </p>
            <ul className="text-sm text-gray-600 dark:text-slate-300 space-y-2.5">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
                Multi-horizon forecasting
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
                Variable importance analysis
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
                Attention-based predictions
              </li>
            </ul>
          </div>
        </div>

        {/* Security & Analysis */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Security Features */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center shadow-lg shadow-red-500/30">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Security & Safety</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-xl">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Manipulation Detection</h4>
                <p className="text-sm text-gray-600 dark:text-slate-300">Identify pump & dump schemes, wash trading, and artificial volume.</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-xl">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Whale Tracking</h4>
                <p className="text-sm text-gray-600 dark:text-slate-300">Monitor large wallet movements and smart money flow.</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-xl">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Trap Identification</h4>
                <p className="text-sm text-gray-600 dark:text-slate-300">Detect bull traps, bear traps, and fakeout patterns.</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-xl">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Liquidity Analysis</h4>
                <p className="text-sm text-gray-600 dark:text-slate-300">Find liquidity grab zones and stop-hunt areas.</p>
              </div>
            </div>
          </div>

          {/* AI Analysis */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">AI-Powered Analysis</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-xl">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Gemini AI Integration</h4>
                <p className="text-sm text-gray-600 dark:text-slate-300">Advanced language model for market interpretation.</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-xl">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Pattern Recognition</h4>
                <p className="text-sm text-gray-600 dark:text-slate-300">Automated chart pattern detection and analysis.</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-xl">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Sentiment Analysis</h4>
                <p className="text-sm text-gray-600 dark:text-slate-300">Market mood and fear/greed assessment.</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-xl">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Risk Assessment</h4>
                <p className="text-sm text-gray-600 dark:text-slate-300">Comprehensive risk scoring and position sizing.</p>
              </div>
            </div>
          </div>
        </div>

        {/* 7-Step Methodology */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 md:p-8 border border-gray-200 dark:border-slate-700">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">7-Step Analysis Methodology</h3>
          <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
            {[
              { step: 1, name: 'Market Pulse', desc: 'BTC dominance, fear/greed index, market regime', color: 'blue' },
              { step: 2, name: 'Asset Scanner', desc: 'Multi-timeframe trend analysis with 40+ indicators', color: 'purple' },
              { step: 3, name: 'Safety Check', desc: 'Risk level, manipulation detection, whale activity', color: 'red' },
              { step: 4, name: 'Timing', desc: 'Optimal entry zones and trade timing', color: 'green' },
              { step: 5, name: 'Trade Plan', desc: 'Entry, stop-loss, take-profit levels', color: 'cyan' },
              { step: 6, name: 'Trap Check', desc: 'Bull/bear trap and fakeout detection', color: 'amber' },
              { step: 7, name: 'Final Verdict', desc: 'GO, WAIT, or AVOID with confidence score', color: 'emerald' },
            ].map((item) => (
              <div key={item.step} className={`p-4 rounded-xl bg-${item.color}-50 dark:bg-${item.color}-500/10 border border-${item.color}-200 dark:border-${item.color}-500/30`}>
                <div className={`w-8 h-8 rounded-full bg-${item.color}-500 text-white flex items-center justify-center font-bold mb-2`}>
                  {item.step}
                </div>
                <h4 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">{item.name}</h4>
                <p className="text-xs text-gray-600 dark:text-slate-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Disclaimer */}
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-6 border border-amber-200 dark:border-amber-700/30">
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
            </div>
            <div>
              <h4 className="font-bold text-amber-800 dark:text-amber-300 mb-2 text-lg">Risk Disclaimer</h4>
              <p className="text-amber-700 dark:text-amber-200/80 leading-relaxed">
                TradePath does not provide investment advice. All analyses are for educational purposes only.
                Cryptocurrency markets are high-risk, and investment decisions are entirely your responsibility.
                Past performance is not a guarantee of future results. Always do your own research (DYOR) before making any investment decisions.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
