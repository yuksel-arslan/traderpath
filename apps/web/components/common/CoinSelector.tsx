'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ChevronDown, TrendingUp, Clock, X, AlertTriangle, RefreshCw } from 'lucide-react';
import { cn } from '../../lib/utils';
import { getAuthToken } from '../../lib/api';
import { CoinIcon } from './CoinIcon';
import { AnalysisDialog } from '../analysis/AnalysisDialog';

// Recent analysis info for duplicate warning
interface RecentAnalysis {
  symbol: string;
  generatedAt: string;
  hoursAgo: number;
  direction?: string;
  score?: number;
  interval?: string;
  tradeType?: string;
}

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

// Minimum hours between analyses for the same coin (to avoid unnecessary duplicates)
const MIN_HOURS_BETWEEN_ANALYSES = 4;

// Trade type definition
type TradeType = 'scalping' | 'dayTrade' | 'swing';

// Trade type to interval mapping
const TRADE_TYPE_INTERVALS: Record<TradeType, string[]> = {
  scalping: ['5m', '15m'],
  dayTrade: ['1h', '4h'],
  swing: ['1d', '1D'],
};

// Trade type labels
const TRADE_TYPE_LABELS: Record<TradeType, string> = {
  scalping: 'Scalping',
  dayTrade: 'Day Trade',
  swing: 'Swing',
};

// Get trade type from interval
function getTradeTypeFromInterval(interval: string): TradeType | null {
  if (interval === '5m' || interval === '15m') return 'scalping';
  if (interval === '1h' || interval === '4h') return 'dayTrade';
  if (interval === '1d' || interval === '1D') return 'swing';
  return null;
}

interface CoinSelectorProps {
  tradeType?: TradeType;
}

export function CoinSelector({ tradeType = 'dayTrade' }: CoinSelectorProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCoin, setSelectedCoin] = useState<typeof ALL_COINS[0] | null>(null);
  const [recentCoins, setRecentCoins] = useState<string[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Duplicate analysis warning state
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [recentAnalysis, setRecentAnalysis] = useState<RecentAnalysis | null>(null);
  const [isCheckingRecent, setIsCheckingRecent] = useState(false);

  // Analysis dialog state
  const [showAnalysisDialog, setShowAnalysisDialog] = useState(false);

  // Load recent coins from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('recentCoins');
    if (stored) {
      setRecentCoins(JSON.parse(stored));
    }
  }, []);

  // Check for recent analysis of selected coin with same timeframe
  const checkRecentAnalysis = async (symbol: string): Promise<RecentAnalysis | null> => {
    try {
      const token = await getAuthToken();
      if (!token) return null;

      // Fetch from analysis history instead of reports
      const response = await fetch(`/api/analysis/history?limit=20`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) return null;

      const data = await response.json();
      if (!data.success || !data.data?.analyses) return null;

      // Get intervals for current trade type
      const currentIntervals = TRADE_TYPE_INTERVALS[tradeType];

      // Find the most recent analysis for this symbol with the same timeframe
      const recentAnalysis = data.data.analyses.find(
        (a: { symbol: string; interval: string }) =>
          a.symbol.toUpperCase() === symbol.toUpperCase() &&
          currentIntervals.includes(a.interval)
      );

      if (!recentAnalysis) return null;

      const generatedAt = new Date(recentAnalysis.createdAt);
      const now = new Date();
      const hoursAgo = (now.getTime() - generatedAt.getTime()) / (1000 * 60 * 60);

      // Get the trade type from interval
      const analysisTradeType = getTradeTypeFromInterval(recentAnalysis.interval);

      return {
        symbol: recentAnalysis.symbol,
        generatedAt: recentAnalysis.createdAt,
        hoursAgo,
        direction: recentAnalysis.direction,
        score: recentAnalysis.totalScore,
        interval: recentAnalysis.interval,
        tradeType: analysisTradeType || undefined,
      };
    } catch (error) {
      console.error('Failed to check recent analysis:', error);
      return null;
    }
  };

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

  const handleAnalyze = async () => {
    if (!selectedCoin) return;

    setIsCheckingRecent(true);

    // Check for recent analysis of this coin
    const recent = await checkRecentAnalysis(selectedCoin.symbol);

    setIsCheckingRecent(false);

    if (recent && recent.hoursAgo < MIN_HOURS_BETWEEN_ANALYSES) {
      // Show warning for recent analysis
      setRecentAnalysis(recent);
      setShowDuplicateWarning(true);
    } else {
      // No recent analysis, show analysis dialog
      setShowAnalysisDialog(true);
    }
  };

  const handleProceedAnyway = () => {
    if (selectedCoin) {
      setShowDuplicateWarning(false);
      // Show analysis dialog instead of navigating
      setShowAnalysisDialog(true);
    }
  };

  const handleDialogClose = () => {
    setShowAnalysisDialog(false);
  };

  const handleAnalysisComplete = () => {
    // Optionally navigate to reports page after completion
    // router.push('/reports');
  };

  const handleCancelAnalysis = () => {
    setShowDuplicateWarning(false);
    setRecentAnalysis(null);
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
        disabled={!selectedCoin || isCheckingRecent}
        className="w-full py-3.5 px-4 bg-slate-200 dark:bg-slate-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:scale-[1.02] transition-all border border-slate-300 dark:border-slate-600"
      >
        {isCheckingRecent ? (
          <span className="flex items-center justify-center gap-2 text-slate-600 dark:text-slate-300 font-medium">
            <RefreshCw className="w-5 h-5 animate-spin" />
            Checking...
          </span>
        ) : selectedCoin ? (
          <span className="flex items-center justify-center gap-2 gradient-text-rg-animate font-semibold">
            <TrendingUp className="w-5 h-5" />
            Start {selectedCoin.symbol} Analysis
          </span>
        ) : (
          <span className="text-slate-500 dark:text-slate-400 font-medium">Select a coin to analyze</span>
        )}
      </button>

      {/* Duplicate Analysis Warning Modal */}
      {showDuplicateWarning && recentAnalysis && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Warning Header */}
            <div className="bg-amber-500 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Recently Analyzed</h3>
                  <p className="text-sm text-white/80">
                    This coin was already analyzed for {recentAnalysis.tradeType ? TRADE_TYPE_LABELS[recentAnalysis.tradeType as TradeType] : 'this timeframe'}
                  </p>
                </div>
              </div>
            </div>

            {/* Warning Content */}
            <div className="p-6">
              <div className="mb-4">
                <div className="flex items-center gap-3 mb-4">
                  <CoinIcon symbol={recentAnalysis.symbol} size={40} />
                  <div>
                    <div className="font-semibold text-lg">{recentAnalysis.symbol}/USDT</div>
                    <div className="text-sm text-muted-foreground">
                      Analyzed {recentAnalysis.hoursAgo < 1
                        ? `${Math.round(recentAnalysis.hoursAgo * 60)} minutes ago`
                        : `${recentAnalysis.hoursAgo.toFixed(1)} hours ago`
                      }
                      {recentAnalysis.interval && ` (${recentAnalysis.interval})`}
                    </div>
                  </div>
                </div>

                {/* Previous Analysis Info */}
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Timeframe:</span>
                    <span className="font-medium px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400">
                      {recentAnalysis.tradeType ? TRADE_TYPE_LABELS[recentAnalysis.tradeType as TradeType] : recentAnalysis.interval || 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Previous Direction:</span>
                    <span className={cn(
                      "font-medium px-2 py-0.5 rounded",
                      recentAnalysis.direction === 'long'
                        ? 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400'
                        : 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400'
                    )}>
                      {recentAnalysis.direction?.toUpperCase() || 'N/A'}
                    </span>
                  </div>
                  {recentAnalysis.score && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Previous Score:</span>
                      <span className={cn(
                        "font-medium px-2 py-0.5 rounded",
                        (recentAnalysis.score * 10) >= 70 ? 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400' :
                        (recentAnalysis.score * 10) >= 50 ? 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400' :
                        'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400'
                      )}>
                        {(recentAnalysis.score * 10).toFixed(0)}%
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Date:</span>
                    <span className="font-medium text-foreground">
                      {new Date(recentAnalysis.generatedAt).toLocaleString('en-US', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>

                <p className="mt-4 text-sm text-muted-foreground">
                  If market conditions haven&apos;t changed significantly, you can use the existing analysis.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleCancelAnalysis}
                  className="flex-1 px-4 py-2.5 border border-border rounded-lg font-medium text-foreground hover:bg-muted transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleProceedAnyway}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition",
                    "bg-gradient-to-r from-amber-500 to-orange-500 text-white",
                    "hover:from-amber-600 hover:to-orange-600"
                  )}
                >
                  <RefreshCw className="w-4 h-4" />
                  Analyze Anyway
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Analysis Dialog */}
      {selectedCoin && (
        <AnalysisDialog
          isOpen={showAnalysisDialog}
          onClose={handleDialogClose}
          symbol={selectedCoin.symbol}
          coinName={selectedCoin.name}
          tradeType={tradeType}
          onComplete={handleAnalysisComplete}
        />
      )}
    </div>
  );
}
