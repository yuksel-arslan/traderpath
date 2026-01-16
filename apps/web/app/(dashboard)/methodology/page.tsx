'use client';

import {
  Database,
  LineChart,
  Brain,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Bot,
  TrendingUp,
  Clock
} from 'lucide-react';
import Link from 'next/link';

export default function MethodologyPage() {
  return (
    <div className="w-full px-4 md:px-8 lg:px-12 py-6 space-y-6">
      {/* ===== Compact Header ===== */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border border-gray-200 dark:border-slate-700">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/5 dark:from-indigo-500/10 via-transparent to-transparent" />

        <div className="relative z-10 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-400 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Lock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Data Sources & Methodology</h1>
              <p className="text-xs text-gray-500 dark:text-slate-400">The reliable infrastructure behind our analyses</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Data Sources */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
              <Database className="w-4 h-4 text-white" />
            </div>
            <h3 className="font-bold text-gray-900 dark:text-white">Data Sources</h3>
          </div>
          <ul className="text-xs text-gray-600 dark:text-slate-300 space-y-1.5">
            <li className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />
              Binance Exchange API
            </li>
            <li className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />
              CoinGecko Market Data
            </li>
            <li className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />
              Fear & Greed Index
            </li>
            <li className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />
              On-chain Analytics
            </li>
          </ul>
        </div>

        {/* Technical Indicators - 40+ */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">
              <LineChart className="w-4 h-4 text-white" />
            </div>
            <h3 className="font-bold text-gray-900 dark:text-white">Indicators</h3>
            <span className="px-1.5 py-0.5 bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 text-[10px] font-bold rounded">40+</span>
          </div>
          <ul className="text-xs text-gray-600 dark:text-slate-300 space-y-1.5">
            <li className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />
              RSI, MACD, Bollinger
            </li>
            <li className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />
              EMA (8, 21, 50, 200)
            </li>
            <li className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />
              Volume Profile & OBV
            </li>
            <li className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />
              ATR, Stochastic, ADX
            </li>
          </ul>
        </div>

        {/* AI Experts */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <h3 className="font-bold text-gray-900 dark:text-white">AI Experts</h3>
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

        {/* TFT Model - Coming Soon */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700 relative">
          <div className="absolute top-2 right-2">
            <span className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-bold rounded flex items-center gap-0.5">
              <Clock className="w-2.5 h-2.5" />
              Soon
            </span>
          </div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <h3 className="font-bold text-gray-900 dark:text-white">TFT Model</h3>
          </div>
          <ul className="text-xs text-gray-600 dark:text-slate-300 space-y-1.5">
            <li className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3 h-3 text-gray-400 flex-shrink-0" />
              Multi-horizon forecasting
            </li>
            <li className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3 h-3 text-gray-400 flex-shrink-0" />
              Variable importance
            </li>
            <li className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3 h-3 text-gray-400 flex-shrink-0" />
              Attention-based AI
            </li>
          </ul>
        </div>
      </div>

      {/* Security & Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Security Features */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <h3 className="font-bold text-gray-900 dark:text-white">Security & Safety</h3>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
              <h4 className="font-semibold text-gray-900 dark:text-white text-xs mb-1">Manipulation Detection</h4>
              <p className="text-[10px] text-gray-600 dark:text-slate-400">Pump & dump, wash trading detection</p>
            </div>
            <div className="p-2.5 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
              <h4 className="font-semibold text-gray-900 dark:text-white text-xs mb-1">Whale Tracking</h4>
              <p className="text-[10px] text-gray-600 dark:text-slate-400">Large wallet movements & smart money</p>
            </div>
            <div className="p-2.5 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
              <h4 className="font-semibold text-gray-900 dark:text-white text-xs mb-1">Trap Identification</h4>
              <p className="text-[10px] text-gray-600 dark:text-slate-400">Bull/bear traps & fakeout patterns</p>
            </div>
            <div className="p-2.5 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
              <h4 className="font-semibold text-gray-900 dark:text-white text-xs mb-1">Liquidity Analysis</h4>
              <p className="text-[10px] text-gray-600 dark:text-slate-400">Liquidity grab zones & stop-hunts</p>
            </div>
          </div>
        </div>

        {/* AI Analysis */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <h3 className="font-bold text-gray-900 dark:text-white">AI-Powered Analysis</h3>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
              <h4 className="font-semibold text-gray-900 dark:text-white text-xs mb-1">Gemini AI Integration</h4>
              <p className="text-[10px] text-gray-600 dark:text-slate-400">Advanced market interpretation</p>
            </div>
            <div className="p-2.5 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
              <h4 className="font-semibold text-gray-900 dark:text-white text-xs mb-1">Pattern Recognition</h4>
              <p className="text-[10px] text-gray-600 dark:text-slate-400">Automated chart pattern detection</p>
            </div>
            <div className="p-2.5 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
              <h4 className="font-semibold text-gray-900 dark:text-white text-xs mb-1">Sentiment Analysis</h4>
              <p className="text-[10px] text-gray-600 dark:text-slate-400">Market mood assessment</p>
            </div>
            <div className="p-2.5 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
              <h4 className="font-semibold text-gray-900 dark:text-white text-xs mb-1">Risk Assessment</h4>
              <p className="text-[10px] text-gray-600 dark:text-slate-400">Risk scoring & position sizing</p>
            </div>
          </div>
        </div>
      </div>

      {/* 7-Step Methodology */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700">
        <h3 className="font-bold text-gray-900 dark:text-white mb-3">7-Step Analysis Methodology</h3>
        <div className="grid grid-cols-7 gap-2">
          {[
            { step: 1, name: 'Market Pulse', color: 'blue' },
            { step: 2, name: 'Asset Scanner', color: 'purple' },
            { step: 3, name: 'Safety Check', color: 'red' },
            { step: 4, name: 'Timing', color: 'green' },
            { step: 5, name: 'Trade Plan', color: 'cyan' },
            { step: 6, name: 'Trap Check', color: 'amber' },
            { step: 7, name: 'Final Verdict', color: 'emerald' },
          ].map((item) => (
            <div key={item.step} className="text-center p-2 rounded-lg bg-gray-50 dark:bg-slate-700/50">
              <div className={`w-6 h-6 mx-auto rounded-full bg-${item.color}-500 text-white flex items-center justify-center font-bold text-xs mb-1`}>
                {item.step}
              </div>
              <span className="text-[10px] text-gray-900 dark:text-white font-medium leading-tight block">{item.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 border border-amber-200 dark:border-amber-700/30">
        <div className="flex gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-4 h-4 text-white" />
          </div>
          <div>
            <h4 className="font-bold text-amber-800 dark:text-amber-300 text-sm mb-1">Risk Disclaimer</h4>
            <p className="text-xs text-amber-700 dark:text-amber-200/80">
              TradePath does not provide investment advice. All analyses are for educational purposes only. Cryptocurrency markets are high-risk. Always DYOR.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
