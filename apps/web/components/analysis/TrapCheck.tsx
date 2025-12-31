'use client';

import { AlertTriangle, Brain } from 'lucide-react';
import { cn } from '../../lib/utils';

interface TrapCheckData {
  symbol: string;
  liquidationRisk: string;
  trapProbability: number;
  longLiquidations: number;
  shortLiquidations: number;
  warnings: string[];
  heatmapZones: Array<{
    price: number;
    volume: number;
    type: string;
  }>;
  aiInsight?: string;
}

interface TrapCheckProps {
  data?: TrapCheckData;
  symbol: string;
}

export function TrapCheck({ data, symbol }: TrapCheckProps) {
  if (!data) {
    return (
      <div className="p-4">
        <h3 className="flex items-center gap-2 text-lg font-semibold mb-4">
          <AlertTriangle className="w-5 h-5 text-orange-500" />
          Trap Check - {symbol}
        </h3>
        <p className="text-muted-foreground">Yükleniyor...</p>
      </div>
    );
  }

  const getRiskStyle = (risk: string) => {
    const upper = risk.toUpperCase();
    if (upper === 'LOW') return 'bg-green-500/10 text-green-500 border-green-500/20';
    if (upper === 'MEDIUM') return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
    return 'bg-red-500/10 text-red-500 border-red-500/20';
  };

  const getRiskLabel = (risk: string) => {
    const upper = risk.toUpperCase();
    if (upper === 'LOW') return 'Düşük';
    if (upper === 'MEDIUM') return 'Orta';
    return 'Yüksek';
  };

  const formatVolume = (vol: number) => {
    if (vol >= 1000000000) return `$${(vol / 1000000000).toFixed(1)}B`;
    if (vol >= 1000000) return `$${(vol / 1000000).toFixed(0)}M`;
    return `$${(vol / 1000).toFixed(0)}K`;
  };

  return (
    <div className="space-y-6">
      <h3 className="flex items-center gap-2 text-lg font-semibold">
        <AlertTriangle className="w-5 h-5 text-orange-500" />
        Trap Check - {symbol}
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className={cn("p-4 rounded-lg border", getRiskStyle(data.liquidationRisk))}>
          <p className="text-sm opacity-80">Likidite Riski</p>
          <p className="text-xl font-bold">{getRiskLabel(data.liquidationRisk)}</p>
        </div>

        <div className="bg-background rounded-lg p-4 border">
          <p className="text-sm text-muted-foreground">Tuzak Olasılığı</p>
          <p className="text-xl font-bold">{data.trapProbability}%</p>
          <div className="mt-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full",
                data.trapProbability > 50 ? 'bg-red-500' : data.trapProbability > 30 ? 'bg-orange-500' : 'bg-green-500'
              )}
              style={{ width: `${data.trapProbability}%` }}
            />
          </div>
        </div>

        <div className="bg-green-500/10 rounded-lg p-4 border border-green-500/20">
          <p className="text-sm text-green-500">Long Likiditeler</p>
          <p className="text-xl font-bold">{formatVolume(data.longLiquidations)}</p>
        </div>

        <div className="bg-red-500/10 rounded-lg p-4 border border-red-500/20">
          <p className="text-sm text-red-500">Short Likiditeler</p>
          <p className="text-xl font-bold">{formatVolume(data.shortLiquidations)}</p>
        </div>
      </div>

      {/* Heatmap Zones */}
      {data.heatmapZones && data.heatmapZones.length > 0 && (
        <div className="bg-background rounded-lg p-4 border">
          <p className="text-sm font-medium mb-3">Likidite Isı Haritası Bölgeleri</p>
          <div className="space-y-2">
            {data.heatmapZones.map((zone, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded bg-accent/30">
                <div className="flex items-center gap-2">
                  <span className="font-medium">${zone.price.toLocaleString()}</span>
                  <span className={cn(
                    "text-xs px-2 py-0.5 rounded",
                    zone.type === 'long' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                  )}>
                    {zone.type.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        zone.type === 'long' ? 'bg-green-500' : 'bg-red-500'
                      )}
                      style={{ width: `${Math.min(zone.volume, 100)}%` }}
                    />
                  </div>
                  <span className="text-sm text-muted-foreground">{zone.volume}M</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warnings */}
      {data.warnings && data.warnings.length > 0 && (
        <div className="bg-orange-500/10 rounded-lg p-4 border border-orange-500/30">
          <p className="text-sm font-medium text-orange-500 mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Tuzak Uyarıları
          </p>
          <ul className="space-y-1">
            {data.warnings.map((warning, i) => (
              <li key={i} className="text-sm text-orange-600 dark:text-orange-400">• {warning}</li>
            ))}
          </ul>
        </div>
      )}

      {/* AI Insight */}
      {data.aiInsight && (
        <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg p-4 border border-blue-500/20">
          <div className="flex items-start gap-3">
            <Brain className="w-5 h-5 text-purple-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-purple-500 mb-1">AI Tuzak Analizi</p>
              <p className="text-sm">{data.aiInsight}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
