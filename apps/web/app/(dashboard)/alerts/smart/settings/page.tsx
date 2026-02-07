'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Bell,
  BellOff,
  Mail,
  Smartphone,
  Save,
  Loader2,
  Check,
  Globe,
  TrendingUp,
  BarChart3,
  Zap,
  Info,
  AlertTriangle,
  AlertCircle,
} from 'lucide-react';
import { cn } from '../../../../../lib/utils';
import { authFetch } from '../../../../../lib/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

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

const MARKET_OPTIONS = [
  { value: 'crypto', label: 'Crypto', icon: '₿', desc: 'Bitcoin, Ethereum, DeFi, and more' },
  { value: 'stocks', label: 'Stocks', icon: '📈', desc: 'SPY, QQQ, AAPL, MSFT, etc.' },
  { value: 'bonds', label: 'Bonds', icon: '🏛️', desc: 'TLT, IEF, Treasury yields' },
  { value: 'metals', label: 'Metals', icon: '🥇', desc: 'Gold, Silver, GLD, SLV' },
  { value: 'bist', label: 'BIST', icon: '🇹🇷', desc: 'Borsa Istanbul equities' },
];

const SEVERITY_OPTIONS: { value: AlertSeverity; label: string; desc: string; icon: typeof Info; color: string }[] = [
  { value: 'INFO', label: 'All Alerts', desc: 'Receive all alerts including informational ones', icon: Info, color: 'text-muted-foreground' },
  { value: 'WARNING', label: 'Warnings & Critical', desc: 'Only significant changes that may affect your positions', icon: AlertTriangle, color: 'text-[#5EEDC3]' },
  { value: 'CRITICAL', label: 'Critical Only', desc: 'Only urgent alerts requiring immediate action', icon: AlertCircle, color: 'text-[#FF6B6B]' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SmartAlertSettingsPage() {
  const [prefs, setPrefs] = useState<AlertPreferences>({
    enabled: true,
    markets: ['crypto', 'stocks', 'bonds', 'metals', 'bist'],
    minSeverity: 'WARNING',
    emailEnabled: false,
    pushEnabled: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // ---------------------------------------------------------------------------
  // Fetch
  // ---------------------------------------------------------------------------

  const fetchPrefs = useCallback(async () => {
    try {
      const res = await authFetch('/api/smart-alerts/preferences');
      const data = await res.json();
      if (data.success && data.data) {
        setPrefs(data.data);
      }
    } catch {
      // Use defaults
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPrefs(); }, [fetchPrefs]);

  // ---------------------------------------------------------------------------
  // Save
  // ---------------------------------------------------------------------------

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await authFetch('/api/smart-alerts/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prefs),
      });
      const data = await res.json();
      if (data.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch {
      // Silent
    } finally {
      setSaving(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  const toggleMarket = (market: string) => {
    setPrefs((prev) => ({
      ...prev,
      markets: prev.markets.includes(market)
        ? prev.markets.filter((m) => m !== market)
        : [...prev.markets, market],
    }));
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/alerts/smart"
          className="p-2 rounded-lg hover:bg-accent transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Smart Alert Settings</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configure which L1-L4 alerts you receive and how
          </p>
        </div>
      </div>

      {/* Enable/Disable toggle */}
      <div
        className={cn(
          'flex items-center justify-between p-4 rounded-xl border transition-colors',
          prefs.enabled ? 'border-[#5EEDC3]/30 bg-[#5EEDC3]/5' : 'border-border bg-card',
        )}
      >
        <div className="flex items-center gap-3">
          {prefs.enabled ? (
            <Bell className="w-5 h-5 text-[#5EEDC3]" />
          ) : (
            <BellOff className="w-5 h-5 text-muted-foreground" />
          )}
          <div>
            <p className="font-medium">Smart Alerts</p>
            <p className="text-sm text-muted-foreground">
              {prefs.enabled ? 'Receiving L1-L4 hierarchy change alerts' : 'Smart alerts are disabled'}
            </p>
          </div>
        </div>
        <button
          onClick={() => setPrefs((p) => ({ ...p, enabled: !p.enabled }))}
          className={cn(
            'relative w-12 h-6 rounded-full transition-colors',
            prefs.enabled ? 'bg-[#5EEDC3]' : 'bg-muted',
          )}
        >
          <div
            className={cn(
              'absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform',
              prefs.enabled ? 'translate-x-6' : 'translate-x-0.5',
            )}
          />
        </button>
      </div>

      {/* Market selection */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Markets</h2>
        <p className="text-sm text-muted-foreground">
          Select which markets you want to receive alerts for
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {MARKET_OPTIONS.map((market) => {
            const isSelected = prefs.markets.includes(market.value);
            return (
              <button
                key={market.value}
                onClick={() => toggleMarket(market.value)}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-xl border text-left transition-all',
                  isSelected
                    ? 'border-[#5EEDC3]/30 bg-[#5EEDC3]/5'
                    : 'border-border hover:bg-accent',
                )}
              >
                <span className="text-xl">{market.icon}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium">{market.label}</p>
                  <p className="text-xs text-muted-foreground">{market.desc}</p>
                </div>
                {isSelected && (
                  <Check className="w-4 h-4 text-[#5EEDC3] shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Severity threshold */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Alert Sensitivity</h2>
        <p className="text-sm text-muted-foreground">
          Choose the minimum severity level to receive
        </p>
        <div className="space-y-2">
          {SEVERITY_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isSelected = prefs.minSeverity === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setPrefs((p) => ({ ...p, minSeverity: opt.value }))}
                className={cn(
                  'w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all',
                  isSelected
                    ? 'border-[#5EEDC3]/30 bg-[#5EEDC3]/5'
                    : 'border-border hover:bg-accent',
                )}
              >
                <Icon className={cn('w-5 h-5 shrink-0', opt.color)} />
                <div className="flex-1">
                  <p className="text-sm font-medium">{opt.label}</p>
                  <p className="text-xs text-muted-foreground">{opt.desc}</p>
                </div>
                {isSelected && (
                  <div className="w-4 h-4 rounded-full border-2 border-[#5EEDC3] flex items-center justify-center shrink-0">
                    <div className="w-2 h-2 rounded-full bg-[#5EEDC3]" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Delivery channels */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Delivery Channels</h2>
        <p className="text-sm text-muted-foreground">
          How would you like to receive alerts?
        </p>

        <div className="space-y-2">
          {/* In-App is always on */}
          <div className="flex items-center justify-between p-3 rounded-xl border border-[#5EEDC3]/30 bg-[#5EEDC3]/5">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-[#5EEDC3]" />
              <div>
                <p className="text-sm font-medium">In-App Notifications</p>
                <p className="text-xs text-muted-foreground">Always enabled</p>
              </div>
            </div>
            <span className="text-xs text-[#5EEDC3] font-medium">Always On</span>
          </div>

          {/* Email */}
          <div
            className={cn(
              'flex items-center justify-between p-3 rounded-xl border transition-colors',
              prefs.emailEnabled ? 'border-[#5EEDC3]/30 bg-[#5EEDC3]/5' : 'border-border',
            )}
          >
            <div className="flex items-center gap-3">
              <Mail className={cn('w-5 h-5', prefs.emailEnabled ? 'text-[#5EEDC3]' : 'text-muted-foreground')} />
              <div>
                <p className="text-sm font-medium">Email</p>
                <p className="text-xs text-muted-foreground">Critical alerts sent to your email</p>
              </div>
            </div>
            <button
              onClick={() => setPrefs((p) => ({ ...p, emailEnabled: !p.emailEnabled }))}
              className={cn(
                'relative w-12 h-6 rounded-full transition-colors',
                prefs.emailEnabled ? 'bg-[#5EEDC3]' : 'bg-muted',
              )}
            >
              <div
                className={cn(
                  'absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform',
                  prefs.emailEnabled ? 'translate-x-6' : 'translate-x-0.5',
                )}
              />
            </button>
          </div>

          {/* Push */}
          <div
            className={cn(
              'flex items-center justify-between p-3 rounded-xl border transition-colors',
              prefs.pushEnabled ? 'border-[#5EEDC3]/30 bg-[#5EEDC3]/5' : 'border-border',
            )}
          >
            <div className="flex items-center gap-3">
              <Smartphone className={cn('w-5 h-5', prefs.pushEnabled ? 'text-[#5EEDC3]' : 'text-muted-foreground')} />
              <div>
                <p className="text-sm font-medium">Push Notifications</p>
                <p className="text-xs text-muted-foreground">Browser push for critical alerts</p>
              </div>
            </div>
            <button
              onClick={() => setPrefs((p) => ({ ...p, pushEnabled: !p.pushEnabled }))}
              className={cn(
                'relative w-12 h-6 rounded-full transition-colors',
                prefs.pushEnabled ? 'bg-[#5EEDC3]' : 'bg-muted',
              )}
            >
              <div
                className={cn(
                  'absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform',
                  prefs.pushEnabled ? 'translate-x-6' : 'translate-x-0.5',
                )}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Save button */}
      <div className="sticky bottom-4 pt-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className={cn(
            'w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all',
            saved
              ? 'bg-[#5EEDC3] text-black'
              : 'bg-gradient-to-r from-[#5EEDC3] to-[#14B8A6] text-black hover:shadow-lg hover:shadow-[#5EEDC3]/20',
          )}
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : saved ? (
            <>
              <Check className="w-4 h-4" />
              Saved
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Preferences
            </>
          )}
        </button>
      </div>
    </div>
  );
}
