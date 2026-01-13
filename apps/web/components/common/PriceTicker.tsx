'use client';

// ===========================================
// Price Ticker Component
// Live scrolling coin prices at top of page
// ===========================================

import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '../../lib/utils';

interface TickerCoin {
  symbol: string;
  price: number;
  change24h: number;
}

// Top coins to display
const TOP_COINS = [
  'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT',
  'DOGEUSDT', 'ADAUSDT', 'AVAXUSDT', 'DOTUSDT', 'MATICUSDT',
  'LINKUSDT', 'ATOMUSDT', 'LTCUSDT', 'UNIUSDT', 'NEARUSDT'
];

export function PriceTicker() {
  const [coins, setCoins] = useState<TickerCoin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        // Fetch 24h ticker data from Binance
        const response = await fetch(
          'https://api.binance.com/api/v3/ticker/24hr'
        );

        if (!response.ok) {
          throw new Error(`Binance API error: ${response.status}`);
        }

        // Safely parse JSON response
        const text = await response.text();
        if (!text || text.trim() === '') {
          throw new Error('Empty response from Binance API');
        }

        let data: Array<{ symbol: string; lastPrice: string; priceChangePercent: string }>;
        try {
          data = JSON.parse(text);
        } catch {
          throw new Error('Invalid JSON response from Binance API');
        }

        // Filter and map to our format
        const tickerCoins: TickerCoin[] = TOP_COINS.map(symbol => {
          const ticker = data.find((t) => t.symbol === symbol);
          if (ticker) {
            return {
              symbol: symbol.replace('USDT', ''),
              price: parseFloat(ticker.lastPrice),
              change24h: parseFloat(ticker.priceChangePercent),
            };
          }
          return null;
        }).filter(Boolean) as TickerCoin[];

        setCoins(tickerCoins);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch prices:', error);
        setLoading(false);
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 60000); // Update every 60 seconds for better performance

    return () => clearInterval(interval);
  }, []);

  const formatPrice = (price: number) => {
    if (price >= 1000) return price.toLocaleString('en-US', { maximumFractionDigits: 0 });
    if (price >= 1) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return price.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  };

  if (loading) {
    return (
      <div className="w-full bg-card/50 backdrop-blur border-b border-border/50 py-2 overflow-hidden">
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          Loading prices...
        </div>
      </div>
    );
  }

  // Duplicate coins for seamless scroll
  const duplicatedCoins = [...coins, ...coins];

  return (
    <div className="w-full bg-card/50 backdrop-blur border-b border-border/50 py-2 overflow-hidden">
      <div className="ticker-scroll flex items-center gap-8 whitespace-nowrap">
        {duplicatedCoins.map((coin, index) => (
          <div
            key={`${coin.symbol}-${index}`}
            className="flex items-center gap-2 px-3"
          >
            {/* Coin Symbol */}
            <span className="font-semibold text-sm">{coin.symbol}</span>

            {/* Price */}
            <span className="text-sm text-muted-foreground">
              ${formatPrice(coin.price)}
            </span>

            {/* Change */}
            <div
              className={cn(
                'flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded',
                coin.change24h >= 0
                  ? 'text-green-600 dark:text-green-400 bg-green-500/10'
                  : 'text-red-600 dark:text-red-400 bg-red-500/10'
              )}
            >
              {coin.change24h >= 0 ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              <span>{coin.change24h >= 0 ? '+' : ''}{coin.change24h.toFixed(2)}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
