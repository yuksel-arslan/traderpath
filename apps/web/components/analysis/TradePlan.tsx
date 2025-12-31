'use client';

import { FileText, Target, TrendingUp, TrendingDown, Brain } from 'lucide-react';
import { cn } from '../../lib/utils';

interface TradePlanData {
  symbol: string;
  direction: string;
  entry: number;
  stopLoss: number;
  takeProfit: number[];
  riskReward: number;
  positionSize: string;
  riskPercent: number;
  aiInsight?: string;
}

interface TradePlanProps {
  data?: TradePlanData;
  symbol: string;
}

export function TradePlan({ data, symbol }: TradePlanProps) {
  if (!data) {
    return (
      <div className="p-4">
        <h3 className="flex items-center gap-2 text-lg font-semibold mb-4">
          <FileText className="w-5 h-5 text-indigo-500" />
          Trade Plan - {symbol}
        </h3>
        <p className="text-muted-foreground">Yükleniyor...</p>
      </div>
    );
  }

  const isLong = data.direction.toUpperCase() === 'LONG';
  const riskPercent = ((data.entry - data.stopLoss) / data.entry * 100);

  return (
    <div className="space-y-6">
      <h3 className="flex items-center gap-2 text-lg font-semibold">
        <FileText className="w-5 h-5 text-indigo-500" />
        Trade Plan - {symbol}
      </h3>

      {/* Direction Card */}
      <div className={cn(
        "p-4 rounded-lg border",
        isLong ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isLong ? (
              <TrendingUp className="w-6 h-6 text-green-500" />
            ) : (
              <TrendingDown className="w-6 h-6 text-red-500" />
            )}
            <span className={cn(
              "font-bold text-xl uppercase",
              isLong ? 'text-green-500' : 'text-red-500'
            )}>
              {data.direction}
            </span>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Risk/Ödül</p>
            <p className="font-bold text-lg">{data.riskReward.toFixed(1)}:1</p>
          </div>
        </div>
      </div>

      {/* Key Levels */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-background rounded-lg p-4 border">
          <p className="text-sm text-muted-foreground">Giriş</p>
          <p className="text-xl font-bold">${data.entry.toLocaleString()}</p>
        </div>

        <div className="bg-red-500/10 rounded-lg p-4 border border-red-500/20">
          <p className="text-sm text-red-500">Stop Loss</p>
          <p className="text-xl font-bold text-red-500">${data.stopLoss.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">-{Math.abs(riskPercent).toFixed(2)}%</p>
        </div>

        <div className="bg-background rounded-lg p-4 border">
          <p className="text-sm text-muted-foreground">Pozisyon Büyüklüğü</p>
          <p className="text-xl font-bold">{data.positionSize}</p>
        </div>

        <div className="bg-background rounded-lg p-4 border">
          <p className="text-sm text-muted-foreground">Risk</p>
          <p className="text-xl font-bold">{data.riskPercent}%</p>
        </div>
      </div>

      {/* Take Profit Levels */}
      <div className="bg-background rounded-lg p-4 border">
        <p className="text-sm font-medium mb-3">Kar Al Seviyeleri</p>
        <div className="space-y-2">
          {data.takeProfit.map((tp, i) => {
            const profitPercent = ((tp - data.entry) / data.entry * 100);
            return (
              <div key={i} className="flex items-center justify-between p-3 bg-green-500/10 rounded-lg">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-green-500" />
                  <span className="font-medium">TP{i + 1}</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-green-500">${tp.toLocaleString()}</span>
                  <span className="text-sm text-muted-foreground ml-2">+{profitPercent.toFixed(2)}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* AI Insight */}
      {data.aiInsight && (
        <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg p-4 border border-blue-500/20">
          <div className="flex items-start gap-3">
            <Brain className="w-5 h-5 text-purple-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-purple-500 mb-1">AI Trade Önerisi</p>
              <p className="text-sm">{data.aiInsight}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
