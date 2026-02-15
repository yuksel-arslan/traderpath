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

const FREQUENCY_CONFIG: Record<Frequency, { label: string; description: string; icon: React.ComponentType<{ className?: string }> }> = {
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
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-sans font-semibold',
      isActive ? 'text-[#22C55E]' : 'text-neutral-400'
    )}>
      <span className={cn(
        'w-1.5 h-1.5 rounded-full',
        isActive ? 'bg-[#22C55E]' : 'bg-neutral-400'
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
      'p-1.5 rounded-lg transition-colors',
      active
        ? 'text-neutral-900 dark:text-white'
        : 'text-neutral-300 dark:text-neutral-600'
    )}>
      <Icon className="w-3.5 h-3.5" />
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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      alert(message || 'Failed to create scheduled report');
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
      <div className="h-screen flex items-center justify-center bg-white dark:bg-neutral-950">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-neutral-400" />
          <span className="text-xs font-sans text-neutral-400">Loading schedules...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white overflow-hidden">
      <div className="max-w-7xl mx-auto w-full px-3 sm:px-4 flex flex-col h-full">
        {/* Header */}
        <div className="shrink-0 pt-4 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-[#14B8A6] rounded-full" />
                <div className="w-2 h-2 bg-[#EF5A6F] rounded-full" />
              </div>
              <span className="text-sm font-sans font-bold tracking-tight bg-gradient-to-r from-[#14B8A6] to-[#EF5A6F] bg-clip-text text-transparent">
                SCHEDULED
              </span>
              <span className="text-[10px] font-sans text-neutral-400 dark:text-neutral-500">
                Automated analysis · Recurring
              </span>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-sans rounded-lg bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 hover:opacity-90 transition-opacity"
            >
              <Plus className="w-3.5 h-3.5" />
              New Schedule
            </button>
          </div>
        </div>

        {/* Content */}
        <main className="flex-1 min-h-0 overflow-y-auto">

        {/* Stats Row */}
        <div className="flex items-center gap-4 mb-4 text-[11px] font-sans">
          <span className="text-neutral-400">Active: <span className="text-neutral-900 dark:text-white font-semibold">{reports.filter(r => r.isActive).length}</span> / {limits?.max || 3}</span>
          <span className="text-neutral-400">Cost: <span className="text-[#14B8A6] font-semibold">{limits?.costPerAnalysis || 25} credits</span></span>
          <span className="text-neutral-400">Remaining: <span className="text-neutral-900 dark:text-white font-semibold">{limits?.remaining ?? 0}</span></span>
        </div>

          {/* (Stats replaced by inline row above) */}

        {/* Reports List */}
        {reports.length === 0 ? (
          <div className="text-center py-16">
            <Calendar className="w-8 h-8 text-neutral-300 dark:text-neutral-600 mx-auto mb-3" />
            <p className="text-sm text-neutral-500">No scheduled reports yet</p>
            <p className="text-[10px] text-neutral-400 mt-1">Set up automated analyses for your favorite coins</p>
            {(limits?.remaining || 0) > 0 && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-4 text-xs text-[#14B8A6] hover:underline"
              >
                Create Your First Schedule
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-1.5">
            {reports.map((report) => (
              <div
                key={report.id}
                className={cn(
                  "group border rounded-xl px-4 py-3 transition-colors",
                  report.isActive
                    ? "border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900/50"
                    : "border-neutral-200/50 dark:border-neutral-800/50 opacity-60"
                )}
              >
                <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6">
                  {/* Coin Info */}
                  <div className="flex items-center gap-3 flex-1">
                    <CoinIcon symbol={report.symbol} size={32} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-sans font-bold text-neutral-900 dark:text-white">
                          {report.symbol}/USDT
                        </span>
                        <TimeframeBadge interval={report.interval?.toLowerCase() || '4h'} />
                        <FrequencyBadge frequency={report.frequency} />
                      </div>
                      <p className="text-[11px] text-neutral-400 mt-0.5 flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        {report.scheduleHour.toString().padStart(2, '0')}:00 UTC
                        {report.frequency === 'WEEKLY' && report.scheduleDayOfWeek !== null && (
                          <span className="text-neutral-400 dark:text-neutral-500">
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
                  <div className="flex items-center gap-3">
                    <StatusBadge isActive={report.isActive} />
                    <div className="text-[11px] text-neutral-400">
                      <span className={cn(
                        "font-semibold",
                        report.isActive ? "text-[#14B8A6]" : "text-neutral-500"
                      )}>
                        {report.isActive ? formatNextRun(report.nextRunAt) : 'Paused'}
                      </span>
                      <span className="mx-1">·</span>
                      <span>Last: {formatLastRun(report.lastRunAt)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleToggle(report.id)}
                      disabled={actionLoading === report.id}
                      className={cn(
                        "p-1.5 rounded-lg transition-colors",
                        report.isActive
                          ? "text-[#14B8A6] hover:bg-[#14B8A6]/10"
                          : "text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-900"
                      )}
                      title={report.isActive ? 'Pause' : 'Resume'}
                    >
                      {actionLoading === report.id ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : report.isActive ? (
                        <Pause className="w-3.5 h-3.5" />
                      ) : (
                        <Play className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDelete(report.id)}
                      disabled={actionLoading === report.id}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-[#EF5A6F] hover:bg-[#EF5A6F]/10 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info */}
        <div className="mt-6 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-neutral-400 mt-0.5 flex-shrink-0" />
            <div className="text-[11px] text-neutral-400 space-y-1">
              <p>Analyses run automatically at your chosen time (UTC). Each costs <span className="text-neutral-900 dark:text-white font-semibold">{limits?.costPerAnalysis || 25} credits</span>.</p>
              <p>Results delivered via Email, Telegram, or Discord. Low credits = notification before skip.</p>
            </div>
          </div>
        </div>

        </main>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="relative bg-white dark:bg-neutral-950 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-neutral-200 dark:border-neutral-800">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800 px-5 py-4 rounded-t-xl">
              <h2 className="text-sm font-sans font-bold text-neutral-900 dark:text-white">
                New Scheduled Report
              </h2>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Set up automated analysis for a coin
              </p>
            </div>

            <div className="px-5 py-4 space-y-4">
              {/* Symbol Selection */}
              <div>
                <label className="block text-[10px] text-neutral-400 dark:text-neutral-500 mb-1 font-sans">
                  Symbol
                </label>
                <input
                  type="text"
                  value={newReport.symbol}
                  onChange={(e) => setNewReport({ ...newReport, symbol: e.target.value.toUpperCase() })}
                  placeholder="e.g., BTC, ETH, SOL"
                  className="w-full px-2.5 py-1.5 text-xs font-sans bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#14B8A6]/50"
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
                          ? "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900"
                          : "bg-neutral-100 dark:bg-neutral-900 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800"
                      )}
                    >
                      {coin}
                    </button>
                  ))}
                </div>
              </div>

              {/* Interval Selection */}
              <div>
                <label className="block text-[10px] text-neutral-400 dark:text-neutral-500 mb-1 font-sans">
                  Timeframe
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {INTERVAL_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setNewReport({ ...newReport, interval: opt.value })}
                      className={cn(
                        "px-3 py-2 rounded-lg text-center transition-colors",
                        newReport.interval === opt.value
                          ? "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900"
                          : "bg-neutral-100 dark:bg-neutral-900 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800"
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
                <label className="block text-[10px] text-neutral-400 dark:text-neutral-500 mb-1 font-sans">
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
                          "px-3 py-2 rounded-lg transition-colors flex flex-col items-center gap-1",
                          newReport.frequency === freq
                            ? "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900"
                            : "bg-neutral-100 dark:bg-neutral-900 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800"
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
                  <label className="block text-[10px] text-neutral-400 dark:text-neutral-500 mb-1 font-sans">
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
                            ? "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900"
                            : "bg-neutral-100 dark:bg-neutral-900 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800"
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
                <label className="block text-[10px] text-neutral-400 dark:text-neutral-500 mb-1 font-sans">
                  Time (UTC)
                </label>
                <select
                  value={newReport.scheduleHour}
                  onChange={(e) => setNewReport({ ...newReport, scheduleHour: parseInt(e.target.value) })}
                  className="w-full px-2.5 py-1.5 text-xs font-sans bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#14B8A6]/50"
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>{i.toString().padStart(2, '0')}:00 UTC</option>
                  ))}
                </select>
              </div>

              {/* Delivery Options */}
              <div>
                <label className="block text-[10px] text-neutral-400 dark:text-neutral-500 mb-1 font-sans">
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
                        "flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-colors border",
                        newReport[key as keyof typeof newReport]
                          ? "border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900"
                          : "border-neutral-200/50 dark:border-neutral-800/50 hover:border-neutral-200 dark:hover:border-neutral-800"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={newReport[key as keyof typeof newReport] as boolean}
                        onChange={(e) => setNewReport({ ...newReport, [key]: e.target.checked })}
                        className="w-3.5 h-3.5 rounded border-neutral-300 text-[#14B8A6] focus:ring-[#14B8A6]"
                      />
                      <Icon className="w-3.5 h-3.5 text-neutral-400" />
                      <span className="text-xs font-sans text-neutral-600 dark:text-neutral-300">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-white dark:bg-neutral-950 border-t border-neutral-200 dark:border-neutral-800 px-5 py-4 rounded-b-xl">
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-3 py-1.5 text-xs font-sans rounded-lg border border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={actionLoading === 'create' || !newReport.symbol}
                  className="flex-1 px-3 py-1.5 text-xs font-sans rounded-lg bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 hover:opacity-90 transition-opacity disabled:opacity-40"
                >
                  {actionLoading === 'create' ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin mx-auto" />
                  ) : (
                    'Create Schedule'
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
