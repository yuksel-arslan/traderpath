'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

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
      <div
        className="w-full overflow-hidden py-2 border-b"
        style={{ backgroundColor: 'rgba(4,16,32,0.85)' }}
      >
        <p className="text-center text-xs text-slate-400">Loading prices...</p>
      </div>
    );
  }

  // Duplicate the list so the loop is seamless
  const items = [...livePrices, ...livePrices];

  return (
    <div
      className="w-full overflow-hidden py-2 border-b border-white/10"
      style={{ backgroundColor: 'rgba(4,16,32,0.9)' }}
      aria-label="Live cryptocurrency prices"
    >
      <motion.div
        className="flex gap-6 sm:gap-8 whitespace-nowrap"
        animate={{ x: ['0%', '-50%'] }}
        transition={{
          x: {
            repeat: Infinity,
            repeatType: 'loop',
            duration: 30,
            ease: 'linear',
          },
        }}
      >
        {items.map((coin, index) => (
          <div
            key={`${coin.symbol}-${index}`}
            className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-sm shrink-0"
          >
            <span className="font-semibold text-white">{coin.symbol}</span>
            <span className="text-slate-400">${coin.price}</span>
            <span className={coin.up ? 'text-[#00f5c4]' : 'text-red-400'}>
              {coin.change}
            </span>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
