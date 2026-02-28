'use client';

import { useState, useEffect } from 'react';

export interface PlatformStats {
  totalUsers: number;
  totalAnalyses: number;
  totalAssets: number;
  accuracy: number;
  totalPnL: number;
  closedCount: number;
}

// Module-level cache — shared across all hook consumers, avoids duplicate fetches
let cachedData: PlatformStats | null = null;
let fetchPromise: Promise<PlatformStats | null> | null = null;

async function fetchPlatformStats(): Promise<PlatformStats | null> {
  const apiUrls = [
    process.env.NEXT_PUBLIC_API_URL,
    'https://api.traderpath.io',
    'https://traderpath-api-production.up.railway.app',
  ].filter(Boolean);

  for (const baseUrl of apiUrls) {
    try {
      const res = await fetch(`${baseUrl}/api/analysis/platform-stats`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          return {
            totalUsers: json.data.platform.totalUsers || 0,
            totalAnalyses: json.data.platform.totalAnalyses || 0,
            totalAssets: json.data.platform.totalAssets || 0,
            accuracy: json.data.accuracy.overall || 0,
            totalPnL: json.data.accuracy.totalPnL || 0,
            closedCount: json.data.accuracy.closedCount || 0,
          };
        }
      }
    } catch {
      continue;
    }
  }
  return null;
}

export function usePlatformStats() {
  const [data, setData] = useState<PlatformStats | null>(cachedData);
  const [loading, setLoading] = useState(!cachedData);

  useEffect(() => {
    if (cachedData) {
      setData(cachedData);
      setLoading(false);
      return;
    }

    // Deduplicate concurrent requests
    if (!fetchPromise) {
      fetchPromise = fetchPlatformStats().then((result) => {
        cachedData = result;
        fetchPromise = null;
        return result;
      });
    }

    fetchPromise.then((result) => {
      setData(result);
      setLoading(false);
    });
  }, []);

  return { data, loading };
}
