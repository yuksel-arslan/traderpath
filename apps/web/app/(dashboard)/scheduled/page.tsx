'use client';

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
} from 'lucide-react';
import { CoinIcon } from '../../../components/common/CoinIcon';
import { cn } from '../../../lib/utils';
import { authFetch } from '../../../lib/api';

// Frequency options
type Frequency = 'DAILY' | 'WEEKLY' | 'MONTHLY';

const FREQUENCY_CONFIG: Record<Frequency, { label: string; description: string }> = {
  DAILY: { label: 'Daily', description: 'Every day' },
  WEEKLY: { label: 'Weekly', description: 'Once a week' },
  MONTHLY: { label: 'Monthly', description: 'Once a month' },
};

// Interval options
const INTERVAL_OPTIONS = [
  { value: '15m', label: '15m', description: 'Scalping' },
  { value: '1h', label: '1H', description: 'Day Trade' },
  { value: '4h', label: '4H', description: 'Day Trade' },
  { value: '1d', label: '1D', description: 'Swing' },
];

// Days of week
const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
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
    return date.toLocaleDateString('tr-TR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-teal-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4 md:p-6">
      {/* Background orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="w-8 h-8 text-teal-500" />
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
              Scheduled Reports
            </h1>
          </div>
          <p className="text-slate-600 dark:text-slate-400">
            Set up automated analyses for your favorite coins
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* Active Schedules */}
          <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-2xl p-5 border border-slate-200/50 dark:border-slate-700/50">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-xl bg-teal-500/10">
                <CheckCircle2 className="w-5 h-5 text-teal-500" />
              </div>
              <span className="text-sm text-slate-600 dark:text-slate-400">Active Schedules</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-900 dark:text-white">
                {reports.filter(r => r.isActive).length}
              </span>
              <span className="text-slate-500">/ {limits?.max || 3}</span>
            </div>
          </div>

          {/* Cost per Analysis */}
          <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-2xl p-5 border border-slate-200/50 dark:border-slate-700/50">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-xl bg-amber-500/10">
                <Zap className="w-5 h-5 text-amber-500" />
              </div>
              <span className="text-sm text-slate-600 dark:text-slate-400">Cost per Analysis</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-900 dark:text-white">
                {limits?.costPerAnalysis || 25}
              </span>
              <span className="text-slate-500">credits</span>
            </div>
          </div>

          {/* Remaining Slots */}
          <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-2xl p-5 border border-slate-200/50 dark:border-slate-700/50">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-xl bg-blue-500/10">
                <Activity className="w-5 h-5 text-blue-500" />
              </div>
              <span className="text-sm text-slate-600 dark:text-slate-400">Available Slots</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-900 dark:text-white">
                {limits?.remaining || 0}
              </span>
              <span className="text-slate-500">remaining</span>
            </div>
          </div>
        </div>

        {/* Create Button */}
        {(limits?.remaining || 0) > 0 && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="w-full mb-8 p-4 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-teal-500 dark:hover:border-teal-500 transition-colors group"
          >
            <div className="flex items-center justify-center gap-3 text-slate-500 dark:text-slate-400 group-hover:text-teal-500">
              <Plus className="w-5 h-5" />
              <span className="font-medium">Add New Scheduled Report</span>
            </div>
          </button>
        )}

        {/* Reports List */}
        {reports.length === 0 ? (
          <div className="text-center py-16 bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50">
            <Calendar className="w-16 h-16 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">
              No Scheduled Reports Yet
            </h3>
            <p className="text-slate-500 dark:text-slate-400 mb-6">
              Set up automated analyses for your favorite coins
            </p>
            {(limits?.remaining || 0) > 0 && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-medium hover:opacity-90 transition-opacity"
              >
                Create Your First Schedule
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => (
              <div
                key={report.id}
                className={cn(
                  "bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-2xl p-5 border transition-all",
                  report.isActive
                    ? "border-slate-200/50 dark:border-slate-700/50"
                    : "border-slate-200/30 dark:border-slate-700/30 opacity-60"
                )}
              >
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  {/* Coin Info */}
                  <div className="flex items-center gap-3 flex-1">
                    <CoinIcon symbol={report.symbol} size={40} />
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-900 dark:text-white">
                          {report.symbol}/USDT
                        </h3>
                        <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                          {report.interval?.toUpperCase() || '4H'}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {FREQUENCY_CONFIG[report.frequency].label} at {report.scheduleHour}:00 UTC
                        {report.frequency === 'WEEKLY' && report.scheduleDayOfWeek !== null && (
                          <span> on {DAYS_OF_WEEK[report.scheduleDayOfWeek].label}</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Delivery Methods */}
                  <div className="flex items-center gap-2">
                    {report.deliverEmail && (
                      <div className="p-1.5 rounded-lg bg-blue-500/10" title="Email">
                        <Mail className="w-4 h-4 text-blue-500" />
                      </div>
                    )}
                    {report.deliverTelegram && (
                      <div className="p-1.5 rounded-lg bg-sky-500/10" title="Telegram">
                        <MessageCircle className="w-4 h-4 text-sky-500" />
                      </div>
                    )}
                    {report.deliverDiscord && (
                      <div className="p-1.5 rounded-lg bg-indigo-500/10" title="Discord">
                        <Bell className="w-4 h-4 text-indigo-500" />
                      </div>
                    )}
                  </div>

                  {/* Next/Last Run */}
                  <div className="flex flex-col items-end text-sm">
                    <span className="text-slate-900 dark:text-white font-medium">
                      {report.isActive ? formatNextRun(report.nextRunAt) : 'Paused'}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400">
                      Last: {formatLastRun(report.lastRunAt)}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggle(report.id)}
                      disabled={actionLoading === report.id}
                      className={cn(
                        "p-2 rounded-xl transition-colors",
                        report.isActive
                          ? "bg-teal-500/10 text-teal-600 hover:bg-teal-500/20"
                          : "bg-slate-500/10 text-slate-500 hover:bg-slate-500/20"
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
                      className="p-2 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
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
        <div className="mt-8 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-700 dark:text-amber-300">
              <p className="font-medium mb-1">How Scheduled Reports Work</p>
              <ul className="list-disc list-inside space-y-1 text-amber-600 dark:text-amber-400">
                <li>Analyses run automatically at your chosen time (UTC timezone)</li>
                <li>Each analysis costs {limits?.costPerAnalysis || 25} credits</li>
                <li>Results are delivered via your selected channels (Email, Telegram, Discord)</li>
                <li>If you run low on credits, you&apos;ll receive a notification</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">
              Create Scheduled Report
            </h2>

            {/* Symbol Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Symbol
              </label>
              <input
                type="text"
                value={newReport.symbol}
                onChange={(e) => setNewReport({ ...newReport, symbol: e.target.value.toUpperCase() })}
                placeholder="e.g., BTC, ETH, SOL"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 outline-none"
              />
              <div className="flex flex-wrap gap-2 mt-2">
                {POPULAR_COINS.map((coin) => (
                  <button
                    key={coin}
                    type="button"
                    onClick={() => setNewReport({ ...newReport, symbol: coin })}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-medium transition-colors",
                      newReport.symbol === coin
                        ? "bg-teal-500 text-white"
                        : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                    )}
                  >
                    {coin}
                  </button>
                ))}
              </div>
            </div>

            {/* Interval Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Timeframe
              </label>
              <div className="grid grid-cols-4 gap-2">
                {INTERVAL_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setNewReport({ ...newReport, interval: opt.value })}
                    className={cn(
                      "px-3 py-2 rounded-xl text-center transition-colors",
                      newReport.interval === opt.value
                        ? "bg-teal-500 text-white"
                        : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                    )}
                  >
                    <span className="block text-sm font-medium">{opt.label}</span>
                    <span className="block text-xs opacity-70">{opt.description}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Frequency */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Frequency
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(FREQUENCY_CONFIG) as Frequency[]).map((freq) => (
                  <button
                    key={freq}
                    type="button"
                    onClick={() => setNewReport({ ...newReport, frequency: freq })}
                    className={cn(
                      "px-3 py-2 rounded-xl text-sm font-medium transition-colors",
                      newReport.frequency === freq
                        ? "bg-teal-500 text-white"
                        : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                    )}
                  >
                    {FREQUENCY_CONFIG[freq].label}
                  </button>
                ))}
              </div>
            </div>

            {/* Day of Week (for weekly) */}
            {newReport.frequency === 'WEEKLY' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Day of Week
                </label>
                <select
                  value={newReport.scheduleDayOfWeek}
                  onChange={(e) => setNewReport({ ...newReport, scheduleDayOfWeek: parseInt(e.target.value) })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 outline-none"
                >
                  {DAYS_OF_WEEK.map((day) => (
                    <option key={day.value} value={day.value}>{day.label}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Hour */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Time (UTC)
              </label>
              <select
                value={newReport.scheduleHour}
                onChange={(e) => setNewReport({ ...newReport, scheduleHour: parseInt(e.target.value) })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 outline-none"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>{i.toString().padStart(2, '0')}:00 UTC</option>
                ))}
              </select>
            </div>

            {/* Delivery Options */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Deliver To
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newReport.deliverEmail}
                    onChange={(e) => setNewReport({ ...newReport, deliverEmail: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-300 text-teal-500 focus:ring-teal-500"
                  />
                  <Mail className="w-4 h-4 text-blue-500" />
                  <span className="text-sm text-slate-700 dark:text-slate-300">Email</span>
                </label>
                <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newReport.deliverTelegram}
                    onChange={(e) => setNewReport({ ...newReport, deliverTelegram: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-300 text-teal-500 focus:ring-teal-500"
                  />
                  <MessageCircle className="w-4 h-4 text-sky-500" />
                  <span className="text-sm text-slate-700 dark:text-slate-300">Telegram</span>
                </label>
                <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newReport.deliverDiscord}
                    onChange={(e) => setNewReport({ ...newReport, deliverDiscord: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-300 text-teal-500 focus:ring-teal-500"
                  />
                  <Bell className="w-4 h-4 text-indigo-500" />
                  <span className="text-sm text-slate-700 dark:text-slate-300">Discord</span>
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={actionLoading === 'create' || !newReport.symbol}
                className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {actionLoading === 'create' ? (
                  <RefreshCw className="w-4 h-4 animate-spin mx-auto" />
                ) : (
                  'Create'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
