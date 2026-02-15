'use client';

import { useState, useEffect, useCallback } from 'react';

const TICKER_SYMBOLS = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'DOGE', 'AVAX'];

interface LivePrice {
  symbol: string;
  price: string;
  change: string;
  up: boolean;
}

export function PriceTicker() {
  const [livePrices, setLivePrices] = useState<LivePrice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPrices = useCallback(async () => {
    try {
      const symbols = TICKER_SYMBOLS.map(s => `"${s}USDT"`).join(',');
      const response = await fetch(
        `https://api.binance.com/api/v3/ticker/24hr?symbols=[${symbols}]`
      );
      if (response.ok) {
        const data = await response.json();
        const prices: LivePrice[] = data.map(
          (item: { symbol: string; lastPrice: string; priceChangePercent: string }) => {
            const symbol = item.symbol.replace('USDT', '');
            const price = parseFloat(item.lastPrice);
            const change = parseFloat(item.priceChangePercent);
            return {
              symbol,
              price:
                price >= 1000
                  ? price.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })
                  : price >= 1
                    ? price.toFixed(2)
                    : price.toFixed(4),
              change: `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`,
              up: change >= 0,
            };
          }
        );
        setLivePrices(prices);
      }
    } catch (error) {
      console.error('Failed to fetch prices:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 30000);
    return () => clearInterval(interval);
  }, [fetchPrices]);

  if (isLoading || livePrices.length === 0) {
    return (
      <div className="w-full overflow-hidden py-1.5 border-b border-black/[0.06] dark:border-white/[0.06] bg-white dark:bg-[#0B1121]">
        <div className="flex items-center justify-center gap-4 px-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-3 w-24 bg-black/5 dark:bg-white/5 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // Render coin items (reused for seamless loop)
  const renderItems = (keyPrefix: string) =>
    livePrices.map((coin) => (
      <div
        key={`${keyPrefix}-${coin.symbol}`}
        className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-sans shrink-0 tabular-nums"
      >
        <span className="font-semibold text-black dark:text-white">{coin.symbol}</span>
        <span className="text-slate-400">${coin.price}</span>
        <span className={coin.up ? 'text-emerald-500 dark:text-[#00f5c4]' : 'text-red-500 dark:text-red-400'}>
          {coin.change}
        </span>
      </div>
    ));

  return (
    <div
      className="w-full overflow-hidden py-1.5 border-b border-black/[0.06] dark:border-white/[0.06] bg-white dark:bg-[#0B1121]"
      aria-label="Live cryptocurrency prices"
    >
      <div className="flex items-center gap-6 animate-marquee whitespace-nowrap">
        {renderItems('a')}
        {/* Separator dot */}
        <span className="w-1 h-1 rounded-full bg-slate-600 shrink-0" />
        {renderItems('b')}
        <span className="w-1 h-1 rounded-full bg-slate-600 shrink-0" />
      </div>

      <style jsx>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 30s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}
