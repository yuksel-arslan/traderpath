/**
 * Source Allowlist - Trusted sources for web research
 *
 * Each source has a reliability score and is categorized by:
 * - Tier: official > tier_1_news > crypto_specialized > local_finance > other
 * - Asset class relevance
 * - Paywall status
 *
 * Sources NOT in this list are scored at 0.3 reliability (low trust).
 */

import { TrustedSource, SourceTier } from '../../types';
import type { AssetClass } from '../../../analysis/types/asset-metrics.types';

// ============================================================================
// TIER SCORING
// ============================================================================

export const TIER_SCORES: Record<SourceTier, number> = {
  official: 1.0,
  tier_1_news: 0.9,
  crypto_specialized: 0.8,
  local_finance: 0.8,
  other: 0.3,
};

// ============================================================================
// ALLOWLIST
// ============================================================================

export const SOURCE_ALLOWLIST: TrustedSource[] = [
  // ── OFFICIAL / GOVERNMENT ──────────────────────────────────────────
  { domain: 'fred.stlouisfed.org', name: 'FRED', category: 'government', tier: 'official', reliability: 98, assetClasses: ['stocks', 'bonds', 'metals'] },
  { domain: 'sec.gov', name: 'SEC', category: 'government', tier: 'official', reliability: 98, assetClasses: ['stocks', 'crypto'] },
  { domain: 'federalreserve.gov', name: 'Federal Reserve', category: 'government', tier: 'official', reliability: 98, assetClasses: ['bonds', 'stocks', 'metals'] },
  { domain: 'kap.org.tr', name: 'KAP', category: 'government', tier: 'official', reliability: 98, assetClasses: ['bist'], language: 'tr' },
  { domain: 'tcmb.gov.tr', name: 'TCMB', category: 'government', tier: 'official', reliability: 98, assetClasses: ['bist'], language: 'tr' },
  { domain: 'tuik.gov.tr', name: 'TurkStat', category: 'government', tier: 'official', reliability: 95, assetClasses: ['bist'], language: 'tr' },
  { domain: 'borsaistanbul.com', name: 'Borsa Istanbul', category: 'government', tier: 'official', reliability: 95, assetClasses: ['bist'], language: 'tr' },

  // ── TIER 1 NEWS ────────────────────────────────────────────────────
  { domain: 'reuters.com', name: 'Reuters', category: 'news', tier: 'tier_1_news', reliability: 92, assetClasses: ['stocks', 'bonds', 'metals', 'crypto'] },
  { domain: 'bloomberg.com', name: 'Bloomberg', category: 'news', tier: 'tier_1_news', reliability: 92, assetClasses: ['stocks', 'bonds', 'metals', 'crypto'], paywall: true },
  { domain: 'ft.com', name: 'Financial Times', category: 'news', tier: 'tier_1_news', reliability: 90, assetClasses: ['stocks', 'bonds', 'metals'], paywall: true },
  { domain: 'wsj.com', name: 'Wall Street Journal', category: 'news', tier: 'tier_1_news', reliability: 90, assetClasses: ['stocks', 'bonds'], paywall: true },
  { domain: 'cnbc.com', name: 'CNBC', category: 'news', tier: 'tier_1_news', reliability: 85, assetClasses: ['stocks', 'bonds', 'metals', 'crypto'] },

  // ── CRYPTO SPECIALIZED ─────────────────────────────────────────────
  { domain: 'coindesk.com', name: 'CoinDesk', category: 'news', tier: 'crypto_specialized', reliability: 82, assetClasses: ['crypto'] },
  { domain: 'cointelegraph.com', name: 'CoinTelegraph', category: 'news', tier: 'crypto_specialized', reliability: 78, assetClasses: ['crypto'] },
  { domain: 'theblock.co', name: 'The Block', category: 'news', tier: 'crypto_specialized', reliability: 82, assetClasses: ['crypto'] },
  { domain: 'decrypt.co', name: 'Decrypt', category: 'news', tier: 'crypto_specialized', reliability: 75, assetClasses: ['crypto'] },
  { domain: 'glassnode.com', name: 'Glassnode', category: 'data', tier: 'crypto_specialized', reliability: 88, assetClasses: ['crypto'] },
  { domain: 'cryptoquant.com', name: 'CryptoQuant', category: 'data', tier: 'crypto_specialized', reliability: 85, assetClasses: ['crypto'] },
  { domain: 'defillama.com', name: 'DefiLlama', category: 'data', tier: 'crypto_specialized', reliability: 88, assetClasses: ['crypto'] },
  { domain: 'coingecko.com', name: 'CoinGecko', category: 'data', tier: 'crypto_specialized', reliability: 85, assetClasses: ['crypto'] },
  { domain: 'cryptopanic.com', name: 'CryptoPanic', category: 'news', tier: 'crypto_specialized', reliability: 75, assetClasses: ['crypto'] },

  // ── DATA PROVIDERS ─────────────────────────────────────────────────
  { domain: 'binance.com', name: 'Binance', category: 'exchange', tier: 'crypto_specialized', reliability: 90, assetClasses: ['crypto'] },
  { domain: 'finance.yahoo.com', name: 'Yahoo Finance', category: 'data', tier: 'tier_1_news', reliability: 85, assetClasses: ['stocks', 'bonds', 'metals', 'bist'] },
  { domain: 'investing.com', name: 'Investing.com', category: 'data', tier: 'local_finance', reliability: 78, assetClasses: ['stocks', 'bonds', 'metals', 'crypto', 'bist'] },
  { domain: 'tradingview.com', name: 'TradingView', category: 'research', tier: 'crypto_specialized', reliability: 72, assetClasses: ['crypto', 'stocks', 'metals', 'bonds', 'bist'] },
  { domain: 'worldgovernmentbonds.com', name: 'World Gov Bonds', category: 'data', tier: 'crypto_specialized', reliability: 80, assetClasses: ['bonds'] },

  // ── FX / METALS SPECIALIZED ────────────────────────────────────────
  { domain: 'forexlive.com', name: 'ForexLive', category: 'news', tier: 'crypto_specialized', reliability: 78, assetClasses: ['metals', 'bonds'] },
  { domain: 'dailyfx.com', name: 'DailyFX', category: 'research', tier: 'crypto_specialized', reliability: 76, assetClasses: ['metals', 'bonds', 'stocks'] },
  { domain: 'fxstreet.com', name: 'FXStreet', category: 'research', tier: 'crypto_specialized', reliability: 75, assetClasses: ['metals', 'bonds'] },
  { domain: 'kitco.com', name: 'Kitco', category: 'news', tier: 'crypto_specialized', reliability: 80, assetClasses: ['metals'] },

  // ── LOCAL FINANCE (TR) ─────────────────────────────────────────────
  { domain: 'bloomberght.com', name: 'Bloomberg HT', category: 'news', tier: 'local_finance', reliability: 82, assetClasses: ['bist', 'metals'], language: 'tr' },
  { domain: 'ekonomim.com', name: 'Ekonomim', category: 'news', tier: 'local_finance', reliability: 75, assetClasses: ['bist'], language: 'tr' },
  { domain: 'bigpara.hurriyet.com.tr', name: 'BigPara', category: 'data', tier: 'local_finance', reliability: 72, assetClasses: ['bist'], language: 'tr' },
  { domain: 'foreks.com', name: 'Foreks', category: 'data', tier: 'local_finance', reliability: 78, assetClasses: ['bist'], language: 'tr' },
];

// ============================================================================
// BLOCKED DOMAINS (spam, SEO, unreliable)
// ============================================================================

export const BLOCKED_DOMAINS: string[] = [
  'medium.com',           // User-generated, unverified
  'seekingalpha.com',     // Paywalled + biased
  'motleyfool.com',       // Clickbait
  'benzinga.com',         // Sponsored content heavy
  'ambcrypto.com',        // Low quality
  'u.today',              // Low quality
  'bitcoinist.com',       // Low quality
  'newsbtc.com',          // Low quality
  'thecryptobasic.com',   // Low quality
  'cryptonews.com',       // Affiliate heavy
];

// ============================================================================
// LOOKUP HELPERS
// ============================================================================

const _allowlistMap = new Map<string, TrustedSource>();
SOURCE_ALLOWLIST.forEach(s => _allowlistMap.set(s.domain, s));

const _blockedSet = new Set(BLOCKED_DOMAINS);

/**
 * Look up a domain in the allowlist
 * Returns the source if found, null otherwise
 */
export function lookupSource(url: string): TrustedSource | null {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    // Direct match
    if (_allowlistMap.has(hostname)) return _allowlistMap.get(hostname)!;
    // Subdomain match (e.g., pro-api.coingecko.com → coingecko.com)
    const parts = hostname.split('.');
    if (parts.length > 2) {
      const rootDomain = parts.slice(-2).join('.');
      if (_allowlistMap.has(rootDomain)) return _allowlistMap.get(rootDomain)!;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Check if a domain is blocked
 */
export function isBlockedDomain(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    if (_blockedSet.has(hostname)) return true;
    const parts = hostname.split('.');
    if (parts.length > 2) {
      const rootDomain = parts.slice(-2).join('.');
      if (_blockedSet.has(rootDomain)) return true;
    }
    return false;
  } catch {
    return true; // Block unparseable URLs
  }
}

/**
 * Get sources relevant to a specific asset class
 */
export function getSourcesForAssetClass(assetClass: AssetClass): TrustedSource[] {
  return SOURCE_ALLOWLIST.filter(s => s.assetClasses.includes(assetClass));
}

/**
 * Get reliability score for a URL
 * Returns the allowlist reliability if found, TIER_SCORES.other if unknown
 */
export function getReliabilityScore(url: string): number {
  if (isBlockedDomain(url)) return 0;
  const source = lookupSource(url);
  return source ? source.reliability : TIER_SCORES.other * 100;
}
