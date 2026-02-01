'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Target,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Clock,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import Link from 'next/link';
import { getAuthToken, getApiUrl } from '../../lib/api';

interface TakeProfit {
  level: 'TP1' | 'TP2';
  price: number;
  distance: number;
  hit: boolean;
}

interface LiveTrade {
  reportId: string;
  symbol: string;
  direction: 'long' | 'short';
  entryPrice: number;
  currentPrice: number;
  priceChange: number;
  priceChangePercent: number;
  stopLoss: {
    price: number;
    distance: number;
    status: 'safe' | 'warning' | 'danger';
  };
  takeProfits: TakeProfit[];
  status: 'active' | 'tp_hit' | 'sl_hit' | 'expired';
  hitLevel?: 'TP1' | 'TP2' | 'SL';
  unrealizedPnL: number;
  analysisDate: string;
  expiresAt: string;
  lastUpdated: string;
}

interface LiveTrackingPanelProps {
  className?: string;
}

export function LiveTrackingPanel({ className = '' }: LiveTrackingPanelProps) {
  const [trades, setTrades] = useState<LiveTrade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchTrades = useCallback(async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    setError(null);

    try {
      const token = await getAuthToken();
      if (!token) {
        setError('Please log in to view live tracking');
        return;
      }

      const response = await fetch(getApiUrl('/api/reports/live-tracking'), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setTrades(data.data.trades);
        setLastUpdated(data.data.lastUpdated);
      } else {
        setError('Failed to fetch live tracking data');
      }
    } catch (err) {
      setError('Network error');
      console.error(err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTrades();
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => fetchTrades(), 30000);
    return () => clearInterval(interval);
  }, [fetchTrades]);

  const formatPrice = (price: number): string => {
    if (price >= 1000) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (price >= 1) return price.toFixed(4);
    return price.toFixed(8);
  };

  const formatPercent = (percent: number): string => {
    const sign = percent >= 0 ? '+' : '';
    return `${sign}${percent.toFixed(2)}%`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'tp_hit': return 'text-green-500';
      case 'sl_hit': return 'text-red-500';
      case 'expired': return 'text-muted-foreground';
      default: return 'text-blue-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'tp_hit': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'sl_hit': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'expired': return <Clock className="w-4 h-4 text-muted-foreground" />;
      default: return <Activity className="w-4 h-4 text-blue-500 animate-pulse" />;
    }
  };

  const getSLStatusColor = (status: string) => {
    switch (status) {
      case 'danger': return 'bg-red-500/20 text-red-500 border-red-500/30';
      case 'warning': return 'bg-amber-500/20 text-amber-500 border-amber-500/30';
      default: return 'bg-green-500/20 text-green-500 border-green-500/30';
    }
  };

  if (isLoading) {
    return (
      <div className={`bg-card border rounded-lg p-6 ${className}`}>
        <div className="flex items-center justify-center h-40">
          <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-card border rounded-lg p-6 ${className}`}>
        <div className="text-center text-muted-foreground">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-amber-500" />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-card border rounded-lg ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Live Tracking</h3>
          <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
            {trades.length} active
          </span>
        </div>
        <button
          onClick={() => fetchTrades(true)}
          disabled={isRefreshing}
          className="p-2 hover:bg-accent rounded-lg transition disabled:opacity-50"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Trades List */}
      {trades.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">
          <Target className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="font-medium">No Active Trades</p>
          <p className="text-sm mt-1">Run an analysis to start tracking</p>
        </div>
      ) : (
        <div className="divide-y max-h-[500px] overflow-y-auto">
          {trades.map((trade) => (
            <Link
              key={trade.reportId}
              href={`/reports/${trade.reportId}`}
              className="block p-4 hover:bg-accent/50 transition"
            >
              {/* Trade Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {getStatusIcon(trade.status)}
                  <span className="font-bold">{trade.symbol}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    trade.direction === 'long'
                      ? 'bg-green-500/20 text-green-500'
                      : 'bg-red-500/20 text-red-500'
                  }`}>
                    {trade.direction.toUpperCase()}
                  </span>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm">${formatPrice(trade.currentPrice)}</p>
                  <p className={`text-xs ${trade.unrealizedPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {formatPercent(trade.unrealizedPnL)} PnL
                  </p>
                </div>
              </div>

              {/* Price Progress Bar */}
              <div className="mb-3">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>SL: ${formatPrice(trade.stopLoss.price)}</span>
                  <span>Entry: ${formatPrice(trade.entryPrice)}</span>
                  <span>TP1: ${formatPrice(trade.takeProfits?.[0]?.price || 0)}</span>
                </div>
                <div className="h-2 bg-accent rounded-full overflow-hidden relative">
                  {/* SL Zone */}
                  <div className="absolute left-0 h-full w-1/4 bg-red-500/30" />
                  {/* Safe Zone */}
                  <div className="absolute left-1/4 h-full w-1/2 bg-green-500/30" />
                  {/* TP Zone */}
                  <div className="absolute right-0 h-full w-1/4 bg-blue-500/30" />
                  {/* Current Price Indicator */}
                  <div
                    className="absolute h-full w-1 bg-primary"
                    style={{
                      left: `${Math.min(Math.max(
                        ((trade.currentPrice - trade.stopLoss.price) /
                        ((trade.takeProfits?.[0]?.price || trade.entryPrice) - trade.stopLoss.price)) * 100,
                        0
                      ), 100)}%`,
                    }}
                  />
                </div>
              </div>

              {/* TP/SL Status Grid */}
              <div className="grid grid-cols-4 gap-2 text-xs">
                {/* SL Status */}
                <div className={`p-2 rounded border ${getSLStatusColor(trade.stopLoss.status)}`}>
                  <p className="font-medium">SL</p>
                  <p>{formatPercent(trade.stopLoss.distance)}</p>
                </div>
                {/* TP Statuses */}
                {trade.takeProfits?.filter(tp => tp != null).map((tp) => (
                  <div
                    key={tp.level}
                    className={`p-2 rounded border ${
                      tp.hit
                        ? 'bg-green-500/20 text-green-500 border-green-500/30'
                        : 'bg-muted/50 border-border'
                    }`}
                  >
                    <p className="font-medium">{tp.level}</p>
                    <p>{tp.hit ? 'HIT!' : formatPercent(tp.distance)}</p>
                  </div>
                ))}
              </div>

              {/* Hit Status */}
              {trade.hitLevel && (
                <div className={`mt-3 p-2 rounded text-center text-sm font-medium ${
                  trade.status === 'tp_hit'
                    ? 'bg-green-500/20 text-green-500'
                    : 'bg-red-500/20 text-red-500'
                }`}>
                  {trade.status === 'tp_hit'
                    ? `${trade.hitLevel} Reached - Trade Successful!`
                    : 'Stop Loss Hit - Trade Closed'}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}

      {/* Footer */}
      {lastUpdated && (
        <div className="p-3 border-t text-xs text-muted-foreground text-center">
          Last updated: {new Date(lastUpdated).toLocaleTimeString()}
          <span className="ml-2">• Auto-refreshes every 30s</span>
        </div>
      )}
    </div>
  );
}
