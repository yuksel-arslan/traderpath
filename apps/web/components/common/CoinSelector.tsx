'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const COINS = [
  { symbol: 'BTC', name: 'Bitcoin', icon: '₿' },
  { symbol: 'ETH', name: 'Ethereum', icon: 'Ξ' },
  { symbol: 'SOL', name: 'Solana', icon: '◎' },
  { symbol: 'BNB', name: 'BNB', icon: '⬡' },
  { symbol: 'XRP', name: 'Ripple', icon: '✕' },
  { symbol: 'ADA', name: 'Cardano', icon: '₳' },
  { symbol: 'DOGE', name: 'Dogecoin', icon: 'Ð' },
  { symbol: 'AVAX', name: 'Avalanche', icon: '▲' },
  { symbol: 'DOT', name: 'Polkadot', icon: '●' },
  { symbol: 'MATIC', name: 'Polygon', icon: '⬡' },
];

export function CoinSelector() {
  const router = useRouter();
  const [selectedCoin, setSelectedCoin] = useState<string | null>(null);

  const handleCoinSelect = (symbol: string) => {
    setSelectedCoin(symbol);
  };

  const handleAnalyze = () => {
    if (selectedCoin) {
      router.push(`/analyze/${selectedCoin}`);
    }
  };

  return (
    <div className="bg-card rounded-lg border p-6">
      <div className="grid grid-cols-5 gap-3 mb-6">
        {COINS.map((coin) => (
          <button
            key={coin.symbol}
            onClick={() => handleCoinSelect(coin.symbol)}
            className={`p-4 rounded-lg border-2 transition-all hover:border-primary ${
              selectedCoin === coin.symbol
                ? 'border-primary bg-primary/10'
                : 'border-border hover:bg-accent'
            }`}
          >
            <div className="text-2xl mb-1">{coin.icon}</div>
            <div className="font-semibold">{coin.symbol}</div>
            <div className="text-xs text-muted-foreground">{coin.name}</div>
          </button>
        ))}
      </div>

      <button
        onClick={handleAnalyze}
        disabled={!selectedCoin}
        className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
      >
        {selectedCoin ? `Analyze ${selectedCoin}` : 'Select a coin to analyze'}
      </button>
    </div>
  );
}
