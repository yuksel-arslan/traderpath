'use client';

import { Clock, ArrowDown, ArrowUp } from 'lucide-react';

interface TimingAnalysisProps {
  data: unknown;
  symbol: string;
}

export function TimingAnalysis({ data, symbol }: TimingAnalysisProps) {
  // Mock data for demo
  const mockData = {
    optimalEntry: 42850,
    currentPrice: 43250,
    entryZone: { low: 42500, high: 43100 },
    confidence: 82,
    timeWindow: '4-12 hours',
    recommendation: 'wait' as const,
  };

  const getRecommendationStyle = () => {
    if (mockData.recommendation === 'buy') return 'bg-green-500/10 text-green-500 border-green-500/20';
    if (mockData.recommendation === 'wait') return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
    return 'bg-red-500/10 text-red-500 border-red-500/20';
  };

  const priceDiff = ((mockData.currentPrice - mockData.optimalEntry) / mockData.optimalEntry * 100).toFixed(2);

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Clock className="w-5 h-5 text-purple-500" />
        Timing Analysis - {symbol}
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-accent/50 rounded-lg">
          <p className="text-sm text-muted-foreground">Current Price</p>
          <p className="text-xl font-bold">${mockData.currentPrice.toLocaleString()}</p>
        </div>

        <div className="p-4 bg-accent/50 rounded-lg">
          <p className="text-sm text-muted-foreground">Optimal Entry</p>
          <p className="text-xl font-bold text-green-500">${mockData.optimalEntry.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">
            {Number(priceDiff) > 0 ? (
              <span className="text-red-500 flex items-center gap-1">
                <ArrowUp className="w-3 h-3" /> {priceDiff}% above
              </span>
            ) : (
              <span className="text-green-500 flex items-center gap-1">
                <ArrowDown className="w-3 h-3" /> {Math.abs(Number(priceDiff))}% below
              </span>
            )}
          </p>
        </div>

        <div className="p-4 bg-accent/50 rounded-lg">
          <p className="text-sm text-muted-foreground">Confidence</p>
          <p className="text-xl font-bold">{mockData.confidence}%</p>
          <div className="mt-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-500 rounded-full"
              style={{ width: `${mockData.confidence}%` }}
            />
          </div>
        </div>
      </div>

      <div className="p-4 bg-accent/50 rounded-lg mb-4">
        <p className="text-sm text-muted-foreground mb-2">Entry Zone</p>
        <div className="relative h-8 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="absolute h-full bg-green-500/30"
            style={{
              left: `${(mockData.entryZone.low / mockData.currentPrice) * 50}%`,
              width: `${((mockData.entryZone.high - mockData.entryZone.low) / mockData.currentPrice) * 100}%`,
            }}
          />
          <div className="absolute inset-0 flex items-center justify-between px-4 text-xs font-medium">
            <span>${mockData.entryZone.low.toLocaleString()}</span>
            <span>${mockData.entryZone.high.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className={`p-4 rounded-lg border ${getRecommendationStyle()}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold capitalize">{mockData.recommendation}</p>
            <p className="text-sm opacity-80">
              {mockData.recommendation === 'wait'
                ? `Wait for price to reach entry zone (${mockData.timeWindow})`
                : mockData.recommendation === 'buy'
                ? 'Price is in optimal entry zone'
                : 'Price is above recommended entry'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm opacity-80">Time Window</p>
            <p className="font-medium">{mockData.timeWindow}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
