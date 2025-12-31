'use client';

import { AlertTriangle, DollarSign, TrendingDown, Users } from 'lucide-react';

interface TrapCheckProps {
  data: unknown;
  symbol: string;
}

export function TrapCheck({ data, symbol }: TrapCheckProps) {
  // Mock data for demo
  const mockData = {
    liquidationRisk: 'low' as const,
    longLiquidations: 125000000,
    shortLiquidations: 89000000,
    heatmapZones: [
      { price: 41000, volume: 85, type: 'long' as const },
      { price: 45000, volume: 120, type: 'short' as const },
      { price: 40000, volume: 65, type: 'long' as const },
    ],
    trapProbability: 23,
    warnings: ['Heavy long liquidations below $41,000'],
  };

  const getRiskStyle = (risk: string) => {
    if (risk === 'low') return 'bg-green-500/10 text-green-500 border-green-500/20';
    if (risk === 'moderate') return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
    return 'bg-red-500/10 text-red-500 border-red-500/20';
  };

  const formatVolume = (vol: number) => {
    if (vol >= 1000000000) return `$${(vol / 1000000000).toFixed(1)}B`;
    if (vol >= 1000000) return `$${(vol / 1000000).toFixed(0)}M`;
    return `$${(vol / 1000).toFixed(0)}K`;
  };

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-orange-500" />
        Trap Check - {symbol}
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className={`p-4 rounded-lg border ${getRiskStyle(mockData.liquidationRisk)}`}>
          <p className="text-sm opacity-80">Liquidation Risk</p>
          <p className="text-xl font-bold capitalize">{mockData.liquidationRisk}</p>
        </div>

        <div className="p-4 bg-accent/50 rounded-lg">
          <p className="text-sm text-muted-foreground">Trap Probability</p>
          <p className="text-xl font-bold">{mockData.trapProbability}%</p>
          <div className="mt-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-orange-500 rounded-full"
              style={{ width: `${mockData.trapProbability}%` }}
            />
          </div>
        </div>

        <div className="p-4 bg-green-500/10 rounded-lg">
          <p className="text-sm text-green-500 flex items-center gap-1">
            <TrendingDown className="w-3 h-3 rotate-180" /> Long Liquidations
          </p>
          <p className="text-xl font-bold">{formatVolume(mockData.longLiquidations)}</p>
        </div>

        <div className="p-4 bg-red-500/10 rounded-lg">
          <p className="text-sm text-red-500 flex items-center gap-1">
            <TrendingDown className="w-3 h-3" /> Short Liquidations
          </p>
          <p className="text-xl font-bold">{formatVolume(mockData.shortLiquidations)}</p>
        </div>
      </div>

      <div className="p-4 bg-accent/50 rounded-lg mb-4">
        <p className="text-sm text-muted-foreground mb-3">Liquidation Heatmap Zones</p>
        <div className="space-y-2">
          {mockData.heatmapZones.map((zone, i) => (
            <div key={i} className="flex items-center justify-between p-2 rounded bg-background">
              <div className="flex items-center gap-2">
                <DollarSign className={`w-4 h-4 ${zone.type === 'long' ? 'text-green-500' : 'text-red-500'}`} />
                <span className="font-medium">${zone.price.toLocaleString()}</span>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  zone.type === 'long' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                }`}>
                  {zone.type.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${zone.type === 'long' ? 'bg-green-500' : 'bg-red-500'}`}
                    style={{ width: `${Math.min(zone.volume, 100)}%` }}
                  />
                </div>
                <span className="text-sm text-muted-foreground">{zone.volume}M</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {mockData.warnings.length > 0 && (
        <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
          <h4 className="font-medium text-orange-500 flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4" />
            Trap Warnings
          </h4>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {mockData.warnings.map((warning, i) => (
              <li key={i}>• {warning}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
