'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authFetch, getAuthToken, getApiUrl } from '../api';
import {
  type RecentAnalysis,
  type DailyPassStatus,
  type TradeType,
  normalizeVerdict,
  intervalToTradeType,
  mapOutcome,
} from '../analysis-types';

/**
 * Shared hook for fetching and managing recent analyses.
 * Used by both Auto and Tailored pages.
 */
export function useRecentAnalyses(refreshInterval = 30000) {
  const [analyses, setAnalyses] = useState<RecentAnalysis[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    try {
      const token = await getAuthToken();
      if (!token) {
        setAnalyses([]);
        setLoading(false);
        return;
      }
      const response = await globalThis.fetch(getApiUrl('/api/analysis/live-prices'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const responseText = await response.text();
        if (responseText?.trim()) {
          const result = JSON.parse(responseText);
          const liveAnalyses = result.data?.analyses || [];
          const mapped: RecentAnalysis[] = liveAnalyses.map((a: Record<string, unknown>) => ({
            id: a.id as string,
            symbol: a.symbol as string,
            verdict: normalizeVerdict(String(a.verdict ?? '')),
            score: (a.totalScore as number) ?? null,
            direction: a.direction as string | null,
            tradeType: intervalToTradeType(a.interval as string | undefined),
            method: (a.method as string) || 'classic',
            createdAt: new Date(a.createdAt as string).toLocaleDateString('en-US', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            }),
            outcome: mapOutcome(a.outcome as string | undefined, a.hasTradePlan as boolean | undefined),
            entryPrice: a.entryPrice as number | undefined,
            currentPrice: a.currentPrice as number | undefined,
            unrealizedPnL: a.unrealizedPnL as number | undefined,
            stopLoss: a.stopLoss as number | undefined,
            takeProfit1: a.takeProfit1 as number | undefined,
            tpProgress: a.tpProgress as number | undefined,
            hasTradePlan: a.hasTradePlan as boolean | undefined,
            expiresAt: a.expiresAt as string | undefined,
          }));
          setAnalyses(mapped);
        }
      }
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
    if (refreshInterval > 0) {
      const interval = setInterval(fetch, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetch, refreshInterval]);

  return { analyses, setAnalyses, loading, refresh: fetch };
}

/**
 * Shared hook for daily pass status management.
 */
export function useDailyPass() {
  const [status, setStatus] = useState<DailyPassStatus | null>(null);
  const [purchasing, setPurchasing] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await authFetch('/api/passes/check/ASSET_ANALYSIS');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setStatus({
            hasPass: data.data.hasPass,
            canUse: data.data.canUse,
            usageCount: data.data.pass?.usageCount ?? 0,
            maxUsage: data.data.pass?.maxUsage ?? 10,
          });
        }
      }
    } catch {
      // Silent fail
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  return { status, setStatus, purchasing, setPurchasing, refresh: fetchStatus };
}

/**
 * Shared hook for analysis action handlers (delete, email).
 */
export function useAnalysisHandlers(
  analyses: RecentAnalysis[],
  setAnalyses: React.Dispatch<React.SetStateAction<RecentAnalysis[]>>
) {
  const router = useRouter();
  const [actionLoading, setActionLoading] = useState<{ id: string; action: string } | null>(null);

  const handleDelete = useCallback(
    async (e: React.MouseEvent, analysisId: string) => {
      e.preventDefault();
      e.stopPropagation();
      if (!confirm('Delete this analysis?')) return;
      setActionLoading({ id: analysisId, action: 'delete' });
      try {
        const response = await authFetch(`/api/analysis/${analysisId}`, { method: 'DELETE' });
        if (response.ok) setAnalyses(prev => prev.filter(a => a.id !== analysisId));
      } catch {
        // Silent fail
      } finally {
        setActionLoading(null);
      }
    },
    [setAnalyses]
  );

  const handleEmail = useCallback(
    (e: React.MouseEvent, analysis: RecentAnalysis) => {
      e.preventDefault();
      e.stopPropagation();
      router.push(`/analyze/details/${analysis.id}?email=true`);
    },
    [router]
  );

  return { actionLoading, handleDelete, handleEmail };
}
