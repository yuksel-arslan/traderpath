'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface AssetScannerProps {
  data: unknown;
  symbol: string;
}

export function AssetScanner({ data, symbol }: AssetScannerProps) {
  // Mock data for demo
  const mockData = {
    trend: 'bullish' as const,
    strength: 72,
    support: 42150,
    resistance: 44800,
    prediction: '+5.2%',
    timeframe: '7 days',
  };

  const getTrendIcon = () => {
    if (mockData.trend === 'bullish') return <TrendingUp className="w-5 h-5 text-green-500" />;
    if (mockData.trend === 'bearish') return <TrendingDown className="w-5 h-5 text-red-500" />;
    return <Minus className="w-5 h-5 text-yellow-500" />;
  };

  const getTrendColor = () => {
    if (mockData.trend === 'bullish') return 'text-green-500';
    if (mockData.trend === 'bearish') return 'text-red-500';
    return 'text-yellow-500';
  };

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        {getTrendIcon()}
        Asset Scanner - {symbol}
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="p-4 bg-accent/50 rounded-lg">
          <p className="text-sm text-muted-foreground">Trend</p>
          <p className={`text-xl font-bold capitalize ${getTrendColor()}`}>
            {mockData.trend}
          </p>
        </div>

        <div className="p-4 bg-accent/50 rounded-lg">
          <p className="text-sm text-muted-foreground">Strength</p>
          <p className="text-xl font-bold">{mockData.strength}%</p>
          <div className="mt-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full"
              style={{ width: `${mockData.strength}%` }}
            />
          </div>
        </div>

        <div className="p-4 bg-accent/50 rounded-lg">
          <p className="text-sm text-muted-foreground">Prediction ({mockData.timeframe})</p>
          <p className={`text-xl font-bold ${mockData.prediction.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>
            {mockData.prediction}
          </p>
        </div>

        <div className="p-4 bg-accent/50 rounded-lg">
          <p className="text-sm text-muted-foreground">Support</p>
          <p className="text-xl font-bold">${mockData.support.toLocaleString()}</p>
        </div>

        <div className="p-4 bg-accent/50 rounded-lg">
          <p className="text-sm text-muted-foreground">Resistance</p>
          <p className="text-xl font-bold">${mockData.resistance.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}
