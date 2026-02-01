'use client';

// ===========================================
// useAssetLogos Hook
// React hook for accessing asset logos with automatic caching
// ===========================================

import { useState, useEffect, useCallback } from 'react';
import {
  loadLogosCache,
  refreshLogosCache,
  getAssetLogo,
  getLogoUrl,
  isCacheLoaded,
  getCacheStats,
  CachedLogoInfo,
  AssetClass,
} from '../lib/asset-logos-cache';

// ===========================================
// Hook for single logo
// ===========================================

export function useAssetLogo(symbol: string, assetClass?: AssetClass) {
  const [logoInfo, setLogoInfo] = useState<CachedLogoInfo>(() =>
    getAssetLogo(symbol, assetClass)
  );
  const [logoUrl, setLogoUrl] = useState<string>(() =>
    getLogoUrl(symbol, assetClass)
  );
  const [isLoading, setIsLoading] = useState(!isCacheLoaded());

  useEffect(() => {
    if (!isCacheLoaded()) {
      setIsLoading(true);
      loadLogosCache()
        .then(() => {
          setLogoInfo(getAssetLogo(symbol, assetClass));
          setLogoUrl(getLogoUrl(symbol, assetClass));
        })
        .finally(() => setIsLoading(false));
    } else {
      setLogoInfo(getAssetLogo(symbol, assetClass));
      setLogoUrl(getLogoUrl(symbol, assetClass));
    }
  }, [symbol, assetClass]);

  return {
    logoInfo,
    logoUrl,
    isLoading,
    color: logoInfo.color,
    name: logoInfo.name,
    assetClass: logoInfo.assetClass,
    isDefault: logoInfo.isDefault,
  };
}

// ===========================================
// Hook for multiple logos
// ===========================================

export function useAssetLogos(symbols: string[]) {
  const [logos, setLogos] = useState<Record<string, CachedLogoInfo>>({});
  const [isLoading, setIsLoading] = useState(!isCacheLoaded());

  useEffect(() => {
    const updateLogos = () => {
      const result: Record<string, CachedLogoInfo> = {};
      for (const symbol of symbols) {
        result[symbol.toUpperCase()] = getAssetLogo(symbol);
      }
      setLogos(result);
    };

    if (!isCacheLoaded()) {
      setIsLoading(true);
      loadLogosCache()
        .then(updateLogos)
        .finally(() => setIsLoading(false));
    } else {
      updateLogos();
    }
  }, [symbols.join(',')]); // Dependency on joined symbols string

  const getLogoForSymbol = useCallback(
    (symbol: string): CachedLogoInfo => {
      return logos[symbol.toUpperCase()] || getAssetLogo(symbol);
    },
    [logos]
  );

  const getLogoUrlForSymbol = useCallback(
    (symbol: string): string => {
      return getLogoUrl(symbol);
    },
    []
  );

  return {
    logos,
    isLoading,
    getLogoForSymbol,
    getLogoUrlForSymbol,
  };
}

// ===========================================
// Hook for cache management
// ===========================================

export function useAssetLogosCache() {
  const [isLoaded, setIsLoaded] = useState(isCacheLoaded());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [stats, setStats] = useState(getCacheStats());

  useEffect(() => {
    if (!isLoaded) {
      loadLogosCache().then(() => {
        setIsLoaded(true);
        setStats(getCacheStats());
      });
    }
  }, [isLoaded]);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refreshLogosCache();
      setStats(getCacheStats());
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  return {
    isLoaded,
    isRefreshing,
    stats,
    refresh,
  };
}

// ===========================================
// Preload hook (for app initialization)
// ===========================================

export function usePreloadAssetLogos() {
  const [isPreloaded, setIsPreloaded] = useState(isCacheLoaded());

  useEffect(() => {
    if (!isPreloaded) {
      loadLogosCache().then(() => setIsPreloaded(true));
    }
  }, [isPreloaded]);

  return isPreloaded;
}
