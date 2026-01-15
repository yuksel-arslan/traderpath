/**
 * TraderPath Tokenomics Analysis Service
 * ======================================
 *
 * Analyzes the financial structure and token economics of cryptocurrencies.
 * Data sourced from CoinGecko API.
 *
 * Key Metrics:
 * - Supply metrics (total, circulating, max)
 * - Distribution analysis
 * - Market cap vs FDV ratio
 * - Unlock schedules (when available)
 * - Whale concentration
 * - Staking metrics
 */

// Note: CoinGecko API can be used without an API key for basic access
// If you have a Pro API key, set COINGECKO_API_KEY in environment variables

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface TokenomicsData {
  symbol: string;
  name: string;

  // Supply Metrics
  supply: {
    total: number | null;
    circulating: number;
    maxSupply: number | null;
    circulatingPercent: number; // circulating / total
    inflationRisk: 'low' | 'medium' | 'high';
  };

  // Market Metrics
  market: {
    marketCap: number;
    fullyDilutedValuation: number | null;
    mcapFdvRatio: number; // marketCap / FDV (1.0 = fully diluted)
    dilutionRisk: 'low' | 'medium' | 'high';
    volume24h: number;
    volumeToMcapRatio: number;
    liquidityHealth: 'excellent' | 'good' | 'moderate' | 'poor';
  };

  // Whale Concentration
  whaleConcentration: {
    top10HoldersPercent: number | null;
    top100HoldersPercent: number | null;
    concentrationRisk: 'low' | 'medium' | 'high';
    estimatedWhaleCount: number;
  };

  // Token Distribution (when available)
  distribution: {
    teamPercent: number | null;
    foundationPercent: number | null;
    publicPercent: number | null;
    stakingPercent: number | null;
    burnedPercent: number | null;
    distributionHealth: 'excellent' | 'good' | 'moderate' | 'poor' | 'unknown';
  };

  // Unlock Schedule (simplified)
  unlocks: {
    hasUpcomingUnlocks: boolean;
    nextUnlockDate: string | null;
    nextUnlockPercent: number | null;
    unlockRisk: 'low' | 'medium' | 'high' | 'unknown';
  };

  // Overall Assessment
  assessment: {
    overallScore: number; // 0-100
    riskLevel: 'low' | 'medium' | 'high';
    strengths: string[];
    weaknesses: string[];
    recommendation: string;
  };

  // Metadata
  lastUpdated: string;
  dataSource: string;
}

export interface TokenomicsRiskFactors {
  inflationRisk: number; // 0-100
  dilutionRisk: number;
  concentrationRisk: number;
  unlockRisk: number;
  liquidityRisk: number;
  overallRisk: number;
}

// ============================================================================
// COINGECKO API HELPERS
// ============================================================================

const COINGECKO_BASE_URL = 'https://api.coingecko.com/api/v3';
const COINGECKO_PRO_URL = 'https://pro-api.coingecko.com/api/v3';

// Symbol to CoinGecko ID mapping for common coins
const SYMBOL_TO_ID: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  BNB: 'binancecoin',
  XRP: 'ripple',
  ADA: 'cardano',
  DOGE: 'dogecoin',
  AVAX: 'avalanche-2',
  DOT: 'polkadot',
  MATIC: 'matic-network',
  LINK: 'chainlink',
  UNI: 'uniswap',
  ATOM: 'cosmos',
  LTC: 'litecoin',
  FIL: 'filecoin',
  APT: 'aptos',
  ARB: 'arbitrum',
  OP: 'optimism',
  NEAR: 'near',
  INJ: 'injective-protocol',
  SUI: 'sui',
  SEI: 'sei-network',
  TIA: 'celestia',
  PEPE: 'pepe',
  SHIB: 'shiba-inu',
  WIF: 'dogwifcoin',
  BONK: 'bonk',
  FLOKI: 'floki',
};

async function fetchCoinGeckoData(coinId: string): Promise<{
  market_data: {
    current_price: { usd: number };
    market_cap: { usd: number };
    fully_diluted_valuation: { usd: number } | null;
    total_volume: { usd: number };
    circulating_supply: number;
    total_supply: number | null;
    max_supply: number | null;
  };
  name: string;
  symbol: string;
} | null> {
  // Use environment variable for API key (optional - public API works without key)
  const apiKey = process.env.COINGECKO_API_KEY;
  const baseUrl = apiKey ? COINGECKO_PRO_URL : COINGECKO_BASE_URL;

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (apiKey) {
      headers['x-cg-pro-api-key'] = apiKey;
    }

    const response = await fetch(
      `${baseUrl}/coins/${coinId}?localization=false&tickers=false&community_data=false&developer_data=false`,
      { headers }
    );

    if (!response.ok) {
      console.warn(`CoinGecko API error for ${coinId}: ${response.status}`);
      return null;
    }

    return response.json();
  } catch (error) {
    console.error(`Failed to fetch CoinGecko data for ${coinId}:`, error);
    return null;
  }
}

// ============================================================================
// TOKENOMICS ANALYSIS FUNCTIONS
// ============================================================================

function analyzeSupply(data: {
  circulating: number;
  total: number | null;
  max: number | null;
}): TokenomicsData['supply'] {
  const { circulating, total, max } = data;

  let circulatingPercent = 100;
  if (total && total > 0) {
    circulatingPercent = (circulating / total) * 100;
  } else if (max && max > 0) {
    circulatingPercent = (circulating / max) * 100;
  }

  // Inflation risk based on how much supply is yet to be released
  let inflationRisk: 'low' | 'medium' | 'high' = 'low';
  if (circulatingPercent < 50) {
    inflationRisk = 'high'; // More than 50% not yet released
  } else if (circulatingPercent < 75) {
    inflationRisk = 'medium';
  }

  return {
    total,
    circulating,
    maxSupply: max,
    circulatingPercent: Math.round(circulatingPercent * 100) / 100,
    inflationRisk,
  };
}

function analyzeMarket(data: {
  marketCap: number;
  fdv: number | null;
  volume24h: number;
}): TokenomicsData['market'] {
  const { marketCap, fdv, volume24h } = data;

  // MC/FDV ratio - lower is worse (more dilution ahead)
  let mcapFdvRatio = 1;
  if (fdv && fdv > 0) {
    mcapFdvRatio = marketCap / fdv;
  }

  // Dilution risk based on MC/FDV
  let dilutionRisk: 'low' | 'medium' | 'high' = 'low';
  if (mcapFdvRatio < 0.3) {
    dilutionRisk = 'high'; // Less than 30% tokens released
  } else if (mcapFdvRatio < 0.6) {
    dilutionRisk = 'medium';
  }

  // Volume to market cap ratio
  const volumeToMcapRatio = marketCap > 0 ? (volume24h / marketCap) * 100 : 0;

  // Liquidity health
  let liquidityHealth: 'excellent' | 'good' | 'moderate' | 'poor' = 'moderate';
  if (volumeToMcapRatio > 20) {
    liquidityHealth = 'excellent';
  } else if (volumeToMcapRatio > 10) {
    liquidityHealth = 'good';
  } else if (volumeToMcapRatio < 3) {
    liquidityHealth = 'poor';
  }

  return {
    marketCap,
    fullyDilutedValuation: fdv,
    mcapFdvRatio: Math.round(mcapFdvRatio * 1000) / 1000,
    dilutionRisk,
    volume24h,
    volumeToMcapRatio: Math.round(volumeToMcapRatio * 100) / 100,
    liquidityHealth,
  };
}

function estimateWhaleConcentration(
  marketCap: number,
  volume24h: number
): TokenomicsData['whaleConcentration'] {
  // This is an estimation based on market cap and volume
  // Real data would require on-chain analysis

  let concentrationRisk: 'low' | 'medium' | 'high' = 'medium';
  let estimatedWhaleCount = 100;
  let top10Percent = 30;
  let top100Percent = 50;

  // Large cap coins tend to have better distribution
  if (marketCap > 10_000_000_000) {
    // > $10B
    concentrationRisk = 'low';
    estimatedWhaleCount = 1000;
    top10Percent = 15;
    top100Percent = 35;
  } else if (marketCap > 1_000_000_000) {
    // > $1B
    concentrationRisk = 'low';
    estimatedWhaleCount = 500;
    top10Percent = 20;
    top100Percent = 40;
  } else if (marketCap < 100_000_000) {
    // < $100M
    concentrationRisk = 'high';
    estimatedWhaleCount = 50;
    top10Percent = 50;
    top100Percent = 70;
  }

  // Low volume relative to mcap suggests concentrated holdings
  const volumeRatio = marketCap > 0 ? volume24h / marketCap : 0;
  if (volumeRatio < 0.02) {
    concentrationRisk = 'high';
    top10Percent = Math.min(top10Percent + 15, 70);
  }

  return {
    top10HoldersPercent: top10Percent,
    top100HoldersPercent: top100Percent,
    concentrationRisk,
    estimatedWhaleCount,
  };
}

function estimateDistribution(
  symbol: string,
  circulatingPercent: number
): TokenomicsData['distribution'] {
  // Known distributions for major coins
  const knownDistributions: Record<string, Partial<TokenomicsData['distribution']>> = {
    BTC: {
      teamPercent: 0,
      foundationPercent: 0,
      publicPercent: 100,
      stakingPercent: 0,
      burnedPercent: 0,
      distributionHealth: 'excellent',
    },
    ETH: {
      teamPercent: 15,
      foundationPercent: 5,
      publicPercent: 80,
      stakingPercent: 27, // Approximate staking ratio
      burnedPercent: 3,
      distributionHealth: 'excellent',
    },
    SOL: {
      teamPercent: 12.5,
      foundationPercent: 10.5,
      publicPercent: 77,
      stakingPercent: 70,
      burnedPercent: 0,
      distributionHealth: 'good',
    },
    BNB: {
      teamPercent: 40,
      foundationPercent: 10,
      publicPercent: 50,
      stakingPercent: 0,
      burnedPercent: 50,
      distributionHealth: 'good',
    },
  };

  const known = knownDistributions[symbol.toUpperCase()];
  if (known) {
    return {
      teamPercent: known.teamPercent ?? null,
      foundationPercent: known.foundationPercent ?? null,
      publicPercent: known.publicPercent ?? null,
      stakingPercent: known.stakingPercent ?? null,
      burnedPercent: known.burnedPercent ?? null,
      distributionHealth: known.distributionHealth ?? 'unknown',
    };
  }

  // Estimate based on circulating percent
  let distributionHealth: 'excellent' | 'good' | 'moderate' | 'poor' | 'unknown' = 'unknown';
  if (circulatingPercent >= 80) {
    distributionHealth = 'good';
  } else if (circulatingPercent >= 50) {
    distributionHealth = 'moderate';
  } else {
    distributionHealth = 'poor';
  }

  return {
    teamPercent: null,
    foundationPercent: null,
    publicPercent: null,
    stakingPercent: null,
    burnedPercent: null,
    distributionHealth,
  };
}

function calculateOverallAssessment(
  supply: TokenomicsData['supply'],
  market: TokenomicsData['market'],
  whales: TokenomicsData['whaleConcentration'],
  distribution: TokenomicsData['distribution']
): TokenomicsData['assessment'] {
  let score = 50; // Start at neutral
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  // Supply analysis (25 points)
  if (supply.inflationRisk === 'low') {
    score += 15;
    strengths.push('Most tokens already in circulation');
  } else if (supply.inflationRisk === 'high') {
    score -= 15;
    weaknesses.push('High inflation risk - many tokens yet to be released');
  }

  if (supply.circulatingPercent >= 80) {
    score += 10;
    strengths.push(`${supply.circulatingPercent.toFixed(0)}% tokens circulating`);
  } else if (supply.circulatingPercent < 50) {
    score -= 10;
    weaknesses.push(`Only ${supply.circulatingPercent.toFixed(0)}% tokens circulating`);
  }

  // Market analysis (25 points)
  if (market.dilutionRisk === 'low') {
    score += 10;
    strengths.push('Low dilution risk');
  } else if (market.dilutionRisk === 'high') {
    score -= 15;
    weaknesses.push('High dilution risk - MC/FDV ratio is low');
  }

  if (market.liquidityHealth === 'excellent' || market.liquidityHealth === 'good') {
    score += 10;
    strengths.push('Good trading liquidity');
  } else if (market.liquidityHealth === 'poor') {
    score -= 10;
    weaknesses.push('Low trading liquidity');
  }

  // Whale concentration (25 points)
  if (whales.concentrationRisk === 'low') {
    score += 15;
    strengths.push('Well-distributed token holdings');
  } else if (whales.concentrationRisk === 'high') {
    score -= 15;
    weaknesses.push('High whale concentration risk');
  }

  // Distribution (25 points)
  if (distribution.distributionHealth === 'excellent') {
    score += 15;
    strengths.push('Excellent token distribution');
  } else if (distribution.distributionHealth === 'good') {
    score += 10;
    strengths.push('Good token distribution');
  } else if (distribution.distributionHealth === 'poor') {
    score -= 10;
    weaknesses.push('Poor token distribution');
  }

  // Clamp score
  score = Math.max(0, Math.min(100, score));

  // Risk level
  let riskLevel: 'low' | 'medium' | 'high' = 'medium';
  if (score >= 70) {
    riskLevel = 'low';
  } else if (score < 40) {
    riskLevel = 'high';
  }

  // Recommendation
  let recommendation = '';
  if (score >= 70) {
    recommendation = 'Strong tokenomics fundamentals. Suitable for longer-term positions.';
  } else if (score >= 50) {
    recommendation = 'Moderate tokenomics. Be aware of dilution and concentration risks.';
  } else {
    recommendation = 'Weak tokenomics. High risk of dilution or manipulation. Consider shorter timeframes.';
  }

  return {
    overallScore: score,
    riskLevel,
    strengths,
    weaknesses,
    recommendation,
  };
}

// ============================================================================
// MAIN EXPORT FUNCTION
// ============================================================================

export async function analyzeTokenomics(symbol: string): Promise<TokenomicsData | null> {
  // Get CoinGecko ID
  const coinId = SYMBOL_TO_ID[symbol.toUpperCase()];
  if (!coinId) {
    console.warn(`Unknown symbol for tokenomics analysis: ${symbol}`);
    // Return minimal data for unknown symbols
    return createMinimalTokenomicsData(symbol);
  }

  // Fetch data from CoinGecko
  const data = await fetchCoinGeckoData(coinId);
  if (!data) {
    return createMinimalTokenomicsData(symbol);
  }

  const { market_data } = data;

  // Analyze supply
  const supply = analyzeSupply({
    circulating: market_data.circulating_supply,
    total: market_data.total_supply,
    max: market_data.max_supply,
  });

  // Analyze market
  const market = analyzeMarket({
    marketCap: market_data.market_cap.usd,
    fdv: market_data.fully_diluted_valuation?.usd || null,
    volume24h: market_data.total_volume.usd,
  });

  // Estimate whale concentration
  const whaleConcentration = estimateWhaleConcentration(
    market_data.market_cap.usd,
    market_data.total_volume.usd
  );

  // Estimate distribution
  const distribution = estimateDistribution(symbol, supply.circulatingPercent);

  // Unlock schedule (would need separate API for real data)
  const unlocks: TokenomicsData['unlocks'] = {
    hasUpcomingUnlocks: supply.circulatingPercent < 90,
    nextUnlockDate: null,
    nextUnlockPercent: null,
    unlockRisk: supply.circulatingPercent < 50 ? 'high' : supply.circulatingPercent < 75 ? 'medium' : 'low',
  };

  // Overall assessment
  const assessment = calculateOverallAssessment(supply, market, whaleConcentration, distribution);

  return {
    symbol: symbol.toUpperCase(),
    name: data.name,
    supply,
    market,
    whaleConcentration,
    distribution,
    unlocks,
    assessment,
    lastUpdated: new Date().toISOString(),
    dataSource: 'CoinGecko',
  };
}

function createMinimalTokenomicsData(symbol: string): TokenomicsData {
  return {
    symbol: symbol.toUpperCase(),
    name: symbol,
    supply: {
      total: null,
      circulating: 0,
      maxSupply: null,
      circulatingPercent: 0,
      inflationRisk: 'medium',
    },
    market: {
      marketCap: 0,
      fullyDilutedValuation: null,
      mcapFdvRatio: 1,
      dilutionRisk: 'medium',
      volume24h: 0,
      volumeToMcapRatio: 0,
      liquidityHealth: 'moderate',
    },
    whaleConcentration: {
      top10HoldersPercent: null,
      top100HoldersPercent: null,
      concentrationRisk: 'medium',
      estimatedWhaleCount: 0,
    },
    distribution: {
      teamPercent: null,
      foundationPercent: null,
      publicPercent: null,
      stakingPercent: null,
      burnedPercent: null,
      distributionHealth: 'unknown',
    },
    unlocks: {
      hasUpcomingUnlocks: false,
      nextUnlockDate: null,
      nextUnlockPercent: null,
      unlockRisk: 'unknown',
    },
    assessment: {
      overallScore: 50,
      riskLevel: 'medium',
      strengths: [],
      weaknesses: ['Tokenomics data not available'],
      recommendation: 'Limited tokenomics data. Exercise caution.',
    },
    lastUpdated: new Date().toISOString(),
    dataSource: 'Estimated',
  };
}

/**
 * Calculate tokenomics risk score for trade decision
 * Returns a risk factor that REDUCES confidence in trade
 */
export function calculateTokenomicsRiskFactor(tokenomics: TokenomicsData): number {
  // Risk factor: 0 = no risk, 1 = maximum risk
  let riskFactor = 0;

  // Supply risk (0-0.25)
  if (tokenomics.supply.inflationRisk === 'high') {
    riskFactor += 0.25;
  } else if (tokenomics.supply.inflationRisk === 'medium') {
    riskFactor += 0.1;
  }

  // Dilution risk (0-0.25)
  if (tokenomics.market.dilutionRisk === 'high') {
    riskFactor += 0.25;
  } else if (tokenomics.market.dilutionRisk === 'medium') {
    riskFactor += 0.1;
  }

  // Concentration risk (0-0.25)
  if (tokenomics.whaleConcentration.concentrationRisk === 'high') {
    riskFactor += 0.25;
  } else if (tokenomics.whaleConcentration.concentrationRisk === 'medium') {
    riskFactor += 0.1;
  }

  // Liquidity risk (0-0.25)
  if (tokenomics.market.liquidityHealth === 'poor') {
    riskFactor += 0.25;
  } else if (tokenomics.market.liquidityHealth === 'moderate') {
    riskFactor += 0.1;
  }

  return Math.min(1, riskFactor);
}

export default {
  analyzeTokenomics,
  calculateTokenomicsRiskFactor,
};
