'use client';

// ===========================================
// Trade Plan Component with Chart Integration
// ===========================================

import { FileText, Target, TrendingUp, TrendingDown, Brain, ChevronDown, ChevronUp } from 'lucide-react';
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
  // For chart
  currentPrice?: number;
  support?: number[];
  resistance?: number[];
}

interface TradePlanProps {
  data?: TradePlanData;
  symbol: string;
}

export function TradePlan({ data, symbol }: TradePlanProps) {
  const [showDetails, setShowDetails] = useState(false);

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
  const riskPercent = data.stopLoss?.percentage ||
    Math.abs((data.averageEntry - data.stopLoss.price) / data.averageEntry * 100);

  // Prepare data for chart
  const chartEntries = data.entries?.map(e => ({
    price: e.price,
    percentage: e.percentage,
  })) || [{ price: data.averageEntry, percentage: 100 }];

  const chartTakeProfits = data.takeProfits?.map(tp => ({
    price: tp.price,
    percentage: tp.percentage,
    riskReward: tp.riskReward,
  })) || [];

  return (
    <div className="space-y-6">
      <h3 className="flex items-center gap-2 text-lg font-semibold">
        <FileText className="w-5 h-5 text-indigo-500" />
        Trade Plan - {symbol}
      </h3>

      {/* Trade Plan Chart */}
      <TradePlanChart
        symbol={symbol}
        direction={data.direction}
        entries={chartEntries}
        stopLoss={{
          price: data.stopLoss.price,
          percentage: riskPercent,
        }}
        takeProfits={chartTakeProfits}
        currentPrice={data.currentPrice || data.averageEntry}
        support={data.support}
        resistance={data.resistance}
      />

      {/* Direction & Key Stats Card */}
      <div className={cn(
        "p-4 rounded-lg border",
        isLong ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isLong ? (
              <TrendingUp className="w-8 h-8 text-green-500" />
            ) : (
              <TrendingDown className="w-8 h-8 text-red-500" />
            )}
            <div>
              <span className={cn(
                "font-bold text-2xl uppercase",
                isLong ? 'text-green-500' : 'text-red-500'
              )}>
                {data.direction}
              </span>
              <p className="text-sm text-muted-foreground">{data.type}</p>
            </div>
          </div>
          <div className="flex gap-6">
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Risk/Reward</p>
              <p className="font-bold text-xl">{data.riskReward.toFixed(1)}:1</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Win Rate Est.</p>
              <p className="font-bold text-xl text-blue-500">{data.winRateEstimate}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-cyan-500/10 rounded-lg p-4 border border-cyan-500/20">
          <p className="text-sm text-cyan-500">Avg Entry</p>
          <p className="text-xl font-bold">${data.averageEntry.toLocaleString()}</p>
        </div>

        <div className="bg-red-500/10 rounded-lg p-4 border border-red-500/20">
          <p className="text-sm text-red-500">Stop Loss</p>
          <p className="text-xl font-bold">${data.stopLoss.price.toLocaleString()}</p>
          <p className="text-xs text-red-400">-{riskPercent.toFixed(2)}%</p>
        </div>

        <div className="bg-green-500/10 rounded-lg p-4 border border-green-500/20">
          <p className="text-sm text-green-500">First Target</p>
          <p className="text-xl font-bold">
            ${data.takeProfits[0]?.price.toLocaleString() || '-'}
          </p>
          <p className="text-xs text-green-400">
            {data.takeProfits[0]?.riskReward.toFixed(1)}R
          </p>
        </div>

        <div className="bg-background rounded-lg p-4 border">
          <p className="text-sm text-muted-foreground">Position Size</p>
          <p className="text-xl font-bold">{data.positionSizePercent}%</p>
          <p className="text-xs text-muted-foreground">
            Risk: ${data.riskAmount?.toLocaleString() || '-'}
          </p>
        </div>
      </div>

      {/* Expandable Details */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="w-full flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
      >
        <span className="font-medium">Detailed Entry & Exit Levels</span>
        {showDetails ? (
          <ChevronUp className="w-5 h-5" />
        ) : (
          <ChevronDown className="w-5 h-5" />
        )}
      </button>

      {showDetails && (
        <div className="space-y-4 animate-in slide-in-from-top-2">
          {/* Entry Levels */}
          {data.entries && data.entries.length > 0 && (
            <div className="bg-background rounded-lg p-4 border">
              <p className="text-sm font-medium mb-3 text-cyan-500">Entry Levels (DCA)</p>
              <div className="space-y-2">
                {data.entries.map((entry, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-cyan-500/10 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center text-xs font-bold text-cyan-500">
                        {i + 1}
                      </span>
                      <span className="text-sm text-muted-foreground">{entry.type}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-cyan-500">${entry.price.toLocaleString()}</span>
                      <span className="text-sm text-muted-foreground ml-2">({entry.percentage}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Take Profit Levels */}
          <div className="bg-background rounded-lg p-4 border">
            <p className="text-sm font-medium mb-3 text-green-500">Take Profit Targets</p>
            <div className="space-y-2">
              {data.takeProfits.map((tp, i) => {
                const profitPercent = tp.percentage ||
                  ((tp.price - data.averageEntry) / data.averageEntry * 100);
                return (
                  <div key={i} className="flex items-center justify-between p-3 bg-green-500/10 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-green-500" />
                      <span className="font-medium">TP{i + 1}</span>
                      <span className="text-xs px-2 py-0.5 bg-green-500/20 rounded text-green-500">
                        {tp.riskReward.toFixed(1)}R
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-green-500">${tp.price.toLocaleString()}</span>
                      <span className="text-sm text-muted-foreground ml-2">+{profitPercent.toFixed(2)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Stop Loss Reason */}
          {data.stopLoss.reason && (
            <div className="bg-red-500/5 rounded-lg p-4 border border-red-500/20">
              <p className="text-sm font-medium text-red-500 mb-1">Stop Loss Placement</p>
              <p className="text-sm text-muted-foreground">{data.stopLoss.reason}</p>
            </div>
          )}
        </div>
      )}

      {/* AI Insight */}
      {data.aiInsight && (
        <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg p-4 border border-blue-500/20">
          <div className="flex items-start gap-3">
            <Brain className="w-5 h-5 text-purple-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-purple-500 mb-1">AI Trade Analysis</p>
              <p className="text-sm">{data.aiInsight}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
