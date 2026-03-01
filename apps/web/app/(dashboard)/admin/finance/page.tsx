'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  DollarSign,
  RefreshCw,
  Zap,
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
  Globe,
  Target,
  Calendar,
  CreditCard,
  Users,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';
import { authFetch } from '../../../../lib/api';

// ===========================================
// Types
// ===========================================

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

interface WeeklyPlanSubscriber {
  id: string;
  userId: string;
  userEmail: string;
  userName: string | null;
  planType: 'REPORT_WEEKLY' | 'ANALYSIS_WEEKLY';
  status: string;
  remainingQuota: number;
  totalQuota: number;
  quotaUsedThisPeriod: number;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  telegramDelivery: boolean;
  discordDelivery: boolean;
  createdAt: string;
  updatedAt: string;
}

interface WeeklyPlanStats {
  total: number;
  active: number;
  wrr: string;
  mrr: string;
  byType: Array<{
    planType: string;
    status: string;
    count: number;
  }>;
  recent: WeeklyPlanSubscriber[];
}

const emptyPackage: EditingPackage = {
  name: '',
  credits: 50,
  bonusCredits: 0,
  priceUsd: 9.99,
  isPopular: false,
  isActive: true,
};

const PLAN_LABELS: Record<string, string> = {
  REPORT_WEEKLY: 'Intelligent Report',
  ANALYSIS_WEEKLY: 'Capital Flow & Asset Analysis',
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-500/10 text-green-500',
  CANCELED: 'bg-amber-500/10 text-amber-500',
  PAST_DUE: 'bg-red-500/10 text-red-500',
  INACTIVE: 'bg-slate-500/10 text-slate-500',
  UNPAID: 'bg-red-500/10 text-red-500',
  TRIALING: 'bg-blue-500/10 text-blue-500',
};

// ===========================================
// Main Component
// ===========================================

export default function FinancePage() {
  // State
  const [activeTab, setActiveTab] = useState<'subscriptions' | 'economy' | 'packages'>('subscriptions');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Credit costs (economy)
  const [creditCosts, setCreditCosts] = useState<Record<string, number> | null>(null);
  const [editingCosts, setEditingCosts] = useState<Record<string, number>>({});
  const [savingCosts, setSavingCosts] = useState(false);

  // Packages
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [editingPackage, setEditingPackage] = useState<EditingPackage | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Weekly Plans
  const [weeklyPlanStats, setWeeklyPlanStats] = useState<WeeklyPlanStats | null>(null);

  // ===========================================
  // Data Fetching
  // ===========================================

  const fetchData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    setError(null);

    try {
      const [costsRes, packagesRes, weeklyPlansRes] = await Promise.all([
        authFetch('/api/admin/credit-costs'),
        authFetch('/api/admin/packages'),
        authFetch('/api/admin/weekly-plans'),
      ]);

      if (costsRes.status === 403) {
        setError('Admin access required');
        return;
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

      if (weeklyPlansRes.ok) {
        const data = await weeklyPlansRes.json();
        if (data.success) {
          setWeeklyPlanStats(data.data);
        }
      }
    } catch (err) {
      setError('Failed to fetch data');
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
    } catch {
      // Error handled silently
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
    } catch {
      // Error handled silently
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
    } catch {
      // Error handled silently
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
    } catch {
      // Error handled silently
    }
  };

  const handleTogglePackage = async (pkg: CreditPackage) => {
    try {
      await authFetch(`/api/admin/packages/${pkg.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !pkg.isActive }),
      });
      fetchData();
    } catch {
      // Error handled silently
    }
  };

  // ===========================================
  // Helpers
  // ===========================================

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const getActiveCountByType = (planType: string) => {
    if (!weeklyPlanStats) return 0;
    const match = weeklyPlanStats.byType.find(p => p.planType === planType && p.status === 'ACTIVE');
    return match?.count || 0;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

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
            <p className="text-muted-foreground mt-1">Subscriptions, costs, pricing & packages</p>
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
          { id: 'subscriptions', label: 'Weekly Subscriptions', icon: Calendar },
          { id: 'economy', label: 'Credit Economy', icon: Zap },
          { id: 'packages', label: 'Packages', icon: Package },
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

      {/* ============================================= */}
      {/* Weekly Subscriptions Tab */}
      {/* ============================================= */}
      {activeTab === 'subscriptions' && (
        <div className="space-y-6">
          {/* Weekly Subscription Plans Overview */}
          <div className="bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-violet-500/10 border border-violet-500/30 rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-violet-500/20 rounded-lg">
                  <Calendar className="w-5 h-5 text-violet-500" />
                </div>
                <div>
                  <h4 className="font-semibold text-lg">Weekly Subscription Plans</h4>
                  <p className="text-sm text-muted-foreground">$13.99/week per plan — Stripe recurring billing</p>
                </div>
              </div>
              <span className="bg-violet-500 text-white text-xs font-bold px-2 py-1 rounded">
                ACTIVE MODEL
              </span>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-card border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-violet-500" />
                  <span className="text-sm text-muted-foreground">Active Subscribers</span>
                </div>
                <p className="text-2xl font-bold font-sans">{weeklyPlanStats?.active || 0}</p>
              </div>
              <div className="bg-card border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm text-muted-foreground">WRR (Weekly)</span>
                </div>
                <p className="text-2xl font-bold font-sans text-emerald-500">${weeklyPlanStats?.wrr || '0.00'}</p>
              </div>
              <div className="bg-card border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-teal-500" />
                  <span className="text-sm text-muted-foreground">Est. MRR</span>
                </div>
                <p className="text-2xl font-bold font-sans text-teal-500">${weeklyPlanStats?.mrr || '0.00'}</p>
              </div>
              <div className="bg-card border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="w-4 h-4 text-amber-500" />
                  <span className="text-sm text-muted-foreground">Total Plans</span>
                </div>
                <p className="text-2xl font-bold font-sans">{weeklyPlanStats?.total || 0}</p>
              </div>
            </div>

            {/* Two Plan Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Intelligent Report Subscription */}
              <div className="bg-card border border-violet-200 dark:border-violet-800 rounded-lg p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-violet-500/10 rounded-lg">
                      <FileText className="w-5 h-5 text-violet-500" />
                    </div>
                    <div>
                      <p className="font-semibold">Intelligent Report</p>
                      <p className="text-xs text-muted-foreground">REPORT_WEEKLY</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold font-sans text-violet-500">
                      {getActiveCountByType('REPORT_WEEKLY')}
                    </p>
                    <p className="text-xs text-muted-foreground">active</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Price</span>
                    <span className="font-sans font-medium">$13.99/week</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Quota</span>
                    <span className="font-sans font-medium">7 reports/week</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Per Unit</span>
                    <span className="font-sans font-medium">$2.00/report</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Delivery</span>
                    <span className="font-medium">Snapshot PNG</span>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs text-muted-foreground">
                    Executive Summary or Detailed Analysis Report. Telegram + Discord inline delivery.
                  </p>
                </div>
              </div>

              {/* Capital Flow & Asset Analysis Subscription */}
              <div className="bg-card border border-emerald-200 dark:border-emerald-800 rounded-lg p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/10 rounded-lg">
                      <Activity className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div>
                      <p className="font-semibold">Capital Flow & Asset Analysis</p>
                      <p className="text-xs text-muted-foreground">ANALYSIS_WEEKLY</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold font-sans text-emerald-500">
                      {getActiveCountByType('ANALYSIS_WEEKLY')}
                    </p>
                    <p className="text-xs text-muted-foreground">active</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Price</span>
                    <span className="font-sans font-medium">$13.99/week</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Quota</span>
                    <span className="font-sans font-medium">7 analyses/week</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Per Unit</span>
                    <span className="font-sans font-medium">$2.00/analysis</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">AI Expert</span>
                    <span className="font-sans font-medium">5 questions/analysis</span>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs text-muted-foreground">
                    Full 7-Step + MLIS Pro dual-engine. AI Concierge, Auto, or Tailored methods.
                  </p>
                </div>
              </div>
            </div>

            {/* Info Box */}
            <div className="mt-4 p-3 bg-card/50 rounded-lg border border-dashed">
              <div className="flex items-center gap-2 text-sm flex-wrap">
                <div className="w-2 h-2 rounded-full bg-violet-500" />
                <span className="text-muted-foreground">Plans are independent — user selects one</span>
                <span className="text-muted-foreground mx-1">|</span>
                <span className="text-muted-foreground">Quota resets weekly via Stripe webhook</span>
                <span className="text-muted-foreground mx-1">|</span>
                <span className="text-muted-foreground">Configured in</span>
                <code className="bg-violet-500/20 px-1.5 py-0.5 rounded text-xs">weekly-plans.ts</code>
              </div>
            </div>
          </div>

          {/* Recent Subscribers Table */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-teal-500/10 rounded-lg">
                <Users className="w-5 h-5 text-teal-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Recent Subscribers</h3>
                <p className="text-sm text-muted-foreground">Latest weekly plan activity</p>
              </div>
            </div>

            <div className="bg-card border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-accent/50">
                    <tr>
                      <th className="text-left p-4 font-medium">User</th>
                      <th className="text-left p-4 font-medium">Plan</th>
                      <th className="text-left p-4 font-medium">Status</th>
                      <th className="text-left p-4 font-medium">Quota</th>
                      <th className="text-left p-4 font-medium">Delivery</th>
                      <th className="text-left p-4 font-medium">Period End</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {!weeklyPlanStats?.recent?.length ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-muted-foreground">
                          No weekly plan subscribers yet.
                        </td>
                      </tr>
                    ) : (
                      weeklyPlanStats.recent.map((plan) => (
                        <tr key={plan.id}>
                          <td className="p-4">
                            <div>
                              <p className="font-medium text-sm">{plan.userName || 'Unknown'}</p>
                              <p className="text-xs text-muted-foreground">{plan.userEmail}</p>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              {plan.planType === 'REPORT_WEEKLY' ? (
                                <FileText className="w-4 h-4 text-violet-500" />
                              ) : (
                                <Activity className="w-4 h-4 text-emerald-500" />
                              )}
                              <span className="text-sm">{PLAN_LABELS[plan.planType] || plan.planType}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[plan.status] || STATUS_COLORS.INACTIVE}`}>
                              {plan.status}
                              {plan.cancelAtPeriodEnd && ' (canceling)'}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-2 bg-accent rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    plan.remainingQuota > 3 ? 'bg-emerald-500' :
                                    plan.remainingQuota > 0 ? 'bg-amber-500' : 'bg-red-500'
                                  }`}
                                  style={{ width: `${(plan.remainingQuota / plan.totalQuota) * 100}%` }}
                                />
                              </div>
                              <span className="text-xs font-sans text-muted-foreground">
                                {plan.remainingQuota}/{plan.totalQuota}
                              </span>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-1">
                              {plan.telegramDelivery && (
                                <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-500 text-[10px] font-medium rounded">TG</span>
                              )}
                              {plan.discordDelivery && (
                                <span className="px-1.5 py-0.5 bg-indigo-500/10 text-indigo-500 text-[10px] font-medium rounded">DC</span>
                              )}
                              {!plan.telegramDelivery && !plan.discordDelivery && (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="text-sm text-muted-foreground font-sans">
                              {formatDate(plan.currentPeriodEnd)}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Stripe Dashboard Link */}
          <div className="p-4 bg-muted/50 border rounded-lg text-center">
            <p className="text-sm text-muted-foreground">
              Subscription billing, payment history, and customer management via Stripe Dashboard.
            </p>
            <a
              href="https://dashboard.stripe.com/subscriptions"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-2 text-sm text-violet-600 dark:text-violet-400 hover:underline"
            >
              Open Stripe Dashboard &rarr;
            </a>
          </div>
        </div>
      )}

      {/* ============================================= */}
      {/* Credit Economy Tab */}
      {/* ============================================= */}
      {activeTab === 'economy' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Credit Cost Settings</h3>
              <p className="text-sm text-muted-foreground">How many credits each operation costs (for free-tier & legacy users)</p>
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

          {/* Per-Use Credit Pricing Section */}
          <div className="bg-gradient-to-r from-teal-500/10 via-emerald-500/10 to-teal-500/10 border border-teal-500/30 rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-teal-500/20 rounded-lg">
                  <Zap className="w-5 h-5 text-teal-500" />
                </div>
                <div>
                  <h4 className="font-semibold text-lg">Per-Use Credit Pricing</h4>
                  <p className="text-sm text-muted-foreground">Users pay credits per operation</p>
                </div>
              </div>
              <span className="bg-teal-500 text-white text-xs font-bold px-2 py-1 rounded">
                LEGACY MODEL
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Capital Flow L3+L4 */}
              <div className="bg-card border rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-purple-500/10 rounded-lg">
                    <Globe className="w-5 h-5 text-purple-500" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Capital Flow L3+L4</p>
                    <p className="text-xs text-muted-foreground">Sectors + AI Recs</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    value={editingCosts.creditCostCapitalFlowL3L4 ?? 5}
                    onChange={(e) => setEditingCosts({ ...editingCosts, creditCostCapitalFlowL3L4: parseInt(e.target.value) || 0 })}
                    className="w-20 px-3 py-2 border rounded-lg text-center font-sans bg-background"
                  />
                  <span className="text-sm text-muted-foreground">cr/use</span>
                </div>
              </div>

              {/* Asset Analysis */}
              <div className="bg-card border border-violet-200 dark:border-violet-700 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-violet-500/10 rounded-lg">
                    <Activity className="w-5 h-5 text-violet-500" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Asset Analysis</p>
                    <p className="text-xs text-muted-foreground">7-Step / MLIS Pro</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    value={editingCosts.creditCostFullAnalysis ?? 10}
                    onChange={(e) => setEditingCosts({ ...editingCosts, creditCostFullAnalysis: parseInt(e.target.value) || 0 })}
                    className="w-20 px-3 py-2 border rounded-lg text-center font-sans bg-background"
                  />
                  <span className="text-sm text-muted-foreground">cr/analysis</span>
                </div>
              </div>

              {/* AI Expert Chat */}
              <div className="bg-card border rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-amber-500/10 rounded-lg">
                    <Star className="w-5 h-5 text-amber-500" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">AI Expert Chat</p>
                    <p className="text-xs text-muted-foreground">Per chat session</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    value={editingCosts.creditCostAiExpert ?? 5}
                    onChange={(e) => setEditingCosts({ ...editingCosts, creditCostAiExpert: parseInt(e.target.value) || 0 })}
                    className="w-20 px-3 py-2 border rounded-lg text-center font-sans bg-background"
                  />
                  <span className="text-sm text-muted-foreground">cr/chat</span>
                </div>
              </div>

              {/* AI Concierge */}
              <div className="bg-card border rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-emerald-500/10 rounded-lg">
                    <Target className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">AI Concierge</p>
                    <p className="text-xs text-muted-foreground">Per chat session</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    value={editingCosts.creditCostAiConcierge ?? 5}
                    onChange={(e) => setEditingCosts({ ...editingCosts, creditCostAiConcierge: parseInt(e.target.value) || 0 })}
                    className="w-20 px-3 py-2 border rounded-lg text-center font-sans bg-background"
                  />
                  <span className="text-sm text-muted-foreground">cr/chat</span>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="mt-4 p-3 bg-card/50 rounded-lg border border-dashed">
              <div className="flex items-center justify-between text-sm flex-wrap gap-2">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-purple-500" />
                    <span className="text-muted-foreground">L3+L4:</span>
                    <span className="font-sans font-medium">{editingCosts.creditCostCapitalFlowL3L4 ?? 5} cr</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-violet-500" />
                    <span className="text-muted-foreground">Analysis:</span>
                    <span className="font-sans font-medium">{editingCosts.creditCostFullAnalysis ?? 10} cr</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="text-muted-foreground">AI Expert:</span>
                    <span className="font-sans font-medium">{editingCosts.creditCostAiExpert ?? 5} cr</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-muted-foreground">Concierge:</span>
                    <span className="font-sans font-medium">{editingCosts.creditCostAiConcierge ?? 5} cr</span>
                  </div>
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
                        className="w-20 px-3 py-2 border rounded-lg text-center font-sans bg-background"
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
                    { key: 'creditCostAiExpert', label: 'AI Expert Chat', desc: 'Per chat session' },
                    { key: 'creditCostAiConcierge', label: 'AI Concierge', desc: 'Per chat session' },
                    { key: 'creditCostCapitalFlowL3L4', label: 'Capital Flow L3+L4', desc: 'Per use' },
                    { key: 'creditCostPdfReport', label: 'Snapshot Report', desc: 'Generate Snapshot PNG' },
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
                        className="w-20 px-3 py-2 border rounded-lg text-center font-sans bg-background"
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
                        className="w-full px-2 py-1 border rounded text-center font-sans text-sm bg-background"
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
                        className="w-full px-2 py-1 border border-violet-200 dark:border-violet-700 rounded text-center font-sans text-sm bg-background"
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

      {/* ============================================= */}
      {/* Packages Tab */}
      {/* ============================================= */}
      {activeTab === 'packages' && (
        <div className="space-y-8">
          {/* Credit Packages (One-time Purchase) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 rounded-lg">
                  <CreditCard className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Credit Packages</h3>
                  <p className="text-sm text-muted-foreground">One-time credit purchases for extra analyses</p>
                </div>
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
                      placeholder="Starter Pack, Pro Pack, etc."
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

            {/* Credit Packages Table */}
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
                        No packages yet. Create your first credit package.
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
                        <td className="p-4 font-sans">${parseFloat(pkg.priceUsd).toFixed(2)}</td>
                        <td className="p-4 font-sans text-muted-foreground">${parseFloat(pkg.pricePerCredit).toFixed(4)}</td>
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
        </div>
      )}
    </div>
  );
}
