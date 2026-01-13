'use client';

// ===========================================
// Trade Plan Component with Chart Integration
// Enhanced with AI level explanations
// ===========================================

import { FileText, Target, TrendingUp, TrendingDown, Brain, ChevronDown, ChevronUp, Lightbulb, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { TradePlanChart } from './TradePlanChart';
import { useState } from 'react';

interface Entry {
  price: number;
  percentage: number;
  type: string;
}

interface TakeProfit {
  price: number;
  percentage: number;
  riskReward: number;
  reason?: string;
}

interface TradePlanData {
  symbol: string;
  direction: 'long' | 'short';
  type: string;
  averageEntry: number;
  entries: Entry[];
  stopLoss: {
    price: number;
    percentage: number;
    reason: string;
  };
  takeProfits: TakeProfit[];
  riskReward: number;
  winRateEstimate: number;
  positionSizePercent: number;
  riskAmount: number;
  aiInsight?: string;
  currentPrice?: number;
  support?: number[];
  resistance?: number[];
}

interface TradePlanProps {
  data?: TradePlanData;
  symbol: string;
}

// Generate AI explanation for why these levels were chosen
function generateLevelExplanation(data: TradePlanData): string {
  const isLong = data.direction === 'long';
  const entryCount = data.entries?.length || 1;
  const tpCount = data.takeProfits?.length || 0;

  let explanation = '';

  // Entry explanation
  explanation += `📍 ENTRY LEVELS: `;
  if (entryCount > 1) {
    explanation += `${entryCount} staged entry (DCA) strategy planned. `;
    explanation += isLong
      ? `As price drops, you can optimize your average cost by buying at lower prices.`
      : `As price rises, you can improve your average entry by opening shorts at higher prices.`;
  } else {
    explanation += `Single point entry recommended. Current price offers a technically suitable entry point.`;
  }

  // Stop loss explanation
  explanation += `\n\n🛑 STOP LOSS LEVEL: `;
  if (data.stopLoss?.reason) {
    explanation += data.stopLoss.reason;
  } else {
    explanation += isLong
      ? `Placed below significant support level. If this level breaks, trend structure is considered damaged and position should be exited.`
      : `Placed above significant resistance level. If this level breaks, downtrend becomes invalid.`;
  }

  // Take profit explanation
  if (tpCount > 0) {
    explanation += `\n\n🎯 TAKE PROFIT TARGETS: ${tpCount} targets set. `;
    if (tpCount >= 2) {
      explanation += `Staged exit strategy: Realize profit by closing part of position at first target, move stop loss to breakeven, and wait for higher targets with remaining position.`;
    } else {
      explanation += `Target level determined based on previous swing point or Fibonacci extension.`;
    }
  }

  // Risk/Reward analysis
  if (data.riskReward > 0) {
    explanation += `\n\n📊 RISK/REWARD ANALYSIS: ${data.riskReward.toFixed(1)}:1 ratio is `;
    if (data.riskReward >= 3) {
      explanation += `excellent - ${data.riskReward.toFixed(1)} units potential gain for every 1 unit of risk. This is a high quality setup.`;
    } else if (data.riskReward >= 2) {
      explanation += `very good - the ratio preferred by professional traders.`;
    } else if (data.riskReward >= 1.5) {
      explanation += `acceptable - disciplined risk management is essential.`;
    } else {
      explanation += `low - should only be considered for very high probability setups.`;
    }
  }

  return explanation;
}

export function TradePlan({ data, symbol }: TradePlanProps) {
  const [showDetails, setShowDetails] = useState(true);

  if (!data) {
    return (
      <div className="p-4">
        <h3 className="flex items-center gap-2 text-lg font-semibold mb-4">
          <FileText className="w-5 h-5 text-indigo-500" />
          Trade Plan - {symbol}
        </h3>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const isLong = data.direction === 'long';
  const averageEntry = data.averageEntry || 0;
  const stopLossPrice = data.stopLoss?.price || 0;
  const riskPercent = data.stopLoss?.percentage ||
    (averageEntry > 0 && stopLossPrice > 0
      ? Math.abs((averageEntry - stopLossPrice) / averageEntry * 100)
      : 0);

  const chartEntries = data.entries?.filter(e => e != null).map(e => ({
    price: e.price || 0,
    percentage: e.percentage || 0,
  })) || [{ price: averageEntry, percentage: 100 }];

  const chartTakeProfits = data.takeProfits?.filter(tp => tp != null).map(tp => ({
    price: tp.price || 0,
    percentage: tp.percentage || 0,
    riskReward: tp.riskReward || 0,
  })) || [];

  const levelExplanation = generateLevelExplanation(data);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-xl font-bold">
          <FileText className="w-6 h-6 text-indigo-500" />
          Trade Plan - {symbol}/USDT
        </h3>
        <div className={cn(
          "px-4 py-2 rounded-lg font-bold text-lg",
          isLong ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
        )}>
          {isLong ? '📈 LONG' : '📉 SHORT'}
        </div>
      </div>

      {/* Direction & Key Stats */}
      <div className={cn(
        "p-5 rounded-xl border-2",
        isLong ? 'bg-green-500/5 border-green-500/30' : 'bg-red-500/5 border-red-500/30'
      )}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            {isLong ? (
              <TrendingUp className="w-10 h-10 text-green-500" />
            ) : (
              <TrendingDown className="w-10 h-10 text-red-500" />
            )}
            <div>
              <span className={cn("font-bold text-3xl uppercase", isLong ? 'text-green-500' : 'text-red-500')}>
                {data.direction}
              </span>
              <p className="text-sm text-muted-foreground">{data.type || 'Swing Trade'}</p>
            </div>
          </div>
          <div className="flex gap-8">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Risk/Reward</p>
              <p className="font-bold text-2xl">{(data.riskReward ?? 0).toFixed(1)}:1</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Win Rate %</p>
              <p className="font-bold text-2xl text-blue-500">{data.winRateEstimate ?? 0}%</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Position</p>
              <p className="font-bold text-2xl">{data.positionSizePercent ?? 0}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Trade Plan Chart - PROMINENT */}
      <div className="border-2 border-indigo-500/30 rounded-xl overflow-hidden">
        <div className="bg-indigo-500/10 px-4 py-3 border-b border-indigo-500/20">
          <h4 className="font-semibold flex items-center gap-2">
            <Target className="w-5 h-5 text-indigo-500" />
            📊 Visual Trade Plan
          </h4>
          <p className="text-xs text-muted-foreground mt-1">
            Entry (blue), Stop Loss (red) and Take Profit (green) levels are shown on the chart
          </p>
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
            🔔 Price alerts are automatically set for all levels
          </p>
        </div>
        <TradePlanChart
          symbol={symbol}
          direction={data.direction || 'long'}
          entries={chartEntries}
          stopLoss={{ price: stopLossPrice, percentage: riskPercent }}
          takeProfits={chartTakeProfits}
          currentPrice={data.currentPrice || averageEntry}
          support={data.support}
          resistance={data.resistance}
        />
      </div>

      {/* AI Level Explanation - KEY FEATURE */}
      <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 rounded-xl p-6 border border-indigo-500/20">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
            <Lightbulb className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-lg mb-3 text-indigo-400">
              🤖 AI Explanation: Why Were These Levels Selected?
            </h4>
            <div className="text-sm leading-relaxed whitespace-pre-line">
              {levelExplanation}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-cyan-500/10 rounded-xl p-4 border border-cyan-500/20">
          <p className="text-sm text-cyan-500 font-medium">Avg. Entry</p>
          <p className="text-2xl font-bold">${averageEntry.toLocaleString()}</p>
        </div>
        <div className="bg-red-500/10 rounded-xl p-4 border border-red-500/20">
          <p className="text-sm text-red-500 font-medium">Stop Loss</p>
          <p className="text-2xl font-bold">${stopLossPrice.toLocaleString()}</p>
          <p className="text-xs text-red-400">-{riskPercent.toFixed(2)}%</p>
        </div>
        <div className="bg-green-500/10 rounded-xl p-4 border border-green-500/20">
          <p className="text-sm text-green-500 font-medium">First Target</p>
          <p className="text-2xl font-bold">${data.takeProfits?.[0]?.price?.toLocaleString() || '-'}</p>
          <p className="text-xs text-green-400">{(data.takeProfits?.[0]?.riskReward ?? 0).toFixed(1)}R</p>
        </div>
        <div className="bg-background rounded-xl p-4 border">
          <p className="text-sm text-muted-foreground font-medium">Risk</p>
          <p className="text-2xl font-bold">${data.riskAmount?.toLocaleString() || '-'}</p>
          <p className="text-xs text-muted-foreground">{data.positionSizePercent ?? 0}% portfolio</p>
        </div>
      </div>

      {/* Detailed Levels - Expandable */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="w-full flex items-center justify-between p-4 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors"
      >
        <span className="font-semibold">📋 Detailed Entry & Exit Levels</span>
        {showDetails ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
      </button>

      {showDetails && (
        <div className="space-y-4 animate-in slide-in-from-top-2">
          {/* Entry Levels */}
          {data.entries && data.entries.length > 0 && (
            <div className="bg-cyan-500/5 rounded-xl p-4 border border-cyan-500/20">
              <p className="text-sm font-semibold mb-3 text-cyan-500">Entry Levels (DCA)</p>
              <div className="space-y-2">
                {data.entries.filter(e => e != null).map((entry, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-cyan-500/10 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-sm font-bold text-cyan-500">
                        {i + 1}
                      </span>
                      <span className="text-sm text-muted-foreground">{entry.type || `Entry ${i + 1}`}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-cyan-500 text-lg">${(entry.price ?? 0).toLocaleString()}</span>
                      <span className="text-sm text-muted-foreground ml-2">(%{entry.percentage ?? 0})</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Take Profit Levels */}
          {data.takeProfits && data.takeProfits.length > 0 && (
            <div className="bg-green-500/5 rounded-xl p-4 border border-green-500/20">
              <p className="text-sm font-semibold mb-3 text-green-500">Take Profit Targets</p>
              <div className="space-y-2">
                {data.takeProfits.filter(tp => tp != null).map((tp, i) => {
                  const tpPrice = tp.price ?? 0;
                  const profitPercent = tp.percentage || (averageEntry > 0 ? ((tpPrice - averageEntry) / averageEntry * 100) : 0);
                  return (
                    <div key={i} className="flex items-center justify-between p-3 bg-green-500/10 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Target className="w-5 h-5 text-green-500" />
                        <span className="font-medium">TP{i + 1}</span>
                        <span className="text-xs px-2 py-1 bg-green-500/20 rounded-full text-green-500">
                          {(tp.riskReward ?? 0).toFixed(1)}R
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-green-500 text-lg">${tpPrice.toLocaleString()}</span>
                        <span className="text-sm text-green-400 ml-2">+{Math.abs(profitPercent).toFixed(2)}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Stop Loss Details */}
          <div className="bg-red-500/5 rounded-xl p-4 border border-red-500/20">
            <p className="text-sm font-semibold mb-3 text-red-500 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Stop Loss Details
            </p>
            <div className="p-3 bg-red-500/10 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="font-bold text-red-500 text-lg">${stopLossPrice.toLocaleString()}</span>
                <span className="text-red-400">-{riskPercent.toFixed(2)}%</span>
              </div>
            </div>
            {data.stopLoss?.reason && (
              <p className="text-sm text-muted-foreground mt-3 p-3 bg-background rounded-lg">
                <strong>Why this level:</strong> {data.stopLoss.reason}
              </p>
            )}
          </div>
        </div>
      )}

      {/* AI Insight from API */}
      {data.aiInsight && (
        <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl p-5 border border-blue-500/20">
          <div className="flex items-start gap-4">
            <Brain className="w-6 h-6 text-purple-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-purple-500 mb-2">🧠 AI Trade Analysis</p>
              <p className="text-sm leading-relaxed">{data.aiInsight}</p>
            </div>
          </div>
        </div>
      )}

      {/* Risk Warning */}
      <div className="bg-yellow-500/10 rounded-xl p-4 border border-yellow-500/20">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            <strong className="text-yellow-500">Risk Warning:</strong> This analysis was prepared with Gemini 2.5 Flash and is not investment advice. Cryptocurrency markets carry high risk. Do not invest more than you can afford to lose.
          </p>
        </div>
      </div>
    </div>
  );
}
