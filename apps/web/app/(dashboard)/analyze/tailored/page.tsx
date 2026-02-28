'use client';

// ===========================================
// TAILORED ANALYSIS PAGE — Redesigned
// User picks any asset, selects timeframe, runs analysis.
// Cleaned up: removed duplicate panels (MarketContext, TrendingAssets, Configure card).
// Uses shared hooks for data fetching and handlers.
// ===========================================

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import {
  Search,
  Zap,
  X,
  Coins,
  BarChart3,
  Landmark,
  Gem,
  Building2,
  Activity,
} from 'lucide-react';
import { cn } from '../../../../lib/utils';
import { authFetch } from '../../../../lib/api';
import type { Timeframe } from '../../../../components/analysis/TradeTypeSelector';
import {
  type TopCoinData,
  normalizeVerdictUpper,
} from '../../../../lib/analysis-types';
import { useRecentAnalyses, useDailyPass, useAnalysisHandlers } from '../../../../lib/hooks/useAnalysisData';

import { MarketPulseBar } from '../../../../components/analyze/tailored/MarketPulseBar';
import { TrendingStrip } from '../../../../components/analyze/tailored/TrendingStrip';
import { AssetCard } from '../../../../components/analyze/tailored/AssetCard';
import { AssetConfigPanel } from '../../../../components/analyze/tailored/AssetConfigPanel';
import { RecentAnalysesMobile } from '../../../../components/analyze/RecentAnalysesMobile';

// Lazy load
const AnalysisDialog = dynamic(
  () => import('../../../../components/analysis/AnalysisDialog').then(mod => ({ default: mod.AnalysisDialog })),
  { ssr: false }
);

// Types
type AssetCategory = 'all' | 'crypto' | 'stocks' | 'metals' | 'bonds' | 'bist';

interface AssetItem {
  symbol: string;
  name: string;
  category: AssetCategory;
}

// Built-in asset catalog
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

const CATEGORY_ICONS: Record<string, typeof Coins> = {
  crypto: Coins,
  stocks: BarChart3,
  bonds: Landmark,
  metals: Gem,
  bist: Building2,
};

export default function TailoredAnalysisPage() {
  const searchParams = useSearchParams();

  // Search + filter
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<AssetCategory>('all');
  const [selectedAsset, setSelectedAsset] = useState<AssetItem | null>(null);
  const [timeframe, setTimeframe] = useState<Timeframe>('4h');

  // Analysis dialog
  const [showAnalysisDialog, setShowAnalysisDialog] = useState(false);

  // Market context
  const [cfData, setCfData] = useState<Record<string, unknown> | null>(null);
  const [topCoins, setTopCoins] = useState<TopCoinData[]>([]);

  const searchRef = useRef<HTMLInputElement>(null);

  // ── Shared hooks ──────────────────────────
  const { analyses, setAnalyses, loading: analysesLoading, refresh: refreshAnalyses } = useRecentAnalyses();
  const { status: dailyPassStatus, purchasing: purchasingPass, setPurchasing: setPurchasingPass, refresh: refreshPass } = useDailyPass();
  const { handleDelete, handleEmail } = useAnalysisHandlers(analyses, setAnalyses);

  // ── Coin lookup ───────────────────────────
  const coinLookup = useMemo(() => {
    const map = new Map<string, TopCoinData>();
    for (const coin of topCoins) {
      map.set(coin.symbol.toUpperCase(), coin);
    }
    return map;
  }, [topCoins]);

  // ── Market pulse from CF data ─────────────
  const marketPulse = useMemo(() => {
    if (!cfData) return null;
    const bias = String((cfData as Record<string, unknown>).liquidityBias ?? 'neutral').toLowerCase();
    const regime = bias === 'risk_on' ? 'RISK_ON' : bias === 'risk_off' ? 'RISK_OFF' : 'NEUTRAL';
    const confidence = Number((cfData as Record<string, unknown>).confidence ?? 50);

    const markets = (cfData as Record<string, unknown>).markets as Array<Record<string, unknown>> | undefined;
    let topFlow: { sector: string; amount: string } | null = null;
    if (Array.isArray(markets) && markets.length > 0) {
      const sorted = [...markets].sort((a, b) => Number(b.flow7d ?? 0) - Number(a.flow7d ?? 0));
      const top = sorted[0];
      if (top) {
        const flow7d = Number(top.flow7d ?? 0);
        topFlow = {
          sector: String(top.market ?? ''),
          amount: `${flow7d > 0 ? '+' : ''}${flow7d.toFixed(1)}%`,
        };
      }
    }

    return { regime, confidence, topFlow };
  }, [cfData]);

  // ── Trending assets from top-coins ────────
  const trendingAssets = useMemo(() => {
    return topCoins
      .filter(c => Number(c.totalScore ?? c.reliabilityScore ?? c.score ?? 0) > 0)
      .slice(0, 10)
      .map(c => ({
        symbol: c.symbol,
        name: c.name || c.symbol,
        price: Number(c.currentPrice ?? c.price ?? 0),
        change24h: Number(c.change24h ?? c.priceChange24h ?? 0),
        score: Number(c.totalScore ?? c.reliabilityScore ?? c.score ?? 0),
        verdict: normalizeVerdictUpper(String(c.verdict ?? 'WAIT')),
      }));
  }, [topCoins]);

  // ── Fetch market context ──────────────────
  const fetchMarketContext = useCallback(async () => {
    try {
      const [cfRes, coinsRes] = await Promise.all([
        authFetch('/api/capital-flow/summary'),
        authFetch('/api/analysis/top-coins?limit=10&sortBy=reliabilityScore'),
      ]);
      if (cfRes.ok) {
        const cfJson = await cfRes.json();
        setCfData(cfJson?.data ?? cfJson ?? null);
      }
      if (coinsRes.ok) {
        const coinsJson = await coinsRes.json();
        const coins = coinsJson?.data?.coins ?? coinsJson?.data ?? coinsJson?.coins ?? [];
        setTopCoins(Array.isArray(coins) ? coins : []);
      }
    } catch {
      // Silent fail
    }
  }, []);

  useEffect(() => {
    fetchMarketContext();
  }, [fetchMarketContext]);

  // ── URL params (e.g., from Capital Flow navigation) ──
  useEffect(() => {
    const symbol = searchParams.get('symbol');
    if (symbol) {
      const found = ASSET_CATALOG.find(a => a.symbol.toUpperCase() === symbol.toUpperCase());
      if (found) {
        setSelectedAsset(found);
      } else {
        setSelectedAsset({ symbol: symbol.toUpperCase(), name: symbol.toUpperCase(), category: 'crypto' });
      }
    }
  }, [searchParams]);

  // ── Filter assets ─────────────────────────
  const filteredAssets = useMemo(() => {
    return ASSET_CATALOG.filter(asset => {
      const matchesCategory = activeCategory === 'all' || asset.category === activeCategory;
      const matchesSearch = searchQuery === '' ||
        (asset.symbol || '').toLowerCase().includes((searchQuery || '').toLowerCase()) ||
        (asset.name || '').toLowerCase().includes((searchQuery || '').toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery]);

  // ── Custom symbol detection ───────────────
  const customSearchSymbol = useMemo(() => {
    if (searchQuery.length < 2) return null;
    const q = searchQuery.trim().toUpperCase();
    const inCatalog = ASSET_CATALOG.some(a => a.symbol.toUpperCase() === q);
    if (inCatalog) return null;
    return q;
  }, [searchQuery]);

  // ── Select asset ──────────────────────────
  const handleSelectSymbol = useCallback((symbol: string) => {
    const found = ASSET_CATALOG.find(a => a.symbol.toUpperCase() === symbol.toUpperCase());
    if (found) {
      setSelectedAsset(found);
    } else {
      setSelectedAsset({ symbol: symbol.toUpperCase(), name: symbol.toUpperCase(), category: 'crypto' });
    }
    setSearchQuery('');
  }, []);

  const handleSelectCustom = useCallback(() => {
    if (!customSearchSymbol) return;
    setSelectedAsset({ symbol: customSearchSymbol, name: customSearchSymbol, category: 'crypto' });
    setSearchQuery('');
  }, [customSearchSymbol]);

  // ── Purchase Daily Pass ───────────────────
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
        await refreshPass();
      } else {
        toast.error(data.error?.message || 'Failed to purchase pass.');
      }
    } catch {
      toast.error('Failed to purchase pass.');
    } finally {
      setPurchasingPass(false);
    }
  };

  // ── Run analysis ──────────────────────────
  const runAnalysis = async () => {
    if (!selectedAsset) {
      toast.error('Please select an asset first');
      return;
    }
    if (!dailyPassStatus?.hasPass || !dailyPassStatus?.canUse) {
      const confirmed = window.confirm('You need a Daily Analysis Pass.\n\n100 Credits = 10 Analyses Today\n\nPurchase now?');
      if (confirmed) {
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

  // ── Enrichment data for selected asset ────
  const selectedCoinData = selectedAsset ? coinLookup.get(selectedAsset.symbol.toUpperCase()) : undefined;

  const getCategoryIcon = (cat: string) => CATEGORY_ICONS[cat] || Activity;

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 pb-6 space-y-4">

      {/* Market Pulse Bar */}
      {marketPulse && (
        <MarketPulseBar
          regime={marketPulse.regime}
          regimeConfidence={marketPulse.confidence}
          topFlow={marketPulse.topFlow}
          fearGreed={null}
        />
      )}

      {/* Search + Category Filter */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-white/30" />
          <input
            ref={searchRef}
            type="text"
            placeholder="Search assets... (BTC, AAPL, GLD, THYAO)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && customSearchSymbol) handleSelectCustom();
            }}
            className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-white/[0.03] text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#00D4FF]/30 focus:border-[#00D4FF]/50"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4 text-slate-400 dark:text-white/30 hover:text-slate-600 dark:hover:text-white/60" />
            </button>
          )}
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
          {CATEGORY_CONFIG.map(cat => {
            const CatIcon = cat.icon;
            const isCatActive = activeCategory === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all',
                  isCatActive
                    ? 'text-white'
                    : 'bg-slate-100 dark:bg-white/[0.04] text-slate-500 dark:text-white/40 hover:bg-slate-200 dark:hover:bg-white/[0.08]'
                )}
                style={isCatActive ? { background: 'linear-gradient(135deg, #00F5A0, #00D4FF)' } : undefined}
              >
                <CatIcon className="w-3.5 h-3.5" />
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Asset Config Panel — replaces the old left-panel Configure + right-panel AssetConfig duplication */}
      {selectedAsset && (
        <AssetConfigPanel
          symbol={selectedAsset.symbol}
          name={selectedAsset.name}
          price={selectedCoinData ? Number(selectedCoinData.currentPrice ?? selectedCoinData.price ?? 0) : undefined}
          change24h={selectedCoinData ? Number(selectedCoinData.change24h ?? selectedCoinData.priceChange24h ?? 0) : undefined}
          score={selectedCoinData ? Number(selectedCoinData.totalScore ?? selectedCoinData.reliabilityScore ?? selectedCoinData.score ?? 0) : undefined}
          verdict={selectedCoinData ? String(selectedCoinData.verdict ?? '') : undefined}
          timeframe={timeframe}
          onTimeframeChange={setTimeframe}
          onRun={runAnalysis}
          onClose={() => setSelectedAsset(null)}
          dailyPassStatus={dailyPassStatus}
          purchasingPass={purchasingPass}
          onPurchasePass={purchaseDailyPass}
        />
      )}

      {/* Trending Strip — only when no asset selected */}
      {!selectedAsset && trendingAssets.length > 0 && (
        <TrendingStrip assets={trendingAssets} onSelect={handleSelectSymbol} />
      )}

      {/* Asset Grid — only when no asset selected */}
      {!selectedAsset && (
        <div>
          {customSearchSymbol && (
            <button
              onClick={handleSelectCustom}
              className="w-full mb-4 p-3 rounded-xl text-left transition-all hover:scale-[1.01] border border-dashed border-[#00D4FF]/30 bg-[#00D4FF]/[0.03]"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[#00D4FF]/10">
                  <Zap className="w-4 h-4 text-[#00D4FF]" />
                </div>
                <div>
                  <span className="text-sm font-bold text-slate-900 dark:text-white block">
                    Analyze &quot;{customSearchSymbol}&quot;
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-white/40">
                    Custom symbol — press Enter or click to select
                  </span>
                </div>
              </div>
            </button>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {filteredAssets.map(asset => {
              const CatIcon = getCategoryIcon(asset.category);
              const coinData = coinLookup.get(asset.symbol.toUpperCase());
              return (
                <AssetCard
                  key={asset.symbol}
                  symbol={asset.symbol}
                  name={asset.name}
                  category={asset.category}
                  categoryIcon={<CatIcon className="w-3 h-3 text-gray-400 dark:text-white/30" />}
                  price={coinData ? Number(coinData.currentPrice ?? coinData.price ?? 0) : undefined}
                  change24h={coinData ? Number(coinData.change24h ?? coinData.priceChange24h ?? 0) : undefined}
                  score={coinData ? Number(coinData.totalScore ?? coinData.reliabilityScore ?? coinData.score ?? 0) : undefined}
                  onClick={handleSelectSymbol}
                />
              );
            })}
          </div>

          {filteredAssets.length === 0 && !customSearchSymbol && (
            <div className="text-center py-12">
              <Search className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-white/10" />
              <p className="text-sm text-slate-500 dark:text-white/40">No assets match your search.</p>
              <p className="text-xs text-slate-400 dark:text-white/30 mt-1">Try a different search term or type a custom symbol and press Enter.</p>
            </div>
          )}
        </div>
      )}

      {/* Recent Analyses */}
      <RecentAnalysesMobile
        analyses={analyses}
        loading={analysesLoading}
        onRefresh={refreshAnalyses}
        onDelete={handleDelete}
        onEmail={handleEmail}
      />

      {/* Analysis Dialog */}
      {showAnalysisDialog && selectedAsset && (
        <AnalysisDialog
          isOpen={showAnalysisDialog}
          symbol={selectedAsset.symbol}
          coinName={selectedAsset.name || selectedAsset.symbol}
          timeframe={timeframe}
          onClose={() => {
            setShowAnalysisDialog(false);
            refreshPass();
            refreshAnalyses();
          }}
          onComplete={() => {
            setShowAnalysisDialog(false);
            refreshPass();
            refreshAnalyses();
          }}
        />
      )}
    </div>
  );
}
