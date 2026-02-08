'use client';

// ===========================================
// Set Alert Modal Component
// Create price alerts for trade plan levels
// ===========================================

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  X,
  Bell,
  Loader2,
  Check,
  AlertTriangle,
  Target,
  TrendingUp,
  TrendingDown,
  MessageSquare,
  Send,
  Tv,
  Smartphone,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { getAuthToken, getApiUrl } from '../../lib/api';

interface TradePlanData {
  symbol: string;
  direction: 'long' | 'short';
  entryPrice: number;
  stopLoss: number;
  takeProfits: number[];
  reportId?: string;
}

interface SetAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  tradePlan: TradePlanData;
}

type NotificationChannel = 'browser' | 'telegram' | 'discord' | 'tradingview';

const CHANNEL_OPTIONS: { id: NotificationChannel; name: string; icon: React.ReactNode; description: string }[] = [
  {
    id: 'browser',
    name: 'Browser',
    icon: <Smartphone className="w-5 h-5" />,
    description: 'Push notifications in browser',
  },
  {
    id: 'telegram',
    name: 'Telegram',
    icon: <Send className="w-5 h-5" />,
    description: 'Instant Telegram messages',
  },
  {
    id: 'discord',
    name: 'Discord',
    icon: <MessageSquare className="w-5 h-5" />,
    description: 'Discord webhook alerts',
  },
  {
    id: 'tradingview',
    name: 'TradingView',
    icon: <Tv className="w-5 h-5" />,
    description: 'TradingView webhook',
  },
];

export function SetAlertModal({ isOpen, onClose, tradePlan }: SetAlertModalProps) {
  const queryClient = useQueryClient();
  const [selectedChannels, setSelectedChannels] = useState<NotificationChannel[]>(['browser']);
  const [selectedAlerts, setSelectedAlerts] = useState({
    entry: true,
    sl: true,
    tp1: true,
    tp2: tradePlan.takeProfits.length >= 2,
  });

  const createAlertsMutation = useMutation({
    mutationFn: async () => {
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');

      const takeProfits: number[] = [];
      if (selectedAlerts.tp1 && tradePlan.takeProfits?.length > 0 && tradePlan.takeProfits[0]) {
        takeProfits.push(tradePlan.takeProfits[0]);
      }
      if (selectedAlerts.tp2 && tradePlan.takeProfits?.length > 1 && tradePlan.takeProfits[1]) {
        takeProfits.push(tradePlan.takeProfits[1]);
      }

      const response = await fetch(getApiUrl('/api/alerts/trade-plan'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          symbol: tradePlan.symbol,
          direction: tradePlan.direction,
          entryPrice: selectedAlerts.entry ? tradePlan.entryPrice : undefined,
          stopLoss: selectedAlerts.sl ? tradePlan.stopLoss : undefined,
          takeProfits,
          channels: selectedChannels,
          reportId: tradePlan.reportId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to create alerts');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['credits'] });
      onClose();
    },
  });

  const toggleChannel = (channel: NotificationChannel) => {
    setSelectedChannels(prev =>
      prev.includes(channel)
        ? prev.filter(c => c !== channel)
        : [...prev, channel]
    );
  };

  const alertCount = Object.values(selectedAlerts).filter(Boolean).length;
  const isLong = tradePlan.direction === 'long';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="set-alert-dialog-title">
      {/* Accessible title for screen readers */}
      <h2 id="set-alert-dialog-title" className="sr-only">Set Price Alerts</h2>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className={cn(
          "px-6 py-4 border-b",
          isLong ? "bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20" : "bg-gradient-to-r from-red-500/10 to-rose-500/10 border-red-500/20"
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center",
                isLong ? "bg-green-500/20" : "bg-red-500/20"
              )}>
                <Bell className={cn("w-5 h-5", isLong ? "text-green-500" : "text-red-500")} />
              </div>
              <div>
                <h2 className="text-lg font-bold">Set Price Alerts</h2>
                <p className="text-sm text-muted-foreground">{tradePlan.symbol}/USDT Trade Plan</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Direction Badge */}
          <div className="flex items-center justify-center">
            <div className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold",
              isLong ? "bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400" : "bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400"
            )}>
              {isLong ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {isLong ? 'LONG' : 'SHORT'} Position
            </div>
          </div>

          {/* Alert Levels Selection */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Price Levels</h3>

            {/* Entry */}
            <label className="flex items-center justify-between p-3 rounded-xl border bg-card hover:bg-accent/50 transition cursor-pointer">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={selectedAlerts.entry}
                  onChange={() => setSelectedAlerts(prev => ({ ...prev, entry: !prev.entry }))}
                  className="w-4 h-4 rounded text-blue-500"
                />
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <Target className="w-4 h-4 text-blue-500" />
                </div>
                <span className="font-medium">Entry Zone</span>
              </div>
              <span className="text-sm font-mono text-muted-foreground">${tradePlan.entryPrice.toLocaleString()}</span>
            </label>

            {/* Stop Loss */}
            <label className="flex items-center justify-between p-3 rounded-xl border bg-card hover:bg-accent/50 transition cursor-pointer">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={selectedAlerts.sl}
                  onChange={() => setSelectedAlerts(prev => ({ ...prev, sl: !prev.sl }))}
                  className="w-4 h-4 rounded text-red-500"
                />
                <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                </div>
                <span className="font-medium">Stop Loss</span>
              </div>
              <span className="text-sm font-mono text-muted-foreground">${tradePlan.stopLoss.toLocaleString()}</span>
            </label>

            {/* Take Profits */}
            {tradePlan.takeProfits.map((tp, index) => (
              <label key={index} className="flex items-center justify-between p-3 rounded-xl border bg-card hover:bg-accent/50 transition cursor-pointer">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedAlerts[`tp${index + 1}` as keyof typeof selectedAlerts]}
                    onChange={() => setSelectedAlerts(prev => ({ ...prev, [`tp${index + 1}`]: !prev[`tp${index + 1}` as keyof typeof selectedAlerts] }))}
                    className="w-4 h-4 rounded text-green-500"
                  />
                  <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                    <span className="text-xs font-bold text-green-500">TP{index + 1}</span>
                  </div>
                  <span className="font-medium">Take Profit {index + 1}</span>
                </div>
                <span className="text-sm font-mono text-muted-foreground">${tp.toLocaleString()}</span>
              </label>
            ))}
          </div>

          {/* Notification Channels */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Notification Channels</h3>
            <div className="grid grid-cols-2 gap-2">
              {CHANNEL_OPTIONS.map(channel => (
                <button
                  key={channel.id}
                  onClick={() => toggleChannel(channel.id)}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl border transition",
                    selectedChannels.includes(channel.id)
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center",
                    selectedChannels.includes(channel.id) ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                  )}>
                    {channel.icon}
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-medium">{channel.name}</div>
                  </div>
                  {selectedChannels.includes(channel.id) && (
                    <Check className="w-4 h-4 text-primary ml-auto" />
                  )}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Configure channels in Settings → Notifications
            </p>
          </div>

          {/* Cost Summary */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
            <div>
              <div className="text-sm text-amber-700 dark:text-amber-400">Alert Cost</div>
              <div className="text-xs text-amber-600 dark:text-amber-500">{alertCount} alerts × 1 credit each</div>
            </div>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{alertCount} credits</div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-muted/30 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium hover:bg-muted rounded-lg transition"
          >
            Cancel
          </button>
          <button
            onClick={() => createAlertsMutation.mutate()}
            disabled={createAlertsMutation.isPending || alertCount === 0 || selectedChannels.length === 0}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition",
              "bg-gradient-to-r from-amber-500 to-orange-500 text-white",
              "hover:from-amber-600 hover:to-orange-600",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {createAlertsMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Bell className="w-4 h-4" />
                Set {alertCount} Alerts
              </>
            )}
          </button>
        </div>

        {/* Error Message */}
        {createAlertsMutation.isError && (
          <div className="px-6 py-3 bg-red-50 dark:bg-red-500/10 border-t border-red-200 dark:border-red-500/20">
            <p className="text-sm text-red-600 dark:text-red-400">
              {createAlertsMutation.error.message}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
