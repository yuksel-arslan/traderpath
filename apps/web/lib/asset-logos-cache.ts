// ===========================================
// Asset Logos Cache
// Client-side caching system for asset logos
// Fetches from API and caches in localStorage + memory
// ===========================================

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
// Fallback Logo Data (used when API fails)
// ===========================================

const FALLBACK_CRYPTO_LOGOS: Record<string, AssetLogoInfo> = {
  BTC: { logoUrl: 'https://coin-images.coingecko.com/coins/images/1/small/bitcoin.png', color: '#F7931A', name: 'Bitcoin' },
  ETH: { logoUrl: 'https://coin-images.coingecko.com/coins/images/279/small/ethereum.png', color: '#627EEA', name: 'Ethereum' },
  BNB: { logoUrl: 'https://coin-images.coingecko.com/coins/images/825/small/bnb-icon2_2x.png', color: '#F3BA2F', name: 'BNB' },
  SOL: { logoUrl: 'https://coin-images.coingecko.com/coins/images/4128/small/solana.png', color: '#9945FF', name: 'Solana' },
  XRP: { logoUrl: 'https://coin-images.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png', color: '#23292F', name: 'XRP' },
  ADA: { logoUrl: 'https://coin-images.coingecko.com/coins/images/975/small/cardano.png', color: '#0033AD', name: 'Cardano' },
  DOGE: { logoUrl: 'https://coin-images.coingecko.com/coins/images/5/small/dogecoin.png', color: '#C2A633', name: 'Dogecoin' },
  AVAX: { logoUrl: 'https://coin-images.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png', color: '#E84142', name: 'Avalanche' },
  DOT: { logoUrl: 'https://coin-images.coingecko.com/coins/images/12171/small/polkadot.png', color: '#E6007A', name: 'Polkadot' },
  MATIC: { logoUrl: 'https://coin-images.coingecko.com/coins/images/4713/small/polygon.png', color: '#8247E5', name: 'Polygon' },
  LINK: { logoUrl: 'https://coin-images.coingecko.com/coins/images/877/small/chainlink-new-logo.png', color: '#375BD2', name: 'Chainlink' },
  UNI: { logoUrl: 'https://coin-images.coingecko.com/coins/images/12504/small/uniswap-uni.png', color: '#FF007A', name: 'Uniswap' },
  ATOM: { logoUrl: 'https://coin-images.coingecko.com/coins/images/1481/small/cosmos_hub.png', color: '#2E3148', name: 'Cosmos' },
  LTC: { logoUrl: 'https://coin-images.coingecko.com/coins/images/2/small/litecoin.png', color: '#345D9D', name: 'Litecoin' },
  NEAR: { logoUrl: 'https://coin-images.coingecko.com/coins/images/10365/small/near.jpg', color: '#000000', name: 'NEAR' },
  ARB: { logoUrl: 'https://coin-images.coingecko.com/coins/images/16547/small/photo_2023-03-29_21.47.00.jpeg', color: '#28A0F0', name: 'Arbitrum' },
  OP: { logoUrl: 'https://coin-images.coingecko.com/coins/images/25244/small/Optimism.png', color: '#FF0420', name: 'Optimism' },
  APT: { logoUrl: 'https://coin-images.coingecko.com/coins/images/26455/small/aptos_round.png', color: '#000000', name: 'Aptos' },
  SUI: { logoUrl: 'https://coin-images.coingecko.com/coins/images/26375/small/sui_asset.jpeg', color: '#4DA2FF', name: 'Sui' },
  INJ: { logoUrl: 'https://coin-images.coingecko.com/coins/images/12882/small/Secondary_Symbol.png', color: '#00F2FE', name: 'Injective' },
  PEPE: { logoUrl: 'https://coin-images.coingecko.com/coins/images/29850/small/pepe-token.jpeg', color: '#529652', name: 'Pepe' },
  SHIB: { logoUrl: 'https://coin-images.coingecko.com/coins/images/11939/small/shiba.png', color: '#FFA409', name: 'Shiba Inu' },
  AAVE: { logoUrl: 'https://coin-images.coingecko.com/coins/images/12645/small/AAVE.png', color: '#B6509E', name: 'Aave' },
  MKR: { logoUrl: 'https://coin-images.coingecko.com/coins/images/1364/small/Mark_Maker.png', color: '#1AAB9B', name: 'Maker' },
  FET: { logoUrl: 'https://coin-images.coingecko.com/coins/images/5681/small/Fetch.jpg', color: '#1A1A2E', name: 'Fetch.ai' },
  RNDR: { logoUrl: 'https://coin-images.coingecko.com/coins/images/11636/small/rndr.png', color: '#000000', name: 'Render' },
};

const FALLBACK_STOCK_LOGOS: Record<string, AssetLogoInfo> = {
  // Index ETFs
  SPY: { logoUrl: 'https://logo.clearbit.com/ssga.com', color: '#00529B', name: 'SPDR S&P 500 ETF' },
  QQQ: { logoUrl: 'https://logo.clearbit.com/invesco.com', color: '#002D72', name: 'Invesco QQQ Trust' },
  DIA: { logoUrl: 'https://logo.clearbit.com/ssga.com', color: '#00529B', name: 'SPDR Dow Jones ETF' },
  // US Tech
  AAPL: { logoUrl: 'https://logo.clearbit.com/apple.com', color: '#000000', name: 'Apple Inc.' },
  MSFT: { logoUrl: 'https://logo.clearbit.com/microsoft.com', color: '#00A4EF', name: 'Microsoft' },
  NVDA: { logoUrl: 'https://logo.clearbit.com/nvidia.com', color: '#76B900', name: 'NVIDIA' },
  GOOGL: { logoUrl: 'https://logo.clearbit.com/google.com', color: '#4285F4', name: 'Alphabet' },
  AMZN: { logoUrl: 'https://logo.clearbit.com/amazon.com', color: '#FF9900', name: 'Amazon' },
  META: { logoUrl: 'https://logo.clearbit.com/meta.com', color: '#0668E1', name: 'Meta' },
  TSLA: { logoUrl: 'https://logo.clearbit.com/tesla.com', color: '#E31937', name: 'Tesla' },
  AMD: { logoUrl: 'https://logo.clearbit.com/amd.com', color: '#ED1C24', name: 'AMD' },
  // US Finance
  JPM: { logoUrl: 'https://logo.clearbit.com/jpmorganchase.com', color: '#0F3D66', name: 'JPMorgan Chase' },
  V: { logoUrl: 'https://logo.clearbit.com/visa.com', color: '#1A1F71', name: 'Visa' },
  MA: { logoUrl: 'https://logo.clearbit.com/mastercard.com', color: '#EB001B', name: 'Mastercard' },
  // BIST (Borsa Istanbul)
  THYAO: { logoUrl: 'https://logo.clearbit.com/turkishairlines.com', color: '#C8102E', name: 'Turkish Airlines' },
  GARAN: { logoUrl: 'https://logo.clearbit.com/garantibbva.com.tr', color: '#00854A', name: 'Garanti BBVA' },
  AKBNK: { logoUrl: 'https://logo.clearbit.com/akbank.com', color: '#E3000B', name: 'Akbank' },
  SISE: { logoUrl: 'https://logo.clearbit.com/sisecam.com.tr', color: '#004E9E', name: 'Sisecam' },
  EREGL: { logoUrl: 'https://logo.clearbit.com/erdemir.com.tr', color: '#003A70', name: 'Eregli Demir Celik' },
  KCHOL: { logoUrl: 'https://logo.clearbit.com/koc.com.tr', color: '#003DA5', name: 'Koc Holding' },
};

const FALLBACK_METAL_LOGOS: Record<string, AssetLogoInfo> = {
  GLD: { logoUrl: 'https://logo.clearbit.com/ssga.com', color: '#FFD700', name: 'SPDR Gold Shares' },
  SLV: { logoUrl: 'https://logo.clearbit.com/ishares.com', color: '#C0C0C0', name: 'iShares Silver Trust' },
  IAU: { logoUrl: 'https://logo.clearbit.com/ishares.com', color: '#D4AF37', name: 'iShares Gold Trust' },
  XAUUSD: { logoUrl: '', color: '#FFD700', name: 'Gold/USD' },
  XAGUSD: { logoUrl: '', color: '#C0C0C0', name: 'Silver/USD' },
};

const FALLBACK_BOND_LOGOS: Record<string, AssetLogoInfo> = {
  TLT: { logoUrl: 'https://logo.clearbit.com/ishares.com', color: '#1E3A8A', name: 'iShares 20+ Year Treasury' },
  BND: { logoUrl: 'https://logo.clearbit.com/vanguard.com', color: '#8B2332', name: 'Vanguard Total Bond Market' },
  IEF: { logoUrl: 'https://logo.clearbit.com/ishares.com', color: '#000000', name: 'iShares 7-10 Year Treasury' },
  SHY: { logoUrl: 'https://logo.clearbit.com/ishares.com', color: '#2563EB', name: 'iShares 1-3 Year Treasury' },
};

const FALLBACK_CACHE: LogoCache = {
  crypto: FALLBACK_CRYPTO_LOGOS,
  stocks: FALLBACK_STOCK_LOGOS,
  metals: FALLBACK_METAL_LOGOS,
  bonds: FALLBACK_BOND_LOGOS,
  version: 1,
  lastUpdated: new Date().toISOString(),
};

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
    // Use direct fetch for public API endpoint (no auth required)
    const baseUrl = typeof window !== 'undefined'
      ? window.location.origin
      : process.env['NEXT_PUBLIC_API_URL'] || '';

    // Try API URL first (production), fallback to same origin
    const apiUrl = process.env['NEXT_PUBLIC_API_URL'] || baseUrl;
    const response = await fetch(`${apiUrl}/api/asset-logos`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Add timeout
      signal: AbortSignal.timeout(10000),
    });

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
      // Use fallback cache when API fails (common logos still work)
      console.warn('[AssetLogosCache] API failed, using fallback logos');
      memoryCache = FALLBACK_CACHE;
      return FALLBACK_CACHE;
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
    // Use existing cache or fallback
    return memoryCache || FALLBACK_CACHE;
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
  const upper = symbol.toUpperCase().replace(/USDT$|USD$|BUSD$|USDC$/, '');

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
    // BIST (Borsa Istanbul)
    'THYAO', 'GARAN', 'AKBNK', 'SISE', 'EREGL', 'KCHOL', 'SAHOL', 'ISCTR',
    'YKBNK', 'HALKB', 'VAKBN', 'TOASO', 'TAVHL', 'TKFEN', 'TUPRS', 'BIMAS',
    'ASELS', 'PGSUS', 'ENKAI', 'ARCLK',
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
  // Strip common trading pair suffixes (SOLUSDT → SOL, BTCUSD → BTC)
  const upper = symbol.toUpperCase().replace(/USDT$|USD$|BUSD$|USDC$/, '');
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
  const cleanSymbol = symbol.toUpperCase().replace(/USDT$|USD$|BUSD$|USDC$/, '');
  const logoInfo = getAssetLogo(cleanSymbol, assetClass);

  if (logoInfo.logoUrl && logoInfo.logoUrl.length > 0) {
    return logoInfo.logoUrl;
  }

  return generateFallbackSvg(cleanSymbol, logoInfo.color);
}

/**
 * Get logo URL async (ensures cache is loaded first)
 */
export async function getLogoUrlAsync(symbol: string, assetClass?: AssetClass): Promise<string> {
  await loadLogosCache();
  return getLogoUrl(symbol, assetClass);
}
