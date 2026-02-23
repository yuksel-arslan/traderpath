/**
 * DefiLlama Provider
 *
 * Fetches DeFi and crypto sector data:
 * - Total DeFi TVL
 * - Chain TVL breakdown
 * - Protocol TVL
 * - Stablecoin market cap
 *
 * API Docs: https://defillama.com/docs/api
 */

import { SectorFlow, CryptoSector } from '../types';

const DEFILLAMA_BASE_URL = process.env['DEFILLAMA_API_URL'] || 'https://api.llama.fi';

interface DefiLlamaTvl {
  date: number;
  tvl: number;
}

interface DefiLlamaChain {
  gecko_id: string;
  tvl: number;
  tokenSymbol: string;
  cmcId: string;
  name: string;
  chainId: number;
}

interface DefiLlamaProtocol {
  id: string;
  name: string;
  symbol: string;
  category: string;
  tvl: number;
  change_1d: number;
  change_7d: number;
  chains: string[];
}

interface StablecoinData {
  totalCirculatingUSD: {
    peggedUSD: number;
  };
  change_7d: number;
}

/**
 * Get total DeFi TVL with historical data
 */
export async function getDeFiTvl(): Promise<{
  current: number;
  change7d: number;
  change30d: number;
  history: Array<{ date: Date; tvl: number }>;
}> {
  try {
    const response = await fetch(`${DEFILLAMA_BASE_URL}/v2/historicalChainTvl`, {
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`DefiLlama API error: ${response.status}`);
    }

    const data: DefiLlamaTvl[] = await response.json();

    if (!data.length) {
      return getFallbackTvlData();
    }

    // Sort by date descending
    const sorted = data.sort((a, b) => b.date - a.date);

    const current = sorted[0]?.tvl || 0;
    const sevenDaysAgo = sorted.find((d, i) => i >= 7)?.tvl || current;
    const thirtyDaysAgo = sorted.find((d, i) => i >= 30)?.tvl || current;

    const change7d = ((current - sevenDaysAgo) / sevenDaysAgo) * 100;
    const change30d = ((current - thirtyDaysAgo) / thirtyDaysAgo) * 100;

    // Get last 90 days of history
    const history = sorted.slice(0, 90).map(d => ({
      date: new Date(d.date * 1000),
      tvl: d.tvl / 1_000_000_000, // Convert to billions
    }));

    return {
      current: current / 1_000_000_000, // Billions
      change7d: parseFloat(change7d.toFixed(2)),
      change30d: parseFloat(change30d.toFixed(2)),
      history,
    };
  } catch (error) {
    console.error('[DefiLlama] Error fetching TVL:', error);
    return getFallbackTvlData();
  }
}

/**
 * Get TVL by chain (Layer 1 & Layer 2)
 */
export async function getChainTvl(): Promise<Array<{
  name: string;
  tvl: number;
  dominance: number;
}>> {
  try {
    const response = await fetch(`${DEFILLAMA_BASE_URL}/v2/chains`, {
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`DefiLlama API error: ${response.status}`);
    }

    const data: DefiLlamaChain[] = await response.json();

    // Calculate total TVL
    const totalTvl = data.reduce((sum, chain) => sum + (chain.tvl || 0), 0);

    // Get top 10 chains
    const topChains = data
      .filter(chain => chain.tvl > 0)
      .sort((a, b) => b.tvl - a.tvl)
      .slice(0, 10)
      .map(chain => ({
        name: chain.name,
        tvl: chain.tvl / 1_000_000_000, // Billions
        dominance: (chain.tvl / totalTvl) * 100,
      }));

    return topChains;
  } catch (error) {
    console.error('[DefiLlama] Error fetching chain TVL:', error);
    return [];
  }
}

/**
 * Get stablecoin market cap
 */
export async function getStablecoinMarketCap(): Promise<{
  total: number;
  change7d: number;
}> {
  try {
    const response = await fetch(`${DEFILLAMA_BASE_URL}/stablecoins`, {
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`DefiLlama API error: ${response.status}`);
    }

    const data = await response.json();

    // Sum all stablecoin market caps
    const stablecoins = data.peggedAssets || [];
    let total = 0;
    let weightedChange = 0;

    for (const stable of stablecoins) {
      const circulating = stable.circulating?.peggedUSD || 0;
      total += circulating;
      weightedChange += circulating * (stable.change_7d || 0);
    }

    const change7d = total > 0 ? weightedChange / total : 0;

    return {
      total: total / 1_000_000_000, // Billions
      change7d: parseFloat(change7d.toFixed(2)),
    };
  } catch (error) {
    console.error('[DefiLlama] Error fetching stablecoin data:', error);
    return { total: 130, change7d: 0 };
  }
}

/**
 * Get crypto sector flows (DeFi, Gaming, L2, etc.)
 */
export async function getCryptoSectors(): Promise<SectorFlow[]> {
  try {
    const response = await fetch(`${DEFILLAMA_BASE_URL}/protocols`, {
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new Error(`DefiLlama API error: ${response.status}`);
    }

    const protocols: DefiLlamaProtocol[] = await response.json();

    // Categorize protocols
    const categories: Record<string, { tvl: number; change7d: number; protocols: string[] }> = {
      DeFi: { tvl: 0, change7d: 0, protocols: [] },
      Layer2: { tvl: 0, change7d: 0, protocols: [] },
      Gaming: { tvl: 0, change7d: 0, protocols: [] },
      AI: { tvl: 0, change7d: 0, protocols: [] },
      Infrastructure: { tvl: 0, change7d: 0, protocols: [] },
      Meme: { tvl: 0, change7d: 0, protocols: [] },
    };

    // Map protocols to categories
    for (const protocol of protocols) {
      const category = mapProtocolCategory(protocol.category);
      if (category && categories[category]) {
        // Only use positive TVL — negative TVL (leveraged/debt protocols) causes
        // near-zero net TVL while change7d accumulates large values → absurd %.
        const protocolTvl = Math.max(0, protocol.tvl || 0);
        categories[category].tvl += protocolTvl;
        // Cap per-protocol change to ±200% to prevent outlier protocols from skewing
        const cappedChange = Math.max(-200, Math.min(200, protocol.change_7d || 0));
        categories[category].change7d += protocolTvl * cappedChange;
        if (categories[category].protocols.length < 5 && protocolTvl > 0) {
          categories[category].protocols.push(protocol.symbol || protocol.name);
        }
      }
    }

    // Calculate total TVL for dominance
    const totalTvl = Object.values(categories).reduce((sum, cat) => sum + cat.tvl, 0);

    // Convert to SectorFlow
    const sectors: SectorFlow[] = Object.entries(categories)
      .filter(([_, data]) => data.tvl > 0)
      .map(([name, data]) => {
        const raw = data.tvl > 0 ? data.change7d / data.tvl : 0;
        // Final safety clamp — NaN/Infinity from edge cases become 0
        const weightedChange = Number.isFinite(raw) ? Math.max(-200, Math.min(200, raw)) : 0;
        const trending: 'up' | 'down' | 'stable' = weightedChange > 3 ? 'up' : weightedChange < -3 ? 'down' : 'stable';
        return {
          name,
          flow7d: parseFloat(weightedChange.toFixed(2)),
          flow30d: 0, // Would need historical data
          dominance: parseFloat(((data.tvl / totalTvl) * 100).toFixed(2)),
          trending,
          topAssets: data.protocols,
        };
      })
      .sort((a, b) => b.dominance - a.dominance);

    return sectors;
  } catch (error) {
    console.error('[DefiLlama] Error fetching crypto sectors:', error);
    return getFallbackSectors();
  }
}

/**
 * Map DefiLlama category to our sector categories
 * Comprehensive mapping covering all major DeFi categories
 */
function mapProtocolCategory(category: string): CryptoSector | null {
  const mapping: Record<string, CryptoSector> = {
    // DeFi - Core financial primitives
    'Dexes': 'DeFi',
    'Lending': 'DeFi',
    'Derivatives': 'DeFi',
    'CDP': 'DeFi',
    'Yield': 'DeFi',
    'Yield Aggregator': 'DeFi',
    'Liquid Staking': 'DeFi',
    'Staking': 'DeFi',
    'Liquidity Manager': 'DeFi',
    'Options': 'DeFi',
    'Options Vault': 'DeFi',
    'Synthetics': 'DeFi',
    'Leveraged Farming': 'DeFi',
    'Insurance': 'DeFi',
    'Reserve Currency': 'DeFi',
    'Indexes': 'DeFi',
    'RWA': 'DeFi',                    // Real World Assets
    'Real World Assets': 'DeFi',
    'Algo-Stables': 'DeFi',
    'Decentralized Stablecoin': 'DeFi',
    'Farm': 'DeFi',

    // Infrastructure - Core blockchain infrastructure
    'Bridge': 'Infrastructure',
    'Cross Chain': 'Infrastructure',
    'Oracle': 'Infrastructure',
    'Launchpad': 'Infrastructure',
    'Chain': 'Infrastructure',
    'Privacy': 'Infrastructure',
    'Payments': 'Infrastructure',
    'SoFi': 'Infrastructure',         // Social Finance
    'Services': 'Infrastructure',
    'Restaking': 'Infrastructure',
    'Rollup': 'Infrastructure',

    // Gaming & NFTs
    'Gaming': 'Gaming',
    'NFT Marketplace': 'Gaming',
    'NFT Lending': 'Gaming',
    'Prediction Market': 'Gaming',
    'NFT': 'Gaming',
    'Metaverse': 'Gaming',
    'Gambling': 'Gaming',
    'SocialFi': 'Gaming',

    // AI - Artificial Intelligence tokens
    'AI': 'AI',
    'Artificial Intelligence': 'AI',
    'AI-Agent': 'AI',
    'Compute': 'AI',

    // Meme - Community tokens
    'Meme': 'Meme',
    'Memes': 'Meme',
    'Meme Coin': 'Meme',
  };

  // Case-insensitive matching
  const normalizedCategory = category.toLowerCase();
  for (const [key, value] of Object.entries(mapping)) {
    if (key.toLowerCase() === normalizedCategory) {
      return value;
    }
  }

  return null;
}

/**
 * Fallback TVL data
 */
function getFallbackTvlData() {
  return {
    current: 48.5, // Billions
    change7d: 2.3,
    change30d: 8.7,
    history: [],
  };
}

/**
 * Fallback sector data
 * Comprehensive crypto sectors with realistic flow estimates
 */
function getFallbackSectors(): SectorFlow[] {
  return [
    {
      name: 'DeFi',
      flow7d: 3.2,
      flow30d: 12.5,
      dominance: 55,
      trending: 'up',
      topAssets: ['AAVE', 'UNI', 'MKR', 'CRV', 'LDO'],
    },
    {
      name: 'Layer2',
      flow7d: 5.8,
      flow30d: 18.2,
      dominance: 18,
      trending: 'up',
      topAssets: ['ARB', 'OP', 'MATIC', 'IMX', 'STRK'],
    },
    {
      name: 'AI',
      flow7d: 8.5,
      flow30d: 25.3,
      dominance: 10,
      trending: 'up',
      topAssets: ['FET', 'AGIX', 'OCEAN', 'RNDR', 'TAO'],
    },
    {
      name: 'Gaming',
      flow7d: -1.2,
      flow30d: 4.5,
      dominance: 7,
      trending: 'stable',
      topAssets: ['AXS', 'SAND', 'MANA', 'GALA', 'IMX'],
    },
    {
      name: 'Meme',
      flow7d: 12.3,
      flow30d: 35.6,
      dominance: 6,
      trending: 'up',
      topAssets: ['DOGE', 'SHIB', 'PEPE', 'BONK', 'WIF'],
    },
    {
      name: 'Infrastructure',
      flow7d: 1.5,
      flow30d: 6.8,
      dominance: 4,
      trending: 'stable',
      topAssets: ['LINK', 'GRT', 'FIL', 'AR', 'ATOM'],
    },
  ];
}

/**
 * Get all DefiLlama data in one call
 */
export async function getAllDefiLlamaData() {
  const [tvl, chains, stablecoins, sectors] = await Promise.all([
    getDeFiTvl(),
    getChainTvl(),
    getStablecoinMarketCap(),
    getCryptoSectors(),
  ]);

  return {
    tvl,
    chains,
    stablecoins,
    sectors,
  };
}
