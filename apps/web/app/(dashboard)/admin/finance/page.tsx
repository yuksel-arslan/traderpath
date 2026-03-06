'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  DollarSign,
  RefreshCw,
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  Calculator,
  Activity,
  FileText,
  Calendar,
  Users,
  TrendingUp,
  Package,
} from 'lucide-react';
import Link from 'next/link';
import { authFetch } from '../../../../lib/api';

// ===========================================
// Types
// ===========================================

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
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Weekly Plans
  const [weeklyPlanStats, setWeeklyPlanStats] = useState<WeeklyPlanStats | null>(null);

  // ===========================================
  // Data Fetching
  // ===========================================

  const fetchData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    setError(null);

    try {
      const res = await authFetch('/api/admin/weekly-plans');

      if (res.status === 403) {
        setError('Admin access required');
        return;
      }

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setWeeklyPlanStats(data.data);
        }
      }
    } catch {
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
            <p className="text-muted-foreground mt-1">Weekly subscriptions & revenue</p>
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

      {/* Weekly Subscription Plans Overview */}
      <div className="space-y-6">
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
    </div>
  );
}
