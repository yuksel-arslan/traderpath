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
  PieChart,
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  Calculator,
  Clock,
  Target,
} from 'lucide-react';
import Link from 'next/link';

interface CostSettings {
  creditPriceUsd: number;
  targetProfitMargin: number;
  autoPricingEnabled: boolean;
  autoPricingInterval: number;
  lastPriceUpdate: string;
  geminiInputCostPer1M: number;
  geminiOutputCostPer1M: number;
  minCreditPriceUsd: number;
  maxCreditPriceUsd: number;
}

interface CostAnalytics {
  period: string;
  totalCost: number;
  totalRevenue: number;
  profit: number;
  profitMargin: number;
  operationBreakdown: Record<string, { count: number; cost: number; avgCost: number }>;
  serviceBreakdown: Record<string, { count: number; cost: number }>;
  dailyTrend: Array<{ date: string; cost: number; revenue: number }>;
}

interface PricingRecommendation {
  currentPrice: number;
  recommendedPrice: number;
  avgCostPerCredit: number;
  targetMargin: number;
  shouldUpdate: boolean;
  reason: string;
}

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
  monthly: CostAnalytics;
  pricing: PricingRecommendation;
}

export default function CostsPage() {
  const [summary, setSummary] = useState<CostSummary | null>(null);
  const [settings, setSettings] = useState<CostSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'settings' | 'breakdown'>('overview');

  // Editable settings state
  const [editSettings, setEditSettings] = useState({
    creditPriceUsd: 0.10,
    targetProfitMargin: 50,
    autoPricingEnabled: false,
    autoPricingInterval: 24,
    minCreditPriceUsd: 0.05,
    maxCreditPriceUsd: 0.50,
  });

  const fetchData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    setError(null);

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setError('Authentication required');
        return;
      }

      const headers = { 'Authorization': `Bearer ${token}` };

      const [summaryRes, settingsRes] = await Promise.all([
        fetch('/api/costs/summary', { headers }),
        fetch('/api/costs/settings', { headers }),
      ]);

      if (summaryRes.status === 403) {
        setError('Admin access required');
        return;
      }

      if (summaryRes.ok) {
        const data = await summaryRes.json();
        setSummary(data.data);
      }

      if (settingsRes.ok) {
        const data = await settingsRes.json();
        setSettings(data.data);
        setEditSettings({
          creditPriceUsd: Number(data.data.creditPriceUsd),
          targetProfitMargin: Number(data.data.targetProfitMargin),
          autoPricingEnabled: data.data.autoPricingEnabled,
          autoPricingInterval: data.data.autoPricingInterval,
          minCreditPriceUsd: Number(data.data.minCreditPriceUsd),
          maxCreditPriceUsd: Number(data.data.maxCreditPriceUsd),
        });
      }
    } catch (err) {
      setError('Failed to fetch cost data');
      console.error(err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/costs/settings', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editSettings),
      });

      if (response.ok) {
        setSuccessMessage('Settings saved successfully');
        setTimeout(() => setSuccessMessage(null), 3000);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleApplyRecommendation = async () => {
    if (!confirm('Apply the recommended price? This will update credit packages too.')) {
      return;
    }

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/costs/apply-recommendation', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.data.updated) {
          setSuccessMessage(`Price updated to $${data.data.newPrice}`);
        } else {
          setSuccessMessage(data.data.reason);
        }
        setTimeout(() => setSuccessMessage(null), 3000);
        fetchData(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRunAutoPricing = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/costs/run-auto-pricing', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setSuccessMessage(data.data.reason);
        setTimeout(() => setSuccessMessage(null), 3000);
        if (data.data.updated) {
          fetchData(true);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
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

  const profitColor = (summary?.monthly.profitMargin || 0) >= 40
    ? 'text-green-500'
    : (summary?.monthly.profitMargin || 0) >= 20
    ? 'text-yellow-500'
    : 'text-red-500';

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
              Cost Management
            </h1>
            <p className="text-muted-foreground mt-1">Track costs and manage pricing</p>
          </div>
        </div>
        <button
          onClick={() => fetchData(true)}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-500 flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          {successMessage}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-border">
        {[
          { id: 'overview', label: 'Overview', icon: BarChart3 },
          { id: 'breakdown', label: 'Breakdown', icon: PieChart },
          { id: 'settings', label: 'Settings', icon: Settings },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition ${
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

      {activeTab === 'overview' && summary && (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-card border rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-red-500/10 rounded-lg">
                  <TrendingDown className="w-5 h-5 text-red-500" />
                </div>
                <span className="text-sm text-muted-foreground">Total Cost (30d)</span>
              </div>
              <p className="text-3xl font-bold">${summary.monthly.totalCost.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">Today: ${summary.today.cost.toFixed(4)}</p>
            </div>

            <div className="bg-card border rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                </div>
                <span className="text-sm text-muted-foreground">Total Revenue (30d)</span>
              </div>
              <p className="text-3xl font-bold">${summary.monthly.totalRevenue.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">API calls today: {summary.today.apiCalls}</p>
            </div>

            <div className="bg-card border rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <DollarSign className="w-5 h-5 text-blue-500" />
                </div>
                <span className="text-sm text-muted-foreground">Net Profit (30d)</span>
              </div>
              <p className={`text-3xl font-bold ${summary.monthly.profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                ${summary.monthly.profit.toFixed(2)}
              </p>
              <p className={`text-sm ${profitColor}`}>Margin: {summary.monthly.profitMargin.toFixed(1)}%</p>
            </div>

            <div className="bg-card border rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Target className="w-5 h-5 text-purple-500" />
                </div>
                <span className="text-sm text-muted-foreground">Credit Price</span>
              </div>
              <p className="text-3xl font-bold">${summary.settings.creditPriceUsd.toFixed(4)}</p>
              <p className="text-sm text-muted-foreground">Target margin: {summary.settings.targetProfitMargin}%</p>
            </div>
          </div>

          {/* Pricing Recommendation */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-card border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-primary" />
                Pricing Recommendation
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Current Price</span>
                  <span className="font-mono text-lg">${summary.pricing.currentPrice.toFixed(4)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Recommended Price</span>
                  <span className={`font-mono text-lg ${
                    summary.pricing.recommendedPrice > summary.pricing.currentPrice
                      ? 'text-red-500'
                      : summary.pricing.recommendedPrice < summary.pricing.currentPrice
                      ? 'text-green-500'
                      : ''
                  }`}>
                    ${summary.pricing.recommendedPrice.toFixed(4)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Avg Cost/Credit</span>
                  <span className="font-mono">${summary.pricing.avgCostPerCredit.toFixed(4)}</span>
                </div>
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-4">{summary.pricing.reason}</p>
                  {summary.pricing.shouldUpdate && (
                    <button
                      onClick={handleApplyRecommendation}
                      className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition"
                    >
                      Apply Recommended Price
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-card border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                Auto-Pricing Status
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Status</span>
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    summary.settings.autoPricingEnabled
                      ? 'bg-green-500/10 text-green-500'
                      : 'bg-red-500/10 text-red-500'
                  }`}>
                    {summary.settings.autoPricingEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Interval</span>
                  <span className="font-mono">Every {summary.settings.autoPricingInterval} hours</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Last Update</span>
                  <span className="text-sm">
                    {new Date(summary.settings.lastPriceUpdate).toLocaleString()}
                  </span>
                </div>
                <div className="pt-4 border-t">
                  <button
                    onClick={handleRunAutoPricing}
                    className="w-full px-4 py-2 border rounded-lg font-medium hover:bg-accent transition flex items-center justify-center gap-2"
                  >
                    <Clock className="w-4 h-4" />
                    Run Auto-Pricing Now
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'breakdown' && summary && (
        <>
          {/* Operation Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-card border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Cost by Operation</h3>
              <div className="space-y-3">
                {Object.entries(summary.monthly.operationBreakdown)
                  .sort((a, b) => b[1].cost - a[1].cost)
                  .map(([operation, data]) => (
                    <div key={operation} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{operation.replace(/_/g, ' ')}</p>
                        <p className="text-sm text-muted-foreground">
                          {data.count} calls · avg ${data.avgCost.toFixed(4)}
                        </p>
                      </div>
                      <span className="font-mono">${data.cost.toFixed(4)}</span>
                    </div>
                  ))}
                {Object.keys(summary.monthly.operationBreakdown).length === 0 && (
                  <p className="text-muted-foreground text-center py-4">No data available</p>
                )}
              </div>
            </div>

            <div className="bg-card border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Cost by Service</h3>
              <div className="space-y-3">
                {Object.entries(summary.monthly.serviceBreakdown)
                  .sort((a, b) => b[1].cost - a[1].cost)
                  .map(([service, data]) => (
                    <div key={service} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium capitalize">{service}</p>
                        <p className="text-sm text-muted-foreground">{data.count} calls</p>
                      </div>
                      <span className="font-mono">${data.cost.toFixed(4)}</span>
                    </div>
                  ))}
                {Object.keys(summary.monthly.serviceBreakdown).length === 0 && (
                  <p className="text-muted-foreground text-center py-4">No data available</p>
                )}
              </div>
            </div>
          </div>

          {/* Daily Trend */}
          <div className="bg-card border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Daily Cost vs Revenue</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left">
                    <th className="p-3 font-medium text-muted-foreground">Date</th>
                    <th className="p-3 font-medium text-muted-foreground">Cost</th>
                    <th className="p-3 font-medium text-muted-foreground">Revenue</th>
                    <th className="p-3 font-medium text-muted-foreground">Profit</th>
                    <th className="p-3 font-medium text-muted-foreground">Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.monthly.dailyTrend.slice(-14).reverse().map((day) => {
                    const profit = day.revenue - day.cost;
                    const margin = day.revenue > 0 ? (profit / day.revenue) * 100 : 0;
                    return (
                      <tr key={day.date} className="border-b">
                        <td className="p-3">{day.date}</td>
                        <td className="p-3 font-mono text-red-500">${day.cost.toFixed(4)}</td>
                        <td className="p-3 font-mono text-green-500">${day.revenue.toFixed(4)}</td>
                        <td className={`p-3 font-mono ${profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          ${profit.toFixed(4)}
                        </td>
                        <td className={`p-3 ${margin >= 40 ? 'text-green-500' : margin >= 20 ? 'text-yellow-500' : 'text-red-500'}`}>
                          {margin.toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
                  {summary.monthly.dailyTrend.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-muted-foreground">
                        No data available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === 'settings' && (
        <div className="max-w-2xl">
          <div className="bg-card border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-6">Cost & Pricing Settings</h3>
            <div className="space-y-6">
              {/* Credit Price */}
              <div>
                <label className="block text-sm font-medium mb-2">Credit Price (USD)</label>
                <input
                  type="number"
                  step="0.0001"
                  min="0.01"
                  max="10"
                  value={editSettings.creditPriceUsd}
                  onChange={(e) => setEditSettings({ ...editSettings, creditPriceUsd: parseFloat(e.target.value) })}
                  className="w-full px-4 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Current price per credit in USD
                </p>
              </div>

              {/* Target Profit Margin */}
              <div>
                <label className="block text-sm font-medium mb-2">Target Profit Margin (%)</label>
                <input
                  type="number"
                  min="0"
                  max="90"
                  value={editSettings.targetProfitMargin}
                  onChange={(e) => setEditSettings({ ...editSettings, targetProfitMargin: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Target profit margin for auto-pricing calculations
                </p>
              </div>

              {/* Price Range */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Min Price (USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={editSettings.minCreditPriceUsd}
                    onChange={(e) => setEditSettings({ ...editSettings, minCreditPriceUsd: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Max Price (USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={editSettings.maxCreditPriceUsd}
                    onChange={(e) => setEditSettings({ ...editSettings, maxCreditPriceUsd: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  />
                </div>
              </div>

              {/* Auto-Pricing */}
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="font-medium">Auto-Pricing</p>
                    <p className="text-sm text-muted-foreground">
                      Automatically adjust prices based on costs
                    </p>
                  </div>
                  <button
                    onClick={() => setEditSettings({ ...editSettings, autoPricingEnabled: !editSettings.autoPricingEnabled })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                      editSettings.autoPricingEnabled ? 'bg-primary' : 'bg-muted'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                        editSettings.autoPricingEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
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
                      className="w-full px-4 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Save Button */}
              <div className="pt-4 border-t">
                <button
                  onClick={handleSaveSettings}
                  disabled={isSaving}
                  className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition disabled:opacity-50"
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
