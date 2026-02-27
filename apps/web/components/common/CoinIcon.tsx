'use client';

import { useState, useEffect, useRef } from 'react';
import { getLogoUrl, getAssetLogo, loadLogosCache, isCacheLoaded, AssetClass } from '../../lib/asset-logos-cache';

interface CoinIconProps {
  symbol: string;
  size?: number;
  className?: string;
  assetClass?: AssetClass;
  showFallback?: boolean;
}

/**
 * Get alternative CDN URLs for a crypto symbol
 * Tries multiple reliable CDNs to maximize logo availability
 */
function getFallbackCdnUrls(symbol: string): string[] {
  const clean = symbol.toUpperCase().replace(/USDT$|USD$|BUSD$|USDC$/, '');
  const lower = clean.toLowerCase();

  return [
    // jsDelivr + cryptocurrency-icons repo (very reliable CDN)
    `https://cdn.jsdelivr.net/gh/nicehash/cryptocurrency-icons@master/128/${lower}.png`,
    // CoinCap CDN
    `https://assets.coincap.io/assets/icons/${lower}@2x.png`,
    // CryptoFonts CDN
    `https://cryptofonts.com/img/icons/${lower}.svg`,
    // spothq cryptocurrency-icons via jsDelivr
    `https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/svg/color/${lower}.svg`,
  ];
}

/**
 * CoinIcon component - displays real asset logos only
 * Tries API cache, then multiple CDN fallbacks. Shows nothing if no real logo found.
 */
export function CoinIcon({
  symbol,
  size = 32,
  className = '',
  assetClass,
  showFallback = true,
}: CoinIconProps) {
  const [iconUrl, setIconUrl] = useState<string | null>(() => {
    const url = getLogoUrl(symbol, assetClass);
    // Only use URLs that are real HTTP URLs, not data: SVG fallbacks
    return url.startsWith('http') ? url : null;
  });
  const [allFailed, setAllFailed] = useState(false);
  const errorCountRef = useRef(0);
  const [isLoading, setIsLoading] = useState(!isCacheLoaded());

  useEffect(() => {
    // Reset state when symbol changes
    errorCountRef.current = 0;
    setAllFailed(false);

    // Load cache if not already loaded
    if (!isCacheLoaded()) {
      setIsLoading(true);
      loadLogosCache()
        .then(() => {
          const url = getLogoUrl(symbol, assetClass);
          setIconUrl(url.startsWith('http') ? url : null);
        })
        .finally(() => setIsLoading(false));
    } else {
      const url = getLogoUrl(symbol, assetClass);
      setIconUrl(url.startsWith('http') ? url : null);
    }
  }, [symbol, assetClass]);

  // Handle image load error - try alternative CDNs, hide if all fail
  const handleError = () => {
    const fallbackUrls = getFallbackCdnUrls(symbol);
    const currentAttempt = errorCountRef.current;
    errorCountRef.current += 1;

    if (currentAttempt < fallbackUrls.length) {
      setIconUrl(fallbackUrls[currentAttempt]);
    } else {
      // All CDNs failed - show nothing
      setIconUrl(null);
      setAllFailed(true);
    }
  };

  // Loading state
  if (isLoading && showFallback) {
    return (
      <div
        className={`relative rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  // All CDNs failed or no URL available - render nothing
  if (allFailed || !iconUrl) {
    return null;
  }

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={iconUrl}
        alt={`${symbol} icon`}
        width={size}
        height={size}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
        onError={handleError}
        loading="lazy"
      />
    </div>
  );
}

/**
 * Get coin brand colors for use in other components
 */
export function getCoinColor(symbol: string): { bg: string; text: string } {
  const logoInfo = getAssetLogo(symbol);

  const getBrightness = (hex: string): number => {
    const num = parseInt(hex.replace('#', ''), 16);
    const R = (num >> 16) & 0xff;
    const G = (num >> 8) & 0xff;
    const B = num & 0xff;
    return (R * 299 + G * 587 + B * 114) / 1000;
  };

  const textColor = getBrightness(logoInfo.color) > 128 ? '#000000' : '#FFFFFF';

  return {
    bg: logoInfo.color,
    text: textColor,
  };
}

export { getAssetLogo };
