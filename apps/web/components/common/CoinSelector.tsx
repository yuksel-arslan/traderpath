'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ChevronDown, Star, TrendingUp, Clock, X, Sparkles, Zap } from 'lucide-react';
import { cn } from '../../lib/utils';

// Coin data with more details
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
        {/* Trigger Button */}
        <button
          onClick={() => {
            setIsOpen(!isOpen);
            setTimeout(() => inputRef.current?.focus(), 100);
          }}
          className={cn(
            "w-full flex items-center justify-between gap-3 px-4 py-4 bg-muted/30 border-2 rounded-xl transition-all",
            isOpen ? "border-primary ring-4 ring-primary/10" : "border-border/50 hover:border-primary/30 hover:bg-muted/50",
            selectedCoin && "bg-gradient-to-r from-primary/5 to-transparent"
          )}
        >
          {selectedCoin ? (
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl flex items-center justify-center text-2xl shadow-inner">
                {selectedCoin.icon}
              </div>
              <div className="text-left">
                <div className="font-bold text-lg">{selectedCoin.symbol}<span className="text-muted-foreground font-normal">/USDT</span></div>
                <div className="text-sm text-muted-foreground">{selectedCoin.name}</div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-muted-foreground">
              <div className="w-12 h-12 bg-muted/50 rounded-xl flex items-center justify-center">
                <Search className="w-5 h-5" />
              </div>
              <div className="text-left">
                <div className="font-medium">Search trading pair</div>
                <div className="text-sm">Type to search 30+ coins</div>
              </div>
            </div>
          )}
          <ChevronDown className={cn(
            "w-5 h-5 text-muted-foreground transition-transform duration-200",
            isOpen && "rotate-180"
          )} />
        </button>

        {/* Dropdown Panel */}
        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border/50 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Search Input */}
            <div className="p-4 border-b border-border/50 bg-muted/30">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  ref={inputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search by name or symbol..."
                  className="w-full pl-11 pr-11 py-3 bg-background border border-border/50 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none text-sm transition-all"
                  autoFocus
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {/* Recent Searches */}
              {!search && recentCoinObjects.length > 0 && (
                <div className="p-4 border-b border-border/50">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-3">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Recently Analyzed</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recentCoinObjects.map((coin) => (
                      <button
                        key={coin.symbol}
                        onClick={() => handleSelect(coin)}
                        className="flex items-center gap-2 px-3 py-2 bg-muted/50 hover:bg-primary/10 hover:border-primary/30 border border-transparent rounded-lg text-sm transition-all group"
                      >
                        <span className="text-lg">{coin.icon}</span>
                        <span className="font-medium group-hover:text-primary transition-colors">{coin.symbol}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Popular Coins */}
              {!search && (
                <div className="p-4 border-b border-border/50">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-3">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Popular Coins</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {POPULAR_COINS.map((coin) => (
                      <button
                        key={coin.symbol}
                        onClick={() => handleSelect(coin)}
                        className={cn(
                          "flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all hover:scale-105",
                          selectedCoin?.symbol === coin.symbol
                            ? "bg-primary/10 ring-2 ring-primary shadow-lg"
                            : "bg-muted/30 hover:bg-muted/60"
                        )}
                      >
                        <span className="text-2xl">{coin.icon}</span>
                        <span className="text-xs font-semibold">{coin.symbol}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* All Coins List */}
              <div className="p-3">
                {!search && (
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground px-2 py-2 mb-1">
                    <Star className="w-3.5 h-3.5" />
                    <span>All Coins ({ALL_COINS.length})</span>
                  </div>
                )}
                {filteredCoins.length > 0 ? (
                  <div className="space-y-1">
                    {filteredCoins.map((coin) => (
                      <button
                        key={coin.symbol}
                        onClick={() => handleSelect(coin)}
                        className={cn(
                          "w-full flex items-center gap-4 px-3 py-3 rounded-xl transition-all group",
                          selectedCoin?.symbol === coin.symbol
                            ? "bg-primary/10 border border-primary/30"
                            : "hover:bg-muted/50 border border-transparent"
                        )}
                      >
                        <div className="w-10 h-10 bg-muted/50 rounded-lg flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                          {coin.icon}
                        </div>
                        <div className="flex-1 text-left">
                          <div className="font-semibold group-hover:text-primary transition-colors">{coin.symbol}</div>
                          <div className="text-xs text-muted-foreground">{coin.name}</div>
                        </div>
                        <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">/USDT</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <Search className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
                    <p className="text-sm font-medium text-muted-foreground">No coins found</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">Try a different search term</p>
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
        className={cn(
          "w-full py-4 px-6 rounded-xl font-semibold transition-all duration-300 relative overflow-hidden group",
          selectedCoin
            ? "bg-gradient-to-r from-slate-200 to-slate-100 dark:from-slate-700 dark:to-slate-800 hover:shadow-xl hover:scale-[1.02] border border-slate-300 dark:border-slate-600"
            : "bg-muted/50 text-muted-foreground cursor-not-allowed border border-border/50"
        )}
      >
        {selectedCoin ? (
          <span className="flex items-center justify-center gap-3">
            <Zap className="w-5 h-5 gradient-text-rg-animate" />
            <span className="gradient-text-rg-animate text-lg">
              Analyze {selectedCoin.symbol}
            </span>
            <Sparkles className="w-5 h-5 gradient-text-rg-animate" />
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <Search className="w-5 h-5" />
            <span>Select a coin to analyze</span>
          </span>
        )}
      </button>
    </div>
  );
}
