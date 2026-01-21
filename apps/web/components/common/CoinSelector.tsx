'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ChevronDown, TrendingUp, Clock, X, AlertTriangle, RefreshCw, Flame, TrendingDown, BarChart3, Trophy } from 'lucide-react';
import { cn } from '../../lib/utils';
import { getAuthToken, authFetch } from '../../lib/api';
import { CoinIcon } from './CoinIcon';
import { AnalysisDialog } from '../analysis/AnalysisDialog';

// Smart coin suggestion from CoinGecko
interface SmartCoin {
  symbol: string;
  name: string;
  price: number;
  priceChange24h: number;
  volume24h: number;
  marketCap: number;
  marketCapRank: number;
  score?: number;
}

interface SmartCoinsData {
  trending: SmartCoin[];
  gainers: SmartCoin[];
  losers: SmartCoin[];
  highVolume: SmartCoin[];
  topMarketCap: SmartCoin[];
  updatedAt: number;
}

// Smart coin category configuration
type SmartCategory = 'trending' | 'gainers' | 'losers' | 'highVolume' | 'topMarketCap' | 'all';

const SMART_CATEGORIES: { id: SmartCategory; label: string; icon: React.ReactNode; color: string }[] = [
  { id: 'trending', label: 'Trending', icon: <Flame className="w-3.5 h-3.5" />, color: 'text-orange-500' },
  { id: 'gainers', label: 'Gainers', icon: <TrendingUp className="w-3.5 h-3.5" />, color: 'text-green-500' },
  { id: 'losers', label: 'Losers', icon: <TrendingDown className="w-3.5 h-3.5" />, color: 'text-red-500' },
  { id: 'highVolume', label: 'Volume', icon: <BarChart3 className="w-3.5 h-3.5" />, color: 'text-blue-500' },
  { id: 'topMarketCap', label: 'Top Cap', icon: <Trophy className="w-3.5 h-3.5" />, color: 'text-amber-500' },
];

// Recent analysis info for marketplace
interface RecentAnalysis {
  id: string;
  symbol: string;
  generatedAt: string;
  hoursAgo: number;
  direction?: string;
  score?: number;
  interval?: string;
  tradeType?: string;
  validityHours: number;
  canAccess?: boolean; // User already owns or has purchased
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

// Timeframe type (matches TradeTypeSelector)
type Timeframe = '5m' | '15m' | '30m' | '1h' | '2h' | '4h' | '1d' | '1W';
type TradeType = 'scalping' | 'dayTrade' | 'swing';

// Timeframe to trade type mapping
// - Scalping (1000 candles): 5m, 15m
// - Day Trade (500 candles): 30m, 1h, 2h, 4h
// - Swing Trade (250 candles): 1d, 1W
const TIMEFRAME_TO_TRADE_TYPE: Record<Timeframe, TradeType> = {
  '5m': 'scalping',
  '15m': 'scalping',
  '30m': 'dayTrade',
  '1h': 'dayTrade',
  '2h': 'dayTrade',
  '4h': 'dayTrade',
  '1d': 'swing',
  '1W': 'swing',
};

// Trade type labels
const TRADE_TYPE_LABELS: Record<TradeType, string> = {
  scalping: 'Scalping',
  dayTrade: 'Day Trade',
  swing: 'Swing Trade',
};

// Get trade type from interval (for existing analyses)
function getTradeTypeFromInterval(interval: string): TradeType | null {
  if (interval === '5m' || interval === '15m') return 'scalping';
  if (interval === '30m' || interval === '1h' || interval === '2h' || interval === '4h') return 'dayTrade';
  if (interval === '1d' || interval === '1D' || interval === '1w' || interval === '1W') return 'swing';
  return null;
}

interface CoinSelectorProps {
  timeframe?: Timeframe;
}

export function CoinSelector({ timeframe = '4h' }: CoinSelectorProps) {
  // Derive trade type from timeframe
  const tradeType = TIMEFRAME_TO_TRADE_TYPE[timeframe];
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCoin, setSelectedCoin] = useState<typeof ALL_COINS[0] | null>(null);
  const [recentCoins, setRecentCoins] = useState<string[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Marketplace analysis warning state
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [recentAnalysis, setRecentAnalysis] = useState<RecentAnalysis | null>(null);
  const [isCheckingRecent, setIsCheckingRecent] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);

  // Analysis dialog state
  const [showAnalysisDialog, setShowAnalysisDialog] = useState(false);

  // Smart coins state
  const [smartCoins, setSmartCoins] = useState<SmartCoinsData | null>(null);
  const [smartCategory, setSmartCategory] = useState<SmartCategory>('trending');
  const [isLoadingSmartCoins, setIsLoadingSmartCoins] = useState(false);

  // Fetch smart coins from API
  const fetchSmartCoins = async () => {
    if (smartCoins && Date.now() - smartCoins.updatedAt < 5 * 60 * 1000) {
      // Use cached data if less than 5 minutes old
      return;
    }

    setIsLoadingSmartCoins(true);
    try {
      const response = await authFetch('/api/smart-coins');
      const data = await response.json();
      if (data.success && data.data) {
        setSmartCoins(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch smart coins:', error);
    } finally {
      setIsLoadingSmartCoins(false);
    }
  };

  // Fetch smart coins when dropdown opens
  useEffect(() => {
    if (isOpen && !smartCoins) {
      fetchSmartCoins();
    }
  }, [isOpen]);

  // Load recent coins from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('recentCoins');
    if (stored) {
      setRecentCoins(JSON.parse(stored));
    }
  }, []);

  // Check for available analysis (from any user) for the selected coin
  const checkRecentAnalysis = async (symbol: string): Promise<RecentAnalysis | null> => {
    try {
      const token = await getAuthToken();
      if (!token) return null;

      // Use the new marketplace API to check for available analyses
      const response = await fetch(
        `/api/analysis/available?symbol=${encodeURIComponent(symbol)}&interval=${timeframe}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (!response.ok) return null;

      const data = await response.json();
      if (!data.success || !data.data?.available) return null;

      const { analysis, canAccess } = data.data;

      // Get the trade type from interval
      const analysisTradeType = getTradeTypeFromInterval(analysis.interval);

      return {
        id: analysis.id,
        symbol: analysis.symbol,
        generatedAt: analysis.createdAt,
        hoursAgo: analysis.hoursAgo,
        direction: analysis.direction,
        score: analysis.totalScore,
        interval: analysis.interval,
        tradeType: analysisTradeType || undefined,
        validityHours: analysis.validityHours,
        canAccess, // User already owns or has purchased
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

  // Filter coins based on search (handles both "BTC" and "BTCUSDT" format)
  const filteredCoins = search
    ? ALL_COINS.filter((coin) => {
        const searchLower = search.toLowerCase().replace('usdt', '');
        const symbolLower = coin.symbol.toLowerCase();
        const nameLower = coin.name.toLowerCase();
        return (
          symbolLower.includes(searchLower) ||
          searchLower.includes(symbolLower) ||
          nameLower.includes(searchLower)
        );
      })
    : ALL_COINS;

  // Get recent coin objects
  const recentCoinObjects = recentCoins
    .map(symbol => ALL_COINS.find(c => c.symbol === symbol))
    .filter(Boolean) as typeof ALL_COINS;

  const handleSelect = async (coin: typeof ALL_COINS[0]) => {
    setSelectedCoin(coin);
    setIsOpen(false);
    setSearch('');

    // Update recent coins
    const updated = [coin.symbol, ...recentCoins.filter(s => s !== coin.symbol)].slice(0, 5);
    setRecentCoins(updated);
    localStorage.setItem('recentCoins', JSON.stringify(updated));

    // Auto-trigger analysis after selection
    setIsCheckingRecent(true);
    const recent = await checkRecentAnalysis(coin.symbol);
    setIsCheckingRecent(false);

    if (recent && recent.hoursAgo < recent.validityHours) {
      // Show warning for recent analysis (still valid within 3 candles)
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
    setPurchaseError(null);
  };

  // Purchase an existing analysis from the marketplace
  const handlePurchaseAnalysis = async () => {
    if (!recentAnalysis) return;

    // If user already has access, just navigate
    if (recentAnalysis.canAccess) {
      setShowDuplicateWarning(false);
      router.push(`/analyze/details/${recentAnalysis.id}`);
      return;
    }

    setIsPurchasing(true);
    setPurchaseError(null);

    try {
      const token = await getAuthToken();
      if (!token) {
        setPurchaseError('Please log in to purchase analysis');
        return;
      }

      const response = await fetch(`/api/analysis/${recentAnalysis.id}/purchase`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        if (data.error?.code === 'INSUFFICIENT_CREDITS') {
          setPurchaseError(`Insufficient credits. You need ${data.error.required} credits (you have ${data.error.available}).`);
        } else {
          setPurchaseError(data.error?.message || 'Failed to purchase analysis');
        }
        return;
      }

      // Purchase successful, navigate to analysis
      setShowDuplicateWarning(false);
      router.push(`/analyze/details/${recentAnalysis.id}`);
    } catch (error) {
      console.error('Purchase error:', error);
      setPurchaseError('Failed to purchase analysis. Please try again.');
    } finally {
      setIsPurchasing(false);
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
            <span className="text-muted-foreground">Select a coin</span>
          )}
          <ChevronDown className={cn("w-5 h-5 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
        </button>

        {/* Dropdown Panel */}
        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-card border rounded-lg shadow-2xl z-[200]">
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

            <div className="max-h-[400px] overflow-y-auto">
              {/* Smart Coins Category Tabs */}
              {!search && (
                <div className="p-2 border-b bg-muted/30">
                  <div className="flex items-center gap-1 overflow-x-auto pb-1">
                    {SMART_CATEGORIES.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => {
                          setSmartCategory(cat.id);
                          if (!smartCoins) fetchSmartCoins();
                        }}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all",
                          smartCategory === cat.id
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "bg-background hover:bg-muted text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <span className={smartCategory === cat.id ? 'text-primary-foreground' : cat.color}>
                          {cat.icon}
                        </span>
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Smart Coins List */}
              {!search && (smartCoins || isLoadingSmartCoins) && smartCategory !== 'all' && (
                <div className="p-2 border-b">
                  {isLoadingSmartCoins || !smartCoins ? (
                    <div className="flex items-center justify-center py-4 text-muted-foreground">
                      <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                      Loading...
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {(smartCoins[smartCategory] || []).slice(0, 8).map((coin) => {
                        const coinData = ALL_COINS.find(c => c.symbol === coin.symbol) || {
                          symbol: coin.symbol,
                          name: coin.name,
                          icon: '●',
                          popular: false
                        };
                        return (
                          <button
                            key={coin.symbol}
                            onClick={() => handleSelect(coinData)}
                            className={cn(
                              "w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent transition-colors",
                              selectedCoin?.symbol === coin.symbol && "bg-primary/10"
                            )}
                          >
                            <CoinIcon symbol={coin.symbol} size={24} />
                            <div className="flex-1 text-left min-w-0">
                              <div className="font-medium text-sm">{coin.symbol}</div>
                              <div className="text-xs text-muted-foreground truncate">{coin.name}</div>
                            </div>
                            {/* Price change badge */}
                            {coin.priceChange24h !== 0 && (
                              <span className={cn(
                                "text-xs font-medium px-2 py-0.5 rounded-full",
                                coin.priceChange24h > 0
                                  ? "bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400"
                                  : "bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400"
                              )}>
                                {coin.priceChange24h > 0 ? '+' : ''}{coin.priceChange24h.toFixed(1)}%
                              </span>
                            )}
                            {/* Rank for top market cap */}
                            {smartCategory === 'topMarketCap' && coin.marketCapRank && (
                              <span className="text-xs text-muted-foreground">#{coin.marketCapRank}</span>
                            )}
                          </button>
                        );
                      })}
                      {(smartCoins[smartCategory] || []).length === 0 && (
                        <div className="text-center py-4 text-sm text-muted-foreground">
                          No coins in this category
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

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

              {/* Popular Coins - only show if no smart coins AND not loading */}
              {!search && !smartCoins && !isLoadingSmartCoins && (
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

              {/* All Coins List - Only show when searching OR when no smart coins data */}
              {(search || !smartCoins) && (
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
              )}
            </div>
          </div>
        )}
      </div>

      {/* Loading indicator when checking for recent analysis */}
      {isCheckingRecent && (
        <div className="flex items-center justify-center gap-2 py-3 text-slate-600 dark:text-slate-300">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span className="text-sm">Checking recent analyses...</span>
        </div>
      )}

      {/* Duplicate Analysis Warning Modal */}
      {showDuplicateWarning && recentAnalysis && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm isolate">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200 relative z-[101]">
            {/* Warning Header */}
            <div className="bg-emerald-500 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Analysis Available</h3>
                  <p className="text-sm text-white/80">
                    A recent {recentAnalysis.tradeType ? TRADE_TYPE_LABELS[recentAnalysis.tradeType as TradeType] : ''} analysis exists
                  </p>
                </div>
              </div>
            </div>

            {/* Warning Content */}
            <div className="p-6">
              <div className="mb-4">
                <div className="flex items-center gap-3 mb-4">
                  <CoinIcon symbol={recentAnalysis.symbol} size={40} />
                  <div className="flex-1">
                    <div className="font-semibold text-lg">{recentAnalysis.symbol}/USDT</div>
                    <div className="text-sm text-muted-foreground">
                      Analyzed {recentAnalysis.hoursAgo < 1
                        ? `${Math.round(recentAnalysis.hoursAgo * 60)} minutes ago`
                        : `${recentAnalysis.hoursAgo.toFixed(1)} hours ago`
                      }
                    </div>
                  </div>
                  {/* Validity Badge */}
                  <div className="text-center px-3 py-1.5 bg-emerald-100 dark:bg-emerald-500/20 rounded-lg border border-emerald-300 dark:border-emerald-500/30">
                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Valid for</div>
                    <div className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                      {(() => {
                        const remainingHours = recentAnalysis.validityHours - recentAnalysis.hoursAgo;
                        if (remainingHours < 1) {
                          return `${Math.round(remainingHours * 60)}m`;
                        } else if (remainingHours < 24) {
                          return `${remainingHours.toFixed(1)}h`;
                        } else {
                          return `${(remainingHours / 24).toFixed(1)}d`;
                        }
                      })()}
                    </div>
                  </div>
                </div>

                {/* Previous Analysis Info */}
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Trade Type:</span>
                    <span className="font-medium px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400">
                      {recentAnalysis.tradeType ? TRADE_TYPE_LABELS[recentAnalysis.tradeType as TradeType] : recentAnalysis.interval || 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Direction:</span>
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
                      <span className="text-muted-foreground">Score:</span>
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
                </div>

                {/* Pricing Info */}
                <div className="mt-4 p-3 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-500/10 dark:to-green-500/10 rounded-lg border border-emerald-200 dark:border-emerald-500/20">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-emerald-700 dark:text-emerald-300 font-medium">Use existing analysis</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">15 credits</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-muted-foreground">New analysis</span>
                    <span className="text-muted-foreground">25 credits</span>
                  </div>
                  <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 text-center font-medium">
                    Save 10 credits!
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                {/* Primary: View Existing Analysis */}
                {/* Error message */}
                {purchaseError && (
                  <div className="mb-3 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg">
                    <p className="text-sm text-red-600 dark:text-red-400">{purchaseError}</p>
                  </div>
                )}

                {/* Primary: Use Existing Analysis (purchase if needed) */}
                <button
                  onClick={handlePurchaseAnalysis}
                  disabled={isPurchasing}
                  className={cn(
                    "w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold transition",
                    "bg-gradient-to-r from-emerald-500 to-green-500 text-white",
                    "hover:from-emerald-600 hover:to-green-600 shadow-lg shadow-emerald-500/25",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                >
                  {isPurchasing ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      Purchasing...
                    </>
                  ) : recentAnalysis.canAccess ? (
                    <>
                      <TrendingUp className="w-5 h-5" />
                      View Analysis
                      <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">Free</span>
                    </>
                  ) : (
                    <>
                      <TrendingUp className="w-5 h-5" />
                      Use Existing Analysis
                      <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">15 credits</span>
                    </>
                  )}
                </button>

                {/* Secondary: Analyze Anyway */}
                <div className="flex gap-2">
                  <button
                    onClick={handleCancelAnalysis}
                    className="flex-1 px-4 py-2.5 border border-border rounded-lg font-medium text-muted-foreground hover:bg-muted transition text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleProceedAnyway}
                    className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 border border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 rounded-lg font-medium text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-500/20 transition text-sm"
                  >
                    <RefreshCw className="w-4 h-4" />
                    New (25 cr)
                  </button>
                </div>
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
          timeframe={timeframe}
          onComplete={handleAnalysisComplete}
        />
      )}
    </div>
  );
}
