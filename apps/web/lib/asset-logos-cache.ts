// ===========================================
// Asset Logos Cache
// Client-side caching system for asset logos
// Fetches from API and caches in localStorage + memory
// ===========================================

import { authFetch } from './authFetch';

// ===========================================
// Types
// ===========================================

export interface AssetLogoInfo {
  logoUrl: string;
  color: string;
  name: string;
}

export type AssetClass = 'crypto' | 'stocks' | 'metals' | 'bonds';

export interface CachedLogoInfo extends AssetLogoInfo {
  assetClass: AssetClass;
  isDefault: boolean;
}

interface LogoCache {
  crypto: Record<string, AssetLogoInfo>;
  stocks: Record<string, AssetLogoInfo>;
  metals: Record<string, AssetLogoInfo>;
  bonds: Record<string, AssetLogoInfo>;
  version: number;
  lastUpdated: string;
}

// ===========================================
// Constants
// ===========================================

const CACHE_KEY = 'traderpath_asset_logos';
const CACHE_VERSION_KEY = 'traderpath_asset_logos_version';
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const DEFAULT_COLOR = '#4F46E5'; // Indigo

// ===========================================
// In-memory cache
// ===========================================

let memoryCache: LogoCache | null = null;
let cacheLoadPromise: Promise<LogoCache> | null = null;

// ===========================================
// localStorage helpers
// ===========================================

function getFromLocalStorage(): LogoCache | null {
  if (typeof window === 'undefined') return null;

  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const parsed = JSON.parse(cached) as LogoCache;

    // Check if cache is expired
    const lastUpdated = new Date(parsed.lastUpdated).getTime();
    if (Date.now() - lastUpdated > CACHE_DURATION_MS) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function saveToLocalStorage(cache: LogoCache): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    localStorage.setItem(CACHE_VERSION_KEY, String(cache.version));
  } catch (error) {
    console.error('[AssetLogosCache] Failed to save to localStorage:', error);
  }
}

// ===========================================
// API fetch
// ===========================================

async function fetchLogosFromAPI(): Promise<LogoCache> {
  try {
    const response = await authFetch('/api/asset-logos');

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const json = await response.json();

    if (!json.success || !json.data) {
      throw new Error('Invalid API response');
    }

    return json.data as LogoCache;
  } catch (error) {
    console.error('[AssetLogosCache] Failed to fetch from API:', error);
    throw error;
  }
}

// ===========================================
// Cache initialization
// ===========================================

/**
 * Load logos cache - from memory, localStorage, or API
 */
export async function loadLogosCache(): Promise<LogoCache> {
  // Return from memory if available
  if (memoryCache) {
    return memoryCache;
  }

  // Return existing promise if already loading
  if (cacheLoadPromise) {
    return cacheLoadPromise;
  }

  // Start loading
  cacheLoadPromise = (async () => {
    // Try localStorage first
    const localCache = getFromLocalStorage();
    if (localCache) {
      memoryCache = localCache;
      return localCache;
    }

    // Fetch from API
    try {
      const apiCache = await fetchLogosFromAPI();
      memoryCache = apiCache;
      saveToLocalStorage(apiCache);
      return apiCache;
    } catch {
      // Return empty cache as fallback
      const emptyCache: LogoCache = {
        crypto: {},
        stocks: {},
        metals: {},
        bonds: {},
        version: 0,
        lastUpdated: new Date().toISOString(),
      };
      memoryCache = emptyCache;
      return emptyCache;
    }
  })();

  const result = await cacheLoadPromise;
  cacheLoadPromise = null;
  return result;
}

/**
 * Force refresh cache from API
 */
export async function refreshLogosCache(): Promise<LogoCache> {
  try {
    const apiCache = await fetchLogosFromAPI();
    memoryCache = apiCache;
    saveToLocalStorage(apiCache);
    return apiCache;
  } catch {
    return memoryCache || {
      crypto: {},
      stocks: {},
      metals: {},
      bonds: {},
      version: 0,
      lastUpdated: new Date().toISOString(),
    };
  }
}

/**
 * Clear cache (for logout, etc.)
 */
export function clearLogosCache(): void {
  memoryCache = null;
  cacheLoadPromise = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(CACHE_VERSION_KEY);
  }
}

// ===========================================
// Logo retrieval
// ===========================================

/**
 * Detect asset class from symbol
 */
export function detectAssetClass(symbol: string): AssetClass {
  const upper = symbol.toUpperCase();

  // Check memory cache first
  if (memoryCache) {
    if (memoryCache.crypto[upper]) return 'crypto';
    if (memoryCache.stocks[upper]) return 'stocks';
    if (memoryCache.metals[upper]) return 'metals';
    if (memoryCache.bonds[upper]) return 'bonds';
  }

  // Pattern-based detection
  if (upper.includes('USD') && (upper.startsWith('XAU') || upper.startsWith('XAG') || upper.startsWith('XPT') || upper.startsWith('XPD'))) {
    return 'metals';
  }
  if (upper.endsWith('Y') && upper.startsWith('US')) {
    return 'bonds';
  }
  if (['GLD', 'SLV', 'IAU', 'PSLV', 'PPLT', 'PALL', 'GDX', 'GDXJ', 'SIL'].includes(upper)) {
    return 'metals';
  }
  if (['TLT', 'IEF', 'SHY', 'BND', 'AGG', 'LQD', 'HYG', 'TIP', 'MUB', 'EMB'].includes(upper)) {
    return 'bonds';
  }

  // Known stocks (expand as needed)
  const knownStocks = [
    'SPY', 'QQQ', 'DIA', 'IWM', 'VTI', 'AAPL', 'MSFT', 'GOOGL', 'GOOG', 'AMZN',
    'META', 'NVDA', 'TSLA', 'AMD', 'INTC', 'JPM', 'BAC', 'WFC', 'GS', 'MS',
    'JNJ', 'UNH', 'PFE', 'WMT', 'KO', 'PEP', 'MCD', 'NKE', 'DIS', 'XOM',
    'CVX', 'BA', 'CAT', 'GE', 'T', 'VZ', 'COIN', 'MSTR', 'MARA', 'RIOT',
    'XLF', 'XLK', 'XLE', 'XLV', 'XLI', 'CRM', 'ORCL', 'ADBE', 'NFLX',
    'C', 'V', 'MA', 'PYPL', 'ABBV', 'MRK', 'LLY', 'COP', 'HON', 'UPS', 'TMUS',
  ];
  if (knownStocks.includes(upper)) {
    return 'stocks';
  }

  // Default to crypto
  return 'crypto';
}

/**
 * Get logo info for a symbol (synchronous - uses cache)
 */
export function getAssetLogo(symbol: string, assetClass?: AssetClass): CachedLogoInfo {
  const upper = symbol.toUpperCase();
  const detectedClass = assetClass || detectAssetClass(upper);

  // Try memory cache
  if (memoryCache) {
    const logos = memoryCache[detectedClass];
    if (logos && logos[upper]) {
      return {
        ...logos[upper],
        assetClass: detectedClass,
        isDefault: false,
      };
    }

    // Try other classes if not found
    if (!assetClass) {
      for (const cls of ['crypto', 'stocks', 'metals', 'bonds'] as AssetClass[]) {
        if (memoryCache[cls]?.[upper]) {
          return {
            ...memoryCache[cls][upper],
            assetClass: cls,
            isDefault: false,
          };
        }
      }
    }
  }

  // Return default
  return {
    logoUrl: '',
    color: DEFAULT_COLOR,
    name: upper,
    assetClass: detectedClass,
    isDefault: true,
  };
}

/**
 * Get logo info for a symbol (async - ensures cache is loaded)
 */
export async function getAssetLogoAsync(symbol: string, assetClass?: AssetClass): Promise<CachedLogoInfo> {
  await loadLogosCache();
  return getAssetLogo(symbol, assetClass);
}

/**
 * Get multiple logos at once
 */
export function getAssetLogos(symbols: string[]): Record<string, CachedLogoInfo> {
  const result: Record<string, CachedLogoInfo> = {};

  for (const symbol of symbols) {
    result[symbol.toUpperCase()] = getAssetLogo(symbol);
  }

  return result;
}

/**
 * Get all logos for an asset class
 */
export function getAssetClassLogos(assetClass: AssetClass): Record<string, AssetLogoInfo> {
  if (memoryCache && memoryCache[assetClass]) {
    return memoryCache[assetClass];
  }
  return {};
}

/**
 * Check if cache is loaded
 */
export function isCacheLoaded(): boolean {
  return memoryCache !== null;
}

/**
 * Get cache stats
 */
export function getCacheStats(): {
  isLoaded: boolean;
  cryptoCount: number;
  stocksCount: number;
  metalsCount: number;
  bondsCount: number;
  totalCount: number;
  version: number;
  lastUpdated: string | null;
} {
  if (!memoryCache) {
    return {
      isLoaded: false,
      cryptoCount: 0,
      stocksCount: 0,
      metalsCount: 0,
      bondsCount: 0,
      totalCount: 0,
      version: 0,
      lastUpdated: null,
    };
  }

  return {
    isLoaded: true,
    cryptoCount: Object.keys(memoryCache.crypto).length,
    stocksCount: Object.keys(memoryCache.stocks).length,
    metalsCount: Object.keys(memoryCache.metals).length,
    bondsCount: Object.keys(memoryCache.bonds).length,
    totalCount:
      Object.keys(memoryCache.crypto).length +
      Object.keys(memoryCache.stocks).length +
      Object.keys(memoryCache.metals).length +
      Object.keys(memoryCache.bonds).length,
    version: memoryCache.version,
    lastUpdated: memoryCache.lastUpdated,
  };
}

// ===========================================
// SVG Generation (fallback for missing logos)
// ===========================================

/**
 * Generate SVG data URL for a symbol (used when logoUrl is empty)
 */
export function generateFallbackSvg(symbol: string, color: string = DEFAULT_COLOR): string {
  const displaySymbol = symbol.toUpperCase().slice(0, 2);
  const fontSize = displaySymbol.length > 2 ? 28 : 32;

  // Adjust color brightness for gradient
  const adjustColor = (hex: string, percent: number): string => {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max(0, Math.min(255, (num >> 16) + amt));
    const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) + amt));
    const B = Math.max(0, Math.min(255, (num & 0x0000ff) + amt));
    return `#${((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1)}`;
  };

  // Determine text color based on background brightness
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
 * Get logo URL for a symbol - returns actual URL or generated SVG
 */
export function getLogoUrl(symbol: string, assetClass?: AssetClass): string {
  const logoInfo = getAssetLogo(symbol, assetClass);

  if (logoInfo.logoUrl && logoInfo.logoUrl.length > 0) {
    return logoInfo.logoUrl;
  }

  return generateFallbackSvg(symbol, logoInfo.color);
}

/**
 * Get logo URL async (ensures cache is loaded first)
 */
export async function getLogoUrlAsync(symbol: string, assetClass?: AssetClass): Promise<string> {
  await loadLogosCache();
  return getLogoUrl(symbol, assetClass);
}
