'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import {
  Bell,
  Sunrise,
  AlertTriangle,
  Zap,
  Gift,
  Megaphone,
  CheckCheck,
  Trash2,
  Eye,
  Loader2,
  Inbox,
  Settings,
  ExternalLink,
  Globe,
  TrendingUp,
  BarChart3,
  ChevronRight,
  Info,
  AlertCircle,
} from 'lucide-react';
import { authFetch } from '../../../lib/api';
import { cn } from '../../../lib/utils';

// ─── Types ────────────────────────────────────────

type NotificationType = 'BRIEFING' | 'ALERT' | 'SIGNAL' | 'REWARD' | 'SYSTEM';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata: Record<string, any>;
  read: boolean;
  createdAt: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface NotificationsResponse {
  notifications: Notification[];
  pagination: PaginationInfo;
}

interface UnreadCounts {
  BRIEFING: number;
  ALERT: number;
  SIGNAL: number;
  REWARD: number;
  SYSTEM: number;
  total: number;
}

// ─── Config ───────────────────────────────────────

const FILTER_OPTIONS: { label: string; value: NotificationType | 'ALL'; icon: typeof Bell; color: string }[] = [
  { label: 'All', value: 'ALL', icon: Bell, color: 'text-foreground' },
  { label: 'Briefing', value: 'BRIEFING', icon: Sunrise, color: 'text-amber-500' },
  { label: 'Alerts', value: 'ALERT', icon: AlertTriangle, color: 'text-red-500' },
  { label: 'Signals', value: 'SIGNAL', icon: Zap, color: 'text-teal-500' },
  { label: 'Rewards', value: 'REWARD', icon: Gift, color: 'text-purple-500' },
  { label: 'System', value: 'SYSTEM', icon: Megaphone, color: 'text-blue-500' },
];

// Smart Alert layer config (for ALERT type notifications)
const LAYER_CONFIG: Record<string, { label: string; icon: typeof Globe; color: string; bg: string }> = {
  L1: { label: 'Global Liquidity', icon: Globe, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  L2: { label: 'Market Flow', icon: TrendingUp, color: 'text-teal-500', bg: 'bg-teal-500/10' },
  L3: { label: 'Sector Activity', icon: BarChart3, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  L4: { label: 'Asset Level', icon: Zap, color: 'text-purple-500', bg: 'bg-purple-500/10' },
};

const SEVERITY_CONFIG: Record<string, { color: string; bg: string; icon: typeof Info }> = {
  INFO: { color: 'text-muted-foreground', bg: 'bg-muted/50', icon: Info },
  WARNING: { color: 'text-[#5EEDC3]', bg: 'bg-[#5EEDC3]/10', icon: AlertTriangle },
  CRITICAL: { color: 'text-[#FF6B6B]', bg: 'bg-[#FF6B6B]/10', icon: AlertCircle },
};

function getTypeConfig(type: NotificationType) {
  switch (type) {
    case 'BRIEFING':
      return { icon: Sunrise, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/30' };
    case 'ALERT':
      return { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/30' };
    case 'SIGNAL':
      return { icon: Zap, color: 'text-teal-500', bg: 'bg-teal-500/10', border: 'border-teal-500/30' };
    case 'REWARD':
      return { icon: Gift, color: 'text-purple-500', bg: 'bg-purple-500/10', border: 'border-purple-500/30' };
    case 'SYSTEM':
      return { icon: Megaphone, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/30' };
  }
}

function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = now - date;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

// ─── Page Component ───────────────────────────────

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const [activeFilter, setActiveFilter] = useState<NotificationType | 'ALL'>('ALL');
  const [page, setPage] = useState(1);
  const LIMIT = 20;

  // Fetch notifications
  const { data, isLoading, error } = useQuery<NotificationsResponse>({
    queryKey: ['notifications', activeFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (activeFilter !== 'ALL') params.set('type', activeFilter);
      params.set('page', String(page));
      params.set('limit', String(LIMIT));
      const res = await authFetch(`/api/notifications?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch notifications');
      const json = await res.json();
      return json.data;
    },
    staleTime: 30_000,
  });

  // Fetch unread counts
  const { data: unreadCounts } = useQuery<UnreadCounts>({
    queryKey: ['notification-unread-counts'],
    queryFn: async () => {
      const res = await authFetch('/api/notifications/unread-count');
      if (!res.ok) return { BRIEFING: 0, ALERT: 0, SIGNAL: 0, REWARD: 0, SYSTEM: 0, total: 0 };
      const json = await res.json();
      return json.data;
    },
    staleTime: 30_000,
  });

  // Mark single as read
  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await authFetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notification-unread-counts'] });
    },
  });

  // Mark all as read
  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const body: Record<string, any> = {};
      if (activeFilter !== 'ALL') body.type = activeFilter;
      await authFetch('/api/notifications/mark-all-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notification-unread-counts'] });
    },
  });

  // Clear read notifications
  const clearReadMutation = useMutation({
    mutationFn: async () => {
      await authFetch('/api/notifications/clear-read', { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notification-unread-counts'] });
    },
  });

  // Delete single
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await authFetch(`/api/notifications/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notification-unread-counts'] });
    },
  });

  const handleFilterChange = useCallback((filter: NotificationType | 'ALL') => {
    setActiveFilter(filter);
    setPage(1);
  }, []);

  const notifications = data?.notifications || [];
  const pagination = data?.pagination;
  const totalUnread = unreadCounts?.total ?? 0;

  // Resolve link from metadata
  const getViewLink = (n: Notification): string | null => {
    const meta = n.metadata as Record<string, string>;
    if (meta?.link) return meta.link;
    if (meta?.analysisId) return `/analyze/details/${meta.analysisId}`;
    if (meta?.signalId) return `/notifications`;
    return null;
  };

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
                NOTIFICATIONS
              </span>
              {totalUnread > 0 && (
                <span className="text-[10px] font-sans text-neutral-400">{totalUnread} unread</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {totalUnread > 0 && (
                <button
                  onClick={() => markAllReadMutation.mutate()}
                  disabled={markAllReadMutation.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-sans rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors text-neutral-500 disabled:opacity-50"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Mark All
                </button>
              )}
              <button
                onClick={() => clearReadMutation.mutate()}
                disabled={clearReadMutation.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-sans rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors text-neutral-500 disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <main className="flex-1 min-h-0 overflow-y-auto">
        <div className="flex flex-col lg:flex-row gap-4 pb-4">
          {/* Sidebar Filters */}
          <aside className="lg:w-48 shrink-0">
            <div className="rounded-xl p-1.5 lg:sticky lg:top-4">
              <div className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible">
                {FILTER_OPTIONS.map((opt) => {
                  const count =
                    opt.value === 'ALL'
                      ? totalUnread
                      : (unreadCounts as Record<string, number> | undefined)?.[opt.value] ?? 0;

                  return (
                    <button
                      key={opt.value}
                      onClick={() => handleFilterChange(opt.value)}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                        activeFilter === opt.value
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                      )}
                    >
                      <opt.icon className={cn('w-4 h-4', activeFilter !== opt.value && opt.color)} />
                      <span>{opt.label}</span>
                      {count > 0 && (
                        <span
                          className={cn(
                            'ml-auto text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center',
                            activeFilter === opt.value
                              ? 'bg-primary-foreground/20 text-primary-foreground'
                              : 'bg-primary/10 text-primary'
                          )}
                        >
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="text-center py-20">
                <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Failed to load notifications</p>
                <button
                  onClick={() => queryClient.invalidateQueries({ queryKey: ['notifications'] })}
                  className="mt-2 text-sm text-primary hover:underline"
                >
                  Try Again
                </button>
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-20">
                <Inbox className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-lg font-medium mb-1">No notifications</p>
                <p className="text-sm text-muted-foreground">
                  {activeFilter !== 'ALL'
                    ? `No ${(activeFilter || '').toLowerCase()} notifications yet`
                    : 'You\'re all caught up!'}
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  {notifications.map((n) => {
                    const config = getTypeConfig(n.type);
                    const Icon = config.icon;
                    const viewLink = getViewLink(n);
                    const meta = n.metadata as Record<string, any>;

                    // Smart Alert metadata
                    const alertLayer = meta?.layer as string | undefined;
                    const alertSeverity = meta?.severity as string | undefined;
                    const alertAction = meta?.action as string | undefined;
                    const alertMarket = meta?.market as string | undefined;
                    const layerCfg = alertLayer ? LAYER_CONFIG[alertLayer] : null;
                    const sevCfg = alertSeverity ? SEVERITY_CONFIG[alertSeverity] : null;

                    // Signal metadata
                    const signalDirection = meta?.direction as string | undefined;
                    const signalConfidence = meta?.confidence as number | undefined;

                    return (
                      <div
                        key={n.id}
                        className={cn(
                          'group relative rounded-xl p-3 transition-all hover:bg-neutral-50 dark:hover:bg-neutral-900/50',
                          n.read ? 'border-border/50' : 'border-[#5EEDC3]/40'
                        )}
                      >
                        <div className="flex gap-3">
                          {/* Icon - use layer icon for ALERT type */}
                          <div className={cn(
                            'shrink-0 w-9 h-9 rounded-full flex items-center justify-center',
                            layerCfg ? layerCfg.bg : config.bg
                          )}>
                            {layerCfg ? (
                              <layerCfg.icon className={cn('w-4 h-4', layerCfg.color)} />
                            ) : (
                              <Icon className={cn('w-4 h-4', config.color)} />
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span
                                    className={cn(
                                      'text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded',
                                      config.bg,
                                      config.color
                                    )}
                                  >
                                    {n.type}
                                  </span>

                                  {/* ALERT: Layer + Severity badges */}
                                  {n.type === 'ALERT' && alertLayer && layerCfg && (
                                    <span className={cn('text-[10px] font-mono font-bold px-1.5 py-0.5 rounded', layerCfg.bg, layerCfg.color)}>
                                      {alertLayer}
                                    </span>
                                  )}
                                  {n.type === 'ALERT' && alertSeverity && sevCfg && (
                                    <span className={cn('inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded', sevCfg.bg, sevCfg.color)}>
                                      <sevCfg.icon className="w-3 h-3" />
                                      {alertSeverity}
                                    </span>
                                  )}
                                  {n.type === 'ALERT' && alertMarket && (
                                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                      {alertMarket.charAt(0).toUpperCase() + alertMarket.slice(1)}
                                    </span>
                                  )}

                                  {/* SIGNAL: Direction + Confidence badges */}
                                  {n.type === 'SIGNAL' && signalDirection && (
                                    <span className={cn(
                                      'text-[10px] font-bold px-1.5 py-0.5 rounded',
                                      signalDirection === 'long' ? 'bg-[#00F5A0]/10 text-[#00F5A0]' : 'bg-[#FF4757]/10 text-[#FF4757]'
                                    )}>
                                      {signalDirection.toUpperCase()}
                                    </span>
                                  )}
                                  {n.type === 'SIGNAL' && signalConfidence && (
                                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                      {signalConfidence}%
                                    </span>
                                  )}

                                  <span className={cn('text-sm font-semibold', n.read ? 'text-muted-foreground' : 'text-foreground')}>
                                    {n.title}
                                  </span>
                                </div>
                                <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>

                                {/* ALERT: Action suggestion */}
                                {n.type === 'ALERT' && alertAction && (
                                  <div className="flex items-center gap-1.5 mt-1.5 text-xs text-[#5EEDC3]">
                                    <ChevronRight className="w-3 h-3" />
                                    <span>{alertAction}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Bottom row */}
                            <div className="flex items-center justify-between mt-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">{formatTimeAgo(n.createdAt)}</span>
                                {n.type === 'ALERT' && layerCfg && (
                                  <span className="text-[10px] text-muted-foreground">{layerCfg.label}</span>
                                )}
                              </div>

                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {!n.read && (
                                  <button
                                    onClick={() => markReadMutation.mutate(n.id)}
                                    disabled={markReadMutation.isPending}
                                    className="flex items-center gap-1 px-2 py-1 text-xs rounded-md hover:bg-accent transition-colors"
                                    title="Mark as read"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    Read
                                  </button>
                                )}
                                {viewLink && (
                                  <Link
                                    href={viewLink}
                                    className="flex items-center gap-1 px-2 py-1 text-xs rounded-md hover:bg-accent transition-colors text-primary"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    View
                                  </Link>
                                )}
                                <button
                                  onClick={() => deleteMutation.mutate(n.id)}
                                  disabled={deleteMutation.isPending}
                                  className="flex items-center gap-1 px-2 py-1 text-xs rounded-md hover:bg-destructive/10 text-destructive transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Unread dot */}
                          {!n.read && (
                            <div className="shrink-0 mt-1">
                              <div className="w-2.5 h-2.5 rounded-full bg-[#5EEDC3]" />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination */}
                {pagination && pagination.totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-6">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      className="px-3 py-1.5 text-sm rounded-lg border border-border hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-muted-foreground">
                      Page {page} of {pagination.totalPages}
                    </span>
                    <button
                      onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                      disabled={page >= pagination.totalPages}
                      className="px-3 py-1.5 text-sm rounded-lg border border-border hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
        </main>
      </div>
    </div>
  );
}
