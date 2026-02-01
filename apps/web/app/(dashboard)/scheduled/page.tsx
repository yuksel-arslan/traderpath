'use client';

// ===========================================
// Scheduled Reports Page
// Corporate Style - 2026 Design Trends
// ===========================================

import { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  RefreshCw,
  Mail,
  MessageCircle,
  Bell,
  Play,
  Pause,
  AlertCircle,
  Zap,
  CheckCircle2,
  Activity,
  Timer,
  ArrowRight,
  Settings,
  ChevronRight,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';
import { CoinIcon } from '../../../components/common/CoinIcon';
import { cn } from '../../../lib/utils';
import { authFetch } from '../../../lib/api';

// Frequency options
type Frequency = 'DAILY' | 'WEEKLY' | 'MONTHLY';

const FREQUENCY_CONFIG: Record<Frequency, { label: string; description: string; icon: any }> = {
  DAILY: { label: 'Daily', description: 'Every day at scheduled time', icon: Clock },
  WEEKLY: { label: 'Weekly', description: 'Once a week on selected day', icon: Calendar },
  MONTHLY: { label: 'Monthly', description: 'First day of each month', icon: Timer },
};

// Interval options
const INTERVAL_OPTIONS = [
  { value: '15m', label: '15m', description: 'Scalping', color: 'from-red-500 to-orange-500' },
  { value: '1h', label: '1H', description: 'Day Trade', color: 'from-amber-500 to-yellow-500' },
  { value: '4h', label: '4H', description: 'Day Trade', color: 'from-teal-500 to-emerald-500' },
  { value: '1d', label: '1D', description: 'Swing', color: 'from-blue-500 to-indigo-500' },
];

// Days of week
const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
];

// Popular coins for quick selection
const POPULAR_COINS = ['BTC', 'ETH', 'SOL', 'XRP', 'BNB', 'ADA', 'DOGE', 'AVAX', 'DOT', 'LINK'];

interface ScheduledReport {
  id: string;
  symbol: string;
  interval: string;
  frequency: Frequency;
  scheduleHour: number;
  scheduleDayOfWeek: number | null;
  deliverEmail: boolean;
  deliverTelegram: boolean;
  deliverDiscord: boolean;
  lastRunAt: string | null;
  nextRunAt: string;
  isActive: boolean;
  createdAt: string;
}

interface Limits {
  current: number;
  max: number;
  remaining: number;
  costPerAnalysis: number;
}

// Status Badge Component
function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold',
      isActive
        ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
        : 'bg-slate-100 dark:bg-slate-500/20 text-slate-600 dark:text-slate-400'
    )}>
      <span className={cn(
        'w-1.5 h-1.5 rounded-full',
        isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
      )} />
      {isActive ? 'ACTIVE' : 'PAUSED'}
    </span>
  );
}

// Frequency Badge
function FrequencyBadge({ frequency }: { frequency: Frequency }) {
  const config: Record<Frequency, { bg: string; color: string }> = {
    DAILY: { bg: 'bg-blue-100 dark:bg-blue-500/20', color: 'text-blue-600 dark:text-blue-400' },
    WEEKLY: { bg: 'bg-purple-100 dark:bg-purple-500/20', color: 'text-purple-600 dark:text-purple-400' },
    MONTHLY: { bg: 'bg-amber-100 dark:bg-amber-500/20', color: 'text-amber-600 dark:text-amber-400' },
  };
  const { bg, color } = config[frequency];

  return (
    <span className={cn('px-2 py-0.5 rounded-full text-xs font-bold', bg, color)}>
      {frequency}
    </span>
  );
}

// Timeframe Badge
function TimeframeBadge({ interval }: { interval: string }) {
  const option = INTERVAL_OPTIONS.find(o => o.value === interval) || INTERVAL_OPTIONS[2];

  return (
    <span className={cn(
      'px-2 py-0.5 rounded-md text-xs font-bold text-white bg-gradient-to-r',
      option.color
    )}>
      {option.label}
    </span>
  );
}

// Delivery Channel Icon
function DeliveryIcon({ type, active }: { type: 'email' | 'telegram' | 'discord'; active: boolean }) {
  const icons = {
    email: Mail,
    telegram: MessageCircle,
    discord: Bell,
  };
  const colors = {
    email: 'text-blue-500',
    telegram: 'text-sky-500',
    discord: 'text-indigo-500',
  };
  const Icon = icons[type];

  return (
    <div className={cn(
      'p-2 rounded-xl transition-all',
      active
        ? `bg-gradient-to-br from-${type === 'email' ? 'blue' : type === 'telegram' ? 'sky' : 'indigo'}-500/10 to-${type === 'email' ? 'blue' : type === 'telegram' ? 'sky' : 'indigo'}-500/5`
        : 'bg-slate-100 dark:bg-slate-800 opacity-40'
    )}>
      <Icon className={cn('w-4 h-4', active ? colors[type] : 'text-slate-400')} />
    </div>
  );
}

export default function ScheduledReportsPage() {
  const [reports, setReports] = useState<ScheduledReport[]>([]);
  const [limits, setLimits] = useState<Limits | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Create form state
  const [newReport, setNewReport] = useState({
    symbol: '',
    interval: '4h',
    frequency: 'DAILY' as Frequency,
    scheduleHour: 8,
    scheduleDayOfWeek: 1,
    deliverEmail: true,
    deliverTelegram: false,
    deliverDiscord: false,
  });

  // Fetch reports and limits
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [reportsRes, limitsRes] = await Promise.all([
        authFetch('/api/scheduled-reports'),
        authFetch('/api/scheduled-reports/limits'),
      ]);

      if (reportsRes.ok) {
        const data = await reportsRes.json();
        setReports(data.data || []);
      }

      if (limitsRes.ok) {
        const data = await limitsRes.json();
        setLimits(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch scheduled reports:', err);
      setError('Failed to load scheduled reports');
    } finally {
      setLoading(false);
    }
  };

  // Create new scheduled report
  const handleCreate = async () => {
    if (!newReport.symbol) {
      alert('Please enter a symbol');
      return;
    }

    setActionLoading('create');

    try {
      const response = await authFetch('/api/scheduled-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newReport),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to create scheduled report');
      }

      setReports([data.data, ...reports]);
      setShowCreateModal(false);
      setNewReport({
        symbol: '',
        interval: '4h',
        frequency: 'DAILY',
        scheduleHour: 8,
        scheduleDayOfWeek: 1,
        deliverEmail: true,
        deliverTelegram: false,
        deliverDiscord: false,
      });

      // Refresh limits
      const limitsRes = await authFetch('/api/scheduled-reports/limits');
      if (limitsRes.ok) {
        const limitsData = await limitsRes.json();
        setLimits(limitsData.data);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create scheduled report');
    } finally {
      setActionLoading(null);
    }
  };

  // Toggle active status
  const handleToggle = async (id: string) => {
    setActionLoading(id);

    try {
      const response = await authFetch(`/api/scheduled-reports/${id}/toggle`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to toggle scheduled report');
      }

      const data = await response.json();
      setReports(reports.map(r => r.id === id ? data.data : r));
    } catch (err) {
      alert('Failed to toggle scheduled report');
    } finally {
      setActionLoading(null);
    }
  };

  // Delete report
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this scheduled report?')) return;

    setActionLoading(id);

    try {
      const response = await authFetch(`/api/scheduled-reports/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete scheduled report');
      }

      setReports(reports.filter(r => r.id !== id));

      // Refresh limits
      const limitsRes = await authFetch('/api/scheduled-reports/limits');
      if (limitsRes.ok) {
        const limitsData = await limitsRes.json();
        setLimits(limitsData.data);
      }
    } catch (err) {
      alert('Failed to delete scheduled report');
    } finally {
      setActionLoading(null);
    }
  };

  // Format next run time
  const formatNextRun = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));

    if (diffHours < 1) return 'Soon';
    if (diffHours < 24) return `In ${diffHours}h`;
    const diffDays = Math.round(diffHours / 24);
    if (diffDays === 1) return 'Tomorrow';
    return `In ${diffDays} days`;
  };

  // Format last run time
  const formatLastRun = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full blur-xl opacity-30 animate-pulse" />
            <RefreshCw className="w-10 h-10 animate-spin text-teal-500 relative" />
          </div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Loading schedules...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-gradient-to-br from-teal-500/20 to-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-[500px] h-[500px] bg-gradient-to-br from-orange-500/15 to-amber-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-blue-500/10 to-indigo-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-6xl mx-auto p-4 md:p-6 lg:p-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-2xl blur-lg opacity-40" />
              <div className="relative w-14 h-14 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-2xl flex items-center justify-center">
                <Calendar className="w-7 h-7 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900 dark:from-white dark:via-slate-300 dark:to-white bg-clip-text text-transparent">
                Scheduled Reports
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                Automate your analysis workflow with scheduled reports
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* Active Schedules */}
          <div className="group relative backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/50 dark:border-slate-700/50 rounded-2xl p-6 hover:border-teal-500/50 transition-all hover:shadow-lg hover:shadow-teal-500/10">
            <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-emerald-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-teal-500/10 to-emerald-500/10">
                  <CheckCircle2 className="w-5 h-5 text-teal-500" />
                </div>
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Active Schedules</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold bg-gradient-to-r from-teal-600 to-emerald-600 dark:from-teal-400 dark:to-emerald-400 bg-clip-text text-transparent">
                  {reports.filter(r => r.isActive).length}
                </span>
                <span className="text-slate-500 dark:text-slate-400 font-medium">/ {limits?.max || 3}</span>
              </div>
              <div className="mt-3 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full transition-all"
                  style={{ width: `${(reports.filter(r => r.isActive).length / (limits?.max || 3)) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Cost per Analysis */}
          <div className="group relative backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/50 dark:border-slate-700/50 rounded-2xl p-6 hover:border-amber-500/50 transition-all hover:shadow-lg hover:shadow-amber-500/10">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-orange-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10">
                  <Zap className="w-5 h-5 text-amber-500" />
                </div>
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Cost per Analysis</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 dark:from-amber-400 dark:to-orange-400 bg-clip-text text-transparent">
                  {limits?.costPerAnalysis || 25}
                </span>
                <span className="text-slate-500 dark:text-slate-400 font-medium">credits</span>
              </div>
              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                Charged automatically when analysis runs
              </p>
            </div>
          </div>

          {/* Remaining Slots */}
          <div className="group relative backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/50 dark:border-slate-700/50 rounded-2xl p-6 hover:border-blue-500/50 transition-all hover:shadow-lg hover:shadow-blue-500/10">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10">
                  <Activity className="w-5 h-5 text-blue-500" />
                </div>
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Available Slots</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
                  {limits?.remaining || 0}
                </span>
                <span className="text-slate-500 dark:text-slate-400 font-medium">remaining</span>
              </div>
              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                Upgrade to add more schedules
              </p>
            </div>
          </div>
        </div>

        {/* Create Button */}
        {(limits?.remaining || 0) > 0 && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="group w-full mb-8 p-5 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-teal-500 dark:hover:border-teal-500 transition-all bg-gradient-to-r from-transparent via-teal-500/5 to-transparent hover:from-teal-500/10 hover:via-teal-500/5 hover:to-teal-500/10"
          >
            <div className="flex items-center justify-center gap-3 text-slate-500 dark:text-slate-400 group-hover:text-teal-500 transition-colors">
              <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 group-hover:bg-teal-500/10 transition-colors">
                <Plus className="w-5 h-5" />
              </div>
              <span className="font-semibold">Add New Scheduled Report</span>
              <ChevronRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
            </div>
          </button>
        )}

        {/* Reports List */}
        {reports.length === 0 ? (
          <div className="relative backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/50 dark:border-slate-700/50 rounded-2xl p-12 text-center">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-500/5 to-slate-500/5 rounded-2xl" />
            <div className="relative">
              <div className="relative mx-auto w-20 h-20 mb-6">
                <div className="absolute inset-0 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-2xl blur-xl opacity-30" />
                <div className="relative w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 rounded-2xl flex items-center justify-center">
                  <Calendar className="w-10 h-10 text-slate-400 dark:text-slate-500" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">
                No Scheduled Reports Yet
              </h3>
              <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-md mx-auto">
                Set up automated analyses for your favorite coins and receive insights delivered to your inbox, Telegram, or Discord.
              </p>
              {(limits?.remaining || 0) > 0 && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-teal-500/25"
                >
                  <Sparkles className="w-4 h-4" />
                  Create Your First Schedule
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => (
              <div
                key={report.id}
                className={cn(
                  "group relative backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border rounded-2xl p-6 transition-all",
                  report.isActive
                    ? "border-slate-200/50 dark:border-slate-700/50 hover:border-teal-500/50 hover:shadow-lg hover:shadow-teal-500/10"
                    : "border-slate-200/30 dark:border-slate-700/30 opacity-70"
                )}
              >
                <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6">
                  {/* Coin Info */}
                  <div className="flex items-center gap-4 flex-1">
                    <div className="relative">
                      <div className={cn(
                        "absolute inset-0 rounded-full blur-md transition-opacity",
                        report.isActive ? "bg-teal-500/30 opacity-100" : "opacity-0"
                      )} />
                      <CoinIcon symbol={report.symbol} size={48} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                          {report.symbol}/USDT
                        </h3>
                        <TimeframeBadge interval={report.interval?.toLowerCase() || '4h'} />
                        <FrequencyBadge frequency={report.frequency} />
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5" />
                        {report.scheduleHour.toString().padStart(2, '0')}:00 UTC
                        {report.frequency === 'WEEKLY' && report.scheduleDayOfWeek !== null && (
                          <span className="text-slate-400 dark:text-slate-500">
                            on {DAYS_OF_WEEK[report.scheduleDayOfWeek].label}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Delivery Methods */}
                  <div className="flex items-center gap-2">
                    <DeliveryIcon type="email" active={report.deliverEmail} />
                    <DeliveryIcon type="telegram" active={report.deliverTelegram} />
                    <DeliveryIcon type="discord" active={report.deliverDiscord} />
                  </div>

                  {/* Status & Timing */}
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="flex items-center gap-2 justify-end mb-1">
                        <StatusBadge isActive={report.isActive} />
                      </div>
                      <div className="text-sm">
                        <span className={cn(
                          "font-semibold",
                          report.isActive ? "text-teal-600 dark:text-teal-400" : "text-slate-500"
                        )}>
                          {report.isActive ? formatNextRun(report.nextRunAt) : 'Paused'}
                        </span>
                        <span className="text-slate-400 dark:text-slate-500 mx-1">•</span>
                        <span className="text-slate-500 dark:text-slate-400">
                          Last: {formatLastRun(report.lastRunAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggle(report.id)}
                      disabled={actionLoading === report.id}
                      className={cn(
                        "p-2.5 rounded-xl transition-all",
                        report.isActive
                          ? "bg-gradient-to-br from-teal-500/10 to-emerald-500/10 text-teal-600 dark:text-teal-400 hover:from-teal-500/20 hover:to-emerald-500/20"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"
                      )}
                      title={report.isActive ? 'Pause' : 'Resume'}
                    >
                      {actionLoading === report.id ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : report.isActive ? (
                        <Pause className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDelete(report.id)}
                      disabled={actionLoading === report.id}
                      className="p-2.5 rounded-xl bg-gradient-to-br from-red-500/10 to-orange-500/10 text-red-500 hover:from-red-500/20 hover:to-orange-500/20 transition-all"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info Box */}
        <div className="mt-8 backdrop-blur-xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200/50 dark:border-amber-500/30 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex-shrink-0">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h4 className="font-bold text-amber-900 dark:text-amber-300 mb-2">How Scheduled Reports Work</h4>
              <ul className="space-y-2 text-sm text-amber-800 dark:text-amber-400">
                <li className="flex items-start gap-2">
                  <Target className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>Analyses run automatically at your chosen time (UTC timezone)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Zap className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>Each analysis costs <strong>{limits?.costPerAnalysis || 25} credits</strong> - charged when the report runs</span>
                </li>
                <li className="flex items-start gap-2">
                  <TrendingUp className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>Results are delivered via your selected channels (Email, Telegram, Discord)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Bell className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>If you run low on credits, you&apos;ll receive a notification before the analysis is skipped</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-700">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 p-6 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-teal-500/10 to-emerald-500/10">
                  <Calendar className="w-5 h-5 text-teal-500" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    Create Scheduled Report
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Set up automated analysis for a coin
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Symbol Selection */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Symbol
                </label>
                <input
                  type="text"
                  value={newReport.symbol}
                  onChange={(e) => setNewReport({ ...newReport, symbol: e.target.value.toUpperCase() })}
                  placeholder="e.g., BTC, ETH, SOL"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all"
                />
                <div className="flex flex-wrap gap-2 mt-3">
                  {POPULAR_COINS.map((coin) => (
                    <button
                      key={coin}
                      type="button"
                      onClick={() => setNewReport({ ...newReport, symbol: coin })}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                        newReport.symbol === coin
                          ? "bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-lg shadow-teal-500/25"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                      )}
                    >
                      {coin}
                    </button>
                  ))}
                </div>
              </div>

              {/* Interval Selection */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Timeframe
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {INTERVAL_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setNewReport({ ...newReport, interval: opt.value })}
                      className={cn(
                        "px-3 py-3 rounded-xl text-center transition-all",
                        newReport.interval === opt.value
                          ? `bg-gradient-to-r ${opt.color} text-white shadow-lg`
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                      )}
                    >
                      <span className="block text-sm font-bold">{opt.label}</span>
                      <span className="block text-xs opacity-80 mt-0.5">{opt.description}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Frequency */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Frequency
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(FREQUENCY_CONFIG) as Frequency[]).map((freq) => {
                    const config = FREQUENCY_CONFIG[freq];
                    const Icon = config.icon;
                    return (
                      <button
                        key={freq}
                        type="button"
                        onClick={() => setNewReport({ ...newReport, frequency: freq })}
                        className={cn(
                          "px-4 py-3 rounded-xl transition-all flex flex-col items-center gap-1",
                          newReport.frequency === freq
                            ? "bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-lg shadow-teal-500/25"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                        )}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-sm font-semibold">{config.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Day of Week (for weekly) */}
              {newReport.frequency === 'WEEKLY' && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Day of Week
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {DAYS_OF_WEEK.map((day) => (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => setNewReport({ ...newReport, scheduleDayOfWeek: day.value })}
                        className={cn(
                          "px-3 py-2 rounded-lg text-sm font-medium transition-all",
                          newReport.scheduleDayOfWeek === day.value
                            ? "bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-lg shadow-teal-500/25"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                        )}
                      >
                        {day.short}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Hour */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Time (UTC)
                </label>
                <select
                  value={newReport.scheduleHour}
                  onChange={(e) => setNewReport({ ...newReport, scheduleHour: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all"
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>{i.toString().padStart(2, '0')}:00 UTC</option>
                  ))}
                </select>
              </div>

              {/* Delivery Options */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Deliver To
                </label>
                <div className="space-y-2">
                  {[
                    { key: 'deliverEmail', label: 'Email', icon: Mail, color: 'blue' },
                    { key: 'deliverTelegram', label: 'Telegram', icon: MessageCircle, color: 'sky' },
                    { key: 'deliverDiscord', label: 'Discord', icon: Bell, color: 'indigo' },
                  ].map(({ key, label, icon: Icon, color }) => (
                    <label
                      key={key}
                      className={cn(
                        "flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all border",
                        newReport[key as keyof typeof newReport]
                          ? `bg-${color}-50 dark:bg-${color}-500/10 border-${color}-200 dark:border-${color}-500/30`
                          : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={newReport[key as keyof typeof newReport] as boolean}
                        onChange={(e) => setNewReport({ ...newReport, [key]: e.target.checked })}
                        className="w-4 h-4 rounded border-slate-300 text-teal-500 focus:ring-teal-500"
                      />
                      <Icon className={cn('w-5 h-5', `text-${color}-500`)} />
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 p-6 rounded-b-2xl">
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={actionLoading === 'create' || !newReport.symbol}
                  className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 shadow-lg shadow-teal-500/25"
                >
                  {actionLoading === 'create' ? (
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto" />
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      Create Schedule
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
