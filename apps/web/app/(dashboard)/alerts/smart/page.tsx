'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Bell,
  AlertTriangle,
  Info,
  AlertCircle,
  Filter,
  RefreshCw,
  Settings,
  ChevronRight,
  Loader2,
  Globe,
  TrendingUp,
  BarChart3,
  Zap,
  Check,
  X,
} from 'lucide-react';
import { cn } from '../../../../lib/utils';
import { authFetch } from '../../../../lib/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';
type AlertLayer = 'L1' | 'L2' | 'L3' | 'L4';

interface SmartAlertNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  metadata: {
    type?: string;
    layer?: AlertLayer;
    severity?: AlertSeverity;
    action?: string;
    market?: string;
    [key: string]: unknown;
  };
  read: boolean;
  createdAt: string;
}

interface AlertPreferences {
  enabled: boolean;
  markets: string[];
  minSeverity: AlertSeverity;
  emailEnabled: boolean;
  pushEnabled: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LAYER_CONFIG: Record<AlertLayer, { label: string; icon: typeof Globe; color: string; bg: string }> = {
  L1: { label: 'Global Liquidity', icon: Globe, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  L2: { label: 'Market Flow', icon: TrendingUp, color: 'text-teal-500', bg: 'bg-teal-500/10' },
  L3: { label: 'Sector Activity', icon: BarChart3, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  L4: { label: 'Asset Level', icon: Zap, color: 'text-purple-500', bg: 'bg-purple-500/10' },
};

const SEVERITY_CONFIG: Record<AlertSeverity, { label: string; color: string; bg: string; border: string; icon: typeof Info }> = {
  INFO: { label: 'Info', color: 'text-muted-foreground', bg: 'bg-muted/50', border: 'border-muted', icon: Info },
  WARNING: { label: 'Warning', color: 'text-[#5EEDC3]', bg: 'bg-[#5EEDC3]/10', border: 'border-[#5EEDC3]/30', icon: AlertTriangle },
  CRITICAL: { label: 'Critical', color: 'text-[#FF6B6B]', bg: 'bg-[#FF6B6B]/10', border: 'border-[#FF6B6B]/30', icon: AlertCircle },
};

const MARKET_OPTIONS = [
  { value: 'crypto', label: 'Crypto' },
  { value: 'stocks', label: 'Stocks' },
  { value: 'bonds', label: 'Bonds' },
  { value: 'metals', label: 'Metals' },
  { value: 'bist', label: 'BIST' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SmartAlertsPage() {
  const [alerts, setAlerts] = useState<SmartAlertNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<AlertPreferences | null>(null);

  // Filters
  const [filterLayer, setFilterLayer] = useState<AlertLayer | 'ALL'>('ALL');
  const [filterSeverity, setFilterSeverity] = useState<AlertSeverity | 'ALL'>('ALL');
  const [filterMarket, setFilterMarket] = useState<string>('ALL');

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const fetchAlerts = useCallback(async () => {
    try {
      setError(null);
      const params = new URLSearchParams({ limit: '50' });
      if (filterLayer !== 'ALL') params.set('layer', filterLayer);
      if (filterSeverity !== 'ALL') params.set('severity', filterSeverity);
      if (filterMarket !== 'ALL') params.set('market', filterMarket);

      const res = await authFetch(`/api/smart-alerts?${params}`);
      const data = await res.json();

      if (data.success) {
        setAlerts(data.data.alerts || []);
      } else {
        setError(data.error?.message || 'Failed to load alerts');
      }
    } catch {
      setError('Failed to load smart alerts');
    } finally {
      setLoading(false);
    }
  }, [filterLayer, filterSeverity, filterMarket]);

  const fetchPreferences = useCallback(async () => {
    try {
      const res = await authFetch('/api/smart-alerts/preferences');
      const data = await res.json();
      if (data.success) {
        setPreferences(data.data);
      }
    } catch {
      // Non-critical
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
    fetchPreferences();
  }, [fetchAlerts, fetchPreferences]);

  // Mark alert as read
  const markAsRead = async (id: string) => {
    try {
      await authFetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
      setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, read: true } : a));
    } catch {
      // Silent fail
    }
  };

  // ---------------------------------------------------------------------------
  // Derived
  // ---------------------------------------------------------------------------

  const unreadCount = alerts.filter((a) => !a.read).length;

  const criticalCount = alerts.filter((a) => (a.metadata?.severity) === 'CRITICAL' && !a.read).length;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Smart Alerts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            L1-L4 hierarchy change notifications from Capital Flow
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setLoading(true); fetchAlerts(); }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:bg-accent transition-colors text-sm"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            Refresh
          </button>
          <Link
            href="/alerts/smart/settings"
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:bg-accent transition-colors text-sm"
          >
            <Settings className="w-4 h-4" />
            Settings
          </Link>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(['L1', 'L2', 'L3', 'L4'] as AlertLayer[]).map((layer) => {
          const cfg = LAYER_CONFIG[layer];
          const Icon = cfg.icon;
          const count = alerts.filter((a) => a.metadata?.layer === layer).length;
          return (
            <button
              key={layer}
              onClick={() => setFilterLayer(filterLayer === layer ? 'ALL' : layer)}
              className={cn(
                'flex items-center gap-3 p-3 rounded-xl border transition-all',
                filterLayer === layer
                  ? `${cfg.bg} border-current ${cfg.color}`
                  : 'border-border hover:bg-accent',
              )}
            >
              <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', cfg.bg)}>
                <Icon className={cn('w-4 h-4', cfg.color)} />
              </div>
              <div className="text-left">
                <p className="text-xs text-muted-foreground">{cfg.label}</p>
                <p className="text-lg font-semibold">{count}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="w-4 h-4 text-muted-foreground" />

        {/* Severity filter */}
        <div className="flex items-center gap-1">
          {(['ALL', 'CRITICAL', 'WARNING', 'INFO'] as const).map((sev) => (
            <button
              key={sev}
              onClick={() => setFilterSeverity(sev)}
              className={cn(
                'px-2.5 py-1 rounded-full text-xs font-medium transition-colors',
                filterSeverity === sev
                  ? sev === 'ALL' ? 'bg-foreground text-background' :
                    sev === 'CRITICAL' ? 'bg-[#FF6B6B]/20 text-[#FF6B6B]' :
                    sev === 'WARNING' ? 'bg-[#5EEDC3]/20 text-[#5EEDC3]' :
                    'bg-muted text-muted-foreground'
                  : 'text-muted-foreground hover:bg-accent',
              )}
            >
              {sev === 'ALL' ? 'All' : sev}
            </button>
          ))}
        </div>

        <span className="text-muted-foreground">|</span>

        {/* Market filter */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setFilterMarket('ALL')}
            className={cn(
              'px-2.5 py-1 rounded-full text-xs font-medium transition-colors',
              filterMarket === 'ALL' ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-accent',
            )}
          >
            All Markets
          </button>
          {MARKET_OPTIONS.map((m) => (
            <button
              key={m.value}
              onClick={() => setFilterMarket(filterMarket === m.value ? 'ALL' : m.value)}
              className={cn(
                'px-2.5 py-1 rounded-full text-xs font-medium transition-colors',
                filterMarket === m.value ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-accent',
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Status banner */}
      {preferences && !preferences.enabled && (
        <div className="flex items-center gap-3 p-3 rounded-xl border border-amber-500/30 bg-amber-500/5">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
          <p className="text-sm">Smart alerts are currently disabled. <Link href="/alerts/smart/settings" className="text-[#5EEDC3] underline">Enable them</Link> to receive L1-L4 notifications.</p>
        </div>
      )}

      {criticalCount > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-xl border border-[#FF6B6B]/30 bg-[#FF6B6B]/5">
          <AlertCircle className="w-5 h-5 text-[#FF6B6B] shrink-0" />
          <p className="text-sm font-medium">
            {criticalCount} critical alert{criticalCount > 1 ? 's' : ''} require{criticalCount === 1 ? 's' : ''} your attention
          </p>
        </div>
      )}

      {/* Alert list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="text-center py-16 space-y-3">
          <AlertCircle className="w-10 h-10 mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">{error}</p>
          <button onClick={() => { setLoading(true); fetchAlerts(); }} className="text-sm text-[#5EEDC3] hover:underline">
            Try Again
          </button>
        </div>
      ) : alerts.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <Bell className="w-10 h-10 mx-auto text-muted-foreground" />
          <p className="font-medium">No smart alerts yet</p>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Smart alerts will appear here when significant changes are detected in the L1-L4 Capital Flow hierarchy.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.map((alert) => {
            const layer = (alert.metadata?.layer as AlertLayer) || 'L1';
            const severity = (alert.metadata?.severity as AlertSeverity) || 'INFO';
            const action = alert.metadata?.action as string | undefined;
            const market = alert.metadata?.market as string | undefined;
            const layerCfg = LAYER_CONFIG[layer];
            const sevCfg = SEVERITY_CONFIG[severity];
            const LayerIcon = layerCfg.icon;
            const SevIcon = sevCfg.icon;

            return (
              <div
                key={alert.id}
                className={cn(
                  'relative p-4 rounded-xl border transition-all hover:shadow-sm',
                  !alert.read ? `${sevCfg.border} ${sevCfg.bg}` : 'border-border bg-card',
                )}
              >
                <div className="flex items-start gap-3">
                  {/* Layer icon */}
                  <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', layerCfg.bg)}>
                    <LayerIcon className={cn('w-5 h-5', layerCfg.color)} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Severity badge */}
                      <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', sevCfg.bg, sevCfg.color)}>
                        <SevIcon className="w-3 h-3" />
                        {severity}
                      </span>

                      {/* Layer badge */}
                      <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', layerCfg.bg, layerCfg.color)}>
                        {layer}
                      </span>

                      {/* Market badge */}
                      {market && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                          {market.charAt(0).toUpperCase() + market.slice(1)}
                        </span>
                      )}

                      {/* Unread indicator */}
                      {!alert.read && (
                        <div className="w-2 h-2 rounded-full bg-[#5EEDC3] shrink-0" />
                      )}
                    </div>

                    <h3 className={cn('text-sm font-semibold mt-1.5', !alert.read ? '' : 'text-muted-foreground')}>
                      {alert.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">
                      {alert.message}
                    </p>

                    {/* Action suggestion */}
                    {action && (
                      <div className="flex items-center gap-1.5 mt-2 text-xs text-[#5EEDC3]">
                        <ChevronRight className="w-3 h-3" />
                        <span>{action}</span>
                      </div>
                    )}

                    {/* Timestamp + actions */}
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-muted-foreground">
                        {formatTimeAgo(alert.createdAt)}
                      </span>
                      {!alert.read && (
                        <button
                          onClick={() => markAsRead(alert.id)}
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                        >
                          <Check className="w-3 h-3" />
                          Mark read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = now - date;

  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return new Date(dateStr).toLocaleDateString();
}
