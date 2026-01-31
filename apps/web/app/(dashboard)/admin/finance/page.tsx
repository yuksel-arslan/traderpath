'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Settings,
  Zap,
  BarChart3,
  Package,
  Plus,
  Edit3,
  Trash2,
  Save,
  X,
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  Star,
  Calculator,
  Activity,
  FileText,
  Clock,
  Globe,
  Target,
} from 'lucide-react';
import Link from 'next/link';
import { authFetch } from '../../../../lib/api';

// ===========================================
// Types
// ===========================================

interface CostSummary {
  settings: {
    creditPriceUsd: number;
    targetProfitMargin: number;
    autoPricingEnabled: boolean;
    autoPricingInterval: number;
    lastPriceUpdate: string;
  };
  today: {
    cost: number;
    apiCalls: number;
  };
  monthly: {
    totalCost: number;
    totalRevenue: number;
    profit: number;
    profitMargin: number;
    operationBreakdown: Record<string, { count: number; cost: number; avgCost: number }>;
    serviceBreakdown: Record<string, { count: number; cost: number }>;
  };
  cumulative?: {
    totalCost: number;
    totalRevenue: number;
    profit: number;
  };
  pricing: {
    currentPrice: number;
    recommendedPrice: number;
    avgCostPerCredit: number;
    shouldUpdate: boolean;
    reason: string;
  };
}

interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  bonusCredits: number;
  priceUsd: string;
  pricePerCredit: string;
  discountPercent: number;
  isPopular: boolean;
  isActive: boolean;
}

interface EditingPackage {
  id?: string;
  name: string;
  credits: number;
  bonusCredits: number;
  priceUsd: number;
  isPopular: boolean;
  isActive: boolean;
}

const emptyPackage: EditingPackage = {
  name: '',
  credits: 50,
  bonusCredits: 0,
  priceUsd: 9.99,
  isPopular: false,
  isActive: true,
};

// ===========================================
// Main Component
// ===========================================

export default function FinancePage() {
  // State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'economy' | 'packages' | 'settings'>('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Cost data
  const [summary, setSummary] = useState<CostSummary | null>(null);

  // Credit costs (economy)
  const [creditCosts, setCreditCosts] = useState<Record<string, number> | null>(null);
  const [editingCosts, setEditingCosts] = useState<Record<string, number>>({});
  const [savingCosts, setSavingCosts] = useState(false);

  // Packages
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [editingPackage, setEditingPackage] = useState<EditingPackage | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Settings
  const [editSettings, setEditSettings] = useState({
    creditPriceUsd: 0.10,
    targetProfitMargin: 50,
    autoPricingEnabled: false,
    autoPricingInterval: 24,
    minCreditPriceUsd: 0.05,
    maxCreditPriceUsd: 0.50,
  });

  // ===========================================
  // Data Fetching
  // ===========================================

  const fetchData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    setError(null);

    try {
      const [summaryRes, costsRes, packagesRes, settingsRes] = await Promise.all([
        authFetch('/api/costs/summary'),
        authFetch('/api/admin/credit-costs'),
        authFetch('/api/admin/packages'),
        authFetch('/api/costs/settings'),
      ]);

      if (summaryRes.status === 403) {
        setError('Admin access required');
        return;
      }

      if (summaryRes.ok) {
        const data = await summaryRes.json();
        setSummary(data.data);
      }

      if (costsRes.ok) {
        const data = await costsRes.json();
        if (data.data?.raw) {
          setCreditCosts(data.data.raw);
          setEditingCosts(data.data.raw);
        }
      }

      if (packagesRes.ok) {
        const data = await packagesRes.json();
        setPackages(data.data.packages || []);
      }

      if (settingsRes.ok) {
        const data = await settingsRes.json();
        setEditSettings({
          creditPriceUsd: Number(data.data.creditPriceUsd) || 0.10,
          targetProfitMargin: Number(data.data.targetProfitMargin) || 50,
          autoPricingEnabled: data.data.autoPricingEnabled || false,
          autoPricingInterval: data.data.autoPricingInterval || 24,
          minCreditPriceUsd: Number(data.data.minCreditPriceUsd) || 0.05,
          maxCreditPriceUsd: Number(data.data.maxCreditPriceUsd) || 0.50,
        });
      }
    } catch (err) {
      setError('Failed to fetch data');
      console.error(err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ===========================================
  // Credit Economy Handlers
  // ===========================================

  const handleSaveCreditCosts = async () => {
    setSavingCosts(true);
    try {
      const response = await authFetch('/api/admin/credit-costs', {
        method: 'PATCH',
        body: JSON.stringify(editingCosts),
      });

      if (response.ok) {
        setCreditCosts(editingCosts);
        showSuccess('Credit costs saved');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingCosts(false);
    }
  };

  const handleResetCreditCosts = async () => {
    if (!confirm('Reset all credit costs to default values?')) return;

    setSavingCosts(true);
    try {
      const response = await authFetch('/api/admin/credit-costs/reset', { method: 'POST' });
      if (response.ok) {
        fetchData(true);
        showSuccess('Credit costs reset to defaults');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingCosts(false);
    }
  };

  // ===========================================
  // Package Handlers
  // ===========================================

  const handleCreatePackage = () => {
    setEditingPackage({ ...emptyPackage });
    setIsCreating(true);
  };

  const handleEditPackage = (pkg: CreditPackage) => {
    setEditingPackage({
      id: pkg.id,
      name: pkg.name,
      credits: pkg.credits,
      bonusCredits: pkg.bonusCredits,
      priceUsd: parseFloat(pkg.priceUsd),
      isPopular: pkg.isPopular,
      isActive: pkg.isActive,
    });
    setIsCreating(false);
  };

  const handleCancelPackage = () => {
    setEditingPackage(null);
    setIsCreating(false);
  };

  const handleSavePackage = async () => {
    if (!editingPackage) return;
    setIsSaving(true);

    try {
      const url = isCreating ? '/api/admin/packages' : `/api/admin/packages/${editingPackage.id}`;
      const method = isCreating ? 'POST' : 'PATCH';

      const response = await authFetch(url, {
        method,
        body: JSON.stringify({
          name: editingPackage.name,
          credits: editingPackage.credits,
          bonusCredits: editingPackage.bonusCredits,
          priceUsd: editingPackage.priceUsd,
          isPopular: editingPackage.isPopular,
          isActive: editingPackage.isActive,
        }),
      });

      if (response.ok) {
        showSuccess(isCreating ? 'Package created' : 'Package updated');
        setEditingPackage(null);
        setIsCreating(false);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePackage = async (id: string) => {
    if (!confirm('Delete this package?')) return;

    try {
      const response = await authFetch(`/api/admin/packages/${id}`, { method: 'DELETE' });
      if (response.ok) {
        showSuccess('Package deleted');
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleTogglePackage = async (pkg: CreditPackage) => {
    try {
      await authFetch(`/api/admin/packages/${pkg.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !pkg.isActive }),
      });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  // ===========================================
  // Settings Handlers
  // ===========================================

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const response = await authFetch('/api/costs/settings', {
        method: 'PATCH',
        body: JSON.stringify(editSettings),
      });

      if (response.ok) {
        showSuccess('Settings saved');
        fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleApplyRecommendation = async () => {
    if (!confirm('Apply recommended price? This will update credit packages too.')) return;

    try {
      const response = await authFetch('/api/costs/apply-recommendation', { method: 'POST' });
      if (response.ok) {
        const data = await response.json();
        showSuccess(data.data.updated ? `Price updated to $${data.data.newPrice}` : data.data.reason);
        fetchData(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ===========================================
  // Helpers
  // ===========================================

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const profitColor = (margin: number) =>
    margin >= 40 ? 'text-green-500' : margin >= 20 ? 'text-yellow-500' : 'text-red-500';

  // ===========================================
  // Render
  // ===========================================

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-red-500 mb-2">Access Denied</h2>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="p-2 hover:bg-accent rounded-lg transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-primary" />
              Finance Management
            </h1>
            <p className="text-muted-foreground mt-1">Revenue, costs, pricing & packages</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/simulation"
            className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-accent transition"
          >
            <Calculator className="w-4 h-4" />
            Simulation
          </Link>
          <button
            onClick={() => fetchData(true)}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-500 flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          {successMessage}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-border overflow-x-auto">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
          { id: 'economy', label: 'Credit Economy', icon: Zap },
          { id: 'packages', label: 'Packages', icon: Package },
          { id: 'settings', label: 'Settings', icon: Settings },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && summary && (
        <>
          {/* Monthly Metrics */}
          <h3 className="text-lg font-semibold mb-4 text-muted-foreground">Bu Ay (30 gün)</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-card border rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-red-500/10 rounded-lg">
                  <TrendingDown className="w-5 h-5 text-red-500" />
                </div>
                <span className="text-sm text-muted-foreground">Aylık Gider</span>
              </div>
              <p className="text-3xl font-bold text-red-500">${summary.monthly.totalCost.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">Bugün: ${summary.today.cost.toFixed(4)}</p>
            </div>

            <div className="bg-card border rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                </div>
                <span className="text-sm text-muted-foreground">Aylık Gelir</span>
              </div>
              <p className="text-3xl font-bold text-green-500">${summary.monthly.totalRevenue.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">API çağrıları: {summary.today.apiCalls}</p>
            </div>

            <div className="bg-card border rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <DollarSign className="w-5 h-5 text-blue-500" />
                </div>
                <span className="text-sm text-muted-foreground">Aylık Kar</span>
              </div>
              <p className={`text-3xl font-bold ${summary.monthly.profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                ${summary.monthly.profit.toFixed(2)}
              </p>
              <p className={`text-sm ${profitColor(summary.monthly.profitMargin)}`}>
                Marj: {summary.monthly.profitMargin.toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Cumulative Metrics */}
          <h3 className="text-lg font-semibold mb-4 text-muted-foreground">Kümüle (Toplam)</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-card border rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-red-500/10 rounded-lg">
                  <TrendingDown className="w-5 h-5 text-red-500" />
                </div>
                <span className="text-sm text-muted-foreground">Toplam Gider</span>
              </div>
              <p className="text-3xl font-bold text-red-500">
                ${((summary.cumulative?.totalCost ?? summary.monthly.totalCost)).toFixed(2)}
              </p>
            </div>

            <div className="bg-card border rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                </div>
                <span className="text-sm text-muted-foreground">Toplam Gelir</span>
              </div>
              <p className="text-3xl font-bold text-green-500">
                ${((summary.cumulative?.totalRevenue ?? summary.monthly.totalRevenue)).toFixed(2)}
              </p>
            </div>

            <div className="bg-card border rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <DollarSign className="w-5 h-5 text-blue-500" />
                </div>
                <span className="text-sm text-muted-foreground">Toplam Kar</span>
              </div>
              <p className={`text-3xl font-bold ${(summary.cumulative?.profit ?? summary.monthly.profit) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                ${((summary.cumulative?.profit ?? summary.monthly.profit)).toFixed(2)}
              </p>
            </div>
          </div>

          {/* Pricing Recommendation & Cost Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-primary" />
                Fiyat Önerisi
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Mevcut Fiyat</span>
                  <span className="font-mono text-lg">${summary.pricing.currentPrice.toFixed(4)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Önerilen Fiyat</span>
                  <span className={`font-mono text-lg ${
                    summary.pricing.recommendedPrice > summary.pricing.currentPrice ? 'text-red-500' :
                    summary.pricing.recommendedPrice < summary.pricing.currentPrice ? 'text-green-500' : ''
                  }`}>
                    ${summary.pricing.recommendedPrice.toFixed(4)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ort. Kredi Maliyeti</span>
                  <span className="font-mono">${summary.pricing.avgCostPerCredit.toFixed(4)}</span>
                </div>
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-4">{summary.pricing.reason}</p>
                  {summary.pricing.shouldUpdate && (
                    <button
                      onClick={handleApplyRecommendation}
                      className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90"
                    >
                      Önerilen Fiyatı Uygula
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-card border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                Sabit Gider Dağılımı
              </h3>
              <div className="overflow-hidden rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-accent/50">
                    <tr>
                      <th className="text-left p-3 font-medium">Servis</th>
                      <th className="text-right p-3 font-medium">Aylık Maliyet</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-purple-500" />
                          Claude Code
                        </div>
                      </td>
                      <td className="p-3 text-right font-mono">$100.00</td>
                    </tr>
                    <tr>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-blue-500" />
                          Vercel
                        </div>
                      </td>
                      <td className="p-3 text-right font-mono">$20.00</td>
                    </tr>
                    <tr>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-indigo-500" />
                          Railway
                        </div>
                      </td>
                      <td className="p-3 text-right font-mono">$20.00</td>
                    </tr>
                    <tr>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                          Neon DB
                        </div>
                      </td>
                      <td className="p-3 text-right font-mono">$20.00</td>
                    </tr>
                  </tbody>
                  <tfoot className="bg-accent/30 border-t-2">
                    <tr>
                      <td className="p-3 font-semibold">Toplam</td>
                      <td className="p-3 text-right font-mono font-semibold">$160.00</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              {/* Cost per Analysis */}
              {(() => {
                const MONTHLY_FIXED_COST = 160;
                const analysisCount = Object.entries(summary.monthly.operationBreakdown)
                  .filter(([key]) => key.toLowerCase().includes('analysis'))
                  .reduce((sum, [, data]) => sum + data.count, 0) || 1;
                const costPerAnalysis = MONTHLY_FIXED_COST / analysisCount;

                return (
                  <div className="mt-4 p-4 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg border border-primary/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-foreground">Analiz Başına Maliyet</p>
                        <p className="text-sm text-muted-foreground">
                          Bu ay {analysisCount} analiz yapıldı
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold font-mono text-primary">
                          ${costPerAnalysis.toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">analiz başına</p>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </>
      )}

      {/* Credit Economy Tab */}
      {activeTab === 'economy' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Credit Cost Settings</h3>
              <p className="text-sm text-muted-foreground">How many credits each operation costs</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleResetCreditCosts}
                disabled={savingCosts}
                className="px-3 py-2 text-sm border rounded-lg hover:bg-accent disabled:opacity-50"
              >
                Reset to Defaults
              </button>
              <button
                onClick={handleSaveCreditCosts}
                disabled={savingCosts}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium disabled:opacity-50 flex items-center gap-2"
              >
                {savingCosts ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Changes
              </button>
            </div>
          </div>

          {/* Daily Pass Pricing Section */}
          <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-amber-500/30 rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/20 rounded-lg">
                  <Clock className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <h4 className="font-semibold text-lg">Daily Pass Pricing</h4>
                  <p className="text-sm text-muted-foreground">Users pay once per day for unlimited access</p>
                </div>
              </div>
              <span className="bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded">
                NEW MODEL
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Layer 3 - Sector Activity */}
              <div className="bg-card border rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-purple-500/10 rounded-lg">
                    <Globe className="w-5 h-5 text-purple-500" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Layer 3 - Sector Activity</p>
                    <p className="text-xs text-muted-foreground">Sector drill-down access</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      value={editingCosts.creditCostCapitalFlowL3Daily ?? 25}
                      onChange={(e) => setEditingCosts({ ...editingCosts, creditCostCapitalFlowL3Daily: parseInt(e.target.value) || 0 })}
                      className="w-20 px-3 py-2 border rounded-lg text-center font-mono bg-background"
                    />
                    <span className="text-sm text-muted-foreground">credits/day</span>
                  </div>
                  <span className="text-xs text-green-500 font-medium">Unlimited access</span>
                </div>
              </div>

              {/* Layer 4 - Asset Analysis */}
              <div className="bg-card border rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-amber-500/10 rounded-lg">
                    <Target className="w-5 h-5 text-amber-500" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Layer 4 - Asset Analysis</p>
                    <p className="text-xs text-muted-foreground">7-Step / MLIS Pro (AI Recommendations)</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      value={editingCosts.creditCostAssetAnalysisDaily ?? 100}
                      onChange={(e) => setEditingCosts({ ...editingCosts, creditCostAssetAnalysisDaily: parseInt(e.target.value) || 0 })}
                      className="w-20 px-3 py-2 border rounded-lg text-center font-mono bg-background"
                    />
                    <span className="text-sm text-muted-foreground">credits/day</span>
                  </div>
                  <span className="text-xs text-amber-500 font-medium">Max 10 analyses</span>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="mt-4 p-3 bg-card/50 rounded-lg border border-dashed">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-purple-500" />
                    <span className="text-muted-foreground">L3 (Sectors):</span>
                    <span className="font-mono font-medium">{editingCosts.creditCostCapitalFlowL3Daily ?? 25} cr/day</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="text-muted-foreground">L4 (Analysis):</span>
                    <span className="font-mono font-medium">{editingCosts.creditCostAssetAnalysisDaily ?? 100} cr/day</span>
                  </div>
                </div>
                <div className="text-muted-foreground">
                  Total daily max: <span className="font-mono font-medium text-foreground">
                    {(editingCosts.creditCostCapitalFlowL3Daily ?? 25) + (editingCosts.creditCostAssetAnalysisDaily ?? 100)} credits
                  </span>
                </div>
              </div>
            </div>
          </div>

          {creditCosts ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Analysis Bundles */}
              <div className="bg-card border rounded-lg p-4">
                <h4 className="font-semibold mb-4 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Analysis Bundles
                  <span className="text-xs text-muted-foreground font-normal">(Legacy - per analysis)</span>
                </h4>
                <div className="space-y-4">
                  {[
                    { key: 'creditCostFullAnalysis', label: 'Classic Analysis (7-Step)', desc: 'Complete 7-step trading analysis', color: 'teal' },
                    { key: 'creditCostMlisProAnalysis', label: 'MLIS Pro Analysis (5-Layer)', desc: 'Neural network based analysis', color: 'violet' },
                    { key: 'creditCostTftAnalysis', label: 'TFT Analysis', desc: 'Full Analysis + AI Price Prediction', comingSoon: true },
                  ].map(({ key, label, desc, comingSoon, color }) => (
                    <div key={key} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div>
                          <p className="font-medium flex items-center gap-2">
                            {label}
                            {color === 'violet' && (
                              <span className="bg-violet-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                                NEW
                              </span>
                            )}
                          </p>
                          <p className="text-sm text-muted-foreground">{desc}</p>
                        </div>
                        {comingSoon && (
                          <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                            COMING SOON
                          </span>
                        )}
                      </div>
                      <input
                        type="number"
                        min="0"
                        value={editingCosts[key] ?? ''}
                        onChange={(e) => setEditingCosts({ ...editingCosts, [key]: parseInt(e.target.value) || 0 })}
                        className="w-20 px-3 py-2 border rounded-lg text-center font-mono bg-background"
                        disabled={comingSoon}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Features */}
              <div className="bg-card border rounded-lg p-4">
                <h4 className="font-semibold mb-4 flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Features
                </h4>
                <div className="space-y-4">
                  {[
                    { key: 'creditCostAiExpert', label: 'AI Expert Chat', desc: 'Per message' },
                    { key: 'creditCostPdfReport', label: 'PDF Report', desc: 'Generate PDF' },
                    { key: 'creditCostTranslation', label: 'Translation', desc: 'Translate report' },
                    { key: 'creditCostEmailSend', label: 'Email Send', desc: 'Send via email' },
                    { key: 'creditCostPriceAlert', label: 'Price Alert', desc: 'Set alert' },
                  ].map(({ key, label, desc }) => (
                    <div key={key} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{label}</p>
                        <p className="text-sm text-muted-foreground">{desc}</p>
                      </div>
                      <input
                        type="number"
                        min="0"
                        value={editingCosts[key] ?? ''}
                        onChange={(e) => setEditingCosts({ ...editingCosts, [key]: parseInt(e.target.value) || 0 })}
                        className="w-20 px-3 py-2 border rounded-lg text-center font-mono bg-background"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Individual Steps */}
              <div className="bg-card border rounded-lg p-4 lg:col-span-2">
                <h4 className="font-semibold mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Individual Analysis Steps
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                  {[
                    { key: 'creditCostMarketPulse', label: 'Market Pulse', step: 1 },
                    { key: 'creditCostAssetScanner', label: 'Asset Scanner', step: 2 },
                    { key: 'creditCostSafetyCheck', label: 'Safety Check', step: 3 },
                    { key: 'creditCostTiming', label: 'Timing', step: 4 },
                    { key: 'creditCostTrapCheck', label: 'Trap Check', step: 5 },
                    { key: 'creditCostTradePlan', label: 'Trade Plan', step: 6 },
                    { key: 'creditCostFinalVerdict', label: 'Verdict', step: 7 },
                  ].map(({ key, label, step }) => (
                    <div key={key} className="p-3 bg-accent/30 rounded-lg text-center">
                      <p className="text-xs text-muted-foreground mb-1">Step {step}</p>
                      <p className="font-medium text-sm mb-2">{label}</p>
                      <input
                        type="number"
                        min="0"
                        value={editingCosts[key] ?? ''}
                        onChange={(e) => setEditingCosts({ ...editingCosts, [key]: parseInt(e.target.value) || 0 })}
                        className="w-full px-2 py-1 border rounded text-center font-mono text-sm bg-background"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* MLIS Pro Layers */}
              <div className="bg-card border border-violet-200 dark:border-violet-800 rounded-lg p-4 lg:col-span-2">
                <h4 className="font-semibold mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-violet-500" />
                  <span>MLIS Pro Layers</span>
                  <span className="bg-violet-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                    5-LAYER
                  </span>
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {[
                    { key: 'creditCostMlisTechnicalLayer', label: 'Technical', layer: 1, desc: 'Price patterns & indicators' },
                    { key: 'creditCostMlisMomentumLayer', label: 'Momentum', layer: 2, desc: 'Trend strength analysis' },
                    { key: 'creditCostMlisVolatilityLayer', label: 'Volatility', layer: 3, desc: 'Market stability check' },
                    { key: 'creditCostMlisVolumeLayer', label: 'Volume', layer: 4, desc: 'Trading volume analysis' },
                    { key: 'creditCostMlisVerdictLayer', label: 'Verdict', layer: 5, desc: 'Final recommendation' },
                  ].map(({ key, label, layer, desc }) => (
                    <div key={key} className="p-3 bg-violet-50 dark:bg-violet-900/20 rounded-lg text-center border border-violet-100 dark:border-violet-800">
                      <p className="text-xs text-violet-600 dark:text-violet-400 mb-1">Layer {layer}</p>
                      <p className="font-medium text-sm mb-1">{label}</p>
                      <p className="text-[10px] text-muted-foreground mb-2">{desc}</p>
                      <input
                        type="number"
                        min="0"
                        value={editingCosts[key] ?? ''}
                        onChange={(e) => setEditingCosts({ ...editingCosts, [key]: parseInt(e.target.value) || 0 })}
                        className="w-full px-2 py-1 border border-violet-200 dark:border-violet-700 rounded text-center font-mono text-sm bg-background"
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 bg-violet-100 dark:bg-violet-900/30 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-violet-700 dark:text-violet-300">Total MLIS Pro Cost</p>
                      <p className="text-xs text-violet-600 dark:text-violet-400">Sum of all 5 layers</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-violet-700 dark:text-violet-300">
                        {(
                          (editingCosts.creditCostMlisTechnicalLayer || 0) +
                          (editingCosts.creditCostMlisMomentumLayer || 0) +
                          (editingCosts.creditCostMlisVolatilityLayer || 0) +
                          (editingCosts.creditCostMlisVolumeLayer || 0) +
                          (editingCosts.creditCostMlisVerdictLayer || 0)
                        )} credits
                      </p>
                      <p className="text-xs text-violet-600 dark:text-violet-400">
                        Bundle price: {editingCosts.creditCostMlisProAnalysis || 0} credits
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center p-8">
              <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      )}

      {/* Packages Tab */}
      {activeTab === 'packages' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Credit Packages</h3>
              <p className="text-sm text-muted-foreground">Manage packages shown to users</p>
            </div>
            <button
              onClick={handleCreatePackage}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
            >
              <Plus className="w-4 h-4" />
              Add Package
            </button>
          </div>

          {/* Edit Form */}
          {editingPackage && (
            <div className="bg-card border rounded-lg p-6">
              <h4 className="font-semibold mb-4">{isCreating ? 'Create Package' : 'Edit Package'}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Name</label>
                  <input
                    type="text"
                    value={editingPackage.name}
                    onChange={(e) => setEditingPackage({ ...editingPackage, name: e.target.value })}
                    className="w-full px-4 py-2 bg-background border rounded-lg"
                    placeholder="Starter, Pro, etc."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Credits</label>
                  <input
                    type="number"
                    min="1"
                    value={editingPackage.credits}
                    onChange={(e) => setEditingPackage({ ...editingPackage, credits: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 bg-background border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Bonus Credits</label>
                  <input
                    type="number"
                    min="0"
                    value={editingPackage.bonusCredits}
                    onChange={(e) => setEditingPackage({ ...editingPackage, bonusCredits: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 bg-background border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Price (USD)</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={editingPackage.priceUsd}
                    onChange={(e) => setEditingPackage({ ...editingPackage, priceUsd: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 bg-background border rounded-lg"
                  />
                </div>
              </div>
              <div className="flex items-center gap-6 mt-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingPackage.isPopular}
                    onChange={(e) => setEditingPackage({ ...editingPackage, isPopular: e.target.checked })}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm">Popular</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingPackage.isActive}
                    onChange={(e) => setEditingPackage({ ...editingPackage, isActive: e.target.checked })}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm">Active</span>
                </label>
              </div>
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                <button onClick={handleCancelPackage} className="px-4 py-2 border rounded-lg hover:bg-accent">
                  <X className="w-4 h-4 inline mr-2" />Cancel
                </button>
                <button
                  onClick={handleSavePackage}
                  disabled={isSaving || !editingPackage.name}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg disabled:opacity-50"
                >
                  <Save className="w-4 h-4 inline mr-2" />{isSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          )}

          {/* Packages Table */}
          <div className="bg-card border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-accent/50">
                <tr>
                  <th className="text-left p-4 font-medium">Package</th>
                  <th className="text-left p-4 font-medium">Credits</th>
                  <th className="text-left p-4 font-medium">Price</th>
                  <th className="text-left p-4 font-medium">Per Credit</th>
                  <th className="text-left p-4 font-medium">Status</th>
                  <th className="text-right p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {packages.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      No packages yet. Create your first package.
                    </td>
                  </tr>
                ) : (
                  packages.map((pkg) => (
                    <tr key={pkg.id} className={!pkg.isActive ? 'opacity-50' : ''}>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{pkg.name}</span>
                          {pkg.isPopular && <Star className="w-4 h-4 text-amber-500 fill-amber-500" />}
                        </div>
                      </td>
                      <td className="p-4">
                        {pkg.credits}
                        {pkg.bonusCredits > 0 && <span className="text-green-500 ml-1">+{pkg.bonusCredits}</span>}
                      </td>
                      <td className="p-4 font-mono">${parseFloat(pkg.priceUsd).toFixed(2)}</td>
                      <td className="p-4 font-mono text-muted-foreground">${parseFloat(pkg.pricePerCredit).toFixed(4)}</td>
                      <td className="p-4">
                        <button
                          onClick={() => handleTogglePackage(pkg)}
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            pkg.isActive ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                          }`}
                        >
                          {pkg.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => handleEditPackage(pkg)} className="p-2 hover:bg-accent rounded-lg">
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeletePackage(pkg.id)}
                            className="p-2 hover:bg-red-500/10 text-red-500 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="max-w-2xl">
          <div className="bg-card border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-6">Pricing & Auto-Pricing Settings</h3>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Credit Price (USD)</label>
                <input
                  type="number"
                  step="0.0001"
                  min="0.01"
                  value={editSettings.creditPriceUsd}
                  onChange={(e) => setEditSettings({ ...editSettings, creditPriceUsd: parseFloat(e.target.value) })}
                  className="w-full px-4 py-2 bg-background border rounded-lg"
                />
                <p className="text-sm text-muted-foreground mt-1">Base price per credit</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Target Profit Margin (%)</label>
                <input
                  type="number"
                  min="0"
                  max="90"
                  value={editSettings.targetProfitMargin}
                  onChange={(e) => setEditSettings({ ...editSettings, targetProfitMargin: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 bg-background border rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Min Price</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editSettings.minCreditPriceUsd}
                    onChange={(e) => setEditSettings({ ...editSettings, minCreditPriceUsd: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 bg-background border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Max Price</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editSettings.maxCreditPriceUsd}
                    onChange={(e) => setEditSettings({ ...editSettings, maxCreditPriceUsd: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 bg-background border rounded-lg"
                  />
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="font-medium">Auto-Pricing</p>
                    <p className="text-sm text-muted-foreground">Automatically adjust based on costs</p>
                  </div>
                  <button
                    onClick={() => setEditSettings({ ...editSettings, autoPricingEnabled: !editSettings.autoPricingEnabled })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                      editSettings.autoPricingEnabled ? 'bg-primary' : 'bg-muted'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                      editSettings.autoPricingEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                {editSettings.autoPricingEnabled && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Update Interval (hours)</label>
                    <input
                      type="number"
                      min="1"
                      max="168"
                      value={editSettings.autoPricingInterval}
                      onChange={(e) => setEditSettings({ ...editSettings, autoPricingInterval: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 bg-background border rounded-lg"
                    />
                  </div>
                )}
              </div>

              <div className="pt-4 border-t">
                <button
                  onClick={handleSaveSettings}
                  disabled={isSaving}
                  className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
