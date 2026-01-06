'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ChevronDown, TrendingUp, Clock, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { CoinIcon } from './CoinIcon';

// Coin data
const ALL_COINS = [
  { symbol: 'BTC', name: 'Bitcoin', icon: '₿', popular: true },
  { symbol: 'ETH', name: 'Ethereum', icon: 'Ξ', popular: true },
  { symbol: 'BNB', name: 'BNB', icon: '⬡', popular: true },
  { symbol: 'SOL', name: 'Solana', icon: '◎', popular: true },
  { symbol: 'XRP', name: 'XRP', icon: '✕', popular: true },
  { symbol: 'ADA', name: 'Cardano', icon: '₳', popular: true },
  { symbol: 'DOGE', name: 'Dogecoin', icon: 'Ð', popular: true },
  { symbol: 'AVAX', name: 'Avalanche', icon: '▲', popular: true },
  { symbol: 'DOT', name: 'Polkadot', icon: '●', popular: false },
  { symbol: 'MATIC', name: 'Polygon', icon: '⬡', popular: false },
  { symbol: 'LINK', name: 'Chainlink', icon: '⬢', popular: false },
  { symbol: 'UNI', name: 'Uniswap', icon: '🦄', popular: false },
  { symbol: 'ATOM', name: 'Cosmos', icon: '⚛', popular: false },
  { symbol: 'LTC', name: 'Litecoin', icon: 'Ł', popular: false },
  { symbol: 'FIL', name: 'Filecoin', icon: '⨎', popular: false },
  { symbol: 'NEAR', name: 'NEAR Protocol', icon: 'Ⓝ', popular: false },
  { symbol: 'APT', name: 'Aptos', icon: '◆', popular: false },
  { symbol: 'ARB', name: 'Arbitrum', icon: '◇', popular: false },
  { symbol: 'OP', name: 'Optimism', icon: '⭕', popular: false },
  { symbol: 'INJ', name: 'Injective', icon: '💉', popular: false },
  { symbol: 'SUI', name: 'Sui', icon: '💧', popular: false },
  { symbol: 'SEI', name: 'Sei', icon: '🌊', popular: false },
  { symbol: 'TIA', name: 'Celestia', icon: '☀', popular: false },
  { symbol: 'PEPE', name: 'Pepe', icon: '🐸', popular: false },
  { symbol: 'SHIB', name: 'Shiba Inu', icon: '🐕', popular: false },
  { symbol: 'WIF', name: 'dogwifhat', icon: '🎩', popular: false },
  { symbol: 'BONK', name: 'Bonk', icon: '🦴', popular: false },
  { symbol: 'RENDER', name: 'Render', icon: '🖼', popular: false },
  { symbol: 'FET', name: 'Fetch.ai', icon: '🤖', popular: false },
  { symbol: 'RNDR', name: 'Render Token', icon: '🎨', popular: false },
];

const POPULAR_COINS = ALL_COINS.filter(c => c.popular);

export function CoinSelector() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCoin, setSelectedCoin] = useState<typeof ALL_COINS[0] | null>(null);
  const [recentCoins, setRecentCoins] = useState<string[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load recent coins from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('recentCoins');
    if (stored) {
      setRecentCoins(JSON.parse(stored));
    }
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter coins based on search
  const filteredCoins = search
    ? ALL_COINS.filter(
        (coin) =>
          coin.symbol.toLowerCase().includes(search.toLowerCase()) ||
          coin.name.toLowerCase().includes(search.toLowerCase())
      )
    : ALL_COINS;

  // Get recent coin objects
  const recentCoinObjects = recentCoins
    .map(symbol => ALL_COINS.find(c => c.symbol === symbol))
    .filter(Boolean) as typeof ALL_COINS;

  const handleSelect = (coin: typeof ALL_COINS[0]) => {
    setSelectedCoin(coin);
    setIsOpen(false);
    setSearch('');

    // Update recent coins
    const updated = [coin.symbol, ...recentCoins.filter(s => s !== coin.symbol)].slice(0, 5);
    setRecentCoins(updated);
    localStorage.setItem('recentCoins', JSON.stringify(updated));
  };

  const handleAnalyze = () => {
    if (selectedCoin) {
      router.push(`/analyze/${selectedCoin.symbol}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && filteredCoins.length > 0) {
      handleSelect(filteredCoins[0]);
    }
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Dropdown Selector */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => {
            setIsOpen(!isOpen);
            setTimeout(() => inputRef.current?.focus(), 100);
          }}
          className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-background border-2 border-border rounded-lg hover:border-primary/50 transition-colors"
        >
          {selectedCoin ? (
            <div className="flex items-center gap-3">
              <CoinIcon symbol={selectedCoin.symbol} size={32} />
              <div className="text-left">
                <div className="font-semibold">{selectedCoin.symbol}/USDT</div>
                <div className="text-sm text-muted-foreground">{selectedCoin.name}</div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-muted-foreground">
              <Search className="w-5 h-5" />
              <span>Search coin...</span>
            </div>
          )}
          <ChevronDown className={cn("w-5 h-5 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
        </button>

        {/* Dropdown Panel */}
        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-card border rounded-lg shadow-xl z-50 overflow-hidden">
            {/* Search Input */}
            <div className="p-3 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  ref={inputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search by name or symbol..."
                  className="w-full pl-10 pr-10 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm"
                  autoFocus
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {/* Recent Searches */}
              {!search && recentCoinObjects.length > 0 && (
                <div className="p-3 border-b">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <Clock className="w-3 h-3" />
                    <span>Recent</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recentCoinObjects.map((coin) => (
                      <button
                        key={coin.symbol}
                        onClick={() => handleSelect(coin)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/50 hover:bg-muted rounded-full text-sm transition-colors"
                      >
                        <CoinIcon symbol={coin.symbol} size={16} />
                        <span className="font-medium">{coin.symbol}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Popular Coins */}
              {!search && (
                <div className="p-3 border-b">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <TrendingUp className="w-3 h-3" />
                    <span>Popular</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {POPULAR_COINS.map((coin) => (
                      <button
                        key={coin.symbol}
                        onClick={() => handleSelect(coin)}
                        className={cn(
                          "flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-accent transition-colors",
                          selectedCoin?.symbol === coin.symbol && "bg-primary/10 ring-1 ring-primary"
                        )}
                      >
                        <CoinIcon symbol={coin.symbol} size={28} />
                        <span className="text-xs font-medium">{coin.symbol}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* All Coins List */}
              <div className="p-2">
                {filteredCoins.length > 0 ? (
                  <div className="space-y-0.5">
                    {filteredCoins.map((coin) => (
                      <button
                        key={coin.symbol}
                        onClick={() => handleSelect(coin)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent transition-colors",
                          selectedCoin?.symbol === coin.symbol && "bg-primary/10"
                        )}
                      >
                        <CoinIcon symbol={coin.symbol} size={28} />
                        <div className="flex-1 text-left">
                          <div className="font-medium">{coin.symbol}</div>
                          <div className="text-xs text-muted-foreground">{coin.name}</div>
                        </div>
                        <span className="text-xs text-muted-foreground">/USDT</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No coins found for "{search}"</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Analyze Button */}
      <button
        onClick={handleAnalyze}
        disabled={!selectedCoin}
        className="w-full py-3.5 px-4 bg-slate-200 dark:bg-slate-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:scale-[1.02] transition-all border border-slate-300 dark:border-slate-600"
      >
        {selectedCoin ? (
          <span className="flex items-center justify-center gap-2 gradient-text-rg-animate font-semibold">
            <TrendingUp className="w-5 h-5" />
            Start {selectedCoin.symbol} Analysis
          </span>
        ) : (
          <span className="text-slate-500 dark:text-slate-400 font-medium">Select a coin to analyze</span>
        )}
      </button>
    </div>
  );
}
