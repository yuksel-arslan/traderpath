'use client';

import { useState, useEffect } from 'react';
import { getLogoUrl, getAssetLogo, loadLogosCache, isCacheLoaded, AssetClass } from '../../lib/asset-logos-cache';

interface CoinIconProps {
  symbol: string;
  size?: number;
  className?: string;
  assetClass?: AssetClass;
  showFallback?: boolean;
}

/**
 * CoinIcon component - displays asset logo with caching
 * Fetches logos from API cache, falls back to generated SVG
 */
export function CoinIcon({
  symbol,
  size = 32,
  className = '',
  assetClass,
  showFallback = true,
}: CoinIconProps) {
  const [iconUrl, setIconUrl] = useState<string>(() => getLogoUrl(symbol, assetClass));
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(!isCacheLoaded());

  useEffect(() => {
    // Load cache if not already loaded
    if (!isCacheLoaded()) {
      setIsLoading(true);
      loadLogosCache()
        .then(() => {
          setIconUrl(getLogoUrl(symbol, assetClass));
        })
        .finally(() => setIsLoading(false));
    } else {
      setIconUrl(getLogoUrl(symbol, assetClass));
    }
  }, [symbol, assetClass]);

  // Handle image load error - fallback to generated SVG
  const handleError = () => {
    if (!hasError) {
      setHasError(true);
      const logoInfo = getAssetLogo(symbol, assetClass);
      // Use generated SVG as fallback
      const svg = generateFallbackSvg(symbol, logoInfo.color);
      setIconUrl(svg);
    }
  };

  if (isLoading && showFallback) {
    // Show placeholder while loading
    return (
      <div
        className={`relative flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse ${className}`}
        style={{ width: size, height: size }}
      >
        <span className="text-xs font-bold text-gray-400">
          {symbol.slice(0, 2).toUpperCase()}
        </span>
      </div>
    );
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
 * Generate fallback SVG when logo fails to load
 */
function generateFallbackSvg(symbol: string, color: string = '#4F46E5'): string {
  const displaySymbol = symbol.toUpperCase().slice(0, 2);
  const fontSize = displaySymbol.length > 2 ? 28 : 32;

  const adjustColor = (hex: string, percent: number): string => {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max(0, Math.min(255, (num >> 16) + amt));
    const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) + amt));
    const B = Math.max(0, Math.min(255, (num & 0x0000ff) + amt));
    return `#${((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1)}`;
  };

  const getBrightness = (hex: string): number => {
    const num = parseInt(hex.replace('#', ''), 16);
    const R = (num >> 16) & 0xff;
    const G = (num >> 8) & 0xff;
    const B = num & 0xff;
    return (R * 299 + G * 587 + B * 114) / 1000;
  };

  const textColor = getBrightness(color) > 128 ? '#000000' : '#FFFFFF';

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${color};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${adjustColor(color, -20)};stop-opacity:1" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="48" fill="url(#grad)" stroke="${adjustColor(color, -30)}" stroke-width="2"/>
      <text x="50" y="58" font-size="${fontSize}" fill="${textColor}" text-anchor="middle" font-weight="bold" font-family="system-ui, -apple-system, sans-serif">${displaySymbol}</text>
    </svg>
  `.trim().replace(/\s+/g, ' ');

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/**
 * Get coin brand colors for use in other components
 */
export function getCoinColor(symbol: string): { bg: string; text: string } {
  const logoInfo = getAssetLogo(symbol);

  // Determine text color based on background brightness
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
