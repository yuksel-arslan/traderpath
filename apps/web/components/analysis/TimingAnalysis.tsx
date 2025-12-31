'use client';

import { Clock, ArrowDown, ArrowUp, Brain } from 'lucide-react';
import { cn } from '../../lib/utils';

interface TimingData {
  symbol: string;
  currentPrice: number;
  optimalEntry: number;
  entryZone: {
    low: number;
    high: number;
  };
  recommendation: string;
  timeWindow: string;
  confidence: number;
  aiInsight?: string;
}

interface TimingAnalysisProps {
  data?: TimingData;
  symbol: string;
}

export function TimingAnalysis({ data, symbol }: TimingAnalysisProps) {
  if (!data) {
    return (
      <div className="p-4">
        <h3 className="flex items-center gap-2 text-lg font-semibold mb-4">
          <Clock className="w-5 h-5 text-purple-500" />
          Timing Analysis - {symbol}
        </h3>
        <p className="text-muted-foreground">Yükleniyor...</p>
      </div>
    );
  }

  const priceDiff = ((data.currentPrice - data.optimalEntry) / data.optimalEntry * 100);
  const isAboveOptimal = priceDiff > 0;

  const getRecommendationStyle = (rec: string) => {
    const upper = rec.toUpperCase();
    if (upper === 'BUY' || upper === 'ENTER') return 'bg-green-500/10 text-green-500 border-green-500/20';
    if (upper === 'WAIT') return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
    return 'bg-red-500/10 text-red-500 border-red-500/20';
  };

  const getRecommendationLabel = (rec: string) => {
    const upper = rec.toUpperCase();
    if (upper === 'BUY' || upper === 'ENTER') return 'Giriş Yap';
    if (upper === 'WAIT') return 'Bekle';
    return 'Bekle';
  };

  return (
    <div className="space-y-6">
      <h3 className="flex items-center gap-2 text-lg font-semibold">
        <Clock className="w-5 h-5 text-purple-500" />
        Timing Analysis - {symbol}
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-background rounded-lg p-4 border">
          <p className="text-sm text-muted-foreground">Güncel Fiyat</p>
          <p className="text-xl font-bold">${data.currentPrice.toLocaleString()}</p>
        </div>

        <div className="bg-background rounded-lg p-4 border">
          <p className="text-sm text-muted-foreground">Optimal Giriş</p>
          <p className="text-xl font-bold text-green-500">${data.optimalEntry.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">
            {isAboveOptimal ? (
              <span className="text-red-500 flex items-center gap-1">
                <ArrowUp className="w-3 h-3" /> {priceDiff.toFixed(2)}% üstünde
              </span>
            ) : (
              <span className="text-green-500 flex items-center gap-1">
                <ArrowDown className="w-3 h-3" /> {Math.abs(priceDiff).toFixed(2)}% altında
              </span>
            )}
          </p>
        </div>

        <div className="bg-background rounded-lg p-4 border">
          <p className="text-sm text-muted-foreground">Güven</p>
          <p className="text-xl font-bold">{data.confidence}%</p>
          <div className="mt-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-500 rounded-full"
              style={{ width: `${data.confidence}%` }}
            />
          </div>
        </div>
      </div>

      {/* Entry Zone */}
      <div className="bg-background rounded-lg p-4 border">
        <p className="text-sm text-muted-foreground mb-2">Giriş Bölgesi</p>
        <div className="relative h-10 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
          <div
            className="absolute h-full bg-green-500/30 flex items-center justify-center"
            style={{
              left: '10%',
              width: '80%',
            }}
          >
            <span className="text-xs font-medium">Giriş Bölgesi</span>
          </div>
          <div className="absolute inset-0 flex items-center justify-between px-4 text-sm font-medium">
            <span>${data.entryZone.low.toLocaleString()}</span>
            <span>${data.entryZone.high.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Recommendation */}
      <div className={cn("p-4 rounded-lg border", getRecommendationStyle(data.recommendation))}>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-lg">{getRecommendationLabel(data.recommendation)}</p>
            <p className="text-sm opacity-80">
              {data.recommendation.toUpperCase() === 'WAIT'
                ? `Fiyatın giriş bölgesine gelmesini bekleyin`
                : 'Fiyat optimal giriş bölgesinde'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm opacity-80">Zaman Penceresi</p>
            <p className="font-medium">{data.timeWindow}</p>
          </div>
        </div>
      </div>

      {/* AI Insight */}
      {data.aiInsight && (
        <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg p-4 border border-blue-500/20">
          <div className="flex items-start gap-3">
            <Brain className="w-5 h-5 text-purple-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-purple-500 mb-1">AI Zamanlama Önerisi</p>
              <p className="text-sm">{data.aiInsight}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
