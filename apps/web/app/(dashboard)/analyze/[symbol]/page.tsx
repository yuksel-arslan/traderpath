'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { AnalysisFlow } from '../../../../components/analysis/AnalysisFlow';
import { CreditBalance } from '../../../../components/credits/CreditBalance';

// Trade type labels for display
const TRADE_TYPE_LABELS: Record<string, string> = {
  scalping: 'Scalping',
  dayTrade: 'Day Trade',
  swing: 'Swing Trade',
};

export default function AnalyzePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const symbol = params.symbol as string;
  const tradeType = (searchParams.get('tradeType') as 'scalping' | 'dayTrade' | 'swing') || 'dayTrade';
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [priceChange, setPriceChange] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchCurrentPrice = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const response = await fetch(
        `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol.toUpperCase()}USDT`
      );
      if (response.ok) {
        const data = await response.json();
        setCurrentPrice(parseFloat(data.lastPrice));
        setPriceChange(parseFloat(data.priceChangePercent));
      }
    } catch (error) {
      console.error('Failed to fetch price:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [symbol]);

  useEffect(() => {
    fetchCurrentPrice();
    const interval = setInterval(fetchCurrentPrice, 10000);
    return () => clearInterval(interval);
  }, [fetchCurrentPrice]);

  const formatPrice = (price: number | null) => {
    if (price === null) return '...';
    if (price >= 1000) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (price >= 1) return price.toFixed(2);
    if (price >= 0.01) return price.toFixed(4);
    return price.toFixed(6);
  };

  return (
    <div className="w-full px-6 md:px-12 lg:px-16 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <Link
            href="/analyze"
            className="p-2 hover:bg-accent rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{symbol}/USDT</h1>
            <p className="text-muted-foreground">
              7-Step Trading Analysis
              <span className="ml-2 px-2 py-0.5 bg-primary/10 text-primary text-sm rounded-full">
                {TRADE_TYPE_LABELS[tradeType]}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Price Display */}
          <div className="bg-card border rounded-lg px-4 py-2">
            <div className="flex items-center gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Price</p>
                <p className="text-lg font-bold">${formatPrice(currentPrice)}</p>
              </div>
              {priceChange !== 0 && (
                <span className={`text-sm font-medium px-2 py-1 rounded ${
                  priceChange >= 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                }`}>
                  {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
                </span>
              )}
              <button
                onClick={fetchCurrentPrice}
                disabled={isRefreshing}
                className="p-1.5 hover:bg-accent rounded transition disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          <CreditBalance />
        </div>
      </div>

      {/* Analysis Flow */}
      <AnalysisFlow symbol={symbol} tradeType={tradeType} />
    </div>
  );
}
