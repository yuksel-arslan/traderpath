'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Server,
  Activity,
  Users,
  TrendingUp,
  CreditCard,
  FileText,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Trash2,
  Clock,
  Cpu,
  HardDrive,
  Zap,
  BarChart3,
  Search,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Brain,
  Gift,
  X,
  Shield,
  Target,
  Globe,
} from 'lucide-react';
import Link from 'next/link';
import { authFetch } from '../../../lib/api';

interface HealthCheck {
  status: 'healthy' | 'degraded' | 'down';
  latency?: number;
  details?: string;
}

interface SystemHealth {
  status: string;
  timestamp: string;
  checks: {
    database: HealthCheck;
    redis: HealthCheck;
    binance: HealthCheck;
    tft: HealthCheck;
  };
}

interface SystemMetrics {
  server: {
    uptime: number;
    uptimeFormatted: string;
    nodeVersion: string;
    platform: string;
    arch: string;
    hostname: string;
  };
  process: {
    pid: number;
    memoryUsage: {
      heapUsed: string;
      heapTotal: string;
      rss: string;
      external: string;
    };
  };
  system: {
    cpuUsage: string;
    cpuCores: number;
    memoryTotal: string;
    memoryUsed: string;
    memoryFree: string;
    memoryUsagePercent: string;
    loadAverage: string[];
  };
}

interface AppStats {
  users: {
    total: number;
    newToday: number;
    newThisWeek: number;
    newThisMonth: number;
    activeToday: number;
  };
  analyses: {
    total: number;
    today: number;
    thisWeek: number;
  };
  credits: {
    totalSpent: number;
    spentToday: number;
    totalPurchased: number;
  };
  reports: {
    total: number;
    active: number;
    expired: number;
  };
  topCoins: Array<{ symbol: string; count: number }>;
}

interface SignalStats {
  total: number;
  published: number;
  outcomes: {
    tp1Hit: number;
    tp2Hit: number;
    slHit: number;
    expired: number;
  };
  winRate: number;
  byMarket: Array<{ market: string; count: number }>;
}

interface UserData {
  id: string;
  email: string;
  name: string;
  level: number;
  createdAt: string;
  lastLoginAt: string | null;
  streakDays: number;
  creditBalance: number;
  transactionCount: number;
  reportCount: number;
}

interface ActivityItem {
  id: string;
  type: string;
  amount: number;
  source: string;
  user: string;
  metadata: Record<string, any>;
  createdAt: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [system, setSystem] = useState<SystemMetrics | null>(null);
  const [stats, setStats] = useState<AppStats | null>(null);
  const [signalStats, setSignalStats] = useState<SignalStats | null>(null);
  const [users, setUsers] = useState<UserData[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'activity'>('overview');
  const [userSearch, setUserSearch] = useState('');
  const [userPage, setUserPage] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [cleanupResult, setCleanupResult] = useState<string | null>(null);
  const [isGeneratingSignals, setIsGeneratingSignals] = useState(false);
  const [isGeneratingAutoEdge, setIsGeneratingAutoEdge] = useState(false);
  const [signalHealth, setSignalHealth] = useState<any>(null);

  // Grant credits modal state
  const [grantModalOpen, setGrantModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [grantAmount, setGrantAmount] = useState('');
  const [grantReason, setGrantReason] = useState('');
  const [isGranting, setIsGranting] = useState(false);

  const fetchData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    setError(null);

    try {
      const [healthRes, systemRes, statsRes, activityRes, signalStatsRes, signalHealthRes] = await Promise.all([
        authFetch('/api/admin/health'),
        authFetch('/api/admin/system'),
        authFetch('/api/admin/stats'),
        authFetch('/api/admin/activity'),
        authFetch('/api/v1/signals/stats'),
        authFetch('/api/v1/signals/admin/health'),
      ]);

      if (healthRes.status === 403) {
        setError('Admin access required');
        return;
      }

      if (healthRes.ok) {
        const data = await healthRes.json();
        setHealth(data.data);
      }
      if (systemRes.ok) {
        const data = await systemRes.json();
        setSystem(data.data);
      }
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.data);
      }
      if (activityRes.ok) {
        const data = await activityRes.json();
        setActivity(data.data.activity);
      }
      if (signalStatsRes.ok) {
        const data = await signalStatsRes.json();
        if (data.success && data.data) {
          setSignalStats(data.data);
        }
      }
      if (signalHealthRes.ok) {
        const data = await signalHealthRes.json();
        if (data.success && data.data) {
          setSignalHealth(data.data);
        }
      }
    } catch (err) {
      setError('Failed to fetch admin data');
      console.error(err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [router]);

  const fetchUsers = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        limit: '20',
        offset: String(userPage * 20),
        search: userSearch,
      });

      const response = await authFetch(`/api/admin/users?${params}`);

      if (response.ok) {
        const data = await response.json();
        setUsers(data.data.users);
        setTotalUsers(data.data.pagination.total);
      }
    } catch (err) {
      console.error(err);
    }
  }, [userPage, userSearch]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(), 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    }
  }, [activeTab, fetchUsers]);

  const handleCleanup = async () => {
    if (!confirm('Are you sure you want to run cleanup? This will delete expired reports and old transactions.')) {
      return;
    }

    try {
      const response = await authFetch('/api/admin/maintenance/cleanup', {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        setCleanupResult(`Deleted ${data.data.deletedReports} reports and ${data.data.deletedTransactions} transactions`);
        setTimeout(() => setCleanupResult(null), 5000);
        fetchData(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearCache = async () => {
    if (!confirm('Are you sure you want to clear the cache?')) {
      return;
    }

    try {
      const response = await authFetch('/api/admin/cache/clear', {
        method: 'POST',
        body: JSON.stringify({ pattern: '*' }),
      });

      if (response.ok) {
        setCleanupResult('Cache cleared successfully');
        setTimeout(() => setCleanupResult(null), 5000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const pollSignalHealth = async (generatorType: 'signal' | 'autoedge') => {
    const label = generatorType === 'signal' ? 'Signal Generator' : 'AutoEdge';
    let attempts = 0;
    const maxAttempts = 40; // 40 × 15s = 10 minutes max
    const pollInterval = 15000; // 15 seconds

    const poll = async () => {
      attempts++;
      try {
        const healthRes = await authFetch('/api/v1/signals/admin/health');
        if (healthRes.ok) {
          const healthData = await healthRes.json();
          const metrics = generatorType === 'signal'
            ? healthData.data?.metrics?.generator
            : healthData.data?.metrics?.autoedge;

          if (metrics?.lastRunAt) {
            const lastRunTime = new Date(metrics.lastRunAt).getTime();
            const now = Date.now();
            // If last run was within the last 30 seconds, it just finished
            if (now - lastRunTime < 30000) {
              const generated = metrics.signalsGenerated ?? 0;
              setCleanupResult(`${label} completed: ${generated} total signals generated`);
              if (generatorType === 'signal') setIsGeneratingSignals(false);
              else setIsGeneratingAutoEdge(false);
              fetchData(true);
              setTimeout(() => setCleanupResult(null), 10000);
              return; // Stop polling
            }
          }
        }
      } catch {
        // ignore poll errors
      }

      if (attempts < maxAttempts) {
        setCleanupResult(`${label} running... (${attempts * 15}s elapsed, checking every 15s)`);
        setTimeout(poll, pollInterval);
      } else {
        setCleanupResult(`${label} may still be running. Check health status for results.`);
        if (generatorType === 'signal') setIsGeneratingSignals(false);
        else setIsGeneratingAutoEdge(false);
        setTimeout(() => setCleanupResult(null), 10000);
      }
    };

    // Start polling after initial delay
    setTimeout(poll, pollInterval);
  };

  const handleGenerateSignals = async () => {
    setIsGeneratingSignals(true);
    setCleanupResult('Signal Generator started... Running Capital Flow → 7-Step analysis cycle.');
    try {
      const response = await authFetch('/api/v1/signals/admin/generate', {
        method: 'POST',
      });
      if (response.ok) {
        const data = await response.json();
        const r = data.data;
        if (r.status === 'error') {
          setCleanupResult(`⚠ Signal Generator: ${r.message}`);
          setIsGeneratingSignals(false);
          setTimeout(() => setCleanupResult(null), 10000);
        } else if (r.status === 'skipped') {
          setCleanupResult(`Signal Generator skipped: ${r.message}`);
          setIsGeneratingSignals(false);
          setTimeout(() => setCleanupResult(null), 10000);
        } else if (r.status === 'started') {
          // Fire-and-forget: poll for completion
          setCleanupResult('Signal Generator started in background... Polling for results.');
          pollSignalHealth('signal');
        } else {
          setCleanupResult(r.message || `Signal generation complete: ${r.generated} generated, ${r.published} published`);
          setIsGeneratingSignals(false);
          fetchData(true);
          setTimeout(() => setCleanupResult(null), 10000);
        }
      } else {
        const err = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
        setCleanupResult(`Signal generation failed: ${err.error || 'Unknown error'}`);
        setIsGeneratingSignals(false);
        setTimeout(() => setCleanupResult(null), 8000);
      }
    } catch (err) {
      console.error(err);
      setCleanupResult('Signal generation request failed — check network/API connection');
      setIsGeneratingSignals(false);
      setTimeout(() => setCleanupResult(null), 8000);
    }
  };

  const handleGenerateAutoEdge = async () => {
    setIsGeneratingAutoEdge(true);
    setCleanupResult('AutoEdge v2 started... Scanning top Binance USDT perpetuals.');
    try {
      const response = await authFetch('/api/v1/signals/admin/generate-autoedge', {
        method: 'POST',
      });
      if (response.ok) {
        const data = await response.json();
        const r = data.data;
        if (r.status === 'error') {
          setCleanupResult(`⚠ AutoEdge: ${r.message}`);
          setIsGeneratingAutoEdge(false);
          setTimeout(() => setCleanupResult(null), 10000);
        } else if (r.status === 'skipped') {
          setCleanupResult(`AutoEdge skipped: ${r.message}`);
          setIsGeneratingAutoEdge(false);
          setTimeout(() => setCleanupResult(null), 10000);
        } else if (r.status === 'started') {
          // Fire-and-forget: poll for completion
          setCleanupResult('AutoEdge started in background... Polling for results.');
          pollSignalHealth('autoedge');
        } else {
          setCleanupResult(r.message || `AutoEdge complete: ${r.generated} generated, ${r.published} published`);
          setIsGeneratingAutoEdge(false);
          fetchData(true);
          setTimeout(() => setCleanupResult(null), 10000);
        }
      } else {
        const err = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
        setCleanupResult(`AutoEdge failed: ${err.error || 'Unknown error'}`);
        setIsGeneratingAutoEdge(false);
        setTimeout(() => setCleanupResult(null), 8000);
      }
    } catch (err) {
      console.error(err);
      setCleanupResult('AutoEdge request failed — check network/API connection');
      setIsGeneratingAutoEdge(false);
      setTimeout(() => setCleanupResult(null), 8000);
    }
  };

  const openGrantModal = (user: UserData) => {
    setSelectedUser(user);
    setGrantAmount('');
    setGrantReason('');
    setGrantModalOpen(true);
  };

  const handleGrantCredits = async () => {
    if (!selectedUser || !grantAmount) return;

    const amount = parseInt(grantAmount);
    if (isNaN(amount) || amount <= 0 || amount > 10000) {
      alert('Please enter a valid amount (1-10000)');
      return;
    }

    setIsGranting(true);
    try {
      const response = await authFetch(`/api/admin/users/${selectedUser.id}/credits`, {
        method: 'POST',
        body: JSON.stringify({
          amount,
          reason: grantReason || undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const notifications = data.data.notifications;
        const channels: string[] = [];
        if (notifications?.email) channels.push('Email');
        if (notifications?.social > 0) {
          notifications.channels?.forEach((c: { channel: string; success: boolean }) => {
            if (c.success) channels.push(c.channel.charAt(0).toUpperCase() + c.channel.slice(1));
          });
        }
        const notifStatus = channels.length > 0 ? ` (Sent: ${channels.join(', ')})` : ' (No notifications sent)';
        setCleanupResult(`Granted ${amount} credits to ${selectedUser.name || selectedUser.email}. New balance: ${data.data.newBalance}${notifStatus}`);
        setTimeout(() => setCleanupResult(null), 5000);
        setGrantModalOpen(false);
        setSelectedUser(null);
        fetchUsers();
      } else {
        const errorData = await response.json();
        alert(errorData.error?.message || 'Failed to grant credits');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to grant credits');
    } finally {
      setIsGranting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'down':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Activity className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-500/10 border-green-500/20 text-green-500';
      case 'degraded':
        return 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500';
      case 'down':
        return 'bg-red-500/10 border-red-500/20 text-red-500';
      default:
        return 'bg-muted';
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
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
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
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Server className="w-8 h-8 text-primary" />
            <span className="gradient-text-logo-animate">System Administration</span>
          </h1>
          <p className="text-muted-foreground mt-1">Monitor and manage your application</p>
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

      {/* Cleanup Result */}
      {cleanupResult && (
        <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-500">
          {cleanupResult}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-border">
        {[
          { id: 'overview', label: 'Overview', icon: BarChart3 },
          { id: 'users', label: 'Users', icon: Users },
          { id: 'activity', label: 'Activity', icon: Activity },
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
        <Link
          href="/admin/finance"
          className="flex items-center gap-2 px-4 py-3 border-b-2 border-transparent text-muted-foreground hover:text-foreground transition"
        >
          <DollarSign className="w-4 h-4" />
          Finance
        </Link>
        <Link
          href="/admin/models"
          className="flex items-center gap-2 px-4 py-3 border-b-2 border-transparent text-muted-foreground hover:text-foreground transition"
        >
          <Brain className="w-4 h-4" />
          AI Models
        </Link>
        <Link
          href="/admin/bilge"
          className="flex items-center gap-2 px-4 py-3 border-b-2 border-transparent text-muted-foreground hover:text-foreground transition"
        >
          <Shield className="w-4 h-4 text-[#40E0D0]" />
          BILGE
        </Link>
      </div>

      {activeTab === 'overview' && (
        <>
          {/* System Health */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
            <div className={`p-4 rounded-lg border ${getStatusColor(health?.status || 'unknown')}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Overall Status</span>
                {getStatusIcon(health?.status || 'unknown')}
              </div>
              <p className="text-2xl font-bold capitalize">{health?.status || 'Unknown'}</p>
            </div>

            {health?.checks && Object.entries(health.checks).map(([name, check]) => (
              <div key={name} className={`p-4 rounded-lg border ${getStatusColor(check.status)}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium capitalize">{name === 'tft' ? 'TFT Predictor' : name}</span>
                  {getStatusIcon(check.status)}
                </div>
                <p className="text-2xl font-bold capitalize">{check.status}</p>
                {check.latency && (
                  <p className="text-sm opacity-75">{check.latency}ms</p>
                )}
                {check.details && (
                  <p className="text-xs opacity-60 truncate" title={check.details}>{check.details}</p>
                )}
              </div>
            ))}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-card border rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Users className="w-5 h-5 text-blue-500" />
                </div>
                <span className="text-sm text-muted-foreground">Total Users</span>
              </div>
              <p className="text-3xl font-bold">{stats?.users.total || 0}</p>
              <p className="text-sm text-green-500">+{stats?.users.newToday || 0} today</p>
            </div>

            <div className="bg-card border rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-purple-500" />
                </div>
                <span className="text-sm text-muted-foreground">Analyses</span>
              </div>
              <p className="text-3xl font-bold">{stats?.analyses.total || 0}</p>
              <p className="text-sm text-green-500">+{stats?.analyses.today || 0} today</p>
            </div>

            <div className="bg-card border rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-yellow-500/10 rounded-lg">
                  <CreditCard className="w-5 h-5 text-yellow-500" />
                </div>
                <span className="text-sm text-muted-foreground">Credits Spent</span>
              </div>
              <p className="text-3xl font-bold">{stats?.credits.totalSpent || 0}</p>
              <p className="text-sm text-muted-foreground">{stats?.credits.spentToday || 0} today</p>
            </div>

            <div className="bg-card border rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <FileText className="w-5 h-5 text-green-500" />
                </div>
                <span className="text-sm text-muted-foreground">Reports</span>
              </div>
              <p className="text-3xl font-bold">{stats?.reports.active || 0}</p>
              <p className="text-sm text-muted-foreground">{stats?.reports.expired || 0} expired</p>
            </div>
          </div>

          {/* Signal Service Stats */}
          {signalStats && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-indigo-500" />
                Signal Service Statistics
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-card border rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-indigo-500/10 rounded-lg">
                      <Activity className="w-5 h-5 text-indigo-500" />
                    </div>
                    <span className="text-sm text-muted-foreground">Total Signals</span>
                  </div>
                  <p className="text-3xl font-bold">{signalStats.total}</p>
                  <p className="text-sm text-muted-foreground">{signalStats.published} published</p>
                </div>

                <div className="bg-card border rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-green-500/10 rounded-lg">
                      <TrendingUp className="w-5 h-5 text-green-500" />
                    </div>
                    <span className="text-sm text-muted-foreground">Win Rate</span>
                  </div>
                  <p className="text-3xl font-bold">{signalStats.winRate.toFixed(1)}%</p>
                  <p className="text-sm text-green-500">
                    {signalStats.outcomes.tp1Hit + signalStats.outcomes.tp2Hit} wins
                  </p>
                </div>

                <div className="bg-card border rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-amber-500/10 rounded-lg">
                      <Target className="w-5 h-5 text-amber-500" />
                    </div>
                    <span className="text-sm text-muted-foreground">Outcomes</span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm">
                      <span className="text-green-500">✓ TP1:</span> {signalStats.outcomes.tp1Hit}
                    </p>
                    <p className="text-sm">
                      <span className="text-green-400">✓ TP2:</span> {signalStats.outcomes.tp2Hit}
                    </p>
                    <p className="text-sm">
                      <span className="text-red-500">✗ SL:</span> {signalStats.outcomes.slHit}
                    </p>
                  </div>
                </div>

                <div className="bg-card border rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-teal-500/10 rounded-lg">
                      <Globe className="w-5 h-5 text-teal-500" />
                    </div>
                    <span className="text-sm text-muted-foreground">Top Markets</span>
                  </div>
                  <div className="space-y-1">
                    {signalStats.byMarket.slice(0, 3).map((m) => (
                      <p key={m.market} className="text-sm">
                        <span className="font-medium">{m.market}:</span> {m.count}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* System Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Server Info */}
            <div className="bg-card border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Server className="w-5 h-5 text-primary" />
                Server Information
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Uptime</span>
                  <span className="font-sans">{system?.server.uptimeFormatted || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Node Version</span>
                  <span className="font-sans">{system?.server.nodeVersion || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Platform</span>
                  <span className="font-sans">{system?.server.platform} ({system?.server.arch})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">PID</span>
                  <span className="font-sans">{system?.process.pid || '-'}</span>
                </div>
              </div>
            </div>

            {/* Resource Usage */}
            <div className="bg-card border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Cpu className="w-5 h-5 text-primary" />
                Resource Usage
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-muted-foreground">CPU Usage</span>
                    <span className="font-sans">{system?.system.cpuUsage || '-'}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all"
                      style={{ width: system?.system.cpuUsage || '0%' }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-muted-foreground">Memory Usage</span>
                    <span className="font-sans">{system?.system.memoryUsagePercent || '-'}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-500 transition-all"
                      style={{ width: system?.system.memoryUsagePercent || '0%' }}
                    />
                  </div>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Heap Used</span>
                  <span className="font-sans">{system?.process.memoryUsage.heapUsed || '-'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Load Average</span>
                  <span className="font-sans">{system?.system.loadAverage?.join(' / ') || '-'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Top Coins & Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Analyzed Coins */}
            <div className="bg-card border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Top Analyzed Coins
              </h3>
              <div className="space-y-3">
                {stats?.topCoins.slice(0, 5).map((coin, index) => (
                  <div key={coin.symbol} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 flex items-center justify-center bg-muted rounded-full text-sm font-medium">
                        {index + 1}
                      </span>
                      <span className="font-medium">{coin.symbol}</span>
                    </div>
                    <span className="text-muted-foreground">{coin.count} analyses</span>
                  </div>
                ))}
                {(!stats?.topCoins || stats.topCoins.length === 0) && (
                  <p className="text-muted-foreground text-center py-4">No data available</p>
                )}
              </div>
            </div>

            {/* Signal Generation */}
            <div className="bg-card border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-indigo-500" />
                Signal Generation
              </h3>
              <div className="space-y-3">
                {/* Signal Generator (4h) — Status + Trigger */}
                <div className="p-3 bg-background border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${
                        signalHealth?.generator?.active ? 'bg-green-500 animate-pulse' :
                        signalHealth?.generator?.status === 'never_run' ? 'bg-gray-400' : 'bg-red-500'
                      }`} />
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Signal Generator
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                        signalHealth?.generator?.active
                          ? 'bg-green-500/10 text-green-500'
                          : signalHealth?.generator?.status === 'never_run'
                          ? 'bg-gray-500/10 text-gray-500'
                          : 'bg-red-500/10 text-red-500'
                      }`}>
                        {signalHealth?.generator?.active ? 'ACTIVE' : signalHealth?.generator?.status === 'never_run' ? 'NOT STARTED' : 'INACTIVE'}
                      </span>
                    </div>
                    {signalHealth?.generator?.lastRun && (
                      <span className="text-[10px] text-muted-foreground">
                        Last: {new Date(signalHealth.generator.lastRun).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">
                      Every 4h — Capital Flow → 7-Step cycle
                      {signalHealth?.metrics?.generator && (
                        <span className="ml-2 text-foreground">
                          ({signalHealth.metrics.generator.totalRuns} runs, {signalHealth.metrics.generator.signalsGenerated} signals)
                        </span>
                      )}
                    </div>
                    <button
                      onClick={handleGenerateSignals}
                      disabled={isGeneratingSignals}
                      className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-indigo-500/10 text-indigo-500 rounded-md hover:bg-indigo-500/20 transition disabled:opacity-50"
                    >
                      {isGeneratingSignals ? <RefreshCw className="w-3 h-3 animate-spin" /> : <TrendingUp className="w-3 h-3" />}
                      {isGeneratingSignals ? 'Running...' : 'Run Now'}
                    </button>
                  </div>
                </div>

                {/* AutoEdge (15m) — Status + Trigger */}
                <div className="p-3 bg-background border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${
                        signalHealth?.autoedge?.active ? 'bg-green-500 animate-pulse' :
                        signalHealth?.autoedge?.status === 'never_run' ? 'bg-gray-400' : 'bg-red-500'
                      }`} />
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        AutoEdge v2
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                        signalHealth?.autoedge?.active
                          ? 'bg-green-500/10 text-green-500'
                          : signalHealth?.autoedge?.status === 'never_run'
                          ? 'bg-gray-500/10 text-gray-500'
                          : 'bg-red-500/10 text-red-500'
                      }`}>
                        {signalHealth?.autoedge?.active ? 'ACTIVE' : signalHealth?.autoedge?.status === 'never_run' ? 'NOT STARTED' : 'INACTIVE'}
                      </span>
                    </div>
                    {signalHealth?.autoedge?.lastRun && (
                      <span className="text-[10px] text-muted-foreground">
                        Last: {new Date(signalHealth.autoedge.lastRun).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">
                      Every 15m — Top 10 Binance 15m→5m
                      {signalHealth?.metrics?.autoedge && (
                        <span className="ml-2 text-foreground">
                          ({signalHealth.metrics.autoedge.totalRuns} runs, {signalHealth.metrics.autoedge.signalsGenerated} signals)
                        </span>
                      )}
                    </div>
                    <button
                      onClick={handleGenerateAutoEdge}
                      disabled={isGeneratingAutoEdge}
                      className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-emerald-500/10 text-emerald-500 rounded-md hover:bg-emerald-500/20 transition disabled:opacity-50"
                    >
                      {isGeneratingAutoEdge ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                      {isGeneratingAutoEdge ? 'Running...' : 'Run Now'}
                    </button>
                  </div>
                </div>

                {/* Outcome Tracker Status */}
                {signalHealth?.tracker && (
                  <div className="p-3 bg-background border rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${
                        signalHealth.tracker.status === 'healthy' ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                      }`} />
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Outcome Tracker
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                        signalHealth.tracker.status === 'healthy'
                          ? 'bg-green-500/10 text-green-500'
                          : 'bg-red-500/10 text-red-500'
                      }`}>
                        {signalHealth.tracker.status === 'healthy' ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                      <span className="text-[10px] text-muted-foreground ml-auto">
                        Every 15m — TP/SL tracking
                        {signalHealth.tracker.lastRun && (
                          <> · Last: {new Date(signalHealth.tracker.lastRun).toLocaleTimeString()}</>
                        )}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Maintenance Actions */}
          <div className="mt-6">
            <div className="bg-card border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                Maintenance Actions
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button
                  onClick={handleCleanup}
                  className="flex items-center justify-between p-3 bg-background border rounded-lg hover:bg-accent transition"
                >
                  <div className="flex items-center gap-3">
                    <Trash2 className="w-5 h-5 text-red-500" />
                    <div className="text-left">
                      <p className="font-medium">Run Cleanup</p>
                      <p className="text-sm text-muted-foreground">Delete expired reports & old transactions</p>
                    </div>
                  </div>
                </button>
                <button
                  onClick={handleClearCache}
                  className="flex items-center justify-between p-3 bg-background border rounded-lg hover:bg-accent transition"
                >
                  <div className="flex items-center gap-3">
                    <HardDrive className="w-5 h-5 text-yellow-500" />
                    <div className="text-left">
                      <p className="font-medium">Clear Cache</p>
                      <p className="text-sm text-muted-foreground">Flush Redis cache</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'users' && (
        <div className="bg-card border rounded-lg">
          <div className="p-4 border-b">
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={userSearch}
                  onChange={(e) => {
                    setUserSearch(e.target.value);
                    setUserPage(0);
                  }}
                  className="w-full pl-10 pr-4 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
              </div>
              <span className="text-sm text-muted-foreground">{totalUsers} users</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left">
                  <th className="p-4 font-medium text-muted-foreground">User</th>
                  <th className="p-4 font-medium text-muted-foreground">Level</th>
                  <th className="p-4 font-medium text-muted-foreground">Credits</th>
                  <th className="p-4 font-medium text-muted-foreground">Transactions</th>
                  <th className="p-4 font-medium text-muted-foreground">Streak</th>
                  <th className="p-4 font-medium text-muted-foreground">Joined</th>
                  <th className="p-4 font-medium text-muted-foreground">Last Login</th>
                  <th className="p-4 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b hover:bg-accent/50">
                    <td className="p-4">
                      <div>
                        <p className="font-medium">{user.name || 'No name'}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-1 bg-primary/10 text-primary rounded text-sm">
                        Level {user.level}
                      </span>
                    </td>
                    <td className="p-4 font-sans">{user.creditBalance}</td>
                    <td className="p-4">{user.transactionCount}</td>
                    <td className="p-4">
                      <span className="flex items-center gap-1">
                        🔥 {user.streakDays}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {user.lastLoginAt
                        ? new Date(user.lastLoginAt).toLocaleDateString()
                        : '-'}
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => openGrantModal(user)}
                        className="flex items-center gap-1 px-2 py-1 text-sm bg-green-500/10 text-green-500 rounded hover:bg-green-500/20 transition"
                        title="Grant free credits"
                      >
                        <Gift className="w-4 h-4" />
                        Grant
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t flex items-center justify-between">
            <button
              onClick={() => setUserPage(Math.max(0, userPage - 1))}
              disabled={userPage === 0}
              className="flex items-center gap-2 px-3 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>
            <span className="text-sm text-muted-foreground">
              Page {userPage + 1} of {Math.ceil(totalUsers / 20)}
            </span>
            <button
              onClick={() => setUserPage(userPage + 1)}
              disabled={(userPage + 1) * 20 >= totalUsers}
              className="flex items-center gap-2 px-3 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="bg-card border rounded-lg">
          <div className="p-4 border-b">
            <h3 className="font-semibold">Recent Activity</h3>
          </div>
          <div className="divide-y max-h-[600px] overflow-y-auto">
            {activity.map((item) => (
              <div key={item.id} className="p-4 hover:bg-accent/50">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      item.type === 'SPEND' ? 'bg-red-500/10' :
                      item.type === 'PURCHASE' ? 'bg-green-500/10' :
                      'bg-blue-500/10'
                    }`}>
                      {item.type === 'SPEND' ? (
                        <TrendingUp className="w-4 h-4 text-red-500" />
                      ) : item.type === 'PURCHASE' ? (
                        <CreditCard className="w-4 h-4 text-green-500" />
                      ) : (
                        <Zap className="w-4 h-4 text-blue-500" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{item.user}</p>
                      <p className="text-sm text-muted-foreground">{item.source}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-sans ${item.amount < 0 ? 'text-red-500' : 'text-green-500'}`}>
                      {item.amount > 0 ? '+' : ''}{item.amount} credits
                    </p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1 justify-end">
                      <Clock className="w-3 h-3" />
                      {new Date(item.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            {activity.length === 0 && (
              <p className="p-8 text-center text-muted-foreground">No activity yet</p>
            )}
          </div>
        </div>
      )}

      {/* Grant Credits Modal */}
      {grantModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setGrantModalOpen(false)}
          />
          <div className="relative bg-card border rounded-lg p-6 w-full max-w-md mx-4 shadow-xl">
            <button
              onClick={() => setGrantModalOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Gift className="w-5 h-5 text-green-500" />
              Grant Free Credits
            </h3>

            <div className="mb-4 p-3 bg-accent/50 rounded-lg">
              <p className="font-medium">{selectedUser.name || 'No name'}</p>
              <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
              <p className="text-sm text-muted-foreground mt-1">
                Current balance: <span className="font-sans text-foreground">{selectedUser.creditBalance}</span> credits
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Credit Amount <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="10000"
                  value={grantAmount}
                  onChange={(e) => setGrantAmount(e.target.value)}
                  placeholder="Enter amount (1-10000)"
                  className="w-full px-3 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Reason (optional)
                </label>
                <input
                  type="text"
                  value={grantReason}
                  onChange={(e) => setGrantReason(e.target.value)}
                  placeholder="e.g., Bug compensation, promotion"
                  className="w-full px-3 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setGrantModalOpen(false)}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-accent transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGrantCredits}
                  disabled={!grantAmount || isGranting}
                  className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isGranting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Granting...
                    </>
                  ) : (
                    <>
                      <Gift className="w-4 h-4" />
                      Grant Credits
                    </>
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
