'use client';

import { FileText, Target, AlertCircle, TrendingUp } from 'lucide-react';

interface TradePlanProps {
  data: unknown;
  symbol: string;
}

export function TradePlan({ data, symbol }: TradePlanProps) {
  // Mock data for demo
  const mockData = {
    direction: 'long' as const,
    entry: 42850,
    stopLoss: 41500,
    takeProfit: [44500, 46000, 48000],
    riskReward: 2.8,
    positionSize: '2-3%',
    leverage: '3-5x',
    notes: [
      'Wait for confirmation candle above $43,000',
      'Consider scaling in at multiple levels',
      'Set alerts at key levels',
    ],
  };

  const riskPercent = ((mockData.entry - mockData.stopLoss) / mockData.entry * 100).toFixed(2);

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <FileText className="w-5 h-5 text-indigo-500" />
        Trade Plan - {symbol}
      </h3>

      <div className={`p-4 rounded-lg mb-4 ${
        mockData.direction === 'long' ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className={`w-5 h-5 ${mockData.direction === 'long' ? 'text-green-500' : 'text-red-500 rotate-180'}`} />
            <span className={`font-bold text-lg uppercase ${mockData.direction === 'long' ? 'text-green-500' : 'text-red-500'}`}>
              {mockData.direction}
            </span>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Risk/Reward</p>
            <p className="font-bold">{mockData.riskReward}:1</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-accent/50 rounded-lg">
          <p className="text-sm text-muted-foreground">Entry</p>
          <p className="text-xl font-bold">${mockData.entry.toLocaleString()}</p>
        </div>

        <div className="p-4 bg-red-500/10 rounded-lg">
          <p className="text-sm text-red-500">Stop Loss</p>
          <p className="text-xl font-bold text-red-500">${mockData.stopLoss.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">-{riskPercent}%</p>
        </div>

        <div className="p-4 bg-accent/50 rounded-lg">
          <p className="text-sm text-muted-foreground">Position Size</p>
          <p className="text-xl font-bold">{mockData.positionSize}</p>
        </div>

        <div className="p-4 bg-accent/50 rounded-lg">
          <p className="text-sm text-muted-foreground">Leverage</p>
          <p className="text-xl font-bold">{mockData.leverage}</p>
        </div>
      </div>

      <div className="p-4 bg-accent/50 rounded-lg mb-4">
        <p className="text-sm text-muted-foreground mb-3">Take Profit Levels</p>
        <div className="space-y-2">
          {mockData.takeProfit.map((tp, i) => {
            const profitPercent = ((tp - mockData.entry) / mockData.entry * 100).toFixed(2);
            return (
              <div key={i} className="flex items-center justify-between p-2 bg-green-500/10 rounded">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-green-500" />
                  <span className="font-medium">TP{i + 1}</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-green-500">${tp.toLocaleString()}</span>
                  <span className="text-sm text-muted-foreground ml-2">+{profitPercent}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <h4 className="font-medium text-blue-500 flex items-center gap-2 mb-2">
          <AlertCircle className="w-4 h-4" />
          Notes
        </h4>
        <ul className="space-y-1 text-sm text-muted-foreground">
          {mockData.notes.map((note, i) => (
            <li key={i}>• {note}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
