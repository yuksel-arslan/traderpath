'use client';

// ===========================================
// SmartAlertsWidget — Dashboard compact widget
// Polls GET /api/smart-alerts?limit=3 every 60s
// Also fetches scan status for liveness indicator
// Full list at /notifications (ALERT filter)
// ===========================================

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Info, XCircle, Bell, ChevronRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { authFetch } from '@/lib/api';

interface SmartAlert {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  metadata: {
    layer?: string;
    severity?: 'INFO' | 'WARNING' | 'CRITICAL';
    market?: string;
  };
}

interface ScanStatus {
  lastRun: string | null;
  isRunning: boolean;
  snapshotExists: boolean;
}

type Severity = 'INFO' | 'WARNING' | 'CRITICAL';

const SEVERITY_CONFIG: Record<Severity, {
  Icon: typeof Info;
  iconColor: string;
  bgColor: string;
  dotColor: string;
}> = {
  CRITICAL: {
    Icon: XCircle,
    iconColor: 'text-red-500',
    bgColor: 'bg-red-50 dark:bg-red-500/10',
    dotColor: 'bg-red-500',
  },
  WARNING: {
    Icon: AlertTriangle,
    iconColor: 'text-yellow-500',
    bgColor: 'bg-yellow-50 dark:bg-yellow-500/10',
    dotColor: 'bg-yellow-500',
  },
  INFO: {
    Icon: Info,
    iconColor: 'text-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-500/10',
    dotColor: 'bg-blue-400',
  },
};

const POLL_INTERVAL_MS = 60_000;

function formatTime(dateStr: string): string {
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
  } catch {
    return '';
  }
}

function AlertSkeleton() {
  return (
    <div className="px-6 py-4 flex items-start gap-3">
      <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 animate-spin shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-2/3 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
        <div className="h-2.5 w-full rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
      </div>
    </div>
  );
}

function ScanStatusBadge({ status }: { status: ScanStatus | null }) {
  if (!status) return null;

  const lastRun = status.lastRun ? new Date(status.lastRun) : null;
  const minutesAgo = lastRun ? Math.floor((Date.now() - lastRun.getTime()) / 60_000) : null;
  const isActive = minutesAgo !== null && minutesAgo < 30;

  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
      <span className="text-[10px] text-gray-400">
        {status.isRunning
          ? 'Scanning...'
          : minutesAgo !== null
            ? minutesAgo < 1 ? 'Scanned just now' : `Scanned ${minutesAgo}m ago`
            : 'Inactive'}
      </span>
    </div>
  );
}

export function SmartAlertsWidget() {
  const [alerts, setAlerts] = useState<SmartAlert[]>([]);
  const [scanStatus, setScanStatus] = useState<ScanStatus | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchData() {
    try {
      const [alertsRes, statusRes] = await Promise.all([
        authFetch('/api/smart-alerts?limit=3'),
        authFetch('/api/smart-alerts/status'),
      ]);

      if (alertsRes.ok) {
        const json = await alertsRes.json();
        setAlerts(json?.data?.alerts ?? []);
      }

      if (statusRes.ok) {
        const json = await statusRes.json();
        setScanStatus(json?.data ?? null);
      }
    } catch {
      // Non-critical — dashboard must not break if alerts fail
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
    const timer = setInterval(fetchData, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  const unreadCount = alerts.filter((a) => !a.read).length;

  return (
    <div className="border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-[#111111]">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Bell className="w-4 h-4 text-gray-400" />
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              Smart Alerts
            </h3>
            {unreadCount > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
          <Link
            href="/notifications"
            className="flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            All alerts
            <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="mt-1.5">
          <ScanStatusBadge status={scanStatus} />
        </div>
      </div>

      {/* Body */}
      {loading ? (
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          <AlertSkeleton />
          <AlertSkeleton />
          <AlertSkeleton />
        </div>
      ) : alerts.length === 0 ? (
        <div className="px-6 py-8 text-center">
          <Bell className="w-8 h-8 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No recent alerts</p>
          <p className="text-xs text-gray-400 mt-1">
            Alerts fire when L1–L4 conditions change.
          </p>
          {scanStatus?.lastRun && (
            <p className="text-[10px] text-gray-400 mt-2">
              Last scan: {formatTime(scanStatus.lastRun)}
            </p>
          )}
          <Link
            href="/notifications"
            className="inline-block mt-3 text-xs font-medium text-teal-500 hover:text-teal-600 transition-colors"
          >
            Configure preferences &rarr;
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {alerts.map((alert, idx) => {
            const severity = (alert.metadata?.severity ?? 'INFO') as Severity;
            const cfg = SEVERITY_CONFIG[severity] ?? SEVERITY_CONFIG.INFO;
            const { Icon } = cfg;
            const layer = alert.metadata?.layer;

            return (
              <Link
                key={alert.id}
                href="/notifications"
                className={`flex items-start gap-3 px-6 py-4 transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.02] ${
                  !alert.read ? 'bg-gray-50/40 dark:bg-white/[0.015]' : ''
                }`}
              >
                {/* Icon */}
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${cfg.bgColor}`}
                >
                  <Icon className={`w-3.5 h-3.5 ${cfg.iconColor}`} />
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  {/* Layer badge + unread dot */}
                  <div className="flex items-center gap-2 mb-1">
                    {layer && (
                      <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                        {layer}
                      </span>
                    )}
                    {!alert.read && (
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dotColor}`} />
                    )}
                  </div>

                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-snug">
                    {alert.title}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed line-clamp-2">
                    {alert.message}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-1.5">{formatTime(alert.createdAt)}</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
