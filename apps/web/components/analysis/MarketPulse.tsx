'use client';

import { Globe, TrendingUp, TrendingDown, Minus, Brain } from 'lucide-react';
import { cn } from '../../lib/utils';

interface MarketPulseData {
  btcDominance: number;
  btcDominanceTrend: string;
  fearGreedIndex: number;
  fearGreedLabel: string;
  marketRegime: string;
  trend: {
    direction: string;
    strength: number;
  };
  aiSummary?: string;
}

export function MarketPulse({ data }: { data?: MarketPulseData }) {
  if (!data) {
    return (
      <div className="p-4">
        <h3 className="flex items-center gap-2 text-lg font-semibold mb-4">
          <Globe className="w-5 h-5 text-blue-500" />
          Market Pulse
        </h3>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const getTrendIcon = (direction: string) => {
    if (direction === 'BULLISH') return <TrendingUp className="w-5 h-5 text-green-500" />;
    if (direction === 'BEARISH') return <TrendingDown className="w-5 h-5 text-red-500" />;
    return <Minus className="w-5 h-5 text-yellow-500" />;
  };

  const getFearGreedColor = (value: number) => {
    if (value <= 25) return 'text-red-500';
    if (value <= 45) return 'text-orange-500';
    if (value <= 55) return 'text-yellow-500';
    if (value <= 75) return 'text-green-400';
    return 'text-green-500';
  };

  const getRegimeColor = (regime: string) => {
    switch (regime) {
      case 'RISK_ON': return 'bg-green-500/20 text-green-500 border-green-500/30';
      case 'RISK_OFF': return 'bg-red-500/20 text-red-500 border-red-500/30';
      default: return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30';
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="flex items-center gap-2 text-lg font-semibold">
        <Globe className="w-5 h-5 text-blue-500" />
        Market Pulse - Overall Market Analysis
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* BTC Dominance */}
        <div className="bg-background rounded-lg p-4 border">
          <p className="text-sm text-muted-foreground mb-1">BTC Dominance</p>
          <p className="text-2xl font-bold">{(data.btcDominance ?? 0).toFixed(1)}%</p>
          <p className="text-xs text-muted-foreground">{data.btcDominanceTrend || 'N/A'}</p>
        </div>

        {/* Fear & Greed */}
        <div className="bg-background rounded-lg p-4 border">
          <p className="text-sm text-muted-foreground mb-1">Fear & Greed</p>
          <p className={cn("text-2xl font-bold", getFearGreedColor(data.fearGreedIndex ?? 50))}>
            {data.fearGreedIndex ?? 0}
          </p>
          <p className="text-xs text-muted-foreground">{data.fearGreedLabel || 'N/A'}</p>
        </div>

        {/* Market Regime */}
        <div className="bg-background rounded-lg p-4 border">
          <p className="text-sm text-muted-foreground mb-1">Market Regime</p>
          <span className={cn(
            "inline-block px-2 py-1 rounded text-sm font-medium border",
            getRegimeColor(data.marketRegime || 'NEUTRAL')
          )}>
            {data.marketRegime === 'RISK_ON' ? 'Risk On' : data.marketRegime === 'RISK_OFF' ? 'Risk Off' : 'Neutral'}
          </span>
        </div>

        {/* Trend */}
        <div className="bg-background rounded-lg p-4 border">
          <p className="text-sm text-muted-foreground mb-1">Trend</p>
          <div className="flex items-center gap-2">
            {getTrendIcon(data.trend?.direction || 'NEUTRAL')}
            <span className="text-xl font-bold">{data.trend?.strength ?? 0}%</span>
          </div>
          <p className="text-xs text-muted-foreground">{data.trend?.direction || 'N/A'}</p>
        </div>
      </div>

      {/* AI Summary */}
      {data.aiSummary && (
        <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg p-4 border border-blue-500/20">
          <div className="flex items-start gap-3">
            <Brain className="w-5 h-5 text-purple-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-purple-500 mb-1">AI Analysis</p>
              <p className="text-sm">{data.aiSummary}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
