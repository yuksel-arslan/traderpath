'use client';

// ===========================================
// TAILORED ANALYSIS PAGE
// User picks any asset (no AI-recommendation gate), selects timeframe, runs analysis.
// ===========================================

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import {
  Search,
  Target,
  TrendingUp,
  TrendingDown,
  Minus,
  Zap,
  Loader2,
  Shield,
  RefreshCw,
  X,
  Coins,
  BarChart3,
  Landmark,
  Gem,
  Building2,
  Activity,
  Sparkles,
  ArrowLeft,
} from 'lucide-react';
import { cn } from '../../../../lib/utils';
import { authFetch, getAuthToken, getApiUrl } from '../../../../lib/api';
import Link from 'next/link';
import type { Timeframe } from '../../../../components/analysis/TradeTypeSelector';

// Lazy load
const CoinIcon = dynamic(
  () => import('../../../../components/common/CoinIcon').then(mod => ({ default: mod.CoinIcon })),
  { ssr: false, loading: () => <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" /> }
);

const AnalysisDialog = dynamic(
  () => import('../../../../components/analysis/AnalysisDialog').then(mod => ({ default: mod.AnalysisDialog })),
  { ssr: false }
);

import { RecentAnalysesMobile } from '../../../../components/analyze/RecentAnalysesMobile';

// Types
type TradeType = 'scalping' | 'dayTrade' | 'swing';
type AssetCategory = 'all' | 'crypto' | 'stocks' | 'metals' | 'bonds' | 'bist';

interface AssetItem {
  symbol: string;
  name: string;
  category: AssetCategory;
}

interface RecentAnalysis {
  id: string;
  symbol: string;
  verdict: 'go' | 'conditional_go' | 'wait' | 'avoid';
  score: number | null;
  direction: string | null;
  tradeType?: TradeType;
  method?: string;
  createdAt: string;
  outcome?: 'correct' | 'incorrect' | 'pending' | null;
  entryPrice?: number;
  currentPrice?: number;
  unrealizedPnL?: number;
  stopLoss?: number;
  takeProfit1?: number;
  tpProgress?: number;
  hasTradePlan?: boolean;
  expiresAt?: string;
}

// Built-in asset catalog organized by category
const ASSET_CATALOG: AssetItem[] = [
  // Crypto - Top 30
  { symbol: 'BTC', name: 'Bitcoin', category: 'crypto' },
  { symbol: 'ETH', name: 'Ethereum', category: 'crypto' },
  { symbol: 'BNB', name: 'BNB', category: 'crypto' },
  { symbol: 'SOL', name: 'Solana', category: 'crypto' },
  { symbol: 'XRP', name: 'Ripple', category: 'crypto' },
  { symbol: 'ADA', name: 'Cardano', category: 'crypto' },
  { symbol: 'DOGE', name: 'Dogecoin', category: 'crypto' },
  { symbol: 'AVAX', name: 'Avalanche', category: 'crypto' },
  { symbol: 'DOT', name: 'Polkadot', category: 'crypto' },
  { symbol: 'MATIC', name: 'Polygon', category: 'crypto' },
  { symbol: 'LINK', name: 'Chainlink', category: 'crypto' },
  { symbol: 'UNI', name: 'Uniswap', category: 'crypto' },
  { symbol: 'ATOM', name: 'Cosmos', category: 'crypto' },
  { symbol: 'LTC', name: 'Litecoin', category: 'crypto' },
  { symbol: 'FIL', name: 'Filecoin', category: 'crypto' },
  { symbol: 'NEAR', name: 'NEAR Protocol', category: 'crypto' },
  { symbol: 'ARB', name: 'Arbitrum', category: 'crypto' },
  { symbol: 'OP', name: 'Optimism', category: 'crypto' },
  { symbol: 'APT', name: 'Aptos', category: 'crypto' },
  { symbol: 'SUI', name: 'Sui', category: 'crypto' },
  { symbol: 'PEPE', name: 'Pepe', category: 'crypto' },
  { symbol: 'SHIB', name: 'Shiba Inu', category: 'crypto' },
  { symbol: 'AAVE', name: 'Aave', category: 'crypto' },
  { symbol: 'FET', name: 'Fetch.ai', category: 'crypto' },
  { symbol: 'RNDR', name: 'Render', category: 'crypto' },
  { symbol: 'INJ', name: 'Injective', category: 'crypto' },
  { symbol: 'TIA', name: 'Celestia', category: 'crypto' },
  { symbol: 'SEI', name: 'Sei', category: 'crypto' },
  { symbol: 'WIF', name: 'Dogwifhat', category: 'crypto' },
  { symbol: 'BONK', name: 'Bonk', category: 'crypto' },
  // Stocks
  { symbol: 'AAPL', name: 'Apple', category: 'stocks' },
  { symbol: 'MSFT', name: 'Microsoft', category: 'stocks' },
  { symbol: 'GOOGL', name: 'Alphabet', category: 'stocks' },
  { symbol: 'AMZN', name: 'Amazon', category: 'stocks' },
  { symbol: 'NVDA', name: 'NVIDIA', category: 'stocks' },
  { symbol: 'META', name: 'Meta', category: 'stocks' },
  { symbol: 'TSLA', name: 'Tesla', category: 'stocks' },
  { symbol: 'SPY', name: 'S&P 500 ETF', category: 'stocks' },
  { symbol: 'QQQ', name: 'Nasdaq 100 ETF', category: 'stocks' },
  { symbol: 'AMD', name: 'AMD', category: 'stocks' },
  // Metals
  { symbol: 'GLD', name: 'Gold ETF', category: 'metals' },
  { symbol: 'SLV', name: 'Silver ETF', category: 'metals' },
  { symbol: 'IAU', name: 'Gold Trust', category: 'metals' },
  { symbol: 'XAUUSD', name: 'Gold/USD', category: 'metals' },
  { symbol: 'XAGUSD', name: 'Silver/USD', category: 'metals' },
  // Bonds
  { symbol: 'TLT', name: '20+ Year Treasury', category: 'bonds' },
  { symbol: 'IEF', name: '7-10 Year Treasury', category: 'bonds' },
  { symbol: 'BND', name: 'Total Bond Market', category: 'bonds' },
  { symbol: 'SHY', name: '1-3 Year Treasury', category: 'bonds' },
  // BIST
  { symbol: 'THYAO', name: 'Turkish Airlines', category: 'bist' },
  { symbol: 'GARAN', name: 'Garanti Bank', category: 'bist' },
  { symbol: 'AKBNK', name: 'Akbank', category: 'bist' },
  { symbol: 'SISE', name: 'Sisecam', category: 'bist' },
  { symbol: 'EREGL', name: 'Eregli Demir Celik', category: 'bist' },
  { symbol: 'KCHOL', name: 'Koc Holding', category: 'bist' },
];

const CATEGORY_CONFIG: { key: AssetCategory; label: string; icon: typeof Coins }[] = [
  { key: 'all', label: 'All', icon: Activity },
  { key: 'crypto', label: 'Crypto', icon: Coins },
  { key: 'stocks', label: 'Stocks', icon: BarChart3 },
  { key: 'metals', label: 'Metals', icon: Gem },
  { key: 'bonds', label: 'Bonds', icon: Landmark },
  { key: 'bist', label: 'BIST', icon: Building2 },
];

const TIMEFRAMES: { value: Timeframe; label: string; type: string }[] = [
  { value: '15m', label: '15m', type: 'Scalp' },
  { value: '1h', label: '1H', type: 'Day' },
  { value: '4h', label: '4H', type: 'Day' },
  { value: '1d', label: '1D', type: 'Swing' },
];

export default function TailoredAnalysisPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Search + filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<AssetCategory>('all');
  const [selectedAsset, setSelectedAsset] = useState<AssetItem | null>(null);
  const [timeframe, setTimeframe] = useState<Timeframe>('4h');

  // Analysis dialog
  const [showAnalysisDialog, setShowAnalysisDialog] = useState(false);

  // Daily pass
  const [dailyPassStatus, setDailyPassStatus] = useState<{
    hasPass: boolean;
    canUse: boolean;
    usageCount: number;
    maxUsage: number;
  } | null>(null);
  const [purchasingPass, setPurchasingPass] = useState(false);

  // Recent analyses
  const [analyses, setAnalyses] = useState<RecentAnalysis[]>([]);
  const [analysesLoading, setAnalysesLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<{ id: string; action: string } | null>(null);

  // Custom symbol input (for symbols not in catalog)
  const [customSymbol, setCustomSymbol] = useState('');

  const searchRef = useRef<HTMLInputElement>(null);

  // Fetch daily pass status
  const fetchDailyPassStatus = useCallback(async () => {
    try {
      const res = await authFetch('/api/passes/check/ASSET_ANALYSIS');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setDailyPassStatus({
            hasPass: data.data.hasPass,
            canUse: data.data.canUse,
            usageCount: data.data.pass?.usageCount ?? 0,
            maxUsage: data.data.pass?.maxUsage ?? 10,
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch daily pass status:', error);
    }
  }, []);

  // Fetch recent analyses
  const fetchAnalyses = useCallback(async () => {
    try {
      const token = await getAuthToken();
      if (!token) { setAnalyses([]); setAnalysesLoading(false); return; }
      const response = await fetch(getApiUrl('/api/analysis/live-prices'), {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const responseText = await response.text();
        if (responseText && responseText.trim() !== '') {
          const result = JSON.parse(responseText);
          const liveAnalyses = result.data?.analyses || [];
          const mapped = liveAnalyses.map((a: any) => {
            const rawVerdict = (a.verdict || '').toLowerCase().replace(/[^a-z_]/g, '');
            let verdict: 'go' | 'conditional_go' | 'wait' | 'avoid' = 'wait';
            if (rawVerdict === 'go') verdict = 'go';
            else if (rawVerdict === 'conditional_go' || rawVerdict === 'conditionalgo' || rawVerdict === 'cond') verdict = 'conditional_go';
            else if (rawVerdict === 'avoid' || rawVerdict === 'no_go' || rawVerdict === 'nogo') verdict = 'avoid';
            let tradeType: TradeType | undefined;
            if (a.interval === '5m' || a.interval === '15m') tradeType = 'scalping';
            else if (a.interval === '1h' || a.interval === '4h') tradeType = 'dayTrade';
            else if (a.interval === '1d' || a.interval === '1D') tradeType = 'swing';
            let outcome: 'correct' | 'incorrect' | 'pending' | null = null;
            if (a.outcome === 'tp1_hit' || a.outcome === 'tp2_hit' || a.outcome === 'tp3_hit') outcome = 'correct';
            else if (a.outcome === 'sl_hit') outcome = 'incorrect';
            else if (a.hasTradePlan) outcome = 'pending';
            return {
              id: a.id, symbol: a.symbol, verdict, score: a.totalScore ?? null,
              direction: a.direction, tradeType, method: a.method || 'classic',
              createdAt: new Date(a.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
              outcome, entryPrice: a.entryPrice, currentPrice: a.currentPrice, unrealizedPnL: a.unrealizedPnL,
              stopLoss: a.stopLoss, takeProfit1: a.takeProfit1, tpProgress: a.tpProgress, hasTradePlan: a.hasTradePlan, expiresAt: a.expiresAt,
            };
          });
          setAnalyses(mapped);
        }
      }
    } catch (err) {
      console.error('Failed to fetch analyses:', err);
    } finally {
      setAnalysesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDailyPassStatus();
    fetchAnalyses();
    const interval = setInterval(fetchAnalyses, 30000);
    return () => clearInterval(interval);
  }, [fetchDailyPassStatus, fetchAnalyses]);

  // Read URL params (e.g., from Capital Flow navigation)
  useEffect(() => {
    const symbol = searchParams.get('symbol');
    if (symbol) {
      const found = ASSET_CATALOG.find(a => a.symbol.toUpperCase() === symbol.toUpperCase());
      if (found) {
        setSelectedAsset(found);
      } else {
        setCustomSymbol(symbol.toUpperCase());
        setSelectedAsset({ symbol: symbol.toUpperCase(), name: symbol.toUpperCase(), category: 'crypto' });
      }
    }
  }, [searchParams]);

  // Filter assets
  const filteredAssets = ASSET_CATALOG.filter(asset => {
    const matchesCategory = activeCategory === 'all' || asset.category === activeCategory;
    const matchesSearch = searchQuery === '' ||
      asset.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Purchase Daily Pass
  const purchaseDailyPass = async () => {
    setPurchasingPass(true);
    try {
      const res = await authFetch('/api/passes/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passType: 'ASSET_ANALYSIS' }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Daily Analysis Pass purchased!');
        await fetchDailyPassStatus();
      } else {
        toast.error(data.error?.message || 'Failed to purchase pass.');
      }
    } catch (error) {
      toast.error('Failed to purchase pass.');
    } finally {
      setPurchasingPass(false);
    }
  };

  // Run analysis
  const runAnalysis = async () => {
    if (!selectedAsset) {
      toast.error('Please select an asset first');
      return;
    }
    if (!dailyPassStatus?.hasPass || !dailyPassStatus?.canUse) {
      const confirm = window.confirm('You need a Daily Analysis Pass.\n\n100 Credits = 10 Analyses Today\n\nPurchase now?');
      if (confirm) {
        await purchaseDailyPass();
        const res = await authFetch('/api/passes/check/ASSET_ANALYSIS');
        const data = await res.json();
        if (data.success && data.data?.hasPass && data.data?.canUse) {
          setShowAnalysisDialog(true);
        }
      }
      return;
    }
    setShowAnalysisDialog(true);
  };

  // Handle custom symbol submission
  const handleCustomSymbol = () => {
    const sym = customSymbol.trim().toUpperCase();
    if (sym.length < 2) {
      toast.error('Enter a valid symbol (e.g., BTC, AAPL, GLD)');
      return;
    }
    setSelectedAsset({ symbol: sym, name: sym, category: 'crypto' });
    setCustomSymbol('');
  };

  // Delete analysis
  const handleDelete = async (e: React.MouseEvent, analysisId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Delete this analysis?')) return;
    setActionLoading({ id: analysisId, action: 'delete' });
    try {
      const response = await authFetch(`/api/analysis/${analysisId}`, { method: 'DELETE' });
      if (response.ok) setAnalyses(analyses.filter(a => a.id !== analysisId));
    } catch (error) {
      console.error('Failed to delete:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleEmail = (e: React.MouseEvent, analysis: RecentAnalysis) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/analyze/details/${analysis.id}?email=true`);
  };

  const getCategoryIcon = (cat: string) => {
    const icons: Record<string, typeof Coins> = { crypto: Coins, stocks: BarChart3, bonds: Landmark, metals: Gem, bist: Building2 };
    return icons[cat] || Activity;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#041020]">

      {/* Header */}
      <div className="border-b border-slate-200 dark:border-white/5 bg-white dark:bg-[#071023]">
        <div className="max-w-5xl mx-auto px-4 py-4 sm:py-6">
          <div className="flex items-center gap-3 mb-4">
            <Link
              href="/analyze"
              className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/5 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-slate-500" />
            </Link>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Target className="w-5 h-5 text-violet-500" />
                Tailored Analysis
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">Pick any asset, choose your timeframe, run analysis on your terms.</p>
            </div>
          </div>

          {/* Search + Category Filter */}
          <div className="space-y-3">
            {/* Search input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                ref={searchRef}
                type="text"
                placeholder="Search assets... (BTC, AAPL, GLD, THYAO)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="w-4 h-4 text-slate-400 hover:text-slate-600" />
                </button>
              )}
            </div>

            {/* Category tabs */}
            <div className="flex gap-1.5 overflow-x-auto pb-0.5">
              {CATEGORY_CONFIG.map(cat => {
                const CatIcon = cat.icon;
                return (
                  <button
                    key={cat.key}
                    onClick={() => setActiveCategory(cat.key)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all',
                      activeCategory === cat.key
                        ? 'bg-violet-500 text-white shadow-md'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    )}
                  >
                    <CatIcon className="w-3.5 h-3.5" />
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">

        {/* Selected Asset + Config Panel */}
        {selectedAsset && (
          <div className="mb-6 p-4 rounded-2xl border-2 border-violet-200 dark:border-violet-500/20 bg-gradient-to-br from-white via-violet-50/30 to-white dark:from-[#071023] dark:via-violet-900/10 dark:to-[#071023]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <CoinIcon symbol={selectedAsset.symbol} size={40} />
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">{selectedAsset.symbol}</h3>
                  <p className="text-xs text-slate-500">{selectedAsset.name}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAsset(null)}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                Change
              </button>
            </div>

            {/* Timeframe */}
            <div className="mb-4">
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 block">Timeframe</label>
              <div className="flex gap-2">
                {TIMEFRAMES.map((tf) => (
                  <button
                    key={tf.value}
                    onClick={() => setTimeframe(tf.value)}
                    className={cn(
                      "flex-1 py-2 rounded-lg text-sm font-medium transition-all",
                      timeframe === tf.value
                        ? "bg-violet-500 text-white shadow-md"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                    )}
                  >
                    {tf.label}
                    <span className="block text-[9px] opacity-60">{tf.type}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Daily Pass Status */}
            {dailyPassStatus && (
              <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-100 dark:bg-slate-800 mb-4">
                <span className="text-xs text-slate-500 dark:text-slate-400">Daily Pass:</span>
                {dailyPassStatus.hasPass ? (
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">Active</span>
                    <span className="text-xs text-slate-600 dark:text-slate-400">{dailyPassStatus.maxUsage - dailyPassStatus.usageCount}/{dailyPassStatus.maxUsage} left</span>
                  </div>
                ) : (
                  <button
                    onClick={purchaseDailyPass}
                    disabled={purchasingPass}
                    className="px-3 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 text-white text-xs font-semibold hover:shadow-lg transition-all disabled:opacity-50"
                  >
                    {purchasingPass ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Buy Pass - 100 Credits'}
                  </button>
                )}
              </div>
            )}

            {/* Note: No capital flow gate */}
            <div className="flex items-start gap-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 mb-4">
              <Shield className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-[11px] text-amber-700 dark:text-amber-400">
                Tailored analysis skips Capital Flow alignment. For best results, use Automated Analysis which follows the top-down Capital Flow approach.
              </p>
            </div>

            {/* Run Analysis */}
            <button
              onClick={runAnalysis}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white text-sm font-bold rounded-xl hover:from-violet-600 hover:to-purple-700 hover:shadow-lg hover:shadow-violet-500/25 transition-all"
            >
              <Zap className="w-5 h-5" />
              Run Analysis on {selectedAsset.symbol}
            </button>
          </div>
        )}

        {/* Asset Grid */}
        {!selectedAsset && (
          <div className="mb-6">
            {/* Custom Symbol Input */}
            <div className="mb-4 p-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 bg-white dark:bg-[#071023]">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Can&apos;t find your asset? Enter symbol directly:</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. BTC, AAPL, GLD"
                  value={customSymbol}
                  onChange={(e) => setCustomSymbol(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && handleCustomSymbol()}
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                />
                <button
                  onClick={handleCustomSymbol}
                  className="px-4 py-2 rounded-lg bg-violet-500 text-white text-sm font-medium hover:bg-violet-600 transition"
                >
                  Select
                </button>
              </div>
            </div>

            {/* Asset Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
              {filteredAssets.map(asset => {
                const CatIcon = getCategoryIcon(asset.category);
                return (
                  <button
                    key={asset.symbol}
                    onClick={() => setSelectedAsset(asset)}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#071023] hover:border-violet-300 dark:hover:border-violet-500/50 hover:shadow-md transition-all text-left group"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <CoinIcon symbol={asset.symbol} size={24} />
                      <span className="text-sm font-bold text-slate-900 dark:text-white">{asset.symbol}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{asset.name}</p>
                    <div className="flex items-center gap-1 mt-1.5">
                      <CatIcon className="w-3 h-3 text-slate-400" />
                      <span className="text-[9px] text-slate-400 capitalize">{asset.category}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {filteredAssets.length === 0 && (
              <div className="text-center py-12">
                <Search className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                <p className="text-sm text-slate-500 dark:text-slate-400">No assets match your search.</p>
                <p className="text-xs text-slate-400 mt-1">Try a different search term or use the custom symbol input above.</p>
              </div>
            )}
          </div>
        )}

        {/* Recent Analyses */}
        <RecentAnalysesMobile
          analyses={analyses}
          loading={analysesLoading}
          onRefresh={fetchAnalyses}
          onDelete={handleDelete}
          onEmail={handleEmail}
        />
      </div>

      {/* Analysis Dialog */}
      {showAnalysisDialog && selectedAsset && (
        <AnalysisDialog
          isOpen={showAnalysisDialog}
          symbol={selectedAsset.symbol}
          coinName={selectedAsset.name || selectedAsset.symbol}
          timeframe={timeframe}
          onClose={() => {
            setShowAnalysisDialog(false);
            fetchDailyPassStatus();
            fetchAnalyses();
          }}
          onComplete={() => {
            setShowAnalysisDialog(false);
            fetchDailyPassStatus();
            fetchAnalyses();
          }}
        />
      )}
    </div>
  );
}
