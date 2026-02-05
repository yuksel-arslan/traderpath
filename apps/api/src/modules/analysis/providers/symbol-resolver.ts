/**
 * Symbol Resolver & Asset Class Detector
 *
 * Determines the asset class from a symbol and normalizes it
 * for the appropriate data provider.
 */

import {
  AssetClass,
  ResolvedSymbol,
  SUPPORTED_SYMBOLS,
} from './types';

// Common crypto suffixes to strip
const CRYPTO_SUFFIXES = ['USDT', 'BUSD', 'USD', 'PERP', 'USDC', 'EUR', 'GBP'];

// Metals spot symbols
const METALS_SPOT = ['XAUUSD', 'XAGUSD', 'XPTUSD', 'XPDUSD'];

// Treasury yield symbols
const TREASURY_YIELDS = ['US10Y', 'US2Y', 'US30Y', 'US5Y', 'US3M', 'US1Y'];

/**
 * Detect the asset class for a given symbol
 */
export function detectAssetClass(symbol: string): AssetClass {
  const upper = symbol.toUpperCase().trim();

  // Check BIST first (ends with .IS suffix)
  if (upper.endsWith('.IS')) {
    return 'bist';
  }

  // Check BIST symbols (without suffix too, for convenience)
  const bistSymbols = SUPPORTED_SYMBOLS.bist.map(s => s.toUpperCase());
  if (bistSymbols.includes(upper) || bistSymbols.includes(`${upper}.IS`)) {
    return 'bist';
  }

  // Check metals (specific patterns)
  if (METALS_SPOT.includes(upper) ||
      upper.startsWith('XAU') ||
      upper.startsWith('XAG') ||
      upper.startsWith('XPT') ||
      upper.startsWith('XPD')) {
    return 'metals';
  }

  // Check metals ETFs
  const metalSymbols = SUPPORTED_SYMBOLS.metals.map(s => s.toUpperCase());
  if (metalSymbols.includes(upper)) {
    return 'metals';
  }

  // Check treasury yields
  if (TREASURY_YIELDS.includes(upper)) {
    return 'bonds';
  }

  // Check bond ETFs
  const bondSymbols = SUPPORTED_SYMBOLS.bonds.map(s => s.toUpperCase());
  if (bondSymbols.includes(upper)) {
    return 'bonds';
  }

  // Check stocks
  const stockSymbols = SUPPORTED_SYMBOLS.stocks.map(s => s.toUpperCase());
  if (stockSymbols.includes(upper)) {
    return 'stocks';
  }

  // Check crypto (with suffix stripping)
  let cryptoBase = upper;
  for (const suffix of CRYPTO_SUFFIXES) {
    if (upper.endsWith(suffix)) {
      cryptoBase = upper.slice(0, -suffix.length);
      break;
    }
  }

  const cryptoSymbols = SUPPORTED_SYMBOLS.crypto.map(s => s.toUpperCase());
  if (cryptoSymbols.includes(cryptoBase) || cryptoSymbols.includes(upper)) {
    return 'crypto';
  }

  // Default heuristics
  // 1-4 letter symbols with no numbers are likely stocks
  if (/^[A-Z]{1,5}$/.test(upper) && !cryptoSymbols.includes(upper)) {
    // Check if it looks like a ticker
    return 'stocks';
  }

  // Anything else, default to crypto (most common use case)
  return 'crypto';
}

/**
 * Resolve a symbol to its canonical form for the appropriate provider
 */
export function resolveSymbol(symbol: string): ResolvedSymbol {
  const upper = symbol.toUpperCase().trim();
  const assetClass = detectAssetClass(upper);

  switch (assetClass) {
    case 'crypto':
      return resolveCryptoSymbol(upper);
    case 'stocks':
      return resolveStockSymbol(upper);
    case 'bonds':
      return resolveBondSymbol(upper);
    case 'metals':
      return resolveMetalsSymbol(upper);
    case 'bist':
      return resolveBistSymbol(upper);
    default:
      return {
        original: symbol,
        normalized: upper,
        assetClass: 'crypto',
        displayName: upper,
      };
  }
}

/**
 * Resolve crypto symbol (strip suffixes, add USDT)
 */
function resolveCryptoSymbol(symbol: string): ResolvedSymbol {
  let base = symbol;
  let quote = 'USDT';

  // Strip known suffixes
  for (const suffix of CRYPTO_SUFFIXES) {
    if (symbol.endsWith(suffix)) {
      base = symbol.slice(0, -suffix.length);
      quote = suffix === 'PERP' ? 'USDT' : suffix;
      break;
    }
  }

  return {
    original: symbol,
    normalized: `${base}${quote}`,
    assetClass: 'crypto',
    exchange: 'binance',
    baseCurrency: base,
    quoteCurrency: quote,
    displayName: base,
  };
}

/**
 * Resolve stock symbol
 */
function resolveStockSymbol(symbol: string): ResolvedSymbol {
  // Stocks don't need suffix handling
  return {
    original: symbol,
    normalized: symbol,
    assetClass: 'stocks',
    exchange: 'nasdaq', // Could be enhanced to detect NYSE, etc.
    displayName: symbol,
  };
}

/**
 * Resolve bond/treasury symbol
 */
function resolveBondSymbol(symbol: string): ResolvedSymbol {
  // Treasury yields need special handling
  if (TREASURY_YIELDS.includes(symbol)) {
    return {
      original: symbol,
      normalized: symbol,
      assetClass: 'bonds',
      displayName: formatTreasuryName(symbol),
    };
  }

  // Bond ETFs
  return {
    original: symbol,
    normalized: symbol,
    assetClass: 'bonds',
    exchange: 'nasdaq',
    displayName: symbol,
  };
}

/**
 * Resolve metals symbol
 */
function resolveMetalsSymbol(symbol: string): ResolvedSymbol {
  // Spot metals
  if (symbol.startsWith('XAU')) {
    return {
      original: symbol,
      normalized: 'XAUUSD',
      assetClass: 'metals',
      baseCurrency: 'XAU',
      quoteCurrency: 'USD',
      displayName: 'Gold',
    };
  }

  if (symbol.startsWith('XAG')) {
    return {
      original: symbol,
      normalized: 'XAGUSD',
      assetClass: 'metals',
      baseCurrency: 'XAG',
      quoteCurrency: 'USD',
      displayName: 'Silver',
    };
  }

  // ETFs
  const metalNames: Record<string, string> = {
    'GLD': 'Gold ETF',
    'SLV': 'Silver ETF',
    'IAU': 'iShares Gold',
    'PSLV': 'Physical Silver',
    'PPLT': 'Platinum ETF',
    'PALL': 'Palladium ETF',
    'GDX': 'Gold Miners',
    'GDXJ': 'Junior Gold Miners',
    'SIL': 'Silver Miners',
  };

  return {
    original: symbol,
    normalized: symbol,
    assetClass: 'metals',
    displayName: metalNames[symbol] || symbol,
  };
}

/**
 * Resolve BIST (Borsa İstanbul) symbol
 */
function resolveBistSymbol(symbol: string): ResolvedSymbol {
  // Ensure .IS suffix for Yahoo Finance
  const normalized = symbol.endsWith('.IS') ? symbol : `${symbol}.IS`;
  const base = symbol.replace('.IS', '');

  // BIST company names (Turkish)
  const bistNames: Record<string, string> = {
    // Index
    'XU100': 'BIST 100 Endeks',
    // Banking
    'GARAN': 'Garanti BBVA',
    'AKBNK': 'Akbank',
    'YKBNK': 'Yapı Kredi',
    'ISCTR': 'İş Bankası',
    'HALKB': 'Halkbank',
    'VAKBN': 'Vakıfbank',
    'TSKB': 'TSKB',
    // Holding
    'KCHOL': 'Koç Holding',
    'SAHOL': 'Sabancı Holding',
    'TAVHL': 'TAV Havalimanları',
    'TKFEN': 'Tekfen Holding',
    'DOHOL': 'Doğan Holding',
    // Industrial
    'SISE': 'Şişecam',
    'TOASO': 'Tofaş Oto',
    'FROTO': 'Ford Otosan',
    'EREGL': 'Ereğli Demir Çelik',
    'KRDMD': 'Kardemir',
    'TUPRS': 'Tüpraş',
    'PETKM': 'Petkim',
    // Aviation
    'THYAO': 'Türk Hava Yolları',
    'PGSUS': 'Pegasus',
    // Telecom
    'TCELL': 'Turkcell',
    'TTKOM': 'Türk Telekom',
    // Retail
    'BIMAS': 'BİM Mağazalar',
    'MGROS': 'Migros',
    'SOKM': 'Şok Market',
    // Construction
    'ENKAI': 'Enka İnşaat',
    'EKGYO': 'Emlak Konut GYO',
    // Technology
    'ASELS': 'Aselsan',
    'LOGO': 'Logo Yazılım',
    // Other
    'ARCLK': 'Arçelik',
    'VESTL': 'Vestel',
    'KOZAL': 'Koza Altın',
    'KOZAA': 'Koza Anadolu',
  };

  return {
    original: symbol,
    normalized: normalized,
    assetClass: 'bist',
    exchange: 'bist',
    displayName: bistNames[base] || base,
  };
}

/**
 * Format treasury symbol to readable name
 */
function formatTreasuryName(symbol: string): string {
  const names: Record<string, string> = {
    'US10Y': '10-Year Treasury',
    'US2Y': '2-Year Treasury',
    'US30Y': '30-Year Treasury',
    'US5Y': '5-Year Treasury',
    'US3M': '3-Month Treasury',
    'US1Y': '1-Year Treasury',
  };
  return names[symbol] || symbol;
}

/**
 * Get all supported symbols for an asset class
 */
export function getSupportedSymbols(assetClass: AssetClass): string[] {
  return SUPPORTED_SYMBOLS[assetClass] || [];
}

/**
 * Check if a symbol is supported
 */
export function isSymbolSupported(symbol: string): boolean {
  const upper = symbol.toUpperCase().trim();
  const assetClass = detectAssetClass(upper);
  const supported = getSupportedSymbols(assetClass);

  // For crypto, also check base symbol
  if (assetClass === 'crypto') {
    let base = upper;
    for (const suffix of CRYPTO_SUFFIXES) {
      if (upper.endsWith(suffix)) {
        base = upper.slice(0, -suffix.length);
        break;
      }
    }
    return supported.includes(base) || supported.includes(upper);
  }

  return supported.includes(upper);
}

/**
 * Search symbols across all asset classes
 */
export function searchSymbols(query: string, limit = 20): ResolvedSymbol[] {
  const upper = query.toUpperCase().trim();
  const results: ResolvedSymbol[] = [];

  for (const [assetClass, symbols] of Object.entries(SUPPORTED_SYMBOLS)) {
    for (const symbol of symbols) {
      if (symbol.toUpperCase().includes(upper)) {
        results.push(resolveSymbol(symbol));
        if (results.length >= limit) break;
      }
    }
    if (results.length >= limit) break;
  }

  return results;
}
