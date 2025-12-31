'use client';

import { Target, TrendingUp, TrendingDown, Minus, Brain } from 'lucide-react';
import { cn } from '../../lib/utils';

interface AssetScannerData {
  symbol: string;
  currentPrice: number;
  priceChange24h: number;
  volume24h: number;
  indicators: {
    rsi: number;
    macd: {
      macd: number;
      signal: number;
      histogram: number;
    };
    sma20: number;
    ema20: number;
    bollingerBands: {
      upper: number;
      middle: number;
      lower: number;
    };
  };
  timeframes: Array<{
    timeframe: string;
    trend: string;
    strength: number;
  }>;
  levels: {
    support: number[];
    resistance: number[];
  };
  aiInsight?: string;
}

interface AssetScannerProps {
  data?: AssetScannerData;
  symbol: string;
}

export function AssetScanner({ data, symbol }: AssetScannerProps) {
  if (!data) {
    return (
      <div className="p-4">
        <h3 className="flex items-center gap-2 text-lg font-semibold mb-4">
          <Target className="w-5 h-5 text-blue-500" />
          Asset Scanner - {symbol}
        </h3>
        <p className="text-muted-foreground">Yükleniyor...</p>
      </div>
    );
  }

  const getTrendIcon = (trend: string) => {
    if (trend === 'BULLISH' || trend === 'bullish') return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (trend === 'BEARISH' || trend === 'bearish') return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-yellow-500" />;
  };

  const getTrendColor = (trend: string) => {
    if (trend === 'BULLISH' || trend === 'bullish') return 'text-green-500';
    if (trend === 'BEARISH' || trend === 'bearish') return 'text-red-500';
    return 'text-yellow-500';
  };

  const getRSIColor = (rsi: number) => {
    if (rsi >= 70) return 'text-red-500';
    if (rsi <= 30) return 'text-green-500';
    return 'text-yellow-500';
  };

  const getRSILabel = (rsi: number) => {
    if (rsi >= 70) return 'Aşırı Alım';
    if (rsi <= 30) return 'Aşırı Satım';
    return 'Nötr';
  };

  return (
    <div className="space-y-6">
      <h3 className="flex items-center gap-2 text-lg font-semibold">
        <Target className="w-5 h-5 text-blue-500" />
        Asset Scanner - {symbol}
      </h3>

      {/* Price Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-background rounded-lg p-4 border">
          <p className="text-sm text-muted-foreground mb-1">Güncel Fiyat</p>
          <p className="text-2xl font-bold">${data.currentPrice.toLocaleString()}</p>
        </div>

        <div className="bg-background rounded-lg p-4 border">
          <p className="text-sm text-muted-foreground mb-1">24s Değişim</p>
          <p className={cn("text-2xl font-bold", data.priceChange24h >= 0 ? 'text-green-500' : 'text-red-500')}>
            {data.priceChange24h >= 0 ? '+' : ''}{data.priceChange24h.toFixed(2)}%
          </p>
        </div>

        <div className="bg-background rounded-lg p-4 border">
          <p className="text-sm text-muted-foreground mb-1">RSI (14)</p>
          <p className={cn("text-2xl font-bold", getRSIColor(data.indicators.rsi))}>
            {data.indicators.rsi.toFixed(1)}
          </p>
          <p className="text-xs text-muted-foreground">{getRSILabel(data.indicators.rsi)}</p>
        </div>

        <div className="bg-background rounded-lg p-4 border">
          <p className="text-sm text-muted-foreground mb-1">MACD</p>
          <p className={cn("text-2xl font-bold", data.indicators.macd.histogram > 0 ? 'text-green-500' : 'text-red-500')}>
            {data.indicators.macd.histogram > 0 ? 'Pozitif' : 'Negatif'}
          </p>
        </div>
      </div>

      {/* Timeframe Analysis */}
      <div className="bg-background rounded-lg p-4 border">
        <p className="text-sm font-medium mb-3">Zaman Dilimi Analizi</p>
        <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
          {data.timeframes.map((tf) => (
            <div key={tf.timeframe} className="text-center p-2 bg-accent/30 rounded-lg">
              <p className="text-xs text-muted-foreground">{tf.timeframe}</p>
              <div className="flex items-center justify-center gap-1 mt-1">
                {getTrendIcon(tf.trend)}
                <span className={cn("text-sm font-medium", getTrendColor(tf.trend))}>
                  {tf.strength}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Support & Resistance */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-background rounded-lg p-4 border">
          <p className="text-sm font-medium mb-2 text-green-500">Destek Seviyeleri</p>
          <div className="space-y-1">
            {data.levels.support.slice(0, 3).map((level, i) => (
              <p key={i} className="text-sm font-mono">${level.toLocaleString()}</p>
            ))}
          </div>
        </div>

        <div className="bg-background rounded-lg p-4 border">
          <p className="text-sm font-medium mb-2 text-red-500">Direnç Seviyeleri</p>
          <div className="space-y-1">
            {data.levels.resistance.slice(0, 3).map((level, i) => (
              <p key={i} className="text-sm font-mono">${level.toLocaleString()}</p>
            ))}
          </div>
        </div>
      </div>

      {/* AI Insight */}
      {data.aiInsight && (
        <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg p-4 border border-blue-500/20">
          <div className="flex items-start gap-3">
            <Brain className="w-5 h-5 text-purple-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-purple-500 mb-1">AI Analizi</p>
              <p className="text-sm">{data.aiInsight}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
