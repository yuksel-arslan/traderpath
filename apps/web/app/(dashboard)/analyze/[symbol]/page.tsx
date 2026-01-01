'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { AnalysisFlow } from '../../../../components/analysis/AnalysisFlow';

export default function AnalyzePage() {
  const params = useParams();
  const symbol = params.symbol as string;
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
    // Auto-refresh every 10 seconds
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
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link
            href="/analyze"
            className="p-2 hover:bg-accent rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{symbol}/USDT Analysis</h1>
            <p className="text-muted-foreground">7-Step Trading Analysis</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Current Price</p>
            <div className="flex items-center gap-2">
              <p className="text-xl font-bold">${formatPrice(currentPrice)}</p>
              {priceChange !== 0 && (
                <span className={`text-sm font-medium ${priceChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
                </span>
              )}
            </div>
          </div>
          <button
            onClick={fetchCurrentPrice}
            disabled={isRefreshing}
            className="p-2 hover:bg-accent rounded-lg transition disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Analysis Flow */}
      <AnalysisFlow symbol={symbol} />
    </div>
  );
}
